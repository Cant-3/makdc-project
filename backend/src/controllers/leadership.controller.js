// ================================================================
// MAK DC INVESTMENT — LEADERSHIP CONTROLLER
// ================================================================
// Handles: List, Get, Create, Update, Delete leadership
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// LIST ALL LEADERSHIP
// GET /api/leadership
// PUBLIC — website ya umma inaita
// ================================================================
async function listLeadership(req, res) {
    try {
        const leadership = await prisma.leadership.findMany({
            where: { isActive: true },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'asc' }
            ]
        });

        res.json(leadership);

    } catch (err) {
        console.error('❌ List leadership error:', err);
        res.status(500).json({ error: 'Failed to fetch leadership.' });
    }
}

// ================================================================
// LIST ALL LEADERSHIP (INCLUDING INACTIVE) — Super Admin
// GET /api/leadership/admin
// ================================================================
async function listLeadershipAdmin(req, res) {
    try {
        const leadership = await prisma.leadership.findMany({
            orderBy: [
                { order: 'asc' },
                { createdAt: 'asc' }
            ]
        });

        res.json(leadership);

    } catch (err) {
        console.error('❌ List leadership admin error:', err);
        res.status(500).json({ error: 'Failed to fetch leadership.' });
    }
}

// ================================================================
// GET SINGLE LEADERSHIP
// GET /api/leadership/:id
// ================================================================
async function getLeadership(req, res) {
    try {
        const { id } = req.params;

        const leader = await prisma.leadership.findUnique({
            where: { id: parseInt(id) }
        });

        if (!leader) {
            return res.status(404).json({ error: 'Leader not found.' });
        }

        res.json(leader);

    } catch (err) {
        console.error('❌ Get leadership error:', err);
        res.status(500).json({ error: 'Failed to fetch leader.' });
    }
}

// ================================================================
// CREATE LEADERSHIP
// POST /api/leadership
// Super Admin only
// ================================================================
async function createLeadership(req, res) {
    try {
        const { fullName, role, bio, photo, email, phone, linkedin, order, isActive } = req.body;

        const leader = await prisma.leadership.create({
            data: {
                fullName,
                role,
                bio: bio || null,
                photo: photo || null,
                email: email || null,
                phone: phone || null,
                linkedin: linkedin || null,
                order: order || 0,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_leadership',
                entityType: 'leadership',
                entityId: String(leader.id),
                details: { fullName, role },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.status(201).json({
            message: 'Leader created successfully!',
            leader
        });

    } catch (err) {
        console.error('❌ Create leadership error:', err);
        res.status(500).json({ error: 'Failed to create leader.' });
    }
}

// ================================================================
// UPDATE LEADERSHIP
// PUT /api/leadership/:id
// Super Admin only
// ================================================================
async function updateLeadership(req, res) {
    try {
        const { id } = req.params;
        const { fullName, role, bio, photo, email, phone, linkedin, order, isActive } = req.body;

        const leader = await prisma.leadership.update({
            where: { id: parseInt(id) },
            data: {
                ...(fullName !== undefined && { fullName }),
                ...(role !== undefined && { role }),
                ...(bio !== undefined && { bio }),
                ...(photo !== undefined && { photo }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(linkedin !== undefined && { linkedin }),
                ...(order !== undefined && { order }),
                ...(isActive !== undefined && { isActive })
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_leadership',
                entityType: 'leadership',
                entityId: String(id),
                details: { fullName, role },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Leader updated successfully!',
            leader
        });

    } catch (err) {
        console.error('❌ Update leadership error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Leader not found.' });
        }
        res.status(500).json({ error: 'Failed to update leader.' });
    }
}

// ================================================================
// DELETE LEADERSHIP
// DELETE /api/leadership/:id
// Super Admin only
// ================================================================
async function deleteLeadership(req, res) {
    try {
        const { id } = req.params;

        const leader = await prisma.leadership.delete({
            where: { id: parseInt(id) }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_leadership',
                entityType: 'leadership',
                entityId: String(id),
                details: { fullName: leader.fullName },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Leader deleted successfully!'
        });

    } catch (err) {
        console.error('❌ Delete leadership error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Leader not found.' });
        }
        res.status(500).json({ error: 'Failed to delete leader.' });
    }
}

module.exports = {
    listLeadership,
    listLeadershipAdmin,
    getLeadership,
    createLeadership,
    updateLeadership,
    deleteLeadership
};