// ================================================================
// MAK DC INVESTMENT — SITE CONTENT CONTROLLER
// ================================================================
// Handles: List, Get, Update site content
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// LIST ALL SITE CONTENT
// GET /api/content
// ================================================================
async function listContent(req, res) {
    try {
        const content = await prisma.siteContent.findMany({
            orderBy: { key: 'asc' }
        });

        // Return as key-value object for easy frontend use
        const contentMap = {};
        content.forEach(item => {
            contentMap[item.key] = item.value;
        });

        res.json(contentMap);

    } catch (err) {
        console.error('❌ List content error:', err);
        res.status(500).json({ error: 'Failed to fetch content.' });
    }
}

// ================================================================
// GET SINGLE CONTENT BY KEY
// GET /api/content/:key
// ================================================================
async function getContent(req, res) {
    try {
        const { key } = req.params;

        const content = await prisma.siteContent.findUnique({
            where: { key }
        });

        if (!content) {
            return res.status(404).json({ error: 'Content not found.' });
        }

        res.json(content);

    } catch (err) {
        console.error('❌ Get content error:', err);
        res.status(500).json({ error: 'Failed to fetch content.' });
    }
}

// ================================================================
// UPDATE CONTENT BY KEY
// PUT /api/content/:key
// ================================================================
async function updateContent(req, res) {
    try {
        const { key } = req.params;
        const { value } = req.body;

        // Upsert (update or create)
        const content = await prisma.siteContent.upsert({
            where: { key },
            update: {
                value,
                updatedBy: req.user.userId,
                updatedAt: new Date()
            },
            create: {
                key,
                value,
                category: key.split('_')[0],
                updatedBy: req.user.userId
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_content',
                entityType: 'site_content',
                entityId: key,
                details: { newValue: value },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Content updated successfully!',
            content
        });

    } catch (err) {
        console.error('❌ Update content error:', err);
        res.status(500).json({ error: 'Failed to update content.' });
    }
}

module.exports = {
    listContent,
    getContent,
    updateContent
};