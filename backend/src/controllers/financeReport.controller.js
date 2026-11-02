// ================================================================
// MAK DC INVESTMENT — FINANCE REPORT CONTROLLER (KAMILI)
// ================================================================
// Reports: Cash Flow, Payroll, Fund Transfer,
//          Company Payments, Financial Summary, Reconciliation
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// HELPER: Date Range
// ================================================================
function calculateDateRange(period, from, to) {
    const now = new Date();
    let startDate, endDate, label;

    if (from && to) {
        startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        label = `${formatDate(startDate)} — ${formatDate(endDate)}`;
        return { startDate, endDate, label, type: 'custom' };
    }

    switch (period) {
        case 'daily':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            label = `Today — ${formatDate(now)}`;
            break;
        case 'weekly': {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(now);
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            label = `Week: ${formatDate(startDate)} — ${formatDate(endDate)}`;
            break;
        }
        case 'quarterly': {
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
            label = `Q${quarter + 1} ${now.getFullYear()}`;
            break;
        }
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            label = `Year ${now.getFullYear()}`;
            break;
        case 'monthly':
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            break;
    }

    return { startDate, endDate, label, type: period || 'monthly' };
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

// ================================================================
// 1. CASH FLOW REPORT
// ================================================================
async function getCashFlowReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        const transactions = await prisma.transaction.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: {
                resource: { select: { id: true, name: true, category: true, currency: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        const totalInflow = transactions
            .filter(t => t.type === 'INFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalOutflow = transactions
            .filter(t => t.type === 'OUTFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const netChange = totalInflow - totalOutflow;

        const sources = {};
        transactions.forEach(t => {
            const src = t.source || 'OTHER';
            if (!sources[src]) sources[src] = { source: src, inflow: 0, outflow: 0, count: 0 };
            if (t.type === 'INFLOW') sources[src].inflow += Number(t.amount);
            else sources[src].outflow += Number(t.amount);
            sources[src].count += 1;
        });

        const resources = {};
        transactions.forEach(t => {
            const key = t.resourceId;
            if (!resources[key]) {
                resources[key] = {
                    resourceId: key,
                    name: t.resource?.name || 'Unknown',
                    category: t.resource?.category || 'other',
                    inflow: 0, outflow: 0, count: 0
                };
            }
            if (t.type === 'INFLOW') resources[key].inflow += Number(t.amount);
            else resources[key].outflow += Number(t.amount);
            resources[key].count += 1;
        });

        const dailyMap = {};
        const current = new Date(startDate);
        while (current <= endDate) {
            const key = current.toISOString().split('T')[0];
            dailyMap[key] = { date: key, inflow: 0, outflow: 0, net: 0 };
            current.setDate(current.getDate() + 1);
        }
        transactions.forEach(t => {
            const key = new Date(t.createdAt).toISOString().split('T')[0];
            if (dailyMap[key]) {
                if (t.type === 'INFLOW') dailyMap[key].inflow += Number(t.amount);
                else dailyMap[key].outflow += Number(t.amount);
                dailyMap[key].net = dailyMap[key].inflow - dailyMap[key].outflow;
            }
        });

        const totalBalance = await prisma.financialResource.aggregate({
            where: { status: 'active' },
            _sum: { amount: true }
        });

        res.json({
            period: { type, label, from: startDate, to: endDate },
            summary: {
                totalInflow,
                totalOutflow,
                netChange,
                totalBalance: Number(totalBalance._sum.amount || 0),
                transactionCount: transactions.length
            },
            sources: Object.values(sources).sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow)),
            resources: Object.values(resources).sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow)),
            dailyTrend: Object.values(dailyMap)
        });

    } catch (err) {
        console.error('❌ Cash flow report error:', err);
        res.status(500).json({ error: 'Failed to generate cash flow report: ' + err.message });
    }
}

// ================================================================
// 2. PAYROLL REPORT
// ================================================================
async function getPayrollReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        const payrolls = await prisma.payroll.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        const totalPayrolls = payrolls.length;
        const totalAmount = payrolls.reduce((sum, p) => sum + Number(p.totalAmount), 0);
        const totalEmployees = payrolls.reduce((sum, p) => sum + (p.items?.length || 0), 0);

        const statusBreakdown = {
            draft: payrolls.filter(p => p.status === 'draft').length,
            pendingManager: payrolls.filter(p => p.status === 'pending-manager').length,
            pendingCeo: payrolls.filter(p => p.status === 'pending-ceo').length,
            approved: payrolls.filter(p => p.status === 'approved').length,
            paid: payrolls.filter(p => p.status === 'paid').length,
            rejected: payrolls.filter(p => p.status === 'rejected').length
        };

        const paidAmount = payrolls
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.totalAmount), 0);

        const monthlyMap = {};
        payrolls.forEach(p => {
            const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = { month: p.month, year: p.year, amount: 0, count: 0 };
            monthlyMap[key].amount += Number(p.totalAmount);
            monthlyMap[key].count += 1;
        });

        res.json({
            period: { type, label, from: startDate, to: endDate },
            summary: {
                totalPayrolls,
                totalAmount,
                totalEmployees,
                paidAmount,
                averagePayroll: totalPayrolls > 0 ? Math.round(totalAmount / totalPayrolls) : 0
            },
            statusBreakdown,
            monthlyTrend: Object.values(monthlyMap).sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month)),
            recentPayrolls: payrolls.slice(0, 10).map(p => ({
                id: p.id,
                payrollId: p.payrollId,
                month: p.month,
                year: p.year,
                amount: Number(p.totalAmount),
                status: p.status,
                employees: p.items?.length || 0,
                createdAt: p.createdAt
            }))
        });

    } catch (err) {
        console.error('❌ Payroll report error:', err);
        res.status(500).json({ error: 'Failed to generate payroll report: ' + err.message });
    }
}

