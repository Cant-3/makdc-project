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

module.exports = {
    getSalesSummary,
    getSalesTrend,
    getTopProducts,
    getTopRegions,
    getTopCustomers
};