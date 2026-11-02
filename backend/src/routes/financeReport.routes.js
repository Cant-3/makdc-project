// ================================================================
// MAK DC INVESTMENT — FINANCE REPORT ROUTES (KAMILI)
// ================================================================

const express = require('express');
const router = express.Router();

const financeReportController = require('../controllers/financeReport.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// ================================================================
// CASH FLOW REPORT
// ================================================================
router.get('/cash-flow',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getCashFlowReport
);

// ================================================================
// PAYROLL REPORT
// ================================================================
router.get('/payroll',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getPayrollReport
);

// ================================================================
// FUND TRANSFER REPORT
// ================================================================
router.get('/fund-transfers',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getFundTransferReport
);

// ================================================================
// COMPANY PAYMENTS REPORT
// ================================================================
router.get('/company-payments',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getCompanyPaymentsReport
);

// ================================================================
// FINANCIAL SUMMARY REPORT
// ================================================================
router.get('/financial-summary',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getFinancialSummaryReport
);

// ================================================================
// RECONCILIATION REPORT
// ================================================================
router.get('/reconciliation',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getReconciliationReport
);
// ================================================================
// OVERALL REPORT
// ================================================================
router.get('/overall',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getOverallReport
);
router.get('/dashboard',
    requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'),
    financeReportController.getDashboardStats
);
module.exports = router;