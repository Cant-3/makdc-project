// ================================================================
// MAK DC INVESTMENT — CONTENT ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const contentController = require('../controllers/content.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const {
    updateContentSchema,
    validate
} = require('../validators/content.validator');

// ================================================================
// GET /api/content — List all content (PUBLIC — no auth needed)
// This is used by the public website to load content
// ================================================================
router.get('/', contentController.listContent);

// ================================================================
// GET /api/content/:key — Get single content (PUBLIC)
// ================================================================
router.get('/:key', contentController.getContent);

// ================================================================
// PUT /api/content/:key — Update content (Super Admin only)
// ================================================================
router.put('/:key',
    authenticate,
    requireSuperAdmin,
    validate(updateContentSchema),
    contentController.updateContent
);

module.exports = router;