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
        const files = await File.find({ trashed: false }).sort({ uploadedAt: -1 });
        res.json(files);
    } catch (err) {
        console.error('❌ Failed to fetch files:', err);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// POST: upload with Azure + (zip models only)
router.post('/upload', upload.single('file'), async (req, res) => {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!AZURE_STORAGE_CONNECTION_STRING) {
        return res.status(500).json({ error: "Azure config missing" });
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    const containerClient = blobServiceClient.getContainerClient("uploads");

    const file = req.file;
    const declaredType = (req.body.type || '').toLowerCase(); // 'model' | 'image'
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // Normalize names
    const originalName = file.originalname.replace(/\s/g, '_');
    const ext = path.extname(originalName).toLowerCase(); // .glb, .gltf, .png, .jpg, .webp
    const baseName = path.basename(originalName, ext);
    const timestamp = Date.now();

    // Heuristic for type if not declared
    const isImage = declaredType === 'image' || /^image\//.test(file.mimetype) || ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
    const isModel = declaredType === 'model' || ['.glb', '.gltf'].includes(ext);

    try {
        if (isImage) {
            // ---- IMAGES: upload as-is, NO ZIP
            const blobName = `${timestamp}-${originalName}`;
            const blockBlobClient = containerClient.getBlockBlobClient(blobName);
            await blockBlobClient.uploadData(file.buffer, {
                blobHTTPHeaders: { blobContentType: file.mimetype || guessImageMime(ext) },
            });
            const url = blockBlobClient.url;

            const newFile = await File.create({
                name: originalName,
                type: 'image',
                url,
                // thumbnail: (optional) generate & save later if you want
            });

            return res.status(200).json({ message: "Image uploaded", file: newFile });
        }

        if (isModel) {
            // ---- MODELS: save buffer, zip, then upload ZIP (your current flow)
            const tempDir = path.join(__dirname, '..', 'uploads');
            fs.mkdirSync(tempDir, { recursive: true });

            const tempModelPath = path.join(tempDir, `${timestamp}-${originalName}`);
            const tempZipPath = path.join(tempDir, `${timestamp}-${baseName}.zip`);
            const zipBlobName = `${timestamp}-${baseName}.zip`;

            // Save model buffer to disk
            fs.writeFileSync(tempModelPath, file.buffer);

            // Zip the model file
            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(tempZipPath);
                const archive = archiver('zip');
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                archive.file(tempModelPath, { name: originalName });
                archive.finalize();
            });

            // Upload zip to Azure
            const zipBuffer = fs.readFileSync(tempZipPath);
            const zipBlobClient = containerClient.getBlockBlobClient(zipBlobName);
            await zipBlobClient.uploadData(zipBuffer, {
                blobHTTPHeaders: { blobContentType: 'application/zip' },
            });
            const zipUrl = zipBlobClient.url;

            const newFile = await File.create({
                name: originalName,
                type: 'model',
                url: zipUrl,
            });

            // Clean up
            fs.unlinkSync(tempModelPath);
            fs.unlinkSync(tempZipPath);

            return res.status(200).json({ message: "Model uploaded and zipped", file: newFile });
        }

        // Unknown type
        return res.status(400).json({ error: 'Unsupported file type. Use .glb/.gltf for models or image formats for images.' });

    } catch (err) {
        console.error('❌ Upload failed:', err);
        return res.status(500).json({ error: err.message });
    }
});

function guessImageMime(ext) {
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'application/octet-stream';
}


// Soft delete (move to trash)
router.delete('/files/:id', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        file.trashed = true;
        await file.save();

        res.status(200).json({ message: 'File moved to trash' });
    } catch (err) {
        console.error('❌ Trash failed:', err);
        res.status(500).json({ error: 'Failed to move to trash' });
    }
});


// PERMANENT DELETE: Completely remove file from DB and Azure
router.delete('/files/:id/permanent', async (req, res) => {
    const { id } = req.params;
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

    try {
        const file = await File.findById(id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        // Extract blob name from URL
        const blobUrl = new URL(file.url);
        const blobName = blobUrl.pathname.split('/').pop();

        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("uploads");
        const blobClient = containerClient.getBlobClient(blobName);

        // Delete from Azure
        await blobClient.deleteIfExists();

        // Delete from MongoDB
        await File.findByIdAndDelete(id);

        res.status(200).json({ message: 'File permanently deleted' });

    } catch (err) {
        console.error('❌ Permanent delete failed:', err.message);
        res.status(500).json({ error: 'Failed to permanently delete file' });
    }
});

// GET: Trashed files only
router.get('/files/trashed', async (req, res) => {
    try {
        const trashedFiles = await File.find({ trashed: true }).sort({ uploadedAt: -1 });
        res.json(trashedFiles);
    } catch (err) {
        console.error('❌ Failed to fetch trashed files:', err);
        res.status(500).json({ error: 'Failed to fetch trashed files' });
    }
});

// RESTORE: Un-trash a file
router.patch('/files/:id/restore', async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ error: 'File not found' });

        file.trashed = false;
        await file.save();

        res.status(200).json({ message: 'File restored successfully' });
    } catch (err) {
        console.error('❌ Restore failed:', err);
        res.status(500).json({ error: 'Failed to restore file' });
    }
});





export default router;
