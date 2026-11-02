// ===============================
// MAK DC INVESTMENT — API HELPER 
// ===============================
const API = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
        const token = Auth.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (response.status === 401) {
                Auth.logout();
                return null;
            }
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }
            
            return data;
            
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    login(email, password) {
        return this.post('/auth/login', { email, password });
    },
    
    getMe() {
        return this.get('/auth/me');
    },
    getUsers() {
        return this.get('/users');
    },
    updateOwnProfile(data){
        return this.put('/users/me', data);
    },    
    createUser(userData) {
        return this.post('/users', userData);
    },
    updateUser(userId, userData) {
        return this.put(`/users/${userId}`, userData);
    },
    deleteUser(userId) {
        return this.delete(`/users/${userId}`);
    },
    getSiteContent() {
        return this.get('/content');
    },
    
    updateSiteContent(key, value) {
        return this.put(`/content/${key}`, { value });
    },
    getOrders() {
        return this.get('/orders');
    },

    getOrder(orderId) {
        return this.get(`/orders/${orderId}`);
    },

    createOrder(data) {
        return this.post('/orders', data);
    },

    ttrackOrder(orderId, phone = null) {
        const query = phone ? `?phone=${encodeURIComponent(phone)}` : '';
        return this.get(`/orders/track/${orderId}${query}`);
    },

    sendOrderToFinance(orderId, notes) {
        return this.put(`/orders/${orderId}/send-to-finance`, { salesReviewNotes: notes });
    },
    
    salesEditOrder(orderId, data) {
        return this.put(`/orders/${orderId}/sales-edit`, data);
    },

    setDeliveryInfo(orderId, data) {
        return this.put(`/orders/${orderId}/delivery`, data);
    },

    markOrderDelivered(orderId) {
        return this.put(`/orders/${orderId}/mark-delivered`);
    },

    setupPayment(orderId, data) {
        return this.put(`/orders/${orderId}/setup-payment`, data);
    },

    verifyPayment(orderId, paymentReference) {
        return this.put(`/orders/${orderId}/verify-payment`, { paymentReference });
    },

    completeOrder(orderId) {
        return this.put(`/orders/${orderId}/complete`);
    },

    rejectOrder(orderId, reason) {
        return this.put(`/orders/${orderId}/reject`, { reason });
    },
    getAccounts() {
        return this.get('/accounts');
    },

    getAccount(id) {
        return this.get(`/accounts/${id}`);
    },

    getApprovedAccounts() {
        return this.get('/accounts/approved');
    },

    createAccount(data) {
        return this.post('/accounts', data);
    },

    updateAccount(id, data) {
        return this.put(`/accounts/${id}`, data);
    },
    sendAccountToManager(id, data = {}) {
        return this.put(`/accounts/${id}/send-to-manager`, data);
    },
    verifyAccount(id, data = {}) {
        return this.put(`/accounts/${id}/verify`, data);
    },
    approveAccount(id, data = {}) {
        return this.put(`/accounts/${id}/approve`, data);
    },
    rejectAccount(id, reason) {
        return this.put(`/accounts/${id}/reject`, { reason });
    },
    toggleAccountActive(id) {
        return this.put(`/accounts/${id}/toggle-active`);
    },
    deleteAccount(id) {
        return this.delete(`/accounts/${id}`);
    },
    getPayments() {
        return this.get('/payments');
    },
    getAuditLogs() {
        return this.get('/audit');
    },
    getEmployees(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/employees${query ? '?' + query : ''}`);
    },

    getEmployee(id) {
        return this.get(`/employees/${id}`);
    },

    createEmployee(data) {
        return this.post('/employees', data);
    },

    updateEmployee(id, data) {
        return this.put(`/employees/${id}`, data);
    },
    
    deleteEmployee(id) {
        return this.delete(`/employees/${id}`);
    },
    getLeadership() {
        return this.get('/leadership');
    },

    getLeadershipAdmin() {
        return this.get('/leadership/admin');
    },

    createLeadership(data) {
        return this.post('/leadership', data);
    },

    updateLeadership(id, data) {
        return this.put(`/leadership/${id}`, data);
    },

    deleteLeadership(id) {
        return this.delete(`/leadership/${id}`);
    },
    getProducts() {
        return this.get('/products');
    },

    getProductsAdmin() {
        return this.get('/products/admin');
    },

    createProduct(data) {
        return this.post('/products', data);
    },

    updateProduct(id, data) {
        return this.put(`/products/${id}`, data);
    },

    deleteProduct(id) {
        return this.delete(`/products/${id}`);
    },
    getTestimonials() {
        return this.get('/testimonials');
    },

    getTestimonialsAdmin() {
        return this.get('/testimonials/admin');
    },

    createTestimonial(data) {
        return this.post('/testimonials', data);
    },

    updateTestimonial(id, data) {
        return this.put(`/testimonials/${id}`, data);
    },

    deleteTestimonial(id) {
        return this.delete(`/testimonials/${id}`);
    },
    getNews() {
        return this.get('/news');
    },

    getNewsAdmin() {
        return this.get('/news/admin');
    },

    getNewsItem(id) {
        return this.get(`/news/${id}`);
    },

    createNews(data) {
        return this.post('/news', data);
    },

    updateNews(id, data) {
        return this.put(`/news/${id}`, data);
    },

    deleteNews(id) {
        return this.delete(`/news/${id}`);
    },
    getProjects() {
        return this.get('/projects');
    },

    getProjectsAdmin() {
        return this.get('/projects/admin');
    },

    getProject(id) {
        return this.get(`/projects/${id}`);
    },

    createProject(data) {
        return this.post('/projects', data);
    },

    updateProject(id, data) {
        return this.put(`/projects/${id}`, data);
    },

    deleteProject(id) {
        return this.delete(`/projects/${id}`);
    },
    getHeroSlides() {
        return this.get('/hero');
    },
    getHeroSlidesAdmin() {
        return this.get('/hero/admin');
    },
    createHeroSlide(data) {
        return this.post('/hero', data);
    },
    updateHeroSlide(id, data) {
        return this.put(`/hero/${id}`, data);
    },
    deleteHeroSlide(id) {
        return this.delete(`/hero/${id}`);
    },
    getStats() {
        return this.get('/stats');
    },
    getStatsAdmin() {
        return this.get('/stats/admin');
    },
    createStat(data) {
        return this.post('/stats', data);
    },
    updateStat(id, data) {
        return this.put(`/stats/${id}`, data);
    },
    deleteStat(id) {
        return this.delete(`/stats/${id}`);
    },
    getSalesSummary(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/reports/sales${query ? '?' + query : ''}`);
    },

    getSalesTrend(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/reports/sales/trend${query ? '?' + query : ''}`);
    },

    getTopProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/reports/sales/top-products${query ? '?' + query : ''}`);
    },

    getTopRegions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/reports/sales/top-regions${query ? '?' + query : ''}`);
    },

    getTopCustomers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/reports/sales/top-customers${query ? '?' + query : ''}`);
    },
    getMarketingPlans(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/marketing-plans${query ? '?' + query : ''}`);
    },

    getMarketingPlan(id) {
        return this.get(`/marketing-plans/${id}`);
    },

    createMarketingPlan(data) {
        return this.post('/marketing-plans', data);
    },

    updateMarketingPlan(id, data) {
        return this.put(`/marketing-plans/${id}`, data);
    },

    updateMarketingProgress(id, progress) {
        return this.put(`/marketing-plans/${id}/progress`, { progress });
    },

    deleteMarketingPlan(id) {
        return this.delete(`/marketing-plans/${id}`);
    },
    getMarketingActivities(planId) {
        return this.get(`/marketing-plans/${planId}/activities`);
    },

    createMarketingActivity(planId, data) {
        return this.post(`/marketing-plans/${planId}/activities`, data);
    },

    updateMarketingActivity(planId, activityId, data) {
        return this.put(`/marketing-plans/${planId}/activities/${activityId}`, data);
    },

    updateMarketingActivityStatus(planId, activityId, status) {
        return this.put(`/marketing-plans/${planId}/activities/${activityId}/status`, { status });
    },

    deleteMarketingActivity(planId, activityId) {
        return this.delete(`/marketing-plans/${planId}/activities/${activityId}`);
    },
    getLinkedOrders(planId) {
        return this.get(`/marketing-plans/${planId}/orders`);
    },

    recalculateKpi(planId) {
        return this.post(`/marketing-plans/${planId}/recalculate-kpi`);
    },
    getMarketResearch(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/market-research${query ? '?' + query : ''}`);
    },

    getResearch(id) {
        return this.get(`/market-research/${id}`);
    },

    createResearch(data) {
        return this.post('/market-research', data);
    },

    updateResearch(id, data) {
        return this.put(`/market-research/${id}`, data);
    },

    deleteResearch(id) {
        return this.delete(`/market-research/${id}`);
    },
    getPayrolls() {
        return this.get('/payrolls');
    },

    getPayroll(id) {
        return this.get(`/payrolls/${id}`);
    },

    createPayroll(data) {
        return this.post('/payrolls', data);
    },

    updatePayrollStatus(id, data) {
        return this.put(`/payrolls/${id}/status`, data);
    },

    deletePayroll(id) {
        return this.delete(`/payrolls/${id}`);
    },
    // ============================================================
    // === FINANCIAL RESOURCES ENDPOINTS ===
    // ============================================================
    getFinancialResources() {
        return this.get('/financial-resources');
    },

    getFinancialResource(id) {
        return this.get(`/financial-resources/${id}`);
    },

    createFinancialResource(data) {
        return this.post('/financial-resources', data);
    },

    updateFinancialResource(id, data) {
        return this.put(`/financial-resources/${id}`, data);
    },

    deleteFinancialResource(id) {
        return this.delete(`/financial-resources/${id}`);
    },
    getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/transactions${query ? '?' + query : ''}`);
    },

    getTransaction(id) {
        return this.get(`/transactions/${id}`);
    },

    getResourceTransactions(resourceId) {
        return this.get(`/financial-resources/${resourceId}/transactions`);
    },
    getCompanyPayments() {
        return this.get('/company-payments');
    },

    getCompanyPayment(id) {
        return this.get(`/company-payments/${id}`);
    },

    createCompanyPayment(data) {
        return this.post('/company-payments', data);
    },

    updateCompanyPayment(id, data) {
        return this.put(`/company-payments/${id}`, data);
    },

    deleteCompanyPayment(id) {
        return this.delete(`/company-payments/${id}`);
    },

    markCompanyPaymentPaid(id, data = {}) {
        return this.put(`/company-payments/${id}/mark-paid`, data);
    },
    depositToResource(id, data) {
        return this.post(`/financial-resources/${id}/deposit`, data);
    },

    withdrawFromResource(id, data) {
        return this.post(`/financial-resources/${id}/withdraw`, data);
    },
    // ============================================================
    // === FUND TRANSFER ENDPOINTS ===
    // ============================================================
    getFundTransfers() {
        return this.get('/fund-transfers');
    },

    getFundTransfer(id) {
        return this.get(`/fund-transfers/${id}`);
    },

    createFundTransfer(data) {
        return this.post('/fund-transfers', data);
    },

    updateFundTransfer(id, data) {
        return this.put(`/fund-transfers/${id}`, data);
    },

    sendFundTransferToManager(id) {
        return this.put(`/fund-transfers/${id}/send-to-manager`);
    },

    verifyFundTransfer(id) {
        return this.put(`/fund-transfers/${id}/verify`);
    },

    approveFundTransfer(id) {
        return this.put(`/fund-transfers/${id}/approve`);
    },

    executeFundTransfer(id) {
        return this.put(`/fund-transfers/${id}/execute`);
    },

    rejectFundTransfer(id, reason) {
        return this.put(`/fund-transfers/${id}/reject`, { reason });
    },

    deleteFundTransfer(id) {
        return this.delete(`/fund-transfers/${id}`);
    },
    setupMainCash() {
    return this.post('/accounts/setup-main-cash');
    },
        // ============================================================
    // === FINANCE REPORTS ENDPOINTS (6 REPORTS) ===
    // ============================================================
    getCashFlowReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/finance-reports/cash-flow${query ? '?' + query : ''}`);
    },

    getPayrollReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/finance-reports/payroll${query ? '?' + query : ''}`);
    },

    getFundTransferReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/finance-reports/fund-transfers${query ? '?' + query : ''}`);
    },

    getCompanyPaymentsReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/finance-reports/company-payments${query ? '?' + query : ''}`);
    },

    getFinancialSummaryReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/finance-reports/financial-summary${query ? '?' + query : ''}`);
    },

    getReconciliationReport(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/finance-reports/reconciliation${query ? '?' + query : ''}`);
    },
    getOverallReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.get(`/finance-reports/overall${query ? '?' + query : ''}`);
    },
    getDashboardStats() {
    return this.get('/finance-reports/dashboard');
    },
    getProductionDashboard() {
        return this.get('/production/dashboard');
    },
    
    // Raw Materials
    getRawMaterials() {
        return this.get('/production/raw-materials');
    },
    createRawMaterial(data) {
        return this.post('/production/raw-materials', data);
    },
    receiveRawMaterial(data) {
        return this.post('/production/raw-materials/receive', data);
    },
    getRawMaterialReceipts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/production/raw-materials/receipts${query ? '?' + query : ''}`);
    },
    
    // Production Batches
    getProductionBatches(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/production/batches${query ? '?' + query : ''}`);
    },
    createProductionBatch(data) {
        return this.post('/production/batches', data);
    },
    releaseBatchToSales(id) {
        return this.put(`/production/batches/${id}/release-to-sales`);
    },
    
    // Stock
    getStockOverview() {
        return this.get('/production/stock');
    },
    
    // Damaged
    getDamagedProducts() {
        return this.get('/production/damaged');
    },
    disposeDamaged(data) {
        return this.post('/production/damaged/dispose', data);
    },
    
    // Reports
    getDailyProductionReports(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/production/reports/daily${query ? '?' + query : ''}`);
    },
    getProductionSummary(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/production/reports/summary${query ? '?' + query : ''}`);
    },
    
    // Products for dropdown
    getProductionProducts() {
        return this.get('/production/products');
    },
        getRawMaterialUsage(materialId) {
        return this.get(`/production/raw-materials/${materialId}/usage`);
    },
        submitBatchQC(id, data) {
        return this.put(`/production/batches/${id}/qc`, data);
    },
        getReportMaterials(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/production/reports/materials${query ? '?' + query : ''}`);
    },
    // Kwenye api.js, ndani ya const API = { ... }
    getLiveAnalytics() {
        return this.get('/analytics/live');
    },
    getSystemUsageTrend(days = 7) {
    return this.get(`/analytics/system-usage?days=${days}`);
    },

    getModuleActivity(days = 7) {
        return this.get(`/analytics/module-activity?days=${days}`);
    },
    // ================================================================
    // PROCUREMENT APIs
    // ================================================================
    getProcurementRequests(endpoint = '/all') {
        return this.get(`/procurement${endpoint}`);
    },

    getProcurementRequestById(id) {
        return this.get(`/procurement/${id}`);
    },

    createProcurementRequest(data) {
        return this.post('/procurement', data);
    },

    updateProcurementStatus(id, data) {
        return this.put(`/procurement/${id}/status`, data);
    },
    // Stock APIs
    getStockItems() {
        return this.get('/procurement/stock');
    },

    addStockItem(data) {
        return this.post('/procurement/stock', data);
    },

    receiveStock(requestId) {
        return this.post(`/procurement/stock/receive/${requestId}`, {});
    },

    stockOut(data) {
        return this.post('/procurement/stock/out', data);
    },

    getStockTransactions() {
        return this.get('/procurement/stock/transactions');
    },
    createDepartmentRequest(data) {
    return this.post('/procurement', { ...data, source: 'department' });
    },
        getRequestMessages(requestId) {
        return this.get(`/procurement/${requestId}/messages`);
    },
    sendRequestMessage(requestId, data) {
        return this.post(`/procurement/${requestId}/messages`, data);
    },
    saveRequestFollowUp(requestId, note) {
        return this.post(`/procurement/${requestId}/follow-up`, { note });
    },
    // Kwenye API object, ongeza:
    markMessagesAsRead(requestId) {
        return this.put(`/procurement/${requestId}/messages/read`);
    },
    setTypingStatus(requestId, isTyping) {
        return this.post(`/procurement/${requestId}/typing`, { isTyping });
    },
    getTypingStatus(requestId) {
        return this.get(`/procurement/${requestId}/typing`);
    },
        // ================================================================
    // PROCUREMENT WORKFLOW APIs (Mpya)
    // ================================================================
    forwardRequestToManager(id) {
        return this.put(`/procurement/${id}/forward-to-manager`);
    },
    managerApproveRequest(id, notes) {
        return this.put(`/procurement/${id}/manager-approve`, { notes });
    },
    managerRejectRequest(id, reason) {
        return this.put(`/procurement/${id}/manager-reject`, { reason });
    },
    ceoApproveRequest(id, notes) {
        return this.put(`/procurement/${id}/ceo-approve`, { notes });
    },
    ceoRejectRequest(id, reason) {
        return this.put(`/procurement/${id}/ceo-reject`, { reason });
    },
    submitPurchaserDetails(id, data) {
        return this.put(`/procurement/${id}/purchaser-details`, data);
    },
    // Ndani ya api.js
    async getProcurementRequestById(id) {
        return this.request(`/procurement/${id}`, 'GET');
    },
    // Payment Workflow APIs
    financeVerifyAndSendToManager(id, data) {
        return this.put(`/procurement/${id}/finance-verify`, data);
    },
    managerApprovePayment(id, notes) {
        return this.put(`/procurement/${id}/manager-approve-payment`, { notes });
    },
    managerRejectPayment(id, reason) {
        return this.put(`/procurement/${id}/manager-reject-payment`, { reason });
    },
    ceoApprovePayment(id, notes) {
        return this.put(`/procurement/${id}/ceo-approve-payment`, { notes });
    },
    ceoRejectPayment(id, reason) {
        return this.put(`/procurement/${id}/ceo-reject-payment`, { reason });
    },
    financeMarkAsPaid(id, data) {
        return this.put(`/procurement/${id}/mark-paid`, data);
    },
    getPaymentDetails(id) {
        return this.get(`/procurement/${id}/payment`);
    },
    getStatusHistory(id) {
        return this.get(`/procurement/${id}/history`);
    },
    getImprestPdfUrl(id) {
        return `${CONFIG.API_URL}/procurement/${id}/imprest/pdf`;
    },
    financeVerifyProcurement(id, data) {
    return this.put(`/procurement/${id}/finance-verify`, data);
    },
    forwardRequestToManager(id) { 
    return this.put(`/procurement/${id}/forward-to-manager`); 
    },
    managerApproveRequest(id, notes) { 
    return this.put(`/procurement/${id}/manager-approve`, { notes }); 
    },
    ceoApproveRequest(id, notes) {
    return this.put(`/procurement/${id}/ceo-approve`, { notes }); 
    },
    submitPurchaserDetails(id, data) { return this.put(`/procurement/${id}/purchaser-details`, data); },
    // Kupata PDF ya Imprest
    getImprestPdfUrl(id) {
    return `${CONFIG.API_URL}/procurement/${id}/imprest/pdf`;
    },
        // ================================================================
    // ASSETS MODULE APIs
    // ================================================================
    getAssets(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.get(`/assets${query ? '?' + query : ''}`);
    },
    getAssetStats() {
        return this.get('/assets/stats');
    },
    getAssetCategories() {
        return this.get('/assets/categories');
    },
    getAsset(id) {
        return this.get(`/assets/${id}`);
    },
    createAsset(data) {
        return this.post('/assets', data);
    },
    updateAsset(id, data) {
        return this.put(`/assets/${id}`, data);
    },
    retireAsset(id, data) {
        return this.put(`/assets/${id}/retire`, data);
    },
    deleteAsset(id) {
        return this.delete(`/assets/${id}`);
    },
    // Maintenance
    getAllMaintenance() {
        return this.get('/assets/maintenance/all');
    },
    getAssetMaintenance(id) {
        return this.get(`/assets/${id}/maintenance`);
    },
    createAssetMaintenance(id, data) {
        return this.post(`/assets/${id}/maintenance`, data);
    },
    updateAssetMaintenance(id, maintId, data) {
        return this.put(`/assets/${id}/maintenance/${maintId}`, data);
    },
    // Depreciation
    calculateAssetDepreciation(id, year) {
        return this.post(`/assets/${id}/depreciation/calculate`, { year });
    },
    runAnnualDepreciation(year) {
        return this.post('/assets/depreciation/run-annual', { year });
    },
    getAssetDepreciationHistory(id) {
        return this.get(`/assets/${id}/depreciation`);
    },
    // Procurement Integration
    receiveProcurementAsAsset(requestId, data) {
        return this.put(`/procurement/${requestId}/receive-as-asset`, data);
    }   
}