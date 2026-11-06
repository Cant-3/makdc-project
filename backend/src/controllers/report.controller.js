// ================================================================
// MAK DC INVESTMENT — REPORT CONTROLLER
// ================================================================
// Handles: Sales Reports & Analytics
// ================================================================

const { prisma } = require('../config/database');

// ================================================================
// HELPER: Calculate Date Range kutoka period
// ================================================================
function calculateDateRange(period, from, to, baseDate) {
    // Tumia baseDate kama imetolewa, la sivyo leo
    const now = baseDate ? new Date(baseDate) : new Date();
    
    let startDate, endDate, label;

    // Kama from/to zimetolewa, tumia hizo (Custom range)
    if (from && to) {
        startDate = new Date(from);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        label = `${formatDate(startDate)} — ${formatDate(endDate)}`;
        return { startDate, endDate, label, type: 'custom' };
    }

    switch (period) {
        case 'daily': {
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setHours(23, 59, 59, 999);
            label = `Today — ${formatDate(now)}`;
            break;
        }
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
        case 'yearly': {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            label = `Year ${now.getFullYear()}`;
            break;
        }
        case 'monthly':
        default: {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            break;
        }
    }

    return { startDate, endDate, label, type: period || 'monthly' };
}

function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

// ================================================================
// HELPER: Calculate previous period (kwa growth comparison)
// ================================================================
function getPreviousPeriod(startDate, endDate) {
    const duration = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1); // Sekunde moja kabla
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { prevStart, prevEnd };
}

// ================================================================
// GET SALES SUMMARY
// GET /api/reports/sales?period=monthly&from=2026-10-01&to=2026-10-31
// Role: Sales, Manager, CEO, SuperAdmin
// ================================================================
async function getSalesSummary(req, res) {
    try {
        const { period = 'monthly', from, to, date } = req.query;

        // 1. Calculate date range
        const { startDate, endDate, label, type } = calculateDateRange(period, from, to);

        // 2. Fetch orders in range
        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: true
            }
        });

        // 3. Calculate summary
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const uniqueCustomers = new Set(orders.map(o => o.phone).filter(Boolean)).size;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // 4. Status breakdown
        const statusBreakdown = {
            pending: orders.filter(o => o.status === 'pending').length,
            readyForFinance: orders.filter(o => o.status === 'ready-for-finance').length,
            awaitingPayment: orders.filter(o => o.status === 'awaiting-payment').length,
            paid: orders.filter(o => o.status === 'paid').length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            completed: orders.filter(o => o.status === 'completed').length,
            rejected: orders.filter(o => o.status === 'rejected').length
        };

        // 5. Delivery type breakdown
        const deliveryBreakdown = {
            companyDelivery: orders.filter(o => o.deliveryType === 'Company Delivery').length,
            selfPickup: orders.filter(o => o.deliveryType === 'Self Pickup').length
        };

        // 6. Payment type breakdown
        const paymentBreakdown = {
            prepaid: orders.filter(o => o.paymentType === 'prepaid').length,
            postpaid: orders.filter(o => o.paymentType === 'postpaid').length,
            unspecified: orders.filter(o => !o.paymentType).length
        };

        // 7. Source breakdown
        const sourceBreakdown = {
            customerPortal: orders.filter(o => o.source === 'Customer Portal').length,
            salesDashboard: orders.filter(o => o.source === 'Sales Dashboard').length,
            other: orders.filter(o => !['Customer Portal', 'Sales Dashboard'].includes(o.source)).length
        };

        // 8. New vs Returning Customers
        // Get all customers before this period
        const prevCustomers = await prisma.order.findMany({
            where: {
                createdAt: { lt: startDate },
                phone: { not: null }
            },
            select: { phone: true },
            distinct: ['phone']
        });
        const prevPhones = new Set(prevCustomers.map(o => o.phone));

        const currentPhones = new Set(orders.map(o => o.phone).filter(Boolean));
        let newCustomers = 0;
        let returningCustomers = 0;
        currentPhones.forEach(phone => {
            if (prevPhones.has(phone)) returningCustomers++;
            else newCustomers++;
        });

        // 9. Growth (compare with previous period)
        const { prevStart, prevEnd } = getPreviousPeriod(startDate, endDate);
        const prevOrders = await prisma.order.aggregate({
            where: {
                createdAt: { gte: prevStart, lte: prevEnd }
            },
            _sum: { totalAmount: true },
            _count: true
        });

        const prevRevenue = Number(prevOrders._sum.totalAmount || 0);
        const prevOrderCount = prevOrders._count || 0;

        const revenueGrowth = prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
            : 0;
        const orderGrowth = prevOrderCount > 0
            ? ((totalOrders - prevOrderCount) / prevOrderCount) * 100
            : 0;

        // 10. Response
        res.json({
            period: {
                type,
                label,
                from: startDate,
                to: endDate
            },
            summary: {
                totalOrders,
                totalRevenue,
                totalCustomers: uniqueCustomers,
                newCustomers,
                returningCustomers,
                averageOrderValue: Math.round(avgOrderValue)
            },
            growth: {
                revenue: Number(revenueGrowth.toFixed(1)),
                orders: Number(orderGrowth.toFixed(1)),
                previousRevenue: prevRevenue,
                previousOrders: prevOrderCount
            },
            statusBreakdown,
            deliveryBreakdown,
            paymentBreakdown,
            sourceBreakdown
        });

    } catch (err) {
        console.error('❌ Get sales summary error:', err);
        res.status(500).json({ error: 'Failed to generate sales summary.' });
    }
}

