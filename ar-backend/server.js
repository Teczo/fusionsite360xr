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
import folderRoutes from './routes/folder.js';
import File from './models/File.js';
import profileRouter from './routes/profile.js';
import analyticsRoutes from "./routes/analytics.js";
import animationRoutes from './routes/animation.js';
import billingRoutes from './routes/billing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// 1) Define allowlist FIRST
const allowlist = [
  'http://localhost:5173',
  'https://holoxr.teczo.co',
  'https://holoxr.onrender.com',
];

// 2) Single CORS middleware (no second app.use(cors()))
const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // ✅ include PATCH (and HEAD is nice to have)
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};
app.use(cors(corsOptions));

// 3) EITHER delete this line entirely (CORS will still add headers):
// app.options('*', cors(corsOptions));
// OR, if you want an explicit preflight handler for all routes, use regex:
app.options(/.*/, cors(corsOptions)); // avoids the "*" path-to-regexp error

// Body parsers
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// DB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error(err));

// Azure
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient('uploads');

// Multer
const upload = multer({ storage: multer.memoryStorage() });

// Files
app.get('/files', async (req, res) => {
  const files = await File.find().sort({ uploadedAt: -1 });
  res.json(files);
});

// Blobs
app.get('/blobs', async (req, res) => {
  try {
    const blobs = [];
    for await (const blob of containerClient.listBlobsFlat()) {
      blobs.push({
        name: blob.name,
        url: `${containerClient.url}/${blob.name}`,
        lastModified: blob.properties.lastModified,
      });
    }
    res.status(200).json(blobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list blobs' });
  }
});

// Routes
app.use('/api', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', fileRoutes);
app.use('/api', folderRoutes);
app.use('/api/profile', profileRouter);
app.use("/api/analytics", analyticsRoutes);
app.use('/api', animationRoutes);
app.use('/api/animations', animationRoutes);
app.use('/api/billing', billingRoutes);

// Start
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
