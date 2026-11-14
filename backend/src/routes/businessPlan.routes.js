// ================================================================
// MAK DC INVESTMENT — BUSINESS PLANS ROUTES
// ================================================================
const express = require('express');
const router = express.Router();
const businessPlanController = require('../controllers/businessPlan.controller');

// 🆕 Tumia jina sahihi la faili (auth) na function (requireRole)
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// CRUD
// ================================================================
router.get('/', authenticate, businessPlanController.getAllPlans);
router.get('/:id', authenticate, businessPlanController.getPlanById);

router.post(
    '/',
    authenticate,
    requireRole('Manager', 'SuperAdmin', 'CEO'), // Imebadilishwa kutoka authorize
    businessPlanController.createPlan
);

router.put(
    '/:id',
    authenticate,
    requireRole('Manager', 'SuperAdmin', 'CEO'), // Imebadilishwa kutoka authorize
    businessPlanController.updatePlan
);

router.delete(
    '/:id',
    authenticate,
    requireRole('Manager', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.deletePlan
);

// ================================================================
// WORKFLOW: Manager → CEO
// ================================================================
router.put(
    '/:id/submit-to-ceo',
    authenticate,
    requireRole('Manager', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.submitToCeo
);

// ================================================================
// WORKFLOW: CEO Actions
// ================================================================
router.put(
    '/:id/ceo-approve',
    authenticate,
    requireRole('CEO', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.ceoApprove
);

router.put(
    '/:id/ceo-reject',
    authenticate,
    requireRole('CEO', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.ceoReject
);

router.put(
    '/:id/ceo-request-revision',
    authenticate,
    requireRole('CEO', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.ceoRequestRevision
);

// ================================================================
// POST-APPROVAL INTEGRATIONS
// ================================================================
router.put(
    '/:id/link-budget',
    authenticate,
    requireRole('Manager', 'CEO', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.linkToBudget
);

router.put(
    '/:id/link-procurement',
    authenticate,
    requireRole('Manager', 'CEO', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.linkToProcurement
);

router.put(
    '/:id/link-tender',
    authenticate,
    requireRole('Manager', 'CEO', 'SuperAdmin'), // Imebadilishwa kutoka authorize
    businessPlanController.linkToTender
);

module.exports = router;