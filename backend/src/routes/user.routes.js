// ================================================================
// MAK DC INVESTMENT — USER ROUTES
// ================================================================

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const {
    createUserSchema,
    updateUserSchema,
    updateOwnProfileSchema,
    validate
} = require('../validators/user.validator');

// ================================================================
// ALL USER ROUTES REQUIRE AUTHENTICATION
// ================================================================
router.use(authenticate);

// ================================================================
// IMPORTANT: PUT /me MUST come BEFORE /:id
// Otherwise Express will treat "me" as an id
// ================================================================

// ⭐ UPDATE OWN PROFILE — Any logged-in user
router.put('/me', 
    validate(updateOwnProfileSchema),
    userController.updateOwnProfile
);

// ================================================================
// SUPER ADMIN ONLY ROUTES
// ================================================================

// GET /api/users — List all users
router.get('/', requireSuperAdmin, userController.listUsers);

// POST /api/users — Create user
router.post('/', 
    requireSuperAdmin, 
    validate(createUserSchema), 
    userController.createUser
);

// ================================================================
// DYNAMIC ROUTES (with :id) — MUST BE LAST
// ================================================================

// GET /api/users/:id
router.get('/:id', requireSuperAdmin, userController.getUser);

// PUT /api/users/:id
router.put('/:id', 
    requireSuperAdmin, 
    validate(updateUserSchema), 
    userController.updateUser
);

// DELETE /api/users/:id
router.delete('/:id', requireSuperAdmin, userController.deleteUser);

module.exports = router;