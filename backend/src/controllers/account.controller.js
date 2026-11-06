// ================================================================
// MAK DC INVESTMENT — COMPANY ACCOUNT CONTROLLER
// ================================================================
// Finance anaunda (draft → pending-manager)
// Manager ana-verify (pending-manager → pending-ceo)
// CEO ana-approve (pending-ceo → approved 🔒)
// Manager/CEO wana-reject
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// LIST ALL ACCOUNTS
// GET /api/accounts
// ================================================================
async function listAccounts(req, res) {
    try {
        const accounts = await prisma.companyAccount.findMany({
            include: {
                requester: {
                    select: { id: true, fullName: true, email: true, role: true }
                },
                approver: {
                    select: { id: true, fullName: true, email: true, role: true }
                }
            },
            orderBy: [
                { status: 'asc' },
                { createdAt: 'desc' }
            ]
        });

        res.json(accounts);

    } catch (err) {
        console.error('❌ List accounts error:', err);
        res.status(500).json({ error: 'Failed to fetch accounts.' });
    }
}

// ================================================================
// LIST APPROVED ACCOUNTS (Kwa dropdown)
// GET /api/accounts/approved
// ================================================================
async function listApprovedAccounts(req, res) {
    try {
        const accounts = await prisma.companyAccount.findMany({
            where: {
                status: 'approved',
                isActive: true
            },
            orderBy: { name: 'asc' }
        });

        res.json(accounts);

    } catch (err) {
        console.error('❌ List approved accounts error:', err);
        res.status(500).json({ error: 'Failed to fetch approved accounts.' });
    }
}

// ================================================================
// GET SINGLE ACCOUNT
// GET /api/accounts/:id
// ================================================================
async function getAccount(req, res) {
    try {
        const { id } = req.params;

        const account = await prisma.companyAccount.findUnique({
            where: { id: parseInt(id) },
            include: {
                requester: {
                    select: { id: true, fullName: true, email: true, role: true }
                },
                approver: {
                    select: { id: true, fullName: true, email: true, role: true }
                }
            }
        });

        if (!account) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        res.json(account);

    } catch (err) {
        console.error('❌ Get account error:', err);
        res.status(500).json({ error: 'Failed to fetch account.' });
    }
}

// ================================================================
// CREATE ACCOUNT (Finance anaongeza)
// POST /api/accounts
// ================================================================
async function createAccount(req, res) {
    try {
        const {
            name, type, accountNumber, accountName,
            branch, swiftCode, instructions, currency,
            balance, notes, status, purpose,
            sentToManagerAt, sentToManagerBy
        } = req.body;

        if (!name || !type || !accountNumber) {
            return res.status(400).json({
                error: 'Name, type, and account number are required.'
            });
        }

        // 🆕 TANGAZA accountPurpose KABLA ya kuitumia
        const accountPurpose = purpose || 'general';

        const existing = await prisma.companyAccount.findFirst({
            where: { accountNumber, type }
        });

        if (existing) {
            return res.status(400).json({
                error: 'An account with this number already exists.'
            });
        }

        const targetStatus = status || 'draft';

        const account = await prisma.companyAccount.create({
            data: {
                name,
                type,
                accountNumber,
                accountName: accountName || name,
                branch: branch || null,
                swiftCode: swiftCode || null,
                instructions: instructions || null,
                currency: currency || 'TZS',
                balance: parseFloat(balance) || 0,
                notes: notes || null,
                status: targetStatus,
                purpose: accountPurpose,  // ✅ Sasa ipo
                requestedBy: req.user.userId,
                createdBy: req.user.fullName || req.user.email || 'Finance',
                sentToManagerAt: targetStatus === 'pending-manager' 
                    ? (sentToManagerAt ? new Date(sentToManagerAt) : new Date()) 
                    : null,
                sentToManagerBy: targetStatus === 'pending-manager' 
                    ? (sentToManagerBy || req.user.fullName || 'Finance') 
                    : null
            },
            include: {
                requester: {
                    select: { id: true, fullName: true, role: true, email: true }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_company_account',
                entityType: 'company_account',
                entityId: String(account.id),
                details: { name, accountNumber, status: targetStatus, purpose: accountPurpose },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.status(201).json({
            message: 'Account created! Waiting for approval.',
            account
        });

    } catch (err) {
        console.error('❌ Create account error:', err);
        res.status(500).json({ error: 'Failed to create account: ' + err.message });
    }
}

// ================================================================
// UPDATE ACCOUNT (Finance + Manager wana-edit)
// PUT /api/accounts/:id
// ================================================================
async function updateAccount(req, res) {
    try {
        const { id } = req.params;
        const {
            name, type, accountNumber, accountName,
            branch, swiftCode, instructions, currency,
            balance, notes, status, purpose,
            sentToManagerAt, sentToManagerBy,
            managerVerifiedAt, managerVerifiedBy,
            ceoApprovedAt, ceoApprovedBy,
            rejectedAt, rejectedBy, rejectionReason
        } = req.body;

        const existing = await prisma.companyAccount.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Account not found.' });
        }
        // 🆕 Ruhusu balance update tu kwa accounts zilizoidhinishwa
        // (Kwa malipo ya Finance — sio kuhariri taarifa za account)
        const isOnlyBalanceUpdate = 
            balance !== undefined && 
            name === undefined && 
            accountNumber === undefined && 
            type === undefined &&
            status === undefined;

        // Block editing kama approved, ISIPOKUWA ni balance tu
        if (existing.status === 'approved' && !rejectionReason && !isOnlyBalanceUpdate) {
            return res.status(400).json({
                error: 'Cannot edit approved accounts. Contact CEO/Manager.'
            });
        }
        const updateData = {
            ...(name !== undefined && { name }),
            ...(type !== undefined && { type }),
            ...(accountNumber !== undefined && { accountNumber }),
            ...(accountName !== undefined && { accountName }),
            ...(branch !== undefined && { branch }),
            ...(swiftCode !== undefined && { swiftCode }),
            ...(purpose !== undefined && { purpose }),  // 🆕
            ...(instructions !== undefined && { instructions }),
            ...(currency !== undefined && { currency }),
            ...(balance !== undefined && { balance: parseFloat(balance) || 0 }),
            ...(notes !== undefined && { notes }),
            ...(status !== undefined && { status }),
            
            ...(sentToManagerAt !== undefined && { 
                sentToManagerAt: sentToManagerAt ? new Date(sentToManagerAt) : null 
            }),
            ...(sentToManagerBy !== undefined && { sentToManagerBy }),
            
            ...(managerVerifiedAt !== undefined && { 
                managerVerifiedAt: managerVerifiedAt ? new Date(managerVerifiedAt) : null 
            }),
            ...(managerVerifiedBy !== undefined && { managerVerifiedBy }),
            
            ...(ceoApprovedAt !== undefined && { 
                ceoApprovedAt: ceoApprovedAt ? new Date(ceoApprovedAt) : null 
            }),
            ...(ceoApprovedBy !== undefined && { ceoApprovedBy }),
            
            ...(rejectedAt !== undefined && { 
                rejectedAt: rejectedAt ? new Date(rejectedAt) : null 
            }),
            ...(rejectedBy !== undefined && { rejectedBy }),
            ...(rejectionReason !== undefined && { rejectionReason })
        };

        const account = await prisma.companyAccount.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                requester: {
                    select: { id: true, fullName: true, role: true, email: true }
                },
                approver: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_company_account',
                entityType: 'company_account',
                entityId: String(id),
                details: { name, status, purpose },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Account updated!',
            account
        });

    } catch (err) {
        console.error('❌ Update account error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Account not found.' });
        }
        res.status(500).json({ error: 'Failed to update account: ' + err.message });
    }
}

