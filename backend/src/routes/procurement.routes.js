// ================================================================
// MAK DC INVESTMENT — PROCUREMENT ROUTES
// ================================================================

const express = require('express');
const router = express.Router();
const controller = require('../controllers/procurement.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ================================================================
// 1. LIST ENDPOINTS (Static routes — lazima ziwe kwanza)
// ================================================================
router.get('/all', controller.listAllRequests);
router.get('/incoming', controller.listIncomingRequests);
router.get('/remedial', controller.listRemedialRequests);
router.get('/pending', controller.listPendingRequests);
router.get('/approved', controller.listApprovedRequests);
router.get('/paid', controller.listPaidProcurements);

// ================================================================
// 2. STOCK ENDPOINTS
// ================================================================
// 🔴 Weka hizi maalum kwanza kabla ya :id
router.get('/stock', controller.listStockItems);
router.get('/stock/summary', controller.getStockSummary);
router.get('/stock/low-stock', controller.getLowStockItems);
router.get('/stock/movements', controller.listStockMovements); 
router.get('/stock/pending-receives', controller.getPendingReceives); // 🆕 Hii iwe hapa

router.post('/stock', controller.addStockItem);
router.post('/stock/adjust', controller.adjustStockItem);
router.post('/stock/receive/:requestId', controller.receiveStockFromProcurement);
router.post('/stock/out', controller.stockOut);
router.post('/stock/confirm-receive/:id', controller.confirmReceive);// 🆕 Badilisha jina lisigongane

// 🟢 Hii iwe mwisho kabisa kwa stock
router.get('/stock/:id', controller.getStockItemById); 

// Suppliers & POs
router.get('/suppliers', controller.listSuppliers);
router.post('/suppliers', controller.createSupplier);
router.get('/purchase-orders', controller.listPurchaseOrders);
router.post('/purchase-orders', controller.createPurchaseOrder);
// ================================================================
// 3. CREATE REQUEST
// ================================================================
router.post('/', controller.createRequest);

// ================================================================
// 4. UPDATE STATUS (Legacy)
// ================================================================
router.put('/:id/status', controller.updateStatus);

// ================================================================
// 5. MESSAGES & FOLLOW-UP
// ================================================================
router.get('/:id/messages', controller.getRequestMessages);
router.post('/:id/messages', controller.sendRequestMessage);
router.put('/:id/messages/read', controller.markMessagesAsRead);
router.post('/:id/follow-up', controller.saveRequestFollowUp);
router.post('/:id/typing', controller.setTypingStatus);
router.get('/:id/typing', controller.getTypingStatus);

// ================================================================
// 6. WORKFLOW (Procurement → Manager → CEO → Procurement)
// ================================================================
router.put('/:id/forward-to-manager', controller.procurementForwardToManager);
router.put('/:id/manager-approve', controller.managerApproveRequest);
router.put('/:id/manager-reject', controller.managerRejectRequest);
router.put('/:id/ceo-approve', controller.ceoApproveRequest);
router.put('/:id/ceo-reject', controller.ceoRejectRequest);
router.put('/:id/purchaser-details', controller.submitPurchaserDetails);

// ================================================================
// 7. PAYMENT WORKFLOW (Finance → Manager → CEO → Finance)
// ================================================================
router.put('/:id/finance-verify', controller.financeVerifyAndSendToManager);
router.put('/:id/manager-approve-payment', controller.managerApprovePayment);
router.put('/:id/manager-reject-payment', controller.managerRejectPayment);
router.put('/:id/ceo-approve-payment', controller.ceoApprovePayment);
router.put('/:id/ceo-reject-payment', controller.ceoRejectPayment);
router.put('/:id/mark-paid', controller.financeMarkAsPaid);

// ================================================================
// 8. IMPREST + HISTORY
// ================================================================
router.get('/:id/imprest/pdf', controller.downloadImprestPDF);
router.get('/:id/payment', controller.getPaymentDetails);
router.get('/:id/history', controller.getStatusHistory);

// ================================================================
// 9. SINGLE REQUEST (MWISHO KABISA)
// ================================================================
router.get('/:id', controller.getRequestById);
router.put('/:id/receive-as-asset', controller.receiveAsAsset);
// ================================================================
// FUEL MANAGEMENT ROUTES
// ================================================================
router.get('/fuel/logs', controller.getFuelLogs);
router.post('/fuel/issue', controller.issueFuel);

router.get('/stock/pending-receives', controller.getPendingReceives);
router.post('/stock/receive/:id', controller.confirmReceive); // Angalia hii haigongani na nyingine
module.exports = router;