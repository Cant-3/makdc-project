// ================================================================
// MAK DC INVESTMENT — AUTH HELPER
// ================================================================

const Auth = {
    // ============================================================
    // SESSION MANAGEMENT
    // ============================================================
    saveSession(token, user) {
        const existingToken = sessionStorage.getItem(CONFIG.TOKEN_KEY) 
                           || localStorage.getItem(CONFIG.TOKEN_KEY);
        if (!existingToken) {
            // Session mpya
        }
        sessionStorage.setItem(CONFIG.TOKEN_KEY, token);
        sessionStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
    },

    getToken() {
        return sessionStorage.getItem(CONFIG.TOKEN_KEY) 
            || localStorage.getItem(CONFIG.TOKEN_KEY);
    },

    getUser() {
        const userStr = localStorage.getItem(CONFIG.USER_KEY)
            || sessionStorage.getItem(CONFIG.USER_KEY);
        try {
            return JSON.parse(userStr || 'null');
        } catch (e) {
            return null;
        }
    },

    // ============================================================
    // 🆕 TOKEN EXPIRY CHECK
    // ============================================================
    isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;
        
        try {
            // Decode JWT payload (sehemu ya kati ya token)
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // Check kama exp (expiry) imepita
            const now = Math.floor(Date.now() / 1000);
            return payload.exp < now;
        } catch (e) {
            // Kama token ni invalid, ichukulie kama expired
            console.warn('⚠ Invalid token format:', e.message);
            return true;
        }
    },

    // ============================================================
    // LOGIN STATUS
    // ============================================================
    isLoggedIn() {
        return !!this.getToken() && !!this.getUser() && !this.isTokenExpired();
    },

    isSessionValid() {
        return this.isLoggedIn() && !this.isTokenExpired();
    },

    // ============================================================
    // ROLE CHECKS
    // ============================================================
    isSuperAdmin() {
        const user = this.getUser();
        return user && user.role === 'SuperAdmin';
    },

    isCEO() {
        const user = this.getUser();
        return user && user.role === 'CEO';
    },

    hasRole(role) {
        const user = this.getUser();
        return user && user.role === role;
    },

    // ============================================================
    // LOGOUT — Futa kila kitu
    // ============================================================
    logout() {
        // 1. Futa kumbukumbu zote za mtumiaji
        sessionStorage.removeItem(CONFIG.TOKEN_KEY);
        sessionStorage.removeItem(CONFIG.USER_KEY);
        localStorage.removeItem(CONFIG.TOKEN_KEY);
        localStorage.removeItem(CONFIG.USER_KEY);
        
        // 2. Futa cache yote ya session (kama orders, receipts, n.k.)
        sessionStorage.clear();
        
        // 3. Badilisha history ya browser ili "Back" isirudi kwenye ukurasa uliopita
        window.history.pushState(null, '', window.location.href);
        
        // 4. Elekeza kwenye Login na ubadilishe ukurasa wa sasa kwenye historia
        window.location.replace('staff-login.html');
    },

    // ============================================================
    // REQUIRE LOGIN
    // ============================================================
    requireLogin() {
        // 🆕 Check token expired kwanza
        if (this.isTokenExpired()) {
            console.warn('⚠ Token expired');
            this.logout();
            return false;
        }
        
        if (!this.isLoggedIn()) {
            window.location.href = 'staff-login.html';
            return false;
        }
        return true;
    },

    requireSuperAdmin() {
        if (!this.requireLogin()) return false;
        if (!this.isSuperAdmin()) {
            alert('Access denied. Super Admin only.');
            window.location.href = 'staff-login.html';
            return false;
        }
        return true;
    },

    requireRole(...allowedRoles) {
        if (!this.requireLogin()) return false;
        const user = this.getUser();
        if (!allowedRoles.includes(user.role)) {
            alert('Access denied.');
            window.location.href = 'staff-login.html';
            return false;
        }
        return true;
    }
};