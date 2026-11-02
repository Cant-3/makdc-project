// ================================================================
// MAK DC INVESTMENT — SERVER ENTRY POINT
// ================================================================
// File hii inaanzisha server na kuunganisha kila kitu
// ================================================================

require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ================================================================
// ANZISHA SERVER
// ================================================================
const server = app.listen(PORT, () => {
    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('  🚀 MAK DC INVESTMENT — BACKEND SERVER');
    console.log('════════════════════════════════════════════════');
    console.log(`  📍 Environment:  ${NODE_ENV}`);
    console.log(`  🌐 Server URL:   http://localhost:${PORT}`);
    console.log(`  🔗 API Base:     http://localhost:${PORT}/api`);
    console.log(`  ❤️  Health check: http://localhost:${PORT}/api/health`);
    console.log('════════════════════════════════════════════════');
    console.log('');
});

// ================================================================
// HANDLE ERRORS ZISIZOTARAJIWA
// ================================================================
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    server.close(() => process.exit(1));
});

// ================================================================
// GRACEFUL SHUTDOWN
// ================================================================
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