// ================================================================
// GET SALES TREND — Daily data kwa charts
// GET /api/reports/sales/trend?period=monthly&from=...&to=...
// ================================================================
async function getSalesTrend(req, res) {
    try {
        const { period = 'monthly', from, to, date } = req.query;
        const { startDate, endDate } = calculateDateRange(period, from, to, date);

        // Group by date
        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate }
            },
            select: {
                createdAt: true,
                totalAmount: true,
                status: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // Build daily map
        const dailyMap = {};
        const current = new Date(startDate);
        while (current <= endDate) {
            const key = current.toISOString().split('T')[0];
            dailyMap[key] = { date: key, orders: 0, revenue: 0 };
            current.setDate(current.getDate() + 1);
        }

        orders.forEach(o => {
            const key = new Date(o.createdAt).toISOString().split('T')[0];
            if (dailyMap[key]) {
                dailyMap[key].orders += 1;
                dailyMap[key].revenue += Number(o.totalAmount);
            }
        });

        res.json({
            period: { from: startDate, to: endDate },
            trend: Object.values(dailyMap)
        });

    } catch (err) {
        console.error('❌ Get sales trend error:', err);
        res.status(500).json({ error: 'Failed to generate trend.' });
    }
}

// ================================================================
// GET TOP PRODUCTS
// GET /api/reports/sales/top-products?period=monthly&limit=10
// ================================================================
async function getTopProducts(req, res) {
    try {
        const { period = 'monthly', from, to, date, limit = 10 } = req.query;
        const { startDate, endDate } = calculateDateRange(period, from, to, date);

        const orderItems = await prisma.orderItem.findMany({
            where: {
                order: {
                    createdAt: { gte: startDate, lte: endDate },
                    status: { not: 'rejected' } // Tuna-ignore rejected
                }
            },
            select: {
                productName: true,
                quantity: true,
                subtotal: true
            }
        });

        // Group by productName
        const productMap = {};
        orderItems.forEach(item => {
            if (!productMap[item.productName]) {
                productMap[item.productName] = {
                    productName: item.productName,
                    quantity: 0,
                    revenue: 0
                };
            }
            productMap[item.productName].quantity += item.quantity;
            productMap[item.productName].revenue += Number(item.subtotal);
        });

        const topProducts = Object.values(productMap)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, parseInt(limit));

        res.json({
            period: { from: startDate, to: endDate },
            products: topProducts
        });

    } catch (err) {
        console.error('❌ Get top products error:', err);
        res.status(500).json({ error: 'Failed to generate top products.' });
    }
}

// ================================================================
// GET TOP REGIONS
// GET /api/reports/sales/top-regions?period=monthly
// ================================================================
async function getTopRegions(req, res) {
    try {
        const { period = 'monthly', from, to, date } = req.query;
        const { startDate, endDate } = calculateDateRange(period, from, to, date);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: { not: 'rejected' },
                region: { not: null }
            },
            select: {
                region: true,
                totalAmount: true
            }
        });

        const regionMap = {};
        let totalRevenue = 0;

        orders.forEach(o => {
            const region = o.region || 'Unknown';
            if (!regionMap[region]) {
                regionMap[region] = { region, orders: 0, revenue: 0 };
            }
            regionMap[region].orders += 1;
            regionMap[region].revenue += Number(o.totalAmount);
            totalRevenue += Number(o.totalAmount);
        });

        const regions = Object.values(regionMap)
            .sort((a, b) => b.revenue - a.revenue)
            .map(r => ({
                ...r,
                percentage: totalRevenue > 0 ? Number(((r.revenue / totalRevenue) * 100).toFixed(1)) : 0
            }));

        res.json({
            period: { from: startDate, to: endDate },
            regions,
            totalRevenue
        });

    } catch (err) {
        console.error('❌ Get top regions error:', err);
        res.status(500).json({ error: 'Failed to generate top regions.' });
    }
}