// ================================================================
// 3. FUND TRANSFER REPORT
// ================================================================
async function getFundTransferReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        const transfers = await prisma.fundTransfer.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: {
                fromAccount: { select: { id: true, name: true, accountNumber: true, type: true } },
                toAccount: { select: { id: true, name: true, accountNumber: true, type: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const totalTransfers = transfers.length;
        const totalAmount = transfers.reduce((sum, t) => sum + Number(t.amount), 0);
        const completedAmount = transfers
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const statusBreakdown = {
            draft: transfers.filter(t => t.status === 'draft').length,
            pendingManager: transfers.filter(t => t.status === 'pending-manager').length,
            pendingCeo: transfers.filter(t => t.status === 'pending-ceo').length,
            approved: transfers.filter(t => t.status === 'approved').length,
            completed: transfers.filter(t => t.status === 'completed').length,
            rejected: transfers.filter(t => t.status === 'rejected').length
        };

        const pairs = {};
        transfers.forEach(t => {
            const key = `${t.fromAccount?.name || 'Unknown'} → ${t.toAccount?.name || 'Unknown'}`;
            if (!pairs[key]) pairs[key] = { pair: key, count: 0, amount: 0 };
            pairs[key].count += 1;
            pairs[key].amount += Number(t.amount);
        });

        res.json({
            period: { type, label, from: startDate, to: endDate },
            summary: {
                totalTransfers,
                totalAmount,
                completedAmount,
                averageTransfer: totalTransfers > 0 ? Math.round(totalAmount / totalTransfers) : 0
            },
            statusBreakdown,
            accountPairs: Object.values(pairs).sort((a, b) => b.amount - a.amount),
            recentTransfers: transfers.slice(0, 10).map(t => ({
                id: t.id,
                transferId: t.transferId,
                from: t.fromAccount?.name || '—',
                to: t.toAccount?.name || '—',
                amount: Number(t.amount),
                status: t.status,
                createdAt: t.createdAt
            }))
        });

    } catch (err) {
        console.error('❌ Fund transfer report error:', err);
        res.status(500).json({ error: 'Failed to generate fund transfer report: ' + err.message });
    }
}

// ================================================================
// 4. COMPANY PAYMENTS REPORT
// ================================================================
async function getCompanyPaymentsReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        const payments = await prisma.companyPayment.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            orderBy: { createdAt: 'desc' }
        });

        const totalPayments = payments.length;
        const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const paidAmount = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        const statusBreakdown = {
            draft: payments.filter(p => p.status === 'draft').length,
            pendingManager: payments.filter(p => p.status === 'pending-manager').length,
            pendingCeo: payments.filter(p => p.status === 'pending-ceo').length,
            approved: payments.filter(p => p.status === 'approved').length,
            paid: payments.filter(p => p.status === 'paid').length,
            rejected: payments.filter(p => p.status === 'rejected').length
        };

        const types = {};
        payments.forEach(p => {
            const key = p.type || 'other';
            if (!types[key]) types[key] = { type: key, amount: 0, count: 0 };
            types[key].amount += Number(p.amount);
            types[key].count += 1;
        });

        const vendors = {};
        payments.forEach(p => {
            const key = p.vendor || 'Unknown';
            if (!vendors[key]) vendors[key] = { vendor: key, amount: 0, count: 0 };
            vendors[key].amount += Number(p.amount);
            vendors[key].count += 1;
        });

        const monthlyMap = {};
        payments.forEach(p => {
            const d = new Date(p.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyMap[key]) monthlyMap[key] = { month: d.getMonth() + 1, year: d.getFullYear(), amount: 0, count: 0 };
            monthlyMap[key].amount += Number(p.amount);
            monthlyMap[key].count += 1;
        });

        res.json({
            period: { type, label, from: startDate, to: endDate },
            summary: {
                totalPayments,
                totalAmount,
                paidAmount,
                pendingAmount: totalAmount - paidAmount,
                averagePayment: totalPayments > 0 ? Math.round(totalAmount / totalPayments) : 0
            },
            statusBreakdown,
            byType: Object.values(types).sort((a, b) => b.amount - a.amount),
            byVendor: Object.values(vendors).sort((a, b) => b.amount - a.amount).slice(0, 15),
            monthlyTrend: Object.values(monthlyMap).sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month)),
            recentPayments: payments.slice(0, 10).map(p => ({
                id: p.id,
                reference: p.reference,
                vendor: p.vendor,
                type: p.type,
                amount: Number(p.amount),
                status: p.status,
                createdAt: p.createdAt
            }))
        });

    } catch (err) {
        console.error('❌ Company payments report error:', err);
        res.status(500).json({ error: 'Failed to generate company payments report: ' + err.message });
    }
}

