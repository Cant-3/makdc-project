// ================================================================
// MAK DC INVESTMENT — AUTHENTICATION MIDDLEWARE
// ================================================================
// Inathibitisha JWT token na kutambua mtumiaji
// ================================================================

const jwt = require('jsonwebtoken');
const { JWT_CONFIG } = require('../config/constants');

// ================================================================
// AUTHENTICATE — Thibitisha JWT token
// ================================================================
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token haipo. Tafadhali ingia.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token imeisha muda. Tafadhali ingia tena.' });
        }
        return res.status(401).json({ error: 'Token si sahihi.' });
    }
}

// ================================================================
// REQUIRE ROLE — Ruhusu roles maalum pekee
// ================================================================
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unahitaji kuingia kwanza.' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Hauna ruhusa kufanya kitendo hiki.',
                yourRole: req.user.role,
                requiredRoles: allowedRoles
            });
        }

        next();
    };
}

// ================================================================
// REQUIRE SUPER ADMIN — Ruhusu SuperAdmin, CEO, na Manager
// ================================================================
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unahitaji kuingia kwanza.' });
    }

    // 🆕 Rekebisha: Tumia req.user.role (sio user.role)
    if (!['SuperAdmin', 'CEO', 'Manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Huna ruhusa ya kufanya hivi' });
    }

    next();
}
// ================================================================
// OPTIONAL AUTH — Kama token ipo, ithibitishe. Kama haipo, endelea
// ================================================================
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
        req.user = decoded;
    } catch (err) {
        // Ignore error — endelea bila user
    }

    next();
}
// ================================================================
// REQUIRE ANY ROLE — Ruhusu roles zote za msingi
// ================================================================
function requireAnyRole(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unahitaji kuingia kwanza.' });
    }

    const allowedRoles = [
        'SuperAdmin', 'CEO', 'Manager', 
        'Procurement', 'Finance', 'Engineer', 'Sales'
    ];

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Huna ruhusa ya kufanya hivi' });
    }

    next();
}

module.exports = {
    authenticate,
    requireRole,
    requireSuperAdmin,
    requireAnyRole, 
    optionalAuth
};