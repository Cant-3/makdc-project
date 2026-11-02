// ================================================================
// MAK DC INVESTMENT — PAYMENT CONTROLLER
// ================================================================
// Handles: Payment listing, retrieval, and mark-as-paid
// Integration: Ledger service (OUTFLOW when marked paid)
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// LIST ALL PAYMENTS
// GET /api/payments
// ================================================================
async function listPayments(req, res) {
    try {
        const payments = await prisma.payment.findMany({
            include: {
                verifier: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(payments);

    } catch (err) {
        console.error('❌ List payments error:', err);
        res.status(500).json({ error: 'Failed to fetch payments.' });
    }
}

// ================================================================
// GET PAYMENT BY ID
// GET /api/payments/:id
// ================================================================
async function getPayment(req, res) {
    try {
        const { id } = req.params;

        const payment = await prisma.payment.findUnique({
            where: { id: parseInt(id) },
            include: {
                verifier: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found.' });
        }

        res.json(payment);

    } catch (err) {
        console.error('❌ Get payment error:', err);
        res.status(500).json({ error: 'Failed to fetch payment.' });
    }
}

// ================================================================
// MARK PAYMENT AS PAID
// PUT /api/payments/:id/mark-paid
// Integration: Ledger service (OUTFLOW)
// ================================================================
async function markAsPaid(req, res) {
    try {
        const { id } = req.params;
        const { actionBy, paymentReference } = req.body;

        // Pata payment ya kwanza
        const existing = await prisma.payment.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Payment not found.' });
        }

        if (existing.status === 'paid') {
            return res.status(400).json({ error: 'Payment is already marked as paid.' });
        }

        // Update payment
        const payment = await prisma.payment.update({
            where: { id: parseInt(id) },
            data: {
                status: 'paid',
                verifiedAt: new Date(),
                paymentReference: paymentReference || existing.paymentReference,
                notes: `Marked as paid by ${actionBy || 'Finance Officer'}`
            },
            include: {
                verifier: {
                    select: {
                        id: true,
                        fullName: true,
                        role: true
                    }
                }
            }
        });

        // ================================================================
        // 🆕 INTEGRATION HOOK: Record Transaction (OUTFLOW)
        // ================================================================
        try {
            const { recordTransaction, getMainCashResource } = require('../services/ledger.service');
            const mainCash = await getMainCashResource();

            if (mainCash) {
                await recordTransaction({
                    resourceId: mainCash.id,
                    type: 'OUTFLOW',
                    amount: payment.amount,
                    source: 'PAYMENT',
                    sourceId: payment.id,
                    sourceModel: 'Payment',
                    reference: payment.paymentReference || `PAY-${payment.id}`,
                    description: `Payment for order ${payment.orderId}`,
                    createdBy: actionBy || 'Finance Officer'
                });
                console.log(`💸 Ledger: Payment OUTFLOW recorded — TSh ${Number(payment.amount).toLocaleString()}`);
            } else {
                console.warn('⚠️ Main Cash resource not found. Ledger skipped.');
            }
        } catch (ledgerErr) {
            console.error('⚠️ Ledger error (payment still saved):', ledgerErr.message);
        }

        res.json({
            message: 'Payment marked as paid successfully!',
            payment
        });

    } catch (err) {
        console.error('❌ Mark as paid error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Payment not found.' });
        }
        res.status(500).json({ error: 'Failed to mark payment as paid: ' + err.message });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    listPayments,
    getPayment,
    markAsPaid
};