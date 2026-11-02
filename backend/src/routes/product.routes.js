// ================================================================
// MAK DC INVESTMENT — PRODUCT ROUTES
// Dual Admin: Sales + SuperAdmin
// ================================================================

const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { authenticate, requireRole } = require('../middleware/auth');
const {
    createProductSchema,
    updateProductSchema,
    validate
} = require('../validators/product.validator');

// ================================================================
// PUBLIC ROUTES
// ================================================================

// GET /api/products — List active products (PUBLIC)
router.get('/', productController.listProducts);

// ================================================================
// ADMIN ROUTES (Sales + SuperAdmin)
// ================================================================

// GET /api/products/admin — List all (including inactive)
router.get('/admin',
    authenticate,
    requireRole('SuperAdmin', 'Sales'),
    productController.listProductsAdmin
);

// POST /api/products — Create
router.post('/',
    authenticate,
    requireRole('SuperAdmin', 'Sales'),
    validate(createProductSchema),
    productController.createProduct
);

// GET /api/products/:id — Get single
router.get('/:id',
    authenticate,
    requireRole('SuperAdmin', 'Sales'),
    productController.getProduct
);

// PUT /api/products/:id — Update
router.put('/:id',
    authenticate,
    requireRole('SuperAdmin', 'Sales'),
    validate(updateProductSchema),
    productController.updateProduct
);

// DELETE /api/products/:id — Delete
router.delete('/:id',
    authenticate,
    requireRole('SuperAdmin', 'Sales'),
    productController.deleteProduct
);

module.exports = router;