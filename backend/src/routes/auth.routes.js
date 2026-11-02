// ================================================================
// MAK DC INVESTMENT — AUTH ROUTES
// ================================================================
// Endpoints za authentication
// ================================================================

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const {
    loginSchema,
    changePasswordSchema,
    validate
} = require('../validators/auth.validator');

// ================================================================
// POST /api/auth/login — Mtumiaji anaingia
// ================================================================
router.post('/login', validate(loginSchema), authController.login);

// ================================================================
// GET /api/auth/me — Pata taarifa za mtumiaji aliyeingia
// ================================================================
router.get('/me', authenticate, authController.me);

// ================================================================
// POST /api/auth/change-password — Badilisha password
// ================================================================
router.post(
    '/change-password',
    authenticate,
    validate(changePasswordSchema),
    authController.changePassword
);

module.exports = router;