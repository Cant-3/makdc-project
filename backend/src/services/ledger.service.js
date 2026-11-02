// ================================================================
// MAK DC INVESTMENT — LEDGER SERVICE
// ================================================================
// Service ya kati ya kurekodi kila transaction ya fedha.
// Inatumiwa na: Sales, Payments, Payroll, Accounts
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// CONSTANTS
// ================================================================
const MAIN_CASH_RESOURCE_ID = 'MAIN-CASH-001';

// ================================================================
// RECORD TRANSACTION
// ================================================================
/**
 * Rekodi transaction mpya na update resource balance
 * @param {Object} params
 * @param {number} params.resourceId - ID ya FinancialResource
 * @param {string} params.type - 'INFLOW' | 'OUTFLOW'
 * @param {number} params.amount - Kiasi
 * @param {string} params.source - 'SALES' | 'PAYMENT' | 'PAYROLL' | 'ACCOUNT' | 'MANUAL'
 * @param {string|number} params.sourceId - ID ya chanzo
 * @param {string} params.sourceModel - Model ya chanzo
 * @param {string} params.reference - Reference number
 * @param {string} params.description - Maelezo
 * @param {string} params.createdBy - Jina la mtumiaji
 */
async function recordTransaction({
    resourceId,
    type,
    amount,
    source,
    sourceId = null,
    sourceModel = null,
    reference,
    description = null,
    createdBy
}) {
    // Validation
    if (!resourceId) throw new Error('resourceId is required');
    if (!type || !['INFLOW', 'OUTFLOW'].includes(type)) {
        throw new Error('type must be INFLOW or OUTFLOW');
    }
    if (!amount || amount <= 0) throw new Error('amount must be greater than 0');
    if (!source) throw new Error('source is required');
    if (!reference) throw new Error('reference is required');
    if (!createdBy) throw new Error('createdBy is required');

    return await prisma.$transaction(async (tx) => {
        // 1. Pata resource
        const resource = await tx.financialResource.findUnique({
            where: { id: parseInt(resourceId) }
        });
        
        if (!resource) {
            throw new Error(`Resource with ID ${resourceId} not found`);
        }
        if (resource.status !== 'active') {
            throw new Error('Resource is not active');
        }
        
        // 2. Hesabu balance mpya
        const balanceBefore = Number(resource.amount);
        const numAmount = Number(amount);
        const balanceAfter = type === 'INFLOW'
            ? balanceBefore + numAmount
            : balanceBefore - numAmount;
        
        if (balanceAfter < 0) {
            throw new Error(`Insufficient balance. Available: TSh ${balanceBefore.toLocaleString()}, Required: TSh ${numAmount.toLocaleString()}`);
        }
        
        // 3. Unda transaction ID maalum
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 6).toUpperCase();
        const transactionId = `TXN-${timestamp}-${random}`;
        
        // 4. Unda transaction
        const transaction = await tx.transaction.create({
            data: {
                transactionId,
                resourceId: parseInt(resourceId),
                type,
                amount: numAmount,
                currency: resource.currency || 'TZS',
                source,
                sourceId: sourceId ? String(sourceId) : null,
                sourceModel,
                reference,
                description,
                balanceBefore,
                balanceAfter,
                createdBy
            }
        });
        
        // 5. Update resource balance
        await tx.financialResource.update({
            where: { id: parseInt(resourceId) },
            data: { amount: balanceAfter }
        });
        
        // 6. Log
        console.log(`✅ Ledger: ${type} TSh ${numAmount.toLocaleString()} → ${resource.name} (${reference})`);
        
        return transaction;
    });
}

// ================================================================
// 🆕 GET MAIN CASH RESOURCE (Kwa resourceId maalum)
// ================================================================
/**
 * Pata "Main Cash" resource (default)
 * Inatafuta kwa resourceId: 'MAIN-CASH-001'
 * Kama haipo, inaunda moja automatically
 */
async function getMainCashResource() {
    try {
        // 1. Jaribu kutafuta kwa resourceId maalum
        let resource = await prisma.financialResource.findUnique({
            where: { resourceId: MAIN_CASH_RESOURCE_ID }
        });
        
        // 2. Kama haipo, unda
        if (!resource) {
            console.log('📝 Ledger: Creating default Main Cash (MAIN-CASH-001)...');
            
            resource = await prisma.financialResource.create({
                data: {
                    resourceId: MAIN_CASH_RESOURCE_ID,
                    name: 'Main Cash',
                    category: 'cash',
                    amount: 0,
                    currency: 'TZS',
                    location: 'Head Office',
                    description: 'Default cash account — system managed',
                    status: 'active',
                    createdBy: 'System'
                }
            });
            
            console.log(`✅ Ledger: Main Cash created (ID: ${resource.id})`);
        }
        
        return resource;
    } catch (error) {
        console.error('❌ getMainCashResource error:', error.message);
        return null;
    }
}

// ================================================================
// 🆕 GET RESOURCE BY CATEGORY (Optional)
// ================================================================
async function getResourceByCategory(category) {
    try {
        return await prisma.financialResource.findFirst({
            where: { category, status: 'active' }
        });
    } catch (error) {
        console.error('❌ getResourceByCategory error:', error.message);
        return null;
    }
}

// ================================================================
// 🆕 GET RESOURCE BY ACCOUNT ID (Optional)
// ================================================================
async function getResourceByAccount(accountId) {
    try {
        return await prisma.financialResource.findUnique({
            where: { accountId: parseInt(accountId) }
        });
    } catch (error) {
        console.error('❌ getResourceByAccount error:', error.message);
        return null;
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    recordTransaction,
    getMainCashResource,
    getResourceByCategory,
    getResourceByAccount
};