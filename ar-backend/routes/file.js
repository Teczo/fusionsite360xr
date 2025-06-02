import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BlobServiceClient } from '@azure/storage-blob';
import { generateThumbnail } from '../utils/generateThumbnailWithPuppeteer.js';
import File from '../models/File.js';
import archiver from 'archiver';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// GET: fetch all files
router.get('/files', async (req, res) => {
    try {
        const files = await File.find().sort({ uploadedAt: -1 });
        res.json(files);
    } catch (err) {
        console.error('❌ Failed to fetch files:', err);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// POST: upload with Azure + thumbnail
import archiver from 'archiver'; // add to your dependencies

router.post('/upload', upload.single('file'), async (req, res) => {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!AZURE_STORAGE_CONNECTION_STRING) {
        console.error("❌ Azure connection string is missing");
        return res.status(500).json({ error: "Azure config missing" });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("uploads");
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const originalName = file.originalname.replace(/\s/g, '_');
    const baseName = originalName.replace('.glb', '');
    const timestamp = Date.now();
    const tempDir = path.join(__dirname, '..', 'uploads');
    const tempGlbPath = path.join(tempDir, `${timestamp}-${originalName}`);
    const tempZipPath = path.join(tempDir, `${timestamp}-${baseName}.zip`);
    const tempThumbnailPath = path.join(tempDir, `${timestamp}-${baseName}.png`);

    const zipBlobName = `${timestamp}-${baseName}.zip`;
    const thumbnailBlobName = `${timestamp}-${baseName}.png`;

    try {
        // 1. Save .glb file locally
        fs.writeFileSync(tempGlbPath, file.buffer);

        // 2. Zip the .glb file
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(tempZipPath);
            const archive = archiver('zip');
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.file(tempGlbPath, { name: originalName });
            archive.finalize();
        });

        // 3. Upload .zip to Azure
        const zipBuffer = fs.readFileSync(tempZipPath);
        const zipBlobClient = containerClient.getBlockBlobClient(zipBlobName);
        await zipBlobClient.uploadData(zipBuffer, {
            blobHTTPHeaders: { blobContentType: 'application/zip' }
        });
        const zipUrl = zipBlobClient.url;

        // 4. Generate thumbnail from .glb
        await generateThumbnail(`file://${tempGlbPath}`, tempThumbnailPath);

        const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
        const thumbnailBlobClient = containerClient.getBlockBlobClient(thumbnailBlobName);
        await thumbnailBlobClient.uploadData(thumbnailBuffer, {
            blobHTTPHeaders: { blobContentType: 'image/png' }
        });
        const thumbnailUrl = thumbnailBlobClient.url;

        // 5. Save in MongoDB
        const newFile = await File.create({
            name: originalName,
            type: 'model',
            url: zipUrl,
            thumbnail: thumbnailUrl
        });

        // 6. Clean up
        fs.unlinkSync(tempGlbPath);
        fs.unlinkSync(tempZipPath);
        fs.unlinkSync(tempThumbnailPath);

        res.status(200).json({ message: "Uploaded and zipped successfully", file: newFile });

    } catch (err) {
        console.error('❌ Upload or thumbnail failed:', err);
        res.status(500).json({ error: 'Upload or thumbnail failed' });
    }
});


export default router;
