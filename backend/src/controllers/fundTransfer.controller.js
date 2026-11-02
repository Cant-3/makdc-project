const { prisma } = require('../config/database');

// ================================================================
// LIST ALL TRANSFERS
// GET /api/fund-transfers
// ================================================================
async function listTransfers(req, res) {
    try {
        const transfers = await prisma.fundTransfer.findMany({
            include: {
                fromAccount: { select: { id: true, name: true, accountNumber: true, type: true } },
                toAccount:   { select: { id: true, name: true, accountNumber: true, type: true } }
            },
            orderBy: [
                { status: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        res.json(transfers);
    } catch (err) {
        console.error('❌ List transfers error:', err);
        res.status(500).json({ error: 'Failed to fetch transfers.' });
    }
}

// ================================================================
// GET SINGLE TRANSFER
// GET /api/fund-transfers/:id
// ================================================================
async function getTransfer(req, res) {
    try {
        const { id } = req.params;

        const transfer = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) },
            include: {
                fromAccount: true,
                toAccount: true
            }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        res.json(transfer);
    } catch (err) {
        console.error('❌ Get transfer error:', err);
        res.status(500).json({ error: 'Failed to fetch transfer.' });
    }
}

// ================================================================
// CREATE TRANSFER (Finance) — With Full Validation
// POST /api/fund-transfers
// ================================================================
async function createTransfer(req, res) {
    try {
        const {
            fromAccountId,
            toAccountId,
            amount,
            reason,
            notes,
            status
        } = req.body;

        // 1. Validation ya msingi
        if (!fromAccountId || !toAccountId || !amount) {
            return res.status(400).json({
                error: 'From account, to account, and amount are required.'
            });
        }

        if (parseInt(fromAccountId) === parseInt(toAccountId)) {
            return res.status(400).json({
                error: 'From and To accounts cannot be the same.'
            });
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({
                error: 'Amount must be a valid number greater than 0.'
            });
        }

        // 2. Pata accounts
        const fromAccount = await prisma.companyAccount.findUnique({
            where: { id: parseInt(fromAccountId) }
        });
        const toAccount = await prisma.companyAccount.findUnique({
            where: { id: parseInt(toAccountId) }
        });

        if (!fromAccount) {
            return res.status(404).json({ error: 'From account not found.' });
        }
        if (!toAccount) {
            return res.status(404).json({ error: 'To account not found.' });
        }

        // 🆕 3. ANGALIA PURPOSE — From: collections, To: operations
        if (fromAccount.purpose !== 'collections') {
            return res.status(400).json({
                error: 'From account must have purpose "collections" (makusanyo).'
            });
        }
        if (toAccount.purpose !== 'operations') {
            return res.status(400).json({
                error: 'To account must have purpose "operations" (malipo).'
            });
        }

        // 🆕 4. ANGALIA STATUS — lazima ziwe approved
        if (fromAccount.status !== 'approved') {
            return res.status(400).json({
                error: 'From account must be approved.'
            });
        }
        if (toAccount.status !== 'approved') {
            return res.status(400).json({
                error: 'To account must be approved.'
            });
        }

        // 🆕 5. ANGALIA BALANCE — HII NI MUHIMU
        const fromBalance = Number(fromAccount.balance || 0);
        if (fromBalance < numAmount) {
            return res.status(400).json({
                error: `Insufficient balance. Available: ${fromAccount.currency || 'TZS'} ${fromBalance.toLocaleString()}, Required: ${fromAccount.currency || 'TZS'} ${numAmount.toLocaleString()}, Shortage: ${fromAccount.currency || 'TZS'} ${(numAmount - fromBalance).toLocaleString()}`
            });
        }

        // 6. Unda transfer ID maalum
        const year = new Date().getFullYear();
        const count = await prisma.fundTransfer.count();
        const transferId = `TRF-${year}-${String(count + 1).padStart(3, '0')}`;

        const targetStatus = status || 'draft';

        // 7. Unda transfer
        const transfer = await prisma.fundTransfer.create({
            data: {
                transferId,
                fromAccountId: parseInt(fromAccountId),
                toAccountId: parseInt(toAccountId),
                amount: numAmount,
                currency: fromAccount.currency || 'TZS',
                reason: reason || null,
                notes: notes || null,
                status: targetStatus,
                createdBy: req.user.fullName || 'Finance Officer',
                sentToManagerAt: targetStatus === 'pending-manager' ? new Date() : null,
                sentToManagerBy: targetStatus === 'pending-manager' ? req.user.fullName : null
            },
            include: {
                fromAccount: { select: { id: true, name: true, accountNumber: true } },
                toAccount:   { select: { id: true, name: true, accountNumber: true } }
            }
        });

        // 8. Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_fund_transfer',
                entityType: 'fund_transfer',
                entityId: String(transfer.id),
                details: { transferId, amount: numAmount, from: fromAccount.name, to: toAccount.name },
                ipAddress: req.ip || 'unknown'
            }
        });

        console.log(`✅ Fund Transfer created: ${transferId} — TSh ${numAmount.toLocaleString()} (${fromAccount.name} → ${toAccount.name})`);

        res.status(201).json({
            message: 'Transfer created successfully!',
            transfer
        });

    } catch (err) {
        console.error('❌ Create transfer error:', err);
        res.status(500).json({ error: 'Failed to create transfer: ' + err.message });
    }
}

