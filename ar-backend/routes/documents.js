import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import ProjectDocument from '../models/ProjectDocument.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to verify project access
async function verifyProject(projectId, userId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
    // In a real app, you might want check team membership too.
    // For now, consistent with other routes (owner check or just existence + auth):
    return Project.findOne({ _id: projectId });
}

// GET /projects/:projectId/documents
router.get('/projects/:projectId/documents', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        // Optional: Verify user has access to this project
        // const project = await verifyProject(projectId, req.userId);
        // if (!project) return res.status(404).json({ error: 'Project not found' });

        const docs = await ProjectDocument.find({ projectId }).sort({ uploadedAt: -1 }).populate('uploadedBy', 'name email');
        res.json(docs);
    } catch (err) {
        console.error('Failed to fetch documents:', err);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

// POST /projects/:projectId/documents
router.post(
    '/projects/:projectId/documents',
    auth,
    // requireRole('admin', 'editor'), // Adjust roles as needed
    upload.single('file'),
    async (req, res) => {
        try {
            const { projectId } = req.params;

            const project = await verifyProject(projectId, req.userId);
            if (!project) return res.status(404).json({ error: 'Project not found' });

            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }

            const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!conn) {
                return res.status(500).json({ error: 'Azure configuration missing' });
            }

            const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
            const containerClient = blobServiceClient.getContainerClient('uploads'); // Using same container as media for now

            // Create a unique name: projects/{projectId}/documents/{timestamp}-{originalName}
            const originalName = req.file.originalname;
            const fileType = originalName.split('.').pop().toLowerCase();
            const blobName = `projects/${projectId}/documents/${Date.now()}-${originalName}`;

            const blockBlob = containerClient.getBlockBlobClient(blobName);

            await blockBlob.uploadData(req.file.buffer, {
                blobHTTPHeaders: { blobContentType: req.file.mimetype },
            });

            const doc = new ProjectDocument({
                projectId,
                fileName: originalName,
                fileType,
                fileSize: req.file.size,
                blobUrl: blockBlob.url,
                uploadedBy: req.userId,
            });

            await doc.save();

            // Populate uploader info to return complete object
            await doc.populate('uploadedBy', 'name');

            res.status(201).json(doc);
        } catch (err) {
            console.error('Failed to upload document:', err);
            res.status(500).json({ error: 'Failed to upload document' });
        }
    }
);

// DELETE /projects/:projectId/documents/:documentId
router.delete('/projects/:projectId/documents/:documentId', auth, async (req, res) => {
    try {
        const { projectId, documentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(400).json({ error: 'Invalid document id' });
        }

        const doc = await ProjectDocument.findOne({ _id: documentId, projectId });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        // Authorization check: Only uploader or admin/owner should delete? 
        // For now allowing any auth user who can access this api (Phase 1)

        // Delete from Azure
        try {
            // Extract blob name from URL if possible, or we should have stored it?
            // Actually we stored blobUrl. We need to derive blobName relative to container.
            // URL is: https://<account>.blob.core.windows.net/<container>/<blobName>
            // We know container is 'uploads'.
            const urlObj = new URL(doc.blobUrl);
            const pathParts = urlObj.pathname.split('/');
            // pathParts[0] is empty, pathParts[1] is container ('uploads'), rest is blobName
            // e.g. /uploads/projects/123/documents/abc.pdf
            const blobName = pathParts.slice(2).join('/');

            if (blobName) {
                const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
                if (conn) {
                    const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
                    const containerClient = blobServiceClient.getContainerClient('uploads');
                    const blockBlob = containerClient.getBlockBlobClient(blobName);
                    await blockBlob.deleteIfExists();
                }
            }
        } catch (azureErr) {
            console.error('Warning: Failed to delete blob from Azure, deleting record anyway', azureErr);
        }

        await ProjectDocument.deleteOne({ _id: documentId });

        res.json({ message: 'Document deleted' });
    } catch (err) {
        console.error('Failed to delete document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

export default router;
