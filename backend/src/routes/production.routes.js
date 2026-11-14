const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/production.Controller');

// Middleware ya authentication
let auth;
try {
    auth = require('../middleware/auth.middleware');
} catch (e) {
    auth = null;
}
const protect = auth && auth.protect ? auth.protect : (req, res, next) => next();
const authorize = auth && auth.authorize ? auth.authorize : () => (req, res, next) => next();

// ===== DASHBOARD =====
router.get('/dashboard', protect, ctrl.getProductionDashboard);

// ===== RAW MATERIALS =====
router.get('/raw-materials', protect, ctrl.getRawMaterials);
router.post('/raw-materials', protect, ctrl.createRawMaterial);
router.post('/raw-materials/receive', protect, ctrl.receiveRawMaterial);
router.get('/raw-materials/receipts', protect, ctrl.getRawMaterialReceipts);

// ===== PRODUCTION BATCHES =====
router.get('/batches', protect, ctrl.getProductionBatches);
router.post('/batches', protect, ctrl.createProductionBatch);
router.put('/batches/:id/release-to-sales', protect, ctrl.releaseToSales);

// ===== STOCK =====
router.get('/stock', protect, ctrl.getStockOverview);

// ===== DAMAGED =====
router.get('/damaged', protect, ctrl.getDamagedProducts);
router.post('/damaged/dispose', protect, ctrl.disposeDamaged);

// ===== REPORTS =====
router.get('/reports/daily', protect, ctrl.getDailyReports);
router.get('/reports/summary', protect, ctrl.getProductionSummary);
router.get('/reports/materials', protect, ctrl.getReportMaterials);
// ===== PRODUCTS (for dropdown) =====
router.get('/products', protect, ctrl.getProductsForProduction);
router.get('/raw-materials/:id/usage', protect, ctrl.getMaterialUsage);
router.put('/batches/:id/qc', protect, ctrl.submitQC);
module.exports = router;