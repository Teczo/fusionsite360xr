// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import { BlobServiceClient } from '@azure/storage-blob';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/project.js';
import fileRoutes from './routes/file.js';
import File from './models/File.js';
import profileRouter from './routes/profile.js';


// Define __dirname manually for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));

// Azure Blob Setup
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("uploads");

// Multer in-memory upload
const storage = multer.memoryStorage();
const upload = multer({ storage });



// Files route
app.get('/files', async (req, res) => {
  const files = await File.find().sort({ uploadedAt: -1 });
  res.json(files);
});

// List Azure blobs
app.get('/blobs', async (req, res) => {
  try {
    let blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      const blobUrl = `${containerClient.url}/${blob.name}`;
      blobs.push({
        name: blob.name,
        url: blobUrl,
        lastModified: blob.properties.lastModified
      });
    }
    res.status(200).json(blobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list blobs" });
  }
});

// Additional routes
app.use('/api', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', fileRoutes);
app.use('/api/profile', profileRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
