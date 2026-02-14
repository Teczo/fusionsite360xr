import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { BlobServiceClient } from '@azure/storage-blob';
import Media from '../models/Media.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function verifyProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findOne({ _id: projectId, userId });
}

// GET /projects/:id/media
router.get('/projects/:id/media', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const items = await Media.find({ projectId: id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('Failed to fetch media:', err);
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

// POST /projects/:id/media  (admin or contractor can upload)
router.post(
  '/projects/:id/media',
  auth,
  requireRole('admin', 'contractor'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const project = await verifyProject(id, req.userId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!conn) {
        return res.status(500).json({ error: 'Azure configuration missing' });
      }

      const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
      const containerClient = blobServiceClient.getContainerClient('uploads');

      const ext = req.file.originalname.split('.').pop() || 'bin';
      const blobName = `media/${id}/${Date.now()}-${req.file.originalname}`;
      const blockBlob = containerClient.getBlockBlobClient(blobName);

      await blockBlob.uploadData(req.file.buffer, {
        blobHTTPHeaders: { blobContentType: req.file.mimetype },
      });

      const isVideo = req.file.mimetype?.startsWith('video/');

      const media = new Media({
        projectId: id,
        url: blockBlob.url,
        name: req.file.originalname,
        type: isVideo ? 'video' : 'image',
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.userId,
      });
      await media.save();

      res.status(201).json(media);
    } catch (err) {
      console.error('Failed to upload media:', err);
      res.status(500).json({ error: 'Failed to upload media' });
    }
  }
);

// DELETE /projects/:id/media/:mediaId
router.delete('/projects/:id/media/:mediaId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id, mediaId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return res.status(400).json({ error: 'Invalid media id' });
    }

    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const item = await Media.findOneAndDelete({ _id: mediaId, projectId: id });
    if (!item) return res.status(404).json({ error: 'Media not found' });
    res.json({ message: 'Media deleted' });
  } catch (err) {
    console.error('Failed to delete media:', err);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

export default router;
