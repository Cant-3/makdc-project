// ================================================================
// VISITOR TRACKER — PostgreSQL Version
// ================================================================
const { query } = require('../db');

async function visitorTracker(req, res, next) {
    if (req.path.startsWith('/api')) {
        return next();
    }

    try {
        let ip = req.headers['x-forwarded-for'] || 
                 req.headers['x-real-ip'] || 
                 req.connection.remoteAddress || 
                 req.socket.remoteAddress ||
                 '0.0.0.0';
        
        ip = ip.replace(/^::ffff:/, '').split(',')[0].trim();

        if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') {
            return next();
        }

        const userAgent = req.headers['user-agent'] || '';
        
        let deviceType = 'desktop';
        if (/mobile|android|iphone/i.test(userAgent)) {
            deviceType = 'mobile';
        } else if (/tablet|ipad/i.test(userAgent)) {
            deviceType = 'tablet';
        }

        let city = 'Unknown';
        let country = 'Unknown';
        
        try {
            const geoip = require('geoip-lite');
            const geo = geoip.lookup(ip);
            if (geo) {
                city = geo.city || 'Unknown';
                country = geo.country ? getCountryName(geo.country) : 'Unknown';
            }
        } catch (geoErr) {
            console.warn('⚠️ geoip-lite not installed');
        }

        // PostgreSQL INSERT
        await query(`
            INSERT INTO visitors (ip_address, city, country, device_type, user_agent, visited_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
        `, [ip, city, country, deviceType, userAgent]);

    } catch (err) {
        console.error('❌ Visitor tracking error:', err.message);
    }

    next();
}

function getCountryName(code) {
    const countries = {
        'TZ': 'Tanzania', 'KE': 'Kenya', 'UG': 'Uganda',
        'RW': 'Rwanda', 'BI': 'Burundi', 'US': 'United States',
        'GB': 'United Kingdom', 'ZA': 'South Africa', 'IN': 'India',
        'CN': 'China', 'DE': 'Germany', 'FR': 'France'
    };
    return countries[code] || code;
}

module.exports = visitorTracker;