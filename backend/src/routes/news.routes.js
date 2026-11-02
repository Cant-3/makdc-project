// ================================================================
// MAK DC INVESTMENT — NEWS ROUTES
// ================================================================
const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');
const { authenticate, requireRole } = require('../middleware/auth');

// ================================================================
// PUBLIC ROUTES — BILA AUTH
// ================================================================

// GET /api/news — List public (active only)
router.get('/', newsController.listPublic);

// GET /api/news/slug/:slug — Get one by slug (PUBLIC)
router.get('/slug/:slug', newsController.getBySlug);

// ================================================================
// ADMIN ROUTES — ZINAHITAJI AUTH
// ================================================================
router.use(authenticate);

// GET /api/news/admin — List all (admin)
router.get('/admin',
    requireRole('SuperAdmin', 'CEO'),
    newsController.listAdmin
);

// GET /api/news/:id — Get one
router.get('/:id',
    requireRole('SuperAdmin', 'CEO'),
    newsController.getOne
);

// POST /api/news — Create
router.post('/',
    requireRole('SuperAdmin', 'CEO'),
    newsController.createNews
);

// PUT /api/news/:id — Update
router.put('/:id',
    requireRole('SuperAdmin', 'CEO'),
    newsController.updateNews
);

// DELETE /api/news/:id — Delete
router.delete('/:id',
    requireRole('SuperAdmin', 'CEO'),
    newsController.deleteNews
);

module.exports = router;