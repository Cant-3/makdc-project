// ================================================================
// MAK DC INVESTMENT — COMPANY PAYMENT CONTROLLER
// ================================================================
// Handles: Company Payments (Cash Outflow) workflow
// Integration: Ledger service (OUTFLOW when marked paid)
// ================================================================

const { prisma } = require('../config/database');
async function listCompanyPayments(req, res) {
    try {
        const payments = await prisma.companyPayment.findMany({
            select: {
                id: true,
                type: true,
                reference: true,
                vendor: true,
                amount: true,
                status: true,
                description: true,
                method: true,
                dueDate: true,
                createdAt: true,
                paidAt: true,
                paidBy: true,
                accountId: true,              // 🆕
                procurementRequestId: true,   // 🆕
                createdBy: true,
                attachments: true,
                sentToManagerAt: true,
                sentToManagerBy: true,
                managerVerifiedAt: true,
                managerVerifiedBy: true,
                ceoApprovedAt: true,
                ceoApprovedBy: true,
                rejectedAt: true,
                rejectedBy: true,
                rejectionReason: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payments);
    } catch (err) {
        console.error('❌ List company payments error:', err);
        res.status(500).json({ error: 'Failed to fetch company payments.' });
    }
}
// ================================================================
// GET COMPANY PAYMENT BY ID
// GET /api/company-payments/:id
// ================================================================
async function getCompanyPayment(req, res) {
    try {
        const { id } = req.params;
        const payment = await prisma.companyPayment.findUnique({
            where: { id: parseInt(id) }
        });
        if (!payment) {
            return res.status(404).json({ error: 'Company payment not found.' });
        }
        res.json(payment);
    } catch (err) {
        console.error('❌ Get company payment error:', err);
        res.status(500).json({ error: 'Failed to fetch company payment.' });
    }
}
async function createCompanyPayment(req, res) {
    try {
        const {
            type, reference, vendor, amount,
            dueDate, method, description, accountId,
            attachments,
            procurementRequestId  // 🆕 Ongeza hii
        } = req.body;

        const amountNum = parseFloat(amount);

        // 1. Validation ya msingi
        if (!type || !reference || !vendor || !amountNum) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (amountNum <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // 2. Angalia operations account
        if (!accountId) {
            return res.status(400).json({ error: 'Operations account is required' });
        }

        const account = await prisma.companyAccount.findUnique({
            where: { id: parseInt(accountId) }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        if (account.status !== 'approved') {
            return res.status(400).json({ error: 'Account must be approved before use' });
        }

        if (account.purpose !== 'operations') {
            return res.status(400).json({ error: 'Only Operations accounts can be used for payments' });
        }

        // 3. ANGALIA BALANCE
        const balance = parseFloat(account.balance || 0);
        if (amountNum > balance) {
            return res.status(400).json({
                error: `Insufficient balance. Available: ${account.currency} ${balance.toLocaleString()}, Requested: ${account.currency} ${amountNum.toLocaleString()}`
            });
        }

        // 4. Unda payment — 🆕 Ongeza procurementRequestId
        const payment = await prisma.companyPayment.create({
            data: {
                type,
                reference,
                vendor,
                amount: amountNum,
                dueDate: dueDate ? new Date(dueDate) : null,
                method: method || null,
                description: description || null,
                accountId: parseInt(accountId),
                attachments: attachments || null,
                status: 'draft',
                createdBy: req.user.fullName || 'Finance Officer',
                procurementRequestId: procurementRequestId ? parseInt(procurementRequestId) : null  // 🆕 MUHIMU
            }
        });

        res.status(201).json(payment);

    } catch (err) {
        console.error('❌ createCompanyPayment error:', err);
        res.status(500).json({ error: err.message });
    }
}
async function updateCompanyPayment(req, res) {
    try {
        const { id } = req.params;
        const data = req.body;

        const payment = await prisma.companyPayment.update({
            where: { id: parseInt(id) },
            data: {
                ...(data.type && { type: data.type }),
                ...(data.reference && { reference: data.reference }),
                ...(data.vendor && { vendor: data.vendor }),
                ...(data.amount !== undefined && { amount: parseFloat(data.amount) }),
                ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
                ...(data.method !== undefined && { method: data.method }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.attachments !== undefined && { attachments: data.attachments }),
                ...(data.status && { status: data.status }),
                ...(data.sentToManagerAt !== undefined && { sentToManagerAt: data.sentToManagerAt ? new Date(data.sentToManagerAt) : null }),
                ...(data.sentToManagerBy !== undefined && { sentToManagerBy: data.sentToManagerBy }),
                ...(data.managerVerifiedAt !== undefined && { managerVerifiedAt: data.managerVerifiedAt ? new Date(data.managerVerifiedAt) : null }),
                ...(data.managerVerifiedBy !== undefined && { managerVerifiedBy: data.managerVerifiedBy }),
                ...(data.ceoApprovedAt !== undefined && { ceoApprovedAt: data.ceoApprovedAt ? new Date(data.ceoApprovedAt) : null }),
                ...(data.ceoApprovedBy !== undefined && { ceoApprovedBy: data.ceoApprovedBy }),
                ...(data.rejectedAt !== undefined && { rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : null }),
                ...(data.rejectedBy !== undefined && { rejectedBy: data.rejectedBy }),
                ...(data.rejectionReason !== undefined && { rejectionReason: data.rejectionReason }),
                ...(data.paidAt !== undefined && { paidAt: data.paidAt ? new Date(data.paidAt) : null }),
                ...(data.paidBy !== undefined && { paidBy: data.paidBy })
            }
        });

        res.json(payment);
    } catch (err) {
        console.error('❌ Update company payment error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Company payment not found.' });
        }
        res.status(500).json({ error: 'Failed to update company payment: ' + err.message });
    }
}

// ================================================================
// DELETE COMPANY PAYMENT
// DELETE /api/company-payments/:id
// ================================================================
async function deleteCompanyPayment(req, res) {
    try {
        const { id } = req.params;
        await prisma.companyPayment.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Company payment deleted successfully.' });
    } catch (err) {
        console.error('❌ Delete company payment error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Company payment not found.' });
        }
        res.status(500).json({ error: 'Failed to delete company payment.' });
    }
}
async function markCompanyPaymentPaid(req, res) {
    try {
        const { id } = req.params;
        const { actionBy } = req.body;

        const existing = await prisma.companyPayment.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Company payment not found.' });
        }

        if (existing.status === 'paid') {
            return res.status(400).json({ error: 'Already marked as paid.' });
        }

        if (existing.status !== 'approved') {
            return res.status(400).json({ error: 'Only approved payments can be marked as paid.' });
        }

        // 🆕 Punguza Balance ya Account
        if (existing.accountId) {
            const account = await prisma.companyAccount.findUnique({
                where: { id: existing.accountId }
            });

            if (account) {
                const currentBalance = parseFloat(account.balance || 0);
                const newBalance = currentBalance - parseFloat(existing.amount);

                if (newBalance < 0) {
                    return res.status(400).json({ 
                        error: `Insufficient balance. Available: ${currentBalance.toLocaleString()}, Required: ${existing.amount.toLocaleString()}` 
                    });
                }

                await prisma.companyAccount.update({
                    where: { id: existing.accountId },
                    data: { balance: newBalance }
                });
                console.log(`💰 Balance updated: ${account.name} ${currentBalance} → ${newBalance}`);
            }
        }

        // Update payment status
        const payment = await prisma.companyPayment.update({
            where: { id: parseInt(id) },
            data: {
                status: 'paid',
                paidAt: new Date(),
                paidBy: actionBy || 'Finance Officer'
            }
        });

        // 🆕 Update Procurement Request kama ipo
        if (existing.procurementRequestId) {
            try {
                await prisma.$executeRaw`
                    UPDATE procurement_requests 
                    SET status = 'paid', paid_at = NOW(), updated_at = NOW()
                    WHERE id = ${existing.procurementRequestId}
                `;
                console.log(`✅ Procurement Request ${existing.procurementRequestId} marked as PAID`);
            } catch (procErr) {
                console.error('⚠️ Procurement update failed:', procErr.message);
            }
        }

        // Ledger (OUTFLOW)
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
                    sourceModel: 'CompanyPayment',
                    reference: payment.reference,
                    description: `Payment to ${payment.vendor}`,
                    createdBy: actionBy || 'Finance Officer'
                });
            }
        } catch (ledgerErr) {
            console.error('⚠️ Ledger error:', ledgerErr.message);
        }

        res.json({
            message: 'Payment marked as paid successfully!',
            payment
        });

    } catch (err) {
        console.error('❌ Mark as paid error:', err);
        res.status(500).json({ error: 'Failed to mark payment as paid: ' + err.message });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    listCompanyPayments,
    getCompanyPayment,
    createCompanyPayment,
    updateCompanyPayment,
    deleteCompanyPayment,
    markCompanyPaymentPaid
};