// ================================================================
// 5. FINANCIAL SUMMARY REPORT
// ================================================================
async function getFinancialSummaryReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        // Resources by category
        const resources = await prisma.financialResource.findMany({
            where: { status: 'active' }
        });

        const categories = {};
        resources.forEach(r => {
            const key = r.category || 'other';
            if (!categories[key]) categories[key] = { category: key, amount: 0, count: 0 };
            categories[key].amount += Number(r.amount);
            categories[key].count += 1;
        });

        const totalResources = resources.reduce((sum, r) => sum + Number(r.amount), 0);

        // Transactions
        const transactions = await prisma.transaction.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } }
        });

        const inflow = transactions
            .filter(t => t.type === 'INFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const outflow = transactions
            .filter(t => t.type === 'OUTFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const netWorth = totalResources;

        // Top resources
        const topResources = [...resources]
            .sort((a, b) => Number(b.amount) - Number(a.amount))
            .slice(0, 10)
            .map(r => ({
                resourceId: r.resourceId,
                name: r.name,
                category: r.category,
                amount: Number(r.amount),
                currency: r.currency
            }));

        res.json({
            period: { type, label, from: startDate, to: endDate },
            summary: {
                totalResources,
                netWorth,
                totalTransactions: transactions.length,
                totalInflow: inflow,
                totalOutflow: outflow,
                netChange: inflow - outflow
            },
            byCategory: Object.values(categories).sort((a, b) => b.amount - a.amount),
            topResources
        });

    } catch (err) {
        console.error('❌ Financial summary report error:', err);
        res.status(500).json({ error: 'Failed to generate financial summary: ' + err.message });
    }
}
// ================================================================
// 7. OVERALL REPORT — Kila Kitu kwa Period Moja
// ================================================================
async function getOverallReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        // ============================================================
        // 1. CASH FLOW
        // ============================================================
        const transactions = await prisma.transaction.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: { resource: { select: { name: true, category: true } } }
        });

        const totalInflow = transactions
            .filter(t => t.type === 'INFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const totalOutflow = transactions
            .filter(t => t.type === 'OUTFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalBalance = await prisma.financialResource.aggregate({
            where: { status: 'active' },
            _sum: { amount: true }
        });

        // ============================================================
        // 2. RESOURCES BY CATEGORY
        // ============================================================
        const resources = await prisma.financialResource.findMany({
            where: { status: 'active' }
        });
        const resourcesByCategory = {};
        resources.forEach(r => {
            const key = r.category || 'other';
            if (!resourcesByCategory[key]) resourcesByCategory[key] = { category: key, amount: 0, count: 0 };
            resourcesByCategory[key].amount += Number(r.amount);
            resourcesByCategory[key].count += 1;
        });

        // ============================================================
        // 3. PAYROLL
        // ============================================================
        const payrolls = await prisma.payroll.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } },
            include: { items: true }
        });
        const totalPayrollAmount = payrolls.reduce((sum, p) => sum + Number(p.totalAmount), 0);
        const paidPayrollAmount = payrolls
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.totalAmount), 0);

        // ============================================================
        // 4. COMPANY PAYMENTS
        // ============================================================
        const companyPayments = await prisma.companyPayment.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } }
        });
        const totalCompanyPayments = companyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const paidCompanyPayments = companyPayments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + Number(p.amount), 0);

        // ============================================================
        // 5. FUND TRANSFERS
        // ============================================================
        const fundTransfers = await prisma.fundTransfer.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } }
        });
        const totalTransfers = fundTransfers.reduce((sum, t) => sum + Number(t.amount), 0);
        const completedTransfers = fundTransfers
            .filter(t => t.status === 'completed')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // ============================================================
        // 6. ORDERS (Sales)
        // ============================================================
        const orders = await prisma.order.findMany({
            where: { createdAt: { gte: startDate, lte: endDate } }
        });
        const totalOrders = orders.length;
        const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const paidOrders = orders.filter(o => o.status === 'paid').length;

        // ============================================================
        // 7. PAYMENTS RECEIVED
        // ============================================================
        const payments = await prisma.payment.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'verified'
            }
        });
        const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        // ============================================================
        // 8. RECONCILIATION
        // ============================================================
        const salesVsPaymentsDiff = totalSales - totalPaymentsReceived;

        // ============================================================
        // 9. NET WORTH
        // ============================================================
        const netWorth = Number(totalBalance._sum.amount || 0);
        // ============================================================
        // NARRATIVE ANALYSIS — Maneno ya kufafanua report
        // ============================================================
        const narrative = generateNarrative({
            es: {
                netWorth,
                totalInflow,
                totalOutflow,
                netChange: totalInflow - totalOutflow,
                totalSales,
                totalPaymentsReceived,
                salesVsPaymentsDiff,
                totalPayrollAmount,
                paidPayrollAmount,
                totalCompanyPayments,
                paidCompanyPayments,
                totalTransfers,
                completedTransfers,
                totalOrders,
                paidOrders
            },
            payroll: {
                totalPayrolls: payrolls.length,
                totalAmount: totalPayrollAmount,
                paidAmount: paidPayrollAmount,
                pendingAmount: totalPayrollAmount - paidPayrollAmount,
                totalEmployees: payrolls.reduce((sum, p) => sum + (p.items?.length || 0), 0)
            },
            companyPayments: {
                totalPayments: companyPayments.length,
                totalAmount: totalCompanyPayments,
                paidAmount: paidCompanyPayments,
                pendingAmount: totalCompanyPayments - paidCompanyPayments
            },
            fundTransfers: {
                totalTransfers: fundTransfers.length,
                totalAmount: totalTransfers,
                completedAmount: completedTransfers,
                pendingAmount: totalTransfers - completedTransfers
            },
            sales: {
                totalOrders,
                paidOrders,
                totalSales,
                totalPaymentsReceived,
                difference: salesVsPaymentsDiff
            },
            period: label,
            resourcesByCategory: Object.values(resourcesByCategory),
            transactionsCount: transactions.length
        });

        // ============================================================
        // RESPONSE
        // ============================================================
        res.json({
            period: { type, label, from: startDate, to: endDate },
            generatedAt: new Date().toISOString(),
            narrative,
            executiveSummary: {
                netWorth,
                totalInflow,
                totalOutflow,
                netChange: totalInflow - totalOutflow,
                totalSales,
                totalPaymentsReceived,
                salesVsPaymentsDiff,
                totalPayrollAmount,
                paidPayrollAmount,
                totalCompanyPayments,
                paidCompanyPayments,
                totalTransfers,
                completedTransfers,
                totalOrders,
                paidOrders
            },
            cashFlow: {
                totalInflow,
                totalOutflow,
                netChange: totalInflow - totalOutflow,
                totalBalance: netWorth,
                transactionCount: transactions.length
            },
            resources: {
                totalResources: netWorth,
                byCategory: Object.values(resourcesByCategory).sort((a, b) => b.amount - a.amount),
                topResources: [...resources]
                    .sort((a, b) => Number(b.amount) - Number(a.amount))
                    .slice(0, 5)
                    .map(r => ({
                        name: r.name,
                        category: r.category,
                        amount: Number(r.amount),
                        currency: r.currency
                    }))
            },
            payroll: {
                totalPayrolls: payrolls.length,
                totalAmount: totalPayrollAmount,
                paidAmount: paidPayrollAmount,
                pendingAmount: totalPayrollAmount - paidPayrollAmount,
                totalEmployees: payrolls.reduce((sum, p) => sum + (p.items?.length || 0), 0)
            },
            companyPayments: {
                totalPayments: companyPayments.length,
                totalAmount: totalCompanyPayments,
                paidAmount: paidCompanyPayments,
                pendingAmount: totalCompanyPayments - paidCompanyPayments
            },
            fundTransfers: {
                totalTransfers: fundTransfers.length,
                totalAmount: totalTransfers,
                completedAmount: completedTransfers,
                pendingAmount: totalTransfers - completedTransfers
            },
            sales: {
                totalOrders,
                paidOrders,
                totalSales,
                totalPaymentsReceived,
                difference: salesVsPaymentsDiff
            },
            reconciliation: {
                salesVsPaymentsDiff,
                hasDiscrepancy: Math.abs(salesVsPaymentsDiff) > 1
            }
        });

    } catch (err) {
        console.error('❌ Overall report error:', err);
        res.status(500).json({ error: 'Failed to generate overall report: ' + err.message });
    }
}
async function getReconciliationReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        // Sales vs Payments received
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: { in: ['paid', 'completed', 'delivered'] }
            }
        });

        const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

        const payments = await prisma.payment.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'verified'
            }
        });

        const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

        const salesVsPaymentsDiff = totalSales - totalPaymentsReceived;

        // Transfers vs Transactions
        const transfers = await prisma.fundTransfer.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: 'completed'
            }
        });

        const totalTransfers = transfers.reduce((sum, t) => sum + Number(t.amount), 0);

        const transferTransactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                source: 'TRANSFER'
            }
        });

        const totalTransferTransactions = transferTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

        const transfersVsTransactionsDiff = totalTransfers - totalTransferTransactions;

        // Discrepancies
        const discrepancies = [];

        if (Math.abs(salesVsPaymentsDiff) > 1) {
            discrepancies.push({
                type: 'Sales vs Payments',
                expected: totalSales,
                actual: totalPaymentsReceived,
                difference: salesVsPaymentsDiff,
                severity: Math.abs(salesVsPaymentsDiff) > 100000 ? 'high' : 'medium'
            });
        }

        if (Math.abs(transfersVsTransactionsDiff) > 1) {
            discrepancies.push({
                type: 'Transfers vs Transactions',
                expected: totalTransfers,
                actual: totalTransferTransactions,
                difference: transfersVsTransactionsDiff,
                severity: Math.abs(transfersVsTransactionsDiff) > 100000 ? 'high' : 'medium'
            });
        }

        res.json({
            period: { type, label, from: startDate, to: endDate },
            summary: {
                totalSales,
                totalPaymentsReceived,
                salesVsPaymentsDiff,
                totalTransfers,
                totalTransferTransactions,
                transfersVsTransactionsDiff,
                discrepancyCount: discrepancies.length
            },
            discrepancies,
            salesVsPayments: {
                salesCount: orders.length,
                paymentsCount: payments.length
            }
        });

    } catch (err) {
        console.error('❌ Reconciliation report error:', err);
        res.status(500).json({ error: 'Failed to generate reconciliation report: ' + err.message });
    }
}
// ================================================================
// NARRATIVE GENERATOR — Maneno ya kufafanua report
// ================================================================
function generateNarrative(data) {
    const es = data.es;
    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();
    const fmtShort = (n) => {
        const num = Number(n || 0);
        if (num >= 1e9) return 'TSh ' + (num / 1e9).toFixed(2) + ' bilioni';
        if (num >= 1e6) return 'TSh ' + (num / 1e6).toFixed(2) + ' milioni';
        if (num >= 1e3) return 'TSh ' + (num / 1e3).toFixed(1) + ' elfu';
        return 'TSh ' + num.toLocaleString();
    };

    // ============================================================
    // 🆕 CHECK: Kama hakuna data kabisa
    // ============================================================
    const hasNoActivity = 
        es.totalInflow === 0 &&
        es.totalOutflow === 0 &&
        es.totalSales === 0 &&
        es.totalPaymentsReceived === 0 &&
        data.payroll.totalPayrolls === 0 &&
        data.companyPayments.totalPayments === 0 &&
        data.fundTransfers.totalTransfers === 0 &&
        data.sales.totalOrders === 0;

    if (hasNoActivity) {
        return {
            health: { 
                status: 'HAKUNA DATA', 
                icon: '⚪', 
                color: '#94a3b8' 
            },
            summary: `Katika kipindi cha ${data.period}, hakuna shughuli yoyote ya kifedha iliyorekodiwa. Kampuni haikuwa na mapato, matumizi, mauzo, au miamala yoyote katika kipindi hiki.`,
            cashFlow: `Hakuna miamala (transactions) iliyorekodiwa katika kipindi hiki. Hii inaashiria kwamba kampuni haikuwa na shughuli za kifedha wakati huu, au data haijasajiliwa bado.`,
            payroll: `Hakuna payroll iliyofanyika katika kipindi hiki.`,
            companyPayments: `Hakuna malipo ya kampuni yaliyorekodiwa katika kipindi hiki.`,
            fundTransfers: `Hakuna uhamisho wa fedha uliofanyika katika kipindi hiki.`,
            sales: `Hakuna oda zilizopokelewa katika kipindi hiki.`,
            resources: `Mali za kampuni zilizopo sasa zina thamani ya ${fmt(es.netWorth)}. Hizi ni mali za sasa, sio za kipindi hiki.`,
            warnings: [{
                icon: '⚠️',
                type: 'no-data',
                title: 'Hakuna Data ya Kipindi Hiki',
                message: `Hakuna shughuli yoyote ya kifedha iliyorekodiwa katika kipindi cha ${data.period}. Tafadhali hakikisha data imesajiliwa au chagua kipindi kingine.`
            }],
            recommendations: [
                'Hakikisha kwamba shughuli zote za kifedha zinasajiliwa kwenye mfumo.',
                'Chagua kipindi ambacho kina data ya kifedha ili kuona uchambuzi kamili.',
                'Kama kampuni haikuwa na shughuli, hii inaweza kuwa ni kipindi cha mapumziko au kipindi kabla ya kuanza kwa shughuli.'
            ],
            conclusion: `Kwa ujumla, hakuna data ya kifedha iliyorekodiwa katika kipindi cha ${data.period}. Haiwezekani kutoa uchambuzi wa kina wa kifedha bila data. Tafadhali chagua kipindi kingine au hakikisha data imesajiliwa.`
        };
    }
        let health, healthIcon, healthColor;
    
    // 🆕 Kama hakuna inflow/outflow kabisa
    if (es.totalInflow === 0 && es.totalOutflow === 0) {
        health = 'Hakuna miamala';
        healthIcon = '⚪';
        healthColor = '#94a3b8';
    } else if (es.netChange > 0) {
        health = 'Nzuri na inaridhisha';
        healthIcon = '🟢';
        healthColor = '#16a34a';
    } else if (es.netChange === 0) {
        health = 'Iko Sawa';
        healthIcon = '🟡';
        healthColor = '#d97706';
    } else {
        health = 'Hali ya Kifedha inahitaji uangalifu';
        healthIcon = '🔴';
        healthColor = '#dc2626';
    }
        let summary;
    if (es.totalInflow === 0 && es.totalOutflow === 0) {
        summary = `Katika kipindi cha ${data.period}, hakuna shughuli zozote za kifedha zilizorekodiwa. Kampuni ilikuwa na jumla ya mali (Net Worth) yenye thamani ya ${fmt(es.netWorth)}, ambayo ni mali za sasa na sio za kipindi hiki. Hali ya kifedha ya kipindi hiki: ${health} ${healthIcon}`;
    } else {
        summary = `Katika kipindi cha ${data.period}, kampuni ilikuwa na jumla ya mali (Net Worth) yenye thamani ya ${fmt(es.netWorth)}. Hali ya kifedha ya kampuni inaonekana kuwa ${health} ${healthIcon} kwa kuzingatia mwenendo wa mapato na matumizi.`;
    }
    let cashFlowText = '';
    if (es.totalInflow > 0 || es.totalOutflow > 0) {
        if (es.netChange > 0) {
            cashFlowText = `Mapato (Inflow) yalifikia ${fmt(es.totalInflow)} wakati matumizi (Outflow) yalikuwa ${fmt(es.totalOutflow)}. Hii inaonyesha faida halisi ya ${fmt(Math.abs(es.netChange))}, ikimaanisha kwamba kampuni ilipata zaidi ya ilivyotumia. Mwenendo huu ni chanya na unaonyesha uimara wa kifedha wa kampuni.`;
        } else if (es.netChange < 0) {
            cashFlowText = `Mapato (Inflow) yalifikia ${fmt(es.totalInflow)} wakati matumizi (Outflow) yalikuwa ${fmt(es.totalOutflow)}. Hii inaonyesha upungufu wa ${fmt(Math.abs(es.netChange))}, ikimaanisha kwamba matumizi yalizidi mapato. Inashauriwa kuangalia kwa makini sehemu za matumizi ili kubaini sababu za upungufu huu.`;
        } else {
            cashFlowText = `Mapato (Inflow) yalifikia ${fmt(es.totalInflow)} na matumizi (Outflow) yalikuwa ${fmt(es.totalOutflow)}. Hii inaonyesha usawa kamili kati ya mapato na matumizi, ambayo ni hali nzuri kwa utulivu wa kifedha.`;
        }
        cashFlowText += ` Jumla ya transactions ${data.transactionsCount} zilirekodiwa katika kipindi hiki.`;
        } else {
        cashFlowText = `Hakuna miamala (transactions) iliyorekodiwa katika kipindi hiki. Hii inaashiria kwamba kampuni haikuwa na shughuli za kifedha wakati huu. Kama kuna shughuli zilizofanyika, tafadhali hakikisha zimesajiliwa kwenye mfumo.`;
    }

    // ============================================================
    // 4. PAYROLL NARRATIVE
    // ============================================================
    let payrollText = '';
    if (data.payroll.totalPayrolls > 0) {
        const paidPct = data.payroll.totalAmount > 0 
            ? ((data.payroll.paidAmount / data.payroll.totalAmount) * 100).toFixed(1) 
            : 0;
        payrollText = `Katika kipindi hiki, kulikuwa na ${data.payroll.totalPayrolls} payroll run zilizofanyika, zikihusisha wafanyakazi ${data.payroll.totalEmployees}. Jumla ya mishahara iliyotengenezwa ilikuwa ${fmt(data.payroll.totalAmount)}, ambapo ${fmt(data.payroll.paidAmount)} (${paidPct}%) tayari imelipwa. `;
        if (data.payroll.pendingAmount > 0) {
            payrollText += `Kuna kiasi cha ${fmt(data.payroll.pendingAmount)} ambacho bado hakijalipwa na kinahitaji kushughulikiwa. `;
        } else {
            payrollText += `Mishahara yote imelipwa kikamilifu. `;
        }
    } else {
        payrollText = `Hakuna payroll iliyofanyika katika kipindi hiki. `;
    }

    // ============================================================
    // 5. COMPANY PAYMENTS NARRATIVE
    // ============================================================
    let paymentsText = '';
    if (data.companyPayments.totalPayments > 0) {
        const paidPct = data.companyPayments.totalAmount > 0 
            ? ((data.companyPayments.paidAmount / data.companyPayments.totalAmount) * 100).toFixed(1) 
            : 0;
        paymentsText = `Malipo ya kampuni (Company Payments) yalifikia ${data.companyPayments.totalPayments} records zenye jumla ya ${fmt(data.companyPayments.totalAmount)}. Kati ya hizi, ${fmt(data.companyPayments.paidAmount)} (${paidPct}%) zimelipwa kikamilifu. `;
        if (data.companyPayments.pendingAmount > 0) {
            paymentsText += `Kuna ${fmt(data.companyPayments.pendingAmount)} ambayo inasubiri malipo au uidhinishaji. Inashauriwa kuharakisha mchakato wa malipo haya ili kuepuka usumbufu kwa wauzaji (vendors). `;
        } else {
            paymentsText += `Malipo yote yamekamilika. `;
        }
    } else {
        paymentsText = `Hakuna malipo ya kampuni yaliyorekodiwa katika kipindi hiki. `;
    }

    // ============================================================
    // 6. FUND TRANSFERS NARRATIVE
    // ============================================================
    let transfersText = '';
    if (data.fundTransfers.totalTransfers > 0) {
        const completedPct = data.fundTransfers.totalAmount > 0 
            ? ((data.fundTransfers.completedAmount / data.fundTransfers.totalAmount) * 100).toFixed(1) 
            : 0;
        transfersText = `Uhamisho wa fedha kati ya akaunti (Fund Transfers) ulifikia ${data.fundTransfers.totalTransfers} records zenye jumla ya ${fmt(data.fundTransfers.totalAmount)}. ${fmt(data.fundTransfers.completedAmount)} (${completedPct}%) umekamilika. `;
        if (data.fundTransfers.pendingAmount > 0) {
            transfersText += `Kuna ${fmt(data.fundTransfers.pendingAmount)} ambao haujakamilika na unahitaji ufuatiliaji. `;
        } else {
            transfersText += `Uhamisho wote umekamilika kikamilifu. `;
        }
    } else {
        transfersText = `Hakuna uhamisho wa fedha uliofanyika katika kipindi hiki. `;
    }

    // ============================================================
    // 7. SALES & RECONCILIATION NARRATIVE
    // ============================================================
    let salesText = '';
    if (data.sales.totalOrders > 0) {
        salesText = `Kampuni ilipokea oda ${data.sales.totalOrders} zenye jumla ya mauzo ${fmt(data.sales.totalSales)}, ambapo ${data.sales.paidOrders} zililipwa kikamilifu. Malipo yaliyopokelewa yalikuwa ${fmt(data.sales.totalPaymentsReceived)}. `;
        
        if (Math.abs(data.sales.difference) < 1) {
            salesText += `Ulinganisho (reconciliation) unaonyesha kwamba mauzo na malipo yanayohusiana yanalingana kikamilifu, hakuna tofauti yoyote. Hii ni hali nzuri sana kwa udhibiti wa kifedha. ✅`;
        } else if (data.sales.difference > 0) {
            salesText += `Kuna tofauti ya ${fmt(data.sales.difference)} ambapo mauzo yanazidi malipo yaliyopokelewa. Hii inaweza kumaanisha kwamba kuna oda ambazo hazijalipwa bado au malipo hayajasajiliwa. Inashauriwa kufuatilia oda zilizosalia. ⚠️`;
        } else {
            salesText += `Kuna tofauti ya ${fmt(Math.abs(data.sales.difference))} ambapo malipo yaliyopokelewa yanazidi mauzo. Hii inaweza kumaanisha kuwa kuna malipo ya awali (advance payments) au malipo ya oda za nyuma yaliyorekodiwa. Inashauriwa kuangalia rekodi za malipo. ⚠️`;
        }
    } else {
        salesText = `Hakuna oda zilizopokelewa katika kipindi hiki. `;
    }

    // ============================================================
    // 8. RESOURCES NARRATIVE
    // ============================================================
    let resourcesText = '';
    if (data.resourcesByCategory && data.resourcesByCategory.length > 0) {
        const top = data.resourcesByCategory[0];
        const topPct = es.netWorth > 0 ? ((top.amount / es.netWorth) * 100).toFixed(1) : 0;
        resourcesText = `Mali za kampuni zimegawanyika katika makundi ${data.resourcesByCategory.length}. Kundi kubwa zaidi ni "${top.category}" lenye thamani ya ${fmt(top.amount)} (${topPct}% ya mali zote). `;
        
        if (data.resourcesByCategory.length > 1) {
            const second = data.resourcesByCategory[1];
            resourcesText += `Kundi la pili kwa ukubwa ni "${second.category}" lenye thamani ya ${fmt(second.amount)}. `;
        }
        
        resourcesText += `Mgawanyo huu unaonyesha mseto wa mali (diversification) wa kampuni, ambao ni muhimu kwa usalama wa kifedha.`;
    } else {
        resourcesText = `Hakuna mali (resources) zilizorekodiwa bado. `;
    }

    // ============================================================
    // 9. WARNINGS / ALERTS
    // ============================================================
    const warnings = [];
    
    if (es.totalInflow === 0 && es.totalOutflow === 0) {
        warnings.push({
            icon: '⚪',
            type: 'no-data',
            title: 'Hakuna Data ya Kipindi Hiki',
            message: `Hakuna shughuli yoyote ya kifedha iliyorekodiwa katika kipindi cha ${data.period}. Hii inaweza kumaanisha kwamba kampuni haikuwa na shughuli, au data haijasajiliwa bado. Tafadhali hakikisha data imesajiliwa au chagua kipindi kingine.`
        });
    }
    if (es.netChange < 0) {
        warnings.push({
            icon: '🔴',
            type: 'cash-flow',
            title: 'Matumizi Yanazidi Mapato',
            message: `Katika kipindi hiki, matumizi yalizidi mapato kwa ${fmt(Math.abs(es.netChange))}. Inashauriwa kupunguza matumizi yasiyo ya lazima au kuongeza vyanzo vya mapato.`
        });
    }

    if (data.payroll.pendingAmount > 0) {
        warnings.push({
            icon: '🟡',
            type: 'payroll',
            title: 'Mishahara Haijalipwa Kikamilifu',
            message: `Kuna ${fmt(data.payroll.pendingAmount)} ya mishahara ambayo haijalipwa. Inashauriwa kuharakisha malipo ili kuepuka malalamiko ya wafanyakazi.`
        });
    }

    if (data.companyPayments.pendingAmount > 0) {
        warnings.push({
            icon: '🟡',
            type: 'payments',
            title: 'Malipo ya Kampuni Yanasubiri',
            message: `Kuna ${fmt(data.companyPayments.pendingAmount)} ya malipo ya kampuni ambayo inasubiri. Inashauriwa kuharakisha uidhinishaji wa malipo haya.`
        });
    }

    if (data.fundTransfers.pendingAmount > 0) {
        warnings.push({
            icon: '🟡',
            type: 'transfers',
            title: 'Uhamisho wa Fedha Haujakamilika',
            message: `Kuna ${fmt(data.fundTransfers.pendingAmount)} ya uhamisho wa fedha ambao haujakamilika. Inashauriwa kufuatilia ili kukamilisha uhamisho huu.`
        });
    }

    if (Math.abs(data.sales.difference) > 1) {
        warnings.push({
            icon: '⚠️',
            type: 'reconciliation',
            title: 'Tofauti Kwenye Ulinganisho',
            message: `Kuna tofauti ya ${fmt(Math.abs(data.sales.difference))} kati ya mauzo na malipo yaliyopokelewa. Inashauriwa kufanya uchunguzi wa kina ili kubaini chanzo cha tofauti hii.`
        });
    }

    if (warnings.length === 0) {
        warnings.push({
            icon: '✅',
            type: 'success',
            title: 'Hakuna Tahadhari',
            message: 'Hali zote za kifedha zinaonekana kuwa nzuri. Hakuna tahadhari yoyote inayohitaji uangalifu wa haraka.'
        });
    }

    // ============================================================
    // 10. RECOMMENDATIONS
    // ============================================================
    const recommendations = [];

    if (es.totalInflow === 0 && es.totalOutflow === 0) {
        recommendations.push('Hakikisha kwamba shughuli zote za kifedha zinasajiliwa kwenye mfumo.');
        recommendations.push('Chagua kipindi ambacho kina data ya kifedha ili kuona uchambuzi kamili.');
        recommendations.push('Kama kampuni haikuwa na shughuli, hii inaweza kuwa ni kipindi cha mapumziko au kipindi kabla ya kuanza kwa shughuli.');
    } 
    else if (es.netChange < 0) {
        recommendations.push('Punguza matumizi yasiyo ya lazima ili kuongeza usawa wa kifedha.');
        recommendations.push('Tafuta vyanzo vipya vya mapato ili kuongeza inflow.');
    } 
    else if (es.netChange > 0) {
        recommendations.push('Weka akiba ya ziada kutokana na faida inayopatikana ili kuimarisha akiba ya kampuni.');
        recommendations.push('Fikiria kuwekeza katika maeneo yenye faida ili kuongeza mali za kampuni.');
    }

    if (data.payroll.pendingAmount > 0) {
        recommendations.push('Hakikisha mishahara yote inalipwa kwa wakati ili kudumisha morali ya wafanyakazi.');
    }

    if (data.companyPayments.pendingAmount > 0) {
        recommendations.push('Kamilisha malipo yote yanayosubiri ili kudumisha mahusiano mazuri na wauzaji.');
    }

    if (Math.abs(data.sales.difference) > 1) {
        recommendations.push('Fanya ukaguzi wa mara kwa mara (audit) ili kubaini na kurekebisha tofauti za kifedha.');
    }

    if (recommendations.length === 0) {
        recommendations.push('Endelea kufuatilia mwenendo wa kifedha kwa ukaribu ili kudumisha utulivu.');
        recommendations.push('Fikiria kuwekeza zaidi katika maeneo yenye faida ili kuongeza mali za kampuni.');
    }

    // ============================================================
    // 11. CONCLUSION
    // ============================================================
        let conclusion = '';
    
    // 🆕 Kama hakuna data
    if (es.totalInflow === 0 && es.totalOutflow === 0) {
        conclusion = `Kwa ujumla, hakuna data ya kifedha iliyorekodiwa katika kipindi cha ${data.period}. Haiwezekani kutoa uchambuzi kamili wa kifedha bila data. Tafadhali chagua kipindi kingine ambacho kina shughuli za kifedha, au hakikisha data imesajiliwa.`;
    }
    // Kama kuna data nzuri
    else if (es.netChange > 0 && warnings.filter(w => w.type !== 'success' && w.type !== 'no-data').length === 0) {
        conclusion = `Kwa ujumla, kampuni iko katika hali nzuri ya kifedha katika kipindi hiki. Mapato yanazidi matumizi, malipo yanafanyika kwa wakati, na hakuna tahadhari kubwa. Hii inaonyesha usimamizi mzuri wa fedha na uimara wa kifedha wa kampuni. Endeleeni kudumisha mwenendo huu mzuri. 💪`;
    } else if (warnings.filter(w => w.type !== 'success').length > 0) {
        conclusion = `Kwa ujumla, kampuni iko katika hali ya kifedha inayohitaji uangalifu wa kiasi. Kuna tahadhari ${warnings.filter(w => w.type !== 'success').length} zinazohitaji kushughulikiwa. Hata hivyo, kwa kuchukua hatua stahiki kwa wakati, kampuni inaweza kuimarisha hali yake ya kifedha. Mapendekezo yaliyotolewa hapo juu yanaweza kusaidia katika kuboresha hali hii.`;
    } else {
        conclusion = `Kwa ujumla, kampuni iko katika hali ya kifedha tulivu. Hakuna tahadhari kubwa zinazohitajika. Endeleeni kufuatilia mwenendo wa kifedha kwa ukaribu ili kuhakikisha utulivu wa muda mrefu.`;
    }
    // ============================================================
    // RETURN NARRATIVE
    // ============================================================
    return {
        health: { status: health, icon: healthIcon, color: healthColor },
        summary,
        cashFlow: cashFlowText,
        payroll: payrollText,
        companyPayments: paymentsText,
        fundTransfers: transfersText,
        sales: salesText,
        resources: resourcesText,
        warnings,
        recommendations,
        conclusion
    };
}

