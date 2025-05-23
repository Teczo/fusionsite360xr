const express = require('express');
const router = express.Router();
const File = require('../models/File'); // Adjust path if needed

// GET /api/files - return all uploaded files
router.get('/files', async (req, res) => {
    try {
        const files = await File.find(); // Get all items from MongoDB
        res.json(files);
    } catch (err) {
        console.error('❌ Failed to fetch files:', err);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

module.exports = router;
