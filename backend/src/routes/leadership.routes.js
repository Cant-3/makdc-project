// ================================================================
// MAK DC INVESTMENT — LEADERSHIP ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const leadershipController = require('../controllers/leadership.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const {
    createLeadershipSchema,
    updateLeadershipSchema,
    validate
} = require('../validators/leadership.validator');

// ================================================================
// PUBLIC ROUTES (no auth) — kwa website ya umma
// ================================================================

// GET /api/leadership — List active leadership (PUBLIC)
router.get('/', leadershipController.listLeadership);

// ================================================================
// SUPER ADMIN ROUTES (auth required)
// ================================================================

// GET /api/leadership/admin — List ALL (including inactive)
router.get('/admin',
    authenticate,
    requireSuperAdmin,
    leadershipController.listLeadershipAdmin
);

// POST /api/leadership — Create
router.post('/',
    authenticate,
    requireSuperAdmin,
    validate(createLeadershipSchema),
    leadershipController.createLeadership
);

// GET /api/leadership/:id — Get single
router.get('/:id',
    authenticate,
    requireSuperAdmin,
    leadershipController.getLeadership
);

// PUT /api/leadership/:id — Update
router.put('/:id',
    authenticate,
    requireSuperAdmin,
    validate(updateLeadershipSchema),
    leadershipController.updateLeadership
);

// DELETE /api/leadership/:id — Delete
router.delete('/:id',
    authenticate,
    requireSuperAdmin,
    leadershipController.deleteLeadership
);

module.exports = router;