const { prisma } = require('../config/database');
async function listContent(req, res) {
    try {
        const content = await prisma.siteContent.findMany({
            orderBy: { key: 'asc' }
        });
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
async function updateContent(req, res) {
    try {
        const { key } = req.params;
        const { value } = req.body;
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
async function createOrUpdateContent(req, res) {
    try {
        const { key, value, category } = req.body;

        if (!key || !value) {
            return res.status(400).json({ error: 'Key and value are required.' });
        }

        const content = await prisma.siteContent.upsert({
            where: { key: key },
            update: { 
                value: value,
                ...(category && { category })
            },
            create: { 
                key: key, 
                value: value,
                category: category || 'general'
            }
        });

        res.status(200).json({
            message: 'Content saved successfully!',
            content
        });

    } catch (err) {
        console.error('❌ Save content error:', err);
        res.status(500).json({ error: 'Failed to save content.' });
    }
}
module.exports = {
    listContent,
    getContent,
    createOrUpdateContent,
    updateContent
};