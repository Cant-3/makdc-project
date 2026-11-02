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
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    // Remove active from all sidebar links
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));

    // Show selected tab
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    // Highlight sidebar link
    const link = document.querySelector(`.sidebar-nav a[onclick*="${tabId}"]`);
    if (link) link.classList.add('active');

    // Load data for the tab
    if (tabId === 'tab-overview')    loadOverviewTab();
    if (tabId === 'tab-employees')   loadEmployeesTab();
    if (tabId === 'tab-payments')    loadPaymentsTab();
    if (tabId === 'tab-payrolls')    loadPayrollsTab();
    if (tabId === 'tab-transfers')   loadTransfersTab();
    if (tabId === 'tab-accounts')    loadAccountsTab();
    if (tabId === 'tab-procurement-approvals') loadCEOProcurementApprovals();
    if (tabId === 'tab-reports')     {/* static */}

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
        message: `Approve payment "${p.reference}" (TSh ${Number(p.amount).toLocaleString()})? Finance will be notified.`,
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
        modernToast('✅ Approved', `Payment ${p.reference} approved.`, 'success');
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
                    <div style="background:linear-gradient(135deg,#384b67,#2a3850);padding:18px 24px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
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
            <div style="font-family:monospace;font-weight:800;color:#384b67;font-size:16px;">${esc(p.payrollId)}</div>
            <div style="font-size:15px;font-weight:700;color:#1e293b;margin-top:4px;">${monthNames[p.month - 1]} ${p.year}</div>
        </div>
        <div style="background:white;border-radius:10px;overflow:hidden;border:1px solid var(--gray-200);">
            <div style="display:grid;grid-template-columns:40px 1.5fr 1fr 1fr 1fr;gap:8px;padding:10px 14px;background:var(--gray-50);border-bottom:2px solid var(--gray-200);font-size:10px;font-weight:800;color:var(--gray-500);text-transform:uppercase;">
                <span>#</span><span>Employee</span><span>Basic</span><span>Allowances</span><span>Net Pay</span>
            </div>
            ${itemsHtml}
        </div>
        <div style="margin-top:14px;padding:12px;background:#f8fafc;border-radius:8px;border-left:4px solid #384b67;display:flex;justify-content:space-between;">
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
                    <div style="background:linear-gradient(135deg,#384b67,#2a3850);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
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
        <div class="detail-row"><span class="label">Amount</span><span class="value" style="color:#384b67;font-weight:900;font-size:16px;">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</span></div>
        <div class="detail-row"><span class="label">Created By</span><span class="value">${esc(t.createdBy || '—')}</span></div>
        <div class="detail-row"><span class="label">Created At</span><span class="value">${t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</span></div>
        ${t.reason ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid #384b67;font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#384b67;font-size:11px;text-transform:uppercase;">Reason</strong>${esc(t.reason)}</div>` : ''}
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
        <div class="detail-row"><span class="label">Balance</span><span class="value" style="color:#384b67;font-weight:800;">${acc.currency || 'TZS'} ${Number(acc.balance || 0).toLocaleString()}</span></div>
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
            ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)'
            : isApproved
            ? 'linear-gradient(135deg,#14532d,#16a34a)'
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

            <div style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;padding:18px 22px;border-radius:12px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:800;text-transform:uppercase;letter-spacing:1.2px;font-size:12px;">Total Amount</span>
                <span style="font-size:24px;font-weight:900;color:#fbbf24;font-family:'Courier New',monospace;">TSh ${Number(request.total_amount || 0).toLocaleString()}</span>
            </div>

            ${isPending ? `
                <div style="background:rgba(139,92,246,0.08);border:1.5px solid rgba(139,92,246,0.25);border-left:4px solid #8b5cf6;border-radius:10px;padding:12px 16px;margin-top:16px;font-size:12px;color:#4c1d95;">
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
                <button onclick="closeModal('ceoProcurementViewModal'); ceoApproveRequest(${request.id})" style="padding:11px 24px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;box-shadow:0 4px 12px rgba(139,92,246,0.3);">✅ Final Approve</button>
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