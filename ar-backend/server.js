require('dotenv').config();
const authRoutes = require('./routes/auth');
const express = require('express');
const projectRoutes = require('./routes/project');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const { BlobServiceClient } = require('@azure/storage-blob');
const File = require('./models/File');
const fileRoutes = require('./routes/file');


const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient("uploads");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { type } = req.body;
    const file = req.file;
    const blobName = Date.now() + '-' + file.originalname;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype }
    });

    const blobUrl = blockBlobClient.url;

    const newFile = new File({
      name: file.originalname,
      type,
      url: blobUrl
    });

    await newFile.save();

    res.status(200).json({ message: "Uploaded successfully", file: newFile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get('/files', async (req, res) => {
  const files = await File.find().sort({ uploadedAt: -1 });
  res.json(files);
});

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

app.use('/api', authRoutes);

app.use('/api', projectRoutes);

app.use('/api', fileRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


