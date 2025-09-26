// routes/team.js
import express from 'express';
import auth from '../middleware/authMiddleware.js';
import User from '../models/User.js';

const router = express.Router();

router.get('/', auth, async (req, res) => {
    try {
        const me = await User.findById(req.userId).select('name email');
        if (!me) return res.status(404).json({ error: 'User not found' });

        // MVP: just return the owner row so UI is stable
        res.json([{
            id: String(me._id),
            name: me.name || 'Owner',
            email: me.email,
            role: 'Owner',
            status: 'Active',
        }]);
    } catch (e) {
        console.error('GET /api/team error', e);
        res.status(500).json({ error: 'Failed to load team' });
    }
});

router.post('/invite', auth, async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ error: 'email required' });

        // TODO: implement real invites; MVP returns a pending stub
        res.json({
            id: `pending:${email}`,
            name: '',
            email,
            role: 'Member',
            status: 'Pending',
        });
    } catch (e) {
        console.error('POST /api/team/invite error', e);
        res.status(500).json({ error: 'Failed to invite' });
    }
});

router.patch('/:memberId', auth, async (req, res) => {
    try {
        const { role } = req.body || {};
        if (!role) return res.status(400).json({ error: 'role required' });
        // TODO: persist role change
        res.json({ ok: true });
    } catch (e) {
        console.error('PATCH /api/team/:memberId error', e);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

router.delete('/:memberId', auth, async (req, res) => {
    try {
        // TODO: remove membership
        res.json({ ok: true });
    } catch (e) {
        console.error('DELETE /api/team/:memberId error', e);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

router.get('/search', auth, async (req, res) => {
    try {
        const q = (req.query.q || '').toString().trim().toLowerCase();
        if (!q) return res.json([]);
        // TODO: implement search; MVP returns none
        res.json([]);
    } catch (e) {
        console.error('GET /api/team/search error', e);
        res.status(500).json({ error: 'Failed to search' });
    }
});

export default router;
