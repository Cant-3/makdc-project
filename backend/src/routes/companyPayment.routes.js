const express = require('express');
const router = express.Router();
const controller = require('../controllers/companyPayment.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

router.get('/', requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'), controller.listCompanyPayments);
router.get('/:id', requireRole('Finance', 'Manager', 'CEO', 'SuperAdmin'), controller.getCompanyPayment);
router.post('/', requireRole('Finance', 'CEO', 'SuperAdmin'), controller.createCompanyPayment);
router.put('/:id', requireRole('Finance', 'CEO','Manager', 'SuperAdmin'), controller.updateCompanyPayment);
router.delete('/:id', requireRole('Finance','CEO', 'SuperAdmin'), controller.deleteCompanyPayment);
router.put('/:id/mark-paid', requireRole('Finance', 'CEO', 'SuperAdmin'), controller.markCompanyPaymentPaid);

module.exports = router;