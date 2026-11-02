// ================================================================
// MAK DC INVESTMENT — AUTH CONTROLLER
// ================================================================
// Handles: Login, Me (profile), Change Password
// ================================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { JWT_CONFIG } = require('../config/constants');

// ================================================================
// LOGIN — User signs in
// ================================================================
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // 1. Validate email and password
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // 2. Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // 3. Check if account is active
        if (user.status !== 'Active') {
            return res.status(403).json({ error: 'Your account is disabled. Contact Super Admin.' });
        }

        // 4. Compare password with hash
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // 5. Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
                fullName: user.fullName
            },
            JWT_CONFIG.SECRET,
            { expiresIn: JWT_CONFIG.EXPIRES_IN }
        );

        // 6. Update lastLogin
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        // 7. Create audit log
        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'login',
                entityType: 'user',
                entityId: String(user.id),
                ipAddress: req.ip || 'unknown',
                userAgent: req.headers['user-agent'] || 'unknown'
            }
        });

        // 8. Return response — INCLUDE ALL USER FIELDS!
        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                department: user.department,
                employeeId: user.employeeId,
                phone: user.phone,
                profilePic: user.profilePic,
                status: user.status,
                lastLogin: user.lastLogin
            }
        });

    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
}

// ================================================================
// ME — Get current user info
// ================================================================
async function me(req, res) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                department: true,
                phone: true,
                employeeId: true,
                profilePic: true,
                status: true,
                lastLogin: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ user });

    } catch (err) {
        console.error('❌ Me error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
}

// ================================================================
// CHANGE PASSWORD — User changes their password
// ================================================================
async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Current password is incorrect.' });
        }

        const newHash = await bcrypt.hash(newPassword, 8);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash }
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'change_password',
                entityType: 'user',
                entityId: String(user.id),
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({ message: 'Password changed successfully!' });

    } catch (err) {
        console.error('❌ Change password error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    login,
    me,
    changePassword
};