// ================================================================
// MAK DC INVESTMENT — PAYROLL CONTROLLER
// ================================================================
// Handles: Payroll creation, workflow, status updates
// Integration: Ledger service (OUTFLOW when paid)
// ================================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================
// 1. GET ALL PAYROLLS
// GET /api/payrolls
// ============================================================
exports.getAllPayrolls = async (req, res) => {
    try {
        const payrolls = await prisma.payroll.findMany({
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payrolls);
    } catch (error) {
        console.error('getAllPayrolls error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// 2. GET SINGLE PAYROLL
// GET /api/payrolls/:id
// ============================================================
exports.getPayrollById = async (req, res) => {
    try {
        const payroll = await prisma.payroll.findUnique({
            where: { id: parseInt(req.params.id) },
            include: { items: true }
        });
        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
        res.json(payroll);
    } catch (error) {
        console.error('getPayrollById error:', error);
        res.status(500).json({ error: error.message });
    }
};
// ============================================================
// CREATE PAYROLL (Finance) — With Balance Validation
// POST /api/payrolls
// ============================================================
exports.createPayroll = async (req, res) => {
    try {
        const { month, year, items, createdBy, status, accountId } = req.body;

        // 1. Validation ya msingi
        if (!month || !year || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Month, year, and items are required' });
        }

        if (!accountId) {
            return res.status(400).json({ 
                error: 'Operations account is required for payroll.' 
            });
        }

        // 2. Angalia operations account
        const account = await prisma.companyAccount.findUnique({
            where: { id: parseInt(accountId) }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        if (account.status !== 'approved') {
            return res.status(400).json({ 
                error: 'Account must be approved before use.' 
            });
        }

        if (account.purpose !== 'operations') {
            return res.status(400).json({ 
                error: 'Only Operations accounts can be used for payroll.' 
            });
        }

        // 3. Angalia kama payroll ipo
        const payrollId = `PAY-${year}-${String(month).padStart(2, '0')}`;
        const existing = await prisma.payroll.findUnique({
            where: { payrollId }
        });
        if (existing) {
            return res.status(400).json({
                error: `Payroll for ${month}/${year} already exists (${payrollId})`
            });
        }

        // 4. Kokotoa total
        const totalAmount = items.reduce((sum, item) => sum + Number(item.netPay), 0);

        // 🆕 5. ANGALIA BALANCE — HII NI MUHIMU
        const balance = Number(account.balance || 0);
        if (totalAmount > balance) {
            return res.status(400).json({
                error: `Insufficient balance. Payroll total: ${account.currency || 'TZS'} ${totalAmount.toLocaleString()}, Available: ${account.currency || 'TZS'} ${balance.toLocaleString()}, Shortage: ${account.currency || 'TZS'} ${(totalAmount - balance).toLocaleString()}`
            });
        }

        const now = new Date().toISOString();

        // 6. Unda payroll
        const payroll = await prisma.payroll.create({
            data: {
                payrollId,
                month: parseInt(month),
                year: parseInt(year),
                totalAmount,
                accountId: parseInt(accountId),
                status: status || 'draft',
                createdBy: createdBy || 'Finance Officer',
                sentToManagerAt: status === 'pending-manager' ? now : null,
                sentToManagerBy: status === 'pending-manager' ? createdBy : null,
                items: {
                    create: items.map(item => ({
                        employeeId: item.employeeId,
                        employeeName: item.employeeName,
                        position: item.position,
                        department: item.department,
                        basicSalary: item.basicSalary,
                        allowances: item.allowances || 0,
                        deductions: item.deductions || 0,
                        netPay: item.netPay,
                        paymentMode: item.paymentMode || null,
                        bankAccount: item.bankAccount || null
                    }))
                }
            },
            include: { items: true }
        });

        console.log(`✅ Payroll created: ${payrollId} — TSh ${totalAmount.toLocaleString()}`);
        res.status(201).json(payroll);
    } catch (error) {
        console.error('createPayroll error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// UPDATE PAYROLL STATUS — With Balance Re-check when Paid
// PUT /api/payrolls/:id/status
// ============================================================
exports.updatePayrollStatus = async (req, res) => {
    try {
        const { status, actionBy, reason } = req.body;
        const payrollId = parseInt(req.params.id);
        const now = new Date().toISOString();

        const payroll = await prisma.payroll.findUnique({
            where: { id: payrollId },
            include: { items: true }
        });

        if (!payroll) {
            return res.status(404).json({ error: 'Payroll not found' });
        }

        // 🆕 Angalia balance kabla ya "paid"
        if (status === 'paid' && payroll.accountId) {
            const account = await prisma.companyAccount.findUnique({
                where: { id: payroll.accountId }
            });

            if (!account) {
                return res.status(404).json({ error: 'Linked account not found.' });
            }

            const balance = Number(account.balance || 0);
            const totalAmount = Number(payroll.totalAmount || 0);

            if (totalAmount > balance) {
                return res.status(400).json({
                    error: `Insufficient balance at payment time. Available: ${account.currency || 'TZS'} ${balance.toLocaleString()}, Required: ${account.currency || 'TZS'} ${totalAmount.toLocaleString()}, Shortage: ${account.currency || 'TZS'} ${(totalAmount - balance).toLocaleString()}`
                });
            }

            // 🆕 Punguza balance ya account
            await prisma.companyAccount.update({
                where: { id: payroll.accountId },
                data: { balance: balance - totalAmount }
            });
        }

        const updateData = { status };

        switch (status) {
            case 'pending-manager':
                updateData.sentToManagerAt = now;
                updateData.sentToManagerBy = actionBy;
                break;
            case 'pending-ceo':
                updateData.managerVerifiedAt = now;
                updateData.managerVerifiedBy = actionBy;
                break;
            case 'approved':
                updateData.ceoApprovedAt = now;
                updateData.ceoApprovedBy = actionBy;
                break;
            case 'paid':
                updateData.paidAt = now;
                updateData.paidBy = actionBy;
                break;
            case 'rejected':
                updateData.rejectedAt = now;
                updateData.rejectedBy = actionBy;
                updateData.rejectionReason = reason || null;
                break;
            default:
                return res.status(400).json({ error: 'Invalid status' });
        }

        const updatedPayroll = await prisma.payroll.update({
            where: { id: payrollId },
            data: updateData,
            include: { items: true }
        });

        // Record transaction (OUTFLOW)
        if (status === 'paid') {
            try {
                const { recordTransaction } = require('../services/ledger.service');
                
                // Pata resource ya account
                const account = await prisma.companyAccount.findUnique({
                    where: { id: payroll.accountId }
                });
                
                const resource = await prisma.financialResource.findUnique({
                    where: { accountId: payroll.accountId }
                });

                if (resource) {
                    await recordTransaction({
                        resourceId: resource.id,
                        type: 'OUTFLOW',
                        amount: payroll.totalAmount,
                        source: 'PAYROLL',
                        sourceId: payroll.id,
                        sourceModel: 'Payroll',
                        reference: payroll.payrollId,
                        description: `Payroll for ${payroll.month}/${payroll.year} — ${payroll.items?.length || 0} employees`,
                        createdBy: actionBy || 'Finance Officer'
                    });
                    console.log(`💸 Ledger: Payroll OUTFLOW recorded — TSh ${Number(payroll.totalAmount).toLocaleString()}`);
                }
            } catch (ledgerErr) {
                console.error('⚠️ Ledger error (payroll still saved):', ledgerErr.message);
            }
        }

        res.json(updatedPayroll);
    } catch (error) {
        console.error('updatePayrollStatus error:', error);
        res.status(500).json({ error: error.message });
    }
};
// ============================================================
// 4. UPDATE PAYROLL STATUS (Workflow)
// PUT /api/payrolls/:id/status
// ============================================================
exports.updatePayrollStatus = async (req, res) => {
    try {
        const { status, actionBy, reason } = req.body;
        const payrollId = parseInt(req.params.id);
        const now = new Date().toISOString();

        const updateData = { status };

        switch (status) {
            case 'pending-manager':
                updateData.sentToManagerAt = now;
                updateData.sentToManagerBy = actionBy;
                break;
            case 'pending-ceo':
                updateData.managerVerifiedAt = now;
                updateData.managerVerifiedBy = actionBy;
                break;
            case 'approved':
                updateData.ceoApprovedAt = now;
                updateData.ceoApprovedBy = actionBy;
                break;
            case 'paid':
                updateData.paidAt = now;
                updateData.paidBy = actionBy;
                break;
            case 'rejected':
                updateData.rejectedAt = now;
                updateData.rejectedBy = actionBy;
                updateData.rejectionReason = reason || null;
                break;
            default:
                return res.status(400).json({ error: 'Invalid status' });
        }

        const payroll = await prisma.payroll.update({
            where: { id: payrollId },
            data: updateData,
            include: { items: true }
        });

        // ================================================================
        // 🆕 INTEGRATION HOOK: Record Transaction (OUTFLOW)
        // ================================================================
        if (status === 'paid') {
            try {
                const { recordTransaction, getMainCashResource } = require('../services/ledger.service');
                const mainCash = await getMainCashResource();
                
                if (mainCash) {
                    await recordTransaction({
                        resourceId: mainCash.id,
                        type: 'OUTFLOW',
                        amount: payroll.totalAmount,
                        source: 'PAYROLL',
                        sourceId: payroll.id,
                        sourceModel: 'Payroll',
                        reference: payroll.payrollId,
                        description: `Payroll for ${payroll.month}/${payroll.year} — ${payroll.items?.length || 0} employees`,
                        createdBy: actionBy || 'Finance Officer'
                    });
                    console.log(`💸 Ledger: Payroll OUTFLOW recorded — TSh ${Number(payroll.totalAmount).toLocaleString()}`);
                } else {
                    console.warn('⚠️ Main Cash resource not found. Ledger skipped.');
                }
            } catch (ledgerErr) {
                console.error('⚠️ Ledger error (payroll still saved):', ledgerErr.message);
            }
        }

        res.json(payroll);
    } catch (error) {
        console.error('updatePayrollStatus error:', error);
        res.status(500).json({ error: error.message });
    }
};

// ============================================================
// 5. DELETE PAYROLL (Only Draft)
// DELETE /api/payrolls/:id
// ============================================================
exports.deletePayroll = async (req, res) => {
    try {
        const payroll = await prisma.payroll.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!payroll) return res.status(404).json({ error: 'Payroll not found' });
        if (payroll.status !== 'draft') {
            return res.status(400).json({ error: 'Only draft payrolls can be deleted' });
        }

        await prisma.payroll.delete({
            where: { id: parseInt(req.params.id) }
        });

        console.log(`🗑️ Payroll deleted: ${payroll.payrollId}`);
        res.json({ message: 'Payroll deleted successfully' });
    } catch (error) {
        console.error('deletePayroll error:', error);
        res.status(500).json({ error: error.message });
    }
};