// ================================================================
// MAK DC INVESTMENT — PROJECT CONTROLLER
// ================================================================
const { prisma } = require('../config/database');

// ================================================================
// GENERATE SLUG
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
// LIST PUBLIC — Active projects only
// ================================================================
async function listPublic(req, res) {
    try {
        const projects = await prisma.project.findMany({
            where: { isActive: true },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(projects);
    } catch (err) {
        console.error('❌ List public projects error:', err);
        res.status(500).json({ error: 'Failed to fetch projects.' });
    }
}

// ================================================================
// LIST ADMIN — All projects
// ================================================================
async function listAdmin(req, res) {
    try {
        const projects = await prisma.project.findMany({
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(projects);
    } catch (err) {
        console.error('❌ List admin projects error:', err);
        res.status(500).json({ error: 'Failed to fetch projects.' });
    }
}

// ================================================================
// GET ONE BY ID
// ================================================================
async function getOne(req, res) {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({
            where: { id: parseInt(id) }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found.' });
        }
        res.json(project);
    } catch (err) {
        console.error('❌ Get project error:', err);
        res.status(500).json({ error: 'Failed to fetch project.' });
    }
}

// ================================================================
// CREATE
// ================================================================
async function createProject(req, res) {
    try {
        const {
            title, category, description, content,
            image, location, client, year, order, isActive
        } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required.' });
        }

        const project = await prisma.project.create({
            data: {
                title: title.trim(),
                slug: generateSlug(title),
                category: category || 'Commercial',
                description: description ? description.trim() : null,
                content: content ? content.trim() : null,
                image: image || null,
                location: location ? location.trim() : null,
                client: client ? client.trim() : null,
                year: year || null,
                order: parseInt(order) || 0,
                isActive: isActive !== false
            }
        });

        res.status(201).json({ message: 'Project created!', project });
    } catch (err) {
        console.error('❌ Create project error:', err);
        res.status(500).json({ error: 'Failed to create project.' });
    }
}

// ================================================================
// UPDATE
// ================================================================
async function updateProject(req, res) {
    try {
        const { id } = req.params;
        const {
            title, category, description, content,
            image, location, client, year, order, isActive
        } = req.body;

        const data = {};
        if (title !== undefined) data.title = title.trim();
        if (category !== undefined) data.category = category;
        if (description !== undefined) data.description = description ? description.trim() : null;
        if (content !== undefined) data.content = content ? content.trim() : null;
        if (image !== undefined) data.image = image;
        if (location !== undefined) data.location = location ? location.trim() : null;
        if (client !== undefined) data.client = client ? client.trim() : null;
        if (year !== undefined) data.year = year;
        if (order !== undefined) data.order = parseInt(order) || 0;
        if (isActive !== undefined) data.isActive = isActive;

        const project = await prisma.project.update({
            where: { id: parseInt(id) },
            data
        });

        res.json({ message: 'Project updated!', project });
    } catch (err) {
        console.error('❌ Update project error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Project not found.' });
        }
        res.status(500).json({ error: 'Failed to update project.' });
    }
}

// ================================================================
// DELETE
// ================================================================
async function deleteProject(req, res) {
    try {
        const { id } = req.params;
        await prisma.project.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Project deleted.' });
    } catch (err) {
        console.error('❌ Delete project error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Project not found.' });
        }
        res.status(500).json({ error: 'Failed to delete project.' });
    }
}

module.exports = {
    listPublic,
    listAdmin,
    getOne,
    createProject,
    updateProject,
    deleteProject
};