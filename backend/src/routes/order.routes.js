// ================================================================
// MAK DC INVESTMENT — ORDER ROUTES (KAMILI — FIXED)
// ================================================================

const express = require('express');
const router = express.Router();

const orderController = require('../controllers/order.controller');

// 1. Vuta functions zote muhimu za Auth hapa
const { authenticate, requireRole, optionalAuth } = require('../middleware/auth');

// ================================================================
// PUBLIC ROUTES (Customer Portal) — BILA AUTH
// ================================================================

// POST /api/orders — Create order (Customer anaunda)
// optionalAuth inaruhusu mteja kuweka oda bila kuwa na account, lakini kama ana account, inatambua.
router.post('/', optionalAuth, orderController.createOrder);

// GET /api/orders/track/:orderId — Track order (Customer ana-track)
router.get('/track/:orderId', orderController.trackOrder);

// ================================================================
// 🆕 PUBLIC ROUTE — Confirm delivery (mteja anathibitisha)
// MUHIMU: Ipo KABLA ya `router.use(authenticate)`
// ================================================================
router.post(
    '/:orderId/confirm-delivery',
    orderController.confirmDelivery
);

// ================================================================
// AUTHENTICATED ROUTES — Kila kitu kinachofuata kinahitaji token
// ================================================================
router.use(authenticate);

// GET /api/orders — List all orders
router.get('/',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'),
    orderController.listOrders
);

// GET /api/orders/:orderId — Get single order
router.get('/:orderId',
    requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'),
    orderController.getOrder
);

// ================================================================
// SALES ROUTES
// ================================================================

router.put('/:orderId/send-to-finance',
    requireRole('Sales', 'SuperAdmin'),
    orderController.sendToFinance
);

router.put('/:orderId/sales-edit',
    requireRole('Sales', 'SuperAdmin'),
    orderController.salesEditOrder
);

router.put('/:orderId/delivery',
    requireRole('Sales', 'SuperAdmin'),
    orderController.setDelivery
);

router.put('/:orderId/mark-delivered',
    requireRole('Sales', 'SuperAdmin'),
    orderController.markDelivered
);

// ================================================================
// FINANCE ROUTES
// ================================================================

router.put('/:orderId/setup-payment',
    requireRole('Finance', 'SuperAdmin'),
    orderController.setupPayment
);

router.put('/:orderId/verify-payment',
    requireRole('Finance', 'SuperAdmin'),
    orderController.verifyPayment
);

router.put('/:orderId/complete',
    requireRole('Finance', 'SuperAdmin'),
    orderController.completeOrder
);

// ================================================================
// MANAGER & CEO ROUTES (Zilizorekebishwa)
// ================================================================

router.put('/:orderId/manager-approve',
    requireRole('Manager', 'SuperAdmin'),
    orderController.managerApprove
);

router.put('/:orderId/ceo-approve',
    requireRole('CEO', 'SuperAdmin'),
    orderController.ceoApprove
);

// ================================================================
// COMMON ROUTES
// ================================================================

router.put('/:orderId/reject',
    requireRole('Sales', 'Finance', 'CEO', 'Manager', 'SuperAdmin'),
    orderController.rejectOrder
);

// ================================================================
// EXPORT — MWISHO WA FAILI
// ================================================================
module.exports = router;