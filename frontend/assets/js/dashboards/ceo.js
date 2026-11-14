// ================================================================
// MAK DC INVESTMENT — CEO DASHBOARD (TAB-BASED)
// ================================================================

let currentUser = null;
let currentProfilePic = null;
let allCompanyPayments = [];
let allCEOPayrolls = [];
let allCEOFundTransfers = [];
let allCEOStaff = [];
let currentApprovalFilter = 'pending-ceo';
let isSavingKpiDraft = false;
let isReleasingKpi = false;

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!protectPage('CEO', 'SuperAdmin')) return;

    currentUser = Auth.getUser();

    renderCEOProfile();
    initSidebar();
    await loadCEODashboard();
});

// ================================================================
// RENDER CEO PROFILE
// ================================================================
function renderCEOProfile() {
    if (!currentUser) return;

    const user = currentUser;
    const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    setText('sidebarUserName', user.fullName);
    setAvatar('sidebarUserAvatar', user.profilePic, initials);
    setText('udName', user.fullName);
    setText('udRole', `👔 ${user.role}`);
    setAvatar('udAvatar', user.profilePic, initials);
    setText('udpName', user.fullName);
    setText('udpRole', `👔 ${user.role}`);
    setText('udpEmail', user.email || '—');
    setText('udpPhone', user.phone || '—');
    setText('udpDepartment', user.department || '—');
    setText('udpEmployeeId', user.employeeId || '—');
    setAvatar('udpPic', user.profilePic, initials);
    setText('welcomeName', user.fullName);
}

// ================================================================
// TAB SWITCHING — MUHIMU
// ================================================================
function switchTab(tabId, event) {
    if (event) event.preventDefault();

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    // Remove active from all sidebar links (zote kuu na ndogo)
    document.querySelectorAll('.sidebar-nav a, .sidebar-submenu a').forEach(a => a.classList.remove('active'));

    // Show selected tab
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    // Highlight sidebar link (Kama ilibonyezwa moja kwa moja)
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
        
        // Kama ni ya submenu, hakikisha dropdown ipo wazi
        if (event.currentTarget.closest('.sidebar-submenu')) {
            const parentGroup = event.currentTarget.closest('.sidebar-nav-group');
            if (parentGroup) {
                const parentTrigger = parentGroup.querySelector('.sidebar-nav-parent');
                if (parentTrigger) parentTrigger.classList.add('open');
                if (event.currentTarget.closest('.sidebar-submenu')) event.currentTarget.closest('.sidebar-submenu').classList.add('open');
            }
        }
    } else {
        // Kama imeitwa na JS (mfano kupitia function nyingine)
        const link = document.querySelector(`.sidebar-nav a[onclick*="${tabId}"]`);
        if (link) link.classList.add('active');
    }
    if (tabId === 'tab-overview')    loadOverviewTab();
    if (tabId === 'tab-employees')   loadEmployeesTab();
    if (tabId === 'tab-payments')    loadPaymentsTab();
    if (tabId === 'tab-payrolls')    loadPayrollsTab();
    if (tabId === 'tab-transfers')   loadTransfersTab();
    if (tabId === 'tab-accounts')    loadAccountsTab();
    if (tabId === 'tab-budget')      loadCEOBudgetsTab();
    if (tabId === 'tab-procurement-approvals') loadCEOProcurementApprovals();
    if (tabId === 'tab-business-plans') loadCeoBusinessPlans();
    if (tabId === 'tab-strategic-plans') loadCEOStrategicPlans();
    if (tabId === 'tab-manager-reports') loadCeoManagerReports();
    if (tabId === 'tab-company-pulse') loadCompanyPulse();
    if (tabId === 'tab-released-kpis') loadReleasedKpisTab();
    if (tabId === 'tab-draft-kpis') loadDraftKpisTab();
    if (tabId === 'tab-kpis') loadKPIs();
    if (tabId === 'tab-mail-center') {switchMailBox('inbox'); // Fungua inbox kwa default
}
    if (tabId === 'tab-reports') {/* static */}

    // Close sidebar on mobile
    if (window.innerWidth <= 768) closeSidebar();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
// ================================================================
// LOAD CEO DASHBOARD — inaita kila tab load
// ================================================================
async function loadCEODashboard() {
    try {
        // Load all data in parallel
        await Promise.all([
            loadOverviewTab(),
            loadEmployeesTab(),
            loadPaymentsTab(),
            loadPayrollsTab(),
            loadTransfersTab(),
            loadAccountsTab()
        ]);
    } catch (err) {
        console.error('CEO dashboard error:', err);
        showToast('Failed to load dashboard: ' + err.message, 'error');
    }
}

// ================================================================
// TAB: OVERVIEW
// ================================================================
async function loadOverviewTab() {
    try {
        const [users, employees, payments] = await Promise.all([
            API.getUsers().catch(() => []),
            API.getEmployees().catch(() => []),
            API.getPayments().catch(() => [])
        ]);

        const totalStaff = (users || []).length + (employees || []).length;
        const totalPayments = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const pendingPayments = (payments || []).filter(p => p.status === 'pending').length;
        const approvedToday = (payments || []).filter(p => {
            if (p.status !== 'paid' && p.status !== 'completed') return false;
            if (!p.verifiedAt) return false;
            return new Date(p.verifiedAt).toDateString() === new Date().toDateString();
        }).length;

        setText('statPendingApprovals', pendingPayments);
        setText('statApprovedToday', approvedToday);
        setText('statApprovedAmount', 'TSh ' + totalPayments.toLocaleString());
        setText('statTotalEmployees', totalStaff);
        setText('ceoSidebarEmpBadge', totalStaff);
    } catch (err) {
        console.error('loadOverviewTab error:', err);
    }
}