// ================================================================
// GET TOP CUSTOMERS
// GET /api/reports/sales/top-customers?period=monthly&limit=10
// ================================================================
async function getTopCustomers(req, res) {
    try {
        const { period = 'monthly', from, to, date, limit = 10 } = req.query;
        const { startDate, endDate } = calculateDateRange(period, from, to, date);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: startDate, lte: endDate },
                status: { not: 'rejected' },
                phone: { not: null }
            },
            select: {
                customerName: true,
                phone: true,
                email: true,
                totalAmount: true,
                region: true
            }
        });

        // Group by phone (unique customer)
        const customerMap = {};
        orders.forEach(o => {
            const key = o.phone;
            if (!customerMap[key]) {
                customerMap[key] = {
                    customerName: o.customerName,
                    phone: o.phone,
                    email: o.email,
                    region: o.region,
                    orders: 0,
                    totalSpent: 0
                };
            }
            customerMap[key].orders += 1;
            customerMap[key].totalSpent += Number(o.totalAmount);
        });

        const topCustomers = Object.values(customerMap)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, parseInt(limit));

        res.json({
            period: { from: startDate, to: endDate },
            customers: topCustomers
        });

    } catch (err) {
        console.error('❌ Get top customers error:', err);
        res.status(500).json({ error: 'Failed to generate top customers.' });
    }
}
// ================================================================
// 🆕 PROCUREMENT & STORE REPORTS (Raw SQL)
// ================================================================
const { query } = require('../db');

// 1. RIPOTI YA MANUNUZI (Procurement Summary)
async function getProcurementSummary(req, res) {
    try {
        const { period = 'monthly' } = req.query;
        
        // Tunatumia tarehe za mwanzo na mwisho kulingana na period
        let dateFilter = "";
        if (period === 'monthly') dateFilter = "AND created_at >= date_trunc('month', CURRENT_DATE)";
        else if (period === 'yearly') dateFilter = "AND created_at >= date_trunc('year', CURRENT_DATE)";
        else if (period === 'weekly') dateFilter = "AND created_at >= date_trunc('week', CURRENT_DATE)";

        const summary = await query(`
            SELECT 
                COUNT(*) as total_requests,
                COALESCE(SUM(total_amount), 0) as total_value,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_value,
                COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'rejected', 'returned') THEN total_amount ELSE 0 END), 0) as pending_value,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'pending-manager' THEN 1 END) as pending_manager,
                COUNT(CASE WHEN status = 'pending-ceo' THEN 1 END) as pending_ceo
            FROM procurement_requests
            WHERE 1=1 ${dateFilter}
        `);

        const recent = await query(`
            SELECT id, request_number, title, total_amount, status, created_at
            FROM procurement_requests
            WHERE 1=1 ${dateFilter}
            ORDER BY created_at DESC
            LIMIT 5
        `);

        res.json({
            summary: summary[0] || {},
            recentRequests: recent
        });
    } catch (err) {
        console.error('getProcurementSummary error:', err);
        res.status(500).json({ error: err.message });
    }
}

// 2. RIPOTI YA STOCK (Store Consumption)
async function getStoreSummary(req, res) {
    try {
        const { period = 'monthly' } = req.query;
        let dateFilter = "";
        if (period === 'monthly') dateFilter = "AND t.created_at >= date_trunc('month', CURRENT_DATE)";
        else if (period === 'yearly') dateFilter = "AND t.created_at >= date_trunc('year', CURRENT_DATE)";

        // Jumla ya Stock iliyopo kwa sasa
        const stockValue = await query(`
            SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * unit_price), 0) as total_value
            FROM stock_items
        `);

        // Matumizi ya Stock kwa idara (mwezi huu)
        const consumption = await query(`
            SELECT 
                t.department,
                COUNT(t.id) as total_transactions,
                COALESCE(SUM(t.quantity), 0) as total_quantity_issued
            FROM stock_transactions t
            WHERE t.transaction_type = 'out' ${dateFilter}
            GROUP BY t.department
            ORDER BY total_quantity_issued DESC
        `);

        // Bidhaa 5 zinazotumika sana
        const topItems = await query(`
            SELECT 
                s.item_name,
                SUM(t.quantity) as total_issued
            FROM stock_transactions t
            JOIN stock_items s ON t.stock_item_id = s.id
            WHERE t.transaction_type = 'out' ${dateFilter}
            GROUP BY s.item_name
            ORDER BY total_issued DESC
            LIMIT 5
        `);

        res.json({
            summary: stockValue[0] || {},
            consumptionByDepartment: consumption,
            topItems
        });
    } catch (err) {
        console.error('getStoreSummary error:', err);
        res.status(500).json({ error: err.message });
    }
}

