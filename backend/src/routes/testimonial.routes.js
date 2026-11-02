// ================================================================
// MAK DC INVESTMENT — TESTIMONIAL ROUTES
// ================================================================
const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonial.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// PUBLIC ROUTES — BILA AUTH
// ================================================================

// GET /api/testimonials — List public (active only)
router.get('/', testimonialController.listPublic);

// ================================================================
// ADMIN ROUTES — ZINAHITAJI AUTH
// ================================================================
router.use(authenticate);

// GET /api/testimonials/admin — List all (admin)
router.get('/admin',
    requireRole('SuperAdmin', 'CEO'),
    testimonialController.listAdmin
);

// POST /api/testimonials — Create
router.post('/',
    requireRole('SuperAdmin', 'CEO'),
    testimonialController.createTestimonial
);

// PUT /api/testimonials/:id — Update
router.put('/:id',
    requireRole('SuperAdmin', 'CEO'),
    testimonialController.updateTestimonial
);

// DELETE /api/testimonials/:id — Delete
router.delete('/:id',
    requireRole('SuperAdmin', 'CEO'),
    testimonialController.deleteTestimonial
);

module.exports = router;