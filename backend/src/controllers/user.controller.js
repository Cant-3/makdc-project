// ================================================================
// MAK DC INVESTMENT — USER CONTROLLER
// ================================================================
// Handles: List, Get, Create, Update, Delete users
// ================================================================

const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');

// ================================================================
// LIST ALL USERS
// GET /api/users
// ================================================================
async function listUsers(req, res) {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                employeeId: true,
                email: true,
                fullName: true,
                role: true,
                department: true,
                phone: true,
                profilePic: true,
                status: true,
                lastLogin: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(users);

    } catch (err) {
        console.error('❌ List users error:', err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
}

// ================================================================
// GET USER BY ID
// GET /api/users/:id
// ================================================================
async function getUser(req, res) {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                employeeId: true,
                email: true,
                fullName: true,
                role: true,
                department: true,
                phone: true,
                profilePic: true,
                status: true,
                lastLogin: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(user);

    } catch (err) {
        console.error('❌ Get user error:', err);
        res.status(500).json({ error: 'Failed to fetch user.' });
    }
}

// ================================================================
// CREATE USER
// POST /api/users
// ================================================================
async function createUser(req, res) {
    try {
        const {
            fullName,
            email,
            password,
            role,
            department,
            phone,
            employeeId,
            status
        } = req.body;

        // Check if email already exists
        const existingEmail = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (existingEmail) {
            return res.status(400).json({ error: 'Email already exists.' });
        }

        // Check if employeeId already exists
        if (employeeId) {
            const existingEmpId = await prisma.user.findUnique({
                where: { employeeId }
            });

            if (existingEmpId) {
                return res.status(400).json({ error: 'Employee ID already exists.' });
            }
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 8);

        // Create user
        const user = await prisma.user.create({
            data: {
                fullName: fullName.trim(),
                email: email.toLowerCase().trim(),
                passwordHash,
                role,
                department: department || null,
                phone: phone || null,
                employeeId: employeeId || null,
                status: status || 'Active'
            },
            select: {
                id: true,
                employeeId: true,
                email: true,
                fullName: true,
                role: true,
                department: true,
                phone: true,
                status: true,
                createdAt: true
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_user',
                entityType: 'user',
                entityId: String(user.id),
                details: { email: user.email, role: user.role },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.status(201).json({
            message: 'User created successfully!',
            user
        });

    } catch (err) {
        console.error('❌ Create user error:', err);
        res.status(500).json({ error: 'Failed to create user.' });
    }
}

// ================================================================
// UPDATE USER
// PUT /api/users/:id
// ================================================================
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const {
            fullName,
            email,
            password,
            role,
            department,
            phone,
            employeeId,
            status
        } = req.body;

        // Check user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingUser) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Build update data
        const updateData = {};
        if (fullName) updateData.fullName = fullName.trim();
        if (email) updateData.email = email.toLowerCase().trim();
        if (role) updateData.role = role;
        if (department !== undefined) updateData.department = department;
        if (phone !== undefined) updateData.phone = phone;
        if (employeeId !== undefined) updateData.employeeId = employeeId;
        if (status) updateData.status = status;
        if (password) updateData.passwordHash = await bcrypt.hash(password, 8);

        // Update user
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: {
                id: true,
                employeeId: true,
                email: true,
                fullName: true,
                role: true,
                department: true,
                phone: true,
                status: true,
                updatedAt: true
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_user',
                entityType: 'user',
                entityId: String(user.id),
                details: { changes: Object.keys(updateData) },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'User updated successfully!',
            user
        });

    } catch (err) {
        console.error('❌ Update user error:', err);
        res.status(500).json({ error: 'Failed to update user.' });
    }
}

// ================================================================
// DELETE USER
// DELETE /api/users/:id
// ================================================================
async function deleteUser(req, res) {
    try {
        const { id } = req.params;

        // Check user exists
        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Prevent self-deletion
        if (parseInt(id) === req.user.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account.' });
        }

        // Delete user
        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_user',
                entityType: 'user',
                entityId: String(id),
                details: { email: user.email, role: user.role },
                ipAddress: req.ip || 'unknown'
            }
        });

               res.json({ message: 'User deleted successfully.' });

    } catch (err) {
        console.error('❌ Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user.' });
    }
}
// ================================================================
// UPDATE OWN PROFILE
// PUT /api/users/me
// ================================================================
async function updateOwnProfile(req, res) {
    try {
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('📥 UPDATE OWN PROFILE');
        console.log('User ID:', req.user.userId);
        console.log('Body keys:', Object.keys(req.body));
        console.log('Phone:', req.body.phone);
        console.log('ProfilePic length:', req.body.profilePic ? req.body.profilePic.length : 'null');
        console.log('═══════════════════════════════════════');

        const userId = req.user.userId;
        const { phone, profilePic } = req.body;

        // Build update data - only allow phone and profilePic
        const updateData = {};
        if (phone !== undefined) updateData.phone = phone;
        if (profilePic !== undefined) updateData.profilePic = profilePic;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update.' });
        }

        console.log('📝 Update data:', Object.keys(updateData));

        // Update user
        const user = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                employeeId: true,
                email: true,
                fullName: true,
                role: true,
                department: true,
                phone: true,
                profilePic: true,
                status: true
            }
        });

        console.log('✅ User updated. Phone now:', user.phone);
        console.log('');

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId,
                action: 'update_own_profile',
                entityType: 'user',
                entityId: String(userId),
                details: { changes: Object.keys(updateData) },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Profile updated successfully!',
            user
        });

    } catch (err) {
        console.error('❌ Update own profile error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
}

module.exports = {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    updateOwnProfile
};