// ================================================================
// MAK DC INVESTMENT — NEWS CONTROLLER
// ================================================================
const { prisma } = require('../config/database');

// ================================================================
// GENERATE SLUG FROM TITLE
// ================================================================
function generateSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        + '-' + Date.now().toString().slice(-6);
}

// ================================================================
// GET ALL (PUBLIC) — Active news only
// ================================================================
async function listPublic(req, res) {
    try {
        const news = await prisma.news.findMany({
            where: { isActive: true },
            orderBy: [
                { order: 'asc' },
                { publishedAt: 'desc' }
            ]
        });
        res.json(news);
    } catch (err) {
        console.error('❌ List public news error:', err);
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
}

// ================================================================
// GET ALL (ADMIN) — All news
// ================================================================
async function listAdmin(req, res) {
    try {
        const news = await prisma.news.findMany({
            orderBy: [
                { order: 'asc' },
                { publishedAt: 'desc' }
            ]
        });
        res.json(news);
    } catch (err) {
        console.error('❌ List admin news error:', err);
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
}

// ================================================================
// GET ONE BY ID (ADMIN)
// ================================================================
async function getOne(req, res) {
    try {
        const { id } = req.params;
        const news = await prisma.news.findUnique({
            where: { id: parseInt(id) }
        });
        if (!news) {
            return res.status(404).json({ error: 'News not found.' });
        }
        res.json(news);
    } catch (err) {
        console.error('❌ Get news error:', err);
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
}

// ================================================================
// 🆕 GET ONE BY SLUG (PUBLIC) — kwa detail page
// ================================================================
async function getBySlug(req, res) {
    try {
        const { slug } = req.params;
        
        // Try to find by slug first, then by ID
        const news = await prisma.news.findFirst({
            where: {
                OR: [
                    { slug: slug },
                    { id: parseInt(slug) || 0 }
                ],
                isActive: true
            }
        });

        if (!news) {
            return res.status(404).json({ error: 'News not found.' });
        }
        res.json(news);
    } catch (err) {
        console.error('❌ Get news by slug error:', err);
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
}

// ================================================================
// CREATE
// ================================================================
async function createNews(req, res) {
    try {
        const {
            title, category, excerpt, content,
            image, attachment, attachmentName,
            author, publishedAt, order, isActive
        } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required.' });
        }

        const news = await prisma.news.create({
            data: {
                title: title.trim(),
                slug: generateSlug(title),
                category: category || 'News',
                excerpt: excerpt ? excerpt.trim() : null,
                content: content.trim(),
                image: image || null,
                attachment: attachment || null,
                attachmentName: attachmentName || null,
                author: author ? author.trim() : null,
                publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
                order: parseInt(order) || 0,
                isActive: isActive !== false
            }
        });

        res.status(201).json({ message: 'News created!', news });
    } catch (err) {
        console.error('❌ Create news error:', err);
        res.status(500).json({ error: 'Failed to create news.' });
    }
}

// ================================================================
// UPDATE
// ================================================================
async function updateNews(req, res) {
    try {
        const { id } = req.params;
        const {
            title, category, excerpt, content,
            image, attachment, attachmentName,
            author, publishedAt, order, isActive
        } = req.body;

        const data = {};
        if (title !== undefined) data.title = title.trim();
        if (category !== undefined) data.category = category;
        if (excerpt !== undefined) data.excerpt = excerpt ? excerpt.trim() : null;
        if (content !== undefined) data.content = content.trim();
        if (image !== undefined) data.image = image;
        if (attachment !== undefined) data.attachment = attachment;
        if (attachmentName !== undefined) data.attachmentName = attachmentName;
        if (author !== undefined) data.author = author ? author.trim() : null;
        if (publishedAt !== undefined) data.publishedAt = publishedAt ? new Date(publishedAt) : null;
        if (order !== undefined) data.order = parseInt(order) || 0;
        if (isActive !== undefined) data.isActive = isActive;

        // ✅ FIXED: where ipo mara moja tu
        const news = await prisma.news.update({
            where: { id: parseInt(id) },
            data
        });

        res.json({ message: 'News updated!', news });
    } catch (err) {
        console.error('❌ Update news error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'News not found.' });
        }
        res.status(500).json({ error: 'Failed to update news.' });
    }
}

// ================================================================
// DELETE
// ================================================================
async function deleteNews(req, res) {
    try {
        const { id } = req.params;
        await prisma.news.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'News deleted.' });
    } catch (err) {
        console.error('❌ Delete news error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'News not found.' });
        }
        res.status(500).json({ error: 'Failed to delete news.' });
    }
}

// ================================================================
// EXPORT
// ================================================================
module.exports = {
    listPublic,
    listAdmin,
    getOne,
    getBySlug,  
    createNews,
    updateNews,
    deleteNews
};