// ================================================================
// EXECUTE (Finance) — With Balance Re-check
// PUT /api/fund-transfers/:id/execute
// ================================================================
async function executeTransfer(req, res) {
    try {
        const { id } = req.params;

        const transfer = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) },
            include: {
                fromAccount: true,
                toAccount: true
            }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        if (transfer.status !== 'approved') {
            return res.status(400).json({ error: 'Only approved transfers can be executed.' });
        }

        // Pata FinancialResources
        const fromResource = await prisma.financialResource.findUnique({
            where: { accountId: transfer.fromAccountId }
        });
        const toResource = await prisma.financialResource.findUnique({
            where: { accountId: transfer.toAccountId }
        });

        if (!fromResource) {
            return res.status(400).json({ error: 'From account has no financial resource.' });
        }
        if (!toResource) {
            return res.status(400).json({ error: 'To account has no financial resource.' });
        }

        // 🆕 Angalia balance TENA (kwa usalama — inaweza kubadilika)
        const fromBalanceBefore = Number(fromResource.amount);
        const toBalanceBefore = Number(toResource.amount);
        const amount = Number(transfer.amount);

        if (fromBalanceBefore < amount) {
            return res.status(400).json({
                error: `Insufficient balance at execution time. Available: TSh ${fromBalanceBefore.toLocaleString()}, Required: TSh ${amount.toLocaleString()}`
            });
        }

        // Unda transaction references
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 6).toUpperCase();
        const outRef = `TRF-${transfer.transferId}-OUT-${timestamp}-${random}`;
        const inRef = `TRF-${transfer.transferId}-IN-${timestamp}-${random}`;

        // TRANSACTION 1: OUTFLOW
        const fromBalanceAfter = fromBalanceBefore - amount;
        const outTransaction = await prisma.transaction.create({
            data: {
                transactionId: `TXN-${timestamp}-OUT-${random}`,
                resourceId: fromResource.id,
                type: 'OUTFLOW',
                amount,
                currency: fromResource.currency || 'TZS',
                source: 'TRANSFER',
                sourceId: String(transfer.id),
                sourceModel: 'FundTransfer',
                reference: outRef,
                description: `Transfer to ${transfer.toAccount.name}`,
                balanceBefore: fromBalanceBefore,
                balanceAfter: fromBalanceAfter,
                createdBy: req.user.fullName || 'Finance Officer'
            }
        });

        await prisma.financialResource.update({
            where: { id: fromResource.id },
            data: { amount: fromBalanceAfter }
        });

        // TRANSACTION 2: INFLOW
        const toBalanceAfter = toBalanceBefore + amount;
        const inTransaction = await prisma.transaction.create({
            data: {
                transactionId: `TXN-${timestamp}-IN-${random}`,
                resourceId: toResource.id,
                type: 'INFLOW',
                amount,
                currency: toResource.currency || 'TZS',
                source: 'TRANSFER',
                sourceId: String(transfer.id),
                sourceModel: 'FundTransfer',
                reference: inRef,
                description: `Transfer from ${transfer.fromAccount.name}`,
                balanceBefore: toBalanceBefore,
                balanceAfter: toBalanceAfter,
                createdBy: req.user.fullName || 'Finance Officer'
            }
        });

        await prisma.financialResource.update({
            where: { id: toResource.id },
            data: { amount: toBalanceAfter }
        });

        // Unda notice
        const noticeId = `TRF-NOTICE-${transfer.transferId}`;

        // Update transfer
        const updatedTransfer = await prisma.fundTransfer.update({
            where: { id: parseInt(id) },
            data: {
                status: 'completed',
                executedAt: new Date(),
                executedBy: req.user.fullName || 'Finance Officer',
                fromBalanceBefore,
                fromBalanceAfter,
                toBalanceBefore,
                toBalanceAfter,
                transactionOutId: outTransaction.transactionId,
                transactionInId: inTransaction.transactionId,
                noticeId,
                noticeIssuedAt: new Date(),
                noticeIssuedBy: req.user.fullName || 'Finance Officer'
            },
            include: {
                fromAccount: true,
                toAccount: true
            }
        });

        // 🆕 UPDATE balance ya CompanyAccount PIA
        await prisma.companyAccount.update({
            where: { id: transfer.fromAccountId },
            data: { balance: fromBalanceAfter }
        });
        await prisma.companyAccount.update({
            where: { id: transfer.toAccountId },
            data: { balance: toBalanceAfter }
        });

        console.log(`💸 Fund Transfer EXECUTED: ${transfer.transferId}`);

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'execute_fund_transfer',
                entityType: 'fund_transfer',
                entityId: String(transfer.id),
                details: { transferId: transfer.transferId, noticeId },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Transfer executed successfully!',
            transfer: updatedTransfer,
            transactions: {
                out: outTransaction,
                in: inTransaction
            },
            notice: {
                noticeId,
                issuedAt: updatedTransfer.noticeIssuedAt
            }
        });

    } catch (err) {
        console.error('❌ Execute transfer error:', err);
        res.status(500).json({ error: 'Failed to execute transfer: ' + err.message });
    }
}
async function updateTransfer(req, res) {
    try {
        const { id } = req.params;
        const { amount, reason, notes, status } = req.body;

        const existing = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        if (existing.status === 'completed') {
            return res.status(400).json({ error: 'Cannot edit completed transfers.' });
        }

        const transfer = await prisma.fundTransfer.update({
            where: { id: parseInt(id) },
            data: {
                ...(amount !== undefined && { amount: parseFloat(amount) }),
                ...(reason !== undefined && { reason }),
                ...(notes !== undefined && { notes }),
                ...(status !== undefined && { status })
            }
        });

        res.json({
            message: 'Transfer updated!',
            transfer
        });

    } catch (err) {
        console.error('❌ Update transfer error:', err);
        res.status(500).json({ error: 'Failed to update transfer: ' + err.message });
    }
}

