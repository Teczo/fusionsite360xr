import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BlobServiceClient } from '@azure/storage-blob';
import { generateThumbnail } from '../utils/generateThumbnail.mjs';
import File from '../models/File.js';

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

    const blobName = `${Date.now()}-${file.originalname}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    try {
        // Upload GLB to Azure
        await blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mimetype }
        });
        const fileUrl = blockBlobClient.url;

        // Save file locally to render thumbnail
        const tempFilePath = path.join(__dirname, '..', 'uploads', blobName);
        fs.writeFileSync(tempFilePath, file.buffer);

        let thumbnailUrl = null;

        // Generate and upload thumbnail
        if (file.mimetype === 'model/gltf-binary' || file.originalname.endsWith('.glb')) {
            const thumbnailName = blobName.replace('.glb', '.png');
            const thumbnailPath = path.join(__dirname, '..', 'uploads', thumbnailName);

            await generateThumbnail(tempFilePath, thumbnailPath);

            const thumbnailBlobClient = containerClient.getBlockBlobClient(thumbnailName);
            const thumbnailBuffer = fs.readFileSync(thumbnailPath);

            await thumbnailBlobClient.uploadData(thumbnailBuffer, {
                blobHTTPHeaders: { blobContentType: 'image/png' }
            });

            thumbnailUrl = thumbnailBlobClient.url;

            // Clean up temp files
            fs.unlinkSync(tempFilePath);
            fs.unlinkSync(thumbnailPath);
        }

        const newFile = await File.create({
            name: file.originalname,
            type: 'model',
            url: fileUrl,
            thumbnail: thumbnailUrl
        });

        res.status(200).json({ message: "Uploaded successfully", file: newFile });
    } catch (err) {
        console.error('❌ Upload or thumbnail failed:', err);
        res.status(500).json({ error: 'Upload or thumbnail failed' });
    }
});

export default router;
