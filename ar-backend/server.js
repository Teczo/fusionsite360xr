// server.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mongoose from 'mongoose';
import { BlobServiceClient } from '@azure/storage-blob';
import http from 'http';
import { WebSocketServer } from 'ws';

import authRoutes from './routes/auth.js';
import projectRoutes from './routes/project.js';
import fileRoutes from './routes/file.js';
import folderRoutes from './routes/folder.js';
import File from './models/File.js';
import profileRouter from './routes/profile.js';
import analyticsRoutes from "./routes/analytics.js";
import animationRoutes from './routes/animation.js';
import billingRoutes from './routes/billing.js';
import billingWebhook from './routes/billing.webhook.js';
import teamRouter from './routes/team.js';
import timelineRoutes from './routes/timeline.js';
import hseRoutes from './routes/hse.js';
import alertRoutes from './routes/alerts.js';
import scurveRoutes from './routes/scurve.js';
import mediaRoutes from './routes/media.js';
import documentRoutes from './routes/documents.js';
import scheduleRoutes from './routes/schedule.js';
import intelligenceRoutes from './routes/intelligence.js';
import intelligenceDevRoutes from './routes/dev/intelligenceDevRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import bimRoutes from './routes/bim.js';
import issueRoutes, { setBroadcast } from './routes/issues.js';

import requireActiveSubscription from './middleware/requireActiveSubscription.js';
import authMiddleware from './middleware/authMiddleware.js';

const app = express();
const PORT = process.env.PORT || 4000;

// 1) Define allowlist FIRST
// Build from CORS_ORIGINS env var (comma-separated) with sensible defaults
const allowlist = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:5173', 'https://fusionxr-backend-e6e8cgbyh8ghg6fv.malaysiawest-01.azurewebsites.net', 'https://fusionsite360xr.onrender.com'];

// 2) Single CORS middleware (no second app.use(cors()))
const corsOptions = {
  origin(origin, cb) {
    if (!origin || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions)); // handles preflight

// Stripe webhook MUST come before body parsers
app.use('/api/billing', billingWebhook);

// Body parsers for the rest of the routes
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

// Static serving removed — all files are served from Azure Blob Storage

// DB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    console.log("Connected Mongo DB Name:", mongoose.connection.name);
    console.log("Mongo Host:", mongoose.connection.host);
  })
  .catch((err) => console.error(err));

// Azure — guard against missing connection string (would otherwise crash at startup)
if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
  console.error('❌ AZURE_STORAGE_CONNECTION_STRING is not set — file upload/listing will be unavailable');
}
const blobServiceClient = process.env.AZURE_STORAGE_CONNECTION_STRING
  ? BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING)
  : null;
const containerClient = blobServiceClient ? blobServiceClient.getContainerClient('uploads') : null;

// Multer
const upload = multer({ storage: multer.memoryStorage() });

// Files (example public endpoint)
app.get('/files', async (req, res) => {
  try {
    const files = await File.find().sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Blobs (example public endpoint)
app.get('/blobs', async (req, res) => {
  if (!containerClient) {
    return res.status(503).json({ error: 'Azure Storage is not configured' });
  }
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

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev/intelligence', intelligenceDevRoutes);
}
// Routes
app.use('/api', authRoutes);
app.use('/api', projectRoutes);
app.use('/api', fileRoutes);
app.use('/api', folderRoutes);
app.use('/api/profile', profileRouter);
app.use('/api/team', teamRouter);

// You can gate analytics with subscription if needed:
app.use('/api/analytics', analyticsRoutes);
//app.use('/api/analytics', authMiddleware, requireActiveSubscription, analyticsRoutes);

// If you want animations behind subscription too, wrap it the same way
app.use('/api', animationRoutes);

// Digital Twin modules (Timeline, HSE, Alerts, S-Curve, Media, Documents, BIM)
app.use('/api', timelineRoutes);
app.use('/api', hseRoutes);
app.use('/api', alertRoutes);
app.use('/api', scurveRoutes);
app.use('/api', mediaRoutes);
app.use('/api', documentRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', bimRoutes);
app.use('/api', intelligenceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', issueRoutes);

// DEV ONLY — Intelligence debug console routes.
// Completely absent in production; safe to remove along with routes/dev/ and
// controllers/dev/ to strip the feature entirely.


// Billing (after webhook + parsers)
app.use('/api/billing', billingRoutes);

// Global error handler — must be last, after all routes
// Catches: next(err) calls, CORS rejections, and any synchronous throws in middleware
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────
const httpServer = http.createServer(app);

// Map: projectId (string) → Set<WebSocket>
const projectRooms = new Map();

const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws) => {
  let joinedProject = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'join' && msg.projectId) {
        // Leave any previously joined room
        if (joinedProject && projectRooms.has(joinedProject)) {
          projectRooms.get(joinedProject).delete(ws);
        }
        joinedProject = String(msg.projectId);
        if (!projectRooms.has(joinedProject)) {
          projectRooms.set(joinedProject, new Set());
        }
        projectRooms.get(joinedProject).add(ws);
      }
    } catch {
      // Ignore malformed messages
    }
  });

  ws.on('close', () => {
    if (joinedProject && projectRooms.has(joinedProject)) {
      projectRooms.get(joinedProject).delete(ws);
    }
  });
});

// Provide broadcast function to issue routes
setBroadcast((projectId, payload) => {
  const room = projectRooms.get(projectId);
  if (!room) return;
  const data = JSON.stringify(payload);
  for (const client of room) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(data);
    }
  }
});

// Start
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws`);
});