// ================================================================
// SEND TO MANAGER
// PUT /api/fund-transfers/:id/send-to-manager
// ================================================================
async function sendToManager(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        if (existing.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft transfers can be sent.' });
        }

        const transfer = await prisma.fundTransfer.update({
            where: { id: parseInt(id) },
            data: {
                status: 'pending-manager',
                sentToManagerAt: new Date(),
                sentToManagerBy: req.user.fullName || 'Finance Officer'
            }
        });

        console.log(`📤 Transfer ${transfer.transferId} sent to Manager`);

        res.json({
            message: 'Transfer sent to Manager!',
            transfer
        });

    } catch (err) {
        console.error('❌ Send to manager error:', err);
        res.status(500).json({ error: 'Failed to send transfer.' });
    }
}

// ================================================================
// VERIFY (Manager)
// PUT /api/fund-transfers/:id/verify
// ================================================================
async function verifyTransfer(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        if (existing.status !== 'pending-manager') {
            return res.status(400).json({ error: 'Only pending-manager transfers can be verified.' });
        }

        const transfer = await prisma.fundTransfer.update({
            where: { id: parseInt(id) },
            data: {
                status: 'pending-ceo',
                managerVerifiedAt: new Date(),
                managerVerifiedBy: req.user.fullName || 'Manager'
            }
        });

        console.log(`✅ Transfer ${transfer.transferId} verified by Manager`);

        res.json({
            message: 'Transfer verified and sent to CEO!',
            transfer
        });

    } catch (err) {
        console.error('❌ Verify transfer error:', err);
        res.status(500).json({ error: 'Failed to verify transfer.' });
    }
}

// ================================================================
// APPROVE (CEO)
// PUT /api/fund-transfers/:id/approve
// ================================================================
async function approveTransfer(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        if (existing.status !== 'pending-ceo') {
            return res.status(400).json({ error: 'Only pending-ceo transfers can be approved.' });
        }

        const transfer = await prisma.fundTransfer.update({
            where: { id: parseInt(id) },
            data: {
                status: 'approved',
                ceoApprovedAt: new Date(),
                ceoApprovedBy: req.user.fullName || 'CEO'
            }
        });

        console.log(`🟢 Transfer ${transfer.transferId} approved by CEO`);

        res.json({
            message: 'Transfer approved! Finance can now execute.',
            transfer
        });

    } catch (err) {
        console.error('❌ Approve transfer error:', err);
        res.status(500).json({ error: 'Failed to approve transfer.' });
    }
}

async function rejectTransfer(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required.' });
        }

        const existing = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        const userRole = (req.user.role || '').toLowerCase();
        const rejectedByRole = userRole.includes('ceo') ? 'CEO' : 'Manager';

        const transfer = await prisma.fundTransfer.update({
            where: { id: parseInt(id) },
            data: {
                status: 'rejected',
                rejectedAt: new Date(),
                rejectedBy: rejectedByRole,
                rejectionReason: reason
            }
        });

        console.log(`❌ Transfer ${transfer.transferId} rejected by ${rejectedByRole}`);

        res.json({
            message: 'Transfer rejected.',
            transfer
        });

    } catch (err) {
        console.error('❌ Reject transfer error:', err);
        res.status(500).json({ error: 'Failed to reject transfer.' });
    }
}

// ================================================================
// DELETE (draft only)
// DELETE /api/fund-transfers/:id
// ================================================================
async function deleteTransfer(req, res) {
    try {
        const { id } = req.params;

        const transfer = await prisma.fundTransfer.findUnique({
            where: { id: parseInt(id) }
        });

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found.' });
        }

        if (transfer.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft transfers can be deleted.' });
        }

        await prisma.fundTransfer.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Transfer deleted successfully.' });

    } catch (err) {
        console.error('❌ Delete transfer error:', err);
        res.status(500).json({ error: 'Failed to delete transfer.' });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    listTransfers,
    getTransfer,
    createTransfer,
    updateTransfer,
    sendToManager,
    verifyTransfer,
    approveTransfer,
    executeTransfer,
    rejectTransfer,
    deleteTransfer
};