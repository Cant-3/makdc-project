// ================================================================
// MAK DC INVESTMENT — AUDIT ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const auditController = require('../controllers/audit.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

// All audit routes require Super Admin
router.use(authenticate);
router.use(requireSuperAdmin);

// ================================================================
// GET /api/audit — List audit logs (Super Admin only)
// ================================================================
router.get('/', auditController.listAuditLogs);

module.exports = router;