// ================================================================
// VERIFY ACCOUNT (Manager pekee)
// PUT /api/accounts/:id/verify
// ================================================================
async function verifyAccount(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.companyAccount.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        if (existing.status !== 'pending-manager' && existing.status !== 'pending') {
            return res.status(400).json({
                error: 'Only pending-manager accounts can be verified.'
            });
        }

        const account = await prisma.companyAccount.update({
            where: { id: parseInt(id) },
            data: {
                status: 'pending-ceo',
                managerVerifiedAt: new Date(),
                managerVerifiedBy: req.user.fullName || 'Manager'
            },
            include: {
                requester: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'verify_company_account',
                entityType: 'company_account',
                entityId: String(id),
                details: { name: account.name },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Account verified and sent to CEO!',
            account
        });

    } catch (err) {
        console.error('❌ Verify account error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Account not found.' });
        }
        res.status(500).json({ error: 'Failed to verify account.' });
    }
}

// ================================================================
// APPROVE ACCOUNT (CEO pekee)
// PUT /api/accounts/:id/approve
// ================================================================
async function approveAccount(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.companyAccount.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        if (existing.status === 'approved') {
            return res.status(400).json({ error: 'Account is already approved.' });
        }

        if (existing.status !== 'pending-ceo') {
            return res.status(400).json({
                error: 'Only pending-ceo accounts can be approved.'
            });
        }

        const account = await prisma.companyAccount.update({
            where: { id: parseInt(id) },
            data: {
                status: 'approved',
                ceoApprovedAt: new Date(),
                ceoApprovedBy: req.user.fullName || 'CEO',
                approvedBy: req.user.userId,
                approvedAt: new Date(),
                rejectedBy: null,
                rejectedAt: null,
                rejectionReason: null
            },
            include: {
                requester: {
                    select: { id: true, fullName: true, role: true }
                },
                approver: {
                    select: { id: true, fullName: true, role: true }
                }
            }
        });

        // ================================================================
        // 🆕 INTEGRATION HOOK: Create FinancialResource from Account
        // ================================================================
        try {
            if (account.type === 'Bank' || account.type === 'Mobile Money' || account.type === 'Cash') {
                const existingResource = await prisma.financialResource.findUnique({
                    where: { accountId: account.id }
                });
                
                if (!existingResource) {
                    await prisma.financialResource.create({
                        data: {
                            resourceId: `RES-ACC-${account.id}`,
                            name: account.name,
                            category: account.type === 'Bank' ? 'bank' : (account.type === 'Mobile Money' ? 'cash' : 'cash'),
                            amount: account.balance || 0,
                            currency: account.currency || 'TZS',
                            location: account.branch || null,
                            description: `Auto-created from approved account: ${account.accountNumber}`,
                            status: 'active',
                            accountId: account.id,
                            createdBy: req.user.fullName || 'CEO'
                        }
                    });
                    console.log(`🏦 Resource created for account: ${account.name}`);
                } else {
                    console.log(`✅ Resource already exists for account: ${account.name}`);
                }
            }
        } catch (resourceErr) {
            console.error('⚠️ Resource creation failed:', resourceErr.message);
        }

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'approve_company_account',
                entityType: 'company_account',
                entityId: String(id),
                details: { name: account.name },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Account approved and locked!',
            account
        });

    } catch (err) {
        console.error('❌ Approve account error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Account not found.' });
        }
        res.status(500).json({ error: 'Failed to approve account.' });
    }
}

