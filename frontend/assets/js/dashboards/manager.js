// ================================================================
// MAK DC INVESTMENT — MANAGER DASHBOARD (COMPLETE)
// Version: 2.0 — With Bulk Budget Distribution
// ================================================================

let currentUser = null;
let currentProfilePic = null;
let editingEmployeeId = null;
let editingEmployeeSource = null;

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!protectPage('Manager', 'SuperAdmin', 'CEO')) return;

    currentUser = Auth.getUser();

    renderManagerProfile();
    initSidebar();
    await loadManagerDashboard();
});

// ================================================================
// RENDER MANAGER PROFILE
// ================================================================
function renderManagerProfile() {
    if (!currentUser) return;

    const user = currentUser;
    const initials = user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    setElText('sidebarUserName', user.fullName);

    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    if (sidebarAvatar) {
        if (user.profilePic) {
            sidebarAvatar.innerHTML = `<img src="${user.profilePic}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        } else {
            sidebarAvatar.textContent = initials;
        }
    }

    setElText('udName', user.fullName);
    setElText('udRole', `📋 ${user.role}`);

    const udAvatar = document.getElementById('udAvatar');
    if (udAvatar) {
        if (user.profilePic) {
            udAvatar.innerHTML = `<img src="${user.profilePic}" alt="Profile">`;
        } else {
            udAvatar.innerHTML = `<span>${initials}</span>`;
        }
    }

    setElText('udpName', user.fullName);
    setElText('udpRole', `📋 ${user.role}`);
    setElText('udpEmail', user.email || '—');
    setElText('udpPhone', user.phone || '—');
    setElText('udpDepartment', user.department || '—');
    setElText('udpEmployeeId', user.employeeId || '—');

    const udpPic = document.getElementById('udpPic');
    if (udpPic) {
        if (user.profilePic) {
            udpPic.innerHTML = `<img src="${user.profilePic}" alt="Profile">`;
        } else {
            udpPic.innerHTML = `<span>${initials}</span>`;
        }
    }
}
async function loadManagerDashboard() {
    const user = Auth.getUser();
    if (user) {
        document.getElementById('dashUserName').textContent = user.fullName.split(' ')[0];
        document.getElementById('dashDate').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    try {
        // 1. Vuta data zote kwa pamoja
        const [orders, users, employees, payrolls, accounts, payments, procurement] = await Promise.all([
            API.getOrders().catch(() => []),
            API.getUsers().catch(() => []),
            API.getEmployees().catch(() => []),
            API.getPayrolls().catch(() => []),
            API.getAccounts().catch(() => []),
            API.getCompanyPayments().catch(() => []),
            API.getProcurementRequests('/all').catch(() => [])
        ]);

        // ==========================================
        // 2. HESABU ZA KPI
        // ==========================================
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.status === 'pending').length;
        const activeStaff = users.filter(u => u.status === 'Active').length + employees.filter(e => e.status === 'Active').length;
        const pendingPayrolls = payrolls.filter(p => p.status === 'pending-manager').length;

        document.getElementById('kpiTotalOrders').textContent = totalOrders;
        document.getElementById('kpiPendingOrders').textContent = pendingOrders;
        document.getElementById('kpiActiveStaff').textContent = activeStaff;
        document.getElementById('kpiPendingPayrolls').textContent = pendingPayrolls;

        // Hero Widget
        document.getElementById('dashHeroPending').textContent = pendingOrders + pendingPayrolls;

        // ==========================================
        // 3. MODULE SUMMARIES
        // ==========================================
        document.getElementById('mgrModProcCount').textContent = procurement.length + ' REQUESTS';
        document.getElementById('mgrModProcPending').textContent = procurement.filter(p => p.status === 'pending-manager').length;

        const pendingAcc = accounts.filter(a => a.status === 'pending' || a.status === 'pending-manager').length;
        document.getElementById('mgrModAccCount').textContent = accounts.length + ' ACCOUNTS';
        document.getElementById('mgrModAccPending').textContent = pendingAcc;

        const pendingPay = payments.filter(p => p.status === 'pending-manager').length;
        document.getElementById('mgrModPayCount').textContent = payments.length + ' PAYMENTS';
        document.getElementById('mgrModPayPending').textContent = pendingPay;

        // ==========================================
        // 4. RECENT ORDERS
        // ==========================================
        const recentList = document.getElementById('mgrRecentOrdersList');
        if (orders.length === 0) {
            recentList.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">No orders yet</div>';
        } else {
            const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
            recentList.innerHTML = sortedOrders.map(o => `
                <div class="activity-item">
                    <div class="activity-icon" style="background:rgba(59,130,246,0.1);color:#2563eb;">📦</div>
                    <div class="activity-info">
                        <div class="activity-title">${esc(o.orderId || 'N/A')}</div>
                        <div class="activity-meta">${esc(o.customerName || 'Unknown')} • ${new Date(o.createdAt).toLocaleDateString('en-GB')}</div>
                    </div>
                    <div class="activity-amount">
                        <div class="activity-amount-value">TSh ${Number(o.totalAmount || 0).toLocaleString()}</div>
                        <div class="activity-amount-status" style="color:${o.status === 'pending' ? '#d97706' : '#16a34a'};">${(o.status || 'N/A').toUpperCase()}</div>
                    </div>
                </div>
            `).join('');
        }

        // ==========================================
        // 5. RENDER CHARTS
        // ==========================================
        renderManagerCharts(orders);

    } catch (err) {
        console.error('Manager dashboard error:', err);
        showErrorInEl('overviewContent', 'Failed: ' + err.message);
    }
}

let mgrOrderTrendInstance = null;
let mgrStatusBreakdownInstance = null;

function renderManagerCharts(orders) {
    // A. Line Chart ya Order Trend (Siku 7)
    const ctxTrend = document.getElementById('mgrOrderTrendChart');
    if (ctxTrend) {
        if (mgrOrderTrendInstance) mgrOrderTrendInstance.destroy();
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        });
        const counts = last7Days.map(dateStr => orders.filter(o => {
            if (!o.createdAt) return false;
            return new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) === dateStr;
        }).length);

        mgrOrderTrendInstance = new Chart(ctxTrend, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Orders',
                    data: counts,
                    borderColor: '#0f1f3d',
                    backgroundColor: 'rgba(15,31,61,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // B. Doughnut Chart ya Status Breakdown
    const ctxStatus = document.getElementById('mgrStatusBreakdownChart');
    if (ctxStatus) {
        if (mgrStatusBreakdownInstance) mgrStatusBreakdownInstance.destroy();
        
        const pending = orders.filter(o => o.status === 'pending').length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const rejected = orders.filter(o => o.status === 'rejected').length;

        mgrStatusBreakdownInstance = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Completed', 'Rejected'],
                datasets: [{
                    data: [pending, completed, rejected],
                    backgroundColor: ['#f59e0b', '#16a34a', '#dc2626'],
                    borderWidth: 3,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, cutout: '65%',
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
            }
        });
    }
}
function renderManagerOverview(orders, users, employees) {
    const container = document.getElementById('overviewContent');
    if (!container) return;

    const activeUsers = users.filter(u => u.status === 'Active');
    const activeEmp = employees.filter(e => e.status === 'Active');
    const pendingOrders = orders.filter(o => o.status === 'pending');

    container.innerHTML = `
        <div class="overview-shell">
            <div class="overview-showcase">
                <div class="overview-spotlight">
                    <span class="eyebrow">Operations Summary</span>
                    <h3>Welcome back, ${currentUser.fullName}</h3>
                    <p>
                        You are logged in as <strong>${currentUser.role}</strong>
                        ${currentUser.department ? `in <strong>${currentUser.department}</strong> department` : ''}.
                        Your leadership view is focused on sales momentum, operational efficiency, and team performance across the business.
                    </p>

                    <div class="overview-mini-grid">
                        <div class="mini-card">
                            <small>Active Team</small>
                            <strong>${activeUsers.length + activeEmp.length}</strong>
                        </div>
                        <div class="mini-card">
                            <small>Pending Sales</small>
                            <strong>${pendingOrders.length}</strong>
                        </div>
                        <div class="mini-card">
                            <small>Total Orders</small>
                            <strong>${orders.length}</strong>
                        </div>
                        <div class="mini-card">
                            <small>Staff Base</small>
                            <strong>${users.length + employees.length}</strong>
                        </div>
                    </div>
                </div>

                <div class="overview-control-panel">
                    <div class="control-box">
                        <div class="label">📧 Email</div>
                        <div class="value">${currentUser.email || '—'}</div>
                    </div>
                    <div class="control-box">
                        <div class="label">📞 Contact</div>
                        <div class="value">${currentUser.phone || '—'}</div>
                        <span class="trend-up">Live profile</span>
                    </div>
                    <div class="control-box">
                        <div class="label">🏢 Department</div>
                        <div class="value">${currentUser.department || '—'}</div>
                        <div class="small-progress"><span style="width: 70%"></span></div>
                    </div>
                </div>
            </div>

            <div class="overview-stat-grid">
                <div class="overview-stat-card blue">
                    <div class="stat-top">
                        <div class="stat-icon">📦</div>
                    </div>
                    <div class="stat-value">${orders.length}</div>
                    <div class="stat-label">Sales Orders</div>
                </div>
                <div class="overview-stat-card amber">
                    <div class="stat-top">
                        <div class="stat-icon">⏳</div>
                    </div>
                    <div class="stat-value">${pendingOrders.length}</div>
                    <div class="stat-label">Pending Orders</div>
                </div>
                <div class="overview-stat-card green">
                    <div class="stat-top">
                        <div class="stat-icon">👥</div>
                    </div>
                    <div class="stat-value">${activeUsers.length + activeEmp.length}</div>
                    <div class="stat-label">Active Staff</div>
                </div>
                <div class="overview-stat-card purple">
                    <div class="stat-top">
                        <div class="stat-icon">👤</div>
                    </div>
                    <div class="stat-value">${users.length + employees.length}</div>
                    <div class="stat-label">Total Staff</div>
                </div>
            </div>
        </div>
    `;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav a').forEach(link => link.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    const sidebarLink = document.querySelector(`.sidebar-nav a[onclick*="${tabId}"]`);
    if (sidebarLink) sidebarLink.classList.add('active');

    const dropdownTabs = ['tab-company-payments', 'tab-payroll', 'tab-fund-transfer', 'tab9', 'tab-accounts'];
    const dd = document.getElementById('sidebarApprovalsDropdown');
    if (dd && dropdownTabs.includes(tabId)) dd.classList.add('open');

    if (tabId === 'tab1') loadManagerDashboard();
    if (tabId === 'tab2') { renderCeilingAllocations(); loadMasterBudgetHistory(); }
    if (tabId === 'tab9') loadStaffList();
    if (tabId === 'tab-accounts') loadManagerCompanyAccounts();
    if (tabId === 'tab-company-payments') loadManagerCompanyPayments();
    if (tabId === 'tab-payroll') loadManagerPayrolls();
    if (tabId === 'tab-fund-transfer') loadManagerFundTransfers();
    if (tabId === 'tab-procurement-approvals') loadManagerProcurementApprovals();
    if (window.innerWidth <= 768) closeSidebar();
}
function toggleSidebarDropdown(event) {
    if (event) event.preventDefault();
    const dropdown = document.getElementById('sidebarApprovalsDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('sidebarApprovalsDropdown');
    if (dropdown && dropdown.classList.contains('open') && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
    }
});

async function loadStaffList() {
    const container = document.getElementById('staffListContainer');
    if (!container) return;

    showLoadingInEl('staffListContainer', 'Loading staff...');

    try {
        const [users, employees] = await Promise.all([
            API.getUsers().catch(() => []),
            API.getEmployees().catch(() => [])
        ]);

        const allStaff = [
            ...(users || []).map(u => ({
                source: 'user', id: u.id, employeeId: u.employeeId || 'N/A',
                fullName: u.fullName, position: u.role, department: u.department || '—',
                email: u.email, phone: u.phone || '—', basicSalary: 0, allowances: 0,
                paymentMode: '—', employmentType: 'Full-time', bankAccount: u.phone || '',
                tin: '', joinDate: u.createdAt || '', status: u.status, type: 'System User'
            })),
            ...(employees || []).map(e => ({
                source: 'employee', id: e.id, employeeId: e.employeeId,
                fullName: e.fullName, position: e.position, department: e.department,
                email: '—', phone: e.bankAccount || '—', basicSalary: e.basicSalary || 0,
                allowances: e.allowances || 0, paymentMode: e.paymentMode || '—',
                employmentType: e.employmentType || 'Employee', bankAccount: e.bankAccount || '',
                tin: e.tin || '', joinDate: e.joinDate || '', status: e.status,
                type: e.employmentType || 'Employee'
            }))
        ];

        window.__staffList = allStaff;

        const active = allStaff.filter(s => s.status === 'Active');
        const inactive = allStaff.filter(s => s.status !== 'Active');

        setElText('staffTotalCount', allStaff.length);
        setElText('staffActiveCount', active.length);
        setElText('staffInactiveCount', inactive.length);
        setElText('staffMonthlyPayroll', 'TSh ' + allStaff.reduce((sum, s) => sum + (s.basicSalary || 0), 0).toLocaleString());
        setElText('staffBadge', allStaff.length);
        setElText('navStaffBadge', allStaff.length);

        if (allStaff.length === 0) {
            container.innerHTML = `
                <div class="modern-empty-state">
                    <div class="mes-icon">👥</div>
                    <div class="mes-title">No Staff Found</div>
                    <div class="mes-desc">Staff will appear here.</div>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div class="modern-staff-table">
                <div class="mst-header">
                    <span>#</span><span>Name</span><span>Position</span><span>Department</span>
                    <span>Contact</span><span>Type</span><span>Status</span><span style="text-align:center;">Actions</span>
                </div>
                ${allStaff.map((person, i) => `
                    <div class="mst-row">
                        <span class="mst-num">${String(i + 1).padStart(2, '0')}</span>
                        <div>
                            <div class="mst-name">${esc(person.fullName)}</div>
                            <div class="mst-id">${esc(person.employeeId)}</div>
                        </div>
                        <span style="font-size:12px;color:#475569;font-weight:600;">${esc(person.position)}</span>
                        <span style="font-size:11px;color:#64748b;">${esc(person.department)}</span>
                        <span style="font-size:11px;color:#64748b;">${esc(person.email || person.phone || '—')}</span>
                        <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px;background:${person.source === 'user' ? 'rgba(15,31,61,0.1)' : 'rgba(245,158,11,0.15)'};color:${person.source === 'user' ? '#0f1f3d' : '#b45309'};text-transform:uppercase;text-align:center;">${esc(person.type)}</span>
                        <span style="font-size:9px;font-weight:800;padding:4px 8px;border-radius:8px;background:${person.status === 'Active' ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)'};color:${person.status === 'Active' ? '#15803d' : '#b91c1c'};text-align:center;text-transform:uppercase;">${esc(person.status)}</span>
                        <div style="display:flex;gap:4px;justify-content:center;">
                            ${person.source === 'employee' ? `
                                <button onclick="editEmployee('${person.employeeId}')" style="padding:6px 10px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🖋️</button>
                                <button onclick="deleteEmployee('${person.employeeId}')" style="padding:6px 10px;background:rgba(220,38,38,0.1);color:#dc2626;border:1px solid rgba(220,38,38,0.2);border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🗑️</button>
                            ` : `<span style="font-size:10px;color:#94a3b8;font-style:italic;">Read-only</span>`}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

    } catch (err) {
        console.error('Load staff error:', err);
        showErrorInEl('staffListContainer', 'Failed to load staff: ' + err.message);
    }
}
function openAddEmployeeModal() {
    editingEmployeeId = null;
    editingEmployeeSource = null;

    const title = document.getElementById('employeeModalTitle');
    if (title) title.textContent = '➕ Add New Employee';

    const nextNum = String(Math.floor(Math.random() * 900) + 100);
    const empIdField = document.getElementById('empId');
    if (empIdField) {
        empIdField.value = 'EMP-' + nextNum;
        empIdField.readOnly = false;
    }

    ['empName', 'empPosition', 'empSalary', 'empBankAccount', 'empTin'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    setElValue('empAllowances', '0');
    setElValue('empDepartment', '');
    setElValue('empPaymentMode', 'Bank Transfer');
    setElValue('empType', 'Full-time');
    setElValue('empJoinDate', new Date().toISOString().split('T')[0]);
    setElValue('empStatus', 'Active');

    const status = document.getElementById('addEmployeeStatus');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }

    showModal('addEmployeeModal');
}
function editEmployee(employeeId) {
    const staffList = window.__staffList || [];
    const person = staffList.find(s => s.employeeId === employeeId);

    if (!person) { showToast('⚠ Employee not found', 'error'); return; }
    if (person.source === 'user') { showToast('⚠ System users can only be edited by Super Admin', 'warning'); return; }

    editingEmployeeId = person.id;
    editingEmployeeSource = person.source;

    setElValue('empName', person.fullName);
    setElValue('empId', person.employeeId);
    setElValue('empPosition', person.position);
    setElValue('empDepartment', person.department);
    setElValue('empSalary', person.basicSalary || 0);
    setElValue('empAllowances', person.allowances || 0);
    setElValue('empPaymentMode', person.paymentMode || 'Bank Transfer');
    setElValue('empType', person.employmentType || 'Full-time');
    setElValue('empBankAccount', person.bankAccount || '');
    setElValue('empTin', person.tin || '');
    setElValue('empJoinDate', person.joinDate ? person.joinDate.split('T')[0] : '');
    setElValue('empStatus', person.status || 'Active');

    const title = document.getElementById('employeeModalTitle');
    if (title) title.textContent = '🖋️ Edit Employee';

    const empIdField = document.getElementById('empId');
    if (empIdField) empIdField.readOnly = true;

    const status = document.getElementById('addEmployeeStatus');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }

    showModal('addEmployeeModal');
}
async function submitAddEmployee() {
    const statusDiv = document.getElementById('addEmployeeStatus');

    const employeeData = {
        employeeId: document.getElementById('empId').value.trim(),
        fullName: document.getElementById('empName').value.trim(),
        position: document.getElementById('empPosition').value.trim(),
        department: document.getElementById('empDepartment').value,
        basicSalary: parseFloat(document.getElementById('empSalary').value) || 0,
        allowances: parseFloat(document.getElementById('empAllowances').value) || 0,
        paymentMode: document.getElementById('empPaymentMode').value,
        bankAccount: document.getElementById('empBankAccount').value.trim(),
        tin: document.getElementById('empTin').value.trim(),
        employmentType: document.getElementById('empType').value,
        joinDate: document.getElementById('empJoinDate').value,
        status: document.getElementById('empStatus').value
    };

    if (!employeeData.fullName || !employeeData.employeeId || !employeeData.position || !employeeData.department || !employeeData.basicSalary) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please fill all required fields.';
        return;
    }

    try {
        if (editingEmployeeId) {
            await API.updateEmployee(editingEmployeeId, employeeData);
            statusDiv.className = 'status-msg success';
            statusDiv.textContent = '✓ Employee updated successfully!';
            setTimeout(() => {
                closeModal('addEmployeeModal');
                loadStaffList();
                loadManagerDashboard();
                showToast('✅ Employee updated!', 'success');
                editingEmployeeId = null;
                editingEmployeeSource = null;
            }, 1000);
        } else {
            await API.createEmployee(employeeData);
            statusDiv.className = 'status-msg success';
            statusDiv.textContent = '✓ Employee added successfully!';
            setTimeout(() => {
                closeModal('addEmployeeModal');
                loadStaffList();
                loadManagerDashboard();
                showToast('✅ Employee added!', 'success');
            }, 1000);
        }
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}
async function deleteEmployee(employeeId) {
    if (!confirm(`Delete employee "${employeeId}"? This cannot be undone.`)) return;

    try {
        const staffList = window.__staffList || [];
        const person = staffList.find(s => s.employeeId === employeeId);

        if (!person) { showToast('⚠ Employee not found', 'error'); return; }
        if (person.source === 'user') { showToast('⚠ System users can only be deleted by Super Admin', 'warning'); return; }

        await API.deleteEmployee(person.id);
        showToast('🗑️ Employee deleted!', 'warning');
        loadStaffList();
        loadManagerDashboard();
    } catch (err) {
        showToast('❌ Failed to delete: ' + err.message, 'error');
    }
}
async function loadManagerCompanyAccounts() {
    const container = document.getElementById('managerAccountsContainer');
    if (!container) return;
    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading accounts...</div></div>`;

    try {
        const accounts = await API.getAccounts().catch(() => []);
        const safeAccounts = Array.isArray(accounts) ? accounts : [];

        const relevant = safeAccounts.filter(a =>
            a.status === 'pending' ||
            a.status === 'pending-manager' ||
            a.status === 'pending-ceo' ||
            a.status === 'approved'
        );

        relevant.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const pendingCount = safeAccounts.filter(a => a.status === 'pending' || a.status === 'pending-manager').length;
        setElText('managerSidebarAccountsBadge', pendingCount);
        const badgeEl = document.getElementById('managerSidebarAccountsBadge');
        if (badgeEl) badgeEl.textContent = `⏳ ${pendingCount} Pending`;

        if (relevant.length === 0) {
            container.innerHTML = `
                <div class="modern-empty-state">
                    <div class="mes-icon">🏦</div>
                    <div class="mes-title">No Accounts Pending</div>
                    <div class="mes-desc">Accounts from Finance will appear here.</div>
                </div>`;
            return;
        }

        const statusLabels = {
            'pending':         { label: 'Pending Manager', color: '#d97706', bg: 'rgba(245,158,11,0.15)', icon: '🟡' },
            'pending-manager': { label: 'Pending Manager', color: '#d97706', bg: 'rgba(245,158,11,0.15)', icon: '🟡' },
            'pending-ceo':     { label: 'Pending CEO',     color: '#c2410c', bg: 'rgba(234,88,12,0.15)',  icon: '🟠' },
            'approved':        { label: 'Approved',        color: '#16a34a', bg: 'rgba(34,197,94,0.15)',  icon: '✅' },
            'rejected':        { label: 'Rejected',        color: '#dc2626', bg: 'rgba(239,68,68,0.15)',  icon: '❌' }
        };

        const userRole = (currentUser?.role || '').toLowerCase();
        const isManager = userRole.includes('manager');

        container.innerHTML = relevant.map(acc => {
            const sInfo = statusLabels[acc.status] || statusLabels['pending'];
            const typeIcon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';
            const createdDate = acc.createdAt ? new Date(acc.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

            const statusClass = (acc.status === 'pending' || acc.status === 'pending-manager') ? 'pending'
                : acc.status === 'approved' ? 'approved' : 'rejected';

            let actions = `<button class="mrc-btn primary" onclick="viewManagerAccountDetails('${acc.id}')">👁 View</button>`;
            if ((acc.status === 'pending' || acc.status === 'pending-manager') && isManager) {
                actions += `<button class="mrc-btn gold" onclick="managerVerifyAccount('${acc.id}')">✅ Verify</button>
                            <button class="mrc-btn danger" onclick="managerRejectAccount('${acc.id}')">❌ Reject</button>`;
            }
            if (acc.status === 'approved') {
                actions += `<span class="mrc-badge green">🔒 Locked</span>`;
            }

            return `
                <div class="modern-request-card ${statusClass}">
                    <div class="mrc-header">
                        <div class="mrc-title-wrap">
                            <div class="mrc-id-row">
                                <span class="mrc-id">${typeIcon} ${esc(acc.name)}</span>
                                <span class="mrc-badge ${acc.status === 'approved' ? 'green' : acc.status === 'rejected' ? 'red' : 'gold'}">${sInfo.icon} ${sInfo.label}</span>
                            </div>
                            <div style="font-size:13px;color:#64748b;font-family:monospace;margin-bottom:6px;">${esc(acc.accountNumber)}</div>
                            ${acc.bankName ? `<div style="font-size:12px;color:#64748b;">🏛️ ${esc(acc.bankName)}${acc.branch ? ' — ' + esc(acc.branch) : ''}</div>` : ''}
                            <div class="mrc-meta" style="margin-top:8px;">
                                <span>📅 <strong>${createdDate}</strong></span>
                                <span>👤 <strong>${esc(acc.createdBy || acc.requester?.fullName || '—')}</strong></span>
                            </div>
                        </div>
                        <div class="mrc-amount-wrap">
                            <div class="mrc-amount" style="font-size:20px;">${acc.currency || 'TZS'} ${Number(acc.balance || 0).toLocaleString()}</div>
                            <div class="mrc-amount-label">Balance</div>
                        </div>
                    </div>
                    <div class="mrc-actions">${actions}</div>
                </div>`;
        }).join('');

    } catch (err) {
        console.error('Manager accounts error:', err);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}
async function managerVerifyAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { showToast('⚠ Account not found', 'error'); return; }

        const res = await modernConfirm({
            title: '✅ Verify Account?',
            message: `Verify "${acc.name}" and send to CEO for final approval?`,
            detail: { label: 'Account', value: `${acc.name} • ${acc.accountNumber}` },
            type: 'success',
            okText: '✅ Verify & Send to CEO',
            cancelText: 'Cancel'
        });
        if (!res.confirmed) return;

        await API.verifyAccount(id, {
            managerVerifiedBy: currentUser?.fullName || 'Manager'
        });

        modernToast('✅ Verified', `Account "${acc.name}" sent to CEO.`, 'success');
        await loadManagerCompanyAccounts();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
async function managerRejectAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { showToast('⚠ Account not found', 'error'); return; }

        const res = await modernConfirm({
            title: '❌ Reject Account?',
            message: `Provide a reason for rejecting "${acc.name}". Finance will see this reason.`,
            detail: { label: 'Account', value: `${acc.name} • ${acc.accountNumber}` },
            type: 'danger',
            okText: '❌ Reject Account',
            cancelText: 'Cancel',
            needsReason: true,
            reasonLabel: 'Rejection Reason'
        });
        if (!res.confirmed) return;

        await API.updateAccount(id, {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: 'Manager',
            rejectionReason: res.reason
        });

        modernToast('❌ Rejected', `Account "${acc.name}" has been rejected.`, 'warning');
        await loadManagerCompanyAccounts();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
async function viewManagerAccountDetails(accountId) {
    const accounts = await API.getAccounts().catch(() => []);
    const acc = accounts.find(a => String(a.id) === String(accountId));
    if (!acc) { showToast('⚠ Account not found', 'error'); return; }

    const typeIcon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';
    const statusLabels = {
        'draft':           { label: 'Draft',           color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '📝' },
        'pending':         { label: 'Pending Manager', color: '#d97706', bg: 'rgba(245,158,11,0.15)',  icon: '🟡' },
        'pending-manager': { label: 'Pending Manager', color: '#d97706', bg: 'rgba(245,158,11,0.15)',  icon: '🟡' },
        'pending-ceo':     { label: 'Pending CEO',     color: '#c2410c', bg: 'rgba(234,88,12,0.15)',   icon: '🟠' },
        'approved':        { label: 'Approved & Locked',color: '#16a34a', bg: 'rgba(34,197,94,0.15)',   icon: '✅' },
        'rejected':        { label: 'Rejected',        color: '#dc2626', bg: 'rgba(239,68,68,0.15)',   icon: '❌' }
    };
    const sInfo = statusLabels[acc.status] || statusLabels['draft'];

    let modal = document.getElementById('managerAccountViewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="managerAccountViewModal">
                <div class="modal-box" style="max-width:560px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#0f1f3d 0%,#1a3a6b 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">🏦 Account Details</h3>
                        <button onclick="closeModal('managerAccountViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="managerAccountViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                        <button onclick="closeModal('managerAccountViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('managerAccountViewModal');
    }

    const rowStyle = 'display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100);gap:16px;align-items:flex-start;';
    const labelStyle = 'font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;flex-shrink:0;';
    const valueStyle = 'font-size:13.5px;font-weight:600;color:#1e293b;text-align:right;word-break:break-word;max-width:60%;';

    document.getElementById('managerAccountViewBody').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${sInfo.bg};border-radius:10px;border-left:4px solid ${sInfo.color};">
            <div style="font-size:12px;font-weight:700;color:${sInfo.color};text-transform:uppercase;">Status</div>
            <div style="font-size:14px;font-weight:800;color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
        </div>
        <div style="${rowStyle}"><span style="${labelStyle}">Account Name</span><span style="${valueStyle}">${esc(acc.name)}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Account Number</span><span style="${valueStyle}font-family:monospace;">${esc(acc.accountNumber)}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Type</span><span style="${valueStyle}">${esc(acc.type || '—')}</span></div>
        ${acc.bankName ? `<div style="${rowStyle}"><span style="${labelStyle}">Bank</span><span style="${valueStyle}">${esc(acc.bankName)}</span></div>` : ''}
        ${acc.branch ? `<div style="${rowStyle}"><span style="${labelStyle}">Branch</span><span style="${valueStyle}">${esc(acc.branch)}</span></div>` : ''}
        <div style="${rowStyle}"><span style="${labelStyle}">Currency</span><span style="${valueStyle}">${esc(acc.currency || 'TZS')}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Balance</span><span style="${valueStyle}color:#0f766e;font-weight:800;">${acc.currency || 'TZS'} ${Number(acc.balance || 0).toLocaleString()}</span></div>
        <div style="${rowStyle}"><span style="${labelStyle}">Created By</span><span style="${valueStyle}">${esc(acc.createdBy || acc.requester?.fullName || '—')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;gap:16px;align-items:flex-start;">
            <span style="${labelStyle}">Created At</span>
            <span style="${valueStyle}">${acc.createdAt ? new Date(acc.createdAt).toLocaleString() : '—'}</span>
        </div>
        ${acc.notes ? `<div style="margin-top:14px;padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #0f766e;font-size:13px;color:#334155;line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#0f766e;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Notes</strong>${esc(acc.notes)}</div>` : ''}
        ${acc.rejectionReason ? `<div style="margin-top:14px;padding:12px 16px;background:rgba(239,68,68,0.08);border-radius:8px;border-left:3px solid #ef4444;font-size:13px;color:#7f1d1d;line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#dc2626;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Rejection Reason</strong>${esc(acc.rejectionReason)}</div>` : ''}
    `;

    modal.classList.add('show');
}

// ================================================================
// COMPANY PAYMENTS APPROVAL (MANAGER)
// ================================================================
let allCompanyPayments = [];
let currentManagerCPFilter = { status: 'pending-manager' };

async function loadManagerCompanyPayments() {
    const container = document.getElementById('managerCompanyPaymentsContainer');
    if (!container) return;

    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading payments...</div></div>`;

    try {
        let payments = [];
        if (typeof API.getCompanyPayments === 'function') {
            payments = await API.getCompanyPayments().catch(() => []);
        }

        allCompanyPayments = Array.isArray(payments) ? payments : [];
        allCompanyPayments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        renderManagerPaymentStats();
        renderManagerPaymentsList();
    } catch (err) {
        console.error('Load manager payments error:', err);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}

function renderManagerPaymentStats() {
    const pm = allCompanyPayments.filter(p => p.status === 'pending-manager');
    const ap = allCompanyPayments.filter(p => p.status === 'pending-ceo');
    const rej = allCompanyPayments.filter(p => p.status === 'rejected' && p.rejectedBy === 'Manager');
    const total = allCompanyPayments.length;

    const sum = arr => arr.reduce((s, p) => s + Number(p.amount || 0), 0);
    const fmt = n => 'TSh ' + Number(n).toLocaleString();

    setElText('navManagerPaymentsBadge', pm.length);
    const navBadge = document.getElementById('navManagerPaymentsBadge');
    if (navBadge) navBadge.textContent = pm.length;

    const countBadge = document.getElementById('mgrPaymentsCountBadge');
    if (countBadge) countBadge.textContent = `⏳ ${pm.length} Pending`;

    const s1 = document.getElementById('mgrStatPending');
    const s2 = document.getElementById('mgrStatSentToCeo');
    const s3 = document.getElementById('mgrStatRejected');
    const s4 = document.getElementById('mgrStatTotal');

    if (s1) s1.textContent = fmt(sum(pm));
    if (s2) s2.textContent = fmt(sum(ap));
    if (s3) s3.textContent = rej.length + ' payment' + (rej.length === 1 ? '' : 's');
    if (s4) s4.textContent = total + ' total';
}

function renderManagerPaymentsList() {
    const container = document.getElementById('managerCompanyPaymentsContainer');
    if (!container) return;

    let filtered = allCompanyPayments;
    if (currentManagerCPFilter.status) {
        if (currentManagerCPFilter.status === 'pending-manager') {
            filtered = filtered.filter(p => p.status === 'pending-manager');
        } else if (currentManagerCPFilter.status === 'pending-ceo') {
            filtered = filtered.filter(p => p.status === 'pending-ceo');
        } else if (currentManagerCPFilter.status === 'rejected') {
            filtered = filtered.filter(p => p.status === 'rejected');
        }
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="modern-empty-state">
                <div class="mes-icon">📭</div>
                <div class="mes-title">${allCompanyPayments.length === 0 ? 'No Company Payments Yet' : 'No Payments Match Filter'}</div>
                <div class="mes-desc">${allCompanyPayments.length === 0 ? 'Payments sent by Finance will appear here.' : 'Try a different filter.'}</div>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(p => {
        const typeInfo = getCPTypeInfo(p.type);
        const statusInfo = getCPStatusInfo(p.status);
        const statusClass = p.status === 'pending-manager' ? 'pending' : p.status === 'rejected' ? 'rejected' : 'approved';
        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        let actions = `<button class="mrc-btn primary" onclick="viewManagerPayment('${p.id}')">👁 View</button>`;
        if (p.status === 'pending-manager') {
            actions += `<button class="mrc-btn gold" onclick="managerVerifyPayment('${p.id}')">✅ Verify & Send to CEO</button>
                        <button class="mrc-btn danger" onclick="managerRejectPayment('${p.id}')">❌ Reject</button>`;
        }

        return `
            <div class="modern-request-card ${statusClass}">
                <div class="mrc-header">
                    <div class="mrc-title-wrap">
                        <div class="mrc-id-row">
                            <span class="mrc-id">${esc(p.reference || '—')}</span>
                            <span class="mrc-badge navy">${typeInfo.icon} ${typeInfo.label}</span>
                            <span class="mrc-badge ${p.status === 'pending-manager' ? 'gold' : p.status === 'rejected' ? 'red' : 'green'}">${statusInfo.icon} ${statusInfo.label}</span>
                        </div>
                        <div class="mrc-title">${esc(p.vendor || '—')}</div>
                        ${p.description ? `<div style="font-size:13px;color:#64748b;line-height:1.5;margin-bottom:8px;">${esc(p.description)}</div>` : ''}
                        <div class="mrc-meta">
                            <span>📅 <strong>${createdDate}</strong></span>
                            ${p.dueDate ? `<span>⏰ <strong>${new Date(p.dueDate).toLocaleDateString('en-GB')}</strong></span>` : ''}
                            <span>👤 <strong>${esc(p.createdBy || '—')}</strong></span>
                        </div>
                    </div>
                    <div class="mrc-amount-wrap">
                        <div class="mrc-amount">TSh ${Number(p.amount || 0).toLocaleString()}</div>
                        <div class="mrc-amount-label">Amount</div>
                    </div>
                </div>
                <div class="mrc-actions">${actions}</div>
            </div>`;
    }).join('');
}

function filterManagerPayments(status) {
    currentManagerCPFilter = { status };
    document.querySelectorAll('.mgr-cp-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === status);
    });
    renderManagerPaymentsList();
}

async function managerVerifyPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await modernConfirm({
        title: '✅ Verify Payment?',
        message: `Verify payment "${p.reference}" (TSh ${Number(p.amount).toLocaleString()}) and send to CEO for approval?`,
        detail: {
            label: 'Reference • Amount',
            value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}`
        },
        type: 'success',
        okText: '✅ Verify & Send to CEO',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    const updated = {
        ...p,
        status: 'pending-ceo',
        managerVerifiedAt: new Date().toISOString(),
        managerVerifiedBy: currentUser?.fullName || 'Manager'
    };

    try {
        await persistManagerPayment(updated);
        if (p.procurementRequestId) {
            await API.updateProcurementStatus(p.procurementRequestId, { status: 'pending-ceo' });
        }
        modernToast('✅ Verified', `Payment ${p.reference} sent to CEO.`, 'success');
        await loadManagerCompanyPayments();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function managerRejectPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await modernConfirm({
        title: '❌ Reject Payment?',
        message: `Please provide a reason for rejecting payment "${p.reference}". Finance will see this reason.`,
        detail: {
            label: 'Reference • Amount',
            value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}`
        },
        type: 'danger',
        okText: '❌ Reject Payment',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });

    if (!res.confirmed) return;

    const updated = {
        ...p,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: 'Manager',
        rejectionReason: res.reason
    };

    try {
        await persistManagerPayment(updated);
        modernToast('❌ Rejected', `Payment ${p.reference} rejected. Finance notified.`, 'warning');
        await loadManagerCompanyPayments();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

function viewManagerPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) { modernToast('Not Found', 'Payment not found', 'error'); return; }

    const typeInfo = getCPTypeInfo(p.type);
    const statusInfo = getCPStatusInfo(p.status);

    let modal = document.getElementById('managerPaymentViewModal');
    if (!modal) {
        const html = `
            <div class="modal-overlay" id="managerPaymentViewModal">
                <div class="modal-box" style="max-width:560px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#0f1f3d 0%,#1a3a6b 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">💸 Payment Details</h3>
                        <button onclick="closeModal('managerPaymentViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="managerPaymentViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;">
                        <button onclick="closeModal('managerPaymentViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    document.getElementById('managerPaymentViewBody').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${statusInfo.color}20;border-radius:10px;border-left:4px solid ${statusInfo.color};">
            <div style="font-size:12px;font-weight:700;color:${statusInfo.color};text-transform:uppercase;">Status</div>
            <div style="font-size:14px;font-weight:800;color:${statusInfo.color};">${statusInfo.icon} ${statusInfo.label}</div>
        </div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:13px;"><span style="color:var(--gray-500);">Reference</span><span style="font-family:monospace;color:#0f1f3d;font-weight:700;">${esc(p.reference)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:13px;"><span style="color:var(--gray-500);">Type</span><span>${typeInfo.icon} ${typeInfo.label}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:13px;"><span style="color:var(--gray-500);">Vendor</span><span>${esc(p.vendor || '—')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:13px;"><span style="color:var(--gray-500);">Amount</span><span style="color:#0f1f3d;font-weight:900;">TSh ${Number(p.amount || 0).toLocaleString()}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:13px;"><span style="color:var(--gray-500);">Due Date</span><span>${p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-GB') : '—'}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:13px;"><span style="color:var(--gray-500);">Method</span><span>${esc(p.method || '—')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:13px;"><span style="color:var(--gray-500);">Created By</span><span>${esc(p.createdBy || '—')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;"><span style="color:var(--gray-500);">Created At</span><span>${p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</span></div>
        ${p.description ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid #0f1f3d;font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#0f1f3d;font-size:11px;text-transform:uppercase;">Description</strong>${esc(p.description)}</div>` : ''}
    `;

    document.getElementById('managerPaymentViewModal').classList.add('show');
}

async function persistManagerPayment(payment) {
    try {
        if (typeof API.updateCompanyPayment === 'function') {
            await API.updateCompanyPayment(payment.id, payment);
            return;
        }
    } catch (e) {
        console.warn('API update failed:', e.message);
    }
    throw new Error('Failed to update payment');
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
// EDIT PROFILE
// ================================================================
function openEditProfileModal() {
    if (!currentUser) {
        currentUser = Auth.getUser();
        if (!currentUser) { showToast('⚠ User data not found. Please login again.', 'error'); return; }
    }

    setElValue('editProfileName', currentUser.fullName);
    setElValue('editProfileTitle', currentUser.role);
    setElValue('editProfileEmail', currentUser.email);
    setElValue('editProfilePhone', currentUser.phone);
    setElValue('editProfileDepartment', currentUser.department);
    setElValue('editProfileEmployeeId', currentUser.employeeId);

    const preview = document.getElementById('editPicPreview');
    if (preview) {
        const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        if (currentUser.profilePic) preview.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile">`;
        else preview.innerHTML = `<span>${initials}</span>`;
    }

    currentProfilePic = currentUser.profilePic || null;
    const status = document.getElementById('editProfileStatus');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }
    showModal('editProfileModal');
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('⚠ Image too large (max 2MB)', 'error'); return; }
    if (!file.type.startsWith('image/')) { showToast('⚠ Please select an image', 'error'); return; }

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

    const saveBtn = document.querySelector('#editProfileModal .btn-action.primary');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

    try {
        const payload = { phone };
        if (currentProfilePic !== currentUser.profilePic) payload.profilePic = currentProfilePic;
        const response = await API.updateOwnProfile(payload);
        currentUser = { ...currentUser, ...response.user };
        const token = Auth.getToken();
        Auth.saveSession(token, currentUser);
        renderManagerProfile();
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Profile updated successfully!';
        if (typeof Toast !== 'undefined') Toast.success('✅ Profile saved!');
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
// HELPERS
// ================================================================
function setElText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setElValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function showLoadingInEl(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">${message}</div></div>`;
}

function showEmptyInEl(id, icon, title, desc) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `
        <div class="modern-empty-state">
            <div class="mes-icon">${icon}</div>
            <div class="mes-title">${title}</div>
            <div class="mes-desc">${desc}</div>
        </div>
    `;
}

function showErrorInEl(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `
        <div class="modern-empty-state">
            <div class="mes-icon">❌</div>
            <div class="mes-title">Error</div>
            <div class="mes-desc">${esc(message)}</div>
        </div>
    `;
}

// ================================================================
// PAYROLL — MANAGER (API ONLY)
// ================================================================
async function loadManagerPayrolls() {
    const container = document.getElementById('managerPayrollsContainer');
    if (!container) return;

    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading payrolls...</div></div>`;

    try {
        const payrolls = await API.getPayrolls();
        const pending = payrolls.filter(p => p.status === 'pending-manager');

        const badge = document.getElementById('navPayrollBadge');
        if (badge) badge.textContent = pending.length;

        const countBadge = document.getElementById('mgrPayrollCountBadge');
        if (countBadge) countBadge.textContent = `⏳ ${pending.length} Pending`;

        if (pending.length === 0) {
            container.innerHTML = `
                <div class="modern-empty-state">
                    <div class="mes-icon">💵</div>
                    <div class="mes-title">No Payrolls Pending</div>
                    <div class="mes-desc">Payrolls sent by Finance will appear here.</div>
                </div>`;
            return;
        }

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        container.innerHTML = pending.map(p => `
            <div class="modern-request-card pending">
                <div class="mrc-header">
                    <div class="mrc-title-wrap">
                        <div class="mrc-id-row">
                            <span class="mrc-id">${esc(p.payrollId)}</span>
                            <span class="mrc-badge gold">⏳ Pending Manager</span>
                        </div>
                        <div class="mrc-title">${monthNames[p.month - 1]} ${p.year}</div>
                        <div class="mrc-meta">
                            <span>👥 <strong>${p.items?.length || 0} employees</strong></span>
                        </div>
                    </div>
                    <div class="mrc-amount-wrap">
                        <div class="mrc-amount">TSh ${Number(p.totalAmount).toLocaleString()}</div>
                        <div class="mrc-amount-label">Total Payroll</div>
                    </div>
                </div>
                <div class="mrc-actions">
                    <button class="mrc-btn primary" onclick="viewManagerPayroll('${p.id}')">👁 View</button>
                    <button class="mrc-btn gold" onclick="managerVerifyPayroll('${p.id}')">✅ Verify & Send to CEO</button>
                    <button class="mrc-btn danger" onclick="managerRejectPayroll('${p.id}')">❌ Reject</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('loadManagerPayrolls error:', error);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(error.message)}</div></div>`;
    }
}

async function managerVerifyPayroll(id) {
    const res = await modernConfirm({
        title: '✅ Verify Payroll?',
        message: 'Verify this payroll and send to CEO for final approval?',
        type: 'success',
        okText: '✅ Verify & Send',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        await API.updatePayrollStatus(id, {
            status: 'pending-ceo',
            actionBy: currentUser?.fullName || 'Manager'
        });
        modernToast('✅ Verified', 'Payroll sent to CEO.', 'success');
        loadManagerPayrolls();
    } catch (error) {
        modernToast('Error', error.message, 'error');
    }
}

async function managerRejectPayroll(id) {
    const res = await modernConfirm({
        title: '❌ Reject Payroll?',
        message: 'Provide a reason for rejecting this payroll.',
        type: 'danger',
        okText: '❌ Reject',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });
    if (!res.confirmed) return;

    try {
        await API.updatePayrollStatus(id, {
            status: 'rejected',
            actionBy: currentUser?.fullName || 'Manager',
            reason: res.reason
        });
        modernToast('❌ Rejected', 'Payroll rejected.', 'warning');
        loadManagerPayrolls();
    } catch (error) {
        modernToast('Error', error.message, 'error');
    }
}

async function viewManagerPayroll(id) {
    try {
        const p = await API.getPayroll(id);
        if (!p) { modernToast('Not Found', 'Payroll not found', 'error'); return; }

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const statusInfo = {
            'draft':            { icon: '📝', label: 'Draft',            color: '#64748b' },
            'pending-manager':  { icon: '🟡', label: 'Pending Manager',  color: '#d97706' },
            'pending-ceo':      { icon: '🟠', label: 'Pending CEO',      color: '#c2410c' },
            'approved':         { icon: '🟢', label: 'Approved',         color: '#16a34a' },
            'paid':             { icon: '✅', label: 'Paid',             color: '#0f766e' },
            'rejected':         { icon: '❌', label: 'Rejected',         color: '#dc2626' }
        };
        const sInfo = statusInfo[p.status] || statusInfo['draft'];

        const body = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${sInfo.color}15;border-radius:10px;border-left:4px solid ${sInfo.color};">
                <div style="font-size:12px;font-weight:700;color:${sInfo.color};text-transform:uppercase;">Status</div>
                <div style="font-size:14px;font-weight:800;color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
            </div>
            <div style="margin-bottom: 16px;">
                <div style="font-family: monospace; font-weight: 800; color: #0f1f3d; font-size: 16px;">${esc(p.payrollId)}</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 4px;">
                    ${monthNames[p.month - 1]} ${p.year}
                </div>
            </div>
            <div style="background: white; border-radius: 10px; overflow: hidden; border: 1px solid var(--gray-200);">
                <div style="display: grid; grid-template-columns: 40px 1.5fr 1fr 1fr 1fr; gap: 8px; padding: 10px 14px; background: var(--gray-50); border-bottom: 2px solid var(--gray-200); font-size: 10px; font-weight: 800; color: var(--gray-500); text-transform: uppercase;">
                    <span>#</span><span>Employee</span><span>Basic</span><span>Allowances</span><span>Net Pay</span>
                </div>
                ${(p.items || []).map((item, i) => `
                    <div style="display: grid; grid-template-columns: 40px 1.5fr 1fr 1fr 1fr; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--gray-100); font-size: 12px; align-items: center;">
                        <span style="font-weight: 800; color: #0f1f3d;">${String(i+1).padStart(2,'0')}</span>
                        <div>
                            <div style="font-weight: 700;">${esc(item.employeeName)}</div>
                            <div style="font-size: 10px; color: #64748b; font-family: monospace;">${esc(item.employeeId)}</div>
                        </div>
                        <span>TSh ${Number(item.basicSalary).toLocaleString()}</span>
                        <span style="color: #16a34a;">+TSh ${Number(item.allowances).toLocaleString()}</span>
                        <span style="font-weight: 800; color: #0f1f3d;">TSh ${Number(item.netPay).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 14px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #0f1f3d; display: flex; justify-content: space-between;">
                <span style="font-weight: 700;">TOTAL:</span>
                <span style="font-weight: 900; color: #0f1f3d; font-size: 18px;">TSh ${Number(p.totalAmount).toLocaleString()}</span>
            </div>
            ${p.rejectionReason ? `
            <div style="margin-top: 14px; padding: 12px 16px; background: rgba(239,68,68,0.08); border-radius: 8px; border-left: 4px solid #ef4444; font-size: 13px; color: #7f1d1d; line-height: 1.6;">
                <strong style="display:block;margin-bottom:4px;color:#dc2626;font-size:11px;text-transform:uppercase;">Rejection Reason</strong>
                ${esc(p.rejectionReason)}
            </div>` : ''}
        `;

        let modal = document.getElementById('managerPayrollDetailModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="managerPayrollDetailModal">
                    <div class="modal-box" style="max-width:720px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                        <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b);padding:18px 24px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                            <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">💸 Payroll Details</h3>
                            <button onclick="closeModal('managerPayrollDetailModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                        <div id="managerPayrollDetailBody" style="padding:20px 24px;overflow-y:auto;flex:1;"></div>
                        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
                            <button onclick="closeModal('managerPayrollDetailModal')" class="btn-cancel">Close</button>
                        </div>
                    </div>
                </div>
            `);
            modal = document.getElementById('managerPayrollDetailModal');
        }
        document.getElementById('managerPayrollDetailBody').innerHTML = body;
        modal.classList.add('show');
    } catch (error) {
        modernToast('Error', error.message, 'error');
    }
}

// ================================================================
// FUND TRANSFER — MANAGER
// ================================================================
let allManagerFundTransfers = [];

async function loadManagerFundTransfers() {
    const container = document.getElementById('managerFundTransfersContainer');
    if (!container) return;

    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading transfers...</div></div>`;

    try {
        const transfers = await API.getFundTransfers();
        allManagerFundTransfers = Array.isArray(transfers) ? transfers : [];
        allManagerFundTransfers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const pending = allManagerFundTransfers.filter(t => t.status === 'pending-manager');

        const navBadge = document.getElementById('navFundTransferBadge');
        if (navBadge) navBadge.textContent = pending.length;

        const countBadge = document.getElementById('mgrFundTransferCountBadge');
        if (countBadge) countBadge.textContent = `⏳ ${pending.length} Pending`;

        renderManagerFundTransfersList(pending);

    } catch (err) {
        console.error('❌ loadManagerFundTransfers error:', err);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}

function renderManagerFundTransfersList(transfers) {
    const container = document.getElementById('managerFundTransfersContainer');
    if (!container) return;

    if (transfers.length === 0) {
        container.innerHTML = `
            <div class="modern-empty-state">
                <div class="mes-icon">💸</div>
                <div class="mes-title">No Transfers Pending</div>
                <div class="mes-desc">Transfers sent by Finance will appear here.</div>
            </div>`;
        return;
    }

    container.innerHTML = transfers.map(t => {
        const createdDate = t.createdAt ? new Date(t.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        return `
            <div class="modern-request-card pending">
                <div class="mrc-header">
                    <div class="mrc-title-wrap">
                        <div class="mrc-id-row">
                            <span class="mrc-id">${esc(t.transferId)}</span>
                            <span class="mrc-badge gold">⏳ Pending Manager</span>
                        </div>
                        ${t.reason ? `<div style="font-size:13px;color:#64748b;line-height:1.5;margin-bottom:8px;">${esc(t.reason)}</div>` : ''}
                        <div class="mrc-meta">
                            <span>📅 <strong>${createdDate}</strong></span>
                            <span>👤 <strong>${esc(t.createdBy || '—')}</strong></span>
                        </div>
                    </div>
                    <div class="mrc-amount-wrap">
                        <div class="mrc-amount">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</div>
                        <div class="mrc-amount-label">Amount</div>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:14px 18px;background:#f8fafc;border-radius:10px;margin:14px 0;border:1px solid #e5e7eb;">
                    <div style="flex:1;min-width:180px;">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">📤 From</div>
                        <div style="font-size:13px;font-weight:800;color:#1e293b;">${esc(t.fromAccount?.name || '—')}</div>
                        <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px;">${esc(t.fromAccount?.accountNumber || '')}</div>
                    </div>
                    <div style="font-size:20px;color:#0f1f3d;font-weight:900;">→</div>
                    <div style="flex:1;min-width:180px;">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">📥 To</div>
                        <div style="font-size:13px;font-weight:800;color:#1e293b;">${esc(t.toAccount?.name || '—')}</div>
                        <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px;">${esc(t.toAccount?.accountNumber || '')}</div>
                    </div>
                </div>

                <div class="mrc-actions">
                    <button class="mrc-btn primary" onclick="viewManagerFundTransfer('${t.id}')">👁 View</button>
                    <button class="mrc-btn gold" onclick="managerVerifyFundTransfer('${t.id}')">✅ Verify & Send to CEO</button>
                    <button class="mrc-btn danger" onclick="managerRejectFundTransfer('${t.id}')">❌ Reject</button>
                </div>
            </div>
        `;
    }).join('');
}

async function managerVerifyFundTransfer(id) {
    const t = allManagerFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const res = await modernConfirm({
        title: '✅ Verify Transfer?',
        message: `Verify transfer ${t.transferId} (${t.currency} ${Number(t.amount).toLocaleString()}) and send to CEO for approval?`,
        detail: {
            label: 'From → To',
            value: `${t.fromAccount?.name} → ${t.toAccount?.name}`
        },
        type: 'success',
        okText: '✅ Verify & Send to CEO',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    try {
        await API.verifyFundTransfer(id);
        modernToast('✅ Verified', `Transfer ${t.transferId} sent to CEO.`, 'success');
        await loadManagerFundTransfers();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function managerRejectFundTransfer(id) {
    const t = allManagerFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const res = await modernConfirm({
        title: '❌ Reject Transfer?',
        message: `Provide a reason for rejecting transfer ${t.transferId}. Finance will see this reason.`,
        detail: {
            label: 'From → To',
            value: `${t.fromAccount?.name} → ${t.toAccount?.name}`
        },
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
        await loadManagerFundTransfers();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function viewManagerFundTransfer(id) {
    const t = allManagerFundTransfers.find(x => String(x.id) === String(id));
    if (!t) { modernToast('Not Found', 'Transfer not found', 'error'); return; }

    const sInfo = {
        'draft':           { icon: '📝', label: 'Draft',           color: '#64748b' },
        'pending-manager': { icon: '🟡', label: 'Pending Manager', color: '#d97706' },
        'pending-ceo':     { icon: '🟠', label: 'Pending CEO',     color: '#c2410c' },
        'approved':        { icon: '🟢', label: 'Approved',        color: '#14b8a6' },
        'completed':       { icon: '✅', label: 'Completed',       color: '#16a34a' },
        'rejected':        { icon: '❌', label: 'Rejected',        color: '#dc2626' }
    }[t.status] || { icon: '📝', label: 'Unknown', color: '#64748b' };

    let modal = document.getElementById('managerFTViewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="managerFTViewModal">
                <div class="modal-box" style="max-width:600px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">💸 Transfer Details</h3>
                        <button onclick="closeModal('managerFTViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="managerFTViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                        <button onclick="closeModal('managerFTViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('managerFTViewModal');
    }

    document.getElementById('managerFTViewBody').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${sInfo.color}20;border-radius:10px;border-left:4px solid ${sInfo.color};">
            <div style="font-size:12px;font-weight:700;color:${sInfo.color};text-transform:uppercase;">Status</div>
            <div style="font-size:14px;font-weight:800;color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
        </div>

        <div class="info-row"><span class="label">Transfer ID</span><span class="value" style="font-family:monospace;">${esc(t.transferId)}</span></div>
        <div class="info-row"><span class="label">From Account</span><span class="value">${esc(t.fromAccount?.name || '—')} • ${esc(t.fromAccount?.accountNumber || '')}</span></div>
        <div class="info-row"><span class="label">To Account</span><span class="value">${esc(t.toAccount?.name || '—')} • ${esc(t.toAccount?.accountNumber || '')}</span></div>
        <div class="info-row"><span class="label">Amount</span><span class="value" style="color:#0f1f3d;font-weight:900;font-size:16px;">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</span></div>
        <div class="info-row"><span class="label">Created By</span><span class="value">${esc(t.createdBy || '—')}</span></div>
        <div class="info-row"><span class="label">Created At</span><span class="value">${t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</span></div>

        ${t.reason ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid #0f1f3d;font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#0f1f3d;font-size:11px;text-transform:uppercase;">Reason</strong>${esc(t.reason)}</div>` : ''}
    `;

    modal.classList.add('show');
}

// ================================================================
// CHANGE PASSWORD
// ================================================================
function openChangePasswordModal() {
    document.getElementById('cpCurrentPassword').value = '';
    document.getElementById('cpNewPassword').value = '';
    document.getElementById('cpConfirmPassword').value = '';
    document.getElementById('cpStatusMsg').className = 'status-msg';
    document.getElementById('cpStatusMsg').textContent = '';
    document.getElementById('changePasswordModal').classList.add('show');
}

async function submitChangePassword() {
    const currentPassword = document.getElementById('cpCurrentPassword').value;
    const newPassword = document.getElementById('cpNewPassword').value;
    const confirmPassword = document.getElementById('cpConfirmPassword').value;
    const statusDiv = document.getElementById('cpStatusMsg');
    const saveBtn = document.getElementById('cpSaveBtn');

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

        showToast('✅ Password changed successfully!', 'success');
        closeModal('changePasswordModal');

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
// MANAGER: PROCUREMENT APPROVALS (With History)
// ================================================================
let mgrAllProcurementRequests = [];
let currentMgrProcFilter = 'pending-manager';

async function loadManagerProcurementApprovals() {
    const container = document.getElementById('procurementApprovalsContainer');
    if (!container) return;

    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading requests...</div></div>`;

    try {
        const all = await API.getProcurementRequests('/all');
        const list = Array.isArray(all) ? all : [];

        mgrAllProcurementRequests = list.filter(r =>
            r.status === 'pending-manager' ||
            r.status === 'pending-ceo' ||
            r.status === 'pending-purchaser-details' ||
            r.status === 'pending-finance' ||
            r.status === 'pending-payment-approval' ||
            r.status === 'payment-approved' ||
            r.status === 'paid' ||
            r.status === 'completed' ||
            (r.status === 'returned' && r.rejection_stage === 'manager') ||
            (r.status === 'rejected' && r.rejection_stage === 'manager')
        );

        const pending = mgrAllProcurementRequests.filter(r => r.status === 'pending-manager');
        const approved = mgrAllProcurementRequests.filter(r =>
            ['pending-ceo','pending-purchaser-details','pending-finance','pending-payment-approval','payment-approved','paid','completed'].includes(r.status)
        );
        const rejected = mgrAllProcurementRequests.filter(r =>
            (r.status === 'returned' || r.status === 'rejected') && r.rejection_stage === 'manager'
        );

        const sidebarBadge = document.getElementById('navProcurementBadge');
        if (sidebarBadge) sidebarBadge.textContent = pending.length;

        const countBadge = document.getElementById('mgrProcurementCountBadge');
        if (countBadge) countBadge.textContent = `⏳ ${pending.length} Pending`;

        const elPending = document.getElementById('mgrProcPendingCount');
        const elApproved = document.getElementById('mgrProcApprovedCount');
        const elRejected = document.getElementById('mgrProcRejectedCount');
        if (elPending) elPending.textContent = pending.length ? `(${pending.length})` : '';
        if (elApproved) elApproved.textContent = approved.length ? `(${approved.length})` : '';
        if (elRejected) elRejected.textContent = rejected.length ? `(${rejected.length})` : '';

        renderManagerProcurementList();
    } catch (err) {
        console.error('loadManagerProcurementApprovals error:', err);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}

function filterManagerProcurement(filter) {
    currentMgrProcFilter = filter;
    document.querySelectorAll('.mgr-proc-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    renderManagerProcurementList();
}

function renderManagerProcurementList() {
    const container = document.getElementById('procurementApprovalsContainer');
    if (!container) return;

    let filtered = mgrAllProcurementRequests;

    if (currentMgrProcFilter === 'pending-manager') {
        filtered = filtered.filter(r => r.status === 'pending-manager');
    } else if (currentMgrProcFilter === 'approved') {
        filtered = filtered.filter(r =>
            ['pending-ceo','pending-purchaser-details','pending-finance','pending-payment-approval','payment-approved','paid','completed'].includes(r.status)
        );
    } else if (currentMgrProcFilter === 'rejected') {
        filtered = filtered.filter(r =>
            (r.status === 'returned' || r.status === 'rejected') && r.rejection_stage === 'manager'
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="modern-empty-state">
                <div class="mes-icon">📭</div>
                <div class="mes-title">${currentMgrProcFilter === 'pending-manager' ? 'No Pending Requests' : currentMgrProcFilter === 'approved' ? 'No Approved Requests Yet' : currentMgrProcFilter === 'rejected' ? 'No Rejected Requests' : 'No Requests'}</div>
                <div class="mes-desc">Requests matching this filter will appear here.</div>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(r => {
        const isPending = r.status === 'pending-manager';
        const isRejected = (r.status === 'returned' || r.status === 'rejected') && r.rejection_stage === 'manager';
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
            statusBadge = `<span class="mrc-badge gold">⏳ Pending Your Approval</span>`;
        } else if (isApproved) {
            statusBadge = `<span class="mrc-badge green">✅ Approved by You</span>`;
        } else if (isRejected) {
            statusBadge = `<span class="mrc-badge red">❌ Rejected by You</span>`;
        }

        const statusClass = isPending ? 'pending' : isApproved ? 'approved' : 'rejected';

        let actions = `<button class="mrc-btn primary" onclick="viewManagerRequest(${r.id})">👁️ View Details</button>`;
        if (isPending) {
            actions += `<button class="mrc-btn gold" onclick="managerApproveRequest(${r.id})">✅ Approve & Send to CEO</button>
                        <button class="mrc-btn danger" onclick="managerRejectRequest(${r.id})">❌ Reject</button>`;
        }

        return `
            <div class="modern-request-card ${statusClass}">
                <div class="mrc-header">
                    <div class="mrc-title-wrap">
                        <div class="mrc-id-row">
                            <span class="mrc-id">${esc(r.request_number)}</span>
                            <span class="mrc-badge navy">${urgencyInfo.icon} ${urgencyInfo.label}</span>
                            ${statusBadge}
                        </div>
                        <div class="mrc-title">${esc(r.title || 'Untitled Request')}</div>
                        <div class="mrc-meta">
                            <span>🏢 <strong>${esc(r.department || '—')}</strong></span>
                            <span>👤 <strong>${esc(r.requested_by || '—')}</strong></span>
                            <span>📅 <strong>${createdDate}</strong></span>
                        </div>
                    </div>
                    <div class="mrc-amount-wrap">
                        <div class="mrc-amount">TSh ${Number(r.total_amount || 0).toLocaleString()}</div>
                        <div class="mrc-amount-label">${r.item_count || 0} items</div>
                    </div>
                </div>

                ${isRejected && r.rejection_reason ? `
                    <div class="mrc-rejection-box">
                        <div class="mrc-rejection-label">Rejection Reason</div>
                        <div class="mrc-rejection-text">${esc(r.rejection_reason)}</div>
                    </div>
                ` : ''}

                <div class="mrc-actions">${actions}</div>
            </div>
        `;
    }).join('');
}

async function managerApproveRequest(id) {
    const res = await modernConfirm({
        title: '✅ Approve & Send to CEO?',
        message: 'This procurement request will be forwarded to the CEO for final approval.',
        type: 'success',
        okText: '✅ Approve & Send',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        await API.managerApproveRequest(id);
        modernToast('✅ Approved', 'Request sent to CEO for final approval.', 'success');
        loadManagerProcurementApprovals();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function managerRejectRequest(id) {
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
        await API.managerRejectRequest(id, res.reason);
        modernToast('❌ Rejected', 'Request returned to Procurement.', 'warning');
        loadManagerProcurementApprovals();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

// ================================================================
// MANAGER: VIEW REQUEST DETAILS
// ================================================================
async function viewManagerRequest(id) {
    try {
        const request = await API.getProcurementRequestById(id);

        const isPending = request.status === 'pending-manager';
        const isRejected = (request.status === 'returned' || request.status === 'rejected') && request.rejection_stage === 'manager';
        const isApproved = !isPending && !isRejected;

        const headerGradient = isPending
            ? 'linear-gradient(135deg,#0f1f3d,#1a3a6b)'
            : isApproved
            ? 'linear-gradient(135deg,#14532d,#16a34a)'
            : 'linear-gradient(135deg,#7f1d1d,#dc2626)';

        const headerTitle = isPending
            ? '📋 Procurement Request — Awaiting Your Approval'
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

        let modal = document.getElementById('managerProcurementViewModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="managerProcurementViewModal">
                    <div class="modal-box" style="max-width:720px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                        <div id="mgrProcViewHeader" style="padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                            <div>
                                <h3 id="mgrProcViewTitle" style="font-size:18px;font-weight:800;color:white;margin:0;"></h3>
                                <p id="mgrProcViewSubtitle" style="font-size:12px;color:rgba(255,255,255,0.85);margin:4px 0 0;"></p>
                            </div>
                            <button onclick="closeModal('managerProcurementViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                        <div id="mgrProcViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;background:#f8fafc;"></div>
                        <div id="mgrProcViewFooter" style="padding:14px 26px;background:white;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;"></div>
                    </div>
                </div>
            `);
            modal = document.getElementById('managerProcurementViewModal');
        }

        const headerEl = document.getElementById('mgrProcViewHeader');
        if (headerEl) headerEl.style.background = headerGradient;

        document.getElementById('mgrProcViewTitle').textContent = headerTitle;
        document.getElementById('mgrProcViewSubtitle').textContent =
            `${request.request_number} • ${request.department} • ${request.requested_by}`;

        document.getElementById('mgrProcViewBody').innerHTML = `
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
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px;">Current Status</div>
                        <div style="font-weight:700;color:${isPending ? '#d97706' : isApproved ? '#16a34a' : '#dc2626'};">
                            ${isPending ? '⏳ Pending Your Approval' : isApproved ? '✅ Approved by You' : '❌ Rejected by You'}
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

            <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;padding:18px 22px;border-radius:12px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:800;text-transform:uppercase;letter-spacing:1.2px;font-size:12px;">Total Amount</span>
                <span style="font-size:24px;font-weight:900;color:#fbbf24;font-family:'Courier New',monospace;">TSh ${Number(request.total_amount || 0).toLocaleString()}</span>
            </div>
        `;

        const footer = document.getElementById('mgrProcViewFooter');
        if (isPending) {
            footer.innerHTML = `
                <button onclick="closeModal('managerProcurementViewModal')" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                <button onclick="closeModal('managerProcurementViewModal'); managerRejectRequest(${request.id})" style="padding:11px 24px;background:rgba(239,68,68,0.1);color:#dc2626;border:1.5px solid rgba(239,68,68,0.2);border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">❌ Reject</button>
                <button onclick="closeModal('managerProcurementViewModal'); managerApproveRequest(${request.id})" style="padding:11px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;box-shadow:0 4px 12px rgba(34,197,94,0.3);">✅ Approve & Send to CEO</button>
            `;
        } else {
            footer.innerHTML = `
                <button onclick="closeModal('managerProcurementViewModal')" style="padding:11px 28px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
            `;
        }

        modal.classList.add('show');
    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}

// ================================================================
// TOAST WRAPPER + HELPERS
// ================================================================
function showToast(message, type = 'success') {
    if (typeof Toast !== 'undefined' && typeof Toast[type] === 'function') {
        Toast[type](message);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.add('collapsed');
    if (backdrop) backdrop.classList.remove('show');
    document.body.style.overflow = '';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isMobile = window.innerWidth <= 768;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (!isMobile) localStorage.setItem('makdc_manager_sidebar_collapsed', isCollapsed);
    if (isMobile && !isCollapsed) {
        backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    } else {
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// ================================================================
// MASTER BUDGET — CEILING ALLOCATION (Manager)
// ================================================================
const COMPANY_DEPARTMENTS = [
    { key: 'Administration Department',              icon: '🏢', description: 'Administration & Management' },
    { key: 'Sales and Marketing Department',         icon: '📈', description: 'Sales & Marketing' },
    { key: 'Engineering and Production Department',  icon: '⚙️', description: 'Engineering & Production' },
    { key: 'Lawyer Department',                      icon: '⚖️', description: 'Legal & Advisory' },
    { key: 'Finance Department',                     icon: '💰', description: 'Finance & Accounting' },
    { key: 'Procurements Management Unit',           icon: '🛒', description: 'Procurement & Supply' },
    { key: 'Information and Technology Department',  icon: '💻', description: 'IT & Systems' }
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const QUARTERS = ['Q1 (Jan - Mar)', 'Q2 (Apr - Jun)', 'Q3 (Jul - Sep)', 'Q4 (Oct - Dec)'];

// 1. Handle Dynamic Period
function handlePeriodChange() {
    const type = document.getElementById('masterBudgetPeriodType')?.value;
    const container = document.getElementById('dynamicPeriodContainer');
    const select = document.getElementById('masterBudgetSpecificPeriod');

    if (!container || !select) return;

    if (type === 'Annual') {
        container.style.display = 'none';
        select.innerHTML = '';
    } else {
        container.style.display = 'block';
        let options = type === 'Monthly' ? MONTHS : QUARTERS;
        select.innerHTML = options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
    }
}

// 2. Render Table Rows
function renderCeilingAllocations() {
    const tbody = document.getElementById('ceilingAllocationTableBody');
    if (!tbody) return;

    tbody.innerHTML = COMPANY_DEPARTMENTS.map((dept, index) => `
        <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
            <td style="padding:12px 18px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:36px;height:36px;border-radius:8px;background:rgba(15,31,61,0.06);display:flex;align-items:center;justify-content:center;font-size:18px;">${dept.icon}</div>
                    <div>
                        <div style="font-weight:800;color:#0f1f3d;font-size:13px;">${dept.key}</div>
                        <div style="font-size:10px;color:#94a3b8;">${dept.description}</div>
                    </div>
                </div>
            </td>
            <td style="padding:12px 18px; text-align:right;">
                <div style="position:relative; display:inline-block; width:200px;">
                    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:11px;font-weight:800;color:#94a3b8;">TSh</span>
                    <input type="number" class="ceiling-input" data-dept="${dept.key}" placeholder="0" oninput="updateMasterBudgetTotal()" style="width:100%;padding:10px 12px 10px 44px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:'Courier New',monospace;font-weight:700;color:#0f1f3d;text-align:right;background:white;">
                </div>
            </td>
        </tr>
    `).join('');

    handlePeriodChange();
    updateMasterBudgetTotal();
}

function resetCeilingAllocations() {
    if (!confirm('Clear all allocations?')) return;
    document.getElementById('masterBudgetTitle').value = '';
    document.getElementById('masterBudgetCeilingInput').value = '';
    document.querySelectorAll('.ceiling-input').forEach(input => input.value = '');
    isCeilingConfirmed = false;
    updateMasterBudgetTotal();
    showToast('🔄 Allocations cleared', 'info');
}
async function loadMasterBudgetHistory() {
    const container = document.getElementById('masterBudgetHistoryContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="modern-empty-state" style="padding:40px;">
            <div class="mes-icon" style="width:70px;height:70px;font-size:30px;">⏳</div>
            <div class="mes-title" style="font-size:15px;">Loading budgets...</div>
        </div>`;

    try {
        const budgets = await API.getMasterBudgets();

        if (!budgets || budgets.length === 0) {
            container.innerHTML = `
                <div class="modern-empty-state" style="padding:40px;">
                    <div class="mes-icon" style="width:70px;height:70px;font-size:30px;">💰</div>
                    <div class="mes-title" style="font-size:15px;">No Master Budgets Yet</div>
                    <div class="mes-desc">Distribute your first ceiling to departments to see it here.</div>
                </div>`;
            return;
        }

        container.innerHTML = `
            <div style="background:white; border-radius:12px; border:1.5px solid #e5e7eb; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
                <div style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead style="background:#f8fafc; border-bottom:2px solid #e5e7eb;">
                            <tr>
                                <th style="padding:16px 20px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Budget Title</th>
                                <th style="padding:16px 20px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Period</th>
                                <th style="padding:16px 20px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Depts</th>
                                <th style="padding:16px 20px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Total Amount</th>
                                <th style="padding:16px 20px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Progress</th>
                                <th style="padding:16px 20px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Status</th>
                                <th style="padding:16px 20px; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; text-align:center;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${budgets.map(b => {
                                const statusMap = {
                                    'draft':                 { icon: '📝', label: 'Draft',                   color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
                                    'pending-departments':   { icon: '🏢', label: 'Waiting Depts',           color: '#d97706', bg: 'rgba(245,158,11,0.1)' },
                                    'pending-manager':       { icon: '🔍', label: 'Ready for Review',        color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
                                    'pending-ceo':           { icon: '⏳', label: 'Pending CEO',             color: '#c2410c', bg: 'rgba(234,88,12,0.1)' },
                                    'approved':              { icon: '✅', label: 'Approved',                color: '#16a34a', bg: 'rgba(34,197,94,0.1)' },
                                    'rejected':              { icon: '❌', label: 'Rejected',                color: '#dc2626', bg: 'rgba(239,68,68,0.1)' }
                                };
                                const sInfo = statusMap[b.status] || statusMap['draft'];
                                const deptCount = (b.allocations || []).length;

                                // Hesabu progress
                                const submittedCount = (b.allocations || []).filter(a => a.status === 'submitted' || a.status === 'approved').length;
                                const progressPct = deptCount > 0 ? Math.round((submittedCount / deptCount) * 100) : 0;

                                // 🆕 TENGENEZA VITUFE VYA NDANI YA DROPDOWN
                                let menuItems = `
                                    <button class="view" onclick="viewMasterBudget('${b.id}')">👁 View Details</button>
                                `;

                                if (['pending-manager', 'pending-ceo', 'approved', 'rejected'].includes(b.status)) {
                                    menuItems += `<button class="book" onclick="openBudgetBookModal('${b.id}')">📥 Download Book</button>`;
                                }

                                if (b.status === 'pending-manager' || b.status === 'pending-departments') {
                                    menuItems += `<button class="review" onclick="openManagerReviewPage('${b.id}')">🔍 Review Budget</button>`;
                                }

                                if (b.status === 'pending-manager') {
                                    menuItems += `<button class="submit" onclick="submitBudgetToCEO('${b.id}')">📤 Submit to CEO</button>`;
                                }

                                return `
                                    <tr style="border-bottom:1px solid #f1f5f9; transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                                        <td style="padding:16px 20px;">
                                            <div style="font-weight:800; color:#0f1f3d; font-size:13.5px;">${esc(b.title)}</div>
                                            <div style="font-size:11px; color:#94a3b8; margin-top:2px;">By ${esc(b.createdBy || '—')}</div>
                                        </td>
                                        <td style="padding:16px 20px;">
                                            <div style="font-size:12px; font-weight:600; color:#334155;">${esc(b.period)}</div>
                                        </td>
                                        <td style="padding:16px 20px;">
                                            <div style="display:flex; flex-direction:column; gap:4px; max-width:220px;">
                                                ${(b.allocations || []).slice(0, 2).map(a => {
                                                    let shortName = a.department
                                                        .replace('Information and Technology', 'IT')
                                                        .replace('Sales and Marketing', 'Sales & Marketing')
                                                        .replace('Engineering and Production', 'Engineering')
                                                        .replace('Procurements Management', 'Procurement')
                                                        .replace('Administration', 'Admin')
                                                        .replace('Department', 'Dept')
                                                        .replace('Unit', 'Unit');
                                                    
                                                    return `
                                                        <span style="display:inline-block; padding:3px 8px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:6px; font-size:10.5px; font-weight:700; color:#475569; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%;">
                                                            ${esc(shortName)}
                                                        </span>
                                                    `;
                                                }).join('')}
                                                
                                                ${deptCount > 2 ? `
                                                    <span style="font-size:10px; font-weight:800; color:#64748b; padding-left:4px; margin-top:2px;">
                                                        +${deptCount - 2} more...
                                                    </span>
                                                ` : ''}
                                            </div>
                                        </td>
                                        <td style="padding:16px 20px;">
                                            <div style="font-family:'Courier New',monospace; font-weight:900; color:#0f1f3d; font-size:14px;">TSh ${Number(b.totalAmount || 0).toLocaleString()}</div>
                                        </td>
                                        <td style="padding:16px 20px;">
                                            <div style="display:flex; align-items:center; gap:8px; min-width:100px;">
                                                <div style="flex:1; height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden;">
                                                    <div style="height:100%; width:${progressPct}%; background:${progressPct === 100 ? '#22c55e' : '#f59e0b'}; border-radius:3px; transition:width 0.3s;"></div>
                                                </div>
                                                <span style="font-size:11px; font-weight:800; color:#64748b; white-space:nowrap;">${submittedCount}/${deptCount}</span>
                                            </div>
                                        </td>
                                        <td style="padding:16px 20px;">
                                            <span style="display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border-radius:20px; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; color:${sInfo.color}; background:${sInfo.bg};">
                                                ${sInfo.icon} ${sInfo.label}
                                            </span>
                                        </td>
                                        <td style="padding:16px 20px; text-align:center;">
                                            
                                            <!-- 🆕 KITUFE CHA VITENDO VITATU (⋮) NA DROPDOWN MENU -->
                                            <div class="action-dropdown">
                                                <button onclick="toggleActionMenu(event, '${b.id}')" 
                                                        style="width:36px; height:36px; border-radius:8px; border:1.5px solid #cbd5e1; background:white; color:#0f1f3d; font-size:20px; font-weight:900; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s; margin:0 auto;"
                                                        onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#0f1f3d'" 
                                                        onmouseout="this.style.background='white'; this.style.borderColor='#cbd5e1'">
                                                    ⋮
                                                </button>
                                                <div class="action-dropdown-menu" id="action-menu-${b.id}">
                                                    ${menuItems}
                                                </div>
                                            </div>

                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    } catch (err) {
        console.error('loadMasterBudgetHistory error:', err);
        container.innerHTML = `
            <div class="modern-empty-state" style="padding:40px;">
                <div class="mes-icon" style="width:70px;height:70px;font-size:30px;">❌</div>
                <div class="mes-title" style="font-size:15px;">Error</div>
                <div class="mes-desc">${esc(err.message)}</div>
            </div>`;
    }
}
// ================================================================
// 🆕 DISTRIBUTE CEILINGS TO DEPARTMENTS (BULK)
// ================================================================
async function distributeCeilingsToDepartments() {
    const statusDiv = document.getElementById('ceilingStatus');
    const title = document.getElementById('masterBudgetTitle')?.value.trim();
    const type = document.getElementById('masterBudgetPeriodType')?.value;
    const specificPeriod = document.getElementById('masterBudgetSpecificPeriod')?.value || '';
    const year = document.getElementById('masterBudgetYear')?.value;
    const totalCeiling = parseFloat(document.getElementById('masterBudgetCeilingInput').value) || 0;

    // ===== VALIDATIONS =====
    if (!title) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please enter a Budget Title.';
        return;
    }
    if (!isCeilingConfirmed || totalCeiling <= 0) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please click "Set" to confirm the Total Ceiling first.';
        return;
    }

    // ===== KUSANYA ALLOCATIONS =====
    const allocations = [];
    let totalAllocated = 0;

    document.querySelectorAll('.ceiling-input').forEach(input => {
        const amount = parseFloat(input.value) || 0;
        if (amount > 0) {
            const dept = COMPANY_DEPARTMENTS.find(d => d.key === input.dataset.dept);
            allocations.push({
                department: input.dataset.dept,
                icon: dept?.icon || '📁',
                ceilingAmount: amount,
                status: 'pending-department',
                items: []
            });
            totalAllocated += amount;
        }
    });

    // ===== LAZIMA KILA SENTI ILINGANE =====
    if (totalAllocated !== totalCeiling) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = `⚠ Total allocated (TSh ${totalAllocated.toLocaleString()}) must exactly equal the Total Ceiling (TSh ${totalCeiling.toLocaleString()}).`;
        return;
    }

    if (allocations.length === 0) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ No allocations made.';
        return;
    }

    // ===== CONFIRM =====
    const res = await modernConfirm({
        title: '📤 Distribute Ceilings?',
        message: `You are about to distribute TSh ${totalAllocated.toLocaleString()} to ${allocations.length} departments. Each department will receive their allocation and can start preparing their breakdown.`,
        detail: { label: 'Total Amount', value: `TSh ${totalAllocated.toLocaleString()}` },
        type: 'primary',
        okText: '📤 Yes, Distribute',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    // ===== SEND TO API =====
    try {
        statusDiv.className = 'status-msg';
        statusDiv.textContent = '⏳ Distributing to departments...';

        const finalPeriodString = type === 'Annual' 
            ? `Annual ${year}` 
            : `${type} - ${specificPeriod} ${year}`;

        const payload = {
            title,
            period: finalPeriodString,
            year: parseInt(year),
            totalAmount: totalCeiling,
            allocations,
            createdBy: currentUser.fullName,
            createdById: currentUser.id,
            status: 'pending-departments'
        };

        const result = await API.createMasterBudget(payload);
        console.log('✅ Budget created:', result);

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = `✓ Successfully distributed to ${allocations.length} departments!`;
        showToast('✅ Ceilings distributed!', 'success');

        // Reset Form
        document.getElementById('masterBudgetTitle').value = '';
        document.getElementById('masterBudgetCeilingInput').value = '';
        document.querySelectorAll('.ceiling-input').forEach(i => i.value = '');
        isCeilingConfirmed = false;
        updateMasterBudgetTotal();

        // Reload History
        setTimeout(() => {
            switchBudgetSubTab('history');
            loadMasterBudgetHistory();
        }, 1000);

    } catch (err) {
        console.error('❌ Distribute error:', err);
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}

// ================================================================
// MANAGER: OPEN FULL PAGE REVIEW
// ================================================================
let currentReviewBudgetId = null;



// ================================================================
// MANAGER: FORWARD TO CEO
// ================================================================
async function forwardCurrentBudgetToCEO() {
    if (!currentReviewBudgetId) return;

    // 🆕 Angalia kama departments wote wame-submit
    try {
        const budget = await API.getMasterBudgetById(currentReviewBudgetId);
        const allocations = budget.allocations || [];
        const pending = allocations.filter(a => a.status === 'pending-department' || a.status === 'pending');
        
        if (pending.length > 0) {
            const confirmed = await modernConfirm({
                title: '⚠️ Departments Pending',
                message: `${pending.length} department(s) have not yet submitted their breakdown. Do you still want to forward to CEO?`,
                type: 'warning',
                okText: '📤 Forward Anyway',
                cancelText: 'Cancel'
            });
            if (!confirmed.confirmed) return;
        }
    } catch (err) {
        console.error(err);
    }

    const res = await modernConfirm({
        title: '📤 Forward to CEO?',
        message: 'Ensure all departments have submitted their breakdowns. This will send the full budget to the CEO for final approval.',
        type: 'primary',
        okText: '📤 Yes, Forward',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        // 🆕 Tumia API sahihi
        await API.forwardMasterBudgetToCeo(currentReviewBudgetId);
        showToast('✅ Forwarded to CEO successfully!', 'success');
        
        // Rudi kwenye History na u-refresh
        switchBudgetSubTab('history');
        loadMasterBudgetHistory();
        
    } catch (err) {
        showToast('❌ Failed: ' + err.message, 'error');
    }
}

// ================================================================
// CONFIRM CEILING + SUCCESS DIALOG
// ================================================================
let isCeilingConfirmed = false;

function confirmCeiling() {
    const inputVal = document.getElementById('masterBudgetCeilingInput').value;
    const total = parseFloat(inputVal) || 0;

    if (total <= 0) {
        showToast('⚠ Please enter a valid amount first', 'error');
        return;
    }

    document.getElementById('masterBudgetCeilingInput').value = total;
    isCeilingConfirmed = true;
    
    const warn = document.getElementById('ceilingConfirmStatus');
    if (warn) warn.style.display = 'none';
    
    document.querySelectorAll('.ceiling-input').forEach(input => input.value = '');
    updateMasterBudgetTotal();
    
    showSuccessDialog(
        "Ceiling Confirmed!", 
        `Total company budget has been set to <strong>TSh ${total.toLocaleString()}</strong>. You can now allocate funds to each department.`
    );
}

function resetConfirmedCeiling() {
    isCeilingConfirmed = false;
    
    const warn = document.getElementById('ceilingConfirmStatus');
    if (warn) warn.style.display = 'block';
    
    document.getElementById('masterBudgetTotal').textContent = 'TSh 0';
    document.querySelectorAll('.ceiling-input').forEach(input => input.value = '');
    updateMasterBudgetTotal();
}

function showSuccessDialog(title, messageHTML) {
    const existing = document.getElementById('modernSuccessModal');
    if (existing) existing.remove();

    const dialogHTML = `
        <div class="modal-overlay" id="modernSuccessModal" style="z-index: 50000;">
            <div class="modal-box" style="max-width:400px; text-align:center; padding:32px 28px; border-radius:24px; animation: modalIn 0.3s ease;">
                <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #22c55e, #16a34a); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; box-shadow: 0 10px 25px rgba(34,197,94,0.4);">
                    <span style="font-size:40px; color:white;">✔</span>
                </div>
                
                <h3 style="font-size:22px; font-weight:900; color:#0f1f3d; margin:0 0 10px 0;">${title}</h3>
                <p style="font-size:14px; color:#64748b; line-height:1.6; margin:0 0 24px 0;">${messageHTML}</p>
                
                <button onclick="document.getElementById('modernSuccessModal').remove()" 
                        style="width:100%; padding:14px; background:linear-gradient(135deg, #0f1f3d, #1a3a6b); color:white; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer; transition:transform 0.2s;"
                        onmouseover="this.style.transform='translateY(-2px)'" 
                        onmouseout="this.style.transform='translateY(0)'">
                    Understood
                </button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
}

function updateMasterBudgetTotal() {
    let totalAllocated = 0;
    document.querySelectorAll('.ceiling-input').forEach(input => {
        totalAllocated += parseFloat(input.value) || 0;
    });

    const totalInput = parseFloat(document.getElementById('masterBudgetCeilingInput').value) || 0;
    const unallocated = totalInput - totalAllocated;

    const display = document.getElementById('masterBudgetTotal');
    if (display) {
        if (!isCeilingConfirmed) {
             display.textContent = 'TSh ' + totalInput.toLocaleString();
        } else {
             display.textContent = 'TSh ' + totalAllocated.toLocaleString();
        }
    }

    const statusText = document.getElementById('allocationStatusText');
    if (statusText) {
        if (!isCeilingConfirmed) {
            statusText.innerHTML = `<span style="color:#dc2626;">⏳ Click "Set" to lock the Ceiling</span>`;
        } else if (unallocated < 0) {
            statusText.innerHTML = `<span style="color:#dc2626;">⚠ Over-allocated by TSh ${Math.abs(unallocated).toLocaleString()}</span>`;
        } else if (unallocated > 0) {
            statusText.innerHTML = `<span style="color:#d97706;">Unallocated: TSh ${unallocated.toLocaleString()}</span>`;
        } else {
            statusText.innerHTML = `<span style="color:#16a34a;">✅ Perfectly Allocated</span>`;
        }
    }
}
// Function ya kufungua/kufunga Dropdown
function toggleActionMenu(event, budgetId) {
    event.stopPropagation(); // Zuia click isifike kwenye table
    
    // Funga menyu zote zilizo wazi kwanza
    document.querySelectorAll('.action-dropdown-menu').forEach(menu => {
        if (menu.id !== `action-menu-${budgetId}`) {
            menu.classList.remove('show');
        }
    });

    // Fungua au funga menyu husika
    const menu = document.getElementById(`action-menu-${budgetId}`);
    if (menu) {
        menu.classList.toggle('show');
    }
}

// Funga menyu yoyote iliyo wazi ukibonyeza sehemu nyingine yoyote
document.addEventListener('click', function() {
    document.querySelectorAll('.action-dropdown-menu').forEach(menu => {
        menu.classList.remove('show');
    });
});
// ================================================================
// BUDGET SUB-TABS SWITCHER
// ================================================================
function switchBudgetSubTab(tab) {
    const planning = document.getElementById('budgetSubTab-planning');
    const history = document.getElementById('budgetSubTab-history');
    const review = document.getElementById('budgetSubTab-review');
    
    if (planning) planning.style.display = 'none';
    if (history) history.style.display = 'none';
    if (review) review.style.display = 'none';

    const btnPlan = document.getElementById('btn-subtab-planning');
    const btnHist = document.getElementById('btn-subtab-history');
    const btnRev = document.getElementById('btn-subtab-review');

    [btnPlan, btnHist, btnRev].forEach(btn => {
        if (btn) {
            btn.style.background = '#f8fafc';
            btn.style.color = '#64748b';
            btn.style.border = '1.5px solid #e5e7eb';
        }
    });

    if (tab === 'planning') {
        if (planning) planning.style.display = 'block';
        if (btnPlan) {
            btnPlan.style.background = '#0f1f3d';
            btnPlan.style.color = 'white';
            btnPlan.style.border = 'none';
        }
        if (btnRev) btnRev.style.display = 'none';
    } 
    else if (tab === 'history') {
        if (history) history.style.display = 'block';
        if (btnHist) {
            btnHist.style.background = '#0f1f3d';
            btnHist.style.color = 'white';
            btnHist.style.border = 'none';
        }
        if (btnRev) btnRev.style.display = 'none';
        loadMasterBudgetHistory();
    } 
    else if (tab === 'review') {
        if (review) review.style.display = 'block';
        if (btnRev) {
            btnRev.style.display = 'inline-block';
            btnRev.style.background = '#0f1f3d';
            btnRev.style.color = 'white';
            btnRev.style.border = 'none';
        }
    }
}

// ================================================================
// VIEW MASTER BUDGET DETAILS
// ================================================================
async function viewMasterBudget(id) {
    try {
        const b = await API.getMasterBudgetById(id);
        if (!b) { showToast('⚠ Not found', 'error'); return; }

        const statusMap = {
            'draft':                 { label: 'Draft',                 color: '#64748b', icon: '📝' },
            'pending-departments':   { label: 'Waiting Departments',   color: '#d97706', icon: '🏢' },
            'pending-manager':       { label: 'Ready for Review',      color: '#2563eb', icon: '🔍' },
            'pending-ceo':           { label: 'Pending CEO',           color: '#c2410c', icon: '⏳' },
            'approved':              { label: 'Approved by CEO',       color: '#16a34a', icon: '✅' },
            'rejected':              { label: 'Rejected',              color: '#dc2626', icon: '❌' }
        };
        const sInfo = statusMap[b.status] || statusMap['draft'];

        const modalBody = `
            <div style="background:${sInfo.color}10; border:1px solid ${sInfo.color}30; border-left:4px solid ${sInfo.color}; padding:16px 20px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <div>
                    <div style="font-size:10px; font-weight:800; color:${sInfo.color}; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Current Status</div>
                    <div style="font-size:16px; font-weight:900; color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Total Ceiling</div>
                    <div style="font-size:24px; font-weight:900; color:#0f1f3d; font-family:'Courier New',monospace;">TSh ${Number(b.totalAmount || 0).toLocaleString()}</div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
                <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e5e7eb;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Budget Title</div>
                    <div style="font-size:14px; font-weight:700; color:#1e293b;">${esc(b.title)}</div>
                </div>
                <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e5e7eb;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Budget Period</div>
                    <div style="font-size:14px; font-weight:700; color:#1e293b;">${esc(b.period)}</div>
                </div>
                <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e5e7eb;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Prepared By</div>
                    <div style="font-size:14px; font-weight:700; color:#1e293b;">${esc(b.createdBy || '—')}</div>
                </div>
                <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e5e7eb;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Created On</div>
                    <div style="font-size:14px; font-weight:700; color:#1e293b;">${new Date(b.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
            </div>

            <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">📊 Department Ceilings Breakdown</div>
            <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                ${(b.allocations || []).map((a, i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #e5e7eb; ${i === (b.allocations.length - 1) ? 'border-bottom:none;' : ''}">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="width:32px; height:32px; border-radius:8px; background:white; border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center; font-size:16px;">${a.icon || '📁'}</div>
                            <div style="font-weight:700; color:#1e293b; font-size:13px;">${esc(a.department)}</div>
                        </div>
                        <div style="font-family:'Courier New',monospace; font-weight:900; color:#0f1f3d; font-size:14px;">TSh ${Number(a.ceilingAmount || 0).toLocaleString()}</div>
                    </div>
                `).join('')}
            </div>
        `;

        let modal = document.getElementById('masterBudgetViewModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="masterBudgetViewModal">
                    <div class="modal-box" style="max-width:640px; padding:0; overflow:hidden; max-height:92vh; display:flex; flex-direction:column; border-radius:16px;">
                        <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                            <div style="display:flex; align-items:center; gap:12px;">
                                <div style="width:40px; height:40px; border-radius:10px; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-size:20px;">💰</div>
                                <div>
                                    <h3 style="font-size:18px; font-weight:900; color:white; margin:0;">Master Budget Details</h3>
                                    <div style="font-size:11px; color:rgba(255,255,255,0.6); font-family:monospace; margin-top:2px;">ID: #${b.id}</div>
                                </div>
                            </div>
                            <button onclick="closeModal('masterBudgetViewModal')" style="background:rgba(255,255,255,0.15); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">✕</button>
                        </div>
                        <div id="masterBudgetViewBody" style="padding:24px 28px; overflow-y:auto; flex:1; background:#f8fafc;"></div>
                        <div style="padding:16px 28px; background:white; border-top:1px solid #e5e7eb; display:flex; justify-content:flex-end; flex-shrink:0;">
                            <button onclick="closeModal('masterBudgetViewModal')" style="padding:10px 24px; background:#f1f5f9; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; transition:background 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">Close</button>
                        </div>
                    </div>
                </div>
            `);
            modal = document.getElementById('masterBudgetViewModal');
        }

        document.getElementById('masterBudgetViewBody').innerHTML = modalBody;
        modal.classList.add('show');
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) sidebar.classList.add('collapsed');
    else {
        const wasCollapsed = localStorage.getItem('makdc_manager_sidebar_collapsed') === 'true';
        if (wasCollapsed) sidebar.classList.add('collapsed');
    }
}
function switchBudgetMainTab(tab) {
    // 1. Ficha sehemu zote kuu tatu
    document.getElementById('budget-main-master').style.display = 'none';
    document.getElementById('budget-main-my-dept').style.display = 'none';
    document.getElementById('budget-main-history').style.display = 'none';

    // 2. Vitufe vyote vya juu viondolewe rangi ya bluu
    const allTopBtns = ['btn-tab-master-budget', 'btn-tab-my-dept-budget', 'btn-tab-all-budgets', 'btn-tab-review-budget'];
    allTopBtns.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.style.background = '#f8fafc';
            btn.style.color = '#64748b';
            btn.style.border = '1.5px solid #e5e7eb';
        }
    });

    // 3. Ficha kitufe cha Review kwanza
    const btnReviewTop = document.getElementById('btn-tab-review-budget');
    if (btnReviewTop) btnReviewTop.style.display = 'none';

    // 4. Onyesha sehemu kulingana na kitufe kilichobonyezwa
    if (tab === 'master') {
        document.getElementById('budget-main-master').style.display = 'block';
        const btn = document.getElementById('btn-tab-master-budget');
        if (btn) { btn.style.background = '#0f1f3d'; btn.style.color = 'white'; btn.style.border = 'none'; }
        switchBudgetSubTab('planning'); // Rudisha kwenye planning
    } 
    else if (tab === 'my-dept') {
        document.getElementById('budget-main-my-dept').style.display = 'block';
        const btn = document.getElementById('btn-tab-my-dept-budget');
        if (btn) { btn.style.background = '#0f1f3d'; btn.style.color = 'white'; btn.style.border = 'none'; }
        loadMyBudget();
    } 
    else if (tab === 'history') {
        document.getElementById('budget-main-history').style.display = 'block';
        const btn = document.getElementById('btn-tab-all-budgets');
        if (btn) { btn.style.background = '#0f1f3d'; btn.style.color = 'white'; btn.style.border = 'none'; }
        loadAllBudgetsPage();
    }
    else if (tab === 'review') {
        document.getElementById('budget-main-master').style.display = 'block';
        if (btnReviewTop) {
            btnReviewTop.style.display = 'inline-block';
            btnReviewTop.style.background = '#0f1f3d'; 
            btnReviewTop.style.color = 'white'; 
            btnReviewTop.style.border = 'none';
        }
        switchBudgetSubTab('review');
    }
}

let allMyBudgets = [];
let currentBudgetFilter = { search: '', date: '', status: '' };
let currentDeptBudget = null;
let bdActivityCounter = 0;

const STANDARD_ACTIVITIES = [
    "Safari / Field Work", "Mafunzo (Training)", "Ujenzi / Renovation",
    "Ununuzi wa Vifaa", "Matengenezo (Maintenance)", "Uendeshaji (Operations)",
    "Masoko (Marketing)", "Ushauri (Consultancy)", "Nyingine (Other)"
];

const STANDARD_ITEMS = [
    "Perdiem (Posho ya Safari)", "Mafuta (Fuel)", "Extraduty Allowance",
    "Kodi ya Gari (Car Hire)", "Nauli (Transport)", "Malazi (Accommodation)",
    "Chakula (Meals)", "Saruji (Cement)", "Mbao (Timber)", "Misumari (Nails)",
    "Rangi (Paint)", "Umeme (Electricity)", "Maji (Water)", "Karatasi (Stationery)",
    "Wino (Ink)", "Vifaa vya Ofisi", "Nyingine (Other)"
];

// 1. LOAD MY BUDGET
async function loadMyBudget() {
    const container = document.getElementById('myBudgetContent');
    const badge = document.getElementById('myBudgetStatusBadge');
    if (!container) return;
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">⏳ Loading budget...</div>`;

    try {
        const user = Auth.getUser();
        const departmentName = user?.department || user?.departmentName;
        if (!departmentName) {
            container.innerHTML = `<div style="text-align:center;padding:40px;"><div style="font-size:40px;margin-bottom:10px;">⚠️</div><div style="font-weight:800;color:#64748b;">No Department Assigned</div></div>`;
            if (badge) badge.textContent = '—';
            return;
        }
        const budgets = await API.getMasterBudgets();
        const myBudgets = (budgets || []).filter(b =>
            b.allocations && b.allocations.some(a => a.department === departmentName)
        );
        if (myBudgets.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:50px 20px;"><div style="font-size:56px;margin-bottom:14px;opacity:0.6;">💰</div><div style="font-size:17px;font-weight:800;color:#334155;margin-bottom:6px;">No Budget Assigned Yet</div><div style="font-size:13px;color:#64748b;">Your department (<strong>${esc(departmentName)}</strong>) has not been allocated a budget yet.</div></div>`;
            if (badge) badge.textContent = '—';
            return;
        }
        const latest = myBudgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const myAllocation = latest.allocations.find(a => a.department === departmentName);
        currentDeptBudget = { ...latest, myAllocation };
        
        // Status badges
        let badgeText = '', buttonHtml = '';
        const allocStatus = myAllocation.status;
        if (allocStatus === 'draft') {
            badgeText = '📝 Draft Saved';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="padding:12px 24px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-size:13px;">✏️ Continue Draft</button>`;
        } else if (allocStatus === 'submitted' || allocStatus === 'approved') {
            badgeText = '✅ Submitted';
            buttonHtml = `<button onclick="viewSubmittedBreakdown()" style="padding:12px 24px; background:linear-gradient(135deg,#0f1f3d,#1a3a6b); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-size:13px; border:1.5px solid #f59e0b;">👁️ View Details</button><span style="display:inline-flex; align-items:center; padding:0 16px; background:#f1f5f9; color:#94a3b8; border-radius:10px; font-weight:800; font-size:12px; margin-left:8px;">🔒 Locked</span>`;
        } else {
            badgeText = '⏳ Action Required';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="padding:12px 24px; background:linear-gradient(135deg,#0f1f3d,#1a3a6b); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-size:13px; border:1.5px solid #f59e0b;">➕ Prepare Breakdown</button>`;
        }
        if (badge) badge.textContent = badgeText;

        const isSubmitted = allocStatus === 'submitted' || allocStatus === 'approved';
        container.innerHTML = `
            <div style="background:linear-gradient(135deg, #0f1f3d, #1a3a6b); padding:24px 28px; border-radius:14px; color:white; margin-bottom:20px; border-left: 5px solid #f59e0b;">
                <div style="font-size:11px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px;">Ceiling Allocated</div>
                <div style="font-size:32px; font-weight:900; font-family:'Courier New',monospace; color:#fbbf24;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
                <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:8px;">${esc(latest.title)} • ${esc(latest.period)}</div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div style="background:#f8fafc; border-radius:10px; padding:16px; border:1px solid #e2e8f0; border-left: 4px solid #0f1f3d;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Status</div>
                    <div style="font-size:14px; font-weight:800; color:${isSubmitted ? '#22c55e' : allocStatus === 'draft' ? '#f59e0b' : '#64748b'};">${isSubmitted ? '✅ Submitted' : allocStatus === 'draft' ? '📝 Draft Saved' : '⏳ Pending'}</div>
                </div>
                <div style="background:#f8fafc; border-radius:10px; padding:16px; border:1px solid #e2e8f0; border-left: 4px solid #f59e0b;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Activities</div>
                    <div style="font-size:14px; font-weight:800; color:#1e293b;">${(myAllocation.items || []).length} items listed</div>
                </div>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">${buttonHtml}</div>
        `;
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">❌ ${esc(err.message)}</div>`;
    }
}

// 2. OPEN BREAKDOWN PAGE (Nakili kutoka sales.js)
function openBudgetBreakdownPage() {
    if (!currentDeptBudget) { showToast('⚠ No budget loaded', 'error'); return; }
    const { myAllocation, title, period } = currentDeptBudget;
    document.getElementById('bdTitle').textContent = title;
    document.getElementById('bdMeta').textContent = `${period} • ${myAllocation.department}`;
    document.getElementById('bdCeiling').textContent = 'TSh ' + Number(myAllocation.ceilingAmount).toLocaleString();
    document.getElementById('myBudgetContent').parentElement.style.display = 'none';
    document.getElementById('budgetBreakdownPage').style.display = 'block';
    const container = document.getElementById('bdActivitiesList');
    container.innerHTML = '';
    bdActivityCounter = 0;
    if (myAllocation.items && myAllocation.items.length > 0) {
        const grouped = {};
        myAllocation.items.forEach(item => {
            const key = item.activityName || 'Unnamed Activity';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(item);
        });
        Object.keys(grouped).forEach(activityName => { addNewActivity(activityName, grouped[activityName]); });
    } else {
        addNewActivity();
    }
    updateGrandTotal();
}

// 3. ADD NEW ACTIVITY (Nakili kutoka sales.js)
function addNewActivity(activityName = '', items = []) {
    const container = document.getElementById('bdActivitiesList');
    const activityId = 'bd-activity-' + (bdActivityCounter++);
    const activityOptions = STANDARD_ACTIVITIES.map(act => `<option value="${act}" ${act === activityName ? 'selected' : ''}>${act}</option>`).join('');
    
    const activityHtml = `
        <div id="${activityId}" style="background:white; border-radius:14px; border:1.5px solid #e2e8f0; margin-bottom:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04); border-left: 4px solid #0f1f3d;">
            <div style="background:#f8fafc; padding:16px 20px; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div style="flex:1; min-width:250px;">
                    <label style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:6px;">Activity / Kipengele</label>
                    <select class="bd-activity-name" style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; font-weight:700; font-family:inherit; background:white; outline:none;">
                        ${activityOptions}
                        <option value="__custom__" ${!STANDARD_ACTIVITIES.includes(activityName) ? 'selected' : ''}>Nyingine (Andika Mwenyewe)...</option>
                    </select>
                    <input type="text" class="bd-activity-custom" value="${!STANDARD_ACTIVITIES.includes(activityName) ? esc(activityName) : ''}" placeholder="Andika jina la Activity..." style="display:${!STANDARD_ACTIVITIES.includes(activityName) ? 'block' : 'none'}; width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px; font-weight:700; font-family:inherit; margin-top:8px; outline:none;">
                </div>
                <div style="text-align:right;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">Activity Total</div>
                    <div class="bd-activity-total" style="font-size:20px; font-weight:900; color:#0f1f3d; font-family:'Courier New',monospace;">TSh 0</div>
                </div>
                <button onclick="document.getElementById('${activityId}').remove(); updateGrandTotal();" style="padding:8px 14px; background:rgba(239,68,68,0.1); color:#dc2626; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-size:12px;">🗑️ Remove</button>
            </div>
            <div style="padding:16px 20px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead><tr style="background:#f8fafc;"><th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Item</th><th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:80px;">Qty</th><th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:90px;">Unit</th><th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:130px;">Unit Price</th><th style="padding:10px; text-align:right; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:130px;">Subtotal</th><th style="width:40px; border-bottom:1px solid #e2e8f0;"></th></tr></thead>
                    <tbody class="bd-items-body"></tbody>
                </table>
                <button onclick="addItemToActivity('${activityId}')" style="margin-top:12px; padding:8px 16px; background:rgba(15,31,61,0.1); color:#0f1f3d; border:1px solid rgba(15,31,61,0.2); border-radius:8px; font-weight:700; cursor:pointer; font-size:12px;">➕ Add Item</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', activityHtml);
    
    const activitySelect = document.querySelector(`#${activityId} .bd-activity-name`);
    const activityCustom = document.querySelector(`#${activityId} .bd-activity-custom`);
    if (activitySelect && activityCustom) {
        activitySelect.addEventListener('change', function() {
            if (this.value === '__custom__') { activityCustom.style.display = 'block'; activityCustom.focus(); } 
            else { activityCustom.style.display = 'none'; activityCustom.value = ''; }
        });
    }
    const activityEl = document.getElementById(activityId);
    const tbody = activityEl.querySelector('.bd-items-body');
    if (items.length > 0) { items.forEach(item => { addItemRowToTable(tbody, item.itemName, item.quantity, item.unit, item.unitPrice); }); } 
    else { addItemRowToTable(tbody); }
    updateActivityTotal(activityId);
}

// 4. ADD ITEM ROW (Nakili kutoka sales.js)
function addItemToActivity(activityId) {
    const activityEl = document.getElementById(activityId);
    if (!activityEl) return;
    const tbody = activityEl.querySelector('.bd-items-body');
    addItemRowToTable(tbody);
    updateActivityTotal(activityId);
}

function addItemRowToTable(tbody, itemName = '', quantity = '', unit = 'pcs', unitPrice = '') {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #f1f5f9';
    const itemOptions = STANDARD_ITEMS.map(item => `<option value="${item}" ${item === itemName ? 'selected' : ''}>${item}</option>`).join('');
    
    row.innerHTML = `
        <td style="padding:8px 6px;">
            <select class="bd-item-name" style="width:100%; padding:8px 10px; border:1.5px solid #e2e8f0; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
                <option value="">-- Chagua Item --</option>
                ${itemOptions}
                <option value="__custom__" ${itemName && !STANDARD_ITEMS.includes(itemName) ? 'selected' : ''}>Nyingine (Andika)...</option>
            </select>
            <input type="text" class="bd-item-custom" value="${itemName && !STANDARD_ITEMS.includes(itemName) ? esc(itemName) : ''}" placeholder="Andika jina la item..." style="display:${itemName && !STANDARD_ITEMS.includes(itemName) ? 'block' : 'none'}; width:100%; padding:6px 10px; border:1.5px solid #e2e8f0; border-radius:6px; font-size:12px; font-family:inherit; margin-top:6px; outline:none;">
        </td>
        <td style="padding:8px 6px;">
            <input type="number" class="bd-item-qty" placeholder="0" value="${quantity}" oninput="this.closest('tr').closest('tbody').closest('div[id^=bd-activity]') && updateActivityTotal(this.closest('div[id^=bd-activity]').id)" style="width:100%; padding:8px 10px; border:1.5px solid #e2e8f0; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
        </td>
        <td style="padding:8px 6px;">
            <select class="bd-item-unit" style="width:100%; padding:8px 10px; border:1.5px solid #e2e8f0; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
                <option value="pcs" ${unit === 'pcs' ? 'selected' : ''}>pcs</option>
                <option value="bags" ${unit === 'bags' ? 'selected' : ''}>bags</option>
                <option value="tons" ${unit === 'tons' ? 'selected' : ''}>tons</option>
                <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="litres" ${unit === 'litres' ? 'selected' : ''}>litres</option>
                <option value="blocks" ${unit === 'blocks' ? 'selected' : ''}>blocks</option>
                <option value="sheets" ${unit === 'sheets' ? 'selected' : ''}>sheets</option>
                <option value="boxes" ${unit === 'boxes' ? 'selected' : ''}>boxes</option>
                <option value="days" ${unit === 'days' ? 'selected' : ''}>days</option>
                <option value="person" ${unit === 'persons' ? 'selected' : ''}>person</option>
                <option value="hours" ${unit === 'hours' ? 'selected' : ''}>hours</option>
                <option value="months" ${unit === 'months' ? 'selected' : ''}>months</option>
            </select>
        </td>
        <td style="padding:8px 6px;">
            <input type="number" class="bd-item-price" placeholder="0" value="${unitPrice}" oninput="this.closest('tr').closest('tbody').closest('div[id^=bd-activity]') && updateActivityTotal(this.closest('div[id^=bd-activity]').id)" style="width:100%; padding:8px 10px; border:1.5px solid #e2e8f0; border-radius:6px; font-size:12px; font-family:inherit; background:white; outline:none;">
        </td>
        <td style="padding:8px 6px; text-align:right;">
            <span class="bd-item-subtotal" style="font-family:'Courier New',monospace; font-weight:800; color:#0f1f3d; font-size:12px;">TSh 0</span>
        </td>
        <td style="padding:8px 6px;">
            <button onclick="this.closest('tr').remove(); this.closest('div[id^=bd-activity]') && updateActivityTotal(this.closest('div[id^=bd-activity]').id);" style="background:rgba(239,68,68,0.1); color:#dc2626; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; font-weight:700;">✕</button>
        </td>
    `;
    tbody.appendChild(row);
    
    const itemSelect = row.querySelector('.bd-item-name');
    const itemCustom = row.querySelector('.bd-item-custom');
    if (itemSelect && itemCustom) {
        itemSelect.addEventListener('change', function() {
            if (this.value === '__custom__') { itemCustom.style.display = 'block'; itemCustom.focus(); } 
            else { itemCustom.style.display = 'none'; itemCustom.value = ''; }
        });
    }
}

// 5. UPDATE TOTALS (Nakili kutoka sales.js)
function updateActivityTotal(activityId) {
    const activityEl = document.getElementById(activityId);
    if (!activityEl) return;
    let activityTotal = 0;
    activityEl.querySelectorAll('.bd-items-body tr').forEach(row => {
        const qty = parseFloat(row.querySelector('.bd-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.bd-item-price')?.value) || 0;
        const subtotal = qty * price;
        const subtotalEl = row.querySelector('.bd-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = 'TSh ' + subtotal.toLocaleString();
        activityTotal += subtotal;
    });
    const totalEl = activityEl.querySelector('.bd-activity-total');
    if (totalEl) totalEl.textContent = 'TSh ' + activityTotal.toLocaleString();
    updateGrandTotal();
}

function updateGrandTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.bd-activity-total').forEach(el => {
        const value = parseFloat(el.textContent.replace(/[^0-9.-]+/g, '')) || 0;
        grandTotal += value;
    });
    const el = document.getElementById('bdGrandTotal');
    if (el) el.textContent = 'TSh ' + grandTotal.toLocaleString();
}
async function submitBudgetBreakdown(isDraft = false) {
    if (!currentDeptBudget) return;
    const { myAllocation, id: budgetId } = currentDeptBudget;
    const items = [];
    document.querySelectorAll('#bdActivitiesList > div').forEach(activityEl => {
        const activitySelect = activityEl.querySelector('.bd-activity-name');
        const activityCustom = activityEl.querySelector('.bd-activity-custom');
        let activityName = activitySelect.value === '__custom__' ? (activityCustom?.value.trim() || 'Unnamed Activity') : activitySelect.value;
        activityEl.querySelectorAll('.bd-items-body tr').forEach(row => {
            const itemSelect = row.querySelector('.bd-item-name');
            const itemCustom = row.querySelector('.bd-item-custom');
            let itemName = itemSelect.value === '__custom__' ? (itemCustom?.value.trim() || '') : itemSelect.value;
            const quantity = parseFloat(row.querySelector('.bd-item-qty')?.value) || 0;
            const unit = row.querySelector('.bd-item-unit')?.value || 'pcs';
            const unitPrice = parseFloat(row.querySelector('.bd-item-price')?.value) || 0;
            if (itemName && quantity > 0) {
                items.push({ activityName, itemName, quantity, unit, unitPrice, totalCost: quantity * unitPrice });
            }
        });
    });
    if (items.length === 0) { showToast('⚠ Add at least one item with quantity', 'error'); return; }
    const totalAllocated = items.reduce((sum, i) => sum + i.totalCost, 0);
    const ceiling = Number(myAllocation.ceilingAmount);
    if (!isDraft && totalAllocated > ceiling) {
        showToast(`⚠ Over budget! Total (TSh ${totalAllocated.toLocaleString()}) exceeds ceiling (TSh ${ceiling.toLocaleString()})`, 'error');
        return;
    }
    if (!isDraft) {
        const confirmed = confirm(`Submit ${items.length} items totaling TSh ${totalAllocated.toLocaleString()} to your Manager?`);
        if (!confirmed) return;
    } 
    try {
        await API.submitDepartmentBreakdown(budgetId, myAllocation.department, { 
            items: items,
            status: isDraft ? 'draft' : 'submitted'
        });
        
        // 🆕 Angalia kama wote wamewasilisha
        if (!isDraft) {
            await checkAndSetPendingManager(budgetId);
        }
        
        showToast(isDraft ? '💾 Draft Saved!' : '✅ Breakdown Submitted!', 'success');
        closeBudgetBreakdownPage();
        loadMyBudget();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
function viewSubmittedBreakdown() {
    if (!currentDeptBudget) return;
    
    const { myAllocation, title, period } = currentDeptBudget;
    const items = myAllocation.items || [];

    if (items.length === 0) {
        showToast('No items to view', 'info');
        return;
    }

    const grouped = {};
    items.forEach(item => {
        const key = item.activityName || 'Unnamed Activity';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    let activitiesHtml = '';
    let grandTotal = 0;

    Object.keys(grouped).forEach((activityName, idx) => {
        const activityItems = grouped[activityName];
        let activityTotal = 0;
        
        const itemsHtml = activityItems.map(item => {
            const subtotal = Number(item.quantity) * Number(item.unitPrice);
            activityTotal += subtotal;
            return `
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed #e2e8f0; font-size:13px;">
                    <div>
                        <span style="font-weight:600; color:#1e293b;">${esc(item.itemName)}</span>
                        <span style="color:#64748b; font-size:12px; margin-left:6px;">(${item.quantity} ${item.unit} × TSh ${Number(item.unitPrice).toLocaleString()})</span>
                    </div>
                    <span style="font-weight:700; color:#0f1f3d; font-family:'Courier New',monospace;">TSh ${subtotal.toLocaleString()}</span>
                </div>
            `;
        }).join('');

        grandTotal += activityTotal;

        activitiesHtml += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:12px; overflow:hidden;">
                <div style="background:#f8fafc; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
                    <div style="font-weight:800; color:#0f1f3d; font-size:14px;">${idx + 1}. ${esc(activityName)}</div>
                    <div style="font-weight:900; color:#0f1f3d; font-family:'Courier New',monospace; font-size:14px;">TSh ${activityTotal.toLocaleString()}</div>
                </div>
                <div style="padding:8px 16px;">
                    ${itemsHtml}
                </div>
            </div>
        `;
    });

    let modal = document.getElementById('viewBreakdownModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'viewBreakdownModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(6px); z-index:50000; display:flex; align-items:center; justify-content:center; padding:20px;';
    
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; max-width:700px; width:100%; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.4);">
            <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom: 3px solid #f59e0b;">
                <div>
                    <h3 style="font-size:20px; font-weight:900; margin:0 0 4px 0;">🔒 Submitted Breakdown</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">${esc(title)} • ${esc(period)}</div>
                </div>
                <button onclick="document.getElementById('viewBreakdownModal').remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>

            <div style="padding:24px 26px; overflow-y:auto; flex:1; background:#f8fafc;">
                <div style="background:rgba(245,158,11,0.08); border-left:4px solid #f59e0b; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:13px; color:#78350f;">
                    👁️ This is a read-only view. Your breakdown has been submitted and cannot be edited.
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
                    <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e2e8f0; border-left: 3px solid #0f1f3d;">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Ceiling</div>
                        <div style="font-size:18px; font-weight:900; color:#0f1f3d; font-family:'Courier New',monospace;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
                    </div>
                    <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e2e8f0; border-left: 3px solid #16a34a;">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Total Submitted</div>
                        <div style="font-size:18px; font-weight:900; color:#16a34a; font-family:'Courier New',monospace;">TSh ${grandTotal.toLocaleString()}</div>
                    </div>
                </div>

                <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">📋 Activities (${Object.keys(grouped).length})</div>
                ${activitiesHtml}
            </div>

            <div style="padding:16px 26px; background:white; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; flex-shrink:0;">
                <button onclick="document.getElementById('viewBreakdownModal').remove()" style="padding:12px 28px; background:linear-gradient(135deg,#0f1f3d,#1a3a6b); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #f59e0b;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}
async function loadAllMyBudgets() {
    const container = document.getElementById('allBudgetsContainer');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">⏳ Loading your budgets...</div>`;

    try {
        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;

        if (!myDept) {
            container.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">⚠️ Hauna Department iliyowekwa kwenye profile yako.</div>`;
            return;
        }

        const budgets = await API.getMasterBudgets();
        const list = Array.isArray(budgets) ? budgets : [];

        allMyBudgets = list.filter(b => 
            b.allocations && b.allocations.some(a => a.department === myDept)
        ).map(b => {
            const myAllocation = b.allocations.find(a => a.department === myDept);
            return { ...b, myAllocation, department: myDept };
        });

        allMyBudgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        renderBudgetsFilters();
    } catch (err) {
        console.error('loadAllMyBudgets error:', err);
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#dc2626;">
                <div style="font-size:40px;margin-bottom:10px;">❌</div>
                <div style="font-weight:800;">Imeshindwa Kupakia Budgets</div>
                <div style="font-size:12px;color:#64748b;margin-top:8px;">${err.message}</div>
                <button onclick="loadAllMyBudgets()" style="margin-top:16px;padding:10px 20px;background:#0f1f3d;color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Jaribu Tena</button>
            </div>`;
    }
}

function renderBudgetsFilters() {
    const container = document.getElementById('allBudgetsContainer');
    if (!container) return;

    const primary = '#0f1f3d';
    const accent = '#f59e0b';

    container.innerHTML = `
        <div id="budgetsStatsGrid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;"></div>

        <div style="background:white; border-radius:12px; padding:16px 20px; border:1px solid #e2e8f0; margin-bottom:20px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="budgetSearchInput" placeholder="🔍 Search budget..." oninput="filterBudgets()" style="flex:1; min-width:200px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
            
            <div style="position:relative; display:flex; align-items:center;">
                <input type="date" id="budgetDateFilter" onchange="filterBudgets()" 
                       style="padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; background:white; outline:none; cursor:pointer; color:#334155; font-weight:600;">
                <button onclick="clearDateFilter()" id="clearDateBtn" style="display:none; position:absolute; right:8px; background:#f1f5f9; border:none; width:22px; height:22px; border-radius:50%; cursor:pointer; color:#64748b; font-size:12px; font-weight:800;" title="Clear Date">✕</button>
            </div>

            <select id="budgetStatusFilter" onchange="filterBudgets()" style="padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; background:white; outline:none; cursor:pointer;">
                <option value="">🚦 All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="submitted">✅ Submitted</option>
                <option value="approved">🟢 Approved</option>
                <option value="rejected">❌ Rejected</option>
            </select>

            <button onclick="resetBudgetsFilters()" style="padding:10px 18px; background:rgba(239,68,68,0.1); color:#dc2626; border:1px solid rgba(239,68,68,0.2); border-radius:8px; font-weight:700; font-size:12px; cursor:pointer; font-family:inherit;">🔄 Reset</button>
        </div>

        <div id="budgetsListContainer"></div>
    `;

    renderBudgetsStats();
    renderBudgetsList();
}

function renderBudgetsStats() {
    const statsContainer = document.getElementById('budgetsStatsGrid');
    if (!statsContainer) return;

    const total = allMyBudgets.length;
    const pending = allMyBudgets.filter(b => 
        b.myAllocation?.status === 'pending-department' || 
        b.myAllocation?.status === 'pending'
    ).length;
    const submitted = allMyBudgets.filter(b => 
        b.myAllocation?.status === 'submitted' || 
        b.myAllocation?.status === 'approved'
    ).length;
    const rejected = allMyBudgets.filter(b => 
        b.myAllocation?.status === 'rejected'
    ).length;

    const totalValue = allMyBudgets.reduce((sum, b) => 
        sum + Number(b.myAllocation?.ceilingAmount || 0), 0
    );

    const primary = '#0f1f3d';

    statsContainer.innerHTML = `
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid ${primary}; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">📊 Total</div>
            <div style="font-size:24px; font-weight:900; color:${primary}; font-family:'Courier New',monospace;">${total}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">TSh ${totalValue.toLocaleString()}</div>
        </div>
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #f59e0b; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">⏳ Pending</div>
            <div style="font-size:24px; font-weight:900; color:#f59e0b; font-family:'Courier New',monospace;">${pending}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Awaiting</div>
        </div>
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #16a34a; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">✅ Approved</div>
            <div style="font-size:24px; font-weight:900; color:#16a34a; font-family:'Courier New',monospace;">${submitted}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Approved</div>
        </div>
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #dc2626; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">❌ Rejected</div>
            <div style="font-size:24px; font-weight:900; color:#dc2626; font-family:'Courier New',monospace;">${rejected}</div>
            <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Rejected</div>
        </div>
    `;
}

function renderBudgetsList() {
    const container = document.getElementById('budgetsListContainer');
    if (!container) return;

    let filtered = [...allMyBudgets];

    if (currentBudgetFilter.search) {
        const s = currentBudgetFilter.search;
        filtered = filtered.filter(b =>
            (b.title || '').toLowerCase().includes(s) ||
            (b.period || '').toLowerCase().includes(s) ||
            (b.createdBy || '').toLowerCase().includes(s)
        );
    }

    if (currentBudgetFilter.date) {
        const selectedDate = new Date(currentBudgetFilter.date);
        const selectedYearMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
        filtered = filtered.filter(b => {
            if (!b.createdAt) return false;
            const bDate = new Date(b.createdAt);
            const bYearMonth = `${bDate.getFullYear()}-${String(bDate.getMonth() + 1).padStart(2, '0')}`;
            return bYearMonth === selectedYearMonth;
        });
    }

    if (currentBudgetFilter.status) {
        filtered = filtered.filter(b => {
            const s = b.myAllocation?.status || 'pending';
            if (currentBudgetFilter.status === 'pending') return s === 'pending-department' || s === 'pending';
            if (currentBudgetFilter.status === 'submitted') return s === 'submitted';
            if (currentBudgetFilter.status === 'approved') return s === 'approved';
            if (currentBudgetFilter.status === 'rejected') return s === 'rejected';
            return true;
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;background:white;border-radius:14px;border:1px solid #e2e8f0;">
                <div style="font-size:56px;margin-bottom:14px;opacity:0.5;">📭</div>
                <div style="font-size:17px;font-weight:800;color:#334155;margin-bottom:6px;">No Budgets Found</div>
                <div style="font-size:13px;color:#64748b;">${allMyBudgets.length === 0 ? 'No budgets yet. Wait for Manager allocation.' : 'Try adjusting your filters.'}</div>
            </div>`;
        return;
    }

    const primary = '#0f1f3d';
    const accent = '#f59e0b';

    container.innerHTML = `
        <div style="background:white; border-radius:14px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.03);">
            <div class="budget-list-header" style="display:grid; grid-template-columns: 2fr 1fr 1fr 100px 160px; gap:16px; padding:16px 24px; background:#f8fafc; border-bottom:2px solid #e2e8f0; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px;">
                <div>Budget Details</div>
                <div>Period</div>
                <div>Ceiling Amount</div>
                <div>Status</div>
                <div style="text-align:right;">Actions</div>
            </div>
            <div id="budgetListBody">
                ${filtered.map(b => {
                    const alloc = b.myAllocation || {};
                    const status = alloc.status || 'pending';
                    const ceiling = Number(alloc.ceilingAmount || 0);
                    const itemCount = (alloc.items || []).length;
                    const createdDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

                    const statusInfo = {
                        'pending': { icon: '⏳', label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                        'pending-department': { icon: '⏳', label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                        'draft': { icon: '📝', label: 'Draft', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
                        'submitted': { icon: '✅', label: 'Submitted', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
                        'approved': { icon: '🟢', label: 'Approved', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
                        'rejected': { icon: '❌', label: 'Rejected', color: '#dc2626', bg: 'rgba(239,68,68,0.1)' }
                    }[status] || { icon: '❓', label: status, color: '#64748b', bg: 'rgba(100,116,139,0.1)' };

                    let btnAction = `<button onclick="viewBudgetDetailsFromAll('${b.id}')" style="padding:6px 12px; background:white; color:${primary}; border:1.5px solid ${primary}; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit;">👁 View</button>`;
                    
                    if (status === 'pending' || status === 'pending-department') {
                        btnAction += `<button onclick="openBudgetForDepartment('${b.id}', '${status}')" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#1a3a6b); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">➕ Add</button>`;
                    } else if (status === 'draft') {
                        btnAction += `<button onclick="openBudgetForDepartment('${b.id}', 'draft')" style="padding:6px 12px; background:linear-gradient(135deg,${accent},#d97706); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">✏️ Edit</button>`;
                    } else if (status === 'submitted' || status === 'approved') {
                        btnAction = `<button onclick="viewBudgetDetailsFromAll('${b.id}')" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#1a3a6b); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; border:1.5px solid ${accent};">📋 Breakdown</button>`;
                    }

                    const rejectionHtml = (status === 'rejected' && alloc.rejectionReason) ? `
                        <div style="font-size:10px; color:#dc2626; margin-top:4px; background:rgba(220,38,38,0.05); padding:4px 8px; border-radius:4px; border-left:2px solid #dc2626;">
                            <strong>Reason:</strong> ${esc(alloc.rejectionReason)}
                        </div>
                    ` : '';

                    return `
                        <div class="budget-row" style="display:grid; grid-template-columns: 2fr 1fr 1fr 100px 160px; gap:16px; padding:16px 24px; border-bottom:1px solid #f1f5f9; align-items:center; transition:background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                            <div>
                                <div style="font-weight:900; color:${primary}; font-size:14px; margin-bottom:2px;">${esc(b.title)}</div>
                                <div style="font-size:11px; color:#64748b; display:flex; align-items:center; gap:6px;">
                                    <span>🏢 ${esc(b.department)}</span>
                                    <span>•</span>
                                    <span>👤 ${esc(b.createdBy || '—')}</span>
                                </div>
                                ${rejectionHtml}
                            </div>
                            <div>
                                <div style="font-size:12px; font-weight:700; color:#334155;">${esc(b.period)}</div>
                                <div style="font-size:10px; color:#94a3b8;">📆 ${createdDate}</div>
                            </div>
                            <div>
                                <div style="font-size:14px; font-weight:900; color:${primary}; font-family:'Courier New',monospace;">TSh ${ceiling.toLocaleString()}</div>
                                <div style="font-size:10px; color:#94a3b8; font-weight:600;">${itemCount} ${itemCount === 1 ? 'Item' : 'Items'}</div>
                            </div>
                            <div>
                                <span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:800; background:${statusInfo.bg}; color:${statusInfo.color}; text-transform:uppercase;">
                                    ${statusInfo.icon} ${statusInfo.label}
                                </span>
                            </div>
                            <div style="text-align:right; display:flex; gap:4px; justify-content:flex-end;">
                                ${btnAction}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        <style>
            @media (max-width: 900px) {
                .budget-list-header { display: none !important; }
                .budget-row { 
                    display: flex !important; 
                    flex-direction: column !important; 
                    align-items: flex-start !important; 
                    gap: 10px !important; 
                    padding: 16px !important;
                    border-left: 4px solid ${primary} !important;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #e2e8f0;
                    background: white;
                }
                .budget-row > div { width: 100%; text-align: left !important; }
                .budget-row > div:last-child { justify-content: flex-start !important; margin-top: 8px; }
            }
        </style>
    `;
}

function filterBudgets() {
    currentBudgetFilter.search = (document.getElementById('budgetSearchInput')?.value || '').toLowerCase().trim();
    const dateVal = document.getElementById('budgetDateFilter')?.value || '';
    currentBudgetFilter.date = dateVal; 
    currentBudgetFilter.status = document.getElementById('budgetStatusFilter')?.value || '';
    
    const clearBtn = document.getElementById('clearDateBtn');
    if(clearBtn) clearBtn.style.display = dateVal ? 'block' : 'none';

    renderBudgetsList();
}

function clearDateFilter() {
    const dateInput = document.getElementById('budgetDateFilter');
    if (dateInput) dateInput.value = '';
    filterBudgets();
}

function resetBudgetsFilters() {
    if(document.getElementById('budgetSearchInput')) document.getElementById('budgetSearchInput').value = '';
    if(document.getElementById('budgetDateFilter')) document.getElementById('budgetDateFilter').value = '';
    if(document.getElementById('budgetStatusFilter')) document.getElementById('budgetStatusFilter').value = '';
    
    const clearBtn = document.getElementById('clearDateBtn');
    if(clearBtn) clearBtn.style.display = 'none';
    
    filterBudgets();
    showToast('🔄 Filters reset', 'info');
}

function loadAllBudgetsPage() {
    renderBudgetsFilters();
    setTimeout(() => { loadAllMyBudgets(); }, 100);
}
async function openBudgetForDepartment(budgetId, status) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) { showToast('❌ Budget not found', 'error'); return; }

        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        const myAllocation = b.allocations.find(a => a.department === myDept);

        if (!myAllocation) {
            showToast('❌ You have no allocation in this budget', 'error');
            return;
        }

        currentDeptBudget = { ...b, myAllocation };
        openBudgetBreakdownPage();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
async function viewBudgetDetailsFromAll(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) return;

        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        const myAllocation = b.allocations.find(a => a.department === myDept);

        if (!myAllocation) {
            showToast('❌ You have no allocation in this budget', 'error');
            return;
        }

        currentDeptBudget = { ...b, myAllocation };
        viewSubmittedBreakdown();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
function toggleSidebarBudgetDropdown(event) {
    if (event) event.preventDefault();
    const dropdown = document.getElementById('sidebarBudgetDropdown');
    if (!dropdown) return;
    
    // Funga dropdown nyingine zilizo wazi (kama zipo) kabla ya kufungua hii
    document.querySelectorAll('.sidebar-dropdown.open').forEach(el => {
        if (el.id !== 'sidebarBudgetDropdown') el.classList.remove('open');
    });

    dropdown.classList.toggle('open');
}
async function forwardCurrentBudgetToCEO() {
    if (!currentReviewBudgetId) {
        showToast('⚠ No budget selected', 'error');
        return;
    }

    try {
        // 1. Angalia kama kuna idara ambazo hazijakamilisha
        const budget = await API.getMasterBudgetById(currentReviewBudgetId);
        const pendingDepts = budget.allocations.filter(a => a.status === 'pending-department' || a.status === 'pending');
        
        if (pendingDepts.length > 0) {
            const confirmForward = await modernConfirm({
                title: '⚠️ Departments Pending',
                message: `${pendingDepts.length} department(s) have not submitted their breakdown yet. Do you want to forward to CEO anyway?`,
                type: 'warning',
                okText: '📤 Forward Anyway',
                cancelText: 'Cancel'
            });
            if (!confirmForward.confirmed) return;
        } else {
            const confirmForward = await modernConfirm({
                title: '📤 Forward to CEO?',
                message: 'All departments have submitted. Send this budget to CEO for final approval?',
                type: 'success',
                okText: '📤 Forward to CEO',
                cancelText: 'Cancel'
            });
            if (!confirmForward.confirmed) return;
        }

        // 2. Tuma kwa API
        await API.forwardMasterBudgetToCeo(currentReviewBudgetId);
        
        modernToast('✅ Forwarded', 'Budget sent to CEO successfully!', 'success');
        
        // 3. Rudi kwenye History
        switchBudgetSubTab('history');
        loadMasterBudgetHistory();

    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
async function submitBudgetToCEO(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) return modernToast('Not Found', 'Budget not found', 'error');

        if (b.status === 'pending-ceo') return modernToast('Already Submitted', 'Already pending CEO.', 'warning');
        if (b.status === 'approved') return modernToast('Already Approved', 'Already approved.', 'warning');

        const allocations = b.allocations || [];
        const pending = allocations.filter(a => a.status === 'pending-department' || a.status === 'pending');

        if (pending.length > 0) {
            const res = await modernConfirm({
                title: '⚠️ Departments Pending',
                message: `${pending.length} department(s) have not submitted yet. Submit to CEO anyway?`,
                type: 'warning',
                okText: '📤 Submit Anyway'
            });
            if (!res.confirmed) return;
        }

        const finalConfirm = await modernConfirm({
            title: '📤 Submit Budget to CEO?',
            message: 'This will send the budget to the CEO for final approval. You cannot edit it after.',
            type: 'primary',
            okText: '✅ Yes, Submit'
        });
        if (!finalConfirm.confirmed) return;

        await API.forwardMasterBudgetToCeo(budgetId);
        modernToast('✅ Submitted', 'Budget sent to CEO for final approval.', 'success');

        setTimeout(() => {
            switchBudgetSubTab('history');
            loadMasterBudgetHistory();
        }, 500);

    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
async function checkAndSetPendingManager(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b || b.status !== 'pending-departments') return false;

        const allSubmitted = (b.allocations || []).every(a => a.status === 'submitted' || a.status === 'approved');
        if (allSubmitted) {
            await API.updateMasterBudgetStatus(budgetId, { status: 'pending-manager' });
            return true;
        }
        return false;
    } catch (err) {
        console.error(err);
        return false;
    }
}
async function openManagerReviewPage(budgetId) {
    try {
        currentReviewBudgetId = budgetId;
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) return;

        document.getElementById('reviewBudgetTitle').textContent = b.title;
        document.getElementById('reviewBudgetMeta').textContent = `${b.period} • Created by ${b.createdBy}`;
        document.getElementById('reviewBudgetTotal').textContent = `TSh ${Number(b.totalAmount).toLocaleString()}`;

        // ===== HESABU ZA STATUS =====
        const allocations = b.allocations || [];
        const submittedCount = allocations.filter(a => a.status === 'submitted' || a.status === 'approved').length;
        const pendingCount = allocations.filter(a => a.status === 'pending-department' || a.status === 'pending').length;
        const allSubmitted = pendingCount === 0;

        // ===== PROGRESS BAR =====
        const progressHtml = `
            <div style="background:white; padding:18px 22px; border-radius:12px; margin-bottom:16px; border:1px solid #e5e7eb;">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <span style="font-size:13px; font-weight:700; color:#334155;">Submission Progress</span>
                    <span style="font-size:13px; font-weight:800; color:#0f1f3d;">${submittedCount} / ${allocations.length} submitted</span>
                </div>
                <div style="height:10px; background:#f1f5f9; border-radius:5px; overflow:hidden;">
                    <div style="height:100%; width:${allocations.length > 0 ? (submittedCount / allocations.length) * 100 : 0}%; background:linear-gradient(90deg,#22c55e,#16a34a); border-radius:5px; transition:width 0.5s;"></div>
                </div>
                <div style="display:flex; gap:16px; margin-top:10px; font-size:11px; color:#64748b;">
                    <span>✅ ${submittedCount} submitted</span>
                    <span>⏳ ${pendingCount} pending</span>
                </div>
            </div>
        `;

        // ===== KADI ZA DEPARTMENTS =====
        const deptCardsHtml = allocations.map(a => {
            const isSubmitted = a.status === 'submitted' || a.status === 'approved';
            const itemsCount = a.items ? a.items.length : 0;
            const statusColor = isSubmitted ? '#16a34a' : '#d97706';
            const statusBg = isSubmitted ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)';
            const statusLabel = isSubmitted ? '✅ Submitted' : '⏳ Waiting';

            let totalItemsCost = 0;
            if (a.items && a.items.length > 0) {
                totalItemsCost = a.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
            }

            let itemsHtml = '';
            if (isSubmitted && a.items && a.items.length > 0) {
                const grouped = {};
                a.items.forEach(item => {
                    const key = item.activityName || 'Unnamed Activity';
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(item);
                });

                itemsHtml = `
                    <div style="margin-top:14px; padding-top:14px; border-top:1px dashed #e5e7eb;">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">📋 Activities Breakdown (${Object.keys(grouped).length})</div>
                        ${Object.entries(grouped).map(([activityName, items]) => {
                            const activityTotal = items.reduce((s, i) => s + Number(i.totalCost || 0), 0);
                            return `
                                <div style="background:#f8fafc; border-radius:8px; padding:10px 12px; margin-bottom:8px; border-left:3px solid #0f1f3d;">
                                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                                        <span style="font-weight:800; color:#0f1f3d; font-size:12px;">${esc(activityName)}</span>
                                        <span style="font-family:'Courier New',monospace; font-weight:900; color:#0f1f3d; font-size:12px;">TSh ${activityTotal.toLocaleString()}</span>
                                    </div>
                                    ${items.map(item => `
                                        <div style="display:flex; justify-content:space-between; font-size:11px; padding:3px 0; color:#475569;">
                                            <span>• ${esc(item.itemName || '—')} (${item.quantity} ${item.unit} × TSh ${Number(item.unitPrice || 0).toLocaleString()})</span>
                                            <span style="font-family:'Courier New',monospace; font-weight:700;">TSh ${Number(item.totalCost || 0).toLocaleString()}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }
            const isOverBudget = totalItemsCost > Number(a.ceilingAmount);

            return `
                <div style="background:white; border:1px solid #e5e7eb; border-left:5px solid ${isOverBudget ? '#dc2626' : statusColor}; border-radius:10px; padding:18px 20px; margin-bottom:12px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                        <div style="display:flex; align-items:center; gap:14px; flex:1; min-width:220px;">
                            <div style="width:44px; height:44px; border-radius:10px; background:#f8fafc; border:1px solid #e5e7eb; display:flex; align-items:center; justify-content:center; font-size:22px;">${a.icon || '📁'}</div>
                            <div>
                                <div style="font-weight:800; color:#0f1f3d; font-size:15px;">${esc(a.department)}</div>
                                <div style="font-size:13px; color:#64748b; font-family:'Courier New',monospace; font-weight:800; margin-top:4px;">Ceiling: TSh ${Number(a.ceilingAmount).toLocaleString()}</div>
                                ${isSubmitted ? `
                                    <div style="font-size:11px; color:${isOverBudget ? '#dc2626' : '#16a34a'}; font-weight:700; margin-top:4px;">
                                        ${isOverBudget ? '⚠️ OVER BUDGET' : '✅ Within Budget'}: TSh ${totalItemsCost.toLocaleString()}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <span style="display:inline-block; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:800; color:${statusColor}; background:${statusBg}; margin-bottom:8px;">${statusLabel}</span>
                            <div style="font-size:12px; font-weight:700; color:#64748b;">${isSubmitted ? `${itemsCount} items` : 'No items yet'}</div>
                        </div>
                    </div>
                    ${itemsHtml}
                </div>
            `;
        }).join('');

        // ===== SUBMIT FOOTER — KITUFE CHA KUPELEKA KWA CEO NA DOWNLOAD =====
        const canSubmit = b.status === 'pending-manager' || b.status === 'pending-departments';
        const alreadySubmitted = b.status === 'pending-ceo';
        const alreadyApproved = b.status === 'approved';
        const isRejected = b.status === 'rejected';

        // Kitufe cha Kupakua Kitabu
        const downloadBtn = `
            <button onclick="openBudgetBookModal('${b.id}')" 
                    style="padding:12px 24px; background:linear-gradient(135deg,#0f1f3d,#1a3a6b); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:13px; font-family:inherit; border:1.5px solid #f59e0b; box-shadow:0 4px 12px rgba(15,31,61,0.2); display:flex; align-items:center; gap:6px;">
                📥 Download Book
            </button>
        `;

        let footerHtml = '';

        if (alreadySubmitted) {
            footerHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; border-top:2px dashed #e5e7eb; padding-top:20px; margin-top:20px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800; color:#c2410c;">
                        ⏳ Already submitted to CEO — Awaiting final approval
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="switchBudgetSubTab('history')" 
                                style="padding:12px 24px; background:white; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; font-family:inherit;">
                            ← Back to History
                        </button>
                        ${downloadBtn}
                    </div>
                </div>
            `;
        } else if (alreadyApproved) {
            footerHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; border-top:2px dashed #e5e7eb; padding-top:20px; margin-top:20px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800; color:#16a34a;">
                        ✅ Approved by CEO — Budget Book available
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button onclick="switchBudgetSubTab('history')" 
                                style="padding:12px 24px; background:white; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; font-family:inherit;">
                            ← Back
                        </button>
                        ${downloadBtn}
                    </div>
                </div>
            `;
        } else if (canSubmit) {
            footerHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; border-top:2px dashed #e5e7eb; padding-top:20px; margin-top:20px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:${allSubmitted ? '#16a34a' : '#d97706'};">
                        ${allSubmitted 
                            ? '✅ All departments submitted — Ready to send to CEO' 
                            : `⚠️ ${pendingCount} department(s) still pending submission`}
                    </div>
                    <div style="display:flex; gap:12px; flex-wrap:wrap;">
                        <button onclick="switchBudgetSubTab('history')" 
                                style="padding:12px 24px; background:white; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; font-family:inherit;">
                            ← Back
                        </button>
                        
                        ${downloadBtn}

                        ${isRejected ? `
                            <button onclick="submitBudgetToCEO('${b.id}')" 
                                    style="padding:12px 32px; background:linear-gradient(135deg, #16a34a, #15803d); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:14px; font-family:inherit; box-shadow:0 4px 12px rgba(22,163,74,0.3);">
                                🔄 Resubmit to CEO
                            </button>
                        ` : `
                            <button onclick="submitBudgetToCEO('${b.id}')" 
                                    style="padding:12px 32px; background:linear-gradient(135deg, #16a34a, #15803d); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:14px; font-family:inherit; box-shadow:0 4px 12px rgba(22,163,74,0.3);">
                                📤 Submit to CEO
                            </button>
                        `}
                    </div>
                </div>
            `;
        } else if (isRejected) {
            footerHtml = `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; border-top:2px dashed #e5e7eb; padding-top:20px; margin-top:20px; flex-wrap:wrap;">
                    <div style="display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800; color:#dc2626;">
                        ❌ Budget rejected by CEO — Review and resubmit
                    </div>
                    <div style="display:flex; gap:12px; flex-wrap:wrap;">
                        <button onclick="switchBudgetSubTab('history')" 
                                style="padding:12px 24px; background:white; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:700; cursor:pointer; font-size:13px; font-family:inherit;">
                            ← Back
                        </button>
                        ${downloadBtn}
                        <button onclick="submitBudgetToCEO('${b.id}')" 
                                style="padding:12px 32px; background:linear-gradient(135deg, #16a34a, #15803d); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:14px; font-family:inherit; box-shadow:0 4px 12px rgba(22,163,74,0.3);">
                            🔄 Resubmit to CEO
                        </button>
                    </div>
                </div>
            `;
        }

        document.getElementById('reviewDepartmentContainer').innerHTML = progressHtml + deptCardsHtml + footerHtml;
        switchBudgetSubTab('review');

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
async function checkAndSetPendingManager(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) return false;

        // Ruhusu tu kutoka pending-departments
        if (b.status !== 'pending-departments') return false;

        // Angalia kama departments wote wamewasilisha
        const allSubmitted = (b.allocations || []).every(a =>
            a.status === 'submitted' || a.status === 'approved'
        );

        if (allSubmitted) {
            await API.updateMasterBudgetStatus(budgetId, {
                status: 'pending-manager',
                readyForReviewAt: new Date().toISOString()
            });
            console.log('✅ Budget status updated to pending-manager:', budgetId);
            return true;
        }

        return false;
    } catch (err) {
        console.error('checkAndSetPendingManager error:', err);
        return false;
    }
}
async function submitBudgetToCEO(budgetId) {
    try {
        const b = await API.getMasterBudgetById(budgetId);
        if (!b) {
            modernToast('Not Found', 'Budget not found', 'error');
            return;
        }

        if (b.status === 'pending-ceo') {
            modernToast('Already Submitted', 'This budget is already pending CEO approval.', 'warning');
            return;
        }
        if (b.status === 'approved') {
            modernToast('Already Approved', 'This budget is already approved by CEO.', 'warning');
            return;
        }

        const allocations = b.allocations || [];
        const pending = allocations.filter(a =>
            a.status === 'pending-department' || a.status === 'pending'
        );
        const submitted = allocations.filter(a =>
            a.status === 'submitted' || a.status === 'approved'
        );

        if (pending.length > 0) {
            const res = await modernConfirm({
                title: '⚠️ Departments Pending',
                message: `${pending.length} department(s) have not submitted their breakdown yet. Do you want to submit to CEO anyway?`,
                detail: {
                    label: 'Submission Status',
                    value: `${submitted.length}/${allocations.length} submitted`
                },
                type: 'warning',
                okText: '📤 Submit Anyway',
                cancelText: 'Cancel'
            });
            if (!res.confirmed) return;
        }

        const finalConfirm = await modernConfirm({
            title: '📤 Submit Budget to CEO?',
            message: `This will send the budget to the CEO for final approval. Once submitted, you cannot edit the budget.`,
            detail: {
                label: 'Budget • Total Amount',
                value: `${b.title} • TSh ${Number(b.totalAmount).toLocaleString()}`
            },
            type: 'primary',
            okText: '✅ Yes, Submit to CEO',
            cancelText: 'Cancel'
        });
        if (!finalConfirm.confirmed) return;

        await API.forwardMasterBudgetToCeo(budgetId);

        modernToast('✅ Submitted', 'Budget sent to CEO for final approval.', 'success');

        setTimeout(() => {
            switchBudgetSubTab('history');
            loadMasterBudgetHistory();
        }, 500);

    } catch (err) {
        console.error('submitBudgetToCEO error:', err);
        modernToast('Failed', err.message, 'error');
    }
}
async function forwardCurrentBudgetToCEO() {
    if (!currentReviewBudgetId) {
        showToast('⚠ No budget selected', 'error');
        return;
    }
    await submitBudgetToCEO(currentReviewBudgetId);
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

        // Tengeneza Kurasa za Kila Idara kwa kugawanya items (Pagination)
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
                    background: white;
                    width: 210mm;
                    height: 297mm; 
                    margin: 20px auto;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
                    position: relative;
                    box-sizing: border-box;
                    font-family: 'Inter', sans-serif;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .page-border {
                    border: 2px solid #e2e8f0;
                    margin: 15mm;
                    padding: 10mm;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                .page-footer {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 40px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 15mm;
                    background: #f8fafc;
                }
                
                @media print {
                    body * { visibility: hidden; }
                    #budgetBookModal { position: static !important; overflow: visible !important; background: transparent !important; }
                    #printableBudgetBook, #printableBudgetBook * { visibility: visible; }
                    #printableBudgetBook { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
                    .a4-page { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important;
                        height: 100vh !important;
                        page-break-after: always; 
                    }
                    .page-border { margin: 10mm; }
                    .page-footer { position: fixed; bottom: 0; }
                    .no-print { display: none !important; }
                    @page { size: A4; margin: 0; }
                }
            </style>

            <!-- HEADER YA MODAL -->
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

            <!-- ENEO LA KUSCROLL KURASA -->
            <div style="flex:1; overflow-y:auto; background:#475569; padding:40px 20px;" id="printableBudgetBook">
                
                <!-- 1. COVER PAGE -->
                <div class="a4-page">
                    <!-- Border ya nje ya Jalada -->
                    <div style="border: 8px solid #0f1f3d; margin: 15mm; flex: 1; display: flex; flex-direction: column; position: relative; background: #fff;">
                        
                        <!-- Mistari ya Mapambo (Gold) -->
                        <div style="height: 15px; background: #f59e0b; width: 100%;"></div>
                        <div style="height: 5px; background: #0f1f3d; width: 100%; margin-bottom: 40px;"></div>

                        <div style="text-align: center; padding: 0 40px;">
                            <!-- Logo Kubwa -->
                            <img src="assets/makdc-logo.jpg" alt="Logo" style="height: 160px; margin-bottom: 30px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.2));">
                            
                            <h1 style="font-size: 42px; font-weight: 900; color: #0f1f3d; margin: 0; text-transform: uppercase; letter-spacing: 2px; line-height: 1.1;">
                                MAK DC INVESTMENT
                            </h1>
                            <h2 style="font-size: 22px; font-weight: 700; color: #64748b; margin: 10px 0 30px 0; text-transform: uppercase; letter-spacing: 8px;">
                                COMPANY LIMITED
                            </h2>
                            
                            <div style="width: 150px; height: 4px; background: #f59e0b; margin: 0 auto 40px auto;"></div>
                            
                            <h3 style="font-size: 32px; font-weight: 900; color: #0f1f3d; margin-bottom: 10px; letter-spacing: 1px;">
                                OFFICIAL BUDGET BOOK
                            </h3>
                            <h4 style="font-size: 20px; font-weight: 500; color: #64748b; margin-bottom: 60px; font-style: italic; font-family: 'Times New Roman', serif;">
                                Company Financial Plan & Strategy
                            </h4>

                            <!-- Kadi ya Maelezo ya Bajeti -->
                            <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 30px; display: inline-block; text-align: left; min-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                                <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                                    <div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px;">Budget Title</div>
                                    <div style="font-size: 20px; font-weight: 900; color: #0f1f3d;">${esc(b.title)}</div>
                                </div>
                                <div style="margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                                    <div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px;">Financial Period</div>
                                    <div style="font-size: 18px; font-weight: 700; color: #0f1f3d;">${esc(b.period)} (${b.year})</div>
                                </div>
                                <div>
                                    <div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px;">Total Company Ceiling</div>
                                    <div style="font-size: 26px; font-weight: 900; color: #f59e0b; font-family: 'Courier New', monospace;">TSh ${Number(b.totalAmount).toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top: auto; text-align: center; padding-bottom: 30px;">
                            <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
                                Generated securely via MAK DC ERP System<br>
                                ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                        <div style="height: 10px; background: #0f1f3d; width: 100%;"></div>
                    </div>
                </div>

                <!-- 2. EXECUTIVE SUMMARY & NARRATIVE -->
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
                <!-- 5. BACK PAGE -->
                <div class="a4-page" style="page-break-before: always;">
                    <div class="page-border" style="justify-content: center; align-items: center; text-align: center; position: relative;">
                        
                        <!-- Mapambo ya Juu -->
                        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 8px; background: #f59e0b;"></div>

                        <img src="assets/makdc-logo.jpg" alt="Logo" style="height: 100px; margin-bottom: 20px; opacity: 0.9;">
                        
                        <h2 style="font-size: 24px; font-weight: 900; color: #0f1f3d; margin-bottom: 10px;">MAK DC INVESTMENT COMPANY LTD</h2>
                        <p style="font-size: 14px; color: #64748b; font-style: italic; margin-bottom: 40px;">"Quality service is our priority."</p>
                        
                        <div style="width: 80px; height: 3px; background: #f59e0b; margin: 0 auto 40px auto;"></div>

                        <div style="background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px dashed #cbd5e1; max-width: 450px; margin: 0 auto;">
                            <h3 style="font-size: 14px; font-weight: 800; color: #0f1f3d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;">
                                Official Document Notice
                            </h3>
                            <p style="font-size: 12px; color: #475569; line-height: 1.8; text-align: justify;">
                                This Budget Book is the official property of MAK DC Investment Company LTD. It contains confidential financial and strategic information intended solely for authorized personnel, management, and the Board of Directors. 
                                <br><br>
                                Any unauthorized duplication, distribution, or disclosure of the contents herein is strictly prohibited.
                            </p>
                        </div>

                        <div style="margin-top: auto; padding-top: 40px;">
                            <div style="font-size: 12px; font-weight: 800; color: #0f1f3d; letter-spacing: 1px; margin-bottom: 5px;">OFFICIAL SEAL</div>
                            <div style="width: 120px; height: 120px; border: 3px solid #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; opacity: 0.3;">
                                <!-- Hapa unaweza kuweka picha ya muhuri (Stamp) kama unayo -->
                                <span style="font-size: 40px;">🏛️</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer ya Ukurasa wa Mwisho -->
                    <div class="page-footer" style="justify-content: center;">
                        <div style="font-size: 10px; font-weight: 600; color: #94a3b8; text-align: center;">
                            © ${new Date().getFullYear()} MAK DC Investment Company LTD. All rights reserved.<br>
                            <span style="font-size: 9px;">Generated on ${new Date().toLocaleString('en-GB')}</span>
                        </div>
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
// ================================================================
// 🧭 STRATEGIC PLAN MODULE — v6.0 (Document-First)
// Manager uploads document → CEO reviews → Archive
// ================================================================

const SP_LOGO_URL = 'assets/makdc-logo.jpg';
const SP_LOGO_FALLBACK = 'https://via.placeholder.com/120x120/0f1f3d/ffffff?text=MAK';
const SP_STORAGE_KEY = 'makdc_strategic_plans_v6';
const SP_MAX_SIZE = 10 * 1024 * 1024; // 10MB

let strategicPlansCache = [];
let currentSPFilter = 'all';
let currentSPView = 'list';
let spUploadFile = null;
let spUploadFileData = null; // base64

const SP_STATUS = {
    'Draft':              { icon: '📝', label: 'Draft',              color: '#64748b', cardClass: '',              badgeClass: 'navy',  roadmapClass: 'blue'  },
    'Pending CEO':        { icon: '⏳', label: 'Pending CEO',        color: '#d97706', cardClass: 'status-progress', badgeClass: 'gold',  roadmapClass: 'gold'  },
    'Approved by CEO':    { icon: '✅', label: 'Approved by CEO',    color: '#16a34a', cardClass: 'status-completed',badgeClass: 'green', roadmapClass: 'green' },
    'Rejected by CEO':    { icon: '❌', label: 'Rejected by CEO',    color: '#dc2626', cardClass: 'status-hold',     badgeClass: 'red',   roadmapClass: 'red'   },
    'Revision Requested': { icon: '🔄', label: 'Revision Requested', color: '#2563eb', cardClass: 'status-progress', badgeClass: 'blue',  roadmapClass: 'blue'  }
};

function getSPStatusInfo(status) { return SP_STATUS[status] || SP_STATUS['Draft']; }
function isCEO() { const r = (currentUser?.role || '').toLowerCase(); return r.includes('ceo') || r.includes('chief executive'); }
function isManagerRole() { const r = (currentUser?.role || '').toLowerCase(); return r.includes('manager'); }

// ================================================================
// LOAD
// ================================================================
async function loadStrategicPlans() {
    const container = document.getElementById('strategicPlansContainer');
    if (!container) return;
    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading strategic plans...</div></div>`;

    try {
        let plans = [];
        if (typeof API.getStrategicPlans === 'function') {
            plans = await API.getStrategicPlans().catch(() => []);
        } else {
            plans = JSON.parse(localStorage.getItem(SP_STORAGE_KEY) || '[]');
        }
        if (!Array.isArray(plans)) plans = [];
        strategicPlansCache = plans.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        renderStrategicStats();
        renderStrategicPlans();
        renderStrategicRoadmap();
        renderStrategicAnalytics();
    } catch (err) {
        console.error('loadStrategicPlans:', err);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}

// ================================================================
// STATS
// ================================================================
function renderStrategicStats() {
    const plans = strategicPlansCache;
    const pending = plans.filter(p => p.status === 'Pending CEO').length;
    const approved = plans.filter(p => p.status === 'Approved by CEO').length;
    setElText('spStatTotal', plans.length);
    setElText('spStatProgress', pending);
    setElText('spStatCompleted', approved);
    const health = plans.length > 0 ? Math.round(approved / plans.length * 100) : 0;
    const healthEl = document.getElementById('spStatHealth');
    if (healthEl) healthEl.textContent = plans.length === 0 ? '—' : health + '%';
}

// ================================================================
// VIEW / FILTER
// ================================================================
function switchSPView(view) {
    currentSPView = view;
    document.querySelectorAll('.sp-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.spview === view));
    document.querySelectorAll('.sp-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('spView-' + view);
    if (target) target.classList.add('active');
}
function filterStrategicPlans(filter) {
    currentSPFilter = filter;
    document.querySelectorAll('.sp-filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
    renderStrategicPlans();
}

// ================================================================
// LIST RENDER
// ================================================================
function renderStrategicPlans() {
    const container = document.getElementById('strategicPlansContainer');
    if (!container) return;
    const search = (document.getElementById('spSearchInput')?.value || '').toLowerCase().trim();

    let list = strategicPlansCache;
    if (currentSPFilter !== 'all') list = list.filter(p => String(p.year) === currentSPFilter);
    if (search) list = list.filter(p =>
        (p.title || '').toLowerCase().includes(search) ||
        (p.summary || '').toLowerCase().includes(search) ||
        (p.department || '').toLowerCase().includes(search)
    );

    if (list.length === 0) {
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">🧭</div><div class="mes-title">No Strategic Plans ${currentSPFilter !== 'all' ? 'for ' + currentSPFilter : 'Yet'}</div><div class="mes-desc">Click <strong>📎 Upload Strategic Plan</strong> to add the first document.</div></div>`;
        return;
    }

    const ceo = isCEO();
    const manager = isManagerRole();

    container.innerHTML = list.map(p => {
        const s = getSPStatusInfo(p.status);
        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const fileType = (p.fileName || '').split('.').pop().toLowerCase();
        const fileBadge = ['pdf','docx','xlsx','pptx'].includes(fileType) ? fileType : 'other';
        const sizeStr = p.fileSize ? (p.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '';

        let actions = `
            <button class="mrc-btn primary" onclick="viewStrategicPlan('${p.id}')">👁️ View</button>
            <button class="mrc-btn" style="background:rgba(15,31,61,0.08);color:#0f1f3d;" onclick="downloadPlanFile('${p.id}')">⬇️ Download</button>
        `;

        if (manager) {
            if (p.status === 'Draft' || p.status === 'Revision Requested') {
                actions += `<button class="mrc-btn gold" onclick="submitPlanToCEO('${p.id}')">📤 Submit to CEO</button>`;
            }
            if (p.status === 'Draft' || p.status === 'Revision Requested' || p.status === 'Rejected by CEO') {
                actions += `<button class="mrc-btn danger" onclick="deleteStrategicPlan('${p.id}')">🗑️ Delete</button>`;
            }
        }

        if (ceo && p.status === 'Pending CEO') {
            actions += `<button class="mrc-btn gold" onclick="openCEOReviewModal('${p.id}')">🧑‍⚖️ Review</button>`;
        }

        return `
            <div class="sp-plan-card ${s.cardClass}">
                <div class="mrc-header">
                    <div class="mrc-title-wrap">
                        <div class="mrc-id-row">
                            <span class="mrc-id">STR-${p.year}</span>
                            <span class="sp-file-badge ${fileBadge}">📄 ${fileType.toUpperCase()}</span>
                            <span class="mrc-badge ${s.badgeClass}">${s.icon} ${s.label}</span>
                        </div>
                        <div class="mrc-title">${esc(p.title || 'Untitled')}</div>
                        ${p.summary ? `<div style="font-size:13px;color:#64748b;line-height:1.55;margin-bottom:10px;">${esc(p.summary).slice(0, 200)}${p.summary.length > 200 ? '…' : ''}</div>` : ''}
                        <div class="mrc-meta">
                            <span>📅 <strong>${createdDate}</strong></span>
                            <span>🏢 <strong>${esc(p.department || '—')}</strong></span>
                            <span>👤 <strong>${esc(p.managerName || p.createdBy || '—')}</strong></span>
                            ${sizeStr ? `<span>💾 <strong>${sizeStr}</strong></span>` : ''}
                        </div>
                        ${p.ceoApprovedBy ? `<div style="margin-top:10px;font-size:11px;color:#16a34a;font-weight:800;">✅ Approved by ${esc(p.ceoApprovedBy)} • ${new Date(p.ceoApprovedAt).toLocaleDateString('en-GB')}</div>` : ''}
                        ${p.ceoRejectedBy ? `<div style="margin-top:10px;font-size:11px;color:#dc2626;font-weight:800;">❌ Rejected by ${esc(p.ceoRejectedBy)} — ${esc(p.ceoRejectionReason || '')}</div>` : ''}
                        ${p.ceoRemarks && p.status === 'Approved by CEO' ? `<div style="margin-top:8px;font-size:11.5px;color:#0f1f3d;background:rgba(245,158,11,0.06);padding:8px 12px;border-radius:6px;border-left:3px solid #f59e0b;">💬 <strong>CEO Remarks:</strong> ${esc(p.ceoRemarks)}</div>` : ''}
                    </div>
                    <div class="mrc-amount-wrap">
                        <div class="mrc-amount" style="font-size:22px;">${esc(String(p.year))}</div>
                        <div class="mrc-amount-label">Plan Year</div>
                    </div>
                </div>
                <div class="mrc-actions" style="flex-wrap:wrap;">${actions}</div>
            </div>`;
    }).join('');
}

// ================================================================
// ROADMAP + ANALYTICS
// ================================================================
function renderStrategicRoadmap() {
    const container = document.getElementById('spRoadmapContainer');
    if (!container) return;
    const years = [2026, 2027, 2028, 2029, 2030];
    const plans = strategicPlansCache;
    if (plans.length === 0) {
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">🗺️</div><div class="mes-title">No Plans on the Roadmap Yet</div></div>`;
        return;
    }
    const rows = plans.map(p => {
        const s = getSPStatusInfo(p.status);
        const cells = years.map(y => String(p.year) === String(y)
            ? `<div class="sp-roadmap-cell"><div class="sp-roadmap-bar ${s.roadmapClass}">${esc(s.icon)} ${esc(String(p.year))}</div></div>`
            : `<div class="sp-roadmap-cell"></div>`).join('');
        return `<div class="sp-roadmap-row" onclick="viewStrategicPlan('${p.id}')"><div><div class="sp-roadmap-label-title">${esc((p.title || 'Untitled').slice(0, 55))}</div><div class="sp-roadmap-label-meta">${esc(p.department || '—')} • ${s.icon} ${s.label}</div></div>${cells}</div>`;
    }).join('');
    container.innerHTML = `<div class="sp-roadmap-wrap"><div class="sp-roadmap-header"><div>Plan / Document</div>${years.map(y => `<div class="sp-rh-year">${y}</div>`).join('')}</div><div class="sp-roadmap-body">${rows}</div></div>`;
}

function renderStrategicAnalytics() {
    const container = document.getElementById('spAnalyticsContainer');
    if (!container) return;
    const plans = strategicPlansCache;
    if (plans.length === 0) {
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">📊</div><div class="mes-title">No Data Yet</div></div>`;
        return;
    }
    const approved = plans.filter(p => p.status === 'Approved by CEO').length;
    const pending = plans.filter(p => p.status === 'Pending CEO').length;
    const rejected = plans.filter(p => p.status === 'Rejected by CEO').length;
    const totalSize = plans.reduce((s, p) => s + (p.fileSize || 0), 0);

    const yearDist = { 2026:0, 2027:0, 2028:0, 2029:0, 2030:0 };
    plans.forEach(p => { if (yearDist[p.year] !== undefined) yearDist[p.year]++; });
    const maxYear = Math.max(...Object.values(yearDist), 1);

    container.innerHTML = `
        <div class="sp-analytics-grid">
            <div class="sp-analytics-card">
                <h4>🧑‍⚖️ CEO Approval Pipeline</h4>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Approved</span><span class="sp-stat-row-value" style="color:#16a34a;">${approved}</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Pending Review</span><span class="sp-stat-row-value" style="color:#d97706;">${pending}</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Rejected</span><span class="sp-stat-row-value" style="color:#dc2626;">${rejected}</span></div>
                <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${plans.length ? (approved / plans.length * 100) : 0}%;"></div></div>
            </div>

            <div class="sp-analytics-card">
                <h4>📁 Document Statistics</h4>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Total Documents</span><span class="sp-stat-row-value">${plans.length}</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Total Storage</span><span class="sp-stat-row-value">${(totalSize / 1024 / 1024).toFixed(2)} MB</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Avg File Size</span><span class="sp-stat-row-value">${plans.length ? (totalSize / plans.length / 1024 / 1024).toFixed(2) : 0} MB</span></div>
            </div>

            <div class="sp-analytics-card" style="grid-column: span 2;">
                <h4>📅 Distribution by Year</h4>
                ${[2026,2027,2028,2029,2030].map(y => `
                    <div class="sp-stat-row" style="flex-direction:column;align-items:stretch;gap:6px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span class="sp-stat-row-label">${y}</span>
                            <span class="sp-stat-row-value">${yearDist[y]} plan${yearDist[y] === 1 ? '' : 's'}</span>
                        </div>
                        <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${(yearDist[y] / maxYear) * 100}%;"></div></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ================================================================
// UPLOAD MODAL
// ================================================================
function openUploadPlanModal() {
    if (!isManagerRole() && !isCEO()) {
        modernToast('Access denied', 'Only Manager or CEO can upload plans', 'error');
        return;
    }
    spUploadFile = null;
    spUploadFileData = null;

    let modal = document.getElementById('spUploadModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="spUploadModal">
                <div class="modal-box" style="max-width:720px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                    <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b);padding:24px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:48px;height:48px;border-radius:12px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;">📎</div>
                            <div>
                                <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">Upload Strategic Plan</h3>
                                <div style="font-size:12px;color:rgba(255,255,255,0.7);">Attach the document you prepared</div>
                            </div>
                        </div>
                        <button onclick="closeModal('spUploadModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>

                    <div style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                        <!-- FILE UPLOAD ZONE -->
                        <div class="sp-upload-zone" id="spUploadZone" onclick="document.getElementById('spFileInput').click()" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
                            <span class="uz-icon">📤</span>
                            <div class="uz-title">Click to upload or drag & drop</div>
                            <div class="uz-sub">Attach your Strategic Plan document</div>
                            <div class="uz-types">PDF • DOCX • XLSX • PPTX — Max 10MB</div>
                        </div>
                        <input type="file" id="spFileInput" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt" onchange="handleFileSelect(event)" style="display:none;">
                        <div id="spFilePreviewContainer"></div>

                        <!-- METADATA -->
                        <div style="margin-top:22px;">
                            <div style="font-size:11px;font-weight:900;color:#0f1f3d;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📝 Document Details</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                <div style="grid-column:1/-1;">
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Plan Title <span style="color:#dc2626;">*</span></label>
                                    <input type="text" id="spUploadTitle" placeholder="e.g. Market Expansion 2026–2030" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;font-weight:600;">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Year <span style="color:#dc2626;">*</span></label>
                                    <select id="spUploadYear" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;background:white;">
                                        ${[2026,2027,2028,2029,2030].map(y => `<option value="${y}">${y}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Department</label>
                                    <input type="text" id="spUploadDepartment" value="${esc(currentUser?.department || '')}" placeholder="e.g. Operations" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;">
                                </div>
                                <div style="grid-column:1/-1;">
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Executive Summary <span style="color:#dc2626;">*</span></label>
                                    <textarea id="spUploadSummary" placeholder="One paragraph summary — what this plan is about and why it matters." style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;min-height:90px;resize:vertical;line-height:1.6;"></textarea>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top:18px;padding:14px 18px;background:rgba(245,158,11,0.06);border-left:3px solid #f59e0b;border-radius:8px;font-size:12px;color:#78350f;line-height:1.6;">
                            ℹ️ The file will be saved as a <strong>Draft</strong>. You can then click <strong>📤 Submit to CEO</strong> from the list when ready.
                        </div>
                    </div>

                    <div style="padding:16px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                        <button onclick="closeModal('spUploadModal')" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                        <button onclick="saveUploadedPlan()" style="padding:11px 28px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;box-shadow:0 4px 12px rgba(15,31,61,0.3);">💾 Save Plan</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('spUploadModal');
    }
    modal.classList.add('show');
}

function handleDragOver(e) { e.preventDefault(); document.getElementById('spUploadZone')?.classList.add('dragover'); }
function handleDragLeave(e) { document.getElementById('spUploadZone')?.classList.remove('dragover'); }
function handleDrop(e) {
    e.preventDefault();
    document.getElementById('spUploadZone')?.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) processFileSelection(file);
}
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFileSelection(file);
}

function processFileSelection(file) {
    const validExt = ['pdf','docx','doc','xlsx','xls','pptx','ppt'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExt.includes(ext)) { modernToast('Invalid file type', 'Please upload PDF, DOCX, XLSX, or PPTX', 'error'); return; }
    if (file.size > SP_MAX_SIZE) { modernToast('File too large', 'Maximum file size is 10MB', 'error'); return; }

    spUploadFile = file;
    const reader = new FileReader();
    reader.onload = function(evt) {
        spUploadFileData = evt.target.result;
        const container = document.getElementById('spFilePreviewContainer');
        const icons = { pdf:'📄', docx:'📝', doc:'📝', xlsx:'📊', xls:'📊', pptx:'📽️', ppt:'📽️' };
        container.innerHTML = `
            <div class="sp-file-preview">
                <div class="fp-icon">${icons[ext] || '📎'}</div>
                <div class="fp-info">
                    <div class="fp-name">${esc(file.name)}</div>
                    <div class="fp-size">${(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload</div>
                </div>
                <button class="fp-remove" onclick="removeSelectedFile()" title="Remove">✕</button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function removeSelectedFile() {
    spUploadFile = null;
    spUploadFileData = null;
    document.getElementById('spFilePreviewContainer').innerHTML = '';
    document.getElementById('spFileInput').value = '';
}

async function saveUploadedPlan() {
    if (!spUploadFile || !spUploadFileData) { modernToast('File required', 'Please attach a document', 'error'); return; }
    const title = document.getElementById('spUploadTitle')?.value.trim();
    const year = document.getElementById('spUploadYear')?.value;
    const department = document.getElementById('spUploadDepartment')?.value.trim();
    const summary = document.getElementById('spUploadSummary')?.value.trim();
    if (!title) { modernToast('Title required', 'Please enter a plan title', 'error'); return; }
    if (!summary) { modernToast('Summary required', 'Please write a brief summary', 'error'); return; }

    const payload = {
        strategicId: 'SP-' + Date.now(),
        title, year: String(year), department, summary,
        fileName: spUploadFile.name,
        fileType: spUploadFile.type,
        fileSize: spUploadFile.size,
        fileData: spUploadFileData,
        status: 'Draft',
        managerName: currentUser?.fullName || 'Manager',
        managerId: currentUser?.id || '',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.fullName || 'Manager'
    };

    try {
        // ✅ Tumia API kwanza
        if (typeof API.createStrategicPlan === 'function') {
            await API.createStrategicPlan(payload);
        } else {
            // Fallback kama API haipo (development only)
            const list = JSON.parse(localStorage.getItem(SP_STORAGE_KEY) || '[]');
            list.push(payload);
            localStorage.setItem(SP_STORAGE_KEY, JSON.stringify(list));
        }
        closeModal('spUploadModal');
        modernToast('✅ Uploaded', 'Strategic plan saved as Draft.', 'success');
        await loadStrategicPlans();
    } catch (err) {
        modernToast('Upload failed', err.message, 'error');
    }
}

// ================================================================
// SUBMIT TO CEO
// ================================================================
async function submitPlanToCEO(id) {
    const p = strategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;
    if (!isManagerRole() && !isCEO()) { modernToast('Access denied', 'Only Manager can submit', 'error'); return; }

    const res = await modernConfirm({
        title: '📤 Submit to CEO?',
        message: `Submit "${p.title}" to the CEO for approval? You won't be able to edit until CEO responds.`,
        detail: { label: 'Plan', value: `${p.title} — ${p.year}` },
        type: 'primary',
        okText: '📤 Submit to CEO',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;
    
    try {
        await API.submitStrategicPlanToCeo(p.id);
        modernToast('📤 Submitted', 'Plan sent to CEO for approval.', 'success');
        await loadStrategicPlans();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

// ================================================================
// CEO REVIEW
// ================================================================
function openCEOReviewModal(id) {
    if (!isCEO()) { modernToast('Access denied', 'Only CEO can review', 'error'); return; }
    const p = strategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;

    let modal = document.getElementById('ceoReviewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="ceoReviewModal">
                <div class="modal-box" style="max-width:820px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                    <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#92400e);padding:24px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <img src="${SP_LOGO_URL}" onerror="this.src='${SP_LOGO_FALLBACK}'" style="width:48px;height:48px;border-radius:50%;border:2px solid #f59e0b;background:white;padding:3px;object-fit:contain;" alt="MAK DC">
                            <div>
                                <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">CEO Review</h3>
                                <div style="font-size:11px;color:rgba(255,255,255,0.7);">Strategic Plan Approval</div>
                            </div>
                        </div>
                        <button onclick="closeModal('ceoReviewModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="ceoReviewBody" style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;"></div>
                    <div id="ceoReviewFooter" style="padding:16px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;flex-wrap:wrap;"></div>
                </div>
            </div>
        `);
        modal = document.getElementById('ceoReviewModal');
    }

    const submittedAt = p.submittedToCeoAt ? new Date(p.submittedToCeoAt).toLocaleString('en-GB') : '—';
    const fileType = (p.fileName || '').split('.').pop().toLowerCase();

    document.getElementById('ceoReviewBody').innerHTML = `
        <div style="background:rgba(245,158,11,0.08);border-left:4px solid #f59e0b;border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;gap:14px;">
            <div style="font-size:26px;">🧑‍⚖️</div>
            <div>
                <div style="font-size:13px;font-weight:900;color:#78350f;margin-bottom:3px;">Awaiting Your Review</div>
                <div style="font-size:12px;color:#92400e;line-height:1.6;">Submitted by <strong>${esc(p.managerName || p.createdBy)}</strong> on <strong>${esc(submittedAt)}</strong>. Review the attached document and approve, reject, or request revision.</div>
            </div>
        </div>

        <div style="background:white;border-radius:10px;padding:20px 22px;border:1.5px solid #e5e7eb;margin-bottom:14px;">
            <div style="font-size:10px;font-weight:900;color:#f59e0b;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">STR-${esc(p.year)} • Strategic Plan</div>
            <div style="font-size:20px;font-weight:900;color:#0f1f3d;line-height:1.2;margin-bottom:8px;">${esc(p.title)}</div>
            <div style="font-size:12px;color:#64748b;">${esc(p.department || '—')} • Year ${esc(p.year)}</div>
            <div style="margin-top:14px;padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #0f1f3d;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📝 Executive Summary</div>
                <div style="font-size:13px;color:#334155;line-height:1.6;">${esc(p.summary || '—')}</div>
            </div>
        </div>

        <div style="background:white;border-radius:10px;padding:16px 20px;border:1.5px solid #e5e7eb;margin-bottom:14px;">
            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📎 Attached Document</div>
            <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                <div style="font-size:32px;">📄</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:800;color:#0f1f3d;word-break:break-all;">${esc(p.fileName || 'document')}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:3px;">${fileType.toUpperCase()} • ${p.fileSize ? (p.fileSize/1024/1024).toFixed(2) + ' MB' : '—'}</div>
                </div>
                <button onclick="previewPlanDocument('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">👁 Preview</button>
                <button onclick="downloadPlanFile('${p.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1px solid rgba(15,31,61,0.2);border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">⬇️ Download</button>
            </div>
        </div>

        <div style="background:white;border-radius:10px;padding:16px 20px;border:1.5px solid #e5e7eb;">
            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">💬 CEO Remarks (optional on approve)</div>
            <textarea id="ceoRemarksInput" placeholder="Add any remarks, guidance, or approval notes..." style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:13px;font-family:inherit;min-height:80px;resize:vertical;line-height:1.6;"></textarea>
        </div>
    `;

    document.getElementById('ceoReviewFooter').innerHTML = `
        <button onclick="closeModal('ceoReviewModal')" style="padding:11px 22px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
        <button onclick="closeModal('ceoReviewModal'); requestRevision('${p.id}')" style="padding:11px 22px;background:rgba(37,99,235,0.1);color:#2563eb;border:1.5px solid rgba(37,99,235,0.25);border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;">🔄 Request Revision</button>
    `;

    modal.classList.add('show');
}
async function requestRevision(id) {
    if (!isCEO()) return;
    const p = strategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;

    const r = await modernConfirm({
        title: '🔄 Request Revision?',
        message: 'Provide revision notes. Manager will update the document and resubmit.',
        type: 'warning', okText: '🔄 Send Revision Request', cancelText: 'Cancel',
        needsReason: true, reasonLabel: 'Revision Notes'
    });
    if (!r.confirmed) return;

    try {
        const updated = {
            ...p,
            status: 'Revision Requested',
            revisionNotes: r.reason,
            revisionRequestedAt: new Date().toISOString(),
            revisionRequestedBy: currentUser?.fullName || 'CEO',
            updatedAt: new Date().toISOString()
        };
        if (typeof API.updateStrategicPlan === 'function') await API.updateStrategicPlan(p.id, updated);
        else {
            const list = JSON.parse(localStorage.getItem(SP_STORAGE_KEY) || '[]');
            const idx = list.findIndex(x => String(x.id) === String(p.id));
            if (idx >= 0) list[idx] = updated;
            localStorage.setItem(SP_STORAGE_KEY, JSON.stringify(list));
        }
        modernToast('🔄 Sent', 'Manager will be notified with revision notes.', 'info');
        await loadStrategicPlans();
    } catch (err) { modernToast('Failed', err.message, 'error'); }
}

// ================================================================
// VIEW / DOWNLOAD / PREVIEW / DELETE
// ================================================================
function viewStrategicPlan(id) {
    const p = strategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) { modernToast('Not Found', 'Plan not found', 'error'); return; }

    const s = getSPStatusInfo(p.status);
    const fileType = (p.fileName || '').split('.').pop().toLowerCase();

    let modal = document.getElementById('strategicViewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="strategicViewModal">
                <div class="modal-box" style="max-width:760px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                    <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b);padding:24px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <img src="${SP_LOGO_URL}" onerror="this.src='${SP_LOGO_FALLBACK}'" style="width:44px;height:44px;border-radius:50%;border:2px solid #f59e0b;background:white;padding:2px;object-fit:contain;" alt="MAK DC">
                            <div>
                                <h3 id="spViewTitle" style="font-size:18px;font-weight:900;color:white;margin:0;">Strategic Plan</h3>
                                <div id="spViewSubtitle" style="font-size:12px;color:rgba(255,255,255,0.7);"></div>
                            </div>
                        </div>
                        <button onclick="closeModal('strategicViewModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="strategicViewBody" style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;"></div>
                    <div id="strategicViewFooter" style="padding:14px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;flex-wrap:wrap;"></div>
                </div>
            </div>`);
        modal = document.getElementById('strategicViewModal');
    }

    document.getElementById('spViewTitle').textContent = p.title;
    document.getElementById('spViewSubtitle').textContent = `Year ${p.year} • ${p.status} • ${p.department || '—'}`;

    document.getElementById('strategicViewBody').innerHTML = `
        <div style="background:${s.color}10;border-left:4px solid ${s.color};padding:16px 20px;border-radius:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-size:10px;font-weight:800;color:${s.color};text-transform:uppercase;letter-spacing:1px;">Status</div>
                <div style="font-size:15px;font-weight:900;color:${s.color};">${s.icon} ${s.label}</div>
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
            <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                <div style="font-size:32px;">📄</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:800;color:#0f1f3d;word-break:break-all;">${esc(p.fileName || 'document')}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:3px;">${fileType.toUpperCase()} • ${p.fileSize ? (p.fileSize/1024/1024).toFixed(2) + ' MB' : '—'}</div>
                </div>
                <button onclick="previewPlanDocument('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">👁 Preview</button>
                <button onclick="downloadPlanFile('${p.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1px solid rgba(15,31,61,0.2);border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">⬇️ Download</button>
            </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
            <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">👤 Prepared By</div>
                <div style="font-size:13px;font-weight:700;color:#1e293b;">${esc(p.managerName || p.createdBy || '—')}</div>
            </div>
            <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📅 Uploaded</div>
                <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'}</div>
            </div>
        </div>

        ${p.ceoApprovedBy ? `<div style="background:rgba(22,163,74,0.05);border-left:4px solid #16a34a;border-radius:10px;padding:16px 20px;margin-bottom:12px;"><div style="font-size:10px;font-weight:900;color:#16a34a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">✅ Approved by CEO</div><div style="font-size:12px;color:#14532d;line-height:1.6;"><strong>${esc(p.ceoApprovedBy)}</strong> • ${new Date(p.ceoApprovedAt).toLocaleString('en-GB')}${p.ceoRemarks ? `<br><br><em>Remarks:</em> ${esc(p.ceoRemarks)}` : ''}</div></div>` : ''}
        ${p.ceoRejectedBy ? `<div style="background:rgba(220,38,38,0.05);border-left:4px solid #dc2626;border-radius:10px;padding:16px 20px;margin-bottom:12px;"><div style="font-size:10px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">❌ Rejected by CEO</div><div style="font-size:12px;color:#7f1d1d;line-height:1.6;"><strong>${esc(p.ceoRejectedBy)}</strong> • ${new Date(p.ceoRejectedAt).toLocaleString('en-GB')}<br><br><em>Reason:</em> ${esc(p.ceoRejectionReason || '—')}</div></div>` : ''}
        ${p.revisionNotes ? `<div style="background:rgba(37,99,235,0.05);border-left:4px solid #2563eb;border-radius:10px;padding:16px 20px;margin-bottom:12px;"><div style="font-size:10px;font-weight:900;color:#2563eb;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">🔄 Revision Requested</div><div style="font-size:12px;color:#1e3a8a;line-height:1.6;"><strong>${esc(p.revisionRequestedBy)}</strong> • ${new Date(p.revisionRequestedAt).toLocaleString('en-GB')}<br><br><em>Notes:</em> ${esc(p.revisionNotes)}</div></div>` : ''}
    `;

    const footer = document.getElementById('strategicViewFooter');
    let footerHtml = `<button onclick="closeModal('strategicViewModal')" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>`;
    if (isManagerRole() && (p.status === 'Draft' || p.status === 'Revision Requested' || p.status === 'Rejected by CEO')) {
        footerHtml += `<button onclick="closeModal('strategicViewModal'); submitPlanToCEO('${p.id}')" style="padding:11px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;">📤 Submit to CEO</button>`;
    }
    if (isCEO() && p.status === 'Pending CEO') {
        footerHtml += `<button onclick="closeModal('strategicViewModal'); openCEOReviewModal('${p.id}')" style="padding:11px 24px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;">🧑‍⚖️ CEO Review</button>`;
    }
    footer.innerHTML = footerHtml;
    modal.classList.add('show');
}

function downloadPlanFile(id) {
    const p = strategicPlansCache.find(x => String(x.id) === String(id));
    if (!p || !p.fileData) { modernToast('Not Found', 'File data missing', 'error'); return; }
    const a = document.createElement('a');
    a.href = p.fileData;
    a.download = p.fileName || 'strategic-plan';
    document.body.appendChild(a);
    a.click();
    a.remove();
    modernToast('⬇️ Download', 'File downloaded.', 'success');
}
async function deleteStrategicPlan(id) {
    const p = strategicPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;
    const r = await modernConfirm({
        title: '🗑️ Delete Plan?',
        message: `Delete "${p.title}"? This cannot be undone.`,
        type: 'danger', okText: '🗑️ Delete', cancelText: 'Cancel'
    });
    if (!r.confirmed) return;
    try {
        if (typeof API.deleteStrategicPlan === 'function') await API.deleteStrategicPlan(id);
        else {
            let list = JSON.parse(localStorage.getItem(SP_STORAGE_KEY) || '[]');
            list = list.filter(x => String(x.id) !== String(id));
            localStorage.setItem(SP_STORAGE_KEY, JSON.stringify(list));
        }
        modernToast('🗑️ Deleted', 'Plan removed.', 'warning');
        await loadStrategicPlans();
    } catch (err) { modernToast('Failed', err.message, 'error'); }
}

// ================================================================
// PLAN BOOK ARCHIVE (simple listing — no form data, just approved docs)
// ================================================================
function openStrategicPlanBook() {
    const approved = strategicPlansCache.filter(p => p.status === 'Approved by CEO');
    if (approved.length === 0) {
        modernToast('No Approved Plans', 'Approved plans will appear in the Plan Book.', 'warning');
        return;
    }
    const sorted = [...approved].sort((a, b) => String(a.year).localeCompare(String(b.year)));

    let modal = document.getElementById('strategicBookModal');
    if (modal) modal.remove();
    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="strategicBookModal">
            <div class="modal-box" style="max-width:920px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b);padding:20px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <img src="${SP_LOGO_URL}" onerror="this.src='${SP_LOGO_FALLBACK}'" style="width:44px;height:44px;border-radius:50%;border:2px solid #f59e0b;background:white;padding:2px;object-fit:contain;" alt="MAK DC">
                        <div>
                            <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">Strategic Plan Book Archive</h3>
                            <div style="font-size:11px;color:rgba(255,255,255,0.7);">${approved.length} approved plan${approved.length > 1 ? 's' : ''} • Official Company Compass</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('strategicBookModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                </div>
                <div style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                    <div style="background:linear-gradient(155deg,#0a1628 0%,#0f1f3d 45%,#1a3a6b 100%);border-radius:14px;padding:40px 30px;text-align:center;margin-bottom:22px;position:relative;overflow:hidden;">
                        <div style="position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,rgba(245,158,11,0.25) 0%,transparent 70%);border-radius:50%;"></div>
                        <div style="position:relative;z-index:1;">
                            <img src="${SP_LOGO_URL}" onerror="this.src='${SP_LOGO_FALLBACK}'" style="width:96px;height:96px;border-radius:50%;border:4px solid #f59e0b;background:white;padding:5px;object-fit:contain;margin:0 auto 18px;display:block;" alt="MAK DC">
                            <div style="font-size:11px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:4px;margin-bottom:10px;">MAK DC Investment Company LTD</div>
                            <h2 style="font-size:32px;font-weight:900;color:white;margin:0 0 8px;line-height:1.1;">Strategic Plan Book</h2>
                            <div style="font-size:13px;color:rgba(255,255,255,0.7);font-style:italic;margin-bottom:20px;">"Quality service is our priority."</div>
                            <div style="border-top:2px solid #f59e0b;border-bottom:2px solid #f59e0b;padding:14px 30px;display:inline-block;">
                                <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Approved Roadmap</div>
                                <div style="font-size:24px;font-weight:900;color:#fbbf24;margin-top:4px;">${sorted[0]?.year} — ${sorted[sorted.length-1]?.year}</div>
                            </div>
                        </div>
                    </div>

                    <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📚 Approved Chapters</div>
                    ${sorted.map((p, i) => `
                        <div style="background:white;border-radius:12px;padding:18px 22px;border:1.5px solid #e5e7eb;margin-bottom:12px;border-left:4px solid #16a34a;">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
                                <div style="flex:1;min-width:200px;">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                                        <span style="font-family:'Courier New',monospace;font-weight:900;color:#f59e0b;font-size:14px;">${String(i+1).padStart(2,'0')}</span>
                                        <span style="font-size:11px;font-weight:800;color:#16a34a;background:rgba(22,163,74,0.1);padding:3px 8px;border-radius:6px;">✅ Approved</span>
                                        <span style="font-size:11px;color:#94a3b8;">Year ${esc(p.year)}</span>
                                    </div>
                                    <div style="font-size:15px;font-weight:800;color:#0f1f3d;margin-bottom:4px;">${esc(p.title)}</div>
                                    <div style="font-size:11.5px;color:#64748b;">👤 ${esc(p.ceoApprovedBy)} • ${new Date(p.ceoApprovedAt).toLocaleDateString('en-GB')}</div>
                                </div>
                                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                    <button onclick="downloadPlanFile('${p.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1px solid rgba(15,31,61,0.2);border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">⬇️ Download</button>
                                    <button onclick="viewStrategicPlan('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">👁 View</button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `);
    modal = document.getElementById('strategicBookModal');
    modal.classList.add('show');
}

// ================================================================
// HOOK INTO switchTab
// ================================================================
(function hookSP() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__spHooked) return;
    const wrapped = function(tabId) {
        const result = _orig.call(this, tabId);
        if (tabId === 'tab3') loadStrategicPlans();
        return result;
    };
    wrapped.__spHooked = true;
    window.switchTab = wrapped;
})();
// ================================================================
// 📄 DOCUMENT PREVIEW — v5.0 (Direct New Tab Strategy)
// ================================================================

function previewPlanDocument(id) {
    const p = strategicPlansCache.find(x => String(x.id) === String(id));
    if (!p || !p.fileData) {
        modernToast('Not Found', 'File data missing', 'error');
        return;
    }

    const fileType = (p.fileName || '').split('.').pop().toLowerCase();
    const isPDF = fileType === 'pdf';
    const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(fileType);

    // === IMAGE PREVIEW (Inaonekana vizuri kwenye modal) ===
    if (isImage) {
        showImagePreviewModal(p);
        return;
    }

    // === PDF PREVIEW (Inafungua Tab Mpya) ===
    if (isPDF) {
        try {
            // 1. Badilisha base64 kuwa Blob
            const parts = p.fileData.split(',');
            const b64 = parts[1];
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            
            const blob = new Blob([arr], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(blob);

            // 2. Fungua kwenye Tab Mpya
            const newWindow = window.open(blobUrl, '_blank');
            
            // 3. Kama browser imezuia (Popup blocker), mpe mtumiaji option ya kupakua
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                modernToast('Popup Blocked', 'Browser imezuia kufungua tab mpya. Tafadhali ruhusu popups au download faili.', 'warning');
                setTimeout(() => downloadPlanFile(id), 1000);
            }
        } catch (err) {
            console.error('PDF Preview Error:', err);
            modernToast('Preview Failed', 'Imeshindwa kuonyesha PDF. Inapakuliwa badala yake...', 'error');
            setTimeout(() => downloadPlanFile(id), 1000);
        }
        return;
    }

    // === OTHER FILES (Word/Excel/PPT) → Download Prompt ===
    const ok = window.confirm(
        `📄 "${p.fileName}"\n\nFaili hii (${fileType.toUpperCase()}) haiwezi kuonyeshwa moja kwa moja kwenye browser.\n\nBonyeza OK kuipakua.`
    );
    if (ok) downloadPlanFile(id);
}

// ================================================================
// IMAGE PREVIEW MODAL (Bado inatumia modal kwa picha)
// ================================================================
function showImagePreviewModal(p) {
    const existing = document.getElementById('spImagePreviewModal');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay" id="spImagePreviewModal">
            <div class="modal-box" style="max-width:92vw;width:1000px;height:92vh;padding:0;overflow:hidden;display:flex;flex-direction:column;border-radius:16px;">
                <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b);padding:14px 20px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;gap:12px;">
                    <div style="font-size:13.5px;font-weight:800;display:flex;align-items:center;gap:10px;min-width:0;overflow:hidden;flex:1;">
                        <span style="flex-shrink:0;font-size:18px;">🖼️</span>
                        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.fileName)}</span>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;">
                        <button onclick="downloadPlanFile('${p.id}')" style="background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:white;padding:7px 14px;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">⬇️ Download</button>
                        <button onclick="document.getElementById('spImagePreviewModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;">✕</button>
                    </div>
                </div>
                <div style="flex:1;background:#1a1a1a;overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px;">
                    <img src="${p.fileData}" alt="${esc(p.fileName)}" style="max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 8px 32px rgba(0,0,0,0.6);border-radius:4px;">
                </div>
            </div>
        </div>
    `);
}
// ================================================================
// 💼 BUSINESS PLANS MODULE — v1.0
// Document-first workflow: Draft → CEO → Approved
// ================================================================

const BP_LOGO_URL = 'assets/makdc-logo.jpg';
const BP_LOGO_FALLBACK = 'https://via.placeholder.com/120x120/0f1f3d/ffffff?text=MAK';
const BP_MAX_SIZE = 10 * 1024 * 1024; // 10MB

let businessPlansCache = [];
let currentBPFilter = 'all';
let currentBPView = 'list';
let bpUploadFile = null;
let bpUploadFileData = null;

const BP_STATUS = {
    'Draft':              { icon: '📝', label: 'Draft',              color: '#64748b', cardClass: '',              badgeClass: 'navy',  roadmapClass: 'blue'  },
    'Pending CEO':        { icon: '⏳', label: 'Pending CEO',        color: '#d97706', cardClass: 'status-progress', badgeClass: 'gold',  roadmapClass: 'gold'  },
    'Approved':           { icon: '✅', label: 'Approved',           color: '#16a34a', cardClass: 'status-completed',badgeClass: 'green', roadmapClass: 'green' },
    'Active':             { icon: '🟢', label: 'Active',             color: '#15803d', cardClass: 'status-completed',badgeClass: 'green', roadmapClass: 'green' },
    'Rejected':           { icon: '❌', label: 'Rejected',           color: '#dc2626', cardClass: 'status-hold',     badgeClass: 'red',   roadmapClass: 'red'   },
    'Revision Requested': { icon: '🔄', label: 'Revision Requested', color: '#2563eb', cardClass: 'status-progress', badgeClass: 'blue',  roadmapClass: 'blue'  }
};

function getBPStatusInfo(status) {
    return BP_STATUS[status] || BP_STATUS['Draft'];
}
async function loadBusinessPlans() {
    const container = document.getElementById('businessPlansContainer');
    if (!container) return;
    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Fetching plans...</div></div>`;

    try {
        const plans = await API.getBusinessPlans();
        console.log('📥 Plans received from DB:', plans);
        
        // 🆕 Hakikisha ni array na tunaweka fileData kwenye cache (kwa ajili ya View)
        businessPlansCache = Array.isArray(plans) ? plans : [];
        
        renderBPStats();
        renderBusinessPlans();
        renderBPRoadmap();
        renderBPAnalytics();
    } catch (err) {
        console.error('loadBusinessPlans error:', err);
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message || 'Failed to load plans')}</div></div>`;
    }
}
// ================================================================
// STATS
// ================================================================
function renderBPStats() {
    const plans = businessPlansCache;
    const pending = plans.filter(p => p.status === 'Pending CEO').length;
    const approved = plans.filter(p => ['Approved', 'Active'].includes(p.status)).length;
    const totalBudget = plans
        .filter(p => ['Approved', 'Active'].includes(p.status))
        .reduce((sum, p) => sum + Number(p.estimatedBudget || 0), 0);

    setElText('bpStatTotal', plans.length);
    setElText('bpStatPending', pending);
    setElText('bpStatApproved', approved);
    setElText('bpStatBudget', 'TSh ' + totalBudget.toLocaleString());
}

// ================================================================
// VIEW SWITCH
// ================================================================
function switchBPView(view) {
    currentBPView = view;
    document.querySelectorAll('.sp-tab-btn[data-bpview]').forEach(b => {
        b.classList.toggle('active', b.dataset.bpview === view);
    });
    document.querySelectorAll('#tab4 .sp-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('bpView-' + view);
    if (target) target.classList.add('active');
}

function filterBusinessPlans(filter) {
    currentBPFilter = filter;
    document.querySelectorAll('.sp-filter-btn[data-bpfilter]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.bpfilter === filter);
    });
    renderBusinessPlans();
}

// ================================================================
// LIST RENDER
// ================================================================
function renderBusinessPlans() {
    const container = document.getElementById('businessPlansContainer');
    if (!container) return;
    const search = (document.getElementById('bpSearchInput')?.value || '').toLowerCase().trim();

    let list = businessPlansCache;
    if (currentBPFilter !== 'all') list = list.filter(p => p.status === currentBPFilter);
    if (search) list = list.filter(p =>
        (p.title || '').toLowerCase().includes(search) ||
        (p.summary || '').toLowerCase().includes(search) ||
        (p.department || '').toLowerCase().includes(search) ||
        (p.projectType || '').toLowerCase().includes(search)
    );

    if (list.length === 0) {
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">💼</div><div class="mes-title">No Business Plans ${currentBPFilter !== 'all' ? 'for ' + currentBPFilter : 'Yet'}</div><div class="mes-desc">Click <strong>📎 Upload Business Plan</strong> to add the first document.</div></div>`;
        return;
    }

    const manager = isManagerRole();

    container.innerHTML = list.map(p => {
        const s = getBPStatusInfo(p.status);
        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        const fileType = (p.fileName || '').split('.').pop().toLowerCase();
        const fileBadge = ['pdf','docx','xlsx','pptx'].includes(fileType) ? fileType : 'other';
        const sizeStr = p.fileSize ? (p.fileSize / 1024 / 1024).toFixed(2) + ' MB' : '';
        const budgetStr = p.estimatedBudget ? 'TSh ' + Number(p.estimatedBudget).toLocaleString() : '—';
        const roiStr = p.expectedRoi ? Number(p.expectedRoi) + '%' : '—';

        let actions = `
            <button class="mrc-btn primary" onclick="viewBusinessPlan('${p.id}')">👁️ View</button>
        `;
        if (p.fileData || p.fileName) {
            actions += `<button class="mrc-btn" style="background:rgba(15,31,61,0.08);color:#0f1f3d;" onclick="downloadBPFile('${p.id}')">⬇️ Download</button>`;
        }

        if (manager) {
            if (p.status === 'Draft' || p.status === 'Revision Requested') {
                actions += `<button class="mrc-btn gold" onclick="submitBPToCEO('${p.id}')">📤 Submit to CEO</button>`;
            }
            if (['Draft', 'Revision Requested', 'Rejected'].includes(p.status)) {
                actions += `<button class="mrc-btn danger" onclick="deleteBusinessPlan('${p.id}')">🗑️ Delete</button>`;
            }
        }

        return `
            <div class="sp-plan-card ${s.cardClass}">
                <div class="mrc-header">
                    <div class="mrc-title-wrap">
                        <div class="mrc-id-row">
                            <span class="mrc-id">${esc(p.businessPlanId || 'BP-—')}</span>
                            <span class="sp-file-badge ${fileBadge}">📄 ${fileType.toUpperCase() || 'FILE'}</span>
                            <span class="mrc-badge navy">${esc(p.projectType || '—')}</span>
                            <span class="mrc-badge ${s.badgeClass}">${s.icon} ${s.label}</span>
                        </div>
                        <div class="mrc-title">${esc(p.title || 'Untitled')}</div>
                        ${p.summary ? `<div style="font-size:13px;color:#64748b;line-height:1.55;margin-bottom:10px;">${esc(p.summary).slice(0, 200)}${p.summary.length > 200 ? '…' : ''}</div>` : ''}
                        <div class="mrc-meta">
                            <span>📅 <strong>${createdDate}</strong></span>
                            <span>🏢 <strong>${esc(p.department || '—')}</strong></span>
                            <span>👤 <strong>${esc(p.createdBy || '—')}</strong></span>
                            ${sizeStr ? `<span>💾 <strong>${sizeStr}</strong></span>` : ''}
                        </div>
                        <div style="margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#475569;">
                            <span>💰 <strong style="color:#0f1f3d;">${budgetStr}</strong></span>
                            <span>📈 ROI: <strong style="color:#16a34a;">${roiStr}</strong></span>
                            ${p.breakEvenMonths ? `<span>⏱️ Break-even: <strong>${p.breakEvenMonths} months</strong></span>` : ''}
                        </div>
                        ${p.ceoApprovedBy ? `<div style="margin-top:10px;font-size:11px;color:#16a34a;font-weight:800;">✅ Approved by ${esc(p.ceoApprovedBy)} • ${new Date(p.ceoApprovedAt).toLocaleDateString('en-GB')}</div>` : ''}
                        ${p.ceoRejectedBy ? `<div style="margin-top:10px;font-size:11px;color:#dc2626;font-weight:800;">❌ Rejected by ${esc(p.ceoRejectedBy)} — ${esc(p.ceoRejectionReason || '')}</div>` : ''}
                        ${p.revisionNotes ? `<div style="margin-top:8px;font-size:11.5px;color:#2563eb;background:rgba(37,99,235,0.06);padding:8px 12px;border-radius:6px;border-left:3px solid #2563eb;">🔄 <strong>Revision Notes:</strong> ${esc(p.revisionNotes)}</div>` : ''}
                        ${p.ceoRemarks && ['Approved', 'Active'].includes(p.status) ? `<div style="margin-top:8px;font-size:11.5px;color:#0f1f3d;background:rgba(245,158,11,0.06);padding:8px 12px;border-radius:6px;border-left:3px solid #f59e0b;">💬 <strong>CEO Remarks:</strong> ${esc(p.ceoRemarks)}</div>` : ''}
                    </div>
                    <div class="mrc-amount-wrap">
                        <div class="mrc-amount" style="font-size:18px;">${budgetStr}</div>
                        <div class="mrc-amount-label">Est. Budget</div>
                    </div>
                </div>
                <div class="mrc-actions" style="flex-wrap:wrap;">${actions}</div>
            </div>`;
    }).join('');
}

// ================================================================
// ROADMAP
// ================================================================
function renderBPRoadmap() {
    const container = document.getElementById('bpRoadmapContainer');
    if (!container) return;
    const plans = businessPlansCache.filter(p => ['Approved', 'Active', 'Pending CEO'].includes(p.status));

    if (plans.length === 0) {
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">🗺️</div><div class="mes-title">No Active Projects Yet</div><div class="mes-desc">Approved business plans will appear here on the roadmap.</div></div>`;
        return;
    }

    // Kundi kwa mwaka wa kuanza
    const byYear = {};
    plans.forEach(p => {
        const startYear = p.startDate ? new Date(p.startDate).getFullYear() : (p.createdAt ? new Date(p.createdAt).getFullYear() : 'N/A');
        if (!byYear[startYear]) byYear[startYear] = [];
        byYear[startYear].push(p);
    });

    const years = Object.keys(byYear).sort();

    container.innerHTML = `
        <div class="sp-roadmap-wrap">
            <div class="sp-roadmap-header" style="grid-template-columns:280px 1fr;">
                <div>Project</div>
                <div class="sp-rh-year">Timeline</div>
            </div>
            <div class="sp-roadmap-body">
                ${years.map(year => `
                    <div style="font-size:11px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:2px;padding:12px 0;border-bottom:2px solid #f1f5f9;">📅 ${year}</div>
                    ${byYear[year].map(p => {
                        const s = getBPStatusInfo(p.status);
                        const startStr = p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—';
                        const endStr = p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                        return `
                            <div class="sp-roadmap-row" style="grid-template-columns:280px 1fr;cursor:pointer;" onclick="viewBusinessPlan('${p.id}')">
                                <div>
                                    <div class="sp-roadmap-label-title">${esc(p.title)}</div>
                                    <div class="sp-roadmap-label-meta">${esc(p.projectType)} • ${esc(p.department || '—')}</div>
                                </div>
                                <div style="display:flex;align-items:center;gap:12px;padding:0 12px;">
                                    <div class="sp-roadmap-bar ${s.roadmapClass}" style="flex:1;height:32px;">
                                        ${s.icon} ${startStr} → ${endStr}
                                    </div>
                                    <span style="font-weight:800;color:#0f1f3d;font-family:'Courier New',monospace;font-size:13px;white-space:nowrap;">
                                        TSh ${Number(p.estimatedBudget || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                `).join('')}
            </div>
        </div>
    `;
}

// ================================================================
// ANALYTICS
// ================================================================
function renderBPAnalytics() {
    const container = document.getElementById('bpAnalyticsContainer');
    if (!container) return;
    const plans = businessPlansCache;

    if (plans.length === 0) {
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">📊</div><div class="mes-title">No Data Yet</div></div>`;
        return;
    }

    const approved = plans.filter(p => ['Approved', 'Active'].includes(p.status)).length;
    const pending = plans.filter(p => p.status === 'Pending CEO').length;
    const rejected = plans.filter(p => p.status === 'Rejected').length;
    const totalBudget = plans.reduce((s, p) => s + Number(p.estimatedBudget || 0), 0);
    const approvedBudget = plans.filter(p => ['Approved', 'Active'].includes(p.status))
        .reduce((s, p) => s + Number(p.estimatedBudget || 0), 0);

    // Project type distribution
    const typeDist = {};
    plans.forEach(p => {
        const t = p.projectType || 'Other';
        typeDist[t] = (typeDist[t] || 0) + 1;
    });
    const maxType = Math.max(...Object.values(typeDist), 1);

    container.innerHTML = `
        <div class="sp-analytics-grid">
            <div class="sp-analytics-card">
                <h4>🧑‍⚖️ CEO Approval Pipeline</h4>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Approved</span><span class="sp-stat-row-value" style="color:#16a34a;">${approved}</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Pending Review</span><span class="sp-stat-row-value" style="color:#d97706;">${pending}</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Rejected</span><span class="sp-stat-row-value" style="color:#dc2626;">${rejected}</span></div>
                <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${plans.length ? (approved / plans.length * 100) : 0}%;"></div></div>
            </div>

            <div class="sp-analytics-card">
                <h4>💰 Budget Distribution</h4>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Total Budget</span><span class="sp-stat-row-value">TSh ${totalBudget.toLocaleString()}</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Approved Budget</span><span class="sp-stat-row-value" style="color:#16a34a;">TSh ${approvedBudget.toLocaleString()}</span></div>
                <div class="sp-stat-row"><span class="sp-stat-row-label">Avg per Plan</span><span class="sp-stat-row-value">TSh ${plans.length ? Math.round(totalBudget / plans.length).toLocaleString() : 0}</span></div>
            </div>

            <div class="sp-analytics-card" style="grid-column: span 2;">
                <h4>🏗️ Distribution by Project Type</h4>
                ${Object.keys(typeDist).map(t => `
                    <div class="sp-stat-row" style="flex-direction:column;align-items:stretch;gap:6px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span class="sp-stat-row-label">${esc(t)}</span>
                            <span class="sp-stat-row-value">${typeDist[t]} plan${typeDist[t] === 1 ? '' : 's'}</span>
                        </div>
                        <div class="sp-progress-bar"><div class="sp-progress-fill" style="width:${(typeDist[t] / maxType) * 100}%;"></div></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// ================================================================
// UPLOAD MODAL
// ================================================================
function openUploadBusinessPlanModal() {
    if (!isManagerRole() && !isCEO()) {
        modernToast('Access denied', 'Only Manager or CEO can upload business plans', 'error');
        return;
    }
    bpUploadFile = null;
    bpUploadFileData = null;

    let modal = document.getElementById('bpUploadModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="bpUploadModal">
                <div class="modal-box" style="max-width:820px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                    <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b);padding:24px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:48px;height:48px;border-radius:12px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;font-size:24px;">💼</div>
                            <div>
                                <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">Upload Business Plan</h3>
                                <div style="font-size:12px;color:rgba(255,255,255,0.7);">Attach your project proposal document</div>
                            </div>
                        </div>
                        <button onclick="closeModal('bpUploadModal')" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>

                    <div style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                        <!-- FILE UPLOAD ZONE -->
                        <div class="sp-upload-zone" id="bpUploadZone" onclick="document.getElementById('bpFileInput').click()" ondragover="handleBPDragOver(event)" ondragleave="handleBPDragLeave(event)" ondrop="handleBPDrop(event)">
                            <span class="uz-icon">📤</span>
                            <div class="uz-title">Click to upload or drag & drop</div>
                            <div class="uz-sub">Attach your Business Plan / Feasibility Study</div>
                            <div class="uz-types">PDF • DOCX • XLSX • PPTX — Max 10MB</div>
                        </div>
                        <input type="file" id="bpFileInput" accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt" onchange="handleBPFileSelect(event)" style="display:none;">
                        <div id="bpFilePreviewContainer"></div>

                        <!-- METADATA -->
                        <div style="margin-top:22px;">
                            <div style="font-size:11px;font-weight:900;color:#0f1f3d;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📝 Project Details</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
                                <div style="grid-column:1/-1;">
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Project Title <span style="color:#dc2626;">*</span></label>
                                    <input type="text" id="bpUploadTitle" placeholder="e.g. Construction of District HQ- Makete" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;font-weight:600;">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Project Type <span style="color:#dc2626;">*</span></label>
                                    <select id="bpUploadType" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;background:white;">
                                        <option value="Construction">🏗️ Construction</option>
                                        <option value="Manufacturing">🏭 Manufacturing</option>
                                        <option value="Real Estate">🏘️ Real Estate</option>
                                        <option value="Service">🛎️ Service</option>
                                        <option value="Other">📦 Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Department</label>
                                    <input type="text" id="bpUploadDepartment" value="${esc(currentUser?.department || '')}" placeholder="e.g. Operations" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Estimated Budget (TSh)</label>
                                    <input type="number" id="bpUploadBudget" placeholder="e.g. 250000000" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;font-weight:600;">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Expected Revenue (TSh)</label>
                                    <input type="number" id="bpUploadRevenue" placeholder="e.g. 400000000" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;font-weight:600;">
                                </div>
                               <div style="grid-column: span 1;">
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">
                                        Expected Return On Investment-ROI(%) 
                                        <!-- Formula Tooltip -->
                                        <span title="Formula: ((Expected Revenue - Estimated Budget) ÷ Estimated Budget) × 100" style="cursor:help; color:#f59e0b; font-size:14px; margin-left:4px;">ⓘ</span>
                                    </label>
                                    <div style="position:relative;">
                                        <!-- Read-Only input for Auto-calculation -->
                                        <input type="number" id="bpUploadRoi" placeholder="Auto-calculated" step="0.01" readonly style="width:100%;padding:12px 40px 12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;font-weight:800;background:#f8fafc;color:#16a34a;cursor:not-allowed;">
                                        <span style="position:absolute; right:14px; top:50%; transform:translateY(-50%); font-weight:900; color:#16a34a; font-size:16px;">%</span>
                                    </div>
                                    <!-- Small formula text below the input -->
                                    <div style="font-size:10px; color:#64748b; margin-top:4px; font-weight:600; line-height:1.4;">
                                        Auto-calculated: <br>
                                        <code style="background:#e2e8f0; padding:2px 4px; border-radius:4px;">((Revenue - Budget) ÷ Budget) × 100</code>
                                    </div>
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Break-even (Months)</label>
                                    <input type="number" id="bpUploadBreakEven" placeholder="e.g. 18" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;font-weight:600;">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Start Date</label>
                                    <input type="date" id="bpUploadStartDate" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;">
                                </div>
                                <div>
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">End Date</label>
                                    <input type="date" id="bpUploadEndDate" style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;">
                                </div>
                                <div style="grid-column:1/-1;">
                                    <label style="font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:0.8px;display:block;margin-bottom:6px;">Executive Summary <span style="color:#dc2626;">*</span></label>
                                    <textarea id="bpUploadSummary" placeholder="One paragraph summary — what this project is about and why it matters." style="width:100%;padding:12px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font-size:14px;font-family:inherit;min-height:90px;resize:vertical;line-height:1.6;"></textarea>
                                </div>
                            </div>
                        </div>

                        <div style="margin-top:18px;padding:14px 18px;background:rgba(245,158,11,0.06);border-left:3px solid #f59e0b;border-radius:8px;font-size:12px;color:#78350f;line-height:1.6;">
                            ℹ️ The file will be saved as a <strong>Draft</strong>. You can then click <strong>📤 Submit to CEO</strong> from the list when ready.
                        </div>
                    </div>
                    <div style="padding:16px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;">
                        <button onclick="closeModal('bpUploadModal')" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                        <button id="bpSaveBtn" onclick="saveUploadedBusinessPlan()" style="padding:11px 28px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;box-shadow:0 4px 12px rgba(15,31,61,0.3);">💾 Save Plan</button>
                     </div>
                </div>
            </div>
        `);
        modal = document.getElementById('bpUploadModal');
    }
    modal.classList.add('show');
}

function handleBPDragOver(e) { e.preventDefault(); document.getElementById('bpUploadZone')?.classList.add('dragover'); }
function handleBPDragLeave(e) { document.getElementById('bpUploadZone')?.classList.remove('dragover'); }
function handleBPDrop(e) {
    e.preventDefault();
    document.getElementById('bpUploadZone')?.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) processBPFile(file);
}
function handleBPFileSelect(e) {
    const file = e.target.files[0];
    if (file) processBPFile(file);
}

function processBPFile(file) {
    const validExt = ['pdf','docx','doc','xlsx','xls','pptx','ppt'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExt.includes(ext)) {
        modernToast('Invalid file type', 'Please upload PDF, DOCX, XLSX, or PPTX', 'error');
        return;
    }
    if (file.size > BP_MAX_SIZE) {
        modernToast('File too large', 'Maximum file size is 10MB', 'error');
        return;
    }

    bpUploadFile = file;
    const reader = new FileReader();
    reader.onload = function(evt) {
        bpUploadFileData = evt.target.result;
        const container = document.getElementById('bpFilePreviewContainer');
        const icons = { pdf:'📄', docx:'📝', doc:'📝', xlsx:'📊', xls:'📊', pptx:'📽️', ppt:'📽️' };
        container.innerHTML = `
            <div class="sp-file-preview">
                <div class="fp-icon">${icons[ext] || '📎'}</div>
                <div class="fp-info">
                    <div class="fp-name">${esc(file.name)}</div>
                    <div class="fp-size">${(file.size / 1024 / 1024).toFixed(2)} MB • Ready to upload</div>
                </div>
                <button class="fp-remove" onclick="removeBPSelectedFile()" title="Remove">✕</button>
            </div>
        `;
    };
    reader.readAsDataURL(file);
}

function removeBPSelectedFile() {
    bpUploadFile = null;
    bpUploadFileData = null;
    document.getElementById('bpFilePreviewContainer').innerHTML = '';
    document.getElementById('bpFileInput').value = '';
}

async function saveUploadedBusinessPlan() {
    const saveBtn = document.getElementById('bpSaveBtn');
    if (saveBtn && saveBtn.disabled) return;

    if (!bpUploadFile || !bpUploadFileData) {
        modernToast('File required', 'Please attach a document', 'error');
        return;
    }
    
    const title = document.getElementById('bpUploadTitle')?.value.trim();
    const projectType = document.getElementById('bpUploadType')?.value;
    const department = document.getElementById('bpUploadDepartment')?.value.trim();
    const summary = document.getElementById('bpUploadSummary')?.value.trim();
    const estimatedBudget = document.getElementById('bpUploadBudget')?.value;
    const expectedRevenue = document.getElementById('bpUploadRevenue')?.value;
    const expectedRoi = document.getElementById('bpUploadRoi')?.value;
    const breakEvenMonths = document.getElementById('bpUploadBreakEven')?.value;
    const startDate = document.getElementById('bpUploadStartDate')?.value;
    const endDate = document.getElementById('bpUploadEndDate')?.value;

    if (!title) { modernToast('Title required', 'Please enter a project title', 'error'); return; }
    if (!summary) { modernToast('Summary required', 'Please write a brief summary', 'error'); return; }

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Saving...';
        saveBtn.style.opacity = '0.7';
        saveBtn.style.cursor = 'not-allowed';
    }

    const payload = {
        title, projectType, department, summary,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
        expectedRevenue: expectedRevenue ? parseFloat(expectedRevenue) : null,
        expectedRoi: expectedRoi ? parseFloat(expectedRoi) : null,
        breakEvenMonths: breakEvenMonths ? parseInt(breakEvenMonths) : null,
        startDate: startDate || null,
        endDate: endDate || null,
        fileName: bpUploadFile.name,
        fileType: bpUploadFile.type,
        fileSize: bpUploadFile.size,
        fileData: bpUploadFileData
    };

    try {
        console.log('📤 Sending payload to backend...', payload.title);
        
        // TUMA KWENYE BACKEND
        await API.createBusinessPlan(payload);
        console.log('✅ API Success');

        closeModal('bpUploadModal');
        modernToast('✅ Uploaded', 'Business plan saved as Draft.', 'success');

        // ONGEZA KWENYE UI PAPO HAPO (Bila kusubiri Database)
        const newPlan = {
            id: Date.now(),
            businessPlanId: `BP-${Date.now()}`,
            title, projectType, department, summary,
            estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : 0,
            expectedRevenue: expectedRevenue ? parseFloat(expectedRevenue) : 0,
            expectedRoi: expectedRoi ? parseFloat(expectedRoi) : 0,
            breakEvenMonths: breakEvenMonths ? parseInt(breakEvenMonths) : null,
            startDate, endDate,
            fileName: bpUploadFile.name,
            fileSize: bpUploadFile.size,
            status: 'Draft',
            createdBy: currentUser?.fullName || 'Manager',
            createdById: currentUser?.id || null,
            createdAt: new Date().toISOString(),
            fileData: bpUploadFileData 
        };
        
        businessPlansCache.unshift(newPlan);
        renderBPStats();
        renderBusinessPlans();

        // VUTA KIMYA KIMYA BAADA YA SEKUNDE 1.5
        setTimeout(() => {
            console.log('🔄 Refreshing from DB...');
            loadBusinessPlans().catch(console.error);
        }, 1500); 

    } catch (err) {
        console.error('❌ Upload failed error:', err);
        modernToast('Upload failed', err.message, 'error');
    } finally {
        // RUDISHA KITUFE KATIKA HALI YA KAWAIDA
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Plan';
            saveBtn.style.opacity = '1';
            saveBtn.style.cursor = 'pointer';
        }
    }
}
// ================================================================
// SUBMIT TO CEO
// ================================================================
async function submitBPToCEO(id) {
    const p = businessPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;
    if (!isManagerRole() && !isCEO()) {
        modernToast('Access denied', 'Only Manager can submit', 'error');
        return;
    }

    // 🆕 1. ZUIA KAMA STATUS SI DRAFT/REVISION/REJECTED
    if (!['Draft', 'Revision Requested', 'Rejected'].includes(p.status)) {
        modernToast('Invalid Action', `Plan is already "${p.status}"`, 'warning');
        return;
    }

    const res = await modernConfirm({
        title: '📤 Submit to CEO?',
        message: `Submit "${p.title}" to the CEO for approval? You won't be able to edit until CEO responds.`,
        detail: { label: 'Plan', value: `${p.title} — ${p.projectType}` },
        type: 'primary',
        okText: '📤 Submit to CEO',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    // 🆕 2. ZUIA DOUBLE CLICK (Tafuta vitufe vyote vya submit kwenye list na uvizime)
    const actionButtons = document.querySelectorAll(`button[onclick="submitBPToCEO('${p.id}')"]`);
    actionButtons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '⏳ Sending...';
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
    });

    try {
        await API.submitBusinessPlanToCeo(p.id);
        modernToast('📤 Submitted', 'Business plan sent to CEO for approval.', 'success');
        
        // Refresh list
        await loadBusinessPlans();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
        
        // 🆕 RUDISHA VITUFE KAMA KUNA KOSA
        actionButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '📤 Submit to CEO';
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
    }
}
// ================================================================
// VIEW PLAN (Modal ya details)
// ================================================================
async function viewBusinessPlan(id) {
    try {
        const p = await API.getBusinessPlanById(id);
        if (!p) { modernToast('Not Found', 'Plan not found', 'error'); return; }

        const s = getBPStatusInfo(p.status);
        const fileType = (p.fileName || '').split('.').pop().toLowerCase();

        let modal = document.getElementById('bpViewModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'bpViewModal';
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:780px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
                <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b);padding:24px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:14px;">
                        <div style="width:44px;height:44px;border-radius:12px;background:rgba(245,158,11,0.2);border:1px solid rgba(245,158,11,0.4);display:flex;align-items:center;justify-content:center;font-size:22px;">💼</div>
                        <div>
                            <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">${esc(p.title)}</h3>
                            <div style="font-size:12px;color:rgba(255,255,255,0.7);">${esc(p.businessPlanId)} • ${esc(p.projectType)}</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('bpViewModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                </div>

                <div style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                    <div style="background:${s.color}10;border-left:4px solid ${s.color};padding:16px 20px;border-radius:10px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:10px;font-weight:800;color:${s.color};text-transform:uppercase;letter-spacing:1px;">Status</div>
                            <div style="font-size:15px;font-weight:900;color:${s.color};">${s.icon} ${s.label}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Estimated Budget</div>
                            <div style="font-size:22px;font-weight:900;color:#0f1f3d;font-family:'Courier New',monospace;">TSh ${Number(p.estimatedBudget || 0).toLocaleString()}</div>
                        </div>
                    </div>

                    <div style="background:white;border-radius:10px;padding:18px 20px;border:1px solid #e2e8f0;margin-bottom:14px;">
                        <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">📝 Executive Summary</div>
                        <div style="font-size:13px;color:#334155;line-height:1.7;">${esc(p.summary || '—')}</div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">💰 Budget</div>
                            <div style="font-size:14px;font-weight:800;color:#0f1f3d;">TSh ${Number(p.estimatedBudget || 0).toLocaleString()}</div>
                        </div>
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📈 Expected Revenue</div>
                            <div style="font-size:14px;font-weight:800;color:#16a34a;">TSh ${Number(p.expectedRevenue || 0).toLocaleString()}</div>
                        </div>
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📊 Expected ROI</div>
                            <div style="font-size:14px;font-weight:800;color:#16a34a;">${p.expectedRoi ? Number(p.expectedRoi) + '%' : '—'}</div>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">🏢 Department</div>
                            <div style="font-size:13px;font-weight:700;color:#1e293b;">${esc(p.department || '—')}</div>
                        </div>
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📅 Start</div>
                            <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB') : '—'}</div>
                        </div>
                        <div style="background:white;border-radius:10px;padding:14px 16px;border:1px solid #e2e8f0;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📅 End</div>
                            <div style="font-size:13px;font-weight:700;color:#1e293b;">${p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB') : '—'}</div>
                        </div>
                    </div>

                    ${p.fileName ? `
                        <div style="background:white;border-radius:10px;padding:16px 20px;border:1px solid #e2e8f0;margin-bottom:14px;">
                            <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📎 Attached Document</div>
                            <div style="display:flex;align-items:center;gap:14px;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                                <div style="font-size:32px;">📄</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:13px;font-weight:800;color:#0f1f3d;word-break:break-all;">${esc(p.fileName)}</div>
                                    <div style="font-size:11px;color:#64748b;margin-top:3px;">${fileType.toUpperCase()} • ${p.fileSize ? (p.fileSize/1024/1024).toFixed(2) + ' MB' : '—'}</div>
                                </div>
                                <button onclick="downloadBPFile('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">⬇️ Download Book</button>
                            </div>
                        </div>
                    ` : ''}

                    ${p.ceoApprovedBy ? `<div style="background:rgba(22,163,74,0.05);border-left:4px solid #16a34a;border-radius:10px;padding:16px 20px;margin-bottom:12px;"><div style="font-size:10px;font-weight:900;color:#16a34a;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">✅ Approved by CEO</div><div style="font-size:12px;color:#14532d;line-height:1.6;"><strong>${esc(p.ceoApprovedBy)}</strong> • ${new Date(p.ceoApprovedAt).toLocaleString('en-GB')}${p.ceoRemarks ? `<br><br><em>Remarks:</em> ${esc(p.ceoRemarks)}` : ''}</div></div>` : ''}
                    ${p.ceoRejectedBy ? `<div style="background:rgba(220,38,38,0.05);border-left:4px solid #dc2626;border-radius:10px;padding:16px 20px;margin-bottom:12px;"><div style="font-size:10px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">❌ Rejected by CEO</div><div style="font-size:12px;color:#7f1d1d;line-height:1.6;"><strong>${esc(p.ceoRejectedBy)}</strong> • ${new Date(p.ceoRejectedAt).toLocaleString('en-GB')}<br><br><em>Reason:</em> ${esc(p.ceoRejectionReason || '—')}</div></div>` : ''}
                    ${p.revisionNotes ? `<div style="background:rgba(37,99,235,0.05);border-left:4px solid #2563eb;border-radius:10px;padding:16px 20px;margin-bottom:12px;"><div style="font-size:10px;font-weight:900;color:#2563eb;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">🔄 Revision Requested</div><div style="font-size:12px;color:#1e3a8a;line-height:1.6;"><strong>${esc(p.revisionRequestedBy)}</strong> • ${new Date(p.revisionRequestedAt).toLocaleString('en-GB')}<br><br><em>Notes:</em> ${esc(p.revisionNotes)}</div></div>` : ''}
                </div>

                <div style="padding:14px 30px;background:white;border-top:1.5px solid #e5e7eb;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;flex-wrap:wrap;">
                    <button onclick="document.getElementById('bpViewModal').remove()" style="padding:11px 24px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    ${isManagerRole() && ['Draft', 'Revision Requested', 'Rejected'].includes(p.status) ? `<button onclick="document.getElementById('bpViewModal').remove(); submitBPToCEO('${p.id}')" style="padding:11px 24px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px;">📤 Submit to CEO</button>` : ''}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}

// ================================================================
// DOWNLOAD FILE
// ================================================================
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

// ================================================================
// DELETE
// ================================================================
async function deleteBusinessPlan(id) {
    const p = businessPlansCache.find(x => String(x.id) === String(id));
    if (!p) return;
    const r = await modernConfirm({
        title: '🗑️ Delete Plan?',
        message: `Delete "${p.title}"? This cannot be undone.`,
        type: 'danger', okText: '🗑️ Delete', cancelText: 'Cancel'
    });
    if (!r.confirmed) return;
    try {
        await API.deleteBusinessPlan(p.id);
        modernToast('🗑️ Deleted', 'Business plan removed.', 'warning');
        await loadBusinessPlans();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

// ================================================================
// PLAN BOOK (Archive ya Approved)
// ================================================================
function openBusinessPlanBook() {
    const approved = businessPlansCache.filter(p => ['Approved', 'Active'].includes(p.status));
    if (approved.length === 0) {
        modernToast('No Approved Plans', 'Approved business plans will appear in the Plan Book.', 'warning');
        return;
    }
    const sorted = [...approved].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let modal = document.getElementById('bpPlanBookModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'bpPlanBookModal';
    modal.className = 'modal-overlay show';
    modal.innerHTML = `
        <div class="modal-box" style="max-width:920px;padding:0;overflow:hidden;max-height:94vh;display:flex;flex-direction:column;border-radius:20px;">
            <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b);padding:20px 30px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="width:44px;height:44px;border-radius:50%;background:rgba(245,158,11,0.2);border:2px solid #f59e0b;display:flex;align-items:center;justify-content:center;font-size:22px;">📖</div>
                    <div>
                        <h3 style="font-size:18px;font-weight:900;color:white;margin:0;">Business Plan Book Archive</h3>
                        <div style="font-size:11px;color:rgba(255,255,255,0.7);">${approved.length} approved plan${approved.length > 1 ? 's' : ''} • Company Growth Portfolio</div>
                    </div>
                </div>
                <button onclick="document.getElementById('bpPlanBookModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:white;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div style="padding:26px 30px;overflow-y:auto;flex:1;background:#f8fafc;">
                <div style="background:linear-gradient(155deg,#0a1628 0%,#0f1f3d 45%,#1a3a6b 100%);border-radius:14px;padding:40px 30px;text-align:center;margin-bottom:22px;position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,rgba(245,158,11,0.25) 0%,transparent 70%);border-radius:50%;"></div>
                    <div style="position:relative;z-index:1;">
                        <div style="width:96px;height:96px;border-radius:50%;border:4px solid #f59e0b;background:white;padding:5px;margin:0 auto 18px;display:flex;align-items:center;justify-content:center;font-size:44px;">💼</div>
                        <div style="font-size:11px;font-weight:800;color:#f59e0b;text-transform:uppercase;letter-spacing:4px;margin-bottom:10px;">MAK DC Investment Company LTD</div>
                        <h2 style="font-size:32px;font-weight:900;color:white;margin:0 0 8px;line-height:1.1;">Business Plan Book</h2>
                        <div style="font-size:13px;color:rgba(255,255,255,0.7);font-style:italic;margin-bottom:20px;">"Quality service is our priority."</div>
                        <div style="border-top:2px solid #f59e0b;border-bottom:2px solid #f59e0b;padding:14px 30px;display:inline-block;">
                            <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Total Investment</div>
                            <div style="font-size:24px;font-weight:900;color:#fbbf24;margin-top:4px;">TSh ${sorted.reduce((s, p) => s + Number(p.estimatedBudget || 0), 0).toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📚 Approved Projects</div>
                ${sorted.map((p, i) => `
                    <div style="background:white;border-radius:12px;padding:18px 22px;border:1.5px solid #e5e7eb;margin-bottom:12px;border-left:4px solid #16a34a;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;">
                            <div style="flex:1;min-width:200px;">
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                                    <span style="font-family:'Courier New',monospace;font-weight:900;color:#f59e0b;font-size:14px;">${String(i+1).padStart(2,'0')}</span>
                                    <span style="font-size:11px;font-weight:800;color:#16a34a;background:rgba(22,163,74,0.1);padding:3px 8px;border-radius:6px;">✅ Approved</span>
                                    <span style="font-size:11px;color:#94a3b8;">${esc(p.projectType)}</span>
                                </div>
                                <div style="font-size:15px;font-weight:800;color:#0f1f3d;margin-bottom:4px;">${esc(p.title)}</div>
                                <div style="font-size:12px;color:#475569;margin-bottom:4px;">
                                    💰 TSh ${Number(p.estimatedBudget || 0).toLocaleString()} • 📈 ROI: ${p.expectedRoi ? Number(p.expectedRoi) + '%' : '—'}
                                </div>
                                <div style="font-size:11.5px;color:#64748b;">👤 ${esc(p.ceoApprovedBy)} • ${new Date(p.ceoApprovedAt).toLocaleDateString('en-GB')}</div>
                            </div>
                            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                                <button onclick="downloadBPFile('${p.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1px solid rgba(15,31,61,0.2);border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">⬇️ Download</button>
                                <button onclick="viewBusinessPlan('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f1f3d,#1a3a6b);color:white;border:none;border-radius:6px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;">👁 View</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ================================================================
// HOOK INTO switchTab
// ================================================================
(function hookBP() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__bpHooked) return;
    const wrapped = function(tabId) {
        const result = _orig.call(this, tabId);
        if (tabId === 'tab4') loadBusinessPlans();
        return result;
    };
    wrapped.__bpHooked = true;
    window.switchTab = wrapped;
})();
// ================================================================
// AUTO-CALCULATE ROI
// ================================================================
function calculateAutoROI() {
    const budgetInput = document.getElementById('bpUploadBudget');
    const revenueInput = document.getElementById('bpUploadRevenue');
    const roiInput = document.getElementById('bpUploadRoi');

    if (!budgetInput || !revenueInput || !roiInput) return;

    const budget = parseFloat(budgetInput.value) || 0;
    const revenue = parseFloat(revenueInput.value) || 0;

    if (budget > 0 && revenue > 0) {
        // Formula: ((Revenue - Budget) / Budget) * 100
        const roi = ((revenue - budget) / budget) * 100;
        roiInput.value = roi.toFixed(2); // Keep 2 decimal places
    } else {
        roiInput.value = ''; // Clear if inputs are empty
    }
}

// Listen for input changes on Budget and Revenue fields
document.addEventListener('input', function(e) {
    if (e.target.id === 'bpUploadBudget' || e.target.id === 'bpUploadRevenue') {
        calculateAutoROI();
    }
});
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
// 📊 MANAGER REPORTS (UI Logic)
// ================================================================
let currentReportMetrics = null;

function openCreateReportModal() {
    currentReportMetrics = null;
    
    // Set default dates (Mwezi wa sasa)
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    document.getElementById('reportStartDate').value = firstDay.toISOString().split('T')[0];
    document.getElementById('reportEndDate').value = lastDay.toISOString().split('T')[0];
    
    // Safisha form
    document.getElementById('reportPeriodType').value = 'Monthly';
    document.getElementById('reportKeyActivities').value = '';
    document.getElementById('reportExecutiveSummary').value = '';
    document.getElementById('reportChallenges').value = '';
    document.getElementById('reportRecommendations').value = '';
    
    // Ficha metrics na narrative
    document.getElementById('reportMetricsContainer').style.display = 'none';
    document.getElementById('reportNarrativeContainer').style.display = 'none';
    
    showModal('createReportModal');
}

async function generateReportMetrics() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        modernToast('Dates Required', 'Please select start and end dates.', 'warning');
        return;
    }
    
    const container = document.getElementById('reportMetricsContainer');
    container.style.display = 'block';
    container.innerHTML = `<div class="modern-empty-state" style="padding:30px;"><div class="mes-icon">⏳</div><div class="mes-title">Fetching metrics...</div></div>`;
    
    try {
        const metrics = await API.generateReportMetrics(startDate, endDate);
        currentReportMetrics = metrics;
        
        // Onyesha Kadi za Metrics
        container.innerHTML = `
            <div style="font-size:14px; color:#0f1f3d; text-transform:uppercase; letter-spacing:1px; font-weight:800; margin-bottom:12px;">2. Auto-Captured Metrics</div>
            <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px;">
                <!-- Orders -->
                <div style="background:linear-gradient(135deg, #f8fafc, #e2e8f0); padding:16px; border-radius:12px; border-left:4px solid #3b82f6;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:4px;">📦 Orders</div>
                    <div style="font-size:24px; font-weight:900; color:#0f1f3d;">${metrics.orders.total}</div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">Completed: ${metrics.orders.completed}</div>
                    <div style="font-size:11px; color:#64748b;">Pending: ${metrics.orders.pending}</div>
                </div>
                
                <!-- Finance -->
                <div style="background:linear-gradient(135deg, #f8fafc, #e2e8f0); padding:16px; border-radius:12px; border-left:4px solid #f59e0b;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:4px;">💰 Approvals</div>
                    <div style="font-size:24px; font-weight:900; color:#0f1f3d;">${metrics.finance.paymentsCount}</div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">Payments</div>
                    <div style="font-size:11px; color:#64748b;">Total: TSh ${metrics.finance.paymentsTotal.toLocaleString()}</div>
                </div>
                
                <!-- Budgets -->
                <div style="background:linear-gradient(135deg, #f8fafc, #e2e8f0); padding:16px; border-radius:12px; border-left:4px solid #10b981;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:4px;">📋 Budgets</div>
                    <div style="font-size:24px; font-weight:900; color:#0f1f3d;">${metrics.budgets.count}</div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">Reviewed</div>
                </div>
                
                <!-- Staff -->
                <div style="background:linear-gradient(135deg, #f8fafc, #e2e8f0); padding:16px; border-radius:12px; border-left:4px solid #8b5cf6;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:4px;">👥 Staff</div>
                    <div style="font-size:24px; font-weight:900; color:#0f1f3d;">${metrics.staff.newHires}</div>
                    <div style="font-size:11px; color:#64748b; margin-top:4px;">New Hires</div>
                </div>
            </div>
        `;
        
        // Onyesha Narrative
        document.getElementById('reportNarrativeContainer').style.display = 'block';
        
    } catch (err) {
        container.innerHTML = `<div class="modern-empty-state" style="padding:30px;color:#dc2626;"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}

async function saveManagerReport(status) {
    if (!currentReportMetrics) {
        modernToast('Generate First', 'Please generate metrics before saving.', 'warning');
        return;
    }
    
    const payload = {
        periodType: document.getElementById('reportPeriodType').value,
        startDate: document.getElementById('reportStartDate').value,
        endDate: document.getElementById('reportEndDate').value,
        metrics: JSON.stringify(currentReportMetrics),
        keyActivities: document.getElementById('reportKeyActivities').value.trim(),
        executiveSummary: document.getElementById('reportExecutiveSummary').value.trim(),
        challenges: document.getElementById('reportChallenges').value.trim(),
        recommendations: document.getElementById('reportRecommendations').value.trim(),
        status: status
    };
    
    const btn = event.target;
    btn.disabled = true;
    btn.innerHTML = '⏳ Saving...';
    
    try {
        await API.createManagerReport(payload);
        modernToast('✅ Saved', `Report ${status === 'Draft' ? 'saved as Draft' : 'submitted to CEO'}.`, 'success');
        closeModal('createReportModal');
        loadManagerReports();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = status === 'Draft' ? '💾 Save as Draft' : '📤 Submit to CEO';
    }
}

async function loadManagerReports() {
    const container = document.getElementById('managerReportsListContainer');
    if (!container) return;
    
    container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">⏳</div><div class="mes-title">Loading reports...</div></div>`;
    
    try {
        const reports = await API.getManagerReports();
        
        if (reports.length === 0) {
            container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">📊</div><div class="mes-title">No Reports Yet</div><div class="mes-desc">Click <strong>➕ Create New Report</strong> to start.</div></div>`;
            return;
        }
        
        container.innerHTML = reports.map(r => {
            const statusInfo = {
                'Draft': { icon: '📝', label: 'Draft', color: '#64748b', badge: 'navy' },
                'Pending CEO': { icon: '⏳', label: 'Pending CEO', color: '#d97706', badge: 'gold' },
                'Reviewed': { icon: '✅', label: 'Reviewed by CEO', color: '#16a34a', badge: 'green' }
            }[r.status] || { icon: '📝', label: r.status, color: '#64748b', badge: 'navy' };
            
            const dateRange = `${new Date(r.startDate).toLocaleDateString('en-GB')} → ${new Date(r.endDate).toLocaleDateString('en-GB')}`;
            
            return `
                <div class="modern-request-card ${r.status === 'Pending CEO' ? 'pending' : r.status === 'Reviewed' ? 'approved' : ''}">
                    <div class="mrc-header">
                        <div class="mrc-title-wrap">
                            <div class="mrc-id-row">
                                <span class="mrc-id">${esc(r.reportId)}</span>
                                <span class="mrc-badge navy">${esc(r.periodType)}</span>
                                <span class="mrc-badge ${statusInfo.badge}">${statusInfo.icon} ${statusInfo.label}</span>
                            </div>
                            <div class="mrc-title">${dateRange}</div>
                            <div class="mrc-meta">
                                <span>📅 Submitted: <strong>${r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('en-GB') : 'Not yet'}</strong></span>
                            </div>
                            ${r.ceoFeedback ? `
                                <div style="margin-top:10px; font-size:12px; color:#0f1f3d; background:rgba(34,197,94,0.08); padding:8px 12px; border-radius:6px; border-left:3px solid #16a34a;">
                                    💬 <strong>CEO Feedback:</strong> ${esc(r.ceoFeedback)}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="mrc-actions">
                        <button class="mrc-btn primary" onclick="viewManagerReport('${r.id}')">👁 View Details</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<div class="modern-empty-state"><div class="mes-icon">❌</div><div class="mes-title">Error</div><div class="mes-desc">${esc(err.message)}</div></div>`;
    }
}

async function viewManagerReport(id) {
    try {
        const r = await API.getManagerReportById(id);
        const m = r.metrics || {};
        
        let modal = document.getElementById('viewReportModal');
        if (modal) modal.remove();
        
        modal = document.createElement('div');
        modal.id = 'viewReportModal';
        modal.className = 'modal-overlay show';
        modal.style.zIndex = '5000';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:800px; padding:0; overflow:hidden; max-height:94vh; display:flex; flex-direction:column; border-radius:16px;">
                <div style="background:linear-gradient(135deg,#0a1628,#0f1f3d,#1a3a6b); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h3 style="margin:0; font-size:18px; font-weight:900;">📊 ${esc(r.reportId)}</h3>
                        <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:4px;">${esc(r.periodType)} • ${new Date(r.startDate).toLocaleDateString('en-GB')} → ${new Date(r.endDate).toLocaleDateString('en-GB')}</div>
                    </div>
                    <button onclick="document.getElementById('viewReportModal').remove()" style="background:rgba(255,255,255,0.15); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
                </div>
                <div style="padding:24px 26px; overflow-y:auto; flex:1; background:#f8fafc;">
                    <!-- Metrics -->
                    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:20px;">
                        <div style="background:white; padding:12px; border-radius:10px; border-left:3px solid #3b82f6; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">📦 Orders</div>
                            <div style="font-size:20px; font-weight:900; color:#0f1f3d;">${m.orders?.total || 0}</div>
                        </div>
                        <div style="background:white; padding:12px; border-radius:10px; border-left:3px solid #f59e0b; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">💰 Approvals</div>
                            <div style="font-size:20px; font-weight:900; color:#0f1f3d;">${m.finance?.paymentsCount || 0}</div>
                        </div>
                        <div style="background:white; padding:12px; border-radius:10px; border-left:3px solid #10b981; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">📋 Budgets</div>
                            <div style="font-size:20px; font-weight:900; color:#0f1f3d;">${m.budgets?.count || 0}</div>
                        </div>
                        <div style="background:white; padding:12px; border-radius:10px; border-left:3px solid #8b5cf6; text-align:center;">
                            <div style="font-size:10px; color:#64748b; font-weight:800;">👥 Staff</div>
                            <div style="font-size:20px; font-weight:900; color:#0f1f3d;">${m.staff?.newHires || 0}</div>
                        </div>
                    </div>
                    
                    ${r.keyActivities ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #f59e0b;"><div style="font-size:11px; font-weight:800; color:#f59e0b; text-transform:uppercase; margin-bottom:4px;">Key Activities</div><div style="font-size:13px; color:#334155; line-height:1.6;">${esc(r.keyActivities)}</div></div>` : ''}
                    ${r.executiveSummary ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #0f1f3d;"><div style="font-size:11px; font-weight:800; color:#0f1f3d; text-transform:uppercase; margin-bottom:4px;">Executive Summary</div><div style="font-size:13px; color:#334155; line-height:1.6;">${esc(r.executiveSummary)}</div></div>` : ''}
                    ${r.challenges ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #dc2626;"><div style="font-size:11px; font-weight:800; color:#dc2626; text-transform:uppercase; margin-bottom:4px;">Challenges</div><div style="font-size:13px; color:#334155; line-height:1.6;">${esc(r.challenges)}</div></div>` : ''}
                    ${r.recommendations ? `<div style="background:white; padding:16px; border-radius:10px; margin-bottom:12px; border-left:3px solid #16a34a;"><div style="font-size:11px; font-weight:800; color:#16a34a; text-transform:uppercase; margin-bottom:4px;">Recommendations</div><div style="font-size:13px; color:#334155; line-height:1.6;">${esc(r.recommendations)}</div></div>` : ''}
                    
                    ${r.ceoFeedback ? `<div style="background:rgba(34,197,94,0.08); padding:16px; border-radius:10px; border-left:3px solid #16a34a;"><div style="font-size:11px; font-weight:800; color:#16a34a; text-transform:uppercase; margin-bottom:4px;">✅ CEO Feedback</div><div style="font-size:13px; color:#14532d; line-height:1.6;">${esc(r.ceoFeedback)}</div></div>` : ''}
                </div>
                <div style="padding:14px 26px; background:white; border-top:1.5px solid #e5e7eb; display:flex; justify-content:flex-end;">
                    <button onclick="document.getElementById('viewReportModal').remove()" style="padding:11px 24px; background:#f1f5f9; color:#475569; border:1.5px solid #e2e8f0; border-radius:8px; font-weight:700; cursor:pointer;">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (err) {
        modernToast('Error', err.message, 'error');
    }
}

// Hook kwenye switchTab
(function hookReports() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__reportsHooked) return;
    const wrapped = function(tabId) {
        const result = _orig.call(this, tabId);
        if (tabId === 'tab8') loadManagerReports();
        return result;
    };
    wrapped.__reportsHooked = true;
    window.switchTab = wrapped;
})();
// ================================================================
// 📊 MANAGER REPORT (Modern Format)
// ================================================================
let currentManagerReportData = null;
let mgrTrendChartInstance = null;
let mgrStatusChartInstance = null;

function toggleMgrCustomDateRange() {
    const type = document.getElementById('mgrPeriodType').value;
    const customDiv = document.getElementById('mgrCustomDateRange');
    customDiv.style.display = type === 'custom' ? 'flex' : 'none';
}

async function loadManagerReport() {
    const kpiGrid = document.getElementById('mgrReportKPIGrid');
    const narrativeEl = document.getElementById('mgrNarrativeText');
    const tableBody = document.getElementById('mgrReportSummaryTable');
    const dateBadge = document.getElementById('mgrReportDateBadge');

    const periodType = document.getElementById('mgrPeriodType').value;
    let params = {};

    if (periodType === 'custom') {
        const from = document.getElementById('mgrDateFrom').value;
        const to = document.getElementById('mgrDateTo').value;
        if (!from || !to) {
            modernToast('Chagua tarehe', 'Chagua kuanzia na kuisha.', 'warning');
            return;
        }
        params = { startDate: from, endDate: to };
    } else {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        if (periodType === 'monthly') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (periodType === 'last-month') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (periodType === 'weekly') {
            start = new Date(now.setDate(now.getDate() - 7));
        } else if (periodType === 'yearly') {
            start = new Date(now.getFullYear(), 0, 1);
        }

        params = { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    }

    kpiGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:30px; color:#64748b;">⏳ Loading metrics...</div>`;
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px;">⏳ Loading...</td></tr>`;

    try {
        // 1. Vuta data kutoka API
        const metrics = await API.generateReportMetrics(params.startDate, params.endDate);
        currentManagerReportData = metrics;

        // 2. Onyesha Tarehe
        dateBadge.textContent = `📅 ${new Date(params.startDate).toLocaleDateString('en-GB')} → ${new Date(params.endDate).toLocaleDateString('en-GB')}`;

        // 3. Jenga KPI Cards
        kpiGrid.innerHTML = `
            <div class="report-kpi-card" style="border-left-color: #3b82f6;">
                <span class="report-kpi-icon">📦</span>
                <div class="report-kpi-value">${metrics.orders.total}</div>
                <div class="report-kpi-label">Total Orders</div>
                <div class="report-kpi-sub">${metrics.orders.completed} completed</div>
            </div>
            <div class="report-kpi-card" style="border-left-color: #f59e0b;">
                <span class="report-kpi-icon">💰</span>
                <div class="report-kpi-value">${metrics.finance.paymentsCount}</div>
                <div class="report-kpi-label">Finance Approvals</div>
                <div class="report-kpi-sub">TSh ${metrics.finance.paymentsTotal.toLocaleString()}</div>
            </div>
            <div class="report-kpi-card" style="border-left-color: #10b981;">
                <span class="report-kpi-icon">📋</span>
                <div class="report-kpi-value">${metrics.budgets.count}</div>
                <div class="report-kpi-label">Budgets Reviewed</div>
                <div class="report-kpi-sub">Department allocations</div>
            </div>
            <div class="report-kpi-card" style="border-left-color: #8b5cf6;">
                <span class="report-kpi-icon">👥</span>
                <div class="report-kpi-value">${metrics.staff.newHires}</div>
                <div class="report-kpi-label">New Hires</div>
                <div class="report-kpi-sub">Staff managed</div>
            </div>
        `;

        // 4. Jenga Table ya Muhtasari
        tableBody.innerHTML = `
            <tr>
                <td><strong>Orders</strong></td>
                <td>${metrics.orders.total}</td>
                <td>TSh 0</td>
                <td>${metrics.orders.completed} completed, ${metrics.orders.pending} pending</td>
            </tr>
            <tr>
                <td><strong>Finance Approvals</strong></td>
                <td>${metrics.finance.paymentsCount}</td>
                <td>TSh ${metrics.finance.paymentsTotal.toLocaleString()}</td>
                <td>${metrics.finance.payrollsCount} payrolls verified</td>
            </tr>
            <tr>
                <td><strong>Budgets</strong></td>
                <td>${metrics.budgets.count}</td>
                <td>—</td>
                <td>Department allocations</td>
            </tr>
            <tr>
                <td><strong>Staff</strong></td>
                <td>${metrics.staff.newHires}</td>
                <td>—</td>
                <td>New employees onboarded</td>
            </tr>
        `;

        // 5. Chora Charts (Tumia dummy data kwa sasa — tunaweza kuunganisha na data halisi baadaye)
        renderMgrCharts();

    } catch (err) {
        console.error('Manager Report Error:', err);
        kpiGrid.innerHTML = `<div style="grid-column:1/-1; color:#dc2626; padding:20px;">❌ ${err.message}</div>`;
    }
}

function renderMgrCharts() {
    // Chora chart ya Trend (Dummy data kwa sasa)
    const ctxTrend = document.getElementById('mgrTrendChart');
    if (mgrTrendChartInstance) mgrTrendChartInstance.destroy();

    mgrTrendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Requests',
                data: [12, 19, 15, 22, 18, 8, 5],
                borderColor: '#0f1f3d',
                backgroundColor: 'rgba(15,31,61,0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Chora chart ya Status (Dummy data)
    const ctxStatus = document.getElementById('mgrStatusChart');
    if (mgrStatusChartInstance) mgrStatusChartInstance.destroy();

    mgrStatusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending', 'Rejected'],
            datasets: [{
                data: [40, 15, 5],
                backgroundColor: ['#16a34a', '#f59e0b', '#dc2626'],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' } } }
    });
}

// ================================================================
// NARRATIVE MODAL (Manager Anaandika Maandishi)
// ================================================================
function openNarrativeModal() {
    if (!currentManagerReportData) {
        modernToast('Generate First', 'Please generate the report first.', 'warning');
        return;
    }

    let modal = document.getElementById('narrativeModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'narrativeModal';
    modal.className = 'modal-overlay show';
    modal.style.zIndex = '5000';
    modal.innerHTML = `
        <div class="modal-box" style="max-width: 640px; padding: 0; overflow: hidden; border-radius: 16px;">
            <div style="background: linear-gradient(135deg, #0f1f3d, #1a3a6b); padding: 20px 26px; color: white; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin:0; font-size:18px;">📝 Add Your Narrative</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:4px;">Add your professional commentary to this report</div>
                </div>
                <button onclick="document.getElementById('narrativeModal').remove()" style="background:rgba(255,255,255,0.15); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>
            <div style="padding: 24px 28px;">
                <div style="margin-bottom: 14px;">
                    <label style="font-size:11px; font-weight:800; color:#334155; text-transform:uppercase; display:block; margin-bottom:6px;">Key Activities (Not captured by system)</label>
                    <textarea id="narrativeKeyActivities" rows="2" placeholder="E.g., Attended board meeting, conducted staff training..." style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:13px; resize:vertical;"></textarea>
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="font-size:11px; font-weight:800; color:#334155; text-transform:uppercase; display:block; margin-bottom:6px;">Executive Summary</label>
                    <textarea id="narrativeSummary" rows="3" placeholder="Summarize the overall performance..." style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:13px; resize:vertical;"></textarea>
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="font-size:11px; font-weight:800; color:#334155; text-transform:uppercase; display:block; margin-bottom:6px;">Challenges Faced</label>
                    <textarea id="narrativeChallenges" rows="2" placeholder="What obstacles did you face?" style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:13px; resize:vertical;"></textarea>
                </div>
                <div style="margin-bottom: 14px;">
                    <label style="font-size:11px; font-weight:800; color:#334155; text-transform:uppercase; display:block; margin-bottom:6px;">Recommendations to CEO</label>
                    <textarea id="narrativeRecommendations" rows="2" placeholder="What actions do you suggest?" style="width:100%; padding:10px 14px; border:1.5px solid #cbd5e1; border-radius:8px; font-family:inherit; font-size:13px; resize:vertical;"></textarea>
                </div>
            </div>
            <div style="padding: 16px 28px; background: #f8fafc; border-top: 1.5px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px;">
                <button onclick="document.getElementById('narrativeModal').remove()" style="padding:11px 24px; background:white; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:700; cursor:pointer;">Cancel</button>
                <button onclick="saveNarrativeToReport()" style="padding:11px 24px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(22,163,74,0.3);">✅ Apply to Report</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveNarrativeToReport() {
    const keyActivities = document.getElementById('narrativeKeyActivities').value.trim();
    const summary = document.getElementById('narrativeSummary').value.trim();
    const challenges = document.getElementById('narrativeChallenges').value.trim();
    const recommendations = document.getElementById('narrativeRecommendations').value.trim();

    if (!summary) {
        modernToast('Summary Required', 'Please write an executive summary.', 'warning');
        return;
    }

    let narrativeText = `<strong>Executive Summary:</strong> ${summary}`;
    if (keyActivities) narrativeText += `<br><br><strong>Key Activities:</strong> ${keyActivities}`;
    if (challenges) narrativeText += `<br><br><strong>Challenges:</strong> ${challenges}`;
    if (recommendations) narrativeText += `<br><br><strong>Recommendations:</strong> ${recommendations}`;

    document.getElementById('mgrNarrativeText').innerHTML = narrativeText;
    document.getElementById('narrativeModal').remove();
    modernToast('✅ Applied', 'Narrative added to report.', 'success');
}

// ================================================================
// PRINT MANAGER REPORT
// ================================================================
function printManagerReport() {
    if (!currentManagerReportData) {
        modernToast('No Data', 'Please generate the report first.', 'warning');
        return;
    }

    const d = currentManagerReportData;
    const narrativeHTML = document.getElementById('mgrNarrativeText').innerHTML;

    const html = `
        <html>
        <head>
            <title>Manager Report - MAK DC</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                .header { text-align: center; border-bottom: 3px solid #0f1f3d; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; font-size: 22px; color: #0f1f3d; }
                .header p { margin: 5px 0; font-size: 13px; color: #666; }
                .narrative { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin-bottom: 25px; font-size: 14px; line-height: 1.8; }
                .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
                .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .card-label { font-size: 11px; color: #666; text-transform: uppercase; }
                .card-value { font-size: 20px; font-weight: 900; color: #0f1f3d; }
                .footer { text-align: center; font-size: 11px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>MAK DC INVESTMENT COMPANY LTD</h1>
                <p>Manager Performance Report</p>
                <p>Generated on ${new Date().toLocaleString()} by ${Auth.getUser().fullName}</p>
            </div>
            <div class="narrative">${narrativeHTML}</div>
            <div class="stats">
                <div class="card"><div class="card-label">Orders Handled</div><div class="card-value">${d.orders.total}</div></div>
                <div class="card"><div class="card-label">Finance Approvals</div><div class="card-value">${d.finance.paymentsCount}</div></div>
                <div class="card"><div class="card-label">Budgets Reviewed</div><div class="card-value">${d.budgets.count}</div></div>
                <div class="card"><div class="card-label">Staff Hired</div><div class="card-value">${d.staff.newHires}</div></div>
            </div>
            <div class="footer">
                This is a computer-generated document. No signature required.<br>
                MAK DC Investment Company LTD &copy; ${new Date().getFullYear()}
            </div>
        </body>
        </html>
    `;

    const w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 500);
}

// Hook kwenye switchTab
(function hookManagerReports() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__mgrReportsHooked) return;
    const wrapped = function(tabId) {
        const result = _orig.call(this, tabId);
        if (tabId === 'tab8') {
            // Reset form kila unapofungua
            document.getElementById('mgrReportKPIGrid').innerHTML = '';
            document.getElementById('mgrReportSummaryTable').innerHTML = '';
        }
        return result;
    };
    wrapped.__mgrReportsHooked = true;
    window.switchTab = wrapped;
})();
// ================================================================
// MAIL SYSTEM — PROCUREMENT DASHBOARD
// ================================================================

let allMailUsers = [];
let mailListCache = {};
let mailListCacheTime = {};
const MAIL_CACHE_TTL = 30000;
let selectedSendTo = [];
let selectedCC = [];
let currentMailAttachments = [];
let currentMailBoxType = 'inbox';
let cachedMailList = [];
let currentMailId = null;

// ================= 1. LOAD BADGES =================
async function loadMailBadges() {
    try {
        const counts = await API.getMailUnreadCount().catch(() => null);
        
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
        }
    } catch (err) { 
        console.error('Badge error:', err); 
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

    const now = Date.now();
    if (mailListCache[type] && (now - (mailListCacheTime[type] || 0) < MAIL_CACHE_TTL)) {
        cachedMailList = mailListCache[type];
        renderMailList(cachedMailList);
        return;
    }

    container.innerHTML = `<div style="text-align: center; padding: 60px; color: #64748b;"><div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div><div style="font-weight: 700;">Fetching messages...</div></div>`;

    try {
        const messages = await API.getMailboxMessages(type);
        cachedMailList = messages || [];

        mailListCache[type] = cachedMailList;
        mailListCacheTime[type] = now;

        if (cachedMailList.length === 0) {
            container.innerHTML = `<div class="mail-empty"><div class="mail-empty-icon">📭</div><div class="mail-empty-title">No Messages Found</div><div class="mail-empty-desc">Your ${type} is empty.</div></div>`;
            return;
        }
        renderMailList(cachedMailList);
    } catch (err) {
        console.error('Mail load error:', err);
        container.innerHTML = `<div style="text-align: center; padding: 40px; background: #fef2f2; border-radius: 12px; color: #b91c1c;"><div style="font-size: 30px; margin-bottom: 10px;">❌</div><div style="font-weight: 800;">Failed to load messages</div><div style="font-size: 13px;">${err.message}</div></div>`;
    }
}

// ================= 4. RENDER MAIL LIST =================
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
        
        const displayName = currentMailBoxType === 'sent' 
            ? (msg.receiverName || 'Unknown')
            : (msg.senderName || 'Unknown');
        const prefix = currentMailBoxType === 'sent' ? 'To: ' : '';
        
        const dateStr = msg.createdAt 
            ? new Date(msg.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
            : '';
            
        const initials = (displayName || 'U').substring(0, 2).toUpperCase();
        
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];
        const colorIndex = displayName.length % colors.length;
        const avatarColor = colors[colorIndex];

        let badges = '';
        if (msg.isMinute) {
            badges += `<span style="font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: rgba(139,92,246,0.15); color: #7c3aed; letter-spacing: 0.5px;">📝 MINUTE</span>`;
        }
        if (isClosed) {
            badges += `<span style="font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: rgba(100,116,139,0.15); color: #475569; letter-spacing: 0.5px;">🔒 CLOSED</span>`;
        } else if (isPending) {
            badges += `<span style="font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: rgba(245,158,11,0.15); color: #b45309; letter-spacing: 0.5px;">⏳ IN PROGRESS</span>`;
        }
        if (msg.isStarred) {
            badges += `<span style="font-size: 14px;">⭐</span>`;
        }
        
        return `
            <div class="mail-item ${isUnread ? 'unread' : ''}" onclick="viewMailDetail('${msg.id}')" 
                 style="display: flex; gap: 16px; padding: 16px 20px; background: white; border: 1.5px solid #e2e8f0; border-radius: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; position: relative; align-items: flex-start;">
                
                <div style="width: 46px; height: 46px; border-radius: 12px; background: ${avatarColor}15; color: ${avatarColor}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900; flex-shrink: 0; border: 1.5px solid ${avatarColor}30;">
                    ${initials}
                </div>

                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 10px;">
                        <div style="font-size: 14.5px; font-weight: ${isUnread ? '900' : '700'}; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${prefix}${esc(displayName)}
                        </div>
                        <div style="font-size: 11px; font-weight: 800; color: #94a3b8; flex-shrink: 0; background: #f1f5f9; padding: 3px 8px; border-radius: 6px;">
                            ${dateStr}
                        </div>
                    </div>
                    
                    <div style="font-size: 14px; font-weight: ${isUnread ? '800' : '600'}; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;">
                        ${esc(msg.subject || '(No Subject)')}
                    </div>
                    
                    <div style="font-size: 13px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.5;">
                        ${esc((msg.body || '').substring(0, 120))}${(msg.body || '').length > 120 ? '...' : ''}
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px; flex-shrink: 0; margin-left: 8px;">
                    ${badges}
                    ${isUnread ? '<div style="width: 8px; height: 8px; border-radius: 50%; background: #2ecc71; box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.2);"></div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ================= 5. FILTER MAIL LIST =================
let mailFilterTimeout;
function filterMailList() {
    clearTimeout(mailFilterTimeout);
    mailFilterTimeout = setTimeout(() => {
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
    }, 300);
}
// ================= 6. VIEW MAIL DETAIL =================
async function viewMailDetail(id) {
    currentMailId = id;
    document.getElementById('mailListView').style.display = 'none';
    document.getElementById('mailDetailView').style.display = 'flex';
    
    const backLabel = document.getElementById('mailBackLabel');
    if (backLabel) backLabel.textContent = document.getElementById('mailListTitle')?.textContent || 'Inbox';
    
    const body = document.getElementById('mailDetailBody');
    
    // Onyesha loading kwanza
    body.innerHTML = `
        <div style="text-align: center; padding: 60px; color: var(--gray-500);">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Loading message...</div>
        </div>
    `;

    try {
        // ✅ Vuta data KABLA ya kutumia `msg`
        let msg = await API.getInternalMailById(id); 
        if (!msg) {
            body.innerHTML = `<div style="color: var(--red); text-align: center; padding: 40px; font-weight: 800;">❌ Message not found.</div>`;
            return;
        }
        
        if (!window.mailCache) window.mailCache = {};
        window.mailCache[id] = msg;

        // Mark as read (background)
        if (currentMailBoxType === 'inbox' && msg.status === 'unread') {
            (async () => {
                try {
                    await API.markMailAsRead(id);
                    loadMailBadges();
                    msg.status = 'read';
                } catch (e) { console.warn('Mark read error:', e); }
            })();
        }
        
        const isClosed = msg.status === 'closed' || msg.status === 'draft';
        
        // Hesabu attachments zote (Za mwanzo + Za majibu/attend/close)
        let totalAtts = 0;
        if (msg.attachments && Array.isArray(msg.attachments)) {
            totalAtts += msg.attachments.length;
        }
        if (msg.attendance && Array.isArray(msg.attendance)) {
            msg.attendance.forEach(att => {
                if (att.attachments && Array.isArray(att.attachments)) {
                    totalAtts += att.attachments.length;
                }
            });
        }

        // Kitufe cha Attachments
        const attButton = `
            <button class="btn-attachments-glow" onclick="openAttachmentsModal('${id}')">
                📎 Attachments (${totalAtts})
            </button>
        `;

        let actionButtons = `
            ${attButton}
            <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 8px;"></div>
            <button class="btn-act-reply" onclick="openReplyModal('${id}')">↩️ Reply</button>
        `;
        
        if (!isClosed) {
            actionButtons += `
                <button class="btn-act-attend" onclick="openAttendModal('${id}')">✅ Attend & Assign</button>
                <button class="btn-act-close" onclick="closeCurrentMail()">🔒 Close Workflow</button>
            `;
        } else {
            actionButtons += `<div style="padding: 8px 14px; background: #f5f3ff; color: #6d28d9; border: 1px solid #ede9fe; border-radius: 8px; font-weight: 800; font-size: 12px; display: inline-flex; align-items: center;">🔒 Closed</div>`;
        }

        const detailActions = document.querySelector('.mail-detail-actions');
        if (detailActions) {
            detailActions.innerHTML = `
                ${actionButtons}
                <div style="width: 1px; height: 20px; background: #cbd5e1; margin: 0 8px;"></div>
                <button id="btnStarMail" class="mail-icon-btn" onclick="toggleStarCurrentMail()" title="Star">⭐</button>
                <button id="btnArchiveMail" class="mail-icon-btn" onclick="toggleArchiveCurrentMail()" title="Archive">📁</button>
                <button id="btnDeleteMail" class="mail-icon-btn danger" onclick="deleteCurrentMail()" title="Delete">🗑️</button>
            `;
        }

        // ✅ Render LAYOUT MPYA (2 Columns) — inatumia classes zilizopo kwenye CSS
        body.innerHTML = `
            <div class="mail-detail-modern">
                
                <!-- ================= LEFT: WORKFLOW PANEL ================= -->
                <div class="md-workflow-panel">
                    <div class="md-wf-header">
                        <div class="md-wf-header-icon">🔄</div>
                        <div class="md-wf-header-title">
                            <h3>Workflow History</h3>
                            <p>Actions & assignments</p>
                        </div>
                    </div>
                    <div class="md-wf-body">
                        ${renderWorkflowChain(msg)}
                    </div>
                </div>

                <!-- ================= RIGHT: MESSAGE PANEL ================= -->
                <div class="md-message-panel">
                    <div class="md-msg-header">
                        <h2 class="md-msg-subject">${esc(msg.subject || '(No Subject)')}</h2>
                        
                        <div class="md-msg-meta-row">
                            <div class="md-msg-avatar">${(msg.senderName || 'U').substring(0, 2).toUpperCase()}</div>
                            <div class="md-msg-sender-info">
                                <div class="md-msg-sender-name">${esc(msg.senderName || 'Unknown')}</div>
                                <div class="md-msg-receiver">
                                    To: <strong>${esc(msg.receiverName || '—')}</strong>
                                    <span class="md-msg-status ${msg.status}">${(msg.status || '').toUpperCase()}</span>
                                </div>
                            </div>
                            <div class="md-msg-date">
                                📅 ${new Date(msg.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                    
                    <div class="md-msg-body">
                        ${esc(msg.body || '')}
                    </div>
                </div>
            </div>
        `;

    } catch (err) {
        console.error('View Mail Error:', err);
        body.innerHTML = `<div style="color: var(--red); text-align: center; padding: 40px; font-weight: 800;">❌ Failed to load: ${esc(err.message)}</div>`;
    }
}
// ================= 7. RENDER ATTACHMENTS =================
function renderAttachmentsUI(attachments) {
    let fileListHtml = '';

    attachments.forEach((att, index) => {
        const ext = (att.name || '').split('.').pop().toLowerCase();
        const isPdf = ext === 'pdf';
        const isImage = ['jpg','jpeg','png','gif','webp'].includes(ext);
        const icon = isPdf ? '📕' : isImage ? '🖼️' : '📄';

        fileListHtml += `
            <div class="doc-file-btn" style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: white; border: 1.5px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 12px; overflow: hidden;">
                    <span style="font-size: 24px;">${icon}</span>
                    <div style="min-width: 0;">
                        <div style="font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(att.name)}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Click to download</div>
                    </div>
                </div>
                <button onclick="downloadMailAttachment('${att.data}', '${esc(att.name)}')" style="padding: 8px 16px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                    ⬇️ Download
                </button>
            </div>
        `;
    });

    document.getElementById('docFileListContainer').innerHTML = fileListHtml;
}
function openAttachmentsModal(id) {
    const msg = window.mailCache[id];
    if (!msg) {
        modernToast('Error', 'Message data not found.', 'error');
        return;
    }

    let allFiles = [];

    if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
            allFiles.push({ ...att, source: 'Original Message' });
        });
    }

    if (msg.attendance && Array.isArray(msg.attendance) && msg.attendance.length > 0) {
        msg.attendance.forEach(att => {
            if (att.attachments && Array.isArray(att.attachments) && att.attachments.length > 0) {
                att.attachments.forEach(file => {
                    allFiles.push({ ...file, source: `Reply by ${att.userName}` });
                });
            }
        });
    }

    let modal = document.getElementById('viewAttachmentsModal');
    if (modal) modal.remove();

    let filesHtml = '';
    
    if (allFiles.length === 0) {
        filesHtml = `
            <div style="text-align:center; padding: 30px; color:#94a3b8;">
                <div style="font-size: 50px; margin-bottom: 10px; opacity: 0.3;">📭</div>
                <div style="font-weight:800; font-size: 15px; color:#475569;">No attachments found</div>
                <div style="font-size:12px; margin-top:4px;">Files attached to this message will appear here.</div>
            </div>
        `;
    } else {
        filesHtml = allFiles.map(att => {
            const ext = (att.name || '').split('.').pop().toLowerCase();
            const icon = ext === 'pdf' ? '📕' : ['jpg','jpeg','png','gif'].includes(ext) ? '🖼️' : '📄';
            const sizeStr = att.size ? (att.size / 1024).toFixed(1) + ' KB' : 'Unknown size';
            
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; background:white; border:1.5px solid #e2e8f0; padding:14px 18px; border-radius:12px; margin-bottom:10px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display:flex; align-items:center; gap:14px;">
                        <div style="width: 40px; height: 40px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            ${icon}
                        </div>
                        <div>
                            <div style="font-weight:800; color:#0f172a; font-size:14px;">${esc(att.name)}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">${sizeStr} • <span style="color:#1a7f5a; font-weight:800;">${esc(att.source)}</span></div>
                        </div>
                    </div>
                    <button onclick="downloadMailAttachment('${att.data}', '${esc(att.name)}')" style="padding:8px 16px; background:#f0fdf4; color:#1a7f5a; border:1.5px solid #bbf7d0; border-radius:8px; font-weight:800; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px; transition: all 0.2s;">
                        ⬇️ Download
                    </button>
                </div>
            `;
        }).join('');
    }

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="viewAttachmentsModal" style="z-index: 9000;">
            <div class="modal-box" style="max-width: 550px; padding: 0; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 80px rgba(0,0,0,0.3);">
                <div style="background: linear-gradient(135deg, #0a1929, #0f2942); padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; color: white; border-bottom: 3px solid #f59e0b;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width: 42px; height: 42px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📎</div>
                        <div>
                            <h3 style="margin: 0; font-size: 18px; font-weight: 900;">Attachments</h3>
                            <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 2px;">${allFiles.length} file(s) attached</div>
                        </div>
                    </div>
                    <button onclick="document.getElementById('viewAttachmentsModal').remove()" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 34px; height: 34px; border-radius: 50%; font-size: 18px; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#dc2626'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">✕</button>
                </div>
                <div style="padding: 24px 28px; max-height: 60vh; overflow-y: auto; background: #f8fafc;">
                    ${filesHtml}
                </div>
                <div style="padding: 18px 28px; background: white; border-top: 1.5px solid #e2e8f0; display:flex; justify-content:flex-end;">
                    <button onclick="document.getElementById('viewAttachmentsModal').remove()" style="padding: 12px 28px; background: #f1f5f9; color: #475569; border: 1.5px solid #e2e8f0; border-radius: 10px; font-weight: 800; cursor: pointer; font-family: inherit; transition: all 0.2s;">Close Window</button>
                </div>
            </div>
        </div>
    `);
}
function downloadMailAttachment(fileData, fileName) {
    if (!fileData) return modernToast('Error', 'File data is missing', 'error');
    
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    modernToast('⬇️ Downloading', fileName + ' is downloading...', 'info');
}

function showNoDocState() {
    const listC = document.getElementById('docFileListContainer');
    if (listC) listC.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--gray-400); border:1.5px dashed #cbd5e1; border-radius:12px;">
            <div style="font-size:40px; margin-bottom:10px; opacity:0.5;">📭</div>
            <div style="font-weight:700;">No attachments</div>
        </div>`;
}
// ================= 8. CLOSE DETAIL VIEW =================
function closeMailDetailView() {
    document.getElementById('mailListView').style.display = 'flex';
    document.getElementById('mailDetailView').style.display = 'none';
    currentMailId = null;
}
// ================= 9. RENDER WORKFLOW CHAIN (NEW STRIPE-STYLE) =================
function renderWorkflowChain(msg) {
    const attendance = msg.attendance || [];
    
    if (attendance.length === 0) {
        return `
            <div class="md-tl-empty">
                <div class="md-tl-empty-icon">📭</div>
                <div class="md-tl-empty-title">No Workflow Yet</div>
                <div class="md-tl-empty-desc">Actions will appear here.</div>
            </div>`;
    }

    const sorted = [...attendance].sort((a, b) => 
        new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );

    return `
        <div class="md-timeline">
            ${sorted.map((att) => {
                const action = (att.action || 'attended').toLowerCase();
                const userName = att.userName || 'System';
                const userRole = att.userRole || att.role || 'User';
                const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                const timeStr = formatTimeAgo(att.createdAt);
                
                // Determine action class
                let actionClass = 'attended';
                let actionLabel = 'Attended';
                if (action.includes('created') || action === 'send') { 
                    actionClass = 'created'; actionLabel = 'Created'; 
                } else if (action.includes('assign')) { 
                    actionClass = 'assigned'; actionLabel = 'Assigned'; 
                } else if (action.includes('close')) { 
                    actionClass = 'closed'; actionLabel = 'Closed'; 
                }

                // Assigned To
                let assignHtml = '';
                if (att.assignedTo && att.assignedTo.length > 0) {
                    const names = att.assignedNames && att.assignedNames.length > 0 
                        ? att.assignedNames : ['Unknown'];
                    assignHtml = `
                        <div class="md-tl-assign-pill">
                            ➡️ Assigned to: <strong>${names.map(n => esc(n)).join(', ')}</strong>
                        </div>`;
                }

                // Attachments
                let attHtml = '';
                if (att.attachments && att.attachments.length > 0) {
                    attHtml = `<div class="md-tl-attachments">`;
                    att.attachments.forEach(file => {
                        attHtml += `
                            <button onclick="downloadMailAttachment('${file.data}', '${esc(file.name)}')" class="md-tl-attach-btn">
                                📎 ${esc(file.name)}
                            </button>`;
                    });
                    attHtml += `</div>`;
                }

                return `
                    <div class="md-tl-item ${actionClass}">
                        <div class="md-tl-header">
                            <div class="md-tl-user-block">
                                <div class="md-tl-avatar">${initials}</div>
                                <div class="md-tl-user-info">
                                    <div class="md-tl-name">${esc(userName)}</div>
                                    <div class="md-tl-role">${esc(userRole)}</div>
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div class="md-tl-action-badge ${actionClass}">${actionLabel}</div>
                                <div class="md-tl-time">${timeStr}</div>
                            </div>
                        </div>

                        ${att.comment ? `<div class="md-tl-comment">${esc(att.comment)}</div>` : ''}
                        ${assignHtml}
                        ${attHtml}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}
// ================= 10. HELPERS =================
function getActionIcon(action) {
    const map = {
        'created': '📝', 'attended': '✅', 'assigned': '➡️',
        'closed': '🔒', 'rejected': '❌', 'replied': '↩️', 'forwarded': '📤'
    };
    return map[action] || '💬';
}

function getActionLabel(action) {
    const map = {
        'created': 'Created', 'attended': 'Attended', 'assigned': 'Assigned',
        'closed': 'Closed', 'rejected': 'Rejected', 'replied': 'Replied', 'forwarded': 'Forwarded'
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
    
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCurrentHandler(msg) {
    if (msg.status === 'closed') return null;
    
    if (msg.assignedTo && msg.assignedTo.length > 0) {
        if (msg.assignedNames && msg.assignedNames.length > 0) {
            return { name: msg.assignedNames[0], isPending: true };
        }
    }
    
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

// ================= 11. COMPOSE MAIL =================
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

    // 🆕 Rekebisha hapa: Weka try...catch
    if (allMailUsers.length === 0) {
        try {
            const users = await API.getUsers();
            const currentUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== currentUser.userId && u.role !== 'SuperAdmin');
        } catch (err) {
            console.error("Failed to load users:", err);
            // 🆕 Onyesha taarifa kwa mtumiaji
            showToast('⚠ Imeshindwa kupata orodha ya watumiaji. Unaweza kuandika jina mwenyewe.', 'warning');
        }
    }

    setupMailSearch('sendTo');
    setupMailSearch('cc');
}
function closeComposeModal() {
    document.getElementById('composeMailModal').classList.remove('show');
}

function setupMailSearch(type) {
    const input = document.getElementById(`${type}Input`);
    const dropdown = document.getElementById(`${type}Dropdown`);

    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('focus', () => {
        dropdown.classList.add('show');
        renderDropdown(type, '');
    });

    newInput.addEventListener('input', function() {
        dropdown.classList.add('show');
        renderDropdown(type, this.value.toLowerCase().trim());
    });

    newInput.addEventListener('blur', function() {
        setTimeout(() => { dropdown.classList.remove('show'); }, 200);
    });
}

function renderDropdown(type, query) {
    const dropdown = document.getElementById(`${type}Dropdown`);
    const selected = type === 'sendTo' ? selectedSendTo : selectedCC;

    let filtered = allMailUsers.filter(u => !selected.find(s => s.id === u.id));
    
    if (query) {
        filtered = filtered.filter(u =>
            (u.fullName && u.fullName.toLowerCase().includes(query)) ||
            (u.role && u.role.toLowerCase().includes(query)) ||
            (u.department && u.department.toLowerCase().includes(query))
        );
    }

    if (filtered.length === 0) {
        dropdown.innerHTML = `<div class="ms-empty">No users found${query ? ` for "${esc(query)}"` : ''}</div>`;
        return;
    }

    dropdown.innerHTML = filtered.map(user => {
        const initials = user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const roleLabel = user.role || user.department || 'User';
        
        return `
            <div class="ms-user" onmousedown="event.preventDefault(); addTag('${user.id}', '${type}')">
                <div class="ms-avatar">${initials}</div>
                <div class="ms-user-info">
                    <div class="ms-user-name">${esc(user.fullName)}</div>
                    <div class="ms-user-role">${esc(roleLabel)}</div>
                </div>
            </div>
        `;
    }).join('');
}

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

    box.querySelectorAll('.ms-tag').forEach(tag => tag.remove());

    selected.forEach(user => {
        const tag = document.createElement('div');
        tag.className = 'ms-tag';
        tag.innerHTML = `
            ${esc(user.fullName.split(' ')[0])}
            <button class="rm" onclick="event.stopPropagation(); removeTag('${user.id}', '${type}')">✕</button>
        `;
        box.insertBefore(tag, input);
    });
}

function handleMailAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('mailAttachList');

    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            modernToast('Too Large', `${file.name} is too large (max 10MB)`, 'error');
            return;
        }
        if (currentMailAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentMailAttachments.push(file);
    });

    list.innerHTML = currentMailAttachments.map((file, index) => `
        <div class="mc-attach-chip">
            <span>📎</span>
            <span>${file.name}</span>
            <button onclick="event.stopPropagation(); removeMailAttachment(${index})" class="rm">✕</button>
        </div>
    `).join('');
    event.target.value = '';
}

function removeMailAttachment(index) {
    currentMailAttachments.splice(index, 1);
    document.getElementById('mailAttachList').innerHTML = currentMailAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMailAttachment(${idx})" class="rm">✕</button></div>
    `).join('');
}

async function sendMail() {
    const subject = document.getElementById('mailSubject').value.trim();
    const body = document.getElementById('mailBody').value.trim();
    const type = document.getElementById('mailType').value;
    const priority = document.getElementById('mailPriority').value;
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

        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        modernToast('✅ Sent', 'Message sent successfully!', 'success');
        closeModal('composeMailModal');
        loadMailBadges();
        if (currentMailBoxType === 'sent') loadMailboxMessages('sent');
        
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

// ================= 12. MINUTE COMPOSE =================
let currentMinuteAttachments = [];

async function openMinuteComposeModal() {
    document.getElementById('minuteSubject').value = '';
    document.getElementById('minuteBody').value = '';
    currentMinuteAttachments = [];
    document.getElementById('minuteAttachList').innerHTML = '';
    
    const select = document.getElementById('minuteAssignTo');
    select.innerHTML = '<option value="">-- Select Person --</option>';
    
    // 🆕 Rekebisha hapa: Weka try...catch
    if (allMailUsers.length === 0) {
        try {
            const users = await API.getUsers();
            const curUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== curUser.userId && u.role !== 'SuperAdmin');
        } catch (err) {
            console.error("Failed to load users:", err);
            showToast('⚠ Imeshindwa kupata orodha ya watumiaji.', 'warning');
        }
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
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMinuteAttachment(${index})" class="rm">✕</button></div>
    `).join('');
    event.target.value = '';
}

function removeMinuteAttachment(index) {
    currentMinuteAttachments.splice(index, 1);
    document.getElementById('minuteAttachList').innerHTML = currentMinuteAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeMinuteAttachment(${idx})" class="rm">✕</button></div>
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

// ================= 13. ATTEND MODAL =================
let currentAttendAttachments = [];

async function openAttendModal(mailId) {
    let modal = document.getElementById('attendMailModal');
    if (modal) modal.classList.remove('show');
    
    let msg = window.mailCache && window.mailCache[mailId] ? window.mailCache[mailId] : null;
    
    const subjectEl = document.getElementById('attendMailSubject');
    if (subjectEl) subjectEl.textContent = msg ? esc(msg.subject || '(No Subject)') : 'Message';

    document.getElementById('attendComment').value = '';
    document.getElementById('attendAttachList').innerHTML = '';
    currentAttendAttachments = [];

    const select = document.getElementById('attendAssignTo');
    select.innerHTML = '<option value="">-- No assignment, just comment --</option>';
    
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

    document.getElementById('attendMailModal').classList.add('show');
}

function handleAttendAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('attendAttachList');

    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            modernToast('Too Large', `${file.name} ni kubwa mno (Max 10MB)`, 'error');
            return;
        }
        if (currentAttendAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentAttendAttachments.push(file);
    });

    list.innerHTML = currentAttendAttachments.map((file, index) => `
        <div class="mail-attachment-item">
            <span>📎</span>
            <span style="font-weight:600; color:#334155;">${file.name}</span>
            <button onclick="event.stopPropagation(); removeAttendAttachment(${index})" class="remove-attach">✕</button>
        </div>
    `).join('');
    
    event.target.value = '';
}

function removeAttendAttachment(index) {
    currentAttendAttachments.splice(index, 1);
    document.getElementById('attendAttachList').innerHTML = currentAttendAttachments.map((file, idx) => `
        <div class="mail-attachment-item">
            <span>📎</span>
            <span style="font-weight:600; color:#334155;">${file.name}</span>
            <button onclick="event.stopPropagation(); removeAttendAttachment(${idx})" class="remove-attach">✕</button>
        </div>
    `).join('');
}

async function submitAttend(mailId) {
    if (!mailId) mailId = currentMailId;

    const commentInput = document.getElementById('attendComment');
    const comment = (commentInput?.value || '').trim();
    const assignToVal = document.getElementById('attendAssignTo')?.value;
    const assignTo = assignToVal ? [parseInt(assignToVal)] : [];
    const btn = document.getElementById('attendSubmitBtn');

    if (!comment && assignTo.length === 0) {
        modernToast('Required', 'Tafadhali andika maoni au chagua mtu wa kumsuluhisha.', 'warning');
        commentInput?.focus();
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Processing...';
    btn.style.opacity = '0.7';

    try {
        let attachmentData = [];
        if (currentAttendAttachments.length > 0) {
            const promises = currentAttendAttachments.map(file => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
                reader.readAsDataURL(file);
            }));
            attachmentData = await Promise.all(promises);
        }

        await API.attendMail(mailId, { comment, assignTo, attachments: attachmentData });

        modernToast('✅ Success', assignTo.length > 0 ? 'Maoni yamewekwa na ujumbe umeelekezwa.' : 'Maoni yamewekwa.', 'success');

        document.getElementById('attendMailModal')?.classList.remove('show');

        if (window.mailCache && window.mailCache[mailId]) delete window.mailCache[mailId];
        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        await viewMailDetail(mailId);
        loadMailBadges();
        if (currentMailBoxType) loadMailboxMessages(currentMailBoxType);

    } catch (err) {
        console.error('Attend error:', err);
        modernToast('Failed', err.message || 'Haikuweza kutuma.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        btn.style.opacity = '1';
    }
}

// ================= 14. CLOSE WORKFLOW =================
let currentCloseAttachments = [];

async function closeCurrentMail() {
    if (!currentMailId) return;
    
    let modal = document.getElementById('closeWorkflowModal');
    if (modal) modal.classList.remove('show');
    
    let msg = window.mailCache && window.mailCache[currentMailId] ? window.mailCache[currentMailId] : null;
    
    const subjectEl = document.getElementById('closeMailSubject');
    if (subjectEl) subjectEl.textContent = msg ? esc(msg.subject || '(No Subject)') : 'Message';

    document.getElementById('closeComment').value = '';
    document.getElementById('closeAttachList').innerHTML = '';
    currentCloseAttachments = [];

    const select = document.getElementById('closeAssignTo');
    select.innerHTML = '<option value="">-- No assignment, just close --</option>';
    
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

    document.getElementById('closeWorkflowModal').classList.add('show');
}

function handleCloseAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('closeAttachList');

    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            modernToast('Too Large', `${file.name} ni kubwa mno (Max 10MB)`, 'error');
            return;
        }
        if (currentCloseAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentCloseAttachments.push(file);
    });

    list.innerHTML = currentCloseAttachments.map((file, index) => `
        <div class="mail-attachment-item">
            <span>📎</span>
            <span style="font-weight:600; color:#334155;">${file.name}</span>
            <button onclick="event.stopPropagation(); removeCloseAttachment(${index})" class="remove-attach">✕</button>
        </div>
    `).join('');
    
    event.target.value = '';
}

function removeCloseAttachment(index) {
    currentCloseAttachments.splice(index, 1);
    document.getElementById('closeAttachList').innerHTML = currentCloseAttachments.map((file, idx) => `
        <div class="mail-attachment-item">
            <span>📎</span>
            <span style="font-weight:600; color:#334155;">${file.name}</span>
            <button onclick="event.stopPropagation(); removeCloseAttachment(${idx})" class="remove-attach">✕</button>
        </div>
    `).join('');
}

async function submitCloseWorkflow() {
    const commentInput = document.getElementById('closeComment');
    const comment = (commentInput?.value || '').trim();
    const assignToVal = document.getElementById('closeAssignTo')?.value;
    const assignTo = assignToVal ? [parseInt(assignToVal)] : [];
    const btn = document.getElementById('closeSubmitBtn');

    if (!comment) {
        modernToast('Required', 'Tafadhali andika kile kilichofanyika kabla ya kufunga.', 'warning');
        commentInput?.focus();
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Closing...';
    btn.style.opacity = '0.7';

    try {
        let attachmentData = [];
        if (currentCloseAttachments.length > 0) {
            const promises = currentCloseAttachments.map(file => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve({ name: file.name, type: file.type, size: file.size, data: e.target.result });
                reader.readAsDataURL(file);
            }));
            attachmentData = await Promise.all(promises);
        }

        await API.closeMail(currentMailId, { comment, assignTo, attachments: attachmentData });

        modernToast('✅ Success', 'Workflow imefungwa kikamilifu.', 'success');

        document.getElementById('closeWorkflowModal')?.classList.remove('show');

        if (window.mailCache && window.mailCache[currentMailId]) delete window.mailCache[currentMailId];
        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        await viewMailDetail(currentMailId);
        loadMailBadges();
        if (currentMailBoxType) loadMailboxMessages(currentMailBoxType);

    } catch (err) {
        console.error('Close error:', err);
        modernToast('Failed', err.message || 'Haikuweza kufunga.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        btn.style.opacity = '1';
    }
}

// ================= 15. REPLY =================
async function openReplyModal(originalId) {
    const msg = await API.getInternalMailById(originalId);
    if (!msg) return;

    let modal = document.getElementById('replyMailModal');
    if (modal) modal.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="replyMailModal">
            <div class="modal-box" style="max-width: 600px; padding: 0; overflow: hidden; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, #022908, #034d13); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800;">↩️ Reply: ${esc(msg.subject)}</h3>
                    <button onclick="document.getElementById('replyMailModal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <div style="padding: 24px; background: #f8fafc;">
                    <textarea id="replyBody" rows="6" placeholder="Write your reply here..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
                </div>
                <div style="padding: 16px 24px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="document.getElementById('replyMailModal').remove()" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e1; border-radius: 8px; font-weight: 700; cursor: pointer;">Cancel</button>
                    <button onclick="submitReply('${originalId}')" style="padding: 10px 24px; background: linear-gradient(135deg, #022908, #034d13); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer;">📤 Send Reply</button>
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

        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        if (window.mailCache && window.mailCache[originalId]) {
            delete window.mailCache[originalId];
        }

        modernToast('✅ Sent', 'Reply sent successfully!', 'success');
        document.getElementById('replyMailModal').remove();
        loadMailBadges();
        if (currentMailId == originalId) viewMailDetail(originalId);
    } catch (err) {
        modernToast('Error', err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}

// ================= 16. STAR / ARCHIVE / DELETE =================
async function toggleStarCurrentMail() {
    if (!currentMailId) return;
    try {
        const res = await API.starMail(currentMailId);
        document.getElementById('btnStarMail').textContent = res.isStarred ? '⭐' : '☆';
        modernToast('Star Updated', res.isStarred ? 'Message starred' : 'Star removed', 'success');
        loadMailboxMessages(currentMailBoxType);
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

// ================= 17. REFRESH =================
function refreshCurrentMailbox() {
    if (!currentMailBoxType) return;
    delete mailListCache[currentMailBoxType];
    delete mailListCacheTime[currentMailBoxType];
    loadMailboxMessages(currentMailBoxType);
    modernToast('🔄 Refreshed', `${currentMailBoxType} reloaded.`, 'info');
}

// ================= 18. POLLING =================
setInterval(() => {
    if (typeof switchTab!== 'undefined' && document.getElementById('tab-mail-center')?.classList.contains('active')) {
        loadMailBadges();
    }
}, 30000);

// ================= 19. HOOK INTO switchTab=================
(function hookMailCenter() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__mailHooked) return;
    const wrapped = function(tabId, event) {
        const result = _orig.call(this, tabId, event);
        if (tabId === 'tab-mail-center') {
            if (!document.getElementById('tab-mail-center').classList.contains('active')) {
                switchMailBox('inbox');
            }
        }
        return result;
    };
    wrapped.__mailHooked = true;
    window.switchTab= wrapped;
})();