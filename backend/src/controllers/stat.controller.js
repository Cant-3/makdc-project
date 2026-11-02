// ================================================================
// MAK DC INVESTMENT — SITE STAT CONTROLLER
// ================================================================
const { prisma } = require('../config/database');

async function listPublic(req, res) {
    try {
        const stats = await prisma.siteStat.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        res.json(stats);
    } catch (err) {
        console.error('❌ List public stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
}

async function listAdmin(req, res) {
    try {
        const stats = await prisma.siteStat.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(stats);
    } catch (err) {
        console.error('❌ List admin stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats.' });
    }
}

async function createStat(req, res) {
    try {
        const { label, value, icon, order, isActive } = req.body;

        if (!label || value === undefined) {
            return res.status(400).json({ error: 'Label and value are required.' });
        }

        const stat = await prisma.siteStat.create({
            data: {
                label: label.trim(),
                value: parseInt(value) || 0,
                icon: icon || null,
                order: parseInt(order) || 0,
                isActive: isActive !== false
            }
        });

        res.status(201).json({ message: 'Stat created!', stat });
    } catch (err) {
        console.error('❌ Create stat error:', err);
        res.status(500).json({ error: 'Failed to create stat.' });
    }
}

async function updateStat(req, res) {
    try {
        const { id } = req.params;
        const { label, value, icon, order, isActive } = req.body;

        const data = {};
        if (label !== undefined) data.label = label.trim();
        if (value !== undefined) data.value = parseInt(value) || 0;
        if (icon !== undefined) data.icon = icon;
        if (order !== undefined) data.order = parseInt(order) || 0;
        if (isActive !== undefined) data.isActive = isActive;

        const stat = await prisma.siteStat.update({
            where: { id: parseInt(id) },
            data
        });

        res.json({ message: 'Stat updated!', stat });
    } catch (err) {
        console.error('❌ Update stat error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Stat not found.' });
        }
        res.status(500).json({ error: 'Failed to update stat.' });
    }
}

async function deleteStat(req, res) {
    try {
        const { id } = req.params;
        await prisma.siteStat.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Stat deleted.' });
    } catch (err) {
        console.error('❌ Delete stat error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Stat not found.' });
        }
        res.status(500).json({ error: 'Failed to delete stat.' });
    }
}

module.exports = {
    listPublic,
    listAdmin,
    createStat,
    updateStat,
    deleteStat
};