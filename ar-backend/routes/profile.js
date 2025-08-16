// routes/profile.js (ESM)
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * GET /api/profile
 * Returns the current user's public profile (no passwordHash)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select('-passwordHash');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json(user);
    } catch (err) {
        console.error('GET /profile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PATCH /api/profile
 * Partially updates profile fields for the current user.
 * Send only the fields you want to change.
 */
router.patch('/', authMiddleware, async (req, res) => {
    try {
        const {
            name,                 // top-level name (display)
            email,                // allow updating email if you want
            profile = {}
        } = req.body;

        // Build an update object safely
        const update = {};
        if (typeof name === 'string') update.name = name;
        if (typeof email === 'string') update.email = email;

        // Nested profile fields
        update.profile = {};
        const allowedProfileFields = [
            'username', 'about', 'avatarUrl', 'coverUrl',
            'firstName', 'lastName',
            'address', 'notifications'
        ];
        for (const key of allowedProfileFields) {
            if (profile[key] !== undefined) {
                update.profile[key] = profile[key];
            }
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { $set: update },
            { new: true, runValidators: true, select: '-passwordHash' }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error('PATCH /profile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
