// ================================================================
// ANALYTICS ROUTES — PostgreSQL Version
// ================================================================
const express = require('express');
const router = express.Router();
const { query } = require('../db');

// ================================================================
// 1. LIVE ANALYTICS
// ================================================================
router.get('/live', async (req, res) => {
    try {
        // Online Now (dakika 5 zilizopita)
        const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
        const onlineResult = await query(
            'SELECT COUNT(DISTINCT ip_address) as count FROM visitors WHERE visited_at >= $1',
            [fiveMinAgo]
        );
        const onlineNow = parseInt(onlineResult[0]?.count) || 0;

        // Today's Visitors
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayResult = await query(
            'SELECT COUNT(DISTINCT ip_address) as count FROM visitors WHERE visited_at >= $1',
            [todayStart]
        );
        const todayVisitors = parseInt(todayResult[0]?.count) || 0;

        // Top Locations
        const locations = await query(`
            SELECT city, country, COUNT(DISTINCT ip_address) as count 
            FROM visitors 
            WHERE visited_at >= $1
            GROUP BY city, country 
            ORDER BY count DESC 
            LIMIT 5
        `, [todayStart]);

        // Devices
        const devices = await query(`
            SELECT device_type, COUNT(DISTINCT ip_address) as count 
            FROM visitors 
            WHERE visited_at >= $1
            GROUP BY device_type
        `, [todayStart]);

        const total = devices.reduce((sum, d) => sum + parseInt(d.count), 0) || 1;
        const devicePercentages = {
            mobile: Math.round(((parseInt(devices.find(d => d.device_type === 'mobile')?.count) || 0) / total) * 100),
            desktop: Math.round(((parseInt(devices.find(d => d.device_type === 'desktop')?.count) || 0) / total) * 100),
            tablet: Math.round(((parseInt(devices.find(d => d.device_type === 'tablet')?.count) || 0) / total) * 100)
        };

        res.json({
            onlineNow,
            todayVisitors,
            locations: locations.map(l => ({
                ...l,
                count: parseInt(l.count),
                flag: getFlagEmoji(l.country)
            })),
            devices: devicePercentages
        });

    } catch (err) {
        console.error('❌ Live analytics error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// 2. SYSTEM USAGE TREND
// ================================================================
router.get('/system-usage', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        // Logins kwa siku (PostgreSQL: DATE(created_at) inafanya kazi)
        const logins = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM audit_logs 
            WHERE action = 'LOGIN' AND created_at >= $1
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [startDate]);

        // Actions
        const actions = await query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM audit_logs 
            WHERE action != 'LOGIN' AND created_at >= $1
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [startDate]);

        const labels = [];
        const loginData = [];
        const actionData = [];

        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            
            labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }));
            
            const loginRow = logins.find(l => {
                const rowDate = new Date(l.date).toISOString().split('T')[0];
                return rowDate === dateStr;
            });
            const actionRow = actions.find(a => {
                const rowDate = new Date(a.date).toISOString().split('T')[0];
                return rowDate === dateStr;
            });
            
            loginData.push(parseInt(loginRow?.count) || 0);
            actionData.push(parseInt(actionRow?.count) || 0);
        }

        res.json({ labels, logins: loginData, actions: actionData });

    } catch (err) {
        console.error('❌ System usage error:', err);
        res.status(500).json({ error: err.message });
    }
});
// ================================================================
// 3. MODULE ACTIVITY (Line Chart - Mwenendo kwa Siku)
// ================================================================
router.get('/module-activity', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        // Tafuta tarehe za siku zote
        const labels = [];
        const dateMap = {}; // Hifadhi data kwa kila tarehe
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }));
            dateMap[dateStr] = { users: 0, products: 0, orders: 0, payments: 0, leadership: 0, testimonials: 0, projects: 0 };
        }

        // Hesabu kila kitu kimeongezwa lini
        const tables = {
            users: 'users',
            products: 'products',
            orders: 'orders',
            payments: 'payments',
            leadership: 'leadership',
            testimonials: 'testimonials',
            projects: 'projects'
        };

        // Kwa kila table, vuta tarehe na hesabu
        for (const [key, table] of Object.entries(tables)) {
            try {
                const rows = await query(`
                    SELECT DATE(created_at) as date, COUNT(*) as count
                    FROM ${table}
                    WHERE created_at >= $1
                    GROUP BY DATE(created_at)
                `, [startDate]);

                rows.forEach(row => {
                    const dateStr = new Date(row.date).toISOString().split('T')[0];
                    if (dateMap[dateStr]) {
                        dateMap[dateStr][key] = parseInt(row.count);
                    }
                });
            } catch (e) {
                // Kama table haipo, ruka tu
                console.warn(`Table ${table} haipo au haina created_at:`, e.message);
            }
        }

        // Jenga final data
        const result = {
            labels,
            users: [],
            products: [],
            orders: [],
            payments: [],
            leadership: [],
            testimonials: [],
            projects: []
        };

        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayData = dateMap[dateStr];
            
            Object.keys(result).forEach(key => {
                if (key !== 'labels') {
                    result[key].push(dayData ? dayData[key] : 0);
                }
            });
        }

        res.json(result);

    } catch (err) {
        console.error('❌ Module activity error:', err);
        res.status(500).json({ error: err.message });
    }
});
// ================================================================
// HELPER
// ================================================================
function getFlagEmoji(country) {
    const flags = {
        'Tanzania': '🇹🇿', 'Kenya': '🇰🇪', 'Uganda': '🇺🇬',
        'Rwanda': '🇷🇼', 'Burundi': '🇧🇮', 'United States': '🇺🇸',
        'United Kingdom': '🇬🇧', 'South Africa': '🇿🇦',
        'India': '🇮🇳', 'China': '🇨🇳', 'Germany': '🇩🇪',
        'France': '🇫🇷', 'Unknown': '🌍'
    };
    return flags[country] || '🌍';
}

module.exports = router;