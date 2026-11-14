const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ================================================================
// 1. GENERATE METRICS
// ================================================================
exports.generateMetrics = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start and End dates are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const userId = req.user.id;
        const userName = req.user.fullName;

        // 1. Orders
        const orders = await prisma.order.findMany({
            where: { createdAt: { gte: start, lte: end } }
        });
        const completedOrders = orders.filter(o => o.status === 'completed').length;

        // 2. Finance Approvals
        const payments = await prisma.companyPayment.findMany({
            where: { 
                managerVerifiedAt: { gte: start, lte: end },
                managerVerifiedBy: userName 
            }
        });
        const totalPaymentsAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

        const payrolls = await prisma.payroll.findMany({
            where: { 
                managerVerifiedAt: { gte: start, lte: end },
                managerVerifiedBy: userName
            }
        });

        // 3. Staff Management
        const newEmployees = await prisma.employee.findMany({
            where: { createdAt: { gte: start, lte: end } }
        });

        // 4. Budgets
        const budgets = await prisma.masterBudget.findMany({
            where: { 
                createdAt: { gte: start, lte: end },
                createdById: userId 
            }
        });

        res.json({
            orders: {
                total: orders.length,
                completed: completedOrders,
                pending: orders.length - completedOrders
            },
            finance: {
                paymentsCount: payments.length,
                paymentsTotal: totalPaymentsAmount,
                payrollsCount: payrolls.length
            },
            staff: {
                newHires: newEmployees.length
            },
            budgets: {
                count: budgets.length
            }
        });

    } catch (err) {
        console.error('generateMetrics error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 2. CREATE REPORT
// ================================================================
exports.createReport = async (req, res) => {
    try {
        const {
            periodType, startDate, endDate,
            metrics,
            keyActivities, executiveSummary, challenges, recommendations,
            fileName, fileType, fileSize, fileData,
            status
        } = req.body;

        const report = await prisma.managerReport.create({
            data: {
                reportId: `REP-${Date.now()}`,
                periodType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                metrics: metrics ? JSON.parse(metrics) : {},
                keyActivities,
                executiveSummary,
                challenges,
                recommendations,
                fileName,
                fileType,
                fileSize: fileSize ? parseInt(fileSize) : null,
                fileData,
                status: status || 'Draft',
                submittedAt: status === 'Pending CEO' ? new Date() : null,
                createdBy: req.user.fullName,
                createdById: req.user.id
            }
        });

        res.status(201).json(report);
    } catch (err) {
        console.error('createReport error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 3. GET ALL REPORTS
// ================================================================
exports.getReports = async (req, res) => {
    try {
        const userRole = (req.user.role || '').toLowerCase();
        let where = {};

        if (userRole.includes('manager')) {
            where.createdById = req.user.id;
        } else if (userRole.includes('ceo')) {
            where.status = { in: ['Pending CEO', 'Reviewed'] };
        }

        const reports = await prisma.managerReport.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });

        // Toa fileData kwenye orodha kwa ajili ya performance
        const sanitized = reports.map(r => {
            const { fileData, ...rest } = r;
            return rest;
        });

        res.json(sanitized);
    } catch (err) {
        console.error('getReports error:', err);
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 4. GET REPORT BY ID (pamoja na fileData)
// ================================================================
exports.getReportById = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await prisma.managerReport.findUnique({
            where: { id: parseInt(id) }
        });

        if (!report) return res.status(404).json({ error: 'Report not found' });
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ================================================================
// 5. CEO REVIEW
// ================================================================
exports.reviewReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedback } = req.body;

        if (!feedback) return res.status(400).json({ error: 'Feedback is required' });

        const updated = await prisma.managerReport.update({
            where: { id: parseInt(id) },
            data: {
                status: 'Reviewed',
                ceoFeedback: feedback,
                ceoReviewedAt: new Date(),
                ceoReviewedBy: req.user.fullName
            }
        });

        res.json(updated);
    } catch (err) {
        console.error('reviewReport error:', err);
        res.status(500).json({ error: err.message });
    }
};