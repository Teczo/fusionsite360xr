import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { BlobServiceClient } from '@azure/storage-blob';
import File from '../models/File.js';
import archiver from 'archiver';
import fetch from 'node-fetch';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


// Multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// GET: fetch all files
router.get('/files', async (req, res) => {
    try {
        const query = { trashed: false };
        if (req.query.folder) {
            query.folder = req.query.folder;
        }
        const files = await File.find(query).sort({ uploadedAt: -1 });
        res.json(files);
    } catch (err) {
        console.error('❌ Failed to fetch files:', err);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// replace this:
// router.post('/upload', upload.single('file'), async (req, res) => {

// with this:
router.post(
    '/upload',
    upload.fields([
        { name: 'file', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 },
    ]),
    async (req, res) => {
        const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!AZURE_STORAGE_CONNECTION_STRING) {
            return res.status(500).json({ error: "Azure config missing" });
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient("uploads");

        const file = req.files?.file?.[0];
        const thumb = req.files?.thumbnail?.[0];
        const declaredType = (req.body.type || '').toLowerCase(); // 'model' | 'image'
        const folder = req.body.folder || null;
        if (!file) return res.status(400).json({ error: 'No file uploaded' });

        // Normalize names
        const originalName = file.originalname.replace(/\s/g, '_');
        const ext = path.extname(originalName).toLowerCase();
        const baseName = path.basename(originalName, ext);
        const timestamp = Date.now();

        // Heuristic for type if not declared
        const isImage = declaredType === 'image' || /^image\//.test(file.mimetype) || ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
        const isModel = declaredType === 'model' || ['.glb', '.gltf'].includes(ext);

        let uploadedUrl = null;
        let thumbUrl = null;

        try {
            // 1) If a thumbnail was provided, upload it first (optional)
            if (thumb) {
                const thumbBlobName = `thumbnails/${timestamp}-${baseName}.webp`; // keep consistent naming
                const thumbBlob = containerClient.getBlockBlobClient(thumbBlobName);
                await thumbBlob.uploadData(thumb.buffer, {
                    blobHTTPHeaders: { blobContentType: thumb.mimetype || 'image/webp' },
                });
                thumbUrl = thumbBlob.url;
            }

            // 2) Handle main file upload (image → as-is; model → zip then upload)
            if (isImage) {
                const blobName = `${timestamp}-${originalName}`;
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                await blockBlobClient.uploadData(file.buffer, {
                    blobHTTPHeaders: { blobContentType: file.mimetype || guessImageMime(ext) },
                });
                uploadedUrl = blockBlobClient.url;

                const newFile = await File.create({
                    name: originalName,
                    type: 'image',
                    url: uploadedUrl,
                    thumbnail: thumbUrl || null,
                    folder,
                });

                return res.status(200).json({ message: "Image uploaded", file: newFile });
            }

            if (isModel) {
                // Mirror your existing logic (write to temp, zip, upload)
                const tempDir = path.join(__dirname, '..', 'uploads');
                fs.mkdirSync(tempDir, { recursive: true });

                const tempModelPath = path.join(tempDir, `${timestamp}-${originalName}`);
                const tempZipPath = path.join(tempDir, `${timestamp}-${baseName}.zip`);
                const zipBlobName = `${timestamp}-${baseName}.zip`;

                fs.writeFileSync(tempModelPath, file.buffer);

                await new Promise((resolve, reject) => {
                    const output = fs.createWriteStream(tempZipPath);
                    const archive = archiver('zip');
                    output.on('close', resolve);
                    archive.on('error', reject);
                    archive.pipe(output);
                    archive.file(tempModelPath, { name: originalName });
                    archive.finalize();
                });

                const zipBuffer = fs.readFileSync(tempZipPath);
                const zipBlobClient = containerClient.getBlockBlobClient(zipBlobName);
                await zipBlobClient.uploadData(zipBuffer, {
                    blobHTTPHeaders: { blobContentType: 'application/zip' },
                });
                uploadedUrl = zipBlobClient.url;

                const newFile = await File.create({
                    name: originalName,
                    type: 'model',
                    url: uploadedUrl,
                    thumbnail: thumbUrl || null, // ✅ save it
                    folder,
                });

                // cleanup
                fs.unlinkSync(tempModelPath);
                fs.unlinkSync(tempZipPath);

                return res.status(200).json({ message: "Model uploaded and zipped", file: newFile });
            }

            return res.status(400).json({ error: 'Unsupported file type. Use .glb/.gltf for models or image formats for images.' });
        } catch (err) {
            console.error('❌ Upload failed:', err);
            return res.status(500).json({ error: err.message });
        }
    }
);

// POST: Import a model from a Sketchfab download URL
router.post('/upload/sketchfab', async (req, res) => {
    const { url, name } = req.body || {};
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!url) return res.status(400).json({ error: 'No URL provided' });
    if (!AZURE_STORAGE_CONNECTION_STRING)
        return res.status(500).json({ error: 'Azure config missing' });

    try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Failed to download model');
        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const blobServiceClient = BlobServiceClient.fromConnectionString(
            AZURE_STORAGE_CONNECTION_STRING
        );
        const containerClient = blobServiceClient.getContainerClient('uploads');

        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        let ext = path.extname(pathname).toLowerCase();
        if (!ext) ext = '.glb';
        const originalName = (name || path.basename(pathname)).replace(/\s/g, '_');
        const baseName = path.basename(originalName, ext);
        const timestamp = Date.now();

        let uploadedUrl;
        if (ext === '.zip') {
            const blobName = `${timestamp}-${baseName}.zip`;
            const blobClient = containerClient.getBlockBlobClient(blobName);
            await blobClient.uploadData(buffer, {
                blobHTTPHeaders: { blobContentType: 'application/zip' },
            });
            uploadedUrl = blobClient.url;
        } else if (ext === '.glb' || ext === '.gltf') {
            const tempDir = path.join(__dirname, '..', 'uploads');
            fs.mkdirSync(tempDir, { recursive: true });

            const tempModelPath = path.join(tempDir, `${timestamp}-${originalName}`);
            const tempZipPath = path.join(tempDir, `${timestamp}-${baseName}.zip`);

            fs.writeFileSync(tempModelPath, buffer);

            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(tempZipPath);
                const archive = archiver('zip');
                output.on('close', resolve);
                archive.on('error', reject);
                archive.pipe(output);
                archive.file(tempModelPath, { name: originalName });
                archive.finalize();
            });

            const zipBuffer = fs.readFileSync(tempZipPath);
            const blobClient = containerClient.getBlockBlobClient(
                `${timestamp}-${baseName}.zip`
            );
            await blobClient.uploadData(zipBuffer, {
                blobHTTPHeaders: { blobContentType: 'application/zip' },
            });
            uploadedUrl = blobClient.url;

            fs.unlinkSync(tempModelPath);
            fs.unlinkSync(tempZipPath);
        } else {
            return res
                .status(400)
                .json({ error: 'Unsupported file type. Use a GLB/GLTF/ZIP URL.' });
        }

        const fileDoc = await File.create({
            name: originalName,
            type: 'model',
            url: uploadedUrl,
        });

        res.json({ message: 'Model imported', file: fileDoc });
    } catch (err) {
        console.error('❌ Sketchfab import failed:', err);
        res.status(500).json({ error: err.message });
    }
});




