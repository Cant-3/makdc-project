// ================================================================
// MAK DC INVESTMENT — MARKETING ACTIVITIES ROUTES
// ================================================================

const express = require('express');
const router = express.Router({ mergeParams: true });

const activityController = require('../controllers/marketingActivity.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// AUTHENTICATED ROUTES
// ================================================================
router.use(authenticate);

const ALLOWED = ['Sales', 'Manager', 'CEO', 'SuperAdmin'];

// GET /api/marketing-plans/:planId/activities
router.get('/',
    requireRole(...ALLOWED),
    activityController.listActivities
);

// POST /api/marketing-plans/:planId/activities
router.post('/',
    requireRole(...ALLOWED),
    activityController.createActivity
);

// PUT /api/marketing-plans/:planId/activities/:id
router.put('/:id',
    requireRole(...ALLOWED),
    activityController.updateActivity
);

// PUT /api/marketing-plans/:planId/activities/:id/status
router.put('/:id/status',
    requireRole(...ALLOWED),
    activityController.updateStatus
);

// DELETE /api/marketing-plans/:planId/activities/:id
router.delete('/:id',
    requireRole(...ALLOWED),
    activityController.deleteActivity
);

module.exports = router;