// ================================================================
// MAK DC INVESTMENT — AUTH GUARD
// ================================================================

// ================================================================
// 🆕 CACHE CONTROL + BACK BUTTON PROTECTION
// ================================================================
if (typeof window !== 'undefined' && window.history) {
    // Futa cache ya "Back" kwenye kila page load
    window.history.pushState(null, '', window.location.href);
    
    // Zuia "Back" kurudi kwenye ukurasa uliopita
    window.addEventListener('popstate', function() {
        // Kama mtumiaji hana token, mpeleke kwenye Login
        if (!Auth.isLoggedIn()) {
            window.location.replace('staff-login.html');
        } else {
            // Kama ana token, rudisha kwenye ukurasa huo huo
            window.history.pushState(null, '', window.location.href);
        }
    });
}

// ================================================================
// 🆕 PROTECT PAGE — Check token expiry + role
// ================================================================
function protectPage(...allowedRoles) {
    // 1. Check token expired kwanza
    if (Auth.isTokenExpired()) {
        console.warn('⚠ Token expired — redirecting to login');
        Auth.logout();
        return false;
    }
    
    // 2. Check kama ameingia
    if (!Auth.isLoggedIn()) {
        console.warn('⚠ Not logged in — redirecting to login');
        window.location.replace('staff-login.html');
        return false;
    }

    // 3. Check role
    const user = Auth.getUser();

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.warn(`⚠ Access denied — role "${user.role}" not allowed`);
        alert(`Access denied. This page is for: ${allowedRoles.join(', ')}`);
        
        const dashboardUrls = {
            'SuperAdmin': 'super-admin-dashboard.html',
            'CEO': 'ceo-dashboard.html',
            'Manager': 'manager-dashboard.html',
            'Finance': 'finance-dashboard.html',
            'Sales': 'sales-dashboard.html',
            'Procurement': 'procurement-dashboard.html',
            'Lawyer': 'lawyer-dashboard.html',
            'Engineer': 'engineer-dashboard.html'
        };
        
        window.location.href = dashboardUrls[user.role] || 'staff-login.html';
        return false;
    }

    return true;
}

// ================================================================
// 🆕 CHECK TOKEN KILA DAKIKA 1
// ================================================================
setInterval(() => {
    const token = Auth.getToken();
    if (token && Auth.isTokenExpired()) {
        console.warn('⚠ Token expired during session — logging out');
        alert('Session imeisha muda. Tafadhali ingia tena.');
        Auth.logout();
    }
}, 60000);  // 60000 ms = dakika 1

// ================================================================
// AUTO-PROTECT KILA UKURASA
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    const rolesAttr = document.body.dataset.roles;
    
    if (rolesAttr) {
        const allowedRoles = rolesAttr.split(',').map(r => r.trim());
        protectPage(...allowedRoles);
    } else {
        if (!Auth.isLoggedIn()) {
            window.location.href = 'staff-login.html';
        }
    }
});