function guessImageMime(ext) {
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'application/octet-stream';
}

router.patch(
    '/files/:id/thumbnail',
    upload.single('thumbnail'),
    async (req, res) => {
        try {
            const fileDoc = await File.findById(req.params.id);
            if (!fileDoc) return res.status(404).json({ error: 'File not found' });
            if (!req.file) return res.status(400).json({ error: 'No thumbnail uploaded' });

            const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
            const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
            const containerClient = blobServiceClient.getContainerClient("uploads");

            const baseName = path.basename(fileDoc.name, path.extname(fileDoc.name));
            const timestamp = Date.now();
            const thumbBlobName = `thumbnails/${timestamp}-${baseName}.webp`;

            const thumbBlob = containerClient.getBlockBlobClient(thumbBlobName);
            await thumbBlob.uploadData(req.file.buffer, {
                blobHTTPHeaders: { blobContentType: req.file.mimetype || 'image/webp' },
            });

            fileDoc.thumbnail = thumbBlob.url;
            await fileDoc.save();

            res.json({ message: 'Thumbnail updated', file: fileDoc });
        } catch (err) {
            console.error('❌ Thumbnail update failed:', err);
            res.status(500).json({ error: 'Failed to update thumbnail' });
        }
    }
);



// Move file to a different folder
router.patch('/files/:id/move', async (req, res) => {
    try {
        const file = await File.findByIdAndUpdate(
            req.params.id,
            { folder: req.body.folder || null },
            { new: true }
        );
        if (!file) return res.status(404).json({ error: 'File not found' });
        res.json({ message: 'File moved', file });
    } catch (err) {
        console.error('❌ Move file failed:', err);
        res.status(500).json({ error: 'Failed to move file' });
    }
});

// PATCH /api/files/:id  — update file (e.g., move to folder, rename)
router.patch('/files/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const update = {};
        if ('folder' in req.body) update.folder = req.body.folder ?? null; // move/unmove
        if ('name' in req.body) update.name = req.body.name;               // optional rename

        const doc = await File.findByIdAndUpdate(id, update, { new: true });
        if (!doc) return res.status(404).json({ error: 'File not found' });
        res.json(doc);
    } catch (err) {
        console.error('❌ Failed to update file:', err);
        res.status(500).json({ error: 'Failed to update file' });
    }
});




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