// 3. RIPOTI YA ASSETS (Asset Maintenance)
async function getAssetSummary(req, res) {
    try {
        const { period = 'monthly' } = req.query;
        let dateFilter = "";
        if (period === 'monthly') dateFilter = "AND m.created_at >= date_trunc('month', CURRENT_DATE)";
        else if (period === 'yearly') dateFilter = "AND m.created_at >= date_trunc('year', CURRENT_DATE)";

        // Jumla ya Mali (Assets) zilizopo
        const assetsStats = await query(`
            SELECT 
                COUNT(*) as total_assets,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'In Maintenance' THEN 1 END) as in_maintenance,
                COALESCE(SUM(current_value), 0) as total_current_value
            FROM assets
        `);

        // Gharama za Matengenezo (mwezi huu)
        const maintenanceCost = await query(`
            SELECT 
                COUNT(m.id) as total_repairs,
                COALESCE(SUM(m.cost), 0) as total_cost
            FROM asset_maintenance m
            WHERE m.status = 'completed' ${dateFilter}
        `);

        // Chombo kinachotumia pesa nyingi kwenye matengenezo
        const topAssets = await query(`
            SELECT 
                a.name as asset_name,
                a.asset_tag,
                SUM(m.cost) as total_cost
            FROM asset_maintenance m
            JOIN assets a ON m.asset_id = a.id
            WHERE m.status = 'completed' ${dateFilter}
            GROUP BY a.id, a.name, a.asset_tag
            ORDER BY total_cost DESC
            LIMIT 5
        `);

        res.json({
            summary: { ...assetsStats[0], ...maintenanceCost[0] },
            topAssets
        });
    } catch (err) {
        console.error('getAssetSummary error:', err);
        res.status(500).json({ error: err.message });
    }
}
async function getMasterReport(req, res) {
    try {
        const { period = 'monthly', from, to } = req.query;
        
        let dateFilter = "";
        const params = [];
        
        // DATE FILTER
        if (from && to) {
            dateFilter = `AND created_at >= $1 AND created_at <= $2::timestamp + interval '1 day'`;
            params.push(from, to);
        } else if (period === 'monthly') {
            dateFilter = "AND created_at >= date_trunc('month', CURRENT_DATE)";
        } else if (period === 'last-month') {
            dateFilter = "AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND created_at < date_trunc('month', CURRENT_DATE)";
        } else if (period === 'yearly') {
            dateFilter = "AND created_at >= date_trunc('year', CURRENT_DATE)";
        } else if (period === 'weekly') {
            dateFilter = "AND created_at >= date_trunc('week', CURRENT_DATE)";
        }

        // PROCUREMENT
        const proc = await query(`
            SELECT 
                COUNT(*) as total_requests,
                COALESCE(SUM(total_amount), 0) as total_value,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_value,
                COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'rejected', 'returned') THEN total_amount ELSE 0 END), 0) as pending_value,
                COUNT(CASE WHEN status = 'pending-manager' THEN 1 END) as pending_manager,
                COUNT(CASE WHEN status = 'pending-ceo' THEN 1 END) as pending_ceo,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count
            FROM procurement_requests
            WHERE 1=1 ${dateFilter}
        `, params);

        // STORE
        const stock = await query(`
            SELECT 
                COUNT(*) as total_items,
                COALESCE(SUM(quantity), 0) as total_quantity,
                COALESCE(SUM(quantity * unit_price), 0) as total_value
            FROM stock_items
        `);

        const stockOut = await query(`
            SELECT COUNT(*) as out_count
            FROM stock_transactions
            WHERE transaction_type = 'out' ${dateFilter}
        `, params);

        // ASSETS
        const assets = await query(`
            SELECT 
                COUNT(*) as total_assets,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active,
                COUNT(CASE WHEN status = 'In Maintenance' THEN 1 END) as maintenance,
                COALESCE(SUM(current_value), 0) as total_current_value
            FROM assets
        `);

        const maintCost = await query(`
            SELECT 
                COUNT(*) as total_repairs,
                COALESCE(SUM(cost), 0) as total_cost
            FROM asset_maintenance
            WHERE status = 'completed' ${dateFilter}
        `, params);

        // TENDERS
        const tenders = await query(`
            SELECT 
                COUNT(*) as total_tenders,
                COUNT(CASE WHEN status = 'won' THEN 1 END) as won,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
                COUNT(CASE WHEN status = 'incoming' THEN 1 END) as incoming,
                COALESCE(SUM(CASE WHEN status = 'won' THEN awarded_amount ELSE 0 END), 0) as won_value
            FROM tenders
            WHERE 1=1 ${dateFilter}
        `, params);

        // DATA OBJECTS
        const p = proc[0] || {};
        const s = stock[0] || {};
        const a = assets[0] || {};
        const m = maintCost[0] || {};
        const t = tenders[0] || {};

        let periodLabel = 'this month';
        if (from && to) periodLabel = `from ${from} to ${to}`;
        else if (period === 'last-month') periodLabel = 'last month';
        else if (period === 'yearly') periodLabel = 'this year';
        else if (period === 'weekly') periodLabel = 'this week';

        // NARRATIVES ZA KILA IDARA
        const procurementNarrative = Number(p.total_requests) > 0
            ? `During ${periodLabel}, the company processed ${p.total_requests} procurement requests valued at TSh ${Number(p.total_value).toLocaleString()}. ${Number(p.paid_value) > 0 ? `TSh ${Number(p.paid_value).toLocaleString()} has been paid to suppliers.` : 'No payments have been made yet.'}`
            : `No procurement activities were recorded during ${periodLabel}.`;

        const stockNarrative = Number(s.total_items) > 0
            ? `The Store currently holds ${s.total_items} unique items with a total value of TSh ${Number(s.total_value).toLocaleString()}. ${Number(stockOut[0]?.out_count) > 0 ? `${stockOut[0].out_count} stock issues were made to departments during this period.` : 'No stock issues were made during this period.'}`
            : `The Store has no items registered in the system.`;

        const assetNarrative = Number(a.total_assets) > 0
            ? `The company manages ${a.total_assets} fixed assets (${a.active} active, ${a.maintenance} in maintenance) valued at TSh ${Number(a.total_current_value).toLocaleString()}. ${Number(m.total_repairs) > 0 ? `TSh ${Number(m.total_cost).toLocaleString()} was spent on ${m.total_repairs} maintenance works.` : 'No maintenance costs were incurred.'}`
            : `No fixed assets are registered in the system.`;

        const tenderNarrative = Number(t.total_tenders) > 0
            ? `A total of ${t.total_tenders} tenders were registered during ${periodLabel}. ${t.won} were won (valued at TSh ${Number(t.won_value).toLocaleString()}), ${t.lost} were lost, and ${t.incoming} are still incoming.`
            : `No tenders were registered during ${periodLabel}.`;

        // MAIN NARRATIVE (Inayojumuisha yote)
        const narrative = [procurementNarrative, stockNarrative, assetNarrative, tenderNarrative].join(' ');

        res.json({
            period,
            from: from || null,
            to: to || null,
            procurement: p,
            stock: { ...s, stockOut: stockOut[0]?.out_count || 0 },
            assets: { ...a, ...m },
            tenders: t,
            narrative,
            narratives: {
                procurement: procurementNarrative,
                stock: stockNarrative,
                assets: assetNarrative,
                tenders: tenderNarrative
            }
        });

    } catch (err) {
        console.error('getMasterReport error:', err);
        res.status(500).json({ error: err.message });
    }
}
async function getProcurementTrend(req, res) {
    try {
        const { from, to, period = 'monthly' } = req.query;
        
        let startDate, endDate;
        
        // Set Date Range
        if (from && to) {
            startDate = from;
            endDate = to;
        } else {
            const now = new Date();
            if (period === 'weekly') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
            } else if (period === 'yearly') {
                startDate = new Date(now.getFullYear(), 0, 1);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }
            endDate = now.toISOString().split('T')[0];
        }

        // Query: Group by day
        const trend = await query(`
            SELECT 
                TO_CHAR(created_at, 'YYYY-MM-DD') as date,
                COUNT(*) as total_requests,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_value,
                COALESCE(SUM(CASE WHEN status NOT IN ('paid', 'rejected', 'returned') THEN total_amount ELSE 0 END), 0) as pending_value
            FROM procurement_requests
            WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
            GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
            ORDER BY date ASC
        `, [startDate, endDate]);

        res.json({ trend, from: startDate, to: endDate });
    } catch (err) {
        console.error('getProcurementTrend error:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    // Zilizopo za Sales
    getSalesSummary,
    getSalesTrend,
    getTopProducts,
    getTopRegions,
    getTopCustomers,
    // 🆕 Mpya za Procurement/Store/Assets
    getProcurementSummary,
    getStoreSummary,
    getAssetSummary,
    getMasterReport,
    getProcurementTrend
};