// ================================================================
// TAB: EMPLOYEES
// ================================================================
async function loadEmployeesTab() {
    const container = document.getElementById('ceoEmployeesContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading employees...</div>';

    try {
        const [users, employees] = await Promise.all([
            API.getUsers().catch(() => []),
            API.getEmployees().catch(() => [])
        ]);

        const activeUsers = (users || []).filter(u => u.status === 'Active');
        const activeEmp = (employees || []).filter(e => e.status === 'Active');
        const allActive = activeUsers.length + activeEmp.length;
        const total = (users || []).length + (employees || []).length;

        const totalPayroll = (employees || []).reduce((sum, e) =>
            sum + (Number(e.basicSalary) || 0) + (Number(e.allowances) || 0), 0);
        const avgSalary = (employees || []).length > 0 ? totalPayroll / (employees || []).length : 0;

        setText('ceoTotalEmployees', total);
        setText('ceoActiveEmployees', allActive);
        setText('ceoMonthlyPayroll', 'TSh ' + totalPayroll.toLocaleString());
        setText('ceoAvgSalary', 'TSh ' + Math.round(avgSalary).toLocaleString());
        setText('ceoEmpCountBadge', total + ' Total');
        setText('ceoSidebarEmpBadge', total);

        allCEOStaff = [
            ...(users || []).map(u => ({
                source: 'user', id: u.id, employeeId: u.employeeId || 'N/A',
                fullName: u.fullName, position: u.role, department: u.department || '—',
                email: u.email, basicSalary: 0, allowances: 0, paymentMode: '—',
                employmentType: 'System User', status: u.status, type: 'System User'
            })),
            ...(employees || []).map(e => ({
                source: 'employee', id: e.id, employeeId: e.employeeId,
                fullName: e.fullName, position: e.position, department: e.department,
                email: '—', basicSalary: Number(e.basicSalary) || 0,
                allowances: Number(e.allowances) || 0, paymentMode: e.paymentMode || '—',
                employmentType: e.employmentType || 'Employee', status: e.status,
                type: e.employmentType || 'Employee'
            }))
        ];

        renderCEOEmployees();

    } catch (err) {
        console.error('loadEmployeesTab error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

function renderCEOEmployees() {
    const container = document.getElementById('ceoEmployeesContainer');
    if (!container) return;

    const search = (document.getElementById('ceoEmpSearch')?.value || '').toLowerCase();
    const dept = document.getElementById('ceoEmpDeptFilter')?.value || '';
    const status = document.getElementById('ceoEmpStatusFilter')?.value || '';

    let filtered = allCEOStaff;
    if (search) {
        filtered = filtered.filter(s =>
            (s.fullName || '').toLowerCase().includes(search) ||
            (s.employeeId || '').toLowerCase().includes(search) ||
            (s.position || '').toLowerCase().includes(search)
        );
    }
    if (dept) filtered = filtered.filter(s => s.department === dept);
    if (status) filtered = filtered.filter(s => s.status === status);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:50px 20px;color:var(--gray-400);background:var(--gray-50);border-radius:12px;border:1.5px dashed var(--gray-300);">
                <span style="font-size:60px;display:block;margin-bottom:14px;">👥</span>
                <div style="font-size:16px;font-weight:700;color:var(--gray-600);">No Employees Found</div>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
            <div class="ceo-emp-header" style="display:grid;grid-template-columns:50px 1.5fr 1.3fr 1fr 1.2fr 1fr 100px 60px;gap:12px;padding:12px 18px;background:var(--gray-50);border-bottom:2px solid var(--gray-200);font-size:10px;font-weight:800;color:var(--gray-500);text-transform:uppercase;letter-spacing:1px;">
                <span>#</span><span>Employee</span><span>Position</span><span>Department</span>
                <span>Salary</span><span>Type</span>
                <span style="text-align:center;">Status</span>
                <span style="text-align:center;">Info</span>
            </div>
            ${filtered.map((emp, i) => `
                <div class="ceo-emp-row" style="display:grid;grid-template-columns:50px 1.5fr 1.3fr 1fr 1.2fr 1fr 100px 60px;gap:12px;padding:14px 18px;border-bottom:1px solid var(--gray-100);align-items:center;">
                    <span style="font-weight:800;color:#384b67;font-size:14px;">${String(i + 1).padStart(2, '0')}</span>
                    <div>
                        <div style="font-weight:700;color:var(--gray-800);font-size:13px;">${esc(emp.fullName)}</div>
                        <div style="font-family:'Courier New',monospace;font-size:11px;color:#384b67;font-weight:700;">${esc(emp.employeeId)}</div>
                    </div>
                    <span style="font-size:12px;color:var(--gray-700);font-weight:600;">${esc(emp.position)}</span>
                    <span style="font-size:11px;color:var(--gray-600);">${esc(emp.department)}</span>
                    <div>${emp.basicSalary > 0 ? `<div style="font-weight:800;color:#384b67;font-size:13px;">TSh ${emp.basicSalary.toLocaleString()}</div>` : `<div style="font-size:11px;color:var(--gray-400);">—</div>`}</div>
                    <span style="font-size:10px;color:var(--gray-600);font-weight:600;">${esc(emp.type)}</span>
                    <span style="font-size:9px;font-weight:800;padding:4px 8px;border-radius:12px;background:${emp.status === 'Active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${emp.status === 'Active' ? '#22c55e' : '#ef4444'};text-align:center;text-transform:uppercase;">${esc(emp.status)}</span>
                    <div style="display:flex;justify-content:center;">
                        <button onclick="viewEmployeeDetail('${emp.employeeId}')" style="width:34px;height:34px;background:linear-gradient(135deg,#384b67,#2a3850);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">👁</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function viewEmployeeDetail(employeeId) {
    const emp = allCEOStaff.find(e => e.employeeId === employeeId);
    if (!emp) { showToast('Employee not found', 'error'); return; }

    const body = document.getElementById('employeeDetailBody');
    body.innerHTML = `
        <div style="background:linear-gradient(135deg,rgba(56,75,103,0.06),rgba(56,75,103,0.02));border:1.5px solid rgba(56,75,103,0.2);border-radius:12px;padding:16px 20px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:16px;font-weight:800;color:#384b67;">${esc(emp.fullName)}</div>
                    <div style="font-family:'Courier New',monospace;font-size:12px;color:var(--gray-500);font-weight:700;">${esc(emp.employeeId)}</div>
                </div>
                <span style="font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;background:${emp.status === 'Active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${emp.status === 'Active' ? '#22c55e' : '#ef4444'};">${esc(emp.status)}</span>
            </div>
        </div>
        <div class="detail-row"><span class="label">Full Name</span><span class="value">${esc(emp.fullName)}</span></div>
        <div class="detail-row"><span class="label">Employee ID</span><span class="value" style="font-family:monospace;">${esc(emp.employeeId)}</span></div>
        <div class="detail-row"><span class="label">Position</span><span class="value">${esc(emp.position)}</span></div>
        <div class="detail-row"><span class="label">Department</span><span class="value">${esc(emp.department)}</span></div>
        <div class="detail-row"><span class="label">Employment Type</span><span class="value">${esc(emp.employmentType)}</span></div>
        <div class="detail-row"><span class="label">Email</span><span class="value">${esc(emp.email || '—')}</span></div>
        ${emp.basicSalary > 0 ? `
            <div class="detail-row"><span class="label">Basic Salary</span><span class="value" style="color:#384b67;font-weight:800;">TSh ${emp.basicSalary.toLocaleString()}</span></div>
            <div class="detail-row"><span class="label">Allowances</span><span class="value">TSh ${(emp.allowances || 0).toLocaleString()}</span></div>
            <div class="detail-row"><span class="label">Total Monthly</span><span class="value" style="color:#22c55e;font-weight:800;">TSh ${(emp.basicSalary + emp.allowances).toLocaleString()}</span></div>
        ` : ''}
    `;

    document.getElementById('employeeDetailModal').classList.add('show');
}

function refreshCEOEmployees() {
    loadEmployeesTab();
    showToast('🔄 Refreshed!', 'info');
}

// ================================================================
// TAB: PAYMENT APPROVALS
// ================================================================
async function loadPaymentsTab() {
    const container = document.getElementById('approvalsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading payments...</div>';

    try {
        let payments = [];
        if (typeof API.getCompanyPayments === 'function') {
            payments = await API.getCompanyPayments().catch(() => []);
        }

        allCompanyPayments = Array.isArray(payments) ? payments : [];
        allCompanyPayments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const pc = allCompanyPayments.filter(p => p.status === 'pending-ceo').length;
        const ap = allCompanyPayments.filter(p => p.status === 'approved').length;
        const pd = allCompanyPayments.filter(p => p.status === 'paid').length;
        const rj = allCompanyPayments.filter(p => p.status === 'rejected').length;

        setText('filterPendingBadge', pc);
        setText('filterApprovedBadge', ap);
        setText('filterRejectedBadge', rj);
        setText('filterCompletedBadge', pd);
        setText('pendingApprovalsCount', pc + ' Pending');
        setText('sidebarApprovalsBadge', pc);
        setText('statPendingApprovals', pc);

        renderCEOApprovals();
    } catch (err) {
        console.error('loadPaymentsTab error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#ef4444;">Error: ${esc(err.message)}</div>`;
    }
}

function renderCEOApprovals() {
    const container = document.getElementById('approvalsContainer');
    if (!container) return;

    let filtered = allCompanyPayments;
    if (currentApprovalFilter === 'pending-ceo') {
        filtered = filtered.filter(p => p.status === 'pending-ceo');
    } else if (currentApprovalFilter === 'approved') {
        filtered = filtered.filter(p => p.status === 'approved');
    } else if (currentApprovalFilter === 'rejected') {
        filtered = filtered.filter(p => p.status === 'rejected');
    } else if (currentApprovalFilter === 'completed') {
        filtered = filtered.filter(p => p.status === 'paid');
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <div class="empty-title">No ${currentApprovalFilter} payments</div>
                <div class="empty-desc">Payments matching this filter will appear here.</div>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="approval-table-wrap">
            <div class="approval-table-header">
                <span>#</span><span>Reference</span><span>Vendor</span>
                <span>Type</span><span>Amount</span><span>Status</span>
                <span style="text-align:center;">Actions</span>
            </div>
            ${filtered.map((item, i) => {
                const statusInfo = getCPStatusInfo(item.status);
                const typeInfo = getCPTypeInfo(item.type);
                return `
                    <div class="approval-row">
                        <span style="font-weight:800;color:#4f46e5;font-size:14px;">${String(i + 1).padStart(2, '0')}</span>
                        <div>
                            <div style="font-family:'Courier New',monospace;font-weight:700;color:#4f46e5;font-size:12px;">${esc(item.reference || '—')}</div>
                            <div style="font-size:10px;color:var(--gray-400);margin-top:2px;">📅 ${item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</div>
                        </div>
                        <div>
                            <div style="font-weight:600;color:var(--gray-800);font-size:13px;">${esc(item.vendor || '—')}</div>
                            <div style="font-size:11px;color:var(--gray-500);margin-top:1px;">${esc(item.createdBy || '—')}</div>
                        </div>
                        <span style="font-size:11px;color:var(--gray-600);">${typeInfo.icon} ${typeInfo.label}</span>
                        <span style="font-weight:800;color:#4f46e5;font-size:14px;">TSh ${Number(item.amount || 0).toLocaleString()}</span>
                        <span style="font-size:9px;font-weight:800;padding:5px 10px;border-radius:12px;background:${statusInfo.bg};color:${statusInfo.color};text-align:center;text-transform:uppercase;">${statusInfo.icon} ${statusInfo.label}</span>
                        <div class="approval-actions">
                            <button class="btn-view" onclick="viewCEOPaymentDetail('${item.id}')">👁 View</button>
                            ${item.status === 'pending-ceo' ? `
                                <button class="btn-approve" onclick="ceoApprovePayment('${item.id}')">✅ Approve</button>
                                <button class="btn-reject" onclick="ceoRejectPayment('${item.id}')">❌ Reject</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function filterApprovals(filter) {
    currentApprovalFilter = filter;
    document.querySelectorAll('#approvalFilters .approval-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderCEOApprovals();
}

async function ceoApprovePayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await modernConfirm({
        title: '✅ Approve Payment?',
        message: `Approve payment "${p.reference}" (TSh ${Number(p.amount).toLocaleString()})?`,
        detail: { label: 'Reference • Amount', value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}` },
        type: 'success',
        okText: '✅ Approve',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    try {
        await API.updateCompanyPayment(id, {
            status: 'approved',
            ceoApprovedAt: new Date().toISOString(),
            ceoApprovedBy: currentUser?.fullName || 'CEO'
        });

        // 🆕 Sasisha Procurement Request iwe tayari kulipwa
        if (p.procurementRequestId) {
            await API.updateProcurementStatus(p.procurementRequestId, { status: 'payment-approved' });
        }

        modernToast('✅ Approved', `Payment ${p.reference} approved. Finance notified.`, 'success');
        await loadPaymentsTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function ceoRejectPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await modernConfirm({
        title: '❌ Reject Payment?',
        message: `Provide a reason for rejecting payment "${p.reference}".`,
        detail: { label: 'Reference • Amount', value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}` },
        type: 'danger',
        okText: '❌ Reject Payment',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });

    if (!res.confirmed) return;

    try {
        await API.updateCompanyPayment(id, {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: 'CEO',
            rejectionReason: res.reason
        });
        modernToast('❌ Rejected', `Payment ${p.reference} rejected.`, 'warning');
        await loadPaymentsTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

function viewCEOPaymentDetail(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) { modernToast('Not Found', 'Payment not found', 'error'); return; }

    const typeInfo = getCPTypeInfo(p.type);
    const statusInfo = getCPStatusInfo(p.status);

    const body = document.getElementById('approvalDetailBody');
    body.innerHTML = `
        <div class="approval-detail-block">
            <h4>💰 Payment Information</h4>
            <div class="detail-row"><span class="label">Reference</span><span class="value" style="font-family:monospace;">${esc(p.reference)}</span></div>
            <div class="detail-row"><span class="label">Amount</span><span class="value amount">TSh ${Number(p.amount || 0).toLocaleString()}</span></div>
            <div class="detail-row"><span class="label">Type</span><span class="value">${typeInfo.icon} ${typeInfo.label}</span></div>
            <div class="detail-row"><span class="label">Status</span><span class="value">${statusInfo.icon} ${statusInfo.label}</span></div>
            <div class="detail-row"><span class="label">Method</span><span class="value">${esc(p.method || '—')}</span></div>
        </div>
        <div class="approval-detail-block" style="margin-top:12px;">
            <h4>👤 Vendor Information</h4>
            <div class="detail-row"><span class="label">Vendor</span><span class="value">${esc(p.vendor || '—')}</span></div>
            <div class="detail-row"><span class="label">Created By</span><span class="value">${esc(p.createdBy || '—')}</span></div>
            <div class="detail-row"><span class="label">Created At</span><span class="value">${p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</span></div>
        </div>
        ${p.description ? `<div class="approval-detail-block" style="margin-top:12px;"><h4>📝 Description</h4><div style="font-size:13px;color:var(--gray-700);line-height:1.6;">${esc(p.description)}</div></div>` : ''}
        ${p.managerVerifiedAt ? `<div class="approval-detail-block" style="margin-top:12px;"><h4>✅ Manager Verification</h4><div class="detail-row"><span class="label">Verified By</span><span class="value">${esc(p.managerVerifiedBy || '—')}</span></div><div class="detail-row"><span class="label">Verified At</span><span class="value">${new Date(p.managerVerifiedAt).toLocaleString()}</span></div></div>` : ''}
    `;

    const footer = document.getElementById('approvalDetailFooter');
    if (p.status === 'pending-ceo') {
        footer.innerHTML = `
            <button class="btn-cancel" onclick="closeModal('approvalDetailModal')">Close</button>
            <button class="btn-submit red" onclick="ceoRejectPayment('${p.id}'); closeModal('approvalDetailModal');">❌ Reject</button>
            <button class="btn-submit green" onclick="ceoApprovePayment('${p.id}'); closeModal('approvalDetailModal');">✅ Approve</button>
        `;
    } else {
        footer.innerHTML = `<button class="btn-cancel" onclick="closeModal('approvalDetailModal')">Close</button>`;
    }

    document.getElementById('approvalDetailModal').classList.add('show');
}

function getCPTypeInfo(type) {
    const map = {
        procurement: { icon: '🛒', label: 'Procurement' },
        salary:      { icon: '👥', label: 'Salary' },
        rent:        { icon: '🏢', label: 'Rent' },
        utilities:   { icon: '💡', label: 'Utilities' },
        transport:   { icon: '🚚', label: 'Transport' },
        marketing:   { icon: '📊', label: 'Marketing' },
        maintenance: { icon: '🔧', label: 'Maintenance' },
        other:       { icon: '📝', label: 'Other' }
    };
    return map[type] || map.other;
}

function getCPStatusInfo(status) {
    const map = {
        'draft':           { icon: '📝', label: 'Draft',           color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
        'pending-manager': { icon: '🟡', label: 'Pending Manager', color: '#d97706', bg: 'rgba(245,158,11,0.15)' },
        'pending-ceo':     { icon: '🟠', label: 'Pending CEO',     color: '#c2410c', bg: 'rgba(234,88,12,0.15)' },
        'approved':        { icon: '🟢', label: 'Approved',        color: '#0f766e', bg: 'rgba(20,184,166,0.15)' },
        'paid':            { icon: '✅', label: 'Paid',            color: '#16a34a', bg: 'rgba(34,197,94,0.15)' },
        'rejected':        { icon: '❌', label: 'Rejected',        color: '#dc2626', bg: 'rgba(239,68,68,0.15)' }
    };
    return map[status] || map['draft'];
}

// ================================================================
// TAB: PAYROLL APPROVALS
// ================================================================
async function loadPayrollsTab() {
    const container = document.getElementById('ceoPayrollsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading payrolls...</div>';

    try {
        const payrolls = await API.getPayrolls();
        allCEOPayrolls = Array.isArray(payrolls) ? payrolls : [];
        allCEOPayrolls.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const pending = allCEOPayrolls.filter(p => p.status === 'pending-ceo');
        setText('sidebarPayrollBadge', pending.length);
        setText('ceoPayrollCountBadge', pending.length + ' Pending');

        renderCEOPayrolls(pending);
    } catch (err) {
        console.error('loadPayrollsTab error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#dc2626;">Error: ${esc(err.message)}</div>`;
    }
}

function renderCEOPayrolls(pending) {
    const container = document.getElementById('ceoPayrollsContainer');
    if (!container) return;

    if (pending.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;">💸</span>
                <div style="font-size:17px;font-weight:800;">No Payrolls Pending</div>
                <div style="font-size:13px;">Payrolls verified by Manager will appear here.</div>
            </div>`;
        return;
    }

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    container.innerHTML = pending.map(p => `
        <div style="background:white;border-radius:12px;padding:16px 20px;margin-bottom:12px;border-left:4px solid #c2410c;border:1px solid var(--gray-200);">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <div style="font-family:monospace;font-weight:800;color:#384b67;font-size:14px;">${esc(p.payrollId)}</div>
                    <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:4px;">${monthNames[p.month - 1]} ${p.year}</div>
                    <div style="font-size:12px;color:#64748b;">👥 ${p.items?.length || 0} employees</div>
                    ${p.managerVerifiedBy ? `<div style="font-size:11px;color:#64748b;margin-top:4px;">✅ Verified by ${esc(p.managerVerifiedBy)}</div>` : ''}
                </div>
                <div style="text-align:right;">
                    <div style="font-size:20px;font-weight:900;color:#384b67;font-family:monospace;">TSh ${Number(p.totalAmount).toLocaleString()}</div>
                </div>
            </div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
                <button onclick="viewCEOPayroll('${p.id}')" style="padding:8px 16px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">👁 View</button>
                <button onclick="ceoApprovePayroll('${p.id}')" style="padding:8px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">✅ Approve</button>
                <button onclick="ceoRejectPayroll('${p.id}')" style="padding:8px 16px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">❌ Reject</button>
            </div>
        </div>
    `).join('');
}

async function ceoApprovePayroll(id) {
    const p = allCEOPayrolls.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await modernConfirm({
        title: '✅ Approve Payroll?',
        message: `Approve payroll "${p.payrollId}" (TSh ${Number(p.totalAmount).toLocaleString()})?`,
        detail: { label: 'Payroll • Amount', value: `${p.payrollId} • TSh ${Number(p.totalAmount).toLocaleString()}` },
        type: 'success',
        okText: '✅ Approve Payroll',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    try {
        await API.updatePayrollStatus(id, {
            status: 'approved',
            actionBy: currentUser?.fullName || 'CEO'
        });
        modernToast('✅ Approved', `Payroll ${p.payrollId} approved.`, 'success');
        await loadPayrollsTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function ceoRejectPayroll(id) {
    const p = allCEOPayrolls.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await modernConfirm({
        title: '❌ Reject Payroll?',
        message: `Provide a reason for rejecting payroll "${p.payrollId}".`,
        detail: { label: 'Payroll • Amount', value: `${p.payrollId} • TSh ${Number(p.totalAmount).toLocaleString()}` },
        type: 'danger',
        okText: '❌ Reject Payroll',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });

    if (!res.confirmed) return;

    try {
        await API.updatePayrollStatus(id, {
            status: 'rejected',
            actionBy: currentUser?.fullName || 'CEO',
            reason: res.reason
        });
        modernToast('❌ Rejected', `Payroll ${p.payrollId} rejected.`, 'warning');
        await loadPayrollsTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function viewCEOPayroll(id) {
    const p = allCEOPayrolls.find(x => String(x.id) === String(id));
    if (!p) return;

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const itemsHtml = (p.items || []).map((item, i) => `
        <div style="display:grid;grid-template-columns:40px 1.5fr 1fr 1fr 1fr;gap:8px;padding:10px 14px;border-bottom:1px solid var(--gray-100);font-size:12px;align-items:center;">
            <span style="font-weight:800;color:#384b67;">${String(i+1).padStart(2,'0')}</span>
            <div>
                <div style="font-weight:700;">${esc(item.employeeName)}</div>
                <div style="font-size:10px;color:#64748b;font-family:monospace;">${esc(item.employeeId)}</div>
            </div>
            <span>TSh ${Number(item.basicSalary).toLocaleString()}</span>
            <span style="color:#16a34a;">+TSh ${Number(item.allowances).toLocaleString()}</span>
            <span style="font-weight:800;color:#384b67;">TSh ${Number(item.netPay).toLocaleString()}</span>
        </div>
    `).join('');

    let modal = document.getElementById('ceoPayrollViewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="ceoPayrollViewModal">
                <div class="modal-box" style="max-width:720px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#0a1929,#0f2942);padding:18px 24px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">💸 Payroll Details</h3>
                        <button onclick="closeModal('ceoPayrollViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="ceoPayrollViewBody" style="padding:20px 24px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
                        <button onclick="closeModal('ceoPayrollViewModal')" class="btn-cancel">Close</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('ceoPayrollViewModal');
    }

    document.getElementById('ceoPayrollViewBody').innerHTML = `
        <div style="margin-bottom:16px;">
        <div style="font-family:monospace;font-weight:800;color:#1a7f5a;font-size:16px;">${esc(p.payrollId)}</div>
            <div style="font-size:15px;font-weight:700;color:#1e293b;margin-top:4px;">${monthNames[p.month - 1]} ${p.year}</div>
        </div>
        <div style="background:white;border-radius:10px;overflow:hidden;border:1px solid var(--gray-200);">
            <div style="display:grid;grid-template-columns:40px 1.5fr 1fr 1fr 1fr;gap:8px;padding:10px 14px;background:var(--gray-50);border-bottom:2px solid var(--gray-200);font-size:10px;font-weight:800;color:var(--gray-500);text-transform:uppercase;">
                <span>#</span><span>Employee</span><span>Basic</span><span>Allowances</span><span>Net Pay</span>
            </div>
            ${itemsHtml}
        </div>
        <div style="margin-top:14px;padding:12px;background:#f8fafc;border-radius:8px;border-left:4px solid #1a7f5a;display:flex;justify-content:space-between;">
            <span style="font-weight:700;">TOTAL:</span>
            <span style="font-weight:900;color:#384b67;font-size:18px;">TSh ${Number(p.totalAmount).toLocaleString()}</span>
        </div>
    `;

    modal.classList.add('show');
}

// ================================================================
// TAB: FUND TRANSFERS
// ================================================================
async function loadTransfersTab() {
    const container = document.getElementById('ceoFundTransfersContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading transfers...</div>';

    try {
        const transfers = await API.getFundTransfers();
        allCEOFundTransfers = Array.isArray(transfers) ? transfers : [];
        allCEOFundTransfers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const pending = allCEOFundTransfers.filter(t => t.status === 'pending-ceo');

        setText('sidebarFundTransferBadge', pending.length);
        setText('ceoFundTransferCountBadge', pending.length + ' Pending');

        renderCEOFundTransfers(pending);
    } catch (err) {
        console.error('loadTransfersTab error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#ef4444;">Error: ${esc(err.message)}</div>`;
    }
}

function renderCEOFundTransfers(transfers) {
    const container = document.getElementById('ceoFundTransfersContainer');
    if (!container) return;

    if (transfers.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;">🏦</span>
                <div style="font-size:17px;font-weight:800;">No Transfers Pending</div>
                <div style="font-size:13px;">Transfers verified by Manager will appear here.</div>
            </div>`;
        return;
    }

    container.innerHTML = transfers.map(t => {
        const createdDate = t.createdAt ? new Date(t.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        return `
            <div style="background:white;border:1.5px solid var(--gray-200);border-radius:12px;padding:18px 20px;margin-bottom:12px;border-left:4px solid #c2410c;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                            <span style="font-family:'Courier New',monospace;font-weight:800;color:#384b67;font-size:14px;">${esc(t.transferId)}</span>
                            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(234,88,12,0.15);color:#c2410c;">🟠 Pending CEO</span>
                        </div>
                        ${t.reason ? `<div style="font-size:13px;color:var(--gray-600);line-height:1.5;margin-bottom:8px;">${esc(t.reason)}</div>` : ''}
                        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--gray-500);margin-bottom:12px;">
                            <span>📅 Created: <strong style="color:var(--gray-700);">${createdDate}</strong></span>
                            <span>👤 By: <strong style="color:var(--gray-700);">${esc(t.createdBy || '—')}</strong></span>
                        </div>
                        ${t.managerVerifiedBy ? `<div style="font-size:11px;color:#d97706;font-weight:700;">✅ Verified by ${esc(t.managerVerifiedBy)}</div>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:22px;font-weight:900;color:#384b67;font-family:'Courier New',monospace;">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0;padding:12px 16px;background:var(--gray-50);border-radius:10px;border:1px solid var(--gray-100);">
                    <div style="flex:1;min-width:180px;">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📤 From</div>
                        <div style="font-size:13px;font-weight:800;color:#1e293b;">${esc(t.fromAccount?.name || '—')}</div>
                        <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px;">${esc(t.fromAccount?.accountNumber || '')}</div>
                    </div>
                    <div style="font-size:20px;color:#384b67;font-weight:900;">→</div>
                    <div style="flex:1;min-width:180px;">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📥 To</div>
                        <div style="font-size:13px;font-weight:800;color:#1e293b;">${esc(t.toAccount?.name || '—')}</div>
                        <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px;">${esc(t.toAccount?.accountNumber || '')}</div>
                    </div>
                </div>

                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
                    <button onclick="viewCEOFundTransfer('${t.id}')" style="padding:8px 14px;background:rgba(56,75,103,0.1);color:#384b67;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">👁 View</button>
                    <button onclick="ceoApproveFundTransfer('${t.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">✅ Approve Transfer</button>
                    <button onclick="ceoRejectFundTransfer('${t.id}')" style="padding:8px 14px;background:rgba(239,68,68,0.1);color:#dc2626;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">❌ Reject</button>
                </div>
            </div>
        `;
    }).join('');
}

async function ceoApproveFundTransfer(id) {
    const t = allCEOFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const res = await modernConfirm({
        title: '✅ Approve Transfer?',
        message: `Approve transfer ${t.transferId} (${t.currency} ${Number(t.amount).toLocaleString()})?`,
        detail: { label: 'From → To', value: `${t.fromAccount?.name} → ${t.toAccount?.name}` },
        type: 'success',
        okText: '✅ Approve Transfer',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    try {
        await API.approveFundTransfer(id);
        modernToast('✅ Approved', `Transfer ${t.transferId} approved.`, 'success');
        await loadTransfersTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function ceoRejectFundTransfer(id) {
    const t = allCEOFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const res = await modernConfirm({
        title: '❌ Reject Transfer?',
        message: `Provide a reason for rejecting transfer ${t.transferId}.`,
        detail: { label: 'From → To', value: `${t.fromAccount?.name} → ${t.toAccount?.name}` },
        type: 'danger',
        okText: '❌ Reject Transfer',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });

    if (!res.confirmed) return;

    try {
        await API.rejectFundTransfer(id, res.reason);
        modernToast('❌ Rejected', `Transfer ${t.transferId} rejected.`, 'warning');
        await loadTransfersTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function viewCEOFundTransfer(id) {
    const t = allCEOFundTransfers.find(x => String(x.id) === String(id));
    if (!t) { modernToast('Not Found', 'Transfer not found', 'error'); return; }

    const sInfo = {
        'draft':           { icon: '📝', label: 'Draft',           color: '#64748b' },
        'pending-manager': { icon: '🟡', label: 'Pending Manager', color: '#d97706' },
        'pending-ceo':     { icon: '🟠', label: 'Pending CEO',     color: '#c2410c' },
        'approved':        { icon: '🟢', label: 'Approved',        color: '#14b8a6' },
        'completed':       { icon: '✅', label: 'Completed',       color: '#16a34a' },
        'rejected':        { icon: '❌', label: 'Rejected',        color: '#dc2626' }
    }[t.status] || { icon: '📝', label: 'Unknown', color: '#64748b' };

    let modal = document.getElementById('ceoFTViewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="ceoFTViewModal">
                <div class="modal-box" style="max-width:600px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                <div style="background:linear-gradient(135deg,#0a1929,#0f2942);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">🏦 Transfer Details</h3>
                        <button onclick="closeModal('ceoFTViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="ceoFTViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                        <button onclick="closeModal('ceoFTViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('ceoFTViewModal');
    }

    document.getElementById('ceoFTViewBody').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${sInfo.color}20;border-radius:10px;border-left:4px solid ${sInfo.color};">
            <div style="font-size:12px;font-weight:700;color:${sInfo.color};text-transform:uppercase;">Status</div>
            <div style="font-size:14px;font-weight:800;color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
        </div>
        <div class="detail-row"><span class="label">Transfer ID</span><span class="value" style="font-family:monospace;">${esc(t.transferId)}</span></div>
        <div class="detail-row"><span class="label">From Account</span><span class="value">${esc(t.fromAccount?.name || '—')}</span></div>
        <div class="detail-row"><span class="label">To Account</span><span class="value">${esc(t.toAccount?.name || '—')}</span></div>
        <div class="detail-row"><span class="label">Amount</span><span class="value" style="color:#1a7f5a;font-weight:900;font-size:16px;">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</span></div>
        <div class="detail-row"><span class="label">Created By</span><span class="value">${esc(t.createdBy || '—')}</span></div>
        <div class="detail-row"><span class="label">Created At</span><span class="value">${t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</span></div>
        ${t.reason ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid #1a7f5a;font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#384b67;font-size:11px;text-transform:uppercase;">Reason</strong>${esc(t.reason)}</div>` : ''}
    `;

    modal.classList.add('show');
}

// ================================================================
// TAB: COMPANY ACCOUNTS
// ================================================================
async function loadAccountsTab() {
    const container = document.getElementById('ceoAccountsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading accounts...</div>';

    try {
        const accounts = await API.getAccounts().catch(() => []);
        const safeAccounts = Array.isArray(accounts) ? accounts : [];

        const relevant = safeAccounts.filter(a =>
            a.status === 'pending-ceo' ||
            a.status === 'approved' ||
            a.status === 'rejected'
        );

        relevant.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const pendingCeo = safeAccounts.filter(a => a.status === 'pending-ceo').length;
        setText('ceoSidebarAccountsBadge', pendingCeo);
        setText('ceoAccountsCountBadge', pendingCeo + ' Pending');

        if (relevant.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;color:var(--gray-400);">
                    <span style="font-size:50px;display:block;margin-bottom:12px;">🏦</span>
                    <div style="font-size:16px;font-weight:700;">No Accounts Awaiting Approval</div>
                    <div style="font-size:13px;">Accounts verified by Manager will appear here.</div>
                </div>
            `;
            return;
        }

        const statusLabels = {
            'pending-ceo': { label: 'Pending CEO',  color: '#c2410c', bg: 'rgba(234,88,12,0.15)', icon: '🟠' },
            'approved':    { label: 'Approved',     color: '#16a34a', bg: 'rgba(34,197,94,0.15)', icon: '✅' },
            'rejected':    { label: 'Rejected',     color: '#dc2626', bg: 'rgba(239,68,68,0.15)', icon: '❌' }
        };

        const isCeo = (currentUser?.role || '').toLowerCase().includes('ceo');

        container.innerHTML = relevant.map(acc => {
            const sInfo = statusLabels[acc.status] || statusLabels['pending-ceo'];
            const typeIcon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';
            const createdDate = acc.createdAt ? new Date(acc.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

            let actions = `<button onclick="viewCEOAccountDetails('${acc.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">👁 View</button>`;

            if (acc.status === 'pending-ceo' && isCeo) {
                actions += `<button onclick="ceoApproveAccount('${acc.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">✅ Approve</button>`;
                actions += `<button onclick="ceoRejectAccount('${acc.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">❌ Reject</button>`;
            }

            return `
                <div style="border:1.5px solid var(--gray-200);border-left:4px solid ${sInfo.color};border-radius:12px;padding:16px 20px;margin-bottom:12px;background:white;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                        <span style="font-weight:700;color:var(--primary);font-size:15px;">${typeIcon} ${esc(acc.name)}</span>
                        <span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;background:${sInfo.bg};color:${sInfo.color};text-transform:uppercase;">${sInfo.icon} ${sInfo.label}</span>
                    </div>
                    <div style="font-size:12px;color:var(--gray-600);font-family:monospace;">${esc(acc.accountNumber)}</div>
                    <div style="font-size:11px;color:var(--gray-500);margin-top:6px;">📅 Created: ${createdDate}</div>
                    <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">${actions}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('loadAccountsTab error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

async function ceoApproveAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { showToast('⚠ Account not found', 'error'); return; }

        const res = await modernConfirm({
            title: '✅ Approve Account?',
            message: `Approve "${acc.name}"? It will be LOCKED for payments.`,
            detail: { label: 'Account', value: `${acc.name} • ${acc.accountNumber}` },
            type: 'success',
            okText: '✅ Approve & Lock',
            cancelText: 'Cancel'
        });
        if (!res.confirmed) return;

        await API.approveAccount(id, {
            ceoApprovedBy: currentUser?.fullName || 'CEO'
        });

        modernToast('✅ Approved', `Account "${acc.name}" is now active and locked.`, 'success');
        await loadAccountsTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function ceoRejectAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { showToast('⚠ Account not found', 'error'); return; }

        const res = await modernConfirm({
            title: '❌ Reject Account?',
            message: `Provide a reason for rejecting "${acc.name}".`,
            detail: { label: 'Account', value: `${acc.name} • ${acc.accountNumber}` },
            type: 'danger',
            okText: '❌ Reject Account',
            cancelText: 'Cancel',
            needsReason: true,
            reasonLabel: 'Rejection Reason'
        });
        if (!res.confirmed) return;

        await API.rejectAccount(id, res.reason);

        modernToast('❌ Rejected', `Account "${acc.name}" rejected.`, 'warning');
        await loadAccountsTab();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function viewCEOAccountDetails(accountId) {
    const accounts = await API.getAccounts().catch(() => []);
    const acc = accounts.find(a => String(a.id) === String(accountId));
    if (!acc) { showToast('⚠ Account not found', 'error'); return; }

    const typeIcon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';

    let modal = document.getElementById('ceoAccountViewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="ceoAccountViewModal">
                <div class="modal-box" style="max-width:560px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#384b67 0%,#2a3850 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">🏦 Account Details</h3>
                        <button onclick="closeModal('ceoAccountViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="ceoAccountViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                        <button onclick="closeModal('ceoAccountViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('ceoAccountViewModal');
    }

    document.getElementById('ceoAccountViewBody').innerHTML = `
        <div class="detail-row"><span class="label">Account Name</span><span class="value">${esc(acc.name)}</span></div>
        <div class="detail-row"><span class="label">Account Number</span><span class="value" style="font-family:monospace;">${esc(acc.accountNumber)}</span></div>
        <div class="detail-row"><span class="label">Type</span><span class="value">${typeIcon} ${esc(acc.type)}</span></div>
        ${acc.bankName ? `<div class="detail-row"><span class="label">Bank</span><span class="value">${esc(acc.bankName)}</span></div>` : ''}
        ${acc.branch ? `<div class="detail-row"><span class="label">Branch</span><span class="value">${esc(acc.branch)}</span></div>` : ''}
        <div class="detail-row"><span class="label">Currency</span><span class="value">${esc(acc.currency || 'TZS')}</span></div>
        <div class="detail-row"><span class="label">Balance</span><span class="value" style="color:#1a7f5a;font-weight:800;">${acc.currency || 'TZS'} ${Number(acc.balance || 0).toLocaleString()}</span></div>
        <div class="detail-row"><span class="label">Created By</span><span class="value">${esc(acc.createdBy || acc.requester?.fullName || '—')}</span></div>
        ${acc.notes ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid #384b67;font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#384b67;font-size:11px;text-transform:uppercase;">Notes</strong>${esc(acc.notes)}</div>` : ''}
    `;

    modal.classList.add('show');
}

// ================================================================
// MODERN CONFIRM MODAL
// ================================================================
let modernConfirmCallback = null;
let modernConfirmNeedsReason = false;

function modernConfirm(opts = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Confirm?', message = 'Are you sure?', detail = null,
            type = 'primary', okText = 'Confirm', cancelText = 'Cancel',
            needsReason = false, reasonLabel = 'Reason'
        } = opts;

        document.getElementById('modernConfirmTitle').textContent = title;
        document.getElementById('modernConfirmMsg').textContent = message;

        const iconEl = document.getElementById('modernConfirmIcon');
        const emojiEl = document.getElementById('modernConfirmIconEmoji');
        const banners = { primary: '📋', danger: '⚠️', success: '✅', warning: '⏳', info: 'ℹ️' };
        const iconTypes = { primary: 'primary', danger: 'danger', success: 'success', warning: 'warning', info: 'info' };
        iconEl.className = 'modern-confirm-icon ' + (iconTypes[type] || 'primary');
        emojiEl.textContent = banners[type] || '📋';

        const bannerEl = document.getElementById('modernConfirmBanner');
        bannerEl.className = 'modern-confirm-banner ' + (type === 'primary' ? '' : type);

        const detailEl = document.getElementById('modernConfirmDetail');
        if (detail) {
            detailEl.innerHTML = `<div class="modern-confirm-detail"><span class="cd-label">${detail.label || 'Details'}</span><span class="cd-value">${detail.value || ''}</span></div>`;
        } else { detailEl.innerHTML = ''; }

        const formEl = document.getElementById('modernConfirmForm');
        if (needsReason) {
            formEl.innerHTML = `<div class="modern-confirm-form"><label>${reasonLabel} <span style="color:#dc2626;">*</span></label><textarea id="modernConfirmReasonInput" placeholder="Explain why..."></textarea></div>`;
            modernConfirmNeedsReason = true;
        } else {
            formEl.innerHTML = '';
            modernConfirmNeedsReason = false;
        }

        const okBtn = document.getElementById('modernConfirmOkBtn');
        const cancelBtn = document.getElementById('modernConfirmCancelBtn');
        okBtn.textContent = okText;
        cancelBtn.textContent = cancelText;
        const btnClass = { primary: 'btn-confirm-primary', danger: 'btn-confirm-danger', success: 'btn-confirm-success', warning: 'btn-confirm-primary', info: 'btn-confirm-primary' };
        okBtn.className = btnClass[type] || 'btn-confirm-primary';

        modernConfirmCallback = resolve;
        document.getElementById('modernConfirmOverlay').classList.add('show');
        setTimeout(() => {
            const r = document.getElementById('modernConfirmReasonInput');
            if (r) r.focus();
        }, 300);
    });
}

function modernConfirmOk() {
    let reason = null;
    if (modernConfirmNeedsReason) {
        const input = document.getElementById('modernConfirmReasonInput');
        reason = (input?.value || '').trim();
        if (!reason) {
            input.style.borderColor = '#dc2626';
            input.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.15)';
            input.focus();
            return;
        }
    }
    document.getElementById('modernConfirmOverlay').classList.remove('show');
    const cb = modernConfirmCallback;
    modernConfirmCallback = null;
    modernConfirmNeedsReason = false;
    if (cb) cb({ confirmed: true, reason });
}

function modernConfirmCancel() {
    document.getElementById('modernConfirmOverlay').classList.remove('show');
    const cb = modernConfirmCallback;
    modernConfirmCallback = null;
    modernConfirmNeedsReason = false;
    if (cb) cb({ confirmed: false, reason: null });
}

document.addEventListener('click', function(e) {
    if (e.target.id === 'modernConfirmOverlay') modernConfirmCancel();
});

function modernToast(title, message, type = 'success', duration = 4000) {
    const container = document.getElementById('modernToastContainer');
    if (!container) return;
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `modern-toast ${type}`;
    el.innerHTML = `
        <div class="modern-toast-icon">${icons[type] || '✅'}</div>
        <div class="modern-toast-content">
            <div class="modern-toast-title">${title}</div>
            <div class="modern-toast-msg">${message}</div>
        </div>
        <button class="modern-toast-close" onclick="this.closest('.modern-toast').remove()">✕</button>
        <div class="modern-toast-progress"></div>
    `;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, duration);
}
// ================================================================
// 🆕 OPEN CHANGE PASSWORD MODAL
// ================================================================
function openChangePasswordModal() {
    document.getElementById('cpCurrentPassword').value = '';
    document.getElementById('cpNewPassword').value = '';
    document.getElementById('cpConfirmPassword').value = '';
    document.getElementById('cpStatusMsg').className = 'status-msg';
    document.getElementById('cpStatusMsg').textContent = '';
    document.getElementById('changePasswordModal').classList.add('show');
}

// ================================================================
// 🆕 SUBMIT CHANGE PASSWORD
// ================================================================
async function submitChangePassword() {
    const currentPassword = document.getElementById('cpCurrentPassword').value;
    const newPassword = document.getElementById('cpNewPassword').value;
    const confirmPassword = document.getElementById('cpConfirmPassword').value;
    const statusDiv = document.getElementById('cpStatusMsg');
    const saveBtn = document.getElementById('cpSaveBtn');
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please fill in all password fields';
        return;
    }
    
    if (newPassword.length < 6) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ New password must be at least 6 characters';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ New passwords do not match';
        return;
    }
    
    // Disable button
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Updating...';
    statusDiv.className = 'status-msg';
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to change password');
        }
        
        // 🆕 Onyesha Toast nzuri (Success)
        showToast('✅ Password changed successfully!', 'success');
        
        // Funga Modal
        closeModal('changePasswordModal');
        
        // Log out baada ya sekunde 2
        setTimeout(() => {
            Auth.logout();
        }, 2000);
        
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
    }

}
// ================================================================
// CEO: PROCUREMENT APPROVALS (With History)
// ================================================================
let ceoAllProcurementRequests = [];
let currentCeoProcFilter = 'pending-ceo';

async function loadCEOProcurementApprovals() {
    const container = document.getElementById('procurementApprovalsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading requests...</div>';

    try {
        const all = await API.getProcurementRequests('/all');
        const list = Array.isArray(all) ? all : [];

        // CEO anaona: zilizofika kwake (pending-ceo au zaidi) + zilizokataliwa na yeye
        ceoAllProcurementRequests = list.filter(r =>
            r.status === 'pending-ceo' ||
            r.status === 'pending-purchaser-details' ||
            r.status === 'pending-finance' ||
            r.status === 'pending-payment-approval' ||
            r.status === 'payment-approved' ||
            r.status === 'paid' ||
            r.status === 'completed' ||
            (r.status === 'returned' && r.rejection_stage === 'ceo') ||
            (r.status === 'rejected' && r.rejection_stage === 'ceo')
        );

        const pending = ceoAllProcurementRequests.filter(r => r.status === 'pending-ceo');
        const approved = ceoAllProcurementRequests.filter(r =>
            ['pending-purchaser-details','pending-finance','pending-payment-approval','payment-approved','paid','completed'].includes(r.status)
        );
        const rejected = ceoAllProcurementRequests.filter(r =>
            (r.status === 'returned' || r.status === 'rejected') && r.rejection_stage === 'ceo'
        );

        const sidebarBadge = document.getElementById('sidebarProcurementBadge');
        if (sidebarBadge) sidebarBadge.textContent = pending.length;

        const countBadge = document.getElementById('ceoProcurementCountBadge');
        if (countBadge) countBadge.textContent = pending.length + ' Pending';

        const elPending = document.getElementById('ceoProcPendingCount');
        const elApproved = document.getElementById('ceoProcApprovedCount');
        const elRejected = document.getElementById('ceoProcRejectedCount');
        if (elPending) elPending.textContent = pending.length;
        if (elApproved) elApproved.textContent = approved.length;
        if (elRejected) elRejected.textContent = rejected.length;

        renderCEOProcurementList();
    } catch (err) {
        console.error('loadCEOProcurementApprovals error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#dc2626;">❌ ${esc(err.message)}</div>`;
    }
}

function filterCEOProcurement(filter) {
    currentCeoProcFilter = filter;
    document.querySelectorAll('#ceoProcurementFilters .approval-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderCEOProcurementList();
}

function renderCEOProcurementList() {
    const container = document.getElementById('procurementApprovalsContainer');
    if (!container) return;

    let filtered = ceoAllProcurementRequests;

    if (currentCeoProcFilter === 'pending-ceo') {
        filtered = filtered.filter(r => r.status === 'pending-ceo');
    } else if (currentCeoProcFilter === 'approved') {
        filtered = filtered.filter(r =>
            ['pending-purchaser-details','pending-finance','pending-payment-approval','payment-approved','paid','completed'].includes(r.status)
        );
    } else if (currentCeoProcFilter === 'rejected') {
        filtered = filtered.filter(r =>
            (r.status === 'returned' || r.status === 'rejected') && r.rejection_stage === 'ceo'
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;opacity:0.5;">📭</span>
                <div style="font-size:17px;font-weight:800;color:var(--gray-600);margin-bottom:6px;">
                    ${currentCeoProcFilter === 'pending-ceo' ? 'No Pending Requests' : currentCeoProcFilter === 'approved' ? 'No Approved Requests Yet' : currentCeoProcFilter === 'rejected' ? 'No Rejected Requests' : 'No Requests'}
                </div>
                <div style="font-size:13px;">Requests matching this filter will appear here.</div>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(r => {
        const isPending = r.status === 'pending-ceo';
        const isRejected = (r.status === 'returned' || r.status === 'rejected') && r.rejection_stage === 'ceo';
        const isApproved = !isPending && !isRejected;

        const urgencyInfo = r.urgency === 'urgent'
            ? { icon: '🔴', label: 'Urgent', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' }
            : r.urgency === 'high'
            ? { icon: '🟡', label: 'High', color: '#d97706', bg: 'rgba(245,158,11,0.12)' }
            : { icon: '🟢', label: 'Normal', color: '#16a34a', bg: 'rgba(34,197,94,0.12)' };

        const createdDate = r.created_at
            ? new Date(r.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';

        let statusBadge = '';
        if (isPending) {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(139,92,246,0.15);color:#6d28d9;">⏳ Awaiting Your Approval</span>`;
        } else if (isApproved) {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(34,197,94,0.15);color:#16a34a;">✅ Approved by You</span>`;
        } else if (isRejected) {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(239,68,68,0.15);color:#dc2626;">❌ Rejected by You</span>`;
        }

        const borderColor = isPending ? '#8b5cf6' : isApproved ? '#22c55e' : '#dc2626';

        let actions = `<button onclick="viewCEORequest(${r.id})"
                                style="padding:9px 18px;background:rgba(139,92,246,0.1);color:#6d28d9;border:1.5px solid rgba(139,92,246,0.2);border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;"
                                onmouseover="this.style.background='rgba(139,92,246,0.2)'"
                                onmouseout="this.style.background='rgba(139,92,246,0.1)'">
                            👁️ View Details
                        </button>`;

        if (isPending) {
            actions += `<button onclick="ceoApproveRequest(${r.id})"
                                style="padding:9px 18px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(139,92,246,0.3);transition:all 0.2s;"
                                onmouseover="this.style.transform='translateY(-2px)'"
                                onmouseout="this.style.transform='translateY(0)'">
                            ✅ Final Approve
                        </button>
                        <button onclick="ceoRejectRequest(${r.id})"
                                style="padding:9px 18px;background:rgba(239,68,68,0.1);color:#dc2626;border:1.5px solid rgba(239,68,68,0.2);border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;"
                                onmouseover="this.style.background='rgba(239,68,68,0.2)'"
                                onmouseout="this.style.background='rgba(239,68,68,0.1)'">
                            ❌ Reject
                        </button>`;
        }

        return `
            <div style="background:white;border:1.5px solid var(--gray-200);border-radius:14px;padding:20px 22px;margin-bottom:14px;transition:all 0.25s;border-left:4px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.04);${isApproved ? 'opacity:0.92;' : ''}"
                 onmouseover="this.style.boxShadow='0 8px 24px rgba(139,92,246,0.15)'"
                 onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'">

                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:14px;">
                    <div style="flex:1;min-width:240px;">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                            <span style="font-family:'Courier New',monospace;font-weight:900;color:#0f1f3d;font-size:15px;letter-spacing:-0.3px;">${esc(r.request_number)}</span>
                            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:${urgencyInfo.bg};color:${urgencyInfo.color};">
                                ${urgencyInfo.icon} ${urgencyInfo.label}
                            </span>
                            ${statusBadge}
                        </div>
                        <div style="font-size:15px;font-weight:700;color:#1e293b;margin-bottom:6px;">${esc(r.title || 'Untitled Request')}</div>
                        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--gray-500);">
                            <span>🏢 <strong style="color:var(--gray-700);">${esc(r.department || '—')}</strong></span>
                            <span>👤 <strong style="color:var(--gray-700);">${esc(r.requested_by || '—')}</strong></span>
                            <span>📅 <strong style="color:var(--gray-700);">${createdDate}</strong></span>
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:24px;font-weight:900;color:#0f1f3d;font-family:'Courier New',monospace;letter-spacing:-0.5px;">
                            TSh ${Number(r.total_amount || 0).toLocaleString()}
                        </div>
                        <div style="font-size:10px;color:var(--gray-400);text-transform:uppercase;font-weight:800;margin-top:2px;letter-spacing:0.8px;">
                            ${r.item_count || 0} items
                        </div>
                    </div>
                </div>

                ${isRejected && r.rejection_reason ? `
                    <div style="background:rgba(239,68,68,0.06);border-left:3px solid #dc2626;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
                        <div style="font-size:10px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">Rejection Reason</div>
                        <div style="font-size:12.5px;color:#7f1d1d;line-height:1.5;">${esc(r.rejection_reason)}</div>
                    </div>
                ` : ''}

                <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:12px;border-top:1px solid var(--gray-100);">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}
// ================================================================
// CEO: VIEW REQUEST DETAILS (Dynamic footer by status)
// ================================================================
async function viewCEORequest(id) {
    try {
        const request = await API.getProcurementRequestById(id);

        const isPending = request.status === 'pending-ceo';
        const isRejected = (request.status === 'returned' || request.status === 'rejected') && request.rejection_stage === 'ceo';
        const isApproved = !isPending && !isRejected;

       const headerGradient = isPending
            ? 'linear-gradient(135deg,#1a7f5a,#0f2942)'
            : isApproved
            ? 'linear-gradient(135deg,#14532d,#2ecc71)'
            : 'linear-gradient(135deg,#7f1d1d,#dc2626)';
        const headerTitle = isPending
            ? '📋 Procurement Request — Final Approval'
            : isApproved
            ? '✅ Procurement Request — Approved by You'
            : '❌ Procurement Request — Rejected by You';

        const itemsHtml = (request.items || []).map(item => `
            <div style="background:white;padding:12px 16px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--gray-200);">
                <div>
                    <div style="font-weight:700;color:#1e293b;">${esc(item.item_name)}</div>
                    <div style="font-size:11px;color:var(--gray-500);margin-top:2px;">
                        ${item.specification ? esc(item.specification) + ' • ' : ''}
                        ${item.quantity} ${item.unit} × TSh ${Number(item.estimated_price || 0).toLocaleString()}
                    </div>
                </div>
                <div style="font-weight:800;color:#0f1f3d;font-family:'Courier New',monospace;">
                    TSh ${Number((item.estimated_price || 0) * item.quantity).toLocaleString()}
                </div>
            </div>
        `).join('');

        let modal = document.getElementById('ceoProcurementViewModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="ceoProcurementViewModal">
                    <div class="modal-box" style="max-width:720px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                        <div id="ceoProcViewHeader" style="padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                            <div>
                                <h3 id="ceoProcViewTitle" style="font-size:18px;font-weight:800;color:white;margin:0;"></h3>
                                <p id="ceoProcViewSubtitle" style="font-size:12px;color:rgba(255,255,255,0.85);margin:4px 0 0;"></p>
                            </div>
                            <button onclick="closeModal('ceoProcurementViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                        <div id="ceoProcViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;background:#f8fafc;"></div>
                        <div id="ceoProcViewFooter" style="padding:14px 26px;background:white;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;"></div>
                    </div>
                </div>
            `);
            modal = document.getElementById('ceoProcurementViewModal');
        }

        const headerEl = document.getElementById('ceoProcViewHeader');
        if (headerEl) headerEl.style.background = headerGradient;

        document.getElementById('ceoProcViewTitle').textContent = headerTitle;
        document.getElementById('ceoProcViewSubtitle').textContent =
            `${request.request_number} • ${request.department} • ${request.requested_by}`;

        document.getElementById('ceoProcViewBody').innerHTML = `
            <div style="background:white;padding:18px;border-radius:12px;margin-bottom:16px;border:1px solid var(--gray-200);">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Department</div>
                        <div style="font-weight:700;color:#1e293b;">${esc(request.department || '—')}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Urgency</div>
                        <div style="font-weight:700;color:#1e293b;">${request.urgency === 'urgent' ? '🔴 Urgent' : request.urgency === 'high' ? '🟡 High' : '🟢 Normal'}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Requested By</div>
                        <div style="font-weight:700;color:#1e293b;">${esc(request.requested_by || '—')}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Verified By Manager</div>
                        <div style="font-weight:700;color:#16a34a;">${request.manager_approved_at ? '✅ ' + new Date(request.manager_approved_at).toLocaleString('en-GB') : '—'}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Current Status</div>
                        <div style="font-weight:700;color:${isPending ? '#6d28d9' : isApproved ? '#16a34a' : '#dc2626'};">
                            ${isPending ? '⏳ Awaiting Your Approval' : isApproved ? '✅ Approved by You' : '❌ Rejected by You'}
                        </div>
                    </div>
                </div>
                ${request.notes ? `
                    <div style="margin-top:14px;">
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Justification</div>
                        <div style="font-size:13px;color:var(--gray-700);line-height:1.6;">${esc(request.notes)}</div>
                    </div>
                ` : ''}
            </div>

            ${isRejected && request.rejection_reason ? `
                <div style="background:rgba(239,68,68,0.06);border-left:4px solid #dc2626;border-radius:10px;padding:14px 18px;margin-bottom:16px;">
                    <div style="font-size:10px;font-weight:800;color:#dc2626;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">❌ Rejection Reason</div>
                    <div style="font-size:13px;color:#7f1d1d;line-height:1.6;">${esc(request.rejection_reason)}</div>
                </div>
            ` : ''}

            <div style="font-size:11px;font-weight:800;color:var(--gray-500);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">🛒 Items (${(request.items || []).length})</div>
            ${itemsHtml}

            <div style="background:linear-gradient(135deg,#1a7f5a,#0f2942);color:white;padding:18px 22px;border-radius:12px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:800;text-transform:uppercase;letter-spacing:1.2px;font-size:12px;">Total Amount</span>
                <span style="font-size:24px;font-weight:900;color:#fbbf24;font-family:'Courier New',monospace;">TSh ${Number(request.total_amount || 0).toLocaleString()}</span>
            </div>

            ${isPending ? `
                <div style="background:rgba(26,127,90,0.08);border:1.5px solid rgba(26,127,90,0.25);border-left:4px solid #1a7f5a;border-radius:10px;padding:12px 16px;margin-top:16px;font-size:12px;color:#0f2942;">
                    <strong>ℹ️ Note:</strong> Upon final approval, an <strong>Imprest PDF</strong> will be automatically generated and the request will return to <strong>Procurement</strong> to fill in supplier details.
                </div>
            ` : ''}
        `;

        // 🆕 Dynamic footer
        const footer = document.getElementById('ceoProcViewFooter');
        if (isPending) {
            footer.innerHTML = `
                <button onclick="closeModal('ceoProcurementViewModal')" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                <button onclick="closeModal('ceoProcurementViewModal'); ceoRejectRequest(${request.id})" style="padding:11px 24px;background:rgba(239,68,68,0.1);color:#dc2626;border:1.5px solid rgba(239,68,68,0.2);border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">❌ Reject</button>
                <button onclick="closeModal('ceoProcurementViewModal'); ceoApproveRequest(${request.id})" style="padding:11px 24px;background:linear-gradient(135deg,#1a7f5a,#0f2942);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;box-shadow:0 4px 12px rgba(26,127,90,0.3);">✅ Final Approve</button>
            `;
        } else {
            footer.innerHTML = `
                <button onclick="closeModal('ceoProcurementViewModal')" style="padding:11px 28px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
            `;
        }

        modal.classList.add('show');
    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}
async function ceoApproveRequest(id) {
    const res = await modernConfirm({
        title: '✅ Final Approval?',
        message: 'This will generate the Imprest PDF and return the request to Procurement for purchaser details.',
        type: 'success',
        okText: '✅ Final Approve',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        await API.ceoApproveRequest(id);
        modernToast('✅ Approved', 'Imprest PDF generated. Request returned to Procurement.', 'success');
        loadCEOProcurementApprovals();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function ceoRejectRequest(id) {
    const res = await modernConfirm({
        title: '❌ Reject Request?',
        message: 'Provide a reason for rejection. Procurement will see this reason.',
        type: 'danger',
        okText: '❌ Reject Request',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });
    if (!res.confirmed) return;

    try {
        await API.ceoRejectRequest(id, res.reason);
        modernToast('❌ Rejected', 'Request returned to Procurement.', 'warning');
        loadCEOProcurementApprovals();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
// ================================================================
// EDIT PROFILE
// ================================================================
function openEditProfileModal() {
    if (!currentUser) {
        currentUser = Auth.getUser();
        if (!currentUser) { showToast('User data not found. Please login again.', 'error'); return; }
    }
    setInputValue('editProfileName', currentUser.fullName);
    setInputValue('editProfileTitle', currentUser.role);
    setInputValue('editProfileEmail', currentUser.email);
    setInputValue('editProfilePhone', currentUser.phone);
    setInputValue('editProfileDepartment', currentUser.department);
    setInputValue('editProfileEmployeeId', currentUser.employeeId);

    const preview = document.getElementById('editPicPreview');
    if (preview) {
        const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        if (currentUser.profilePic) preview.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile">`;
        else preview.innerHTML = `<span>${initials}</span>`;
    }
    currentProfilePic = currentUser.profilePic || null;
    const status = document.getElementById('editProfileStatus');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }
    document.getElementById('editProfileModal').classList.add('show');
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large (max 2MB)', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('Please select an image', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        currentProfilePic = e.target.result;
        const preview = document.getElementById('editPicPreview');
        if (preview) preview.innerHTML = `<img src="${currentProfilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="Profile">`;
        showToast('📷 Photo uploaded! Click Save to confirm.', 'info');
    };
    reader.readAsDataURL(file);
}

function removeProfilePic() {
    currentProfilePic = null;
    if (!currentUser) return;
    const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const preview = document.getElementById('editPicPreview');
    if (preview) preview.innerHTML = `<span>${initials}</span>`;
    showToast('🗑️ Photo removed. Save to confirm.', 'warning');
}

async function saveUserProfile() {
    const statusDiv = document.getElementById('editProfileStatus');
    const phone = document.getElementById('editProfilePhone')?.value.trim();
    if (!phone) { statusDiv.className = 'status-msg error'; statusDiv.textContent = '⚠ Please enter Phone Number.'; return; }
    const phoneRegex = /^\+?[\d\s\-()]{9,}$/;
    if (!phoneRegex.test(phone)) { statusDiv.className = 'status-msg error'; statusDiv.textContent = '⚠ Invalid phone number format.'; return; }

    const saveBtn = document.querySelector('#editProfileModal .btn-submit');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

    try {
        const payload = { phone };
        if (currentProfilePic !== currentUser.profilePic) payload.profilePic = currentProfilePic;
        const response = await API.updateOwnProfile(payload);
        currentUser = { ...currentUser, ...response.user };
        const token = Auth.getToken();
        Auth.saveSession(token, currentUser);
        renderCEOProfile();
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Profile updated successfully!';
        showToast('✅ Profile saved!', 'success');
        setTimeout(() => closeModal('editProfileModal'), 1000);
    } catch (err) {
        console.error('Save profile error:', err);
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Failed to save: ' + err.message;
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Changes'; }
    }
}

// ================================================================
// LOGOUT
// ================================================================
function handleLogoutClick(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) modal.classList.add('show');
    closeUserDropdown();
}

function closeLogoutDialog() {
    const modal = document.getElementById('logoutConfirmModal');
    if (modal) modal.classList.remove('show');
}

function confirmLogout() {
    closeLogoutDialog();
    showToast('👋 Logging out...', 'info');
    setTimeout(() => Auth.logout(), 400);
}

// ================================================================
// USER DROPDOWN
// ================================================================
function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap) wrap.classList.toggle('open');
}

function closeUserDropdown() {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap) wrap.classList.remove('open');
}

document.addEventListener('click', function(e) {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap && wrap.classList.contains('open') && !wrap.contains(e.target)) wrap.classList.remove('open');
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUserDropdown();
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        const logoutModal = document.getElementById('logoutConfirmModal');
        if (logoutModal) logoutModal.classList.remove('show');
    }
});

// ================================================================
// MODAL HELPERS
// ================================================================
function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
});

// ================================================================
// SIDEBAR
// ================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isMobile = window.innerWidth <= 768;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (!isMobile) localStorage.setItem('makdc_ceo_sidebar_collapsed', isCollapsed);
    if (isMobile && !isCollapsed) {
        backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('collapsed');
    if (backdrop) backdrop.classList.remove('show');
    document.body.style.overflow = '';
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) sidebar.classList.add('collapsed');
    else {
        const wasCollapsed = localStorage.getItem('makdc_ceo_sidebar_collapsed') === 'true';
        if (wasCollapsed) sidebar.classList.add('collapsed');
    }
}
// ================================================================
// 🆕 CHANGE PASSWORD
// ================================================================
async function changeMyPassword() {
    const currentPassword = document.getElementById('editProfileCurrentPassword').value;
    const newPassword = document.getElementById('editProfileNewPassword').value;
    const confirmPassword = document.getElementById('editProfileConfirmPassword').value;
    const statusDiv = document.getElementById('passwordChangeStatus');
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please fill in all password fields';
        return;
    }
    
    if (newPassword.length < 6) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ New password must be at least 6 characters';
        return;
    }
    
    if (newPassword !== confirmPassword) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ New passwords do not match';
        return;
    }
    
    try {
        statusDiv.className = 'status-msg';
        statusDiv.textContent = '⏳ Changing password...';
        
        const response = await fetch(`${CONFIG.API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to change password');
        }
        
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Password changed! You will be logged out in 3 seconds...';
        
        // Clear password fields
        document.getElementById('editProfileCurrentPassword').value = '';
        document.getElementById('editProfileNewPassword').value = '';
        document.getElementById('editProfileConfirmPassword').value = '';
        
        // Log out after 3 seconds (for security)
        setTimeout(() => {
            Auth.logout();
        }, 3000);
        
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}
function refreshAll() {
    loadCEODashboard();
    showToast('🔄 Refreshed!', 'info');
}

// ================================================================
// HELPERS
// ================================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setAvatar(id, pic, initials) {
    const el = document.getElementById(id);
    if (!el) return;
    if (pic) el.innerHTML = `<img src="${pic}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    else el.innerHTML = `<span>${initials}</span>`;
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
    if (typeof Toast !== 'undefined' && typeof Toast[type] === 'function') {
        Toast[type](message);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}
// ================================================================
// 🆕 CEO: BUDGET APPROVALS & GENERATION
// ================================================================
let ceoAllBudgets = [];

async function loadCEOBudgetsTab() {
    const container = document.getElementById('ceoBudgetContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading budgets...</div>';

    try {
        const budgets = await API.getMasterBudgets();
        ceoAllBudgets = Array.isArray(budgets) ? budgets : [];
        
        // Chuja zile zilizotumwa na Manager (pending-ceo) au zilizokwisha idhinishwa (approved)
        const relevant = ceoAllBudgets.filter(b => b.status === 'pending-ceo' || b.status === 'approved');
        
        const pendingCount = relevant.filter(b => b.status === 'pending-ceo').length;
        document.getElementById('sidebarBudgetBadge').textContent = pendingCount;
        document.getElementById('ceoBudgetCountBadge').textContent = pendingCount + ' Pending';

        if (relevant.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;color:var(--gray-400);">
                    <span style="font-size:50px;display:block;margin-bottom:12px;">💰</span>
                    <div style="font-size:16px;font-weight:700;">No Budgets Awaiting Approval</div>
                    <div style="font-size:13px;">Budgets sent by Manager will appear here.</div>
                </div>`;
            return;
        }

        container.innerHTML = relevant.map(b => {
            const isPending = b.status === 'pending-ceo';
            return `
                <div style="background:white;border:1.5px solid var(--gray-200);border-left:4px solid ${isPending ? '#f59e0b' : '#16a34a'};border-radius:12px;padding:20px 24px;margin-bottom:16px;box-shadow:0 4px 15px rgba(0,0,0,0.03);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
                        <div style="flex:1;min-width:220px;">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                                <span style="font-size:16px;font-weight:900;color:#0f1f3d;">${esc(b.title)}</span>
                                <span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;${isPending ? 'background:rgba(245,158,11,0.15);color:#b45309;' : 'background:rgba(22,163,74,0.12);color:#15803d;'}">
                                    ${isPending ? '⏳ Pending CEO' : '✅ Approved'}
                                </span>
                            </div>
                            <div style="font-size:13px;color:#64748b;margin-bottom:4px;">📅 Period: ${esc(b.period)}</div>
                            <div style="font-size:13px;color:#64748b;">🏢 Departments: ${b.allocations.length}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:24px;font-weight:900;color:#0f1f3d;font-family:'Courier New',monospace;">TSh ${Number(b.totalAmount).toLocaleString()}</div>
                        </div>
                    </div>

                    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
                        <button onclick="viewCEOBudgetDetails('${b.id}')" style="padding:9px 18px;background:rgba(15,31,61,0.1);color:#0f1f3d;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;font-family:inherit;">👁 View Details</button>
                        
                        ${isPending ? `
                            <button onclick="approveCEOBudget('${b.id}')" style="padding:9px 18px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;font-family:inherit;box-shadow:0 4px 12px rgba(34,197,94,0.3);">✅ Approve & Generate Book</button>
                            <button onclick="rejectCEOBudget('${b.id}')" style="padding:9px 18px;background:rgba(239,68,68,0.1);color:#dc2626;border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;font-family:inherit;">❌ Reject</button>
                        ` : `
                            <button onclick="openBudgetBookModal('${b.id}')" style="padding:9px 18px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;font-family:inherit;border:1.5px solid #f59e0b;">📖 Open Budget Book</button>
                        `}
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('loadCEOBudgetsTab error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#dc2626;">Error: ${esc(err.message)}</div>`;
    }
}
async function approveCEOBudget(budgetId) {
    // 1. Thibitisha na CEO kabla ya ku-approve
    const res = await modernConfirm({
        title: '✅ Approve & Generate Budget Book?',
        message: 'This will lock the budget and generate the official Budget Book. You cannot undo this action once confirmed.',
        detail: { 
            label: 'Budget ID', 
            value: `#${budgetId}` 
        },
        type: 'success',
        okText: '✅ Yes, Approve',
        cancelText: 'Cancel'
    });
    
    if (!res.confirmed) return;

    try {
        // 2. Tuma ombi kwa API (Backend)
        // Hii inaita PUT /budgets/master/:id/approve
        await API.ceoApproveMasterBudget(budgetId);
        
        // 3. Onyesha taarifa ya mafanikio
        modernToast('✅ Approved', 'Budget Book generated successfully!', 'success');
        
        // 4. Refresh list ya budgets (Status itabadilika kuwa 'approved')
        await loadCEOBudgetsTab(); 
        
        // 5. 🆕 Fungua Budget Book moja kwa moja ili CEO aione
        // Tunasubiri kidogo (500ms) ili UI ijenge upya kwanza
        setTimeout(() => {
            openBudgetBookModal(budgetId);
        }, 500);

    } catch (err) {
        console.error('approveCEOBudget error:', err);
        // 6. Onyesha kosa kama API imefeli
        modernToast('Failed to Approve', err.message || 'Tafadhali jaribu tena.', 'error');
    }
}
async function openBudgetBookModal(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) return modernToast('Not Found', 'Budget not found', 'error');

        // ===== 1. HESABU ZA DATA =====
        let grandTotalAllocated = 0;
        let grandTotalUsed = 0;
        let summaryTableRows = ''; 
        
        let departmentPagesHtml = '';
        let currentPageNumber = 3; 

        b.allocations.forEach(a => {
            let deptTotalUsed = 0;
            (a.items || []).forEach(item => {
                deptTotalUsed += Number(item.quantity) * Number(item.unitPrice);
            });
            const allocated = Number(a.ceilingAmount);
            grandTotalAllocated += allocated;
            grandTotalUsed += deptTotalUsed;

            summaryTableRows += `
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:12px 16px; font-size:13px; font-weight:700; color:#1e293b;">${esc(a.department)}</td>
                    <td style="padding:12px 16px; font-size:13px; text-align:right; font-family:'Courier New',monospace;">TSh ${allocated.toLocaleString()}</td>
                    <td style="padding:12px 16px; font-size:13px; text-align:right; font-family:'Courier New',monospace;">TSh ${deptTotalUsed.toLocaleString()}</td>
                    <td style="padding:12px 16px; font-size:13px; text-align:right; font-family:'Courier New',monospace; font-weight:800; color:${allocated - deptTotalUsed < 0 ? '#dc2626' : '#16a34a'};">
                        TSh ${(allocated - deptTotalUsed).toLocaleString()}
                    </td>
                </tr>
            `;
        });

        // Tengeneza Kurasa za Kila Idara
        const ITEMS_PER_PAGE = 15; 

        b.allocations.forEach((a, deptIndex) => {
            let deptTotalUsed = 0;
            const items = a.items || [];
            items.forEach(item => deptTotalUsed += Number(item.quantity) * Number(item.unitPrice));

            const allocated = Number(a.ceilingAmount);
            
            // Panga items kwa Activity (Grouping)
            const grouped = {};
            items.forEach(item => {
                const key = item.activityName || 'General';
                if (!grouped[key]) grouped[key] = [];
                grouped[key].push(item);
            });

            // Gawanya groups za activities kwenye kurasa
            const activityNames = Object.keys(grouped);
            const chunks = [];
            let currentChunk = [];
            let currentItemCount = 0;

            if (activityNames.length === 0) {
                chunks.push([]); // Ukurasa mtupu kama hakuna items
            } else {
                activityNames.forEach(actName => {
                    const actItems = grouped[actName];
                    // Kama activity hii ina items nyingi kuliko ukurasa mzima, tunaigawanya
                    if (actItems.length > ITEMS_PER_PAGE) {
                        if (currentChunk.length > 0) {
                            chunks.push(currentChunk);
                            currentChunk = [];
                            currentItemCount = 0;
                        }
                        for (let i = 0; i < actItems.length; i += ITEMS_PER_PAGE) {
                            chunks.push([{ name: actName, items: actItems.slice(i, i + ITEMS_PER_PAGE), isPartial: true }]);
                        }
                    } else {
                        // Kama activity inatoshea, ongeza kwenye chunk ya sasa
                        if (currentItemCount + actItems.length > ITEMS_PER_PAGE) {
                            chunks.push(currentChunk);
                            currentChunk = [];
                            currentItemCount = 0;
                        }
                        currentChunk.push({ name: actName, items: actItems, isPartial: false });
                        currentItemCount += actItems.length;
                    }
                });
                if (currentChunk.length > 0) chunks.push(currentChunk);
            }

            chunks.forEach((chunk, chunkIndex) => {
                const isFirstPageOfDept = chunkIndex === 0;
                const isLastPageOfDept = chunkIndex === chunks.length - 1;

                // Tengeneza Kadi za Activity kama zile za Sales Dashboard
                let activitiesHtml = chunk.map(act => {
                    let actTotal = 0;
                    const actItemsHtml = act.items.map((item, i) => {
                        const subtotal = Number(item.quantity) * Number(item.unitPrice);
                        actTotal += subtotal;
                        return `
                            <tr style="border-bottom:1px solid #f1f5f9;">
                                <td style="padding:10px 14px; font-size:12px; color:#94a3b8; font-weight:700;">${i + 1}</td>
                                <td style="padding:10px 14px; font-size:12px; font-weight:600; color:#1e293b; word-break:break-word;">${esc(item.itemName)}</td>
                                <td style="padding:10px 14px; font-size:12px; text-align:center; white-space:nowrap;">${item.quantity} <span style="color:#94a3b8; font-size:10px;">${item.unit}</span></td>
                                <td style="padding:10px 14px; font-size:12px; text-align:right; font-family:'Courier New',monospace; color:#475569;">TSh ${Number(item.unitPrice).toLocaleString()}</td>
                                <td style="padding:10px 14px; font-size:12px; text-align:right; font-weight:800; font-family:'Courier New',monospace; color:#0f1f3d;">TSh ${subtotal.toLocaleString()}</td>
                            </tr>
                        `;
                    }).join('');

                    return `
                        <div style="border:1px solid #e2e8f0; border-radius:10px; margin-bottom:20px; overflow:hidden; page-break-inside:avoid;">
                            <div style="background:#f8fafc; padding:12px 16px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                                <div style="display:flex; align-items:center; gap:10px;">
                                    <div style="width:24px; height:24px; background:#0f1f3d; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800;">📁</div>
                                    <span style="font-size:13px; font-weight:800; color:#0f1f3d; text-transform:uppercase;">${esc(act.name)} ${act.isPartial ? '<span style="font-size:10px;color:#f59e0b;">(Continues...)</span>' : ''}</span>
                                </div>
                                <span style="font-size:12px; font-weight:800; color:#16a34a; background:rgba(34,197,94,0.1); padding:4px 10px; border-radius:12px;">TSh ${actTotal.toLocaleString()}</span>
                            </div>
                            <table style="width:100%; border-collapse:collapse;">
                                <thead style="background:white; border-bottom:1px solid #e2e8f0;">
                                    <tr>
                                        <th style="padding:8px 14px; font-size:9px; text-align:left; color:#94a3b8; width:30px;">#</th>
                                        <th class="lang-en" style="padding:8px 14px; font-size:9px; text-align:left; color:#94a3b8; text-transform:uppercase;">Item Description</th>
                                        <th class="lang-sw" style="display:none; padding:8px 14px; font-size:9px; text-align:left; color:#94a3b8; text-transform:uppercase;">Maelezo ya Kitu</th>
                                        <th class="lang-en" style="padding:8px 14px; font-size:9px; text-align:center; color:#94a3b8; text-transform:uppercase;">Qty</th>
                                        <th class="lang-sw" style="display:none; padding:8px 14px; font-size:9px; text-align:center; color:#94a3b8; text-transform:uppercase;">Idadi</th>
                                        <th class="lang-en" style="padding:8px 14px; font-size:9px; text-align:right; color:#94a3b8; text-transform:uppercase;">Unit Price</th>
                                        <th class="lang-sw" style="display:none; padding:8px 14px; font-size:9px; text-align:right; color:#94a3b8; text-transform:uppercase;">Bei</th>
                                        <th class="lang-en" style="padding:8px 14px; font-size:9px; text-align:right; color:#94a3b8; text-transform:uppercase;">Total</th>
                                        <th class="lang-sw" style="display:none; padding:8px 14px; font-size:9px; text-align:right; color:#94a3b8; text-transform:uppercase;">Jumla</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${actItemsHtml}
                                </tbody>
                            </table>
                        </div>
                    `;
                }).join('');

                if (chunk.length === 0) {
                    activitiesHtml = `
                        <div style="text-align:center; padding:40px; color:#94a3b8; border:1px dashed #cbd5e1; border-radius:10px;">
                            <div class="lang-en" style="font-size:13px; font-style:italic;">No activities submitted for this department.</div>
                            <div class="lang-sw" style="display:none; font-size:13px; font-style:italic;">Hakuna shughuli zilizowasilishwa kwa idara hii.</div>
                        </div>
                    `;
                }

                // Kichwa cha ukurasa
                const headerHtml = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0f1f3d; padding-bottom:16px; margin-bottom:24px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:40px; height:40px; background:#0f1f3d; color:white; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">
                                ${deptIndex + 1} ${chunks.length > 1 ? `.${chunkIndex + 1}` : ''}
                            </div>
                            <div>
                                <h2 style="font-size:18px; font-weight:900; color:#0f1f3d; margin:0; text-transform:uppercase;">
                                    ${esc(a.department)}
                                </h2>
                                ${chunks.length > 1 ? `<div style="font-size:11px; color:#64748b; font-weight:700; margin-top:2px;">Part ${chunkIndex + 1} of ${chunks.length}</div>` : ''}
                            </div>
                        </div>
                        <div style="text-align:right; flex-shrink:0; margin-left:20px;">
                            <div class="lang-en" style="font-size:10px; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Allocated Ceiling</div>
                            <div class="lang-sw" style="display:none; font-size:10px; color:#64748b; font-weight:800; text-transform:uppercase; letter-spacing:1px;">Kiwango Kilichotengwa</div>
                            <div style="font-size:16px; font-weight:900; color:#0f1f3d; font-family:'Courier New',monospace;">TSh ${allocated.toLocaleString()}</div>
                        </div>
                    </div>
                `;

                // Muhtasari wa mwisho
                const footerHtml = isLastPageOfDept ? `
                    <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                        <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b); color:white; border-radius:10px; padding:20px 24px; min-width:350px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(15,31,61,0.2);">
                            <div>
                                <div class="lang-en" style="font-size:10px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1px;">Total Department Requested</div>
                                <div class="lang-sw" style="display:none; font-size:10px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1px;">Jumla Iliyoombwa na Idara</div>
                                <div style="font-size:22px; font-weight:900; font-family:'Courier New',monospace; color:#f59e0b;">TSh ${deptTotalUsed.toLocaleString()}</div>
                            </div>
                            <div style="text-align:right; border-left:1px solid rgba(255,255,255,0.2); padding-left:20px;">
                                <div class="lang-en" style="font-size:10px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1px;">Balance</div>
                                <div class="lang-sw" style="display:none; font-size:10px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1px;">Salio</div>
                                <div style="font-size:16px; font-weight:800; font-family:'Courier New',monospace; color:${allocated - deptTotalUsed < 0 ? '#f87171' : '#4ade80'};">
                                    TSh ${(allocated - deptTotalUsed).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </div>
                ` : '';

                departmentPagesHtml += `
                    <div class="a4-page" style="page-break-before: always;">
                        <div class="page-border">
                            ${headerHtml}
                            ${activitiesHtml}
                            ${footerHtml}
                        </div>
                        <div class="page-footer">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <img src="assets/makdc-logo.jpg" alt="Logo" style="height:20px; opacity:0.8;">
                                <span style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">MAK DC Investment Company</span>
                            </div>
                            <div style="font-size:10px; font-weight:600; color:#94a3b8;">
                                Page ${currentPageNumber} of XX
                            </div>
                        </div>
                    </div>
                `;
                
                currentPageNumber++;
            });
        });

        const totalPages = currentPageNumber; 
        departmentPagesHtml = departmentPagesHtml.replace(/Page (\d+) of XX/g, `Page $1 of ${totalPages}`);

        // ===== TENGENEZA MODAL =====
        let modal = document.getElementById('budgetBookModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'budgetBookModal';
        modal.style.cssText = 'position:fixed; inset:0; background:#334155; z-index:50000; display:flex; flex-direction:column; overflow:hidden;';
        
        modal.innerHTML = `
            <style>
                .a4-page {
                    background: white; width: 210mm; min-height: 297mm; margin: 20px auto;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.3); position: relative; box-sizing: border-box;
                    font-family: 'Inter', sans-serif; display: flex; flex-direction: column; overflow: hidden;
                }
                .page-border { border: 2px solid #e2e8f0; margin: 15mm; padding: 10mm; flex: 1; display: flex; flex-direction: column; }
                .page-footer {
                    position: absolute; bottom: 0; left: 0; right: 0; height: 40px; border-top: 1px solid #e2e8f0;
                    display: flex; justify-content: space-between; align-items: center; padding: 0 15mm; background: #f8fafc;
                }
                @media print {
                    body * { visibility: hidden; }
                    #budgetBookModal { position: static !important; overflow: visible !important; background: transparent !important; }
                    #printableBudgetBook, #printableBudgetBook * { visibility: visible; }
                    #printableBudgetBook { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                    .a4-page { box-shadow: none !important; margin: 0 !important; width: 100% !important; height: 100vh !important; page-break-after: always; }
                    .page-border { margin: 10mm; }
                    .page-footer { position: fixed; bottom: 0; }
                    .no-print { display: none !important; }
                    @page { size: A4; margin: 0; }
                }
            </style>

            <!-- Header ya Modal (Vitufe) -->
            <div class="no-print" style="background:#0f172a; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; box-shadow:0 4px 20px rgba(0,0,0,0.3); z-index: 10;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:40px; height:40px; background:#f59e0b; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:20px;">📖</div>
                    <div>
                        <h3 style="color:white; margin:0; font-size:16px; font-weight:800;">Official Budget Book</h3>
                        <p style="color:#94a3b8; margin:0; font-size:12px;">${esc(b.title)} • ${esc(b.period)}</p>
                    </div>
                </div>
                <div style="display:flex; gap:16px; align-items:center;">
                    <div style="display:flex; background:rgba(255,255,255,0.1); border-radius:8px; padding:4px;">
                        <button onclick="toggleBudgetLanguage('en')" id="btn-lang-en" style="padding:8px 16px; background:#f59e0b; color:#0f1f3d; border:none; border-radius:6px; font-weight:800; font-size:12px; cursor:pointer; font-family:inherit; transition:all 0.2s;">🇬🇧 English</button>
                        <button onclick="toggleBudgetLanguage('sw')" id="btn-lang-sw" style="padding:8px 16px; background:transparent; color:#94a3b8; border:none; border-radius:6px; font-weight:800; font-size:12px; cursor:pointer; font-family:inherit; transition:all 0.2s;">🇹🇿 Kiswahili</button>
                    </div>
                    <div style="width:1px; height:30px; background:rgba(255,255,255,0.2);"></div>
                    <button onclick="window.print()" style="padding:10px 24px; background:linear-gradient(135deg,#22c55e,#16a34a); color:white; border:none; border-radius:8px; font-weight:800; font-size:13px; cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(34,197,94,0.3);">
                        🖨️ Download PDF
                    </button>
                    <button onclick="document.getElementById('budgetBookModal').remove()" style="padding:10px 20px; background:rgba(255,255,255,0.1); color:white; border:none; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; font-family:inherit;">
                        ✕
                    </button>
                </div>
            </div>

            <!-- Eneo la Kurasa -->
            <div style="flex:1; overflow-y:auto; background:#475569; padding:40px 20px;" id="printableBudgetBook">
                <!-- 1. COVER PAGE -->
                <div class="a4-page">
                    <div class="page-border" style="justify-content:center; align-items:center; text-align:center;">
                        <img src="assets/makdc-logo.jpg" alt="Logo" style="height:130px; margin-bottom:30px; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.1));">
                        <h1 style="font-size:38px; font-weight:900; color:#0f1f3d; margin:0; text-transform:uppercase; letter-spacing:3px; line-height:1.2;">MAK DC INVESTMENT</h1>
                        <h2 style="font-size:20px; font-weight:700; color:#64748b; margin:10px 0 40px 0; text-transform:uppercase; letter-spacing:6px;">COMPANY LIMITED</h2>
                        <div style="width:120px; height:5px; background:#f59e0b; margin:0 auto 50px auto; border-radius:3px;"></div>
                        
                        <div class="lang-en">
                            <h3 style="font-size:36px; font-weight:900; color:#0f1f3d; margin-bottom:10px;">OFFICIAL BUDGET BOOK</h3>
                            <h4 style="font-size:22px; font-weight:500; color:#64748b; margin-bottom:70px; font-style:italic; font-family:'Times New Roman', serif;">Company Financial Plan</h4>
                        </div>
                        <div class="lang-sw" style="display:none;">
                            <h3 style="font-size:36px; font-weight:900; color:#0f1f3d; margin-bottom:10px;">KITABU RASMI CHA BAJETI</h3>
                            <h4 style="font-size:22px; font-weight:500; color:#64748b; margin-bottom:70px; font-style:italic; font-family:'Times New Roman', serif;">Mpango wa Fedha wa Kampuni</h4>
                        </div>
                        
                        <div style="background:white; border:2px solid #e2e8f0; border-radius:16px; padding:40px; display:inline-block; text-align:left; min-width:400px; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                            <div style="margin-bottom:24px;">
                                <div class="lang-en" style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px;">Budget Title</div>
                                <div class="lang-sw" style="display:none; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px;">Jina la Bajeti</div>
                                <div style="font-size:20px; font-weight:900; color:#0f1f3d;">${esc(b.title)}</div>
                            </div>
                            <div style="margin-bottom:24px;">
                                <div class="lang-en" style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px;">Financial Period</div>
                                <div class="lang-sw" style="display:none; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px;">Kipindi cha Fedha</div>
                                <div style="font-size:18px; font-weight:700; color:#0f1f3d;">${esc(b.period)} (${b.year})</div>
                            </div>
                            <div>
                                <div class="lang-en" style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px;">Total Company Ceiling</div>
                                <div class="lang-sw" style="display:none; font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:4px;">Jumla ya Bajeti ya Kampuni</div>
                                <div style="font-size:28px; font-weight:900; color:#0f1f3d; font-family:'Courier New',monospace;">TSh ${Number(b.totalAmount).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                    <div class="page-footer">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="assets/makdc-logo.jpg" alt="Logo" style="height:20px; opacity:0.8;">
                            <span style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">MAK DC Investment Company</span>
                        </div>
                        <div style="font-size:10px; font-weight:600; color:#94a3b8;">Page 1 of ${totalPages}</div>
                    </div>
                </div>

                <!-- 2. EXECUTIVE SUMMARY -->
                <div class="a4-page">
                    <div class="page-border">
                        <div style="display:flex; align-items:center; gap:16px; border-bottom:3px solid #0f1f3d; padding-bottom:16px; margin-bottom:24px;">
                            <div style="width:50px; height:50px; background:#f1f5f9; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px;">📊</div>
                            <div>
                                <h2 class="lang-en" style="font-size:22px; font-weight:900; color:#0f1f3d; margin:0; text-transform:uppercase;">Executive Summary</h2>
                                <h2 class="lang-sw" style="display:none; font-size:22px; font-weight:900; color:#0f1f3d; margin:0; text-transform:uppercase;">Muhtasari Mkuu</h2>
                                <div class="lang-en" style="font-size:12px; color:#64748b; font-weight:600;">Company Budget Overview</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#64748b; font-weight:600;">Maelezo ya Jumla ya Bajeti</div>
                            </div>
                        </div>

                        <div class="lang-en" style="margin-bottom:24px;">
                            <p style="font-size:13px; line-height:1.7; margin-bottom:12px; text-align:justify; color:#334155;">
                                This official Budget Book outlines the financial plan for <strong>MAK DC Investment Company LTD</strong> for the period of <strong>${esc(b.period)}</strong>. The document serves as a comprehensive guide for resource allocation, operational planning, and financial control. The total approved company ceiling stands at <strong>TSh ${grandTotalAllocated.toLocaleString()}</strong>.
                            </p>
                            <p style="font-size:13px; line-height:1.7; margin-bottom:12px; text-align:justify; color:#334155;">
                                Across all departments, a cumulative total of <strong>TSh ${grandTotalUsed.toLocaleString()}</strong> has been requested to facilitate various operational activities, strategic initiatives, and daily running costs. This leaves a company-wide financial balance of <strong style="color:${grandTotalAllocated - grandTotalUsed < 0 ? '#dc2626' : '#16a34a'};">TSh ${(grandTotalAllocated - grandTotalUsed).toLocaleString()}</strong>.
                            </p>
                            <p style="font-size:13px; line-height:1.7; margin-bottom:24px; text-align:justify; color:#334155;">
                                All department breakdowns included in this book have been reviewed and verified by the Operations Manager before being submitted for final executive approval.
                            </p>
                        </div>

                        <div class="lang-sw" style="display:none; margin-bottom:24px;">
                            <p style="font-size:13px; line-height:1.7; margin-bottom:12px; text-align:justify; color:#334155;">
                                Kitabu hiki rasmi cha Bajeti kinaelezea mpango wa kifedha wa <strong>Kampuni ya Uwekezaji ya MAK DC LTD</strong> kwa kipindi cha <strong>${esc(b.period)}</strong>. Hati hii ni mwongozo kamili wa mgawanyo wa rasilimali, upangaji wa shughuli, na udhibiti wa fedha. Jumla ya bajeti iliyoidhinishwa kwa kampuni ni <strong>TSh ${grandTotalAllocated.toLocaleString()}</strong>.
                            </p>
                            <p style="font-size:13px; line-height:1.7; margin-bottom:12px; text-align:justify; color:#334155;">
                                Kwa ujumla, idara zote zimeomba jumla ya <strong>TSh ${grandTotalUsed.toLocaleString()}</strong> ili kuwezesha shughuli mbalimbali za kiutendaji, mikakati, na gharama za uendeshaji wa kila siku. Hii inaacha salio la jumla la kampuni likiwa ni <strong style="color:${grandTotalAllocated - grandTotalUsed < 0 ? '#dc2626' : '#16a34a'};">TSh ${(grandTotalAllocated - grandTotalUsed).toLocaleString()}</strong>.
                            </p>
                            <p style="font-size:13px; line-height:1.7; margin-bottom:24px; text-align:justify; color:#334155;">
                                Migawanyo yote ya idara zilizomo kwenye kitabu hiki imepitiwa na kuthibitishwa na Meneja wa Uendeshaji (Operations Manager) kabla ya kuwasilishwa kwa ajili ya idhini ya mwisho kutoka kwa Mkurugenzi Mtendaji (CEO).
                            </p>
                        </div>

                        <div class="lang-en"><h3 style="font-size:14px; font-weight:900; color:#0f1f3d; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px;">Overall Summary by Department</h3></div>
                        <div class="lang-sw" style="display:none;"><h3 style="font-size:14px; font-weight:900; color:#0f1f3d; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px;">Muhtasari kwa Kila Idara</h3></div>

                        <table style="width:100%; border-collapse:collapse; border:1px solid #e2e8f0;">
                            <thead style="background:#0f1f3d; color:white;">
                                <tr>
                                    <th class="lang-en" style="padding:12px; font-size:11px; text-align:left; text-transform:uppercase;">Department</th>
                                    <th class="lang-sw" style="display:none; padding:12px; font-size:11px; text-align:left; text-transform:uppercase;">Idara</th>
                                    <th class="lang-en" style="padding:12px; font-size:11px; text-align:right; text-transform:uppercase;">Allocated (TSh)</th>
                                    <th class="lang-sw" style="display:none; padding:12px; font-size:11px; text-align:right; text-transform:uppercase;">Iliyotengwa (TSh)</th>
                                    <th class="lang-en" style="padding:12px; font-size:11px; text-align:right; text-transform:uppercase;">Requested (TSh)</th>
                                    <th class="lang-sw" style="display:none; padding:12px; font-size:11px; text-align:right; text-transform:uppercase;">Iliyoombwa (TSh)</th>
                                    <th class="lang-en" style="padding:12px; font-size:11px; text-align:right; text-transform:uppercase;">Balance (TSh)</th>
                                    <th class="lang-sw" style="display:none; padding:12px; font-size:11px; text-align:right; text-transform:uppercase;">Salio (TSh)</th>
                                </tr>
                            </thead>
                            <tbody style="background:white;">
                                ${summaryTableRows}
                            </tbody>
                            <tfoot style="background:#f8fafc; border-top:2px solid #0f1f3d;">
                                <tr>
                                    <td class="lang-en" style="padding:12px; font-weight:900; font-size:12px; color:#0f1f3d; text-transform:uppercase;">Grand Total</td>
                                    <td class="lang-sw" style="display:none; padding:12px; font-weight:900; font-size:12px; color:#0f1f3d; text-transform:uppercase;">Jumla Kuu</td>
                                    <td style="padding:12px; text-align:right; font-weight:900; font-size:12px; color:#0f1f3d; font-family:'Courier New',monospace;">TSh ${grandTotalAllocated.toLocaleString()}</td>
                                    <td style="padding:12px; text-align:right; font-weight:900; font-size:12px; color:#0f1f3d; font-family:'Courier New',monospace;">TSh ${grandTotalUsed.toLocaleString()}</td>
                                    <td style="padding:12px; text-align:right; font-weight:900; font-size:12px; color:${grandTotalAllocated - grandTotalUsed < 0 ? '#dc2626' : '#16a34a'}; font-family:'Courier New',monospace;">TSh ${(grandTotalAllocated - grandTotalUsed).toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div class="page-footer">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="assets/makdc-logo.jpg" alt="Logo" style="height:20px; opacity:0.8;">
                            <span style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">MAK DC Investment Company</span>
                        </div>
                        <div style="font-size:10px; font-weight:600; color:#94a3b8;">Page 2 of ${totalPages}</div>
                    </div>
                </div>

                <!-- 3. KURASA ZA IDARA -->
                ${departmentPagesHtml}

                <!-- 4. SIGNATURES -->
                <div class="a4-page" style="page-break-before: always;">
                    <div class="page-border">
                        <div style="display:flex; align-items:center; gap:16px; border-bottom:3px solid #0f1f3d; padding-bottom:16px; margin-bottom:30px;">
                            <div style="width:50px; height:50px; background:#f1f5f9; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:24px;">✍️</div>
                            <div>
                                <h2 class="lang-en" style="font-size:22px; font-weight:900; color:#0f1f3d; margin:0; text-transform:uppercase;">Approval & Signatures</h2>
                                <h2 class="lang-sw" style="display:none; font-size:22px; font-weight:900; color:#0f1f3d; margin:0; text-transform:uppercase;">Uthibitisho na Sahihi</h2>
                                <div class="lang-en" style="font-size:12px; color:#64748b; font-weight:600;">Official Authorization</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#64748b; font-weight:600;">Uidhinishaji Rasmi</div>
                            </div>
                        </div>

                        <p class="lang-en" style="font-size:13px; color:#475569; margin-bottom:60px; font-style:italic;">
                            This budget is considered officially approved and active upon the signatures below. By signing, the parties acknowledge that the allocations and requests outlined in this document are accurate and authorized.
                        </p>
                        <p class="lang-sw" style="display:none; font-size:13px; color:#475569; margin-bottom:60px; font-style:italic;">
                            Bajeti hii inazingatiwa kuwa imeidhinishwa rasmi na kuanza kutumika baada ya sahihi zilizo hapa chini. Kwa kutia sahihi, wahusika wanakiri kwamba migawanyo na maombi yaliyoelezwa kwenye hati hii ni sahihi na yameidhinishwa.
                        </p>
                        
                        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:60px;">
                            <div style="text-align:center; width:300px;">
                                <div class="lang-en" style="font-size:12px; color:#64748b; text-align:left; margin-bottom:8px; font-weight:600;">Prepared & Verified By:</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#64748b; text-align:left; margin-bottom:8px; font-weight:600;">Imeandaliwa na Kuthibitishwa na:</div>
                                <div style="border-bottom:2px solid #1e293b; height:80px; margin-bottom:12px;"></div>
                                <div style="font-size:15px; font-weight:800; color:#0f1f3d;">Operations Manager</div>
                                <div class="lang-en" style="font-size:12px; color:#64748b; margin-top:2px;">MAK DC Investment Company</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#64748b; margin-top:2px;">Kampuni ya Uwekezaji ya MAK DC</div>
                                <div class="lang-en" style="font-size:12px; color:#94a3b8; margin-top:16px;">Date: ____________________</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#94a3b8; margin-top:16px;">Tarehe: ____________________</div>
                            </div>

                            <div style="text-align:center; width:300px;">
                                <div class="lang-en" style="font-size:12px; color:#64748b; text-align:left; margin-bottom:8px; font-weight:600;">Approved By:</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#64748b; text-align:left; margin-bottom:8px; font-weight:600;">Imeidhinishwa na:</div>
                                <div style="border-bottom:2px solid #1e293b; height:80px; margin-bottom:12px;"></div>
                                <div style="font-size:15px; font-weight:800; color:#0f1f3d;">Chief Executive Officer</div>
                                <div class="lang-en" style="font-size:12px; color:#64748b; margin-top:2px;">MAK DC Investment Company</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#64748b; margin-top:2px;">Kampuni ya Uwekezaji ya MAK DC</div>
                                <div class="lang-en" style="font-size:12px; color:#94a3b8; margin-top:16px;">Date: ____________________</div>
                                <div class="lang-sw" style="display:none; font-size:12px; color:#94a3b8; margin-top:16px;">Tarehe: ____________________</div>
                            </div>
                        </div>

                        <div style="margin-top:auto; padding-top:30px; border-top:1px solid #e2e8f0; text-align:center;">
                            <div style="font-size:11px; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:1px;">MAK DC Investment Company LTD</div>
                            <div class="lang-en" style="font-size:10px; color:#cbd5e1; margin-top:4px;">"Quality service is our priority." • Confidential Document</div>
                            <div class="lang-sw" style="display:none; font-size:10px; color:#cbd5e1; margin-top:4px;">"Huduma bora ndiyo kipaumbele chetu." • Hati ya Siri</div>
                        </div>
                    </div>
                    <div class="page-footer">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <img src="assets/makdc-logo.jpg" alt="Logo" style="height:20px; opacity:0.8;">
                            <span style="font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.5px;">MAK DC Investment Company</span>
                        </div>
                        <div style="font-size:10px; font-weight:600; color:#94a3b8;">Page ${totalPages} of ${totalPages}</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}
function toggleBudgetLanguage(lang) {
    const btnEn = document.getElementById('btn-lang-en');
    const btnSw = document.getElementById('btn-lang-sw');
    
    if (lang === 'en') {
        if(btnEn) { btnEn.style.background = '#f59e0b'; btnEn.style.color = '#0f1f3d'; }
        if(btnSw) { btnSw.style.background = 'transparent'; btnSw.style.color = '#94a3b8'; }
    } else {
        if(btnSw) { btnSw.style.background = '#f59e0b'; btnSw.style.color = '#0f1f3d'; }
        if(btnEn) { btnEn.style.background = 'transparent'; btnEn.style.color = '#94a3b8'; }
    }

    const enElements = document.querySelectorAll('.lang-en');
    const swElements = document.querySelectorAll('.lang-sw');

    if (lang === 'en') {
        enElements.forEach(el => {
            if (el.tagName === 'TH' || el.tagName === 'TD') el.style.display = 'table-cell';
            else el.style.display = 'block';
        });
        swElements.forEach(el => el.style.display = 'none');
    } else {
        enElements.forEach(el => el.style.display = 'none');
        swElements.forEach(el => {
            if (el.tagName === 'TH' || el.tagName === 'TD') el.style.display = 'table-cell';
            else el.style.display = 'block';
        });
    }
}
async function viewCEOBudgetDetails(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) return;

        // Tengeneza HTML ya kuonyesha kila department na items zake
        const deptHtml = b.allocations.map(a => {
            let deptTotal = 0;
            const itemsHtml = (a.items || []).map(item => {
                const subtotal = Number(item.quantity) * Number(item.unitPrice);
                deptTotal += subtotal;
                return `
                    <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px dashed #e2e8f0; font-size:12px;">
                        <span>${esc(item.itemName)} (${item.quantity} ${item.unit} x TSh ${Number(item.unitPrice).toLocaleString()})</span>
                        <span style="font-weight:700;">TSh ${subtotal.toLocaleString()}</span>
                    </div>
                `;
            }).join('');

            return `
                <div style="background:white; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:2px solid #f1f5f9; padding-bottom:8px;">
                        <strong style="color:#0f1f3d; font-size:14px;">${esc(a.department)}</strong>
                        <span style="color:#0f1f3d; font-weight:800;">Ceiling: TSh ${Number(a.ceilingAmount).toLocaleString()}</span>
                    </div>
                    ${itemsHtml || '<div style="font-size:12px; color:#94a3b8; text-align:center;">Hakuna items</div>'}
                    <div style="margin-top:10px; text-align:right; font-size:13px; font-weight:800; color:${deptTotal > Number(a.ceilingAmount) ? '#dc2626' : '#16a34a'};">
                        Total Used: TSh ${deptTotal.toLocaleString()}
                    </div>
                </div>
            `;
        }).join('');

        // Weka kwenye Modal (Tumia ID ya modal iliyopo kwenye HTML yako)
        let modal = document.getElementById('ceoBudgetViewModal');
        if (!modal) {
            // Kama huna modal kwenye HTML, tunaunda hapa kwa JS
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="ceoBudgetViewModal">
                    <div class="modal-box" style="max-width:720px; padding:0; overflow:hidden; max-height:92vh; display:flex; flex-direction:column;">
                        <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center;">
                            <h3 style="font-size:18px; font-weight:800; margin:0;">📊 Budget Details</h3>
                            <button onclick="closeModal('ceoBudgetViewModal')" style="background:rgba(255,255,255,0.2); border:none; color:white; width:34px; height:34px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
                        </div>
                        <div id="ceoBudgetViewBody" style="padding:24px; overflow-y:auto; background:#f8fafc;"></div>
                        <div style="padding:14px 26px; background:white; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end;">
                            <button onclick="closeModal('ceoBudgetViewModal')" style="padding:10px 24px; background:#e2e8f0; color:#475569; border:none; border-radius:8px; font-weight:700; cursor:pointer;">Close</button>
                        </div>
                    </div>
                </div>
            `);
            modal = document.getElementById('ceoBudgetViewModal');
        }

        document.getElementById('ceoBudgetViewBody').innerHTML = `
            <div style="margin-bottom:16px;">
                <h2 style="font-size:20px; font-weight:900; color:#0f1f3d; margin:0 0 4px 0;">${esc(b.title)}</h2>
                <div style="font-size:13px; color:#64748b;">Period: ${esc(b.period)} • Total: TSh ${Number(b.totalAmount).toLocaleString()}</div>
            </div>
            ${deptHtml}
        `;

        modal.classList.add('show');
    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}
async function rejectCEOBudget(budgetId) {
    const res = await modernConfirm({
        title: '❌ Reject Budget?',
        message: 'Please provide a reason. The Manager will see this and can rework the budget.',
        type: 'danger',
        okText: '❌ Reject',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });
    if (!res.confirmed) return;

    try {
        // Tuma ombi kwa API
        await API.rejectMasterBudget(budgetId, res.reason);
        
        modernToast('❌ Rejected', 'Budget returned to Manager.', 'warning');
        
        // Refresh list
        loadCEOBudgetsTab(); 
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
// ================================================================
// 🧭 STRATEGIC PLANS — CEO APPROVAL
// ================================================================

const SP_LOGO_URL = 'assets/makdc-logo.jpg';
const SP_LOGO_FALLBACK = 'https://via.placeholder.com/120x120/0f1f3d/ffffff?text=MAK';
const SP_STORAGE_KEY = 'makdc_strategic_plans_v6';

let ceoStrategicPlansCache = [];

// ================================================================
// LOAD STRATEGIC PLANS
// ================================================================
async function loadCEOStrategicPlans() {
    const container = document.getElementById('ceoStrategicPlansContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading strategic plans...</div>';

    try {
        let plans = [];
        if (typeof API.getStrategicPlans === 'function') {
            plans = await API.getStrategicPlans().catch(() => []);
        } else {
            plans = JSON.parse(localStorage.getItem(SP_STORAGE_KEY) || '[]');
        }
        if (!Array.isArray(plans)) plans = [];

        ceoStrategicPlansCache = plans.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const pending = ceoStrategicPlansCache.filter(p => p.status === 'Pending CEO');
        const approved = ceoStrategicPlansCache.filter(p => p.status === 'Approved by CEO');
        const rejected = ceoStrategicPlansCache.filter(p => p.status === 'Rejected by CEO');

        setText('sidebarStrategicBadge', pending.length);
        setText('ceoStrategicCountBadge', pending.length + ' Pending');

        renderCEOStrategicPlans(pending, approved, rejected);
    } catch (err) {
        console.error('loadCEOStrategicPlans error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#dc2626;">Error: ${esc(err.message)}</div>`;
    }
}

function renderCEOStrategicPlans(pending, approved, rejected) {
    const container = document.getElementById('ceoStrategicPlansContainer');
    if (!container) return;

    if (pending.length === 0 && approved.length === 0 && rejected.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;">🧭</span>
                <div style="font-size:17px;font-weight:800;">No Strategic Plans Yet</div>
                <div style="font-size:13px;">Plans uploaded by Manager will appear here.</div>
            </div>`;
        return;
    }

    const all = [...pending, ...approved, ...rejected];

    container.innerHTML = all.map(p => {
        const isPending = p.status === 'Pending CEO';
        const isApproved = p.status === 'Approved by CEO';
        const isRejected = p.status === 'Rejected by CEO';

        const statusColor = isPending ? '#d97706' : isApproved ? '#16a34a' : '#dc2626';
        const statusBg = isPending ? 'rgba(245,158,11,0.15)' : isApproved ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)';
        const statusIcon = isPending ? '⏳' : isApproved ? '✅' : '❌';
        const statusLabel = p.status;

        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const fileType = (p.fileName || '').split('.').pop().toLowerCase();

        let actions = `
            <button onclick="viewCEOStrategicPlan('${p.id}')" style="padding:9px 18px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1.5px solid rgba(15,31,61,0.2);border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;">
                👁 View Details
            </button>
        `;

        if (isPending) {
            actions += `
                <button onclick="ceoApproveStrategicPlan('${p.id}')" style="padding:9px 18px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;box-shadow:0 4px 12px rgba(34,197,94,0.3);">
                    ✅ Approve Plan
                </button>
                <button onclick="ceoRejectStrategicPlan('${p.id}')" style="padding:9px 18px;background:rgba(220,38,38,0.1);color:#dc2626;border:1.5px solid rgba(220,38,38,0.2);border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;">
                    ❌ Reject
                </button>
            `;
        }

        return `
            <div style="background:white;border:1.5px solid var(--gray-200);border-left:4px solid ${statusColor};border-radius:12px;padding:18px 22px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:240px;">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
                            <span style="font-family:'Courier New',monospace;font-weight:900;color:#0f1f3d;font-size:14px;">STR-${esc(p.year)}</span>
                            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;background:${statusBg};color:${statusColor};">
                                ${statusIcon} ${statusLabel}
                            </span>
                            <span style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(15,31,61,0.06);color:#475569;font-weight:800;text-transform:uppercase;">${fileType.toUpperCase()}</span>
                        </div>
                        <div style="font-size:15px;font-weight:800;color:#0f1f3d;margin-bottom:6px;">${esc(p.title)}</div>
                        ${p.summary ? `<div style="font-size:12.5px;color:#64748b;line-height:1.5;margin-bottom:8px;">${esc(p.summary).slice(0,200)}${p.summary.length > 200 ? '…' : ''}</div>` : ''}
                        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11.5px;color:var(--gray-500);">
                            <span>🏢 <strong style="color:#334155;">${esc(p.department || '—')}</strong></span>
                            <span>👤 <strong style="color:#334155;">${esc(p.managerName || p.createdBy || '—')}</strong></span>
                            <span>📅 <strong style="color:#334155;">${createdDate}</strong></span>
                            ${p.fileSize ? `<span>💾 <strong style="color:#334155;">${(p.fileSize/1024/1024).toFixed(2)} MB</strong></span>` : ''}
                        </div>
                        ${isApproved && p.ceoApprovedBy ? `<div style="margin-top:8px;font-size:11px;color:#16a34a;font-weight:700;">✅ Approved by ${esc(p.ceoApprovedBy)} on ${new Date(p.ceoApprovedAt).toLocaleDateString('en-GB')}</div>` : ''}
                        ${isRejected && p.ceoRejectedBy ? `<div style="margin-top:8px;font-size:11px;color:#dc2626;font-weight:700;">❌ Rejected by ${esc(p.ceoRejectedBy)} — ${esc(p.ceoRejectionReason || '')}</div>` : ''}
                        ${p.ceoRemarks && isApproved ? `<div style="margin-top:8px;font-size:11.5px;color:#0f1f3d;background:rgba(245,158,11,0.06);padding:8px 12px;border-radius:6px;border-left:3px solid #f59e0b;"><strong>CEO Remarks:</strong> ${esc(p.ceoRemarks)}</div>` : ''}
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                        <div style="font-size:22px;font-weight:900;color:#0f1f3d;font-family:'Courier New',monospace;">${esc(String(p.year))}</div>
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:800;letter-spacing:0.5px;">Plan Year</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--gray-100);margin-top:14px;">
                    ${actions}
                </div>
            </div>
        `;
    }).join('');
}

// ================================================================
// VIEW STRATEGIC PLAN
// ================================================================
function viewCEOStrategicPlan(id) {
    const p = ceoStrategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) { modernToast('Not Found', 'Plan not found', 'error'); return; }

    const isPending = p.status === 'Pending CEO';
    const isApproved = p.status === 'Approved by CEO';
    const isRejected = p.status === 'Rejected by CEO';
    const statusColor = isPending ? '#d97706' : isApproved ? '#16a34a' : '#dc2626';
    const statusIcon = isPending ? '⏳' : isApproved ? '✅' : '❌';
    const fileType = (p.fileName || '').split('.').pop().toLowerCase();

    let modal = document.getElementById('ceoStrategicViewModal');
    if (modal) modal.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="ceoStrategicViewModal">
            <div class="modal-box" style="max-width:800px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a7f5a);padding:24px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <img src="${SP_LOGO_URL}" onerror="this.src='${SP_LOGO_FALLBACK}'" style="width:44px;height:44px;border-radius:50%;border:2px solid #f59e0b;background:white;padding:2px;object-fit:contain;" alt="MAK DC">
                        <div>
                            <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">Strategic Plan</h3>
                            <div style="font-size:12px;color:rgba(255,255,255,0.7);">${esc(p.title)}</div>
                        </div>
                    </div>
                    <button onclick="closeModal('ceoStrategicViewModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                </div>
                <div style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                    <div style="background:${statusColor}10;border-left:4px solid ${statusColor};padding:16px 20px;border-radius:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:10px;font-weight:800;color:${statusColor};text-transform:uppercase;letter-spacing:1px;">Status</div>
                            <div style="font-size:15px;font-weight:900;color:${statusColor};">${statusIcon} ${esc(p.status)}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Plan Year</div>
                            <div style="font-size:22px;font-weight:900;color:#0f1f3d;">${esc(String(p.year))}</div>
                        </div>
                    </div>

                    <div style="background:white;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;margin-bottom:14px;">
                        <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">📝 Executive Summary</div>
                        <div style="font-size:13px;color:#334155;line-height:1.7;">${esc(p.summary || '—')}</div>
                    </div>

                    <div style="background:white;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;margin-bottom:14px;">
                        <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📎 Attached Document</div>
                        <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;flex-wrap:wrap;">
                            <div style="font-size:32px;">📄</div>
                            <div style="flex:1;min-width:180px;">
                                <div style="font-size:13px;font-weight:800;color:#0f1f3d;word-break:break-all;">${esc(p.fileName || 'document')}</div>
                                <div style="font-size:11px;color:#64748b;margin-top:3px;">${fileType.toUpperCase()} • ${p.fileSize ? (p.fileSize/1024/1024).toFixed(2) + ' MB' : '—'}</div>
                            </div>
                            <button onclick="ceoPreviewPlanDocument('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">👁 Preview</button>
                            <button onclick="ceoDownloadPlanFile('${p.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1px solid rgba(15,31,61,0.2);border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">⬇️ Download</button>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">👤 Prepared By</div>
                            <div style="font-size:13px;font-weight:700;color:#1e293b;">${esc(p.managerName || p.createdBy || '—')}</div>
                        </div>
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">🏢 Department</div>
                            <div style="font-size:13px;font-weight:700;color:#1e293b;">${esc(p.department || '—')}</div>
                        </div>
                    </div>

                    ${isApproved && p.ceoRemarks ? `<div style="background:rgba(22,163,74,0.05);border-left:4px solid #16a34a;border-radius:10px;padding:16px 20px;margin-top:14px;"><div style="font-size:10px;font-weight:900;color:#16a34a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">✅ Your Approval Remarks</div><div style="font-size:12px;color:#14532d;line-height:1.6;">${esc(p.ceoRemarks)}</div></div>` : ''}
                    ${isRejected && p.ceoRejectionReason ? `<div style="background:rgba(220,38,38,0.05);border-left:4px solid #dc2626;border-radius:10px;padding:16px 20px;margin-top:14px;"><div style="font-size:10px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">❌ Rejection Reason</div><div style="font-size:12px;color:#7f1d1d;line-height:1.6;">${esc(p.ceoRejectionReason)}</div></div>` : ''}

                    ${isPending ? `
                        <div style="background:white;border-radius:10px;padding:16px 20px;border:1.5px solid #e5e7eb;margin-top:16px;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">💬 Approval Remarks (optional)</div>
                            <textarea id="ceoStrategicRemarksInput" placeholder="Add any remarks, guidance, or approval notes..." style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;min-height:80px;resize:vertical;line-height:1.6;"></textarea>
                        </div>
                    ` : ''}
                </div>
                <div style="padding:14px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;flex-wrap:wrap;">
                    <button onclick="closeModal('ceoStrategicViewModal')" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    ${isPending ? `
                        <button onclick="closeModal('ceoStrategicViewModal'); ceoRejectStrategicPlan('${p.id}')" style="padding:11px 24px;background:rgba(220,38,38,0.1);color:#dc2626;border:1.5px solid rgba(220,38,38,0.2);border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">❌ Reject</button>
                        <button onclick="closeModal('ceoStrategicViewModal'); ceoApproveStrategicPlan('${p.id}')" style="padding:11px 26px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;box-shadow:0 4px 12px rgba(34,197,94,0.3);">✅ Approve Plan</button>
                    ` : ''}
                </div>
            </div>
        </div>
    `);

    modal = document.getElementById('ceoStrategicViewModal');
    modal.classList.add('show');
}

// ================================================================
// APPROVE STRATEGIC PLAN
// ================================================================
async function ceoApproveStrategicPlan(id) {
    const p = ceoStrategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;

    const remarks = (document.getElementById('ceoStrategicRemarksInput')?.value || '').trim();

    const res = await modernConfirm({
        title: '✅ Approve Strategic Plan?',
        message: `Approve "${p.title}" as the official company strategy? It will be archived in the Strategic Plan Book.`,
        detail: { label: 'Plan • Year', value: `${p.title} • ${p.year}` },
        type: 'success',
        okText: '✅ Approve Plan',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        // ✅ Tumia API endpoint maalum
        if (typeof API.ceoApproveStrategicPlan === 'function') {
            await API.ceoApproveStrategicPlan(id, remarks);
        } else {
            throw new Error('API endpoint haipo. Sasisha api.js.');
        }
        modernToast('✅ Approved', 'Strategic plan signed and archived.', 'success');
        await loadCEOStrategicPlans();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
// ================================================================
// REJECT STRATEGIC PLAN
// ================================================================
async function ceoRejectStrategicPlan(id) {
    const p = ceoStrategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await modernConfirm({
        title: '❌ Reject Strategic Plan?',
        message: 'Provide a reason. The Manager will see this and can revise and resubmit.',
        detail: { label: 'Plan', value: `${p.title} • ${p.year}` },
        type: 'danger',
        okText: '❌ Reject Plan',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });
    if (!res.confirmed) return;

    try {
        // ✅ Tumia API endpoint maalum
        if (typeof API.ceoRejectStrategicPlan === 'function') {
            await API.ceoRejectStrategicPlan(id, res.reason);
        } else {
            throw new Error('API endpoint haipo. Sasisha api.js.');
        }
        modernToast('❌ Rejected', 'Manager notified with your reason.', 'warning');
        await loadCEOStrategicPlans();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

// ================================================================
// DOWNLOAD / PREVIEW (CEO)
// ================================================================
function ceoDownloadPlanFile(id) {
    const p = ceoStrategicPlansCache.find(x => String(x.id) === String(id));
    if (!p || !p.fileData) { modernToast('Not Found', 'File data missing', 'error'); return; }
    const a = document.createElement('a');
    a.href = p.fileData;
    a.download = p.fileName || 'strategic-plan';
    document.body.appendChild(a);
    a.click();
    a.remove();
    modernToast('⬇️ Download', 'File downloaded.', 'success');
}

function ceoPreviewPlanDocument(id) {
    const p = ceoStrategicPlansCache.find(x => String(x.id) === String(id));
    if (!p || !p.fileData) {
        modernToast('Not Found', 'File data missing', 'error');
        return;
    }

    const fileType = (p.fileName || '').split('.').pop().toLowerCase();
    const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(fileType);

    if (isImage) {
        let modal = document.getElementById('ceoImagePreviewModal');
        if (modal) modal.remove();
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="ceoImagePreviewModal">
                <div class="modal-box" style="max-width:92vw;width:1000px;height:92vh;padding:0;overflow:hidden;display:flex;flex-direction:column;border-radius:16px;">
                    <div style="background:linear-gradient(135deg,#384b67,#2a3850);padding:14px 20px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="font-size:13.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">🖼️ ${esc(p.fileName)}</div>
                        <button onclick="document.getElementById('ceoImagePreviewModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
                    </div>
                    <div style="flex:1;background:#1a1a1a;overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px;">
                        <img src="${p.fileData}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;">
                    </div>
                </div>
            </div>
        `);
        return;
    }

    // For PDF (open in new tab — best compatibility)
    if (fileType === 'pdf') {
        try {
            const parts = p.fileData.split(',');
            const b64 = parts[1];
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            const blob = new Blob([arr], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);
            const w = window.open(blobUrl, '_blank');
            if (!w || w.closed) {
                modernToast('Popup Blocked', 'Please allow popups to preview PDF, or use Download.', 'warning');
                setTimeout(() => ceoDownloadPlanFile(id), 1000);
            }
        } catch (err) {
            modernToast('Failed', err.message, 'error');
            setTimeout(() => ceoDownloadPlanFile(id), 1000);
        }
        return;
    }

    // Word/Excel/PPT
    const ok = window.confirm(`📄 "${p.fileName}"\n\nFaili hii (${fileType.toUpperCase()}) haiwezi kuonyeshwa moja kwa moja kwenye browser.\n\nBonyeza OK kuipakua.`);
    if (ok) ceoDownloadPlanFile(id);
}

// ================================================================
// HOOK INTO switchTab — CEO
// ================================================================
(function hookStrategicToCEOTab() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__strategicHooked) return;
    const wrapped = function(tabId) {
        const result = _orig.call(this, tabId);
        if (tabId === 'tab-strategic-plans') {
            loadCEOStrategicPlans();
        }
        return result;
    };
    wrapped.__strategicHooked = true;
    window.switchTab = wrapped;
})();
// ================================================================
// 💼 CEO: BUSINESS PLANS APPROVAL
// ================================================================

async function loadCeoBusinessPlans() {
    const container = document.getElementById('ceoBusinessPlansContainer');
    if (!container) return;
    
    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading business plans...</div></div>`;

    try {
        const plans = await API.getBusinessPlans();
        
        // Chuja plans kwa status
        const pending = plans.filter(p => p.status === 'Pending CEO');
        const approved = plans.filter(p => ['Approved', 'Active'].includes(p.status));

        // 🆕 Sasisha KPI cards kama zipo kwenye HTML
        if (document.getElementById('ceoBpStatPending')) {
            document.getElementById('ceoBpStatPending').textContent = pending.length;
        }
        if (document.getElementById('ceoBpStatApproved')) {
            document.getElementById('ceoBpStatApproved').textContent = approved.length;
        }
        // Kama hakuna pending plans
        if (pending.length === 0) {
            container.innerHTML = `
                <div class="modern-empty-state">
                    <div class="mes-icon" style="background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); color: #16a34a;">
                        ✅
                    </div>
                    <div class="mes-title">You're All Caught Up!</div>
                    <div class="mes-desc" style="max-width: 400px; margin: 0 auto 20px;">
                        ${approved.length > 0 
                            ? `You have <strong>${approved.length} approved plan(s)</strong>. All pending reviews are complete.` 
                            : 'Plans submitted by Managers will appear here when they need your review.'}
                    </div>
                    
                    ${approved.length > 0 ? `
                        <button class="mrc-btn primary" onclick="openCeoPlanBook()" style="padding: 12px 24px; font-size: 14px; margin-top: 10px;">
                            📖 View Approved Plans (${approved.length})
                        </button>
                    ` : ''}
                </div>
            `;
            return;
        }
        // Onyesha orodha ya pending plans
        container.innerHTML = pending.map(p => {
            const fileType = (p.fileName || '').split('.').pop().toLowerCase();
            const sizeStr = p.fileSize ? (p.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '';
            const submittedDate = p.submittedToCeoAt 
                ? new Date(p.submittedToCeoAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

            return `
                <div class="modern-request-card pending">
                    <div class="mrc-header">
                        <div class="mrc-title-wrap">
                            <div class="mrc-id-row">
                                <span class="mrc-id">${esc(p.businessPlanId)}</span>
                                <span class="mrc-badge navy">${esc(p.projectType)}</span>
                                <span class="mrc-badge gold">⏳ Awaiting Approval</span>
                            </div>
                            <div class="mrc-title">${esc(p.title)}</div>
                            ${p.summary ? `<div style="font-size:13px;color:#64748b;line-height:1.55;margin-bottom:10px;">${esc(p.summary).slice(0, 200)}${p.summary.length > 200 ? '…' : ''}</div>` : ''}
                            <div class="mrc-meta">
                                <span>👤 <strong>${esc(p.createdBy)}</strong></span>
                                <span>🏢 <strong>${esc(p.department || '—')}</strong></span>
                                <span>📅 <strong>${submittedDate}</strong></span>
                                ${sizeStr ? `<span>💾 <strong>${sizeStr}</strong></span>` : ''}
                            </div>
                            <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#475569;">
                                <span>💰 <strong style="color:#0f1f3d;">TSh ${Number(p.estimatedBudget || 0).toLocaleString()}</strong></span>
                                <span>📈 Expected Revenue: <strong style="color:#16a34a;">TSh ${Number(p.expectedRevenue || 0).toLocaleString()}</strong></span>
                                <span>📊 ROI: <strong style="color:#16a34a;">${p.expectedRoi ? Number(p.expectedRoi).toFixed(1) + '%' : '—'}</strong></span>
                                ${p.breakEvenMonths ? `<span>⏱️ Break-even: <strong>${p.breakEvenMonths} months</strong></span>` : ''}
                            </div>
                        </div>
                        <div class="mrc-amount-wrap">
                            <div class="mrc-amount" style="font-size:18px;">TSh ${Number(p.estimatedBudget || 0).toLocaleString()}</div>
                            <div class="mrc-amount-label">Est. Budget</div>
                        </div>
                    </div>
                    <div class="mrc-actions">
                        <button class="mrc-btn primary" onclick="viewBusinessPlan('${p.id}')">👁️ View Details</button>
                        <button class="mrc-btn gold" onclick="openCeoReviewBusinessPlan('${p.id}')">🧑‍⚖️ Review & Approve</button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('loadCeoBusinessPlans error:', err);
        container.innerHTML = `
            <div class="modern-empty-state">
                <div class="mes-icon">❌</div>
                <div class="mes-title">Error</div>
                <div class="mes-desc">${esc(err.message || 'Failed to load plans')}</div>
            </div>
        `;
    }
}
// 👁️ VIEW BUSINESS PLAN (CEO)
async function viewBusinessPlan(id) {
    const p = await API.getBusinessPlanById(id);
    if (!p) return;

    let modal = document.getElementById('ceoBPViewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ceoBPViewModal';
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:780px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
            <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a7f5a);padding:24px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div>
                    <h3 style="font-size:18px;font-weight:900;margin:0;">${esc(p.title)}</h3>
                    <div style="font-size:12px;color:rgba(255,255,255,0.7);margin-top:4px;">${esc(p.businessPlanId)} • By ${esc(p.createdBy)}</div>
                </div>
                <button onclick="document.getElementById('ceoBPViewModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div style="padding:24px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                <div style="background:white;padding:18px;border-radius:12px;margin-bottom:16px;border:1px solid #e2e8f0;">
                    <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:6px;">Executive Summary</div>
                    <div style="font-size:13px;color:#334155;line-height:1.7;">${esc(p.summary || '—')}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
                    <div style="background:white;padding:14px;border-radius:10px;border:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase;">Budget</div>
                        <div style="font-size:14px;font-weight:800;color:#0f1f3d;">TSh ${Number(p.estimatedBudget || 0).toLocaleString()}</div>
                    </div>
                    <div style="background:white;padding:14px;border-radius:10px;border:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase;">Revenue</div>
                        <div style="font-size:14px;font-weight:800;color:#16a34a;">TSh ${Number(p.expectedRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div style="background:white;padding:14px;border-radius:10px;border:1px solid #e2e8f0;">
                        <div style="font-size:10px;color:#64748b;font-weight:800;text-transform:uppercase;">ROI</div>
                        <div style="font-size:14px;font-weight:800;color:#16a34a;">${p.expectedRoi ? p.expectedRoi + '%' : '—'}</div>
                    </div>
                </div>
                <div style="background:white;padding:16px;border-radius:10px;border:1px solid #e2e8f0;">
                    <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;margin-bottom:8px;">📎 Document</div>
                    <div style="display:flex;align-items:center;gap:14px;background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
                        <div style="font-size:28px;">📄</div>
                        <div style="flex:1;">
                            <div style="font-weight:800;font-size:13px;">${esc(p.fileName)}</div>
                            <div style="font-size:11px;color:#64748b;">${p.fileSize ? (p.fileSize/1024/1024).toFixed(2) + ' MB' : '—'}</div>
                        </div>
                        <button onclick="downloadBPFile('${p.id}')" style="padding:8px 14px;background:#0f1f3d;color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;">⬇️ Download Book</button>
                    </div>
                </div>
            </div>
            <div style="padding:14px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;">
                <button onclick="document.getElementById('ceoBPViewModal').remove()" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// 🧑‍⚖️ CEO REVIEW
async function openCeoReviewBusinessPlan(id) {
    const p = await API.getBusinessPlanById(id);
    if (!p) return;

    let modal = document.getElementById('ceoBPReviewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ceoBPReviewModal';
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:640px;padding:0;overflow:hidden;border-radius:20px;">
            <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#92400e);padding:24px 30px;color:white;">
                <h3 style="font-size:18px;font-weight:900;margin:0;">CEO Review</h3>
                <div style="font-size:12px;color:rgba(255,255,255,0.7);">${esc(p.title)}</div>
            </div>
            <div style="padding:24px 30px;">
                <div style="background:#f8fafc;padding:16px;border-radius:10px;margin-bottom:16px;border-left:4px solid #f59e0b;">
                    <div style="font-size:13px;font-weight:900;color:#78350f;">Awaiting Your Decision</div>
                    <div style="font-size:12px;color:#92400e;margin-top:4px;">Review the document and approve, reject, or request revision.</div>
                </div>

                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;margin-bottom:6px;">CEO Remarks (Optional)</label>
                    <textarea id="ceoBPRemarks" rows="3" placeholder="Add any guidance or notes..." style="width:100%;padding:12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;"></textarea>
                </div>

                <div style="margin-bottom:16px;">
                    <label style="display:block;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;margin-bottom:6px;">Rejection/Revision Notes (Kama unakataa)</label>
                    <textarea id="ceoBPReason" rows="3" placeholder="Explain why..." style="width:100%;padding:12px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;resize:vertical;"></textarea>
                </div>
            </div>
            <div style="padding:16px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;">
                <button onclick="document.getElementById('ceoBPReviewModal').remove()" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;">Cancel</button>
                <button onclick="ceoReviewBP('${p.id}', 'revision')" style="padding:11px 24px;background:rgba(37,99,235,0.1);color:#2563eb;border:1.5px solid rgba(37,99,235,0.25);border-radius:8px;font-weight:800;cursor:pointer;">🔄 Request Revision</button>
                <button onclick="ceoReviewBP('${p.id}', 'reject')" style="padding:11px 24px;background:rgba(220,38,38,0.1);color:#dc2626;border:1.5px solid rgba(220,38,38,0.2);border-radius:8px;font-weight:800;cursor:pointer;">❌ Reject</button>
                <button onclick="ceoReviewBP('${p.id}', 'approve')" style="padding:11px 24px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;box-shadow:0 4px 12px rgba(22,163,74,0.3);">✅ Approve</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function ceoReviewBP(id, action) {
    const remarks = document.getElementById('ceoBPRemarks')?.value.trim() || '';
    const reason = document.getElementById('ceoBPReason')?.value.trim() || '';

    if ((action === 'reject' || action === 'revision') && !reason) {
        modernToast('Reason Required', 'Please provide a reason for rejection/revision.', 'warning');
        return;
    }

    try {
        if (action === 'approve') {
            await API.ceoApproveBusinessPlan(id, remarks);
            modernToast('✅ Approved', 'Business plan has been approved.', 'success');
        } else if (action === 'reject') {
            await API.ceoRejectBusinessPlan(id, reason);
            modernToast('❌ Rejected', 'Business plan returned to Manager.', 'warning');
        } else if (action === 'revision') {
            await API.ceoRequestBusinessPlanRevision(id, reason);
            modernToast('🔄 Revision Requested', 'Manager will be notified.', 'info');
        }
        
        document.getElementById('ceoBPReviewModal')?.remove();
        await loadCeoBusinessPlans();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
// ================================================================
// 📖 CEO: BUSINESS PLAN BOOK (ARCHIVE)
// ================================================================
async function openCeoPlanBook() {
    const modal = document.getElementById('ceoPlanBookModal');
    if (modal) modal.remove();

    // Onyesha loading kwanza
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="ceoPlanBookModal">
            <div class="modal-box" style="max-width:940px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a7f5a);padding:20px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <div style="width:44px;height:44px;border-radius:50%;background:rgba(245,158,11,0.2);border:2px solid #f59e0b;display:flex;align-items:center;justify-content:center;font-size:22px;">📖</div>
                        <div>
                            <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">Official Plan Book Archive</h3>
                            <div style="font-size:11px;color:rgba(255,255,255,0.7);">Company Growth Portfolio</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('ceoPlanBookModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                </div>
                <div id="ceoPlanBookBody" style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                    <div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading archive...</div></div>
                </div>
            </div>
        </div>
    `);

    try {
        const plans = await API.getBusinessPlans();
        
        // Chuja tu zile zilizokwisha idhinishwa au zinafanya kazi
        const approved = plans.filter(p => ['Approved', 'Active'].includes(p.status));
        
        if (approved.length === 0) {
            document.getElementById('ceoPlanBookBody').innerHTML = `
                <div class="modern-empty-state">
                    <div class="mes-icon">📭</div>
                    <div class="mes-title">No Approved Plans Yet</div>
                    <div class="mes-desc">Plans you approve will appear here for reference.</div>
                </div>
            `;
            return;
        }

        // Panga kwa tarehe ya kuidhinishwa (Mpya mbele)
        const sorted = [...approved].sort((a, b) => new Date(b.ceoApprovedAt || 0) - new Date(a.ceoApprovedAt || 0));

        // Hesabu Jumla ya Uwekezaji
        const totalInvestment = sorted.reduce((sum, p) => sum + Number(p.estimatedBudget || 0), 0);

        document.getElementById('ceoPlanBookBody').innerHTML = `
            <!-- KADI YA JUU (Cover) -->
            <div style="background:linear-gradient(155deg,#0a1628 0%,#0f1f3d 45%,#1a3a6b 100%);border-radius:14px;padding:40px 30px;text-align:center;margin-bottom:22px;position:relative;overflow:hidden;box-shadow:0 10px 30px rgba(15,31,61,0.2);">
                <div style="position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,rgba(245,158,11,0.25) 0%,transparent 70%);border-radius:50%;"></div>
                <div style="position:relative;z-index:1;">
                    <div style="width:96px;height:96px;border-radius:50%;border:4px solid #f59e0b;background:white;padding:5px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;font-size:44px;">💼</div>
                    <div style="font-size:11px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:4px;margin-bottom:10px;">MAK DC Investment Company LTD</div>
                    <h2 style="font-size:32px;font-weight:900;color:white;margin:0 0 8px;line-height:1.1;">Business Plan Book</h2>
                    <div style="font-size:13px;color:rgba(255,255,255,0.7);font-style:italic;margin-bottom:20px;">"Quality service is our priority."</div>
                    <div style="border-top:2px solid #f59e0b;border-bottom:2px solid #f59e0b;padding:14px 30px;display:inline-block;">
                        <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Total Approved Investment</div>
                        <div style="font-size:24px;font-weight:900;color:#fbbf24;margin-top:4px;">TSh ${totalInvestment.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <!-- ORODHA YA MIRADI -->
            <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📚 Approved Projects (${sorted.length})</div>
            
            <div style="display:flex;flex-direction:column;gap:12px;">
                ${sorted.map((p, i) => `
                    <div style="background:white;border-radius:12px;padding:18px 22px;border:1.5px solid #e5e7eb;border-left:4px solid #16a34a;transition:all 0.2s;" onmouseover="this.style.boxShadow='0 8px 24px rgba(15,31,61,0.08)'" onmouseout="this.style.boxShadow='none'">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
                            <div style="flex:1;min-width:240px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                                    <span style="font-family:'Courier New',monospace;font-weight:900;color:#f59e0b;font-size:14px;">${String(i+1).padStart(2,'0')}</span>
                                    <span style="font-size:11px;font-weight:800;color:#16a34a;background:rgba(22,163,74,0.1);padding:3px 8px;border-radius:6px;">✅ Approved</span>
                                    <span style="font-size:11px;color:#94a3b8;">${esc(p.projectType)}</span>
                                </div>
                                <div style="font-size:15px;font-weight:800;color:#0f1f3d;margin-bottom:4px;">${esc(p.title)}</div>
                                <div style="font-size:12px;color:#475569;margin-bottom:6px;">
                                    💰 TSh ${Number(p.estimatedBudget || 0).toLocaleString()} • 📈 ROI: ${p.expectedRoi ? Number(p.expectedRoi) + '%' : '—'} • 🏢 ${esc(p.department || '—')}
                                </div>
                                <div style="font-size:11.5px;color:#64748b;">👤 Submitted by <strong>${esc(p.createdBy)}</strong> • Approved on ${new Date(p.ceoApprovedAt).toLocaleDateString('en-GB')}</div>
                                ${p.ceoRemarks ? `<div style="margin-top:8px;font-size:11.5px;color:#0f1f3d;background:rgba(245,158,11,0.06);padding:6px 10px;border-radius:6px;border-left:3px solid #f59e0b;">💬 <strong>CEO:</strong> ${esc(p.ceoRemarks)}</div>` : ''}
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0;">
                                <button onclick="downloadBPFile('${p.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1px solid rgba(15,31,61,0.2);border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;">⬇️ Download Book</button>
                                <button onclick="viewBusinessPlan('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-size:12px;">👁 View</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        document.getElementById('ceoPlanBookBody').innerHTML = `
            <div class="modern-empty-state">
                <div class="mes-icon">❌</div>
                <div class="mes-title">Error</div>
                <div class="mes-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}
async function downloadBPFile(id) {
    try {
        const p = await API.getBusinessPlanById(id);
        if (!p || !p.fileData) {
            modernToast('Not Found', 'File data missing', 'error');
            return;
        }
        const a = document.createElement('a');
        a.href = p.fileData;
        a.download = p.fileName || 'business-plan';
        document.body.appendChild(a);
        a.click();
        a.remove();
        modernToast('⬇️ Download', 'File downloaded.', 'success');
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
async function generateFullBookWithCover(plan) {
    try {
        modernToast('⏳ Generating Book', 'Adding cover & back pages...', 'info');

        // 1. Chukua fileData (Base64) na ubadilishe kuwa ArrayBuffer
        const pdfBytes = Uint8Array.from(atob(plan.fileData.split(',')[1]), c => c.charCodeAt(0));
        
        // 2. Tumia pdf-lib kufungua PDF iliyopo
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const pdfDoc = await PDFDocument.load(pdfBytes);
        
        // 3. Tengeneza Cover Page (Jalada)
        const coverPage = pdfDoc.insertPage(0);
        const { width, height } = coverPage.getSize();
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Rangi za Kampuni
        const navy = rgb(15/255, 31/255, 61/255);
        const gold = rgb(245/255, 158/255, 11/255);
        const white = rgb(1, 1, 1);

        // Chora background
        coverPage.drawRectangle({ x: 0, y: 0, width, height, color: white });
        coverPage.drawRectangle({ x: 0, y: height - 20, width, height: 20, color: navy });
        coverPage.drawRectangle({ x: 0, y: 0, width, height: 20, color: gold });

        // Weka Maandishi ya Jalada
        coverPage.drawText('MAK DC INVESTMENT COMPANY LTD', {
            x: 50, y: height - 100, size: 24, font: fontBold, color: navy,
        });
        coverPage.drawText('Official Business Plan', {
            x: 50, y: height - 140, size: 18, font: fontRegular, color: gold,
        });
        coverPage.drawText(plan.title.toUpperCase(), {
            x: 50, y: height - 250, size: 28, font: fontBold, color: navy,
        });
        coverPage.drawText(`Submitted by: ${plan.createdBy}`, {
            x: 50, y: 100, size: 12, font: fontRegular, color: navy,
        });
        coverPage.drawText(`Date: ${new Date(plan.ceoApprovedAt).toLocaleDateString()}`, {
            x: 50, y: 80, size: 12, font: fontRegular, color: navy,
        });

        // 4. Tengeneza Back Page (Ukurasa wa Mwisho)
        const backPage = pdfDoc.addPage([width, height]);
        backPage.drawRectangle({ x: 0, y: 0, width, height, color: white });
        backPage.drawRectangle({ x: 0, y: 0, width, height: 20, color: navy });
        
        backPage.drawText('APPROVED & SIGNED BY:', {
            x: 50, y: height - 100, size: 14, font: fontBold, color: navy,
        });
        backPage.drawText('_____________________________', {
            x: 50, y: height - 160, size: 14, font: fontRegular, color: navy,
        });
        backPage.drawText('Chief Executive Officer', {
            x: 50, y: height - 180, size: 12, font: fontRegular, color: navy,
        });
        backPage.drawText('MAK DC Investment Company LTD', {
            x: 50, y: 100, size: 10, font: fontRegular, color: gold,
        });

        // 5. Hifadhi PDF mpya na uipakue
        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.title}_FullBook.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        modernToast('✅ Downloaded', 'Full book with cover & back page generated.', 'success');
    } catch (err) {
        console.error(err);
        modernToast('Error', 'Failed to generate book: ' + err.message, 'error');
    }
}
async function downloadFullBook(planId) {
    try {
        modernToast('⏳ Generating Book', 'Adding cover & back pages...', 'info');

        // 1. Vuta data kamili ya plan (pamoja na fileData)
        const plan = await API.getBusinessPlanById(planId);
        
        if (!plan || !plan.fileData) {
            modernToast('Not Found', 'File data missing.', 'error');
            return;
        }

        // Hakikisha ni PDF
        const fileType = (plan.fileName || '').split('.').pop().toLowerCase();
        if (fileType !== 'pdf') {
            modernToast('Not PDF', 'Cover generation inafanya kazi kwa PDF pekee kwa sasa.', 'warning');
            return;
        }

        // 2. Badilisha Base64 PDF kuwa ArrayBuffer
        const existingPdfBytes = Uint8Array.from(atob(plan.fileData.split(',')[1]), c => c.charCodeAt(0));
        
        // 3. Anzisha PDFDocument
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        // 4. Chukua vipimo vya ukurasa wa kwanza wa PDF yako
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Rangi za Kampuni
        const navy = rgb(15/255, 31/255, 61/255);
        const gold = rgb(245/255, 158/255, 11/255);
        const white = rgb(1, 1, 1);

        // 5. TENGENEZA COVER PAGE (Jalada)
        const coverPage = pdfDoc.insertPage(0, [width, height]);
        
        // Chora background
        coverPage.drawRectangle({ x: 0, y: 0, width, height, color: white });
        coverPage.drawRectangle({ x: 0, y: height - 40, width, height: 40, color: navy });
        coverPage.drawRectangle({ x: 0, y: height - 50, width, height: 10, color: gold });
        coverPage.drawRectangle({ x: 0, y: 0, width, height: 40, color: navy });
        coverPage.drawRectangle({ x: 0, y: 40, width, height: 10, color: gold });

        // Maandishi ya Jalada
        coverPage.drawText('MAK DC INVESTMENT COMPANY LTD', {
            x: 50, y: height - 150, size: 22, font: fontBold, color: navy,
        });
        coverPage.drawText('OFFICIAL BUSINESS PLAN', {
            x: 50, y: height - 180, size: 14, font: fontRegular, color: gold,
        });

        // Mstari wa kupendezesha
        coverPage.drawLine({
            start: { x: 50, y: height - 200 },
            end: { x: width - 50, y: height - 200 },
            thickness: 2,
            color: gold,
        });

        // Jina la Mradi
        const titleLines = splitText(plan.title.toUpperCase(), 40); // Gawanya kama ni ndefu
        let yPos = height - 300;
        titleLines.forEach(line => {
            coverPage.drawText(line, { x: 50, y: yPos, size: 28, font: fontBold, color: navy });
            yPos -= 40;
        });

        // Taarifa za Mradi
        coverPage.drawText(`Project Type: ${plan.projectType}`, {
            x: 50, y: yPos - 40, size: 12, font: fontRegular, color: navy,
        });
        coverPage.drawText(`Budget: TSh ${Number(plan.estimatedBudget).toLocaleString()}`, {
            x: 50, y: yPos - 60, size: 12, font: fontRegular, color: navy,
        });
        coverPage.drawText(`Submitted By: ${plan.createdBy}`, {
            x: 50, y: 100, size: 12, font: fontBold, color: navy,
        });
        coverPage.drawText(`Approved On: ${new Date(plan.ceoApprovedAt).toLocaleDateString()}`, {
            x: 50, y: 80, size: 12, font: fontRegular, color: navy,
        });

        // 6. TENGENEZA BACK PAGE (Ukurasa wa Mwisho)
        const backPage = pdfDoc.addPage([width, height]);
        backPage.drawRectangle({ x: 0, y: 0, width, height, color: white });
        backPage.drawRectangle({ x: 0, y: 0, width, height: 20, color: navy });
        
        // Nyota za Siri
        backPage.drawText('CONFIDENTIAL DOCUMENT', {
            x: width / 2 - 70, y: height - 100, size: 14, font: fontBold, color: gold,
        });
        backPage.drawText('This document contains proprietary information of MAK DC Investment Company LTD.', {
            x: 50, y: height - 130, size: 10, font: fontRegular, color: navy,
        });

        // Sahihi
        backPage.drawText('APPROVED & SIGNED BY:', {
            x: 50, y: height - 300, size: 14, font: fontBold, color: navy,
        });
        backPage.drawText('_____________________________', {
            x: 50, y: height - 380, size: 14, font: fontRegular, color: navy,
        });
        backPage.drawText('Chief Executive Officer', {
            x: 50, y: height - 400, size: 12, font: fontRegular, color: navy,
        });
        backPage.drawText('MAK DC Investment Company LTD', {
            x: 50, y: 80, size: 10, font: fontRegular, color: gold,
        });

        // 7. Hifadhi na Download
        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.title}_OfficialBook.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        modernToast('✅ Downloaded', 'Book with cover & back pages generated.', 'success');

    } catch (err) {
        console.error('Generate Book Error:', err);
        modernToast('Error', 'Failed to generate book: ' + err.message, 'error');
    }
}

// Helper ya kugawanya maandishi marefu
function splitText(text, maxLength) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    if (currentLine.trim()) lines.push(currentLine.trim());
    return lines;
}
// Chukua logo kutoka HTML na uibadilishe kuwa Base64
async function getLogoBase64() {
    const img = document.querySelector('img[src*="makdc-logo"]');
    if (!img) return null;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1]; // Toa base64 tu
}
// ================================================================
// 📊 CEO: MANAGER REPORTS REVIEW
// ================================================================

async function loadCeoManagerReports() {
    const container = document.getElementById('ceoManagerReportsContainer');
    if (!container) return;

    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading reports...</div></div>`;

    try {
        const reports = await API.getManagerReports();
        
        const pending = reports.filter(r => r.status === 'Pending CEO');
        const reviewed = reports.filter(r => r.status === 'Reviewed');

        // Sasisha KPIs
        setElText('ceoStatTotalReports', reports.length);
        setElText('ceoStatPendingReports', pending.length);
        setElText('ceoStatReviewedReports', reviewed.length);

        if (reports.length === 0) {
            container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">📭</div><div class="mes-title">No Reports Yet</div><div class="mes-desc">Reports submitted by Managers will appear here.</div></div>`;
            return;
        }

        // Panga: Pending kwanza, kisha Reviewed
        const sorted = [...reports].sort((a, b) => {
            if (a.status === 'Pending CEO' && b.status !== 'Pending CEO') return -1;
            if (a.status !== 'Pending CEO' && b.status === 'Pending CEO') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        container.innerHTML = sorted.map(r => {
            const statusInfo = {
                'Pending CEO': { icon: '⏳', label: 'Pending Your Review', color: '#d97706', badge: 'gold' },
                'Reviewed': { icon: '✅', label: 'Reviewed', color: '#16a34a', badge: 'green' },
                'Draft': { icon: '📝', label: 'Draft', color: '#64748b', badge: 'navy' }
            }[r.status] || { icon: '📝', label: r.status, color: '#64748b', badge: 'navy' };

            const dateRange = `${new Date(r.startDate).toLocaleDateString('en-GB')} → ${new Date(r.endDate).toLocaleDateString('en-GB')}`;
            const statusClass = r.status === 'Pending CEO' ? 'pending' : r.status === 'Reviewed' ? 'approved' : '';

            let actions = `<button class="mrc-btn primary" onclick="viewCeoManagerReport('${r.id}')">👁️ View Details</button>`;
            
            if (r.status === 'Pending CEO') {
                actions += `<button class="mrc-btn gold" onclick="openCeoReviewReportModal('${r.id}')">💬 Provide Feedback</button>`;
            }

            return `
                <div class="modern-request-card ${statusClass}">
                    <div class="mrc-header">
                        <div class="mrc-title-wrap">
                            <div class="mrc-id-row">
                                <span class="mrc-id">${esc(r.reportId)}</span>
                                <span class="mrc-badge navy">${esc(r.periodType)}</span>
                                <span class="mrc-badge ${statusInfo.badge}">${statusInfo.icon} ${statusInfo.label}</span>
                            </div>
                            <div class="mrc-title">${dateRange}</div>
                            <div class="mrc-meta">
                                <span>👤 Submitted by: <strong>${esc(r.createdBy)}</strong></span>
                                <span>📅 ${r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('en-GB') : '—'}</span>
                            </div>
                            ${r.executiveSummary ? `<div style="margin-top:10px; font-size:13px; color:#64748b; line-height:1.55;">${esc(r.executiveSummary).slice(0, 200)}${r.executiveSummary.length > 200 ? '…' : ''}</div>` : ''}
                            ${r.ceoFeedback ? `<div style="margin-top:10px; font-size:12px; color:#14532d; background:rgba(34,197,94,0.08); padding:8px 12px; border-radius:6px; border-left:3px solid #16a34a;"><strong>💬 Your Feedback:</strong> ${esc(r.ceoFeedback)}</div>` : ''}
                        </div>
                    </div>
                    <div class="mrc-actions">${actions}</div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('loadCeoManagerReports error:', err);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}

// ================================================================
// VIEW REPORT DETAILS (CEO)
// ================================================================
async function viewCeoManagerReport(id) {
    try {
        const r = await API.getManagerReportById(id);
        if (!r) {
            modernToast('Not Found', 'Report not found.', 'error');
            return;
        }

        const m = r.metrics || {};
        const statusInfo = {
            'Pending CEO': { icon: '⏳', label: 'Pending Your Review', color: '#d97706' },
            'Reviewed': { icon: '✅', label: 'Reviewed', color: '#16a34a' },
            'Draft': { icon: '📝', label: 'Draft', color: '#64748b' }
        }[r.status] || { icon: '📝', label: r.status, color: '#64748b' };

        let modal = document.getElementById('ceoViewReportModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'ceoViewReportModal';
        modal.className = 'modal-overlay show';
        modal.style.zIndex = '5000';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:820px; padding:0; overflow:hidden; max-height:94vh; display:flex; flex-direction:column; border-radius:16px;">
                <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a7f5a); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; font-size:18px; font-weight:900;">📊 ${esc(r.reportId)}</h3>
                        <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:4px;">
                            ${esc(r.periodType)} • ${new Date(r.startDate).toLocaleDateString('en-GB')} → ${new Date(r.endDate).toLocaleDateString('en-GB')}
                        </div>
                    </div>
                    <button onclick="document.getElementById('ceoViewReportModal').remove()" style="background:rgba(255,255,255,0.15); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
                </div>
                <div style="padding:24px 26px; overflow-y:auto; flex:1; background:#f8fafc;">
                    <div style="background:${statusInfo.color}15; padding:14px 18px; border-radius:10px; margin-bottom:20px; border-left:4px solid ${statusInfo.color}; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-size:10px; font-weight:800; color:${statusInfo.color}; text-transform:uppercase;">Status</div>
                            <div style="font-size:14px; font-weight:900; color:${statusInfo.color};">${statusInfo.icon} ${statusInfo.label}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Submitted By</div>
                            <div style="font-size:14px; font-weight:800; color:#0f1f3d;">${esc(r.createdBy)}</div>
                        </div>
                    </div>

                    <!-- Metrics -->
                    <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">📈 Performance Metrics</div>
                    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px;">
                        <div style="background:white; padding:14px; border-radius:10px; border-left:3px solid #3b82f6; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">📦 Orders</div>
                            <div style="font-size:22px; font-weight:900; color:#0f1f3d;">${m.orders?.total || 0}</div>
                            <div style="font-size:10px; color:#64748b;">${m.orders?.completed || 0} completed</div>
                        </div>
                        <div style="background:white; padding:14px; border-radius:10px; border-left:3px solid #f59e0b; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">💰 Approvals</div>
                            <div style="font-size:22px; font-weight:900; color:#0f1f3d;">${m.finance?.paymentsCount || 0}</div>
                            <div style="font-size:10px; color:#64748b;">TSh ${(m.finance?.paymentsTotal || 0).toLocaleString()}</div>
                        </div>
                        <div style="background:white; padding:14px; border-radius:10px; border-left:3px solid #10b981; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">📋 Budgets</div>
                            <div style="font-size:22px; font-weight:900; color:#0f1f3d;">${m.budgets?.count || 0}</div>
                            <div style="font-size:10px; color:#64748b;">Reviewed</div>
                        </div>
                        <div style="background:white; padding:14px; border-radius:10px; border-left:3px solid #8b5cf6; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">👥 Staff</div>
                            <div style="font-size:22px; font-weight:900; color:#0f1f3d;">${m.staff?.newHires || 0}</div>
                            <div style="font-size:10px; color:#64748b;">New hires</div>
                        </div>
                    </div>

                    <!-- Narrative Sections -->
                    <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">📝 Narrative</div>
                    ${r.keyActivities ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #f59e0b;"><div style="font-size:11px; font-weight:800; color:#f59e0b; text-transform:uppercase; margin-bottom:6px;">🎯 Key Activities</div><div style="font-size:13px; color:#334155; line-height:1.7;">${esc(r.keyActivities)}</div></div>` : ''}
                    ${r.executiveSummary ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #0f1f3d;"><div style="font-size:11px; font-weight:800; color:#0f1f3d; text-transform:uppercase; margin-bottom:6px;">📊 Executive Summary</div><div style="font-size:13px; color:#334155; line-height:1.7;">${esc(r.executiveSummary)}</div></div>` : ''}
                    ${r.challenges ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #dc2626;"><div style="font-size:11px; font-weight:800; color:#dc2626; text-transform:uppercase; margin-bottom:6px;">⚠️ Challenges</div><div style="font-size:13px; color:#334155; line-height:1.7;">${esc(r.challenges)}</div></div>` : ''}
                    ${r.recommendations ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #16a34a;"><div style="font-size:11px; font-weight:800; color:#16a34a; text-transform:uppercase; margin-bottom:6px;">💡 Recommendations</div><div style="font-size:13px; color:#334155; line-height:1.7;">${esc(r.recommendations)}</div></div>` : ''}
                    
                    ${r.ceoFeedback ? `<div style="background:rgba(34,197,94,0.08); padding:16px; border-radius:10px; border-left:3px solid #16a34a;"><div style="font-size:11px; font-weight:800; color:#16a34a; text-transform:uppercase; margin-bottom:6px;">✅ Your Feedback</div><div style="font-size:13px; color:#14532d; line-height:1.7;">${esc(r.ceoFeedback)}</div></div>` : ''}
                </div>
                <div style="padding:14px 26px; background:white; border-top:1.5px solid #e5e7eb; display:flex; justify-content:flex-end; gap:10px;">
                    <button onclick="document.getElementById('ceoViewReportModal').remove()" style="padding:11px 24px; background:#f1f5f9; color:#475569; border:1.5px solid #e2e8f0; border-radius:8px; font-weight:700; cursor:pointer;">Close</button>
                    ${r.status === 'Pending CEO' ? `<button onclick="document.getElementById('ceoViewReportModal').remove(); openCeoReviewReportModal('${r.id}')" style="padding:11px 24px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer;">💬 Provide Feedback</button>` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}

// ================================================================
// CEO: PROVIDE FEEDBACK
// ================================================================
async function openCeoReviewReportModal(id) {
    const r = await API.getManagerReportById(id);
    if (!r) return;

    let modal = document.getElementById('ceoReviewReportModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'ceoReviewReportModal';
    modal.className = 'modal-overlay show';
    modal.style.zIndex = '6000';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:620px; padding:0; overflow:hidden; border-radius:16px;">
            <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b); padding:22px 28px; color:white; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3 style="margin:0; font-size:18px; font-weight:900;">💬 CEO Feedback</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:4px;">${esc(r.reportId)} — ${esc(r.createdBy)}</div>
                </div>
                <button onclick="document.getElementById('ceoReviewReportModal').remove()" style="background:rgba(255,255,255,0.15); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>
            <div style="padding:24px 28px;">
                <div style="background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; padding:14px 18px; border-radius:10px; margin-bottom:18px;">
                    <div style="font-size:12px; font-weight:900; color:#78350f;">Reviewing Report</div>
                    <div style="font-size:12px; color:#92400e; margin-top:4px;">Provide constructive feedback for the Manager.</div>
                </div>
                <label style="display:block; font-size:11px; font-weight:800; color:#334155; text-transform:uppercase; margin-bottom:6px;">Your Feedback <span style="color:#dc2626;">*</span></label>
                <textarea id="ceoFeedbackInput" rows="6" placeholder="E.g., Excellent work on the budget reviews. Please continue focusing on..." style="width:100%; padding:12px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:13px; resize:vertical; line-height:1.6;"></textarea>
            </div>
            <div style="padding:16px 28px; background:#f8fafc; border-top:1.5px solid #e5e7eb; display:flex; justify-content:flex-end; gap:12px;">
                <button onclick="document.getElementById('ceoReviewReportModal').remove()" style="padding:11px 24px; background:white; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:700; cursor:pointer;">Cancel</button>
                <button onclick="submitCeoReportFeedback('${r.id}')" style="padding:11px 24px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(22,163,74,0.3);">✅ Submit Feedback</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function submitCeoReportFeedback(id) {
    const input = document.getElementById('ceoFeedbackInput');
    const feedback = input.value.trim();

    if (!feedback) {
        input.style.borderColor = '#dc2626';
        input.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.15)';
        input.focus();
        return;
    }

    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Submitting...';

    try {
        await API.reviewManagerReport(id, feedback);
        modernToast('✅ Submitted', 'Feedback sent to Manager.', 'success');
        document.getElementById('ceoReviewReportModal').remove();
        await loadCeoManagerReports();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '✅ Submit Feedback';
    }
}

// Hook kwenye switchTab ya CEO
(function hookCeoReports() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__ceoReportsHooked) return;
    const wrapped = function(tabId) {
        const result = _orig.call(this, tabId);
        if (tabId === 'tab-manager-reports') loadCeoManagerReports();
        return result;
    };
    wrapped.__ceoReportsHooked = true;
    window.switchTab = wrapped;
})();
// ================================================================
// 🆕 COMPANY PULSE (Live Activity Feed) - INAVUTA KUTOKA API
// ================================================================
async function loadCompanyPulse() {
    const feedContainer = document.getElementById('companyPulseFeed');
    if (!feedContainer) return;

    feedContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">⏳ Fetching live data...</div>';

    try {
        // 1. Vuta data kutoka API zote kwa pamoja
        const [payments, requests, batches, accounts, employees] = await Promise.all([
            API.getCompanyPayments().catch(() => []),
            API.getProcurementRequests('/all').catch(() => []),
            API.getProductionBatches({ limit: 10 }).catch(() => []),
            API.getAccounts().catch(() => []),
            API.getEmployees().catch(() => [])
        ]);

        // 2. Hesabu idadi kwa ajili ya kadi za juu
        const pendingPayments = payments.filter(p => p.status === 'pending-ceo').length;
        const pendingRequests = requests.filter(r => r.status === 'pending-ceo').length;
        const pendingAccounts = accounts.filter(a => a.status === 'pending-ceo').length;
        const activeStaff = employees.filter(e => e.status === 'Active').length;

        // Sasisha UI za kadi
        document.getElementById('pulseFinStatus').textContent = pendingPayments;
        document.getElementById('pulseProcStatus').textContent = pendingRequests;
        document.getElementById('pulseProdStatus').textContent = batches.length > 0 ? batches[0].quantityGood + " units" : "0 units";
        document.getElementById('pulseHRStatus').textContent = activeStaff;
        // 3. Tengeneza Activity Feed kutoka data zote
        let activities = [];

        // 3a. Malipo (Finance)
        payments.slice(0, 10).forEach(p => {
            activities.push({
                icon: p.status === 'pending-ceo' ? '⏳' : (p.status === 'approved' ? '✅' : '❌'),
                color: p.status === 'pending-ceo' ? '#f59e0b' : (p.status === 'approved' ? '#2ecc71' : '#ef4444'),
                text: `<strong>Finance</strong> submitted payment request <code>${p.reference}</code> for <strong>TSh ${Number(p.amount).toLocaleString()}</strong>`,
                time: new Date(p.createdAt),
                status: p.status
            });
        });

        // 3b. Maombi ya Manunuzi (Procurement)
        requests.slice(0, 10).forEach(r => {
            activities.push({
                icon: r.status === 'pending-ceo' ? '📋' : (['approved', 'paid'].includes(r.status) ? '✅' : '⏳'),
                color: r.status === 'pending-ceo' ? '#8b5cf6' : (['approved', 'paid'].includes(r.status) ? '#2ecc71' : '#64748b'),
                text: `<strong>Procurement</strong> needs approval for <strong>${esc(r.title || r.requestNumber)}</strong> (TSh ${Number(r.totalAmount).toLocaleString()})`,
                time: new Date(r.createdAt),
                status: r.status
            });
        });

        // 3c. Uzalishaji (Production)
        batches.slice(0, 10).forEach(b => {
            activities.push({
                icon: '🏭',
                color: '#3b82f6',
                text: `<strong>Production</strong> completed batch <strong>${esc(b.batchNo)}</strong> (${b.quantityGood} good units)`,
                time: new Date(b.productionDate),
                status: b.status
            });
        });

        // 3d. Account mpya
        accounts.slice(0, 5).forEach(a => {
            activities.push({
                icon: '🏛️',
                color: '#14b8a6',
                text: `<strong>Finance</strong> added new account <strong>${esc(a.name)}</strong>`,
                time: new Date(a.createdAt),
                status: a.status
            });
        });

        // 4. Panga kwa muda (Mpya mbele)
        activities.sort((a, b) => b.time - a.time);

        // 5. Onyesha kwenye Feed
        if (activities.length === 0) {
            feedContainer.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">There is no recent activity today.</div>';
            return;
        }

        feedContainer.innerHTML = activities.slice(0, 15).map(act => `
            <div class="activity-item">
                <div class="activity-icon" style="background:${act.color}20; color:${act.color};">
                    ${act.icon}
                </div>
                <div class="activity-content">
                    <div class="activity-text">${act.text}</div>
                    <div class="activity-time">${getTimeAgo(act.time)}</div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Pulse error:', err);
        feedContainer.innerHTML = `<div style="color:#dc2626;text-align:center;padding:20px;">❌ ${err.message}</div>`;
    }
}

// ================================================================
// 🆕 LOAD KPIs (Kutoka API)
// ================================================================
async function loadKPIs() {
    try {
        // Vuta data muhimu kwa KPIs
        const [orders, batches, productionSummary] = await Promise.all([
            API.getOrders().catch(() => []),
            API.getProductionBatches({ limit: 100 }).catch(() => []),
            API.getProductionSummary().catch(() => null)
        ]);

        // 1. Total Orders
        const totalOrders = orders.length;
        document.getElementById('kpiTotalOrders').textContent = totalOrders;

        // 2. Total Revenue (Kutoka Orders zilizolipwa)
        const totalRevenue = orders
            .filter(o => ['paid', 'completed'].includes(o.status))
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        document.getElementById('kpiTotalRevenue').textContent = 'TSh ' + totalRevenue.toLocaleString();

        // 3. Total Produced (Kutoka batches)
        const totalProduced = batches.reduce((sum, b) => sum + Number(b.quantityProduced || 0), 0);
        document.getElementById('kpiTotalProduction').textContent = totalProduced.toLocaleString();

        // 4. Waste Percentage
        const totalDamaged = batches.reduce((sum, b) => sum + Number(b.quantityDamaged || 0), 0);
        const wastePercent = totalProduced > 0 ? (totalDamaged / totalProduced) * 100 : 0;
        document.getElementById('kpiTotalDamaged').textContent = wastePercent.toFixed(1) + '%';

    } catch (err) {
        console.error('KPI error:', err);
    }
}

// Helper ya muda
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
}
function toggleSidebarDropdown(element, event) {
    if (event) event.preventDefault();
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        sidebar.classList.remove('collapsed');
        return;
    }
    const submenu = element.nextElementSibling;
    document.querySelectorAll('.sidebar-nav-parent.open').forEach(parent => {
        if (parent !== element) {
            parent.classList.remove('open');
            if (parent.nextElementSibling) parent.nextElementSibling.classList.remove('open');
        }
    });
    element.classList.toggle('open');
    if (submenu) submenu.classList.toggle('open');
}
// ================================================================
// 🆕 PULSE MODALS (Drill-down Details in English)
// ================================================================
async function openPulseModal(type) {
    let modal = document.getElementById('pulseDetailModal');
    if (modal) modal.remove();

    // Create Modal Structure
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="pulseDetailModal" style="z-index: 60000;">
            <div class="modal-box" style="max-width: 800px; padding: 0; overflow: hidden; border-radius: 20px; display: flex; flex-direction: column; max-height: 92vh; box-shadow: 0 25px 80px rgba(0,0,0,0.4);">
                <div id="pulseModalHeader" style="padding: 20px 26px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                    <h3 id="pulseModalTitle" style="font-size: 18px; font-weight: 900; margin: 0;">Details</h3>
                    <button onclick="closeModal('pulseDetailModal')" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 34px; height: 34px; border-radius: 50%; font-size: 18px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.8)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">✕</button>
                </div>
                <div id="pulseModalBody" style="padding: 24px 26px; overflow-y: auto; flex: 1; background: #f8fafc;">
                    <div style="text-align: center; padding: 40px; color: #94a3b8; font-weight: 600;">⏳ Fetching live data...</div>
                </div>
            </div>
        </div>
    `);

    const header = document.getElementById('pulseModalHeader');
    const title = document.getElementById('pulseModalTitle');
    const body = document.getElementById('pulseModalBody');

    // Set Theme & Title based on Type
    if (type === 'production') {
        header.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        title.innerHTML = '🏭 Production Details';
    } else if (type === 'finance') {
        header.style.background = 'linear-gradient(135deg, #10b981, #047857)';
        title.innerHTML = '💰 Finance Approvals';
    } else if (type === 'procurement') {
        header.style.background = 'linear-gradient(135deg, #f59e0b, #b45309)';
        title.innerHTML = '🛒 Procurement Requests';
    } else if (type === 'staff') {
        header.style.background = 'linear-gradient(135deg, #8b5cf6, #6d28d9)';
        title.innerHTML = '👥 Staff Directory';
    }

    try {
        // Fetch and Render Data based on Type
        if (type === 'production') {
            const batches = await API.getProductionBatches({ limit: 50 }) || [];
            if (batches.length === 0) {
                body.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-weight:600;">📭 No production batches recorded yet.</div>';
                return;
            }
            body.innerHTML = batches.map(b => `
                <div style="background: white; border-radius: 12px; padding: 18px; margin-bottom: 14px; border: 1px solid #e2e8f0; border-left: 4px solid #3b82f6; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-family: 'Courier New', monospace; font-weight: 900; color: #0f1f3d; font-size: 15px;">${esc(b.batchNo || 'N/A')}</span>
                                ${b.qcStatus ? `<span style="font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 6px; background: ${b.qcStatus === 'passed' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)'}; color: ${b.qcStatus === 'passed' ? '#16a34a' : '#d97706'}; text-transform: uppercase;">QC: ${esc(b.qcStatus)}</span>` : ''}
                            </div>
                            <div style="font-weight: 700; color: #1e293b; margin-top: 6px; font-size: 14px;">${esc(b.product?.name || 'Unknown Product')}</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 4px;">📅 ${new Date(b.productionDate || Date.now()).toLocaleString()}</div>
                        </div>
                        <div style="text-align: right; background: #f8fafc; padding: 8px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 18px; font-weight: 900; color: #16a34a;">${b.quantityGood || 0} <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Good</span></div>
                            <div style="font-size: 13px; font-weight: 700; color: #dc2626; margin-top: 2px;">${b.quantityDamaged || 0} <span style="font-size: 11px; color: #64748b; text-transform: uppercase;">Damaged</span></div>
                        </div>
                    </div>
                </div>
            `).join('');

        } else if (type === 'finance') {
            const payments = await API.getCompanyPayments() || [];
            const pending = payments.filter(p => p.status === 'pending-ceo');
            if (pending.length === 0) {
                body.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-weight:600;">✅ No payments pending your approval.</div>';
                return;
            }
            body.innerHTML = pending.map(p => `
                <div style="background: white; border-radius: 12px; padding: 18px; margin-bottom: 14px; border: 1px solid #e2e8f0; border-left: 4px solid #f59e0b; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-family: monospace; font-weight: 800; color: #0f1f3d; font-size: 15px;">${esc(p.reference || 'N/A')}</div>
                            <div style="font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600;">👤 Vendor: ${esc(p.vendor || 'N/A')}</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">📅 ${new Date(p.createdAt || Date.now()).toLocaleDateString()}</div>
                        </div>
                        <div style="font-size: 20px; font-weight: 900; color: #0f1f3d; font-family: 'Courier New', monospace;">
                            TSh ${Number(p.amount || 0).toLocaleString()}
                        </div>
                    </div>
                </div>
            `).join('');

        } else if (type === 'procurement') {
            const requests = await API.getProcurementRequests('/all') || [];
            const pending = requests.filter(r => r.status === 'pending-ceo');
            if (pending.length === 0) {
                body.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-weight:600;">✅ No procurement requests pending your approval.</div>';
                return;
            }
            body.innerHTML = pending.map(r => `
                <div style="background: white; border-radius: 12px; padding: 18px; margin-bottom: 14px; border: 1px solid #e2e8f0; border-left: 4px solid #8b5cf6; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-family: monospace; font-weight: 800; color: #0f1f3d; font-size: 15px;">${esc(r.request_number || 'N/A')}</div>
                            <div style="font-size: 14px; color: #1e293b; font-weight: 700; margin-top: 4px;">${esc(r.title || 'Untitled Request')}</div>
                            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">🏢 ${esc(r.department || 'N/A')}</div>
                        </div>
                        <div style="font-size: 20px; font-weight: 900; color: #0f1f3d; font-family: 'Courier New', monospace;">
                            TSh ${Number(r.total_amount || 0).toLocaleString()}
                        </div>
                    </div>
                </div>
            `).join('');

        } else if (type === 'staff') {
            const employees = await API.getEmployees() || [];
            const active = employees.filter(e => e.status === 'Active');
            if (active.length === 0) {
                body.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-weight:600;">📭 No active staff members found.</div>';
                return;
            }
            body.innerHTML = active.map(e => `
                <div style="background: white; border-radius: 12px; padding: 16px 18px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 800; color: #0f1f3d; font-size: 15px;">${esc(e.fullName)}</div>
                            <div style="font-size: 13px; color: #475569; margin-top: 4px; font-weight: 600;">${esc(e.position)} • ${esc(e.department)}</div>
                        </div>
                        <div style="font-family: monospace; font-size: 13px; color: #3b82f6; font-weight: 800; background: rgba(59,130,246,0.1); padding: 4px 10px; border-radius: 6px;">
                            ${esc(e.employeeId)}
                        </div>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        body.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;font-weight:600;">❌ Failed to load data: ${esc(err.message)}</div>`;
    }
}
// ================================================================
// 📊 CEO KPIs (Charts & Metrics)
// ================================================================
let kpiRevenueChart = null;
let kpiWasteChart = null;
let kpiDeptChart = null;

async function loadKPIs() {
    try {
        // Vuta data zote kwa pamoja
        const [orders, batches, payments, requests] = await Promise.all([
            API.getOrders().catch(() => []),
            API.getProductionBatches({ limit: 100 }).catch(() => []),
            API.getCompanyPayments().catch(() => []),
            API.getProcurementRequests('/all').catch(() => [])
        ]);

        // ===== 1. Kadi za Juu =====
        const totalOrders = orders.length;
        const totalRevenue = orders
            .filter(o => ['paid', 'completed'].includes(o.status))
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        const totalProduced = batches.reduce((sum, b) => sum + Number(b.quantityProduced || 0), 0);
        const totalDamaged = batches.reduce((sum, b) => sum + Number(b.quantityDamaged || 0), 0);
        const wastePercent = totalProduced > 0 ? (totalDamaged / totalProduced) * 100 : 0;

        document.getElementById('kpiTotalOrders').textContent = totalOrders;
        document.getElementById('kpiTotalRevenue').textContent = 'TSh ' + totalRevenue.toLocaleString();
        document.getElementById('kpiTotalProduction').textContent = totalProduced.toLocaleString();
        document.getElementById('kpiTotalDamaged').textContent = wastePercent.toFixed(1) + '%';

        // ===== 2. Chati ya Revenue & Production (Miezi 6) =====
        renderRevenueChart(orders, batches);

        // ===== 3. Chati ya Waste (Doughnut) =====
        renderWasteChart(totalProduced - totalDamaged, totalDamaged);

        // ===== 4. Chati ya Idara (Bar) =====
        const deptStats = {
            'Finance': payments.filter(p => p.status === 'pending-ceo').length,
            'Procurement': requests.filter(r => r.status === 'pending-ceo').length,
            'Production': batches.filter(b => b.qcStatus === 'pending').length,
            'HR/Admin': 0
        };
        renderDeptChart(deptStats);

    } catch (err) {
        console.error('KPI error:', err);
    }
}

// Chati 1: Revenue & Production Trend
function renderRevenueChart(orders, batches) {
    const ctx = document.getElementById('kpiRevenueChart');
    if (!ctx) return;
    if (kpiRevenueChart) kpiRevenueChart.destroy();

    const months = [];
    const revenueData = [];
    const productionData = [];

    // Tengeneza data kwa miezi 6 iliyopita
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString('en-US', { month: 'short' });
        months.push(monthName);

        // Revenue kwa mwezi huo
        const monthRevenue = orders
            .filter(o => {
                const oDate = new Date(o.createdAt || Date.now());
                return oDate.getMonth() === d.getMonth() && oDate.getFullYear() === d.getFullYear();
            })
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
        revenueData.push(monthRevenue);

        // Production kwa mwezi huo
        const monthProduction = batches
            .filter(b => {
                const bDate = new Date(b.productionDate || Date.now());
                return bDate.getMonth() === d.getMonth() && bDate.getFullYear() === d.getFullYear();
            })
            .reduce((sum, b) => sum + Number(b.quantityGood || 0), 0);
        productionData.push(monthProduction);
    }

    kpiRevenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Revenue (TSh)',
                    data: revenueData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Production (Units)',
                    data: productionData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderDash: [5, 5],
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: { callback: (value) => 'TSh ' + (value / 1000) + 'K' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Chati 2: Waste (Doughnut)
function renderWasteChart(good, damaged) {
    const ctx = document.getElementById('kpiWasteChart');
    if (!ctx) return;
    if (kpiWasteChart) kpiWasteChart.destroy();

    kpiWasteChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Good Products', 'Damaged/Waste'],
            datasets: [{
                data: [good, damaged],
                backgroundColor: ['#2ecc71', '#ef4444'],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Chati 3: Departmental Activity (Bar)
function renderDeptChart(stats) {
    const ctx = document.getElementById('kpiDeptChart');
    if (!ctx) return;
    if (kpiDeptChart) kpiDeptChart.destroy();

    kpiDeptChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(stats),
            datasets: [{
                label: 'Pending Items',
                data: Object.values(stats),
                backgroundColor: ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'],
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}
// ================================================================
// 🆕 KPI TARGET MANAGEMENT (CEO)
// ================================================================
let selectedKpiMetrics = []; // Hifadhi metrics zilizochaguliwa
let draftKpiIdsToRelease = []; // Hifadhi IDs za draft

// 1. Fungua Modal na Setup Tarehe
function openKpiModal() {
    document.getElementById('setKpiTargetModal').classList.add('show');
    
    // Setup Year Dropdown
    const yearSelect = document.getElementById('kpiSelectYear');
    yearSelect.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i <= currentYear + 2; i++) {
        yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }

    // Reset Form
    document.getElementById('kpiSelectRole').value = '';
    document.getElementById('kpiSelectEmployee').innerHTML = '<option value="">-- Select Role First --</option>';
    document.getElementById('kpiMetricsContainer').innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 13px; padding: 20px 0;">Select a role to load available metrics.</div>';
    document.getElementById('kpiTargetNotes').value = '';
    selectedKpiMetrics = [];
}

// 2. Pata Wafanyakazi kulingana na Role
async function loadKpiEmployees() {
    const role = document.getElementById('kpiSelectRole').value;
    const empSelect = document.getElementById('kpiSelectEmployee');
    
    empSelect.innerHTML = '<option value="">⏳ Loading...</option>';

    if (!role) {
        empSelect.innerHTML = '<option value="">-- Select Role First --</option>';
        return;
    }

    try {
        const users = await API.getUsers(); 

        // Chuja: Tumia includes() ili ikamate hata kama jina limeandikwa kifupi
        const filtered = users.filter(u => {
            if (!u.department) return false;
            
            // Mfano: role ni "Engineering and Production Department", 
            // na u.department ni "Engineering" -> Itakubali kwa sababu "Engineering" ipo ndani ya role
            const roleLower = role.toLowerCase();
            const deptLower = u.department.toLowerCase();
            
            // Kama dept ipo ndani ya role au role ipo ndani ya dept
            const isMatchDept = roleLower.includes(deptLower) || deptLower.includes(roleLower);
            
            const isActive = u.status === 'Active' || u.status === 'active';
            const isNotSuperAdmin = u.role !== 'SuperAdmin'; 
            
            return isMatchDept && isActive && isNotSuperAdmin;
        });

        empSelect.innerHTML = '<option value="">-- Select Employee --</option>';
        
        if (filtered.length === 0) {
            // Kama bado haipo, onyesha majina yote ya departments yaliyopo kwenye database kwa ajili ya kude-bug
            const availableDepts = [...new Set(users.map(u => u.department).filter(Boolean))].join(', ');
            empSelect.innerHTML = `<option value="">⚠️ No match. DB has: ${availableDepts}</option>`;
        } else {
            filtered.forEach(user => {
                empSelect.innerHTML += `<option value="${user.id}" data-name="${user.fullName}">${user.fullName} (${user.role})</option>`;
            });
        }

        loadMetricsForRole(role);

    } catch (err) {
        console.error(err);
        empSelect.innerHTML = `<option value="">❌ Error: ${err.message}</option>`;
    }
}
// 3. Pakia Vipimo (Metrics) kulingana na Role
async function loadMetricsForRole(role) {
    const container = document.getElementById('kpiMetricsContainer');
    container.innerHTML = '<div style="text-align: center; color: #3b82f6; font-size: 13px; padding: 20px 0;">⏳ Loading metrics...</div>';

    try {
        let metrics = [];
        
        // 🆕 Bypass kwa ajili ya Engineer
        if (role === 'Engineering' || role === 'Production' || role === 'Engineering and Production Department') {
            metrics = [
                { type: 'OUTPUT_UNITS', label: 'Output Units', unit: 'units' },
                { type: 'WASTE_PERCENT', label: 'Waste %', unit: '%' },
                { type: 'QC_PASS_RATE', label: 'QC Pass Rate', unit: '%' },
                { type: 'RELEASE_RATE', label: 'Release Rate', unit: '%' },
                { type: 'MATERIAL_EFFICIENCY', label: 'Material Efficiency', unit: 'units/kg' },
                { type: 'BATCHES_COMPLETED', label: 'Batches Completed', unit: 'batches' }
            ];
        } else {
            // Kwa ajili ya wengine, tunatumia API kama kawaida
            metrics = await API.getAvailableMetrics(role); 
        }

        if (!metrics || metrics.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 13px; padding: 20px 0;">No metrics available for this role yet.</div>';
            return;
        }

        // ... (baki ya code ya kuchora HTML ipo palepale kama nilivyokupa)
        let html = '';
        metrics.forEach((m, index) => {
            html += `
                <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9;">
                    <input type="checkbox" id="metric_check_${index}" onchange="toggleMetricInput(${index})" style="width: 18px; height: 18px; accent-color: #1a7f5a; cursor: pointer;">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; color: #1e293b; font-size: 14px;">${m.label}</div>
                    </div>
                    <div style="width: 150px; display: flex; align-items: center; gap: 8px;">
                        <input type="number" id="metric_val_${index}" disabled placeholder="Target" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px;" onchange="updateSelectedMetric(${index}, '${m.type}', '${m.label}', '${m.unit}')">
                        <span style="font-size: 12px; color: #64748b; font-weight: 600; width: 40px;">${m.unit}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;

    } catch (err) {
        container.innerHTML = `<div style="text-align: center; color: #ef4444; font-size: 13px; padding: 20px 0;">❌ Error: ${err.message}</div>`;
    }
}
// 4. Toggle Checkbox ya Metric
function toggleMetricInput(index) {
    const checkbox = document.getElementById(`metric_check_${index}`);
    const input = document.getElementById(`metric_val_${index}`);
    
    if (checkbox.checked) {
        input.disabled = false;
        input.focus();
    } else {
        input.disabled = true;
        input.value = '';
        // Remove from selected array
        selectedKpiMetrics = selectedKpiMetrics.filter(m => m.index !== index);
    }
}

// 5. Hifadhi Metric iliyochaguliwa
function updateSelectedMetric(index, type, label, unit) {
    const value = parseFloat(document.getElementById(`metric_val_${index}`).value);
    if (isNaN(value) || value <= 0) return;

    // Remove existing kama ipo
    selectedKpiMetrics = selectedKpiMetrics.filter(m => m.index !== index);
    
    // Add mpya
    selectedKpiMetrics.push({ index, type, label, unit, targetValue: value });
}

// 6. Save as Draft (Submit kwa Backend)
async function saveKpiDraft(btn) {
    if (isSavingKpiDraft) return; 
    isSavingKpiDraft = true;

    const role = document.getElementById('kpiSelectRole').value;
    const empSelect = document.getElementById('kpiSelectEmployee');
    const employeeId = empSelect.value;
    const employeeName = empSelect.options[empSelect.selectedIndex]?.dataset.name;
    
    const month = document.getElementById('kpiSelectMonth').value;
    const year = document.getElementById('kpiSelectYear').value;
    const notes = document.getElementById('kpiTargetNotes').value.trim();
    const statusDiv = document.getElementById('kpiTargetFormStatus');

    const showError = (msg) => {
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = msg;
        isSavingKpiDraft = false; // Reset flag kama kuna kosa
    };

    if (!role) return showError('⚠ Please select a role.');
    if (!employeeId) return showError('⚠ Please select an employee.');
    if (selectedKpiMetrics.length === 0) return showError('⚠ Please select at least one metric and set a target value.');
    
    const validMetrics = selectedKpiMetrics.filter(m => m.targetValue > 0);
    if (validMetrics.length === 0) return showError('⚠ Target values cannot be zero.');

    const period = `${year}-${month}`;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const periodLabel = `${monthNames[parseInt(month)-1]} ${year}`;

    const payload = {
        employeeId: parseInt(employeeId),
        employeeName: employeeName,
        department: role,
        role: role,
        kpis: validMetrics.map(m => ({
            metricType: m.type,
            metricLabel: m.label,
            metricUnit: m.unit,
            targetValue: m.targetValue
        })),
        period: period,
        periodLabel: periodLabel,
        periodType: 'monthly',
        notes: notes,
        createdBy: currentUser?.fullName || 'CEO',
        createdById: currentUser?.userId || currentUser?.id
    };

    const original = setButtonLoading(btn, '⏳ Saving...');

    try {
        const res = await API.createEmployeeKpi(payload);
        
        // Hifadhi IDs za draft kwa ajili ya kurelease baadaye
        draftKpiIdsToRelease = res.kpis.map(k => k.id);

        closeModal('setKpiTargetModal');
        
        // 🆕 Success Dialog
        showSuccessDialog(
            '💾 Draft Saved!', 
            `Targets for <strong>${employeeName}</strong> have been saved as a draft.<br><br>Click "Continue" to view and release them.`, 
            () => {
                openDraftsModal(res.kpis); // Fungua modal ya kuona drafts na kurelease
            }
        );

    } catch (err) {
        showError(`❌ ${err.message}`);
        restoreButton(btn, original);
    } finally {
        isSavingKpiDraft = false; // Reset flag baada ya kumaliza
    }
}
// 7. Fungua Modal ya Drafts
function openDraftsModal(kpis) {
    const container = document.getElementById('draftKpisList');
    container.innerHTML = '';

    kpis.forEach(kpi => {
        container.innerHTML += `
            <div style="background: white; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 12px; border-left: 4px solid #f59e0b;">
                <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase;">Target</div>
                <div style="font-size: 15px; font-weight: 800; color: #1e293b; margin: 4px 0;">${kpi.metricLabel}</div>
                <div style="font-size: 20px; font-weight: 900; color: #f59e0b;">${kpi.targetValue.toLocaleString()} <span style="font-size: 14px; color: #64748b;">${kpi.metricUnit}</span></div>
            </div>
        `;
    });

    document.getElementById('viewDraftsModal').classList.add('show');
}

// 8. Release Drafts kwa Mfanyakazi
async function releaseDraftKpis(btn) {
    if (isReleasingKpi) return; // 🛡 Kizuizi cha double-click
    if (draftKpiIdsToRelease.length === 0) return;
    
    isReleasingKpi = true;
    const original = setButtonLoading(btn, '⏳ Releasing...');

    try {
        await API.releaseEmployeeKpis(
            draftKpiIdsToRelease, 
            currentUser?.fullName || 'CEO', 
            currentUser?.userId || currentUser?.id
        );
        
        closeModal('viewDraftsModal');
        
        // 🆕 Success Dialog
        showSuccessDialog(
            '🚀 Targets Released!', 
            `${draftKpiIdsToRelease.length} target(s) have been successfully sent to the employee.`,
            () => {
                draftKpiIdsToRelease = []; // Safisha array
            }
        );

    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
        restoreButton(btn, original);
    } finally {
        isReleasingKpi = false; // Reset flag
    }
}
// ================================================================
// 🆕 HELPERS: Button Loading State & Success Dialog
// ================================================================
function setButtonLoading(btn, loadingText = '⏳ Processing...') {
    if (!btn) return null;
    const original = {
        html: btn.innerHTML,
        disabled: btn.disabled
    };
    btn.disabled = true;
    btn.innerHTML = loadingText;
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';
    return original;
}

function restoreButton(btn, original) {
    if (!btn || !original) return;
    btn.disabled = original.disabled;
    btn.innerHTML = original.html;
    btn.style.opacity = '';
    btn.style.cursor = '';
}

// 🆕 Success Dialog (Inafanana na design ya dashboard)
function showSuccessDialog(title, message, onClose) {
    const existing = document.getElementById('successDialogModal');
    if (existing) existing.remove();

    const modalHTML = `
        <div class="modal-overlay show" id="successDialogModal" style="z-index: 60000;">
            <div style="background:white; border-radius:20px; max-width:400px; width:100%; text-align:center; padding:32px 28px; box-shadow:0 25px 60px rgba(0,0,0,0.3); animation: modalIn 0.3s ease;">
                <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #1a7f5a, #0f2942); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; box-shadow:0 8px 24px rgba(26,127,90,0.4); border: 3px solid #2ecc71;">
                    <span style="font-size:40px; color:#2ecc71;">✔</span>
                </div>
                <h3 style="font-size:22px; font-weight:900; color:#1a7f5a; margin:0 0 10px 0;">${title}</h3>
                <p style="font-size:14px; color:#64748b; line-height:1.6; margin:0 0 24px 0;">${message}</p>
                <button id="successDialogBtn" style="width:100%; padding:14px; background:linear-gradient(135deg, #1a7f5a, #0f2942); color:white; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer; transition:transform 0.2s; border: 1.5px solid #2ecc71;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    Understood
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('successDialogBtn').addEventListener('click', () => {
        document.getElementById('successDialogModal').remove();
        if (typeof onClose === 'function') onClose();
    });
}
// ================================================================
// 🆕 CEO: RELEASED TARGETS TAB (Table View na Search)
// ================================================================
let allReleasedKpisData = []; // Hifadhi data yote kwa ajili ya kuchuja (filter)

async function loadReleasedKpisTab() {
    const container = document.getElementById('releasedKpisContainer');
    if (!container) return;

    // 1. Onyesha Loading State nzuri
    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #64748b;">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5; animation: spin 1s linear infinite;">⏳</div>
            <div style="font-weight: 700;">Fetching performance data...</div>
            <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </div>`;

    try {
        // 2. Jaza Kichujio cha Mwezi (Kama bado hakijajazwa)
        const periodSelect = document.getElementById('filterCeoPeriod');
        if (periodSelect && periodSelect.options.length <= 1) {
            populateCeoKpiPeriodSelector();
        }

        // 3. Vuta Data Zote
        const allKpis = await API.getEmployeeKpis(); 
        
        // 4. Chuja (Filter): Chukua zilizoreleased TU
        allReleasedKpisData = (allKpis || []).filter(k => k.status === 'released');

        // 5. Kama hakuna data, onyesha ujumbe wa Empty State
        if (allReleasedKpisData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <div style="font-size: 56px; margin-bottom: 16px; opacity: 0.6;">📭</div>
                    <div style="font-size: 18px; font-weight: 800; color: #334155;">No Targets Released Yet</div>
                    <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Targets you release to employees will appear here for tracking.</div>
                </div>
            `;
            return;
        }

        // 6. Chora Jedwali
        renderReleasedKpisTable(allReleasedKpisData);

    } catch (err) {
        console.error('Error fetching released targets:', err);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
                <div style="font-size: 30px; margin-bottom: 10px;">❌</div>
                <div style="font-weight: 800; color: #b91c1c;">Failed to load data</div>
                <div style="font-size: 13px; color: #7f1d1d; margin-top: 4px;">${err.message}</div>
            </div>`;
    }
}
function populateCeoKpiPeriodSelector() {
    const select = document.getElementById('filterCeoPeriod');
    if (!select) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let options = '<option value="">📅 All Months</option>';

    for (let year = currentYear; year >= currentYear - 1; year--) {
        for (let m = 11; m >= 0; m--) {
            const monthValue = `${year}-${String(m + 1).padStart(2, '0')}`;
            const label = `${monthNames[m]} ${year}`;
            options += `<option value="${monthValue}">${label}</option>`;
        }
    }

    select.innerHTML = options;
}
// Function ya Kuchora Jedwali
function renderReleasedKpisTable(kpis) {
    const container = document.getElementById('releasedKpisContainer');
    if (!container) return;

    if (kpis.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;">No targets match your search/filter.</div>`;
        return;
    }
    let rowsHtml = '';

    kpis.forEach((kpi, index) => {
        let percentage = 0;
        let statusColor = '#64748b'; 
        let statusText = 'Pending';
        let bgStatus = '#f1f5f9';
        let statusKey = 'pending';

        if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
            if (kpi.metricType === 'WASTE_PERCENT') {
                percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
            } else {
                percentage = (kpi.actualValue / kpi.targetValue) * 100;
            }
            percentage = Math.round(percentage);
            
            // 🆕 FIX: Kama amezidi 100%
            if (percentage > 100) {
                statusColor = '#8b5cf6'; // Zambarau kwa Over Performance
                bgStatus = '#f5f3ff'; 
                statusText = `🔥 Over (${percentage}%)`;
            } else if (percentage >= 100) {
                statusColor = '#16a34a'; bgStatus = '#f0fdf4'; statusText = 'Achieved';
            } else if (percentage >= 80) {
                statusColor = '#f59e0b'; bgStatus = '#fffbeb'; statusText = 'On Track';
            } else {
                statusColor = '#dc2626'; bgStatus = '#fef2f2'; statusText = 'Below Target';
            }
        }
        
        const barWidth = Math.min(percentage, 100);
        const valText = kpi.actualValue !== null ? kpi.actualValue.toLocaleString() : '—';
        const tarText = kpi.targetValue ? kpi.targetValue.toLocaleString() : '—';
        const initial = kpi.employeeName.substring(0, 2).toUpperCase();

        rowsHtml += `
            <tr class="kpi-row" onclick="openEmployeeKpiDetail('${kpi.employeeName}', '${kpi.periodLabel || ''}')" data-status="${statusKey}" data-name="${kpi.employeeName.toLowerCase()}" style="cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='white'">
                <td style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #1a7f5a, #0f2942); color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0;">
                            ${initial}
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${kpi.employeeName}</div>
                            <div style="font-size: 11px; color: #64748b; font-weight: 600;">🗓️ ${kpi.periodLabel || 'Current Period'}</div>
                        </div>
                    </div>
                </td>

                <!-- Column 2: KPI Label -->
                <td style="padding: 16px;">
                    <div style="font-size: 13px; font-weight: 700; color: #334155;">${kpi.metricLabel}</div>
                </td>

                <!-- Column 3: Target vs Actual (Nini Kimefanyika) -->
                <td style="padding: 16px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: #f8fafc; padding: 4px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <span style="font-size: 13px; font-weight: 800; color: #64748b;">${tarText}</span>
                        <span style="color: #cbd5e1; font-size: 14px;">➔</span>
                        <span style="font-size: 13px; font-weight: 900; color: ${statusColor};">${valText}</span>
                        <span style="font-size: 10px; font-weight: 700; color: #94a3b8; margin-left: 2px;">${kpi.metricUnit}</span>
                    </div>
                </td>

                <!-- Column 4: Progress Bar -->
                <td style="padding: 16px; width: 220px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 6px;">
                        <span>Progress</span>
                        <span style="color: ${statusColor};">${percentage}%</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${statusColor}; border-radius: 3px; transition: width 0.5s;"></div>
                    </div>
                </td>

                <!-- Column 5: Status Badge -->
                <td style="padding: 16px; text-align: right;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; background: ${bgStatus}; color: ${statusColor}; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                        ${statusText}
                    </span>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <tr>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Employee</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Metric</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Target ➔ Actual</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Completion</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function filterReleasedKpis() {
    const searchTerm = (document.getElementById('searchEmployeeKpi')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filterKpiStatus')?.value || '';
    const periodFilter = document.getElementById('filterCeoPeriod')?.value || ''; // 🆕

    const filteredData = allReleasedKpisData.filter(kpi => {
        // 1. Jina
        const matchName = kpi.employeeName.toLowerCase().includes(searchTerm);
        
        // 2. Status
        let matchStatus = true;
        if (statusFilter) {
            let percentage = 0;
            let statusKey = 'pending';
            if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
                if (kpi.metricType === 'WASTE_PERCENT') {
                    percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
                } else {
                    percentage = (kpi.actualValue / kpi.targetValue) * 100;
                }
                percentage = Math.round(percentage);
                if (percentage > 100) statusKey = 'over';
                else if (percentage >= 100) statusKey = 'achieved';
                else if (percentage >= 80) statusKey = 'ontrack';
                else statusKey = 'below';
            }
            matchStatus = statusKey === statusFilter;
        }

        // 🆕 3. Mwezi
        const matchPeriod = periodFilter ? kpi.period === periodFilter : true;

        return matchName && matchStatus && matchPeriod;
    });

    renderReleasedKpisTable(filteredData);
}
// ================================================================
// 🆕 CEO: OPEN EMPLOYEE KPI DETAILS MODAL
// ================================================================
function openEmployeeKpiDetail(employeeName, periodLabel) {
    // 1. Set Header
    document.getElementById('veKpiName').textContent = employeeName;
    document.getElementById('veKpiPeriod').textContent = periodLabel || 'Current Period';
    
    // Set Avatar Initials
    const initial = employeeName.substring(0, 2).toUpperCase();
    document.getElementById('veKpiAvatar').textContent = initial;

    // 2. Chuja data za mfanyakazi huyu pekee kutoka kwenye array kuu
    const empKpis = allReleasedKpisData.filter(k => k.employeeName === employeeName);

    // 3. Tengeneza HTML ya Kila KPI
    let html = '';
    empKpis.forEach(kpi => {
        // Hesabu Maendeleo
        let percentage = 0;
        let statusColor = '#64748b'; 
        let statusText = 'Pending';
        let bgStatus = '#f1f5f9';
        let isOver = false; // 🆕 Alama ya Over Performance
        
        if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
            if (kpi.metricType === 'WASTE_PERCENT') {
                percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
            } else {
                percentage = (kpi.actualValue / kpi.targetValue) * 100;
            }
            percentage = Math.round(percentage);
            
            // 🆕 FIX: Kama amezidi 100% (Over Performance)
            if (percentage > 100) {
                isOver = true;
                statusColor = '#8b5cf6'; 
                bgStatus = '#f5f3ff'; 
                statusText = `🔥 Over (${percentage}%)`;
            } else if (percentage >= 100) {
                statusColor = '#16a34a'; bgStatus = '#f0fdf4'; statusText = 'Achieved';
            } else if (percentage >= 80) {
                statusColor = '#f59e0b'; bgStatus = '#fffbeb'; statusText = 'On Track';
            } else {
                statusColor = '#dc2626'; bgStatus = '#fef2f2'; statusText = 'Below Target';
            }
        }

        const barWidth = Math.min(percentage, 100);
        const valText = kpi.actualValue !== null ? kpi.actualValue.toLocaleString() : '—';
        const tarText = kpi.targetValue ? kpi.targetValue.toLocaleString() : '—';
        
        let ceoNotesText = '';
        if (kpi.notes) {
            const notesLines = kpi.notes.split('\n');
            const ceoOnlyLines = notesLines.filter(line => !line.trim().startsWith('['));
            ceoNotesText = ceoOnlyLines.join('\n').trim();
        }

        html += `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                <!-- Kichwa cha KPI -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${kpi.metricLabel}</div>
                    <span style="font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 8px; background: ${bgStatus}; color: ${statusColor}; text-transform: uppercase;">
                        ${statusText}
                    </span>
                </div>

                <!-- Nini Kimefanyika (Target vs Actual) -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9;">
                    <div style="text-align: center; width: 45%;">
                        <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Target</div>
                        <div style="font-size: 15px; font-weight: 900; color: #475569;">${tarText} <span style="font-size: 10px; font-weight: 600; color: #94a3b8;">${kpi.metricUnit}</span></div>
                    </div>
                    
                    <div style="width: 10%; text-align: center; color: #cbd5e1; font-size: 18px;">➔</div>
                    
                    <div style="text-align: center; width: 45%; background: ${bgStatus}; padding: 8px; border-radius: 8px;">
                        <div style="font-size: 10px; font-weight: 800; color: ${statusColor}; text-transform: uppercase; margin-bottom: 2px;">Actual</div>
                        <div style="font-size: 18px; font-weight: 900; color: ${statusColor};">${valText} <span style="font-size: 10px; font-weight: 600;">${kpi.metricUnit}</span></div>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 6px;">
                        <span>Completion Rate</span>
                        <span style="color: ${statusColor};">${percentage}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${statusColor}; border-radius: 4px; transition: width 0.5s;"></div>
                    </div>
                </div>

                <!-- CEO Notes (Kama zipo) -->
                ${ceoNotesText ? `
                    <div style="background: rgba(26,127,90,0.05); border-left: 3px solid #1a7f5a; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #475569;">
                        <strong style="display:block; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; color: #1a7f5a;">CEO Note / Maelekezo</strong>
                        ${ceoNotesText.replace(/\n/g, '<br>')}
                    </div>
                ` : `<div style="font-size: 12px; color: #94a3b8; font-style: italic;">No CEO notes provided.</div>`}
            </div>
        `;
    });

    // 4. Weka HTML kwenye Modal Body na Uifungue
    document.getElementById('veKpiBody').innerHTML = html;
    document.getElementById('viewEmployeeKpiModal').classList.add('show');
}
// ================================================================
// 🆕 CEO: DRAFT TARGETS TAB
// ================================================================
let allDraftKpisData = [];

async function loadDraftKpisTab() {
    const container = document.getElementById('draftKpisContainer');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #64748b;">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Fetching draft data...</div>
        </div>`;

    try {
        const allKpis = await API.getEmployeeKpis(); 
        // Chuja zilizo draft tu
        allDraftKpisData = allKpis.filter(k => k.status === 'draft' || k.status === 'pending');

        if (allDraftKpisData.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 56px; margin-bottom: 16px; opacity: 0.6;">📭</div>
                    <div style="font-size: 18px; font-weight: 800; color: #334155;">No Draft Targets Found</div>
                    <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Targets you save as draft will appear here.</div>
                </div>
            `;
            return;
        }

        renderDraftKpisTable(allDraftKpisData);

    } catch (err) {
        console.error('Error fetching draft targets:', err);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
                <div style="font-size: 30px; margin-bottom: 10px;">❌</div>
                <div style="font-weight: 800; color: #b91c1c;">Failed to load data</div>
                <div style="font-size: 13px; color: #7f1d1d; margin-top: 4px;">${err.message}</div>
            </div>`;
    }
}

function renderDraftKpisTable(kpis) {
    const container = document.getElementById('draftKpisContainer');
    if (!container) return;

    let rowsHtml = '';

    kpis.forEach((kpi) => {
        const tarText = kpi.targetValue ? kpi.targetValue.toLocaleString() : '—';
        const initial = kpi.employeeName.substring(0, 2).toUpperCase();

        rowsHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#fffbeb'" onmouseout="this.style.background='white'">
                
                <!-- Employee -->
                <td style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #b45309, #f59e0b); color: white; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0;">
                            ${initial}
                        </div>
                        <div>
                            <div style="font-size: 14px; font-weight: 800; color: #1e293b;">${kpi.employeeName}</div>
                            <div style="font-size: 11px; color: #64748b; font-weight: 600;">🗓️ ${kpi.periodLabel || 'Current Period'}</div>
                        </div>
                    </div>
                </td>

                <!-- Metric -->
                <td style="padding: 16px;">
                    <div style="font-size: 13px; font-weight: 700; color: #334155;">${kpi.metricLabel}</div>
                </td>

                <!-- Target -->
                <td style="padding: 16px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: #fffbeb; padding: 4px 12px; border-radius: 8px; border: 1px solid #fcd34d;">
                        <span style="font-size: 13px; font-weight: 900; color: #b45309;">${tarText}</span>
                        <span style="font-size: 10px; font-weight: 700; color: #d97706; margin-left: 2px;">${kpi.metricUnit}</span>
                    </div>
                </td>

                <!-- Actions -->
                <td style="padding: 16px; text-align: right;">
                    <button onclick="releaseSingleDraftKpi('${kpi.id}', this)" style="padding: 8px 16px; background: linear-gradient(135deg, #1a7f5a, #0f2942); color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 11px; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(245,158,11,0.3);">
                        🚀 Release
                    </button>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <tr>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Employee</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Metric</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Target</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}
async function releaseSingleDraftKpi(id, btn) {
    const res = await modernConfirm({
        title: '🚀 Release Target?',
        message: 'Are you sure you want to release this target to the employee?',
        type: 'success',
        okText: '🚀 Yes, Release',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return; 

    const original = btn.innerHTML;
    btn.innerHTML = '⏳ Releasing...';
    btn.disabled = true;
    btn.style.opacity = '0.7';

    try {
        // 🆕 FIX: Hakikisha ID ni Namba safi
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) throw new Error("Invalid KPI ID");

        const ceoId = currentUser?.userId || currentUser?.id || 1; 
        const ceoName = currentUser?.fullName || 'CEO';

        // Tuma kama array ya namba
        await API.releaseEmployeeKpis([numericId], ceoName, ceoId);
        
        showSuccessDialog('🚀 Target Released!', 'The KPI has been successfully sent to the employee.', () => {
            loadDraftKpisTab(); 
        });

    } catch (err) {
        console.error('Release Error:', err);
        alert('Failed to release: ' + (err.message || 'Server error'));
        btn.innerHTML = original;
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}
// ================================================================
// 🆕 MAIL SYSTEM (FULLY INTEGRATED WITH API)
// ================================================================
let allMailUsers = [];
let selectedSendTo = [];
let selectedCC = [];
let selectedAssignTo = [];
let currentMailAttachments = [];
let currentMailBoxType = 'inbox';
let cachedMailList = [];
let currentMailId = null;
// ================= 1. LOAD BADGES =================
async function loadMailBadges() {
    try {
        const counts = await API.getMailUnreadCount().catch(() => null); // Kama inafeli, rudisha null
        
        if (counts) {
            if(document.getElementById('inboxBadge')) document.getElementById('inboxBadge').textContent = counts.inbox || 0;
            if(document.getElementById('pendingBadge')) document.getElementById('pendingBadge').textContent = counts.pending || 0;
            if(document.getElementById('minutesBadge')) document.getElementById('minutesBadge').textContent = counts.minutes || 0;
            
            if(document.getElementById('mailHeaderBadge')) {
                const total = (counts.inbox || 0) + (counts.pending || 0);
                const badge = document.getElementById('mailHeaderBadge');
                if (total > 0) {
                    badge.textContent = total;
                    badge.style.display = 'flex';
                } else {
                    badge.style.display = 'none';
                }
            }
        } else {
            console.warn("Backend imefeli kuleta unread count. Inatumia 0 kwa muda.");
        }
    } catch (err) { 
        console.error('Badge error (Backend might be down):', err); 
    }
}

// ================= 2. SWITCH MAILBOX =================
async function switchMailBox(type) {
    currentMailBoxType = type;
    closeMailDetailView(); 
    
    const titles = {
        'inbox': 'Inbox', 'pending': 'Pending Actions', 'minutes': 'Minutes',
        'sent': 'Sent Messages', 'drafts': 'Drafts', 'starred': 'Starred', 'documents': 'Attachments'
    };
    document.getElementById('mailListTitle').textContent = titles[type] || 'Inbox';

    // Reset active states
    const navIds = ['inbox', 'pending', 'minutes', 'sent', 'drafts', 'starred', 'documents'];
    navIds.forEach(nav => {
        const btn = document.getElementById(`mail-nav-${nav}`);
        if (btn) btn.classList.remove('active');
    });
    
    // Set active state
    const activeBtn = document.getElementById(`mail-nav-${type}`);
    if (activeBtn) activeBtn.classList.add('active');

    await loadMailboxMessages(type);
}
// ================= 3. LOAD MESSAGES =================
async function loadMailboxMessages(type) {
    const container = document.getElementById('mailListContainer');
    container.innerHTML = `<div style="text-align: center; padding: 60px; color: #64748b;"><div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div><div style="font-weight: 700;">Fetching messages...</div></div>`;

    try {
        const messages = await API.getMailboxMessages(type);
        cachedMailList = messages || [];

        if (cachedMailList.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 60px 20px; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;"><div style="font-size: 50px; margin-bottom: 16px; opacity: 0.5;">📭</div><div style="font-size: 16px; font-weight: 800; color: #334155; margin-bottom: 6px;">No Messages Found</div><div style="font-size: 13px; color: #64748b;">Your ${type} is empty.</div></div>`;
            return;
        }
        renderMailList(cachedMailList);
    } catch (err) {
        console.error('Mail load error:', err);
        container.innerHTML = `<div style="text-align: center; padding: 40px; background: #fef2f2; border-radius: 12px; color: #b91c1c;"><div style="font-size: 30px; margin-bottom: 10px;">❌</div><div style="font-weight: 800;">Failed to load messages</div><div style="font-size: 13px;">${err.message}</div></div>`;
    }
}
// ================================================================
// 🆕 RENDER MAIL LIST — Inaonyesha status ya chain
// ================================================================
function renderMailList(messages) {
    const container = document.getElementById('mailListContainer');
    const countEl = document.getElementById('mailListCount');
    
    if (countEl) countEl.textContent = `${messages.length} message${messages.length !== 1 ? 's' : ''}`;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="mail-empty">
                <div class="mail-empty-icon">📭</div>
                <div class="mail-empty-title">No Messages</div>
                <div class="mail-empty-desc">Your ${currentMailBoxType} is empty.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = messages.map(msg => {
        const isUnread = msg.status === 'unread';
        const isClosed = msg.status === 'closed';
        const isPending = msg.status === 'pending' || (msg.assignedTo && msg.assignedTo.length > 0 && !isClosed);
        
        // Display name (sender kwa inbox, receiver kwa sent)
        const displayName = currentMailBoxType === 'sent' 
            ? (msg.receiverName || 'Unknown')
            : (msg.senderName || 'Unknown');
        const prefix = currentMailBoxType === 'sent' ? 'To: ' : '';
        
        const dateStr = msg.createdAt 
            ? new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            : '';
        const initials = (displayName || 'U').substring(0, 2).toUpperCase();
        
        // Badges
        let badges = '';
        if (msg.isMinute) {
            badges += `<span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(139,92,246,0.12); color: var(--purple);">📝 MINUTE</span>`;
        }
        if (isClosed) {
            badges += `<span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(100,116,139,0.12); color: var(--gray-500);">🔒 CLOSED</span>`;
        } else if (isPending) {
            badges += `<span style="font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(245,158,11,0.12); color: #d97706;">⏳ IN PROGRESS</span>`;
        }
        if (msg.isStarred) {
            badges += `<span style="font-size: 14px;">⭐</span>`;
        }
        
        return `
            <div class="mail-item ${isUnread ? 'unread' : ''}" onclick="viewMailDetail('${msg.id}')">
                <div class="mi-avatar">${initials}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; gap: 8px;">
                        <div style="font-size: 14px; font-weight: ${isUnread ? '900' : '700'}; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${prefix}${esc(displayName)}
                        </div>
                        <div style="font-size: 11px; font-weight: 700; color: var(--gray-400); flex-shrink: 0;">${dateStr}</div>
                    </div>
                    <div style="font-size: 13.5px; font-weight: ${isUnread ? '800' : '600'}; color: var(--gray-700); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px;">
                        ${esc(msg.subject || '(No Subject)')}
                    </div>
                    <div style="font-size: 12.5px; color: var(--gray-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${esc((msg.body || '').substring(0, 100))}
                    </div>
                </div>
                ${badges ? `<div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0; margin-left: 8px;">${badges}</div>` : ''}
            </div>
        `;
    }).join('');
}
// ================================================================
// 🆕 FILTER MAIL LIST — Search (inatumia renderMailList mpya)
// ================================================================
function filterMailList() {
    const query = (document.getElementById('mailSearchInput')?.value || '').toLowerCase().trim();
    
    if (!query) {
        renderMailList(cachedMailList);
        return;
    }

    const filtered = cachedMailList.filter(msg => 
        (msg.subject && msg.subject.toLowerCase().includes(query)) ||
        (msg.senderName && msg.senderName.toLowerCase().includes(query)) ||
        (msg.receiverName && msg.receiverName.toLowerCase().includes(query)) ||
        (msg.body && msg.body.toLowerCase().includes(query))
    );
    
    renderMailList(filtered);
}
// ================= 6. VIEW DETAIL =================
let mailCache = {}; 

// ================================================================
// 🆕 VIEW MAIL DETAIL — Inatumia Timeline Mpya
// ================================================================
async function viewMailDetail(id) {
    currentMailId = id;
    document.getElementById('mailListView').style.display = 'none';
    document.getElementById('mailDetailView').style.display = 'flex';
    
    const backLabel = document.getElementById('mailBackLabel');
    if (backLabel) backLabel.textContent = document.getElementById('mailListTitle')?.textContent || 'Inbox';
    
    const body = document.getElementById('mailDetailBody');
    body.innerHTML = `
        <div style="text-align: center; padding: 60px; color: var(--gray-500);">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Loading message...</div>
        </div>
    `;

    try {
        let msg = window.mailCache && window.mailCache[id] ? window.mailCache[id] : await API.getInternalMailById(id);
        if (!msg) return;
        if (!window.mailCache) window.mailCache = {};
        window.mailCache[id] = msg;

        // Mark as read (kama ni inbox)
        if (currentMailBoxType === 'inbox' && msg.status === 'unread') {
            try {
                await API.markMailAsRead(id);
                loadMailBadges();
                msg.status = 'read';
            } catch (e) { console.warn('Mark read error:', e); }
        }

        // ==========================================
        // 1. TENGENEZA VIFUNGO (Actions) - Horizontal juu
        // ==========================================
        const isClosed = msg.status === 'closed' || msg.status === 'draft';
        let actionButtons = `<button class="btn-act-reply" onclick="openReplyModal('${id}')">↩️ Reply</button>`;
        
        if (!isClosed) {
            actionButtons += `
                <button class="btn-act-attend" onclick="openAttendModal('${id}')">✅ Attend & Assign</button>
                <button class="btn-act-close" onclick="closeCurrentMail()">🔒 Close Workflow</button>
            `;
        } else {
            actionButtons += `<div style="padding: 8px 14px; background: #f5f3ff; color: var(--purple); border: 1px solid #ede9fe; border-radius: 6px; font-weight: 800; font-size: 11px;">🔒 Workflow Closed</div>`;
        }

        // ==========================================
        // 2. TENGENEZA METADATA NA FAILI (Upande wa Kulia)
        // ==========================================
        let fileListHtml = '';
        let previewAreaHtml = '';
        let firstFileUrl = '';

        if (msg.attachments && msg.attachments.length > 0) {
            msg.attachments.forEach((att, index) => {
                const ext = (att.name || '').split('.').pop().toLowerCase();
                const isPdf = ext === 'pdf';
                const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext);
                
                if (index === 0 && att.data) firstFileUrl = att.data;

                fileListHtml += `
                    <button class="doc-file-btn ${index === 0 ? 'active' : ''}" onclick="previewDocFile('${att.data}', '${isPdf}', this)">
                        <span style="font-size: 16px;">${isPdf ? '📕' : isImage ? '🖼️' : '📄'}</span>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 800; color: var(--gray-800); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(att.name)}</div>
                        </div>
                    </button>
                `;
            });
        } else {
            fileListHtml = `<div style="text-align:center; padding:20px; font-size:12px; color:var(--gray-400);">Hakuna viambatanisho</div>`;
            previewAreaHtml = `<div style="color: #cbd5e1; text-align: center; margin-top: 80px;"><div style="font-size: 40px;">📄</div><div style="font-weight:700; margin-top:10px;">No Document</div></div>`;
        }

        // ==========================================
        // 3. RENDER 3-COLUMN LAYOUT
        // ==========================================
        body.innerHTML = `
            <div class="mail-detail-3col" style="padding: 10px;">
                
                <!-- COLUMN 1: TIMELINE (Kushoto) -->
                <div class="col-timeline">
                    <div class="premium-workflow-section" style="margin: 0; padding: 16px;">
                        ${renderCurrentHandlerPill(msg)}
                        <div class="premium-section-title">🔄 WORKFLOW HISTORY</div>
                        ${renderWorkflowChain(msg)}
                    </div>
                </div>

                <!-- COLUMN 2: UJUMBE (Katikati) -->
                <div class="col-message">
                    <!-- Vifungo Juu -->
                    <div class="action-buttons-top">
                        ${actionButtons}
                    </div>

                    <!-- Ujumbe -->
                    <div class="premium-message-card" style="margin: 0;">
                        <div class="premium-msg-header" style="padding: 20px;">
                            <h2 class="premium-msg-subject" style="font-size: 18px;">${esc(msg.subject || '(No Subject)')}</h2>
                            <div class="premium-msg-meta">
                                <div class="premium-avatar">${(msg.senderName || 'U').substring(0, 2).toUpperCase()}</div>
                                <div class="premium-meta-text">
                                    <div class="premium-sender-name">${esc(msg.senderName || 'Unknown')}</div>
                                    <div class="premium-receiver-info">To: <strong>${esc(msg.receiverName || '—')}</strong></div>
                                </div>
                                <div class="premium-date">
                                    ${new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                            </div>
                        </div>
                        <div class="premium-msg-body" style="padding: 20px; font-size: 14px; min-height: 200px; background: white;">
                            ${esc(msg.body || '')}
                        </div>
                    </div>
                </div>

                <!-- COLUMN 3: DOCUMENT VIEWER (Kulia) -->
                <div class="col-actions">
                    <!-- Metadata -->
                    <div class="doc-meta-card">
                        <div class="doc-meta-row">
                            <span class="doc-meta-label">Reference</span>
                            <span class="doc-meta-value">${esc(msg.reference || msg.id || 'N/A')}</span>
                        </div>
                        <div class="doc-meta-row">
                            <span class="doc-meta-label">Date</span>
                            <span class="doc-meta-value">${new Date(msg.createdAt).toLocaleDateString('en-GB')}</span>
                        </div>
                    </div>

                    <!-- Orodha ya Faili -->
                    <div class="premium-section-title" style="margin-bottom: 8px; margin-top: 16px;">📎 Documents</div>
                    <div style="margin-bottom: 16px;">${fileListHtml}</div>

                    <!-- Preview Area -->
                    <div class="doc-viewer-container">
                        <div class="doc-viewer-header">
                            <div style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase;">Document Preview</div>
                        </div>
                        <div class="doc-viewer-body" id="docPreviewArea">
                            ${firstFileUrl ? `<iframe id="docIframe" src="${firstFileUrl}#toolbar=0" style="width:100%; height:100%; border:none; background:white; border-radius:4px;"></iframe>` : previewAreaHtml}
                        </div>
                    </div>
                </div>

            </div>
        `;

        // Kama faili ya kwanza ni picha, ibadilishe iframe iwe img
        if (firstFileUrl) {
            const firstExt = (msg.attachments[0].name || '').split('.').pop().toLowerCase();
            if (['jpg','jpeg','png','gif','webp'].includes(firstExt)) {
                document.getElementById('docPreviewArea').innerHTML = `<img src="${firstFileUrl}" style="max-width:100%; max-height:100%; object-fit:contain; box-shadow:0 4px 12px rgba(0,0,0,0.2);">`;
            }
        }

    } catch (err) {
        console.error('View Mail Error:', err);
        body.innerHTML = `<div style="color: var(--red); text-align: center; padding: 40px;">❌ Failed to load: ${esc(err.message)}</div>`;
    }
}

// ================================================================
// 🆕 FUNCTION YA KUBADILISHA FAILI KWENYE PREVIEW
// ================================================================
function previewDocFile(fileData, isPdf, btnElement) {
    if (!fileData) return;
    
    // 1. Ondoa active kwenye vitufe vyote
    document.querySelectorAll('.doc-file-btn').forEach(btn => btn.classList.remove('active'));
    
    // 2. Weka active kwenye kitufe kilichobonyezwa
    if (btnElement) btnElement.classList.add('active');

    // 3. Badilisha Preview Area
    const previewArea = document.getElementById('docPreviewArea');
    
    if (isPdf === 'true') {
        // Kama ni PDF, tumia iframe
        previewArea.innerHTML = `<iframe src="${fileData}#toolbar=0" style="width:100%; height:100%; border:none; background:white; border-radius:4px;"></iframe>`;
    } else {
        // Kama ni Picha (au nyingine), tumia img
        previewArea.innerHTML = `<img src="${fileData}" style="max-width:100%; max-height:100%; object-fit:contain; box-shadow:0 4px 12px rgba(0,0,0,0.2);">`;
    }
}
function closeMailDetailView() {
    document.getElementById('mailListView').style.display = 'flex';
    document.getElementById('mailDetailView').style.display = 'none';
    currentMailId = null;
}
// ================================================================
// 🆕 MODERN COMPOSE MODAL LOGIC
// ================================================================

async function openComposeMailModal() {
    selectedSendTo = [];
    selectedCC = [];
    currentMailAttachments = [];
    
    document.getElementById('mailType').value = 'information';
    document.getElementById('mailPriority').value = 'normal';
    document.getElementById('mailSubject').value = '';
    document.getElementById('mailBody').value = '';
    document.getElementById('mailAttachList').innerHTML = '';
    
    renderTags('sendTo');
    renderTags('cc');
    
    document.getElementById('composeMailModal').classList.add('show');

    // Load users
    if (allMailUsers.length === 0) {
        try {
            const users = await API.getUsers();
            const currentUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== currentUser.userId && u.role !== 'SuperAdmin');
        } catch (err) {
            console.error("Failed to load users", err);
        }
    }

    setupMailSearch('sendTo');
    setupMailSearch('cc');
}

function closeComposeModal() {
    document.getElementById('composeMailModal').classList.remove('show');
}

function focusMultiInput(type) {
    document.getElementById(`${type}Input`).focus();
}

// ================================================================
// 🔍 SETUP SEARCHABLE DROPDOWN
// ================================================================
function setupMailSearch(type) {
    const input = document.getElementById(`${type}Input`);
    const dropdown = document.getElementById(`${type}Dropdown`);
    const box = document.getElementById(`${type}Box`);

    // Clone input kuondoa listeners za zamani
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('focus', () => {
        dropdown.classList.add('show');
        renderDropdown(type, '');
    });

    newInput.addEventListener('input', function() {
        renderDropdown(type, this.value.toLowerCase().trim());
    });

    // Close dropdown on blur (with delay for click)
    newInput.addEventListener('blur', function() {
        setTimeout(() => {
            if (!dropdown.matches(':hover')) {
                dropdown.classList.remove('show');
            }
        }, 200);
    });
}

function renderDropdown(type, query) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const selected = type === 'sendTo' ? selectedSendTo : selectedCC;

    let filtered = allMailUsers.filter(u => !selected.find(s => s.id === u.id));
    
    if (query) {
        filtered = filtered.filter(u =>
            u.fullName.toLowerCase().includes(query) ||
            (u.role && u.role.toLowerCase().includes(query)) ||
            (u.department && u.department.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="dropdown-empty">No users found${query ? ` for "${esc(query)}"` : ''}</div>`;
        return;
    }

    dropdown.innerHTML = filtered.map(user => {
        const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const roleLabel = user.role || user.department || 'User';
        return `
            <div class="dropdown-user-item" onmousedown="event.preventDefault(); addTag('${user.id}', '${type}')">
                <div class="dropdown-user-avatar">${initials}</div>
                <div class="dropdown-user-info">
                    <div class="dropdown-user-name">${esc(user.fullName)}</div>
                    <div class="dropdown-user-role">${esc(roleLabel)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ================================================================
// ➕ ADD/REMOVE TAGS
// ================================================================
function addTag(userId, type) {
    const user = allMailUsers.find(u => String(u.id) === String(userId));
    if (!user) return;

    if (type === 'sendTo') {
        if (!selectedSendTo.find(u => u.id === userId)) {
            selectedSendTo.push(user);
            renderTags('sendTo');
        }
    } else {
        if (!selectedCC.find(u => u.id === userId)) {
            selectedCC.push(user);
            renderTags('cc');
        }
    }

    document.getElementById(`${type}Input`).value = '';
    document.getElementById(`${type}Dropdown`).classList.remove('show');
    document.getElementById(`${type}Input`).focus();
}

function removeTag(userId, type) {
    if (type === 'sendTo') {
        selectedSendTo = selectedSendTo.filter(u => u.id !== userId);
        renderTags('sendTo');
    } else {
        selectedCC = selectedCC.filter(u => u.id !== userId);
        renderTags('cc');
    }
}

function renderTags(type) {
    const box = document.getElementById(`${type}Box`);
    const input = document.getElementById(`${type}Input`);
    const selected = type === 'sendTo' ? selectedSendTo : selectedCC;

    // Ondoa tags zote za zamani
    box.querySelectorAll('.multi-select-tag').forEach(tag => tag.remove());

    // Ongeza tags mpya kabla ya input
    selected.forEach(user => {
        const tag = document.createElement('div');
        tag.className = 'multi-select-tag';
        tag.innerHTML = `
            ${esc(user.fullName.split(' ')[0])}
            <button class="tag-remove" onclick="event.stopPropagation(); removeTag('${user.id}', '${type}')">✕</button>
        `;
        box.insertBefore(tag, input);
    });
}

function handleMailAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('mailAttachList');

    files.forEach(file => {
        // Max 10MB kwa mail
        if (file.size > 10 * 1024 * 1024) {
            modernToast('Too Large', `${file.name} is too large (max 10MB)`, 'error');
            return;
        }
        if (currentMailAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentMailAttachments.push(file);
    });

    list.innerHTML = currentMailAttachments.map((file, index) => `
        <div class="mail-attachment-item"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMailAttachment(${index})" class="remove-attach">✕</button></div>
    `).join('');
    event.target.value = '';
}

function removeMailAttachment(index) {
    currentMailAttachments.splice(index, 1);
    document.getElementById('mailAttachList').innerHTML = currentMailAttachments.map((file, idx) => `
        <div class="mail-attachment-item"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMailAttachment(${idx})" class="remove-attach">✕</button></div>
    `).join('');
}

async function sendMail() {
    const subject = document.getElementById('mailSubject').value.trim();
    const body = document.getElementById('mailBody').value.trim();
    const type = document.getElementById('mailType').value;
    const priority = document.getElementById('mailPriority').value;
    const statusDiv = document.getElementById('mailComposeStatus');
    const btn = document.querySelector('#composeMailModal button[onclick="sendMail()"]');
    
    if (selectedSendTo.length === 0) return modernToast('Error', 'Please select at least one recipient', 'error');
    if (!subject) return modernToast('Error', 'Please enter a subject', 'error');
    if (!body) return modernToast('Error', 'Please write a message', 'error');

    const originalBtn = btn.innerHTML;
    btn.innerHTML = '⏳ Sending...'; btn.disabled = true;

    try {
        const attachmentPromises = currentMailAttachments.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
            reader.readAsDataURL(file);
        }));
        const attachmentData = await Promise.all(attachmentPromises);

        const payload = {
            receivers: selectedSendTo.map(u => u.id),
            cc: selectedCC.map(u => u.id),
            subject, body, type, priority,
            attachments: attachmentData,
            isMinute: false
        };

        await API.sendInternalMail(payload);
        
        modernToast('✅ Sent', 'Message sent successfully!', 'success');
        closeModal('composeMailModal');
        loadMailBadges();
        if (currentMailBoxType === 'sent') loadMailboxMessages('sent');
        
    } catch (err) {
        modernToast('Error', err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}

// ================= 8. REPLY, ATTEND, CLOSE =================
async function openReplyModal(originalId) {
    const msg = await API.getInternalMailById(originalId);
    if (!msg) return;

    let modal = document.getElementById('replyMailModal');
    if (modal) modal.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="replyMailModal">
            <div class="modal-box" style="max-width: 600px; padding: 0; overflow: hidden; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, #0a1929, #0f2942); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800;">↩️ Reply: ${esc(msg.subject)}</h3>
                    <button onclick="document.getElementById('replyMailModal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <div style="padding: 24px; background: #f8fafc;">
                    <textarea id="replyBody" rows="6" placeholder="Write your reply here..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
                </div>
                <div style="padding: 16px 24px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="document.getElementById('replyMailModal').remove()" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e1; border-radius: 8px; font-weight: 700; cursor: pointer;">Cancel</button>
                    <button onclick="submitReply('${originalId}')" style="padding: 10px 24px; background: linear-gradient(135deg, #1a7f5a, #0f2942); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">📤 Send Reply</button>
                </div>
            </div>
        </div>
    `);
}

async function submitReply(originalId) {
    const body = document.getElementById('replyBody').value.trim();
    if (!body) return modernToast('Error', 'Reply body is required', 'error');

    const btn = document.querySelector(`#replyMailModal button[onclick="submitReply('${originalId}')"]`);
    const originalBtn = btn.innerHTML;
    btn.innerHTML = '⏳ Sending...'; btn.disabled = true;

    try {
        await API.replyInternalMail(originalId, { body, attachments: [] });
        modernToast('✅ Sent', 'Reply sent successfully!', 'success');
        document.getElementById('replyMailModal').remove();
        loadMailBadges();
        // Reload current view if viewing the same message
        if (currentMailId == originalId) viewMailDetail(originalId);
    } catch (err) {
        modernToast('Error', err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}
// ================================================================
// 🆕 OPEN ATTEND MODAL — Kisasa Zenye Preview ya Chain
// ================================================================
async function openAttendModal(mailId) {
    let modal = document.getElementById('attendMailModal');
    if (modal) modal.remove();
    
    let msg = window.mailCache && window.mailCache[mailId] ? window.mailCache[mailId] : null;
    
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="attendMailModal" style="z-index: 12000;">
            <div class="modal-box" style="max-width: 600px; padding: 0; overflow: hidden; border-radius: 16px; display: flex; flex-direction: column; max-height: 92vh;">
                
                <div style="background: linear-gradient(135deg, #0a1929, #0f2942); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; border-bottom: 3px solid var(--green);">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 44px; height: 44px; background: rgba(46,204,113,0.2); border: 1.5px solid var(--green); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                            ✅
                        </div>
                        <div>
                            <h3 style="margin: 0; font-size: 17px; font-weight: 800;">Attend & Assign</h3>
                            <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 2px;">
                                ${msg ? esc(msg.subject || '(No Subject)') : 'Message'}
                            </div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('attendMailModal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer; flex-shrink: 0;">✕</button>
                </div>
                
                <div style="padding: 22px 24px; background: var(--gray-50); overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">
                    
                    ${msg && msg.receiverName ? `
                        <div style="padding: 10px 14px; background: white; border: 1.5px solid var(--gray-200); border-radius: 10px; display: flex; align-items: center; gap: 10px; font-size: 12px;">
                            <span style="font-weight: 800; color: var(--gray-500); text-transform: uppercase; font-size: 10px; letter-spacing: 0.8px;">Current:</span>
                            <span style="font-weight: 700; color: var(--primary-dark);">${esc(msg.receiverName)}</span>
                        </div>
                    ` : ''}
                    
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                            💬 Your Comment / Action Taken <span style="color: var(--red);">*</span>
                        </label>
                        <textarea id="attendComment" rows="4" placeholder="E.g., Malipo yamefanyika..." style="width: 100%; padding: 12px 14px; border: 1.5px solid var(--gray-300); border-radius: 10px; font-size: 13.5px; font-family: inherit; resize: vertical; min-height: 90px; outline: none; line-height: 1.6;"></textarea>
                    </div>
                    
                    <div>
                        <label style="display: block; font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                            ➡️ Forward to Next Person (Optional)
                        </label>
                        <select id="attendAssignTo" style="width: 100%; padding: 12px 14px; border: 1.5px solid var(--gray-300); border-radius: 10px; font-size: 13.5px; font-family: inherit; outline: none; background: white; cursor: pointer;">
                            <option value="">-- No assignment, just comment --</option>
                        </select>
                    </div>
                    
                </div>
                
                <div style="padding: 16px 24px; background: white; border-top: 1.5px solid var(--gray-200); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;">
                    <button onclick="document.getElementById('attendMailModal').remove()" style="padding: 10px 22px; background: var(--gray-100); color: var(--gray-600); border: 1.5px solid var(--gray-200); border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer; font-family: inherit;">Cancel</button>
                    <button id="attendSubmitBtn" onclick="submitAttend('${mailId}')" style="padding: 10px 24px; background: linear-gradient(135deg, var(--green), var(--primary)); color: white; border: none; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(46,204,113,0.3); display: inline-flex; align-items: center; gap: 6px;">✅ Submit Action</button>
                </div>
            </div>
        </div>
    `);

    // Load users kwa dropdown
    const select = document.getElementById('attendAssignTo');
    try {
        let users = allMailUsers;
        if (!users || users.length === 0) {
            users = await API.getUsers();
            const curUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== curUser.userId && u.role !== 'SuperAdmin');
        }
        allMailUsers.forEach(u => {
            select.insertAdjacentHTML('beforeend', `<option value="${u.id}">${esc(u.fullName)} • ${esc(u.role || u.department || 'User')}</option>`);
        });
    } catch (err) { console.warn(err); }
}
// ================================================================
// 🆕 SUBMIT ATTEND — Inatuma comment + assign
// ================================================================
async function submitAttend(mailId) {
    const commentInput = document.getElementById('attendComment');
    const comment = (commentInput?.value || '').trim();
    const assignToVal = document.getElementById('attendAssignTo')?.value;
    const assignTo = assignToVal ? [parseInt(assignToVal)] : [];
    const btn = document.getElementById('attendSubmitBtn');

    // Validation
    if (!comment && assignTo.length === 0) {
        modernToast('Required', 'Please write a comment or assign to someone.', 'warning');
        commentInput?.focus();
        return;
    }

    if (!comment) {
        modernToast('Required', 'Please write a comment describing your action.', 'warning');
        commentInput?.focus();
        return;
    }

    // Disable button
    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Processing...';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';

    try {
        // Tuma kwa API
        await API.attendMail(mailId, { comment, assignTo });

        // Success
        modernToast('✅ Success', 
            assignTo.length > 0 
                ? 'Comment added and mail forwarded.' 
                : 'Comment added to workflow.', 
            'success'
        );

        // Funga modal
        document.getElementById('attendMailModal')?.remove();

        // Clear cache ili tupate data mpya
        if (window.mailCache && window.mailCache[mailId]) {
            delete window.mailCache[mailId];
        }

        // Reload detail view
        await viewMailDetail(mailId);

        // Reload badges na list
        loadMailBadges();
        if (currentMailBoxType) {
            loadMailboxMessages(currentMailBoxType);
        }

    } catch (err) {
        console.error('Attend error:', err);
        modernToast('Failed', err.message || 'Could not submit action.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    }
}
async function closeCurrentMail() {
    if (!currentMailId) return;
    const res = await modernConfirm({ title: '🔒 Close Workflow?', message: 'This will mark the workflow as complete.', type: 'warning', okText: '🔒 Close', cancelText: 'Cancel' });
    if (!res.confirmed) return;
    try {
        await API.closeMail(currentMailId, { comment: 'Closed via dashboard' });
        modernToast('✅ Closed', 'Mail workflow closed.', 'success');
        viewMailDetail(currentMailId);
        loadMailBadges();
    } catch (err) { modernToast('Error', err.message, 'error'); }
}

// ================= 9. STAR, ARCHIVE, DELETE =================
async function toggleStarCurrentMail() {
    if (!currentMailId) return;
    try {
        const res = await API.starMail(currentMailId);
        document.getElementById('btnStarMail').textContent = res.isStarred ? '⭐' : '☆';
        modernToast('Star Updated', res.isStarred ? 'Message starred' : 'Star removed', 'success');
        loadMailboxMessages(currentMailBoxType); // Refresh list in background
    } catch (err) { modernToast('Error', err.message, 'error'); }
}

async function toggleArchiveCurrentMail() {
    if (!currentMailId) return;
    try {
        const res = await API.archiveMail(currentMailId);
        document.getElementById('btnArchiveMail').textContent = res.isArchived ? '📂' : '📁';
        modernToast('Archived', res.isArchived ? 'Message archived' : 'Message unarchived', 'success');
        loadMailboxMessages(currentMailBoxType);
    } catch (err) { modernToast('Error', err.message, 'error'); }
}

async function deleteCurrentMail() {
    if (!currentMailId) return;
    const res = await modernConfirm({ title: '🗑️ Delete Message?', message: 'This will move the message to trash.', type: 'danger', okText: '🗑️ Delete', cancelText: 'Cancel' });
    if (!res.confirmed) return;
    try {
        await API.deleteMail(currentMailId);
        modernToast('Deleted', 'Message moved to trash.', 'success');
        closeMailDetailView();
        loadMailboxMessages(currentMailBoxType);
        loadMailBadges();
    } catch (err) { modernToast('Error', err.message, 'error'); }
}

// ================= 10. NOTIFICATION POLLING =================
setInterval(() => {
    if (typeof switchTab !== 'undefined' && document.getElementById('tab-mail-center').classList.contains('active')) {
        // Only load badges if user is somewhere in dashboard
        loadMailBadges();
    }
}, 30000); // Every 30s
// ================= 11. MINUTE FUNCTIONS =================
let currentMinuteAttachments = [];

async function openMinuteComposeModal() {
    document.getElementById('minuteSubject').value = '';
    document.getElementById('minuteBody').value = '';
    currentMinuteAttachments = [];
    document.getElementById('minuteAttachList').innerHTML = '';
    
    const select = document.getElementById('minuteAssignTo');
    select.innerHTML = '<option value="">-- Select Person --</option>';
    
    if (allMailUsers.length === 0) {
        const users = await API.getUsers();
        const curUser = Auth.getUser();
        allMailUsers = (users || []).filter(u => u.id !== curUser.userId && u.role !== 'SuperAdmin');
    }
    allMailUsers.forEach(u => {
        select.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.fullName} (${u.role})</option>`);
    });

    document.getElementById('minuteComposeModal').classList.add('show');
}

function handleMinuteAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('minuteAttachList');

    files.forEach(file => {
        if (file.size > 25 * 1024 * 1024) {
            modernToast('Too Large', `${file.name} is too large (max 25MB)`, 'error');
            return;
        }
        if (currentMinuteAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentMinuteAttachments.push(file);
    });

    list.innerHTML = currentMinuteAttachments.map((file, index) => `
        <div class="mail-attachment-item"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMinuteAttachment(${index})" class="remove-attach">✕</button></div>
    `).join('');
    event.target.value = '';
}

function removeMinuteAttachment(index) {
    currentMinuteAttachments.splice(index, 1);
    document.getElementById('minuteAttachList').innerHTML = currentMinuteAttachments.map((file, idx) => `
        <div class="mail-attachment-item"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMinuteAttachment(${idx})" class="remove-attach">✕</button></div>
    `).join('');
}

async function sendMinute() {
    const subject = document.getElementById('minuteSubject').value.trim();
    const assignToId = document.getElementById('minuteAssignTo').value;
    const body = document.getElementById('minuteBody').value.trim();
    
    if (!subject || !assignToId || !body) return modernToast('Error', 'Please fill all required fields', 'error');

    const btn = document.querySelector('#minuteComposeModal button[onclick="sendMinute()"]');
    const originalBtn = btn.innerHTML;
    btn.innerHTML = '⏳ Creating...'; btn.disabled = true;

    try {
        const attachmentPromises = currentMinuteAttachments.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
            reader.readAsDataURL(file);
        }));
        const attachmentData = await Promise.all(attachmentPromises);

        const payload = {
            receivers: [parseInt(assignToId)],
            subject, body, attachments: attachmentData,
            type: 'minute', isMinute: true,
            assignedTo: [parseInt(assignToId)]
        };

        await API.sendInternalMail(payload);
        
        modernToast('✅ Created', 'Minute assigned successfully!', 'success');
        closeModal('minuteComposeModal');
        loadMailBadges();
        if (currentMailBoxType === 'minutes') loadMailboxMessages('minutes');
        
    } catch (err) {
        modernToast('Error', err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}
async function saveMailDraft() {
    const subject = document.getElementById('mailSubject').value.trim();
    const body = document.getElementById('mailBody').value.trim();
    
    if (!subject && !body) {
        return modernToast('Error', 'Write something to save as draft', 'error');
    }

    try {
        const attachmentPromises = currentMailAttachments.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
            reader.readAsDataURL(file);
        }));
        const attachmentData = await Promise.all(attachmentPromises);

        const payload = {
            receivers: selectedSendTo.map(u => u.id),
            cc: selectedCC.map(u => u.id),
            subject: subject || '(No Subject)', 
            body,
            type: document.getElementById('mailType').value,
            priority: document.getElementById('mailPriority').value,
            attachments: attachmentData,
            isMinute: false
        };

        await API.saveMailDraft(payload);
        modernToast('💾 Saved', 'Message saved to drafts!', 'success');
        closeComposeModal();
        
        if (currentMailBoxType === 'drafts') loadMailboxMessages('drafts');
    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}
// ================================================================
// 🆕 RENDER WORKFLOW CHAIN — Timeline ya Wima Yenye Rangi
// ================================================================
function renderWorkflowChain(msg) {
    // Kama hakuna attendance, onyesha empty state
    const attendance = msg.attendance || [];
    
    if (attendance.length === 0) {
        return `
            <div class="premium-timeline-v2-empty">
                <span class="icon">📭</span>
                <div class="title">No Workflow History</div>
                <div class="desc">Actions taken on this mail will appear here.</div>
            </div>
        `;
    }

    // Chuja na panga kwa tarehe (zamani → mpya)
    const sorted = [...attendance].sort((a, b) => 
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );

    // Tengeneza kila item
    const itemsHtml = sorted.map((att, index) => {
        const action = (att.action || 'attended').toLowerCase();
        const icon = getActionIcon(action);
        const actionLabel = getActionLabel(action);
        const userName = att.userName || 'System';
        const userRole = att.userRole || att.role || '';
        const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const timeStr = formatTimeAgo(att.createdAt);
        
        // Comment (kama ipo)
        const commentHtml = att.comment 
            ? `<div class="tl-comment">${esc(att.comment)}</div>` 
            : '';
        
        // Assigned to (kama ipo)
        let assignedHtml = '';
        if (att.assignedTo && att.assignedTo.length > 0) {
            const names = att.assignedNames && att.assignedNames.length > 0
                ? att.assignedNames
                : ['Unknown User'];
            assignedHtml = `
                <div class="tl-assigned-to">
                    <span class="arrow">➡️</span>
                    <span>Assigned to: <strong>${names.map(n => esc(n)).join(', ')}</strong></span>
                </div>
            `;
        } else if (att.assignedToName) {
            assignedHtml = `
                <div class="tl-assigned-to">
                    <span class="arrow">➡️</span>
                    <span>Assigned to: <strong>${esc(att.assignedToName)}</strong></span>
                </div>
            `;
        }
        
        return `
            <div class="tl-item ${action}">
                <div class="tl-icon">${icon}</div>
                <div class="tl-card">
                    <div class="tl-header">
                        <div class="tl-user">
                            <div class="tl-avatar">${initials}</div>
                            <div>
                                <div class="tl-username">${esc(userName)}</div>
                                ${userRole ? `<div class="tl-role">${esc(userRole)}</div>` : ''}
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                            <span class="tl-action-badge">${icon} ${actionLabel}</span>
                            <span class="tl-time">${timeStr}</span>
                        </div>
                    </div>
                    ${commentHtml}
                    ${assignedHtml}
                </div>
            </div>
        `;
    }).join('');

    return `<div class="premium-timeline-v2">${itemsHtml}</div>`;
}

// ================================================================
// 🆕 HELPERS: Icon, Label, Time
// ================================================================
function getActionIcon(action) {
    const map = {
        'created': '📝',
        'attended': '✅',
        'assigned': '➡️',
        'closed': '🔒',
        'rejected': '❌',
        'replied': '↩️',
        'forwarded': '📤'
    };
    return map[action] || '💬';
}

function getActionLabel(action) {
    const map = {
        'created': 'Created',
        'attended': 'Attended',
        'assigned': 'Assigned',
        'closed': 'Closed',
        'rejected': 'Rejected',
        'replied': 'Replied',
        'forwarded': 'Forwarded'
    };
    return map[action] || 'Action';
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ================================================================
// 🆕 CURRENT HANDLER — Nani Anashikilia Mail Sasa
// ================================================================
function getCurrentHandler(msg) {
    // Kama mail imefungwa, hakuna handler
    if (msg.status === 'closed') return null;
    
    // Kama kuna assignedTo ya mwisho
    if (msg.assignedTo && msg.assignedTo.length > 0) {
        if (msg.assignedNames && msg.assignedNames.length > 0) {
            return { name: msg.assignedNames[0], isPending: true };
        }
    }
    
    // Kama kuna receiverId (mtu wa mwisho aliyepokea)
    if (msg.receiverName) {
        return { name: msg.receiverName, isPending: msg.status === 'unread' };
    }
    
    return null;
}

function renderCurrentHandlerPill(msg) {
    const handler = getCurrentHandler(msg);
    if (!handler) return '';
    
    return `
        <div class="current-handler-pill">
            <span class="pulse"></span>
            <span>📌 Currently with: <strong>${esc(handler.name)}</strong></span>
        </div>
    `;
}