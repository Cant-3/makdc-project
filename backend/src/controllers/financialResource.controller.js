// ================================================================
// MAK DC INVESTMENT — FINANCIAL RESOURCE CONTROLLER
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// CONSTANTS
// ================================================================
const MAIN_CASH_RESOURCE_ID = 'MAIN-CASH-001';

// ================================================================
// HELPER: Angalia kama ni Main Cash
// ================================================================
function isMainCash(resource) {
    if (!resource) return false;
    return resource.resourceId === MAIN_CASH_RESOURCE_ID;
}

// ================================================================
// LIST ALL RESOURCES
// GET /api/financial-resources
// ================================================================
exports.listResources = async (req, res) => {
    try {
        const resources = await prisma.financialResource.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(resources);
    } catch (err) {
        console.error('listResources error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// GET STATS
// GET /api/financial-resources/stats
// ================================================================
exports.getStats = async (req, res) => {
    try {
        const resources = await prisma.financialResource.findMany();
        
        const total = resources
            .filter(r => r.status === 'active')
            .reduce((sum, r) => sum + Number(r.amount), 0);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const transactions = await prisma.transaction.findMany({
            where: { createdAt: { gte: startOfMonth } }
        });
        
        const inflow = transactions
            .filter(t => t.type === 'INFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        const outflow = transactions
            .filter(t => t.type === 'OUTFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        
        res.json({
            total,
            totalCount: resources.length,
            activeCount: resources.filter(r => r.status === 'active').length,
            inflow,
            outflow,
            net: inflow - outflow
        });
    } catch (err) {
        console.error('getStats error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// GET SINGLE RESOURCE
// GET /api/financial-resources/:id
// ================================================================
exports.getResource = async (req, res) => {
    try {
        const resource = await prisma.financialResource.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        
        res.json(resource);
    } catch (err) {
        console.error('getResource error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// CREATE RESOURCE
// POST /api/financial-resources
// ================================================================
exports.createResource = async (req, res) => {
    try {
        const { resourceId, name, category, amount, currency, location, description } = req.body;
        
        if (!name || !category) {
            return res.status(400).json({ 
                error: 'Name and category are required' 
            });
        }
        
        // 🆕 Zuia jina "Main Cash" — kwa mtumiaji wa kawaida
        const isSystemMainCash = resourceId === MAIN_CASH_RESOURCE_ID;
        
        if (!isSystemMainCash && name.toLowerCase().includes('main cash')) {
            return res.status(400).json({ 
                error: '"Main Cash" is a reserved name and cannot be used. Please choose a different name.' 
            });
        }
        
        // 🆕 Kama ni system Main Cash, hakikisha haipo tayari
        if (isSystemMainCash) {
            const existing = await prisma.financialResource.findUnique({
                where: { resourceId: MAIN_CASH_RESOURCE_ID }
            });
            
            if (existing) {
                return res.status(400).json({ 
                    error: 'Main Cash already exists. Only one Main Cash is allowed.' 
                });
            }
        }
        
        const validCategories = ['cash', 'bank', 'asset', 'investment', 'equipment', 'inventory', 'precious', 'other'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ 
                error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
            });
        }
        
        const numAmount = parseFloat(amount) || 0;
        
        // 🆕 Generate resource ID
        let finalResourceId = resourceId;
        if (!finalResourceId) {
            const count = await prisma.financialResource.count();
            finalResourceId = `RES-${String(count + 1).padStart(4, '0')}`;
        }
        
        const resource = await prisma.financialResource.create({
            data: {
                resourceId: finalResourceId,
                name,
                category,
                amount: numAmount,
                currency: currency || 'TZS',
                location: location || null,
                description: description || null,
                status: 'active',
                createdBy: req.user.fullName || 'Finance Officer'
            }
        });
        const CASH_CATEGORIES = ['cash', 'bank'];
        if (numAmount > 0 && CASH_CATEGORIES.includes(category)) {
            await prisma.transaction.create({
                data: {
                    transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
                    resourceId: resource.id,
                    type: 'INFLOW',
                    amount: numAmount,
                    currency: resource.currency,
                    source: 'MANUAL',
                    sourceId: null,
                    sourceModel: null,
                    reference: `INIT-${finalResourceId}`,
                    description: 'Initial balance',
                    balanceBefore: 0,
                    balanceAfter: numAmount,
                    createdBy: req.user.fullName || 'Finance Officer'
                }
            });
        } else if (numAmount > 0) {
            console.log(`ℹ️  Resource "${name}" (${category}) — no initial transaction (non-cash category)`);
        }
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_financial_resource',
                entityType: 'financial_resource',
                entityId: String(resource.id),
                details: { name, category, amount: numAmount },
                ipAddress: req.ip || 'unknown'
            }
        });
        
        res.status(201).json(resource);
    } catch (err) {
        console.error('createResource error:', err);
        res.status(500).json({ error: err.message });
    }
};
exports.updateResource = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, location, description, status } = req.body;
        
        // Pata resource kwanza
        const existing = await prisma.financialResource.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!existing) {
            return res.status(404).json({ error: 'Resource not found.' });
        }
        
        // 🆕 Zuia Main Cash — haiwezi ku-edit KABISA
        if (isMainCash(existing)) {
            return res.status(400).json({ 
                error: 'Main Cash is the default resource and cannot be edited. It is locked by the system.' 
            });
        }
        
        // 🆕 Zuia kubadilisha jina kuwa "Main Cash"
        if (name && name.toLowerCase().includes('main cash')) {
            return res.status(400).json({ 
                error: '"Main Cash" is a reserved name and cannot be used.' 
            });
        }
        
        const resource = await prisma.financialResource.update({
            where: { id: parseInt(id) },
            data: {
                ...(name && { name }),
                ...(category && { category }),
                ...(location !== undefined && { location }),
                ...(description !== undefined && { description }),
                ...(status && { status })
            }
        });
        
        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_financial_resource',
                entityType: 'financial_resource',
                entityId: String(id),
                details: { name, status },
                ipAddress: req.ip || 'unknown'
            }
        });
        
        res.json(resource);
    } catch (err) {
        console.error('updateResource error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// DELETE RESOURCE
// DELETE /api/financial-resources/:id
// ================================================================
exports.deleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        
        const resource = await prisma.financialResource.findUnique({
            where: { id: parseInt(id) }
        });
        
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found.' });
        }
        
        // 🆕 Zuia Main Cash kufutwa — KABISA
        if (isMainCash(resource)) {
            return res.status(400).json({ 
                error: 'Main Cash is the default resource and cannot be deleted. It is locked by the system.' 
            });
        }
        
        const txnCount = await prisma.transaction.count({
            where: { resourceId: parseInt(id) }
        });
        
        if (txnCount > 0) {
            return res.status(400).json({ 
                error: `Cannot delete. Resource has ${txnCount} transaction(s).` 
            });
        }
        
        await prisma.financialResource.delete({
            where: { id: parseInt(id) }
        });
        
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_financial_resource',
                entityType: 'financial_resource',
                entityId: String(id),
                ipAddress: req.ip || 'unknown'
            }
        });
        
        res.json({ message: 'Resource deleted successfully.' });
    } catch (err) {
        console.error('deleteResource error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Resource not found.' });
        }
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// CLOSE RESOURCE (Soft delete)
// PUT /api/financial-resources/:id/close
// ================================================================
exports.closeResource = async (req, res) => {
    try {
        const { reason } = req.body;
        
        const existing = await prisma.financialResource.findUnique({
            where: { id: parseInt(req.params.id) }
        });
        
        if (!existing) {
            return res.status(404).json({ error: 'Resource not found.' });
        }
        
        // 🆕 Zuia Main Cash kufungwa
        if (isMainCash(existing)) {
            return res.status(400).json({ 
                error: 'Main Cash is the default resource and cannot be closed.' 
            });
        }
        
        const newDescription = reason 
            ? `${existing.description || ''}\n[CLOSED] ${reason}`.trim()
            : existing.description;
        
        const resource = await prisma.financialResource.update({
            where: { id: parseInt(req.params.id) },
            data: {
                status: 'closed',
                description: newDescription
            }
        });
        
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'close_financial_resource',
                entityType: 'financial_resource',
                entityId: String(req.params.id),
                details: { reason },
                ipAddress: req.ip || 'unknown'
            }
        });
        
        res.json(resource);
    } catch (err) {
        console.error('closeResource error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// GET TRANSACTIONS
// GET /api/financial-resources/transactions
// ================================================================
exports.getTransactions = async (req, res) => {
    try {
        const { resourceId, type, source, limit = 100, offset = 0 } = req.query;
        
        const where = {};
        if (resourceId) where.resourceId = parseInt(resourceId);
        if (type) where.type = type;
        if (source) where.source = source;
        
        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                resource: {
                    select: { id: true, name: true, category: true, currency: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit),
            skip: parseInt(offset)
        });
        
        res.json(transactions);
    } catch (err) {
        console.error('getTransactions error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// MANUAL TRANSACTION
// POST /api/financial-resources/transactions/manual
// ================================================================
exports.createManualTransaction = async (req, res) => {
    try {
        const { recordTransaction } = require('../services/ledger.service');
        const { resourceId, type, amount, reference, description } = req.body;
        
        if (!resourceId || !type || !amount) {
            return res.status(400).json({ 
                error: 'resourceId, type, and amount are required' 
            });
        }
        
        if (!['INFLOW', 'OUTFLOW'].includes(type)) {
            return res.status(400).json({ error: 'type must be INFLOW or OUTFLOW' });
        }
        
        const transaction = await recordTransaction({
            resourceId: parseInt(resourceId),
            type,
            amount: parseFloat(amount),
            source: 'MANUAL',
            sourceId: null,
            sourceModel: null,
            reference: reference || `MAN-${Date.now()}`,
            description: description || 'Manual adjustment',
            createdBy: req.user.fullName || 'Finance Officer'
        });
        
        res.status(201).json(transaction);
    } catch (err) {
        console.error('createManualTransaction error:', err);
        res.status(500).json({ error: err.message });
    }
};
// ================================================================
// 🆕 AUTO-ENSURE MAIN CASH & BACKFILL TRANSACTIONS
// POST /api/financial-resources/auto-setup
// ================================================================
exports.autoSetupMainCash = async (req, res) => {
    try {
        const MAIN_CASH_ID = 'MAIN-CASH-001';
        
        // ============================================================
        // 0. 🆕 Futa Main Cash zote za zamani (duplicates)
        // ============================================================
        const oldMainCashes = await prisma.financialResource.findMany({
            where: {
                category: 'cash',
                name: 'Main Cash',
                NOT: { resourceId: MAIN_CASH_ID }
            }
        });
        
        if (oldMainCashes.length > 0) {
            console.log(`🗑️  Found ${oldMainCashes.length} old Main Cash duplicates. Deleting...`);
            
            for (const old of oldMainCashes) {
                // Futa transactions zake kwanza
                const txnCount = await prisma.transaction.count({
                    where: { resourceId: old.id }
                });
                
                if (txnCount > 0) {
                    await prisma.transaction.deleteMany({
                        where: { resourceId: old.id }
                    });
                    console.log(`   🗑️  Deleted ${txnCount} transactions for ${old.resourceId}`);
                }
                
                // Futa resource
                await prisma.financialResource.delete({
                    where: { id: old.id }
                });
                console.log(`   🗑️  Deleted duplicate: ${old.resourceId} — TSh ${Number(old.amount).toLocaleString()}`);
            }
            
            console.log(`✅ Deleted ${oldMainCashes.length} duplicates`);
        }
        
        // ============================================================
        // 1. Angalia kama Main Cash ipo
        // ============================================================
        let mainCash = await prisma.financialResource.findUnique({
            where: { resourceId: MAIN_CASH_ID }
        });
        
        // ============================================================
        // 2. Kama haipo, unda
        // ============================================================
        if (!mainCash) {
            console.log('📝 Auto-creating Main Cash...');
            mainCash = await prisma.financialResource.create({
                data: {
                    resourceId: MAIN_CASH_ID,
                    name: 'Main Cash',
                    category: 'cash',
                    amount: 0,
                    currency: 'TZS',
                    location: 'Head Office',
                    description: 'Default cash account — auto-managed by system',
                    status: 'active',
                    createdBy: 'System'
                }
            });
            console.log('✅ Main Cash created (ID: ' + mainCash.id + ')');
        } else {
            console.log('✅ Main Cash exists (ID: ' + mainCash.id + ')');
        }
        
        // ============================================================
        // 3. Pata orders zote zilizopita zenye receipts
        // ============================================================
        const ordersWithReceipts = await prisma.order.findMany({
            where: {
                receiptNumber: { not: null },
                status: 'paid'
            },
            select: {
                id: true,
                orderId: true,
                receiptNumber: true,
                customerName: true,
                totalAmount: true,
                receiptIssuedAt: true
            }
        });
        
        console.log(`📊 Found ${ordersWithReceipts.length} paid orders with receipts`);
        
        // ============================================================
        // 4. Kwa kila receipt, unda transaction kama haipo
        // ============================================================
        let transactionsCreated = 0;
        let totalBackfilled = 0;
        
        for (const order of ordersWithReceipts) {
            const existingTxn = await prisma.transaction.findFirst({
                where: {
                    reference: order.receiptNumber,
                    source: 'SALES'
                }
            });
            
            if (existingTxn) {
                console.log(`⏭️  Transaction already exists for ${order.receiptNumber}`);
                totalBackfilled += Number(order.totalAmount);
                continue;
            }
            
            const current = await prisma.financialResource.findUnique({
                where: { id: mainCash.id }
            });
            
            const balanceBefore = Number(current.amount);
            const amount = Number(order.totalAmount);
            const balanceAfter = balanceBefore + amount;
            
            await prisma.transaction.create({
                data: {
                    transactionId: `TXN-AUTO-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
                    resourceId: mainCash.id,
                    type: 'INFLOW',
                    amount: amount,
                    currency: 'TZS',
                    source: 'SALES',
                    sourceId: order.orderId,
                    sourceModel: 'Order',
                    reference: order.receiptNumber,
                    description: `Auto-backfill: Payment from ${order.customerName || 'Customer'}`,
                    balanceBefore: balanceBefore,
                    balanceAfter: balanceAfter,
                    createdBy: 'System'
                }
            });
            
            await prisma.financialResource.update({
                where: { id: mainCash.id },
                data: { amount: balanceAfter }
            });
            
            totalBackfilled += amount;
            transactionsCreated++;
            console.log(`✅ Created transaction: ${order.receiptNumber} — TSh ${amount.toLocaleString()}`);
        }
        const finalMainCash = await prisma.financialResource.findUnique({
            where: { id: mainCash.id }
        });
        
        // ============================================================
        // 6. Response
        // ============================================================
        res.json({
            success: true,
            message: 'Main Cash auto-setup complete',
            duplicatesDeleted: oldMainCashes.length,
            mainCash: {
                id: finalMainCash.id,
                resourceId: finalMainCash.resourceId,
                name: finalMainCash.name,
                amount: Number(finalMainCash.amount),
                currency: finalMainCash.currency
            },
            transactionsCreated,
            totalBackfilled,
            ordersProcessed: ordersWithReceipts.length
        });
        
    } catch (err) {
        console.error('autoSetupMainCash error:', err);
        res.status(500).json({ error: err.message });
    }
};
async function deposit(req, res) {
    try {
        const { id } = req.params;
        const { amount, description, category } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // Angalia resource ipo
        const resource = await prisma.financialResource.findUnique({
            where: { id: parseInt(id) }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (resource.status !== 'active') {
            return res.status(400).json({ error: 'Resource is not active' });
        }
        // ✅ Ongeza check hii
        const NON_CASH_CATEGORIES = ['asset', 'investment', 'equipment', 'inventory', 'precious', 'other'];

        if (NON_CASH_CATEGORIES.includes(resource.category)) {
            return res.status(400).json({
                error: `Cannot deposit into ${resource.category} resources. Only cash and bank accounts support deposits.`
            });
        }

        // Unda reference maalum
        const reference = `DEP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        // Record transaction
        const { recordTransaction } = require('../services/ledger.service');

        const transaction = await recordTransaction({
            resourceId: resource.id,
            type: 'INFLOW',
            amount: parseFloat(amount),
            source: 'MANUAL',
            sourceId: null,
            sourceModel: 'ManualDeposit',
            reference,
            description: description || 'Manual deposit',
            createdBy: req.user.fullName || 'Finance Officer'
        });

        console.log(`📥 Manual deposit: TSh ${Number(amount).toLocaleString()} → ${resource.name}`);

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'manual_deposit',
                entityType: 'financial_resource',
                entityId: String(resource.id),
                details: {
                    amount: parseFloat(amount),
                    description,
                    category: category || 'other',
                    reference
                },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Deposit recorded successfully!',
            transaction,
            newBalance: Number(resource.amount) + parseFloat(amount)
        });

    } catch (err) {
        console.error('❌ Deposit error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// MANUAL WITHDRAW — Toa fedha kutoka resource
// POST /api/financial-resources/:id/withdraw
// ================================================================
async function withdraw(req, res) {
    try {
        const { id } = req.params;
        const { amount, description, category } = req.body;

        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // Angalia resource ipo
        const resource = await prisma.financialResource.findUnique({
            where: { id: parseInt(id) }
        });

        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }

        if (resource.status !== 'active') {
            return res.status(400).json({ error: 'Resource is not active' });
        }

        // Angalia balance ya kutosha
        const currentBalance = Number(resource.amount);
        const withdrawAmount = parseFloat(amount);

        if (currentBalance < withdrawAmount) {
            return res.status(400).json({
                error: `Insufficient balance. Available: TSh ${currentBalance.toLocaleString()}, Required: TSh ${withdrawAmount.toLocaleString()}`
            });
        }

        // Unda reference
        const reference = `WTH-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

        // Record transaction
        const { recordTransaction } = require('../services/ledger.service');

        const transaction = await recordTransaction({
            resourceId: resource.id,
            type: 'OUTFLOW',
            amount: withdrawAmount,
            source: 'MANUAL',
            sourceId: null,
            sourceModel: 'ManualWithdraw',
            reference,
            description: description || 'Manual withdrawal',
            createdBy: req.user.fullName || 'Finance Officer'
        });

        console.log(`📤 Manual withdraw: TSh ${withdrawAmount.toLocaleString()} ← ${resource.name}`);

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'manual_withdraw',
                entityType: 'financial_resource',
                entityId: String(resource.id),
                details: {
                    amount: withdrawAmount,
                    description,
                    category: category || 'other',
                    reference
                },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Withdrawal recorded successfully!',
            transaction,
            newBalance: currentBalance - withdrawAmount
        });

    } catch (err) {
        console.error('❌ Withdraw error:', err);
        res.status(500).json({ error: err.message });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    listResources: exports.listResources,
    getStats: exports.getStats,
    getResource: exports.getResource,
    createResource: exports.createResource,
    updateResource: exports.updateResource,
    deleteResource: exports.deleteResource,
    closeResource: exports.closeResource,
    getTransactions: exports.getTransactions,
    createManualTransaction: exports.createManualTransaction,
    autoSetupMainCash: exports.autoSetupMainCash,
    deposit,
    withdraw
};