// ================================================================
// 8. DASHBOARD STATS — Kila Kitu kwa Dashboard
// GET /api/finance-reports/dashboard
// ================================================================
async function getDashboardStats(req, res) {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // 1. RESOURCES
        const resources = await prisma.financialResource.findMany({
            where: { status: 'active' }
        });
        const totalResources = resources.reduce((sum, r) => sum + Number(r.amount || 0), 0);

        // 2. TRANSACTIONS (Mwezi huu)
        const transactions = await prisma.transaction.findMany({
            where: {
                createdAt: { gte: monthStart, lte: monthEnd }
            }
        });
        const monthInflow = transactions
            .filter(t => t.type === 'INFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);
        const monthOutflow = transactions
            .filter(t => t.type === 'OUTFLOW')
            .reduce((sum, t) => sum + Number(t.amount), 0);

        // 3. ORDERS
        const allOrders = await prisma.order.findMany({
            select: {
                id: true, orderId: true, status: true,
                totalAmount: true, createdAt: true,
                customerName: true, phone: true
            }
        });
        const totalOrders = allOrders.length;
        const paidOrders = allOrders.filter(o => o.status === 'paid').length;
        const pendingOrders = allOrders.filter(o => 
            o.status === 'pending' || o.status === 'ready-for-finance'
        ).length;
        const totalSales = allOrders
            .filter(o => o.status === 'paid' || o.status === 'completed' || o.status === 'delivered')
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

        // 4. PAYROLLS
        const payrolls = await prisma.payroll.findMany({
            where: { createdAt: { gte: monthStart, lte: monthEnd } }
        });
        const totalPayrolls = payrolls.length;
        const totalPayrollAmount = payrolls.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
        const pendingPayrolls = payrolls.filter(p => 
            p.status === 'pending-manager' || p.status === 'pending-ceo' || p.status === 'approved'
        ).length;

        // 5. COMPANY PAYMENTS
        const companyPayments = await prisma.companyPayment.findMany({
            where: { createdAt: { gte: monthStart, lte: monthEnd } }
        });
        const totalCompanyPayments = companyPayments.length;
        const totalCompanyPaymentAmount = companyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const pendingCompanyPayments = companyPayments.filter(p => 
            p.status === 'pending-manager' || p.status === 'pending-ceo' || p.status === 'approved'
        ).length;

        // 6. FUND TRANSFERS
        const fundTransfers = await prisma.fundTransfer.findMany({
            where: { createdAt: { gte: monthStart, lte: monthEnd } }
        });
        const totalFundTransfers = fundTransfers.length;
        const totalTransferAmount = fundTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // 7. RESOURCES BY CATEGORY (Pie Chart)
        const categoryMap = {};
        resources.forEach(r => {
            const cat = r.category || 'other';
            if (!categoryMap[cat]) categoryMap[cat] = 0;
            categoryMap[cat] += Number(r.amount || 0);
        });
        const resourcesByCategory = Object.entries(categoryMap).map(([category, amount]) => ({
            category, amount
        }));

        // 8. CASH FLOW TREND (Last 7 days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setHours(23, 59, 59, 999);

            const dayTxns = transactions.filter(t => {
                const d = new Date(t.createdAt);
                return d >= dayStart && d <= dayEnd;
            });
            const dayInflow = dayTxns
                .filter(t => t.type === 'INFLOW')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            const dayOutflow = dayTxns
                .filter(t => t.type === 'OUTFLOW')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            last7Days.push({
                date: dayStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                inflow: dayInflow,
                outflow: dayOutflow
            });
        }

        // 9. PAYMENTS BY TYPE (Bar Chart)
        const paymentTypeMap = {};
        companyPayments.forEach(p => {
            const type = p.type || 'other';
            if (!paymentTypeMap[type]) paymentTypeMap[type] = 0;
            paymentTypeMap[type] += Number(p.amount || 0);
        });
        const paymentsByType = Object.entries(paymentTypeMap).map(([type, amount]) => ({
            type, amount
        }));

        // 10. RECENT ACTIVITIES (5 za kila)
        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                orderId: true, customerName: true, totalAmount: true,
                status: true, createdAt: true
            }
        });

        const recentCompanyPayments = await prisma.companyPayment.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, reference: true, vendor: true, amount: true,
                status: true, createdAt: true
            }
        });

        const recentPayrolls = await prisma.payroll.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, payrollId: true, month: true, year: true,
                totalAmount: true, status: true, createdAt: true
            }
        });

        // 11. RESPONSE
        res.json({
            kpi: {
                totalResources,
                monthInflow,
                monthOutflow,
                netChange: monthInflow - monthOutflow,
                totalSales,
                totalOrders,
                paidOrders,
                pendingOrders
            },
            modules: {
                payroll: {
                    total: totalPayrolls,
                    amount: totalPayrollAmount,
                    pending: pendingPayrolls
                },
                companyPayments: {
                    total: totalCompanyPayments,
                    amount: totalCompanyPaymentAmount,
                    pending: pendingCompanyPayments
                },
                fundTransfers: {
                    total: totalFundTransfers,
                    amount: totalTransferAmount
                }
            },
            charts: {
                cashFlowTrend: last7Days,
                resourcesByCategory,
                paymentsByType
            },
            recent: {
                orders: recentOrders,
                companyPayments: recentCompanyPayments,
                payrolls: recentPayrolls
            }
        });

    } catch (err) {
        console.error('❌ getDashboardStats error:', err);
        res.status(500).json({ error: 'Failed to load dashboard stats: ' + err.message });
    }
}

module.exports = {
    getCashFlowReport,
    getPayrollReport,
    getFundTransferReport,
    getCompanyPaymentsReport,
    getFinancialSummaryReport,
    getReconciliationReport,
    getOverallReport,
    getDashboardStats  // 🆕
};