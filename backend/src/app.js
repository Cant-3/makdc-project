// ================================================================
// MAK DC INVESTMENT — EXPRESS APP SETUP
// ================================================================
const express = require('express');
const cors = require('cors');

const app = express();

// ================================================================
// SECURITY: ZUIA CACHING
// ================================================================
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    next();
});

// ================================================================
// MIDDLEWARE YA MSINGI
// ================================================================
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================================================================
// REQUEST LOGGER
// ================================================================
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// ================================================================
// HEALTH CHECK ROUTE
// ================================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'MAK DC Investment API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// ================================================================
// ROUTES — REQUIRES
// ================================================================
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const contentRoutes = require('./routes/content.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const auditRoutes = require('./routes/audit.routes');
const employeeRoutes = require('./routes/employee.routes');
const leadershipRoutes = require('./routes/leadership.routes');
const productRoutes = require('./routes/product.routes');
const accountRoutes = require('./routes/account.routes');
const testimonialRoutes = require('./routes/testimonial.routes');
const newsRoutes = require('./routes/news.routes');
const heroRoutes = require('./routes/hero.routes');
const statRoutes = require('./routes/stat.routes');
const projectRoutes = require('./routes/project.routes');
const reportRoutes = require('./routes/report.routes');
const marketingRoutes = require('./routes/marketing.routes');
const marketResearchRoutes = require('./routes/marketResearch.routes');
const payrollRoutes = require('./routes/payroll.routes');
const financialResourceRoutes = require('./routes/financialResource.routes');
const transactionRoutes = require('./routes/transaction.routes');
const companyPaymentRoutes = require('./routes/companyPayment.routes');

// 🆕 Analytics & Visitor Tracker
const visitorTracker = require('./middleware/visitorTracker');
const analyticsRoutes = require('./routes/analytics');

// ================================================================
// ROUTES — MOUNTING
// ================================================================

// 🆕 Visitor Tracker (weka KWANZA ili irekodi kila request)
app.use(visitorTracker);

// Routes zote za API
app.use('/api/company-payments', companyPaymentRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/hero', heroRoutes);
app.use('/api/stats', statRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/leadership', leadershipRoutes);
app.use('/api/products', productRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/marketing-plans', marketingRoutes);
app.use('/api/market-research', marketResearchRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/financial-resources', financialResourceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/fund-transfers', require('./routes/fundTransfer.routes'));
app.use('/api/finance-reports', require('./routes/financeReport.routes'));
app.use('/api/production', require('./routes/production.routes'));
app.use('/api/procurement', require('./routes/procurement.routes'));
app.use('/api/analytics', analyticsRoutes);
app.use('/api/assets', require('./routes/asset.routes'));




// ================================================================
// 404 HANDLER (IWE MWISHO KABISA)
// ================================================================
app.use((req, res) => {
    res.status(404).json({
        error: 'Route haipo',
        path: req.originalUrl,
        method: req.method
    });
});

// ================================================================
// GLOBAL ERROR HANDLER
// ================================================================
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    console.error(err.stack);

    res.status(err.status || 500).json({
        error: err.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

module.exports = app;