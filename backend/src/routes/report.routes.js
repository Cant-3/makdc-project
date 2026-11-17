// ================================================================
// MAK DC INVESTMENT — REPORT ROUTES (FULL VERSION)
// ================================================================
const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// --- ZILIZOPO ---
router.get('/sales', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'), reportController.getSalesSummary);
router.get('/sales/trend', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'), reportController.getSalesTrend);
router.get('/sales/top-products', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'), reportController.getTopProducts);
router.get('/sales/top-regions', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'), reportController.getTopRegions);
router.get('/sales/top-customers', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Sales'), reportController.getTopCustomers);

router.get('/procurement-summary', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Procurement'), reportController.getProcurementSummary);
router.get('/store-summary', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Procurement'), reportController.getStoreSummary);
router.get('/asset-summary', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Procurement'), reportController.getAssetSummary);
router.get('/master-summary', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Procurement'), reportController.getMasterReport);
router.get('/procurement-trend', requireRole('SuperAdmin', 'CEO', 'Manager', 'Finance', 'Procurement'), reportController.getProcurementTrend);

// --- 🆕 MPYA: DEPARTMENT REPORTS ---
router.post('/department-reports/submit', reportController.submitDepartmentReport);
router.get('/department-reports/all', reportController.getDepartmentReports);
router.get('/department-reports/:id', reportController.getDepartmentReportById);
router.patch('/department-reports/:id/review', reportController.reviewDepartmentReport);
router.post('/aggregated-reports', reportController.createAggregatedReport);
router.get('/aggregated-reports', reportController.getAggregatedReports);
module.exports = router;