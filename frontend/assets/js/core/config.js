// ================================================================
// MAK DC INVESTMENT — FRONTEND CONFIG
// ================================================================
const CONFIG = {
    API_URL: 'https://makdc-project.onrender.com/api',
    TOKEN_KEY: 'makdc_token',
    USER_KEY: 'makdc_user',
    ROLES: {
        SUPER_ADMIN: 'SuperAdmin',
        CEO: 'CEO',
        MANAGER: 'Manager',
        FINANCE: 'Finance',
        SALES: 'Sales',
        PROCUREMENT: 'Procurement',
        LAWYER: 'Lawyer',
        ENGINEER: 'Engineer'
    },
    DASHBOARDS: {
        'SuperAdmin': 'super-admin-dashboard.html',
        'CEO': 'ceo-dashboard.html',
        'Manager': 'manager-dashboard.html',
        'Finance': 'finance-dashboard.html',
        'Sales': 'sales-dashboard.html',
        'Procurement': 'procurement-dashboard.html',
        'Lawyer': 'lawyer-dashboard.html',
        'Engineer': 'engineer-dashboard.html'
    }
};
Object.freeze(CONFIG);