// ================================================================
// REJECT ACCOUNT (Manager/CEO)
// PUT /api/accounts/:id/reject
// ================================================================
async function rejectAccount(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required.' });
        }

        const existing = await prisma.companyAccount.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const userRole = (req.user.role || '').toLowerCase();
        const rejectedByRole = userRole.includes('ceo') ? 'CEO' : 'Manager';

        const account = await prisma.companyAccount.update({
            where: { id: parseInt(id) },
            data: {
                status: 'rejected',
                rejectedBy: rejectedByRole,
                rejectedAt: new Date(),
                rejectionReason: reason
            },
            include: {
                requester: {
                    select: { id: true, fullName: true }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'reject_company_account',
                entityType: 'company_account',
                entityId: String(id),
                details: { reason, rejectedBy: rejectedByRole },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Account rejected.',
            account
        });

    } catch (err) {
        console.error('❌ Reject account error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Account not found.' });
        }
        res.status(500).json({ error: 'Failed to reject account.' });
    }
}

// ================================================================
// TOGGLE ACTIVE (CEO + Manager)
// PUT /api/accounts/:id/toggle-active
// ================================================================
async function toggleActive(req, res) {
    try {
        const { id } = req.params;

        const existing = await prisma.companyAccount.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Account not found.' });
        }

        const account = await prisma.companyAccount.update({
            where: { id: parseInt(id) },
            data: { isActive: !existing.isActive }
        });

        res.json({
            message: `Account ${account.isActive ? 'activated' : 'deactivated'}.`,
            account
        });

    } catch (err) {
        console.error('❌ Toggle active error:', err);
        res.status(500).json({ error: 'Failed to toggle account.' });
    }
}

// ================================================================
// DELETE ACCOUNT
// DELETE /api/accounts/:id
// ================================================================
async function deleteAccount(req, res) {
    try {
        const { id } = req.params;

        const ordersCount = await prisma.order.count({
            where: { paymentAccountId: parseInt(id) }
        });

        if (ordersCount > 0) {
            return res.status(400).json({
                error: `Cannot delete. Account is used in ${ordersCount} order(s). Deactivate instead.`
            });
        }

        await prisma.companyAccount.delete({
            where: { id: parseInt(id) }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_company_account',
                entityType: 'company_account',
                entityId: String(id),
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({ message: 'Account deleted successfully.' });

    } catch (err) {
        console.error('❌ Delete account error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Account not found.' });
        }
        res.status(500).json({ error: 'Failed to delete account.' });
    }
}

// ================================================================
// 🆕 SETUP MAIN CASH (System — auto-create as draft)
// POST /api/accounts/setup-main-cash
// ================================================================
async function setupMainCash(req, res) {
    try {
        const existing = await prisma.companyAccount.findFirst({
            where: { name: 'Main Cash' }
        });

        if (existing) {
            return res.json({
                message: 'Main Cash account already exists.',
                account: existing,
                alreadyExists: true
            });
        }

        const account = await prisma.companyAccount.create({
            data: {
                name: 'Main Cash',
                type: 'Cash',
                accountNumber: 'MAIN-CASH-001',
                accountName: 'Main Cash',
                currency: 'TZS',
                balance: 0,
                status: 'draft',
                purpose: 'operations',
                createdBy: 'System',
                requestedBy: req.user.userId,
                notes: 'System default account for payments. Edit and submit for approval.'
            }
        });

        console.log(`✅ Main Cash account created: ${account.id}`);

        res.json({
            message: 'Main Cash account created as draft.',
            account,
            alreadyExists: false
        });

    } catch (err) {
        console.error('❌ setupMainCash error:', err);
        res.status(500).json({ error: 'Failed to setup Main Cash: ' + err.message });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    listAccounts,
    listApprovedAccounts,
    getAccount,
    createAccount,
    updateAccount,
    verifyAccount,
    approveAccount,
    rejectAccount,
    toggleActive,
    deleteAccount,
    setupMainCash
};