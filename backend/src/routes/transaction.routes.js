const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRole('Finance', 'CEO', 'Manager', 'SuperAdmin'));

// LIST all transactions
router.get('/', async (req, res) => {
    try {
        const { source, type, resourceId, from, to } = req.query;
        const where = {};
        if (source) where.source = source;
        if (type) where.type = type;
        if (resourceId) where.resourceId = parseInt(resourceId);
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to);
        }
        
        const transactions = await prisma.transaction.findMany({
            where,
            include: { resource: { select: { name: true, category: true } } },
            orderBy: { createdAt: 'desc' },
            take: 500
        });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;