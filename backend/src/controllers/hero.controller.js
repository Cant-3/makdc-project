// ================================================================
// MAK DC INVESTMENT — HERO SLIDE CONTROLLER
// ================================================================
const { prisma } = require('../config/database');

async function listPublic(req, res) {
    try {
        const slides = await prisma.heroSlide.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' }
        });
        res.json(slides);
    } catch (err) {
        console.error('❌ List public hero error:', err);
        res.status(500).json({ error: 'Failed to fetch hero slides.' });
    }
}

async function listAdmin(req, res) {
    try {
        const slides = await prisma.heroSlide.findMany({
            orderBy: { order: 'asc' }
        });
        res.json(slides);
    } catch (err) {
        console.error('❌ List admin hero error:', err);
        res.status(500).json({ error: 'Failed to fetch hero slides.' });
    }
}

async function createSlide(req, res) {
    try {
        const { title, subtitle, image, order, isActive } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required.' });
        }

        const slide = await prisma.heroSlide.create({
            data: {
                title: title ? title.trim() : null,
                subtitle: subtitle ? subtitle.trim() : null,
                image: image,
                order: parseInt(order) || 0,
                isActive: isActive !== false
            }
        });

        res.status(201).json({ message: 'Hero slide created!', slide });
    } catch (err) {
        console.error('❌ Create hero slide error:', err);
        res.status(500).json({ error: 'Failed to create hero slide.' });
    }
}

async function updateSlide(req, res) {
    try {
        const { id } = req.params;
        const { title, subtitle, image, order, isActive } = req.body;

        const data = {};
        if (title !== undefined) data.title = title ? title.trim() : null;
        if (subtitle !== undefined) data.subtitle = subtitle ? subtitle.trim() : null;
        if (image !== undefined) data.image = image;
        if (order !== undefined) data.order = parseInt(order) || 0;
        if (isActive !== undefined) data.isActive = isActive;

        const slide = await prisma.heroSlide.update({
            where: { id: parseInt(id) },
            data
        });

        res.json({ message: 'Hero slide updated!', slide });
    } catch (err) {
        console.error('❌ Update hero slide error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Hero slide not found.' });
        }
        res.status(500).json({ error: 'Failed to update hero slide.' });
    }
}

async function deleteSlide(req, res) {
    try {
        const { id } = req.params;
        await prisma.heroSlide.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Hero slide deleted.' });
    } catch (err) {
        console.error('❌ Delete hero slide error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Hero slide not found.' });
        }
        res.status(500).json({ error: 'Failed to delete hero slide.' });
    }
}

module.exports = {
    listPublic,
    listAdmin,
    createSlide,
    updateSlide,
    deleteSlide
};