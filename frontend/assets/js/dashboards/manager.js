// ================================================================
// MAK DC INVESTMENT — MANAGER DASHBOARD (COMPLETE)
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

// ================================================================
// LOAD MANAGER DASHBOARD
// ================================================================
async function loadManagerDashboard() {
    try {
        showLoadingInEl('overviewContent', 'Loading dashboard data...');

        const [orders, users, employees, payrolls] = await Promise.all([
            API.getOrders().catch(() => []),
            API.getUsers().catch(() => []),
            API.getEmployees().catch(() => []),
            API.getPayrolls().catch(() => [])   
        ]);

        const totalStaff = (users || []).length + (employees || []).length;

        setElText('statBudgets', 0);
        setElText('statProjects', (orders || []).length);
        setElText('statTotalBudget', 'TSh 0');
        setElText('statStaff', totalStaff);

        setElText('navStaffBadge', totalStaff);
        setElText('staffBadge', totalStaff);

        // ✅ Update Payroll Badge
        const pendingPayrolls = (payrolls || []).filter(p => p.status === 'pending-manager').length;
        setElText('navPayrollBadge', pendingPayrolls);

        renderManagerOverview(orders || [], users || [], employees || []);

        // Load accounts + payments
        loadManagerCompanyAccounts();
        loadManagerCompanyPayments();

    } catch (err) {
        console.error('Manager dashboard error:', err);
        showErrorInEl('overviewContent', 'Failed to load dashboard data: ' + err.message);
    }
}

// ================================================================
// RENDER OVERVIEW
// ================================================================
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

// ================================================================
// TAB SWITCHING
// ================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.sidebar-nav a').forEach(link => link.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    const sidebarLink = document.querySelector(`.sidebar-nav a[onclick*="${tabId}"]`);
    if (sidebarLink) sidebarLink.classList.add('active');

    if (tabId === 'tab1') loadManagerDashboard();
    if (tabId === 'tab9') loadStaffList();
    if (tabId === 'tab-accounts') loadManagerCompanyAccounts();
    if (tabId === 'tab-company-payments') loadManagerCompanyPayments();
    if (tabId === 'tab-payroll') loadManagerPayrolls();  
    if (tabId === 'tab-fund-transfer') loadManagerFundTransfers();
    if (tabId === 'tab-procurement-approvals') loadManagerProcurementApprovals();
    if (window.innerWidth <= 768) closeSidebar();
}
// ================================================================
// LOAD STAFF LIST
// ================================================================
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
            showEmptyInEl('staffListContainer', '👥', 'No Staff Found', 'Staff will appear here.');
            return;
        }

        container.innerHTML = `
            <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
                <div style="display:grid;grid-template-columns:50px 1.5fr 1.2fr 1fr 1fr 1fr 100px 140px;gap:12px;padding:12px 18px;background:var(--gray-50);border-bottom:2px solid var(--gray-200);font-size:10px;font-weight:800;color:var(--gray-500);text-transform:uppercase;letter-spacing:1px;">
                    <span>#</span><span>Name</span><span>Position</span><span>Department</span>
                    <span>Contact</span><span>Type</span><span>Status</span>
                    <span style="text-align:center;">Actions</span>
                </div>
                ${allStaff.map((person, i) => `
                    <div style="display:grid;grid-template-columns:50px 1.5fr 1.2fr 1fr 1fr 1fr 100px 140px;gap:12px;padding:14px 18px;border-bottom:1px solid var(--gray-100);align-items:center;">
                        <span style="font-weight:800;color:var(--gold);font-size:13px;">${String(i + 1).padStart(2, '0')}</span>
                        <div>
                            <div style="font-weight:700;color:var(--gray-800);font-size:13px;">${esc(person.fullName)}</div>
                            <div style="font-family:'Courier New',monospace;font-size:11px;color:var(--primary);font-weight:700;">${esc(person.employeeId)}</div>
                        </div>
                        <span style="font-size:12px;color:var(--gray-700);font-weight:600;">${esc(person.position)}</span>
                        <span style="font-size:11px;color:var(--gray-600);">${esc(person.department)}</span>
                        <span style="font-size:11px;color:var(--gray-500);">${esc(person.email || person.phone || '—')}</span>
                        <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:8px;background:${person.source === 'user' ? 'rgba(139,92,246,0.15)' : 'rgba(20,184,166,0.15)'};color:${person.source === 'user' ? '#6d28d9' : '#0d9488'};text-transform:uppercase;text-align:center;">${esc(person.type)}</span>
                        <span style="font-size:9px;font-weight:800;padding:4px 8px;border-radius:12px;background:${person.status === 'Active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${person.status === 'Active' ? 'var(--green)' : 'var(--red)'};text-align:center;text-transform:uppercase;">${esc(person.status)}</span>
                        <div style="display:flex;gap:4px;justify-content:center;">
                            ${person.source === 'employee' ? `
                                <button onclick="editEmployee('${person.employeeId}')" style="padding:5px 10px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🖋️ Edit</button>
                                <button onclick="deleteEmployee('${person.employeeId}')" style="padding:5px 10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">🗑️</button>
                            ` : `<span style="font-size:10px;color:var(--gray-400);font-style:italic;">Read-only</span>`}
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

// ================================================================
// ADD / EDIT EMPLOYEE
// ================================================================
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

// ================================================================
// COMPANY ACCOUNTS APPROVAL (MANAGER) — API only
// ================================================================
async function loadManagerCompanyAccounts() {
    const container = document.getElementById('managerAccountsContainer');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading accounts...</div>';

    try {
        const accounts = await API.getAccounts().catch(() => []);
        const safeAccounts = Array.isArray(accounts) ? accounts : [];

        // Manager anaona: pending-manager, pending-ceo, approved (read-only)
        const relevant = safeAccounts.filter(a =>
            a.status === 'pending' ||
            a.status === 'pending-manager' ||
            a.status === 'pending-ceo' ||
            a.status === 'approved'
        );

        relevant.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        // Badge
        const pendingCount = safeAccounts.filter(a => a.status === 'pending' || a.status === 'pending-manager').length;
        setElText('managerSidebarAccountsBadge', pendingCount);

        if (relevant.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;color:var(--gray-400);">
                    <span style="font-size:50px;display:block;margin-bottom:12px;">🏦</span>
                    <div style="font-size:16px;font-weight:700;">No Accounts Pending</div>
                    <div style="font-size:13px;">Accounts from Finance will appear here.</div>
                </div>
            `;
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

            let actions = `<button onclick="viewManagerAccountDetails('${acc.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">👁 View</button>`;

            if ((acc.status === 'pending' || acc.status === 'pending-manager') && isManager) {
                actions += `<button onclick="managerVerifyAccount('${acc.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">✅ Verify</button>`;
                actions += `<button onclick="managerRejectAccount('${acc.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">❌ Reject</button>`;
            }

            if (acc.status === 'approved') {
                actions += `<span style="font-size:11px;color:var(--gray-500);font-style:italic;padding:6px 10px;background:var(--gray-100);border-radius:6px;display:inline-flex;align-items:center;gap:4px;">🔒 Locked</span>`;
            }

            return `
                <div style="border:1.5px solid var(--gray-200);border-left:4px solid ${sInfo.color};border-radius:12px;padding:16px 20px;margin-bottom:12px;background:white;${acc.status === 'approved' ? 'background:linear-gradient(90deg,rgba(34,197,94,0.04),transparent);' : ''}">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                        <span style="font-weight:700;color:var(--primary);font-size:15px;">${typeIcon} ${esc(acc.name)}</span>
                        <span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;background:${sInfo.bg};color:${sInfo.color};text-transform:uppercase;">${sInfo.icon} ${sInfo.label}</span>
                    </div>
                    <div style="font-size:12px;color:var(--gray-600);font-family:monospace;">${esc(acc.accountNumber)}</div>
                    ${acc.bankName ? `<div style="font-size:11px;color:var(--gray-500);margin-top:2px;">🏛️ ${esc(acc.bankName)}${acc.branch ? ' — ' + esc(acc.branch) : ''}</div>` : ''}
                    <div style="font-size:11px;color:var(--gray-500);margin-top:6px;">📅 Created: ${createdDate} • 👤 ${esc(acc.createdBy || acc.requester?.fullName || '—')}</div>
                    <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">${actions}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Manager accounts error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
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

        // ✅ Tumia API.verifyAccount
        await API.verifyAccount(id, {
            managerVerifiedBy: currentUser?.fullName || 'Manager'
        });

        modernToast('✅ Verified', `Account "${acc.name}" sent to CEO.`, 'success');
        await loadManagerCompanyAccounts();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
// Manager: Reject account → API
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
        await API.verifyAccount(id, {
            managerVerifiedBy: currentUser?.fullName || 'Manager'
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

    // ✅ Tumia inline styles — hazitegemei CSS ya nje
    const rowStyle = 'display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--gray-100);gap:16px;align-items:flex-start;';
    const labelStyle = 'font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;flex-shrink:0;';
    const valueStyle = 'font-size:13.5px;font-weight:600;color:#1e293b;text-align:right;word-break:break-word;max-width:60%;';

    document.getElementById('managerAccountViewBody').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${sInfo.bg};border-radius:10px;border-left:4px solid ${sInfo.color};">
            <div style="font-size:12px;font-weight:700;color:${sInfo.color};text-transform:uppercase;">Status</div>
            <div style="font-size:14px;font-weight:800;color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
        </div>
        <div style="${rowStyle}">
            <span style="${labelStyle}">Account Name</span>
            <span style="${valueStyle}">${esc(acc.name)}</span>
        </div>
        <div style="${rowStyle}">
            <span style="${labelStyle}">Account Number</span>
            <span style="${valueStyle}font-family:monospace;">${esc(acc.accountNumber)}</span>
        </div>
        <div style="${rowStyle}">
            <span style="${labelStyle}">Type</span>
            <span style="${valueStyle}">${esc(acc.type || '—')}</span>
        </div>
        ${acc.bankName ? `
        <div style="${rowStyle}">
            <span style="${labelStyle}">Bank</span>
            <span style="${valueStyle}">${esc(acc.bankName)}</span>
        </div>` : ''}
        ${acc.branch ? `
        <div style="${rowStyle}">
            <span style="${labelStyle}">Branch</span>
            <span style="${valueStyle}">${esc(acc.branch)}</span>
        </div>` : ''}
        <div style="${rowStyle}">
            <span style="${labelStyle}">Currency</span>
            <span style="${valueStyle}">${esc(acc.currency || 'TZS')}</span>
        </div>
        <div style="${rowStyle}">
            <span style="${labelStyle}">Balance</span>
            <span style="${valueStyle}color:#0f766e;font-weight:800;">${acc.currency || 'TZS'} ${Number(acc.balance || 0).toLocaleString()}</span>
        </div>
       <div style="${rowStyle}">
            <span style="${labelStyle}">Created By</span>
            <span style="${valueStyle}">${esc(acc.createdBy || acc.requester?.fullName || '—')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;gap:16px;align-items:flex-start;">
            <span style="${labelStyle}">Created At</span>
            <span style="${valueStyle}">${acc.createdAt ? new Date(acc.createdAt).toLocaleString() : '—'}</span>
        </div>
        ${acc.notes ? `
        <div style="margin-top:14px;padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #0f766e;font-size:13px;color:#334155;line-height:1.6;">
            <strong style="display:block;margin-bottom:4px;color:#0f766e;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Notes</strong>
            ${esc(acc.notes)}
        </div>` : ''}
        ${acc.rejectionReason ? `
        <div style="margin-top:14px;padding:12px 16px;background:rgba(239,68,68,0.08);border-radius:8px;border-left:3px solid #ef4444;font-size:13px;color:#7f1d1d;line-height:1.6;">
            <strong style="display:block;margin-bottom:4px;color:#dc2626;font-size:11px;text-transform:uppercase;letter-spacing:0.8px;">Rejection Reason</strong>
            ${esc(acc.rejectionReason)}
        </div>` : ''}
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

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading payments...</div>';

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
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#ef4444;">Error: ${esc(err.message)}</div>`;
    }
}

function renderManagerPaymentStats() {
    const pm = allCompanyPayments.filter(p => p.status === 'pending-manager');
    const ap = allCompanyPayments.filter(p => p.status === 'pending-ceo');
    const rej = allCompanyPayments.filter(p => p.status === 'rejected' && p.rejectedBy === 'Manager');
    const total = allCompanyPayments.length;

    const sum = arr => arr.reduce((s, p) => s + Number(p.amount || 0), 0);
    const fmt = n => 'TSh ' + Number(n).toLocaleString();

    if (typeof setElText === 'function') {
        setElText('navManagerPaymentsBadge', pm.length);
    }

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
            <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;opacity:0.5;">💸</span>
                <div style="font-size:17px;font-weight:800;color:var(--gray-600);margin-bottom:6px;">
                    ${allCompanyPayments.length === 0 ? 'No Company Payments Yet' : 'No Payments Match Filter'}
                </div>
                <div style="font-size:13px;">
                    ${allCompanyPayments.length === 0 ? 'Payments sent by Finance will appear here.' : 'Try a different filter.'}
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(p => {
        const typeInfo = getCPTypeInfo(p.type);
        const statusInfo = getCPStatusInfo(p.status);
        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        let actions = `<button onclick="viewManagerPayment('${p.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.1);color:#0f1f3d;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">👁 View</button>`;

        if (p.status === 'pending-manager') {
            actions += `<button onclick="managerVerifyPayment('${p.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">✅ Verify</button>`;
            actions += `<button onclick="managerRejectPayment('${p.id}')" style="padding:8px 14px;background:rgba(239,68,68,0.1);color:#dc2626;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">❌ Reject</button>`;
        }

        return `
            <div style="background:white;border:1.5px solid var(--gray-200);border-radius:12px;padding:18px 20px;margin-bottom:12px;transition:all 0.25s;border-left:4px solid ${statusInfo.color};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                            <span style="font-family:monospace;font-weight:800;color:#0f1f3d;font-size:14px;">${esc(p.reference || '—')}</span>
                            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(15,31,61,0.12);color:#0f1f3d;">${typeInfo.icon} ${typeInfo.label}</span>
                            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:${statusInfo.bg};color:${statusInfo.color};">${statusInfo.icon} ${statusInfo.label}</span>
                        </div>
                        <div style="font-size:15px;font-weight:800;color:var(--gray-800);margin-bottom:4px;">${esc(p.vendor || '—')}</div>
                        ${p.description ? `<div style="font-size:13px;color:var(--gray-600);line-height:1.5;margin-bottom:8px;">${esc(p.description)}</div>` : ''}
                        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--gray-500);margin-bottom:12px;">
                            <span>📅 Created: <strong style="color:var(--gray-700);">${createdDate}</strong></span>
                            ${p.dueDate ? `<span>⏰ Due: <strong style="color:var(--gray-700);">${new Date(p.dueDate).toLocaleDateString('en-GB')}</strong></span>` : ''}
                            <span>👤 By: <strong style="color:var(--gray-700);">${esc(p.createdBy || '—')}</strong></span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:22px;font-weight:900;color:#0f1f3d;font-family:'Courier New',monospace;">TSh ${Number(p.amount || 0).toLocaleString()}</div>
                    </div>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">${actions}</div>
            </div>
        `;
    }).join('');
}

function filterManagerPayments(status) {
    currentManagerCPFilter.status = status;
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

    p.status = 'pending-ceo';
    p.managerVerifiedAt = new Date().toISOString();
    p.managerVerifiedBy = currentUser?.fullName || 'Manager';

    try {
        await persistManagerPayment(p);
        
        // 🆕 Sasisha Procurement Request husika iende kwa CEO
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

    p.status = 'rejected';
    p.rejectedAt = new Date().toISOString();
    p.rejectedBy = 'Manager';
    p.rejectionReason = res.reason;

    try {
        await persistManagerPayment(p);
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

    const saveBtn = document.querySelector('#editProfileModal .btn-submit');
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
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray-400);">⏳ ${message}</div>`;
}

function showEmptyInEl(id, icon, title, desc) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--gray-400);">
            <span style="font-size:50px;display:block;margin-bottom:12px;">${icon}</span>
            <div style="font-size:16px;font-weight:700;color:var(--gray-600);margin-bottom:6px;">${title}</div>
            <div style="font-size:13px;">${desc}</div>
        </div>
    `;
}

function showErrorInEl(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--red);">
            <span style="font-size:50px;display:block;margin-bottom:12px;">❌</span>
            <div style="font-size:16px;font-weight:700;margin-bottom:6px;">Error</div>
            <div style="font-size:13px;">${esc(message)}</div>
        </div>
    `;
}
// ================================================================
// PAYROLL — MANAGER (API ONLY)
// ================================================================

async function loadManagerPayrolls() {
    const container = document.getElementById('managerPayrollsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading payrolls...</div>';

    try {
        const payrolls = await API.getPayrolls();
        const pending = payrolls.filter(p => p.status === 'pending-manager');

        const badge = document.getElementById('navPayrollBadge');
        if (badge) badge.textContent = pending.length;

        const countBadge = document.getElementById('mgrPayrollCountBadge');
        if (countBadge) countBadge.textContent = pending.length + ' Pending';

        if (pending.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px;color:var(--gray-400);">
                    <span style="font-size:56px;display:block;margin-bottom:14px;">💸</span>
                    <div style="font-size:17px;font-weight:800;">No Payrolls Pending</div>
                    <div style="font-size:13px;">Payrolls sent by Finance will appear here.</div>
                </div>`;
            return;
        }

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        container.innerHTML = pending.map(p => `
            <div style="background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; border-left: 4px solid #f59e0b; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <div style="font-family: monospace; font-weight: 800; color: #0f1f3d; font-size: 14px;">${esc(p.payrollId)}</div>
                        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 4px;">
                            ${monthNames[p.month - 1]} ${p.year}
                        </div>
                        <div style="font-size: 12px; color: #64748b;">👥 ${p.items?.length || 0} employees</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: 900; color: #0f1f3d; font-family: monospace;">
                            TSh ${Number(p.totalAmount).toLocaleString()}
                        </div>
                    </div>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button onclick="viewManagerPayroll('${p.id}')" class="btn-action blue">👁 View</button>
                    <button onclick="managerVerifyPayroll('${p.id}')" class="btn-action green">✅ Verify & Send to CEO</button>
                    <button onclick="managerRejectPayroll('${p.id}')" class="btn-action red">❌ Reject</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(error.message)}</div>`;
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
        if (!p) return;

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const body = `
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
        `;

        let modal = document.getElementById('managerPayrollDetailModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="managerPayrollDetailModal">
                    <div class="modal-box" style="max-width:720px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                        <div style="background:linear-gradient(135deg,#0f1f3d,#1a3a6b);padding:18px 24px;color:white;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">💸 Payroll Details</h3>
                            <button onclick="closeModal('managerPayrollDetailModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                        <div id="managerPayrollDetailBody" style="padding:20px 24px;overflow-y:auto;flex:1;"></div>
                        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
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
// ================================================================
// PAYROLL — MANAGER (API ONLY)
// ================================================================

async function loadManagerPayrolls() {
    const container = document.getElementById('managerPayrollsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading payrolls...</div>';

    try {
        const payrolls = await API.getPayrolls();
        const pending = payrolls.filter(p => p.status === 'pending-manager');

        const badge = document.getElementById('navPayrollBadge');
        if (badge) badge.textContent = pending.length;

        const countBadge = document.getElementById('mgrPayrollCountBadge');
        if (countBadge) countBadge.textContent = pending.length + ' Pending';

        if (pending.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px;color:var(--gray-400);">
                    <span style="font-size:56px;display:block;margin-bottom:14px;">💸</span>
                    <div style="font-size:17px;font-weight:800;">No Payrolls Pending</div>
                    <div style="font-size:13px;">Payrolls sent by Finance will appear here.</div>
                </div>`;
            return;
        }

        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        container.innerHTML = pending.map(p => `
            <div style="background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; border-left: 4px solid #f59e0b; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <div style="font-family: monospace; font-weight: 800; color: #0f1f3d; font-size: 14px;">${esc(p.payrollId)}</div>
                        <div style="font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 4px;">
                            ${monthNames[p.month - 1]} ${p.year}
                        </div>
                        <div style="font-size: 12px; color: #64748b;">👥 ${p.items?.length || 0} employees</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: 900; color: #0f1f3d; font-family: monospace;">
                            TSh ${Number(p.totalAmount).toLocaleString()}
                        </div>
                    </div>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button onclick="viewManagerPayroll('${p.id}')" class="btn-action blue">👁 View</button>
                    <button onclick="managerVerifyPayroll('${p.id}')" class="btn-action green">✅ Verify & Send to CEO</button>
                    <button onclick="managerRejectPayroll('${p.id}')" class="btn-action red">❌ Reject</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('loadManagerPayrolls error:', error);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(error.message)}</div>`;
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
// 🆕 FUND TRANSFER — MANAGER
// ================================================================

let allManagerFundTransfers = [];

async function loadManagerFundTransfers() {
    const container = document.getElementById('managerFundTransfersContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading transfers...</div>';

    try {
        const transfers = await API.getFundTransfers();
        allManagerFundTransfers = Array.isArray(transfers) ? transfers : [];
        allManagerFundTransfers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        // Filter for pending-manager
        const pending = allManagerFundTransfers.filter(t => t.status === 'pending-manager');

        // Update badges
        const navBadge = document.getElementById('navFundTransferBadge');
        if (navBadge) navBadge.textContent = pending.length;

        const countBadge = document.getElementById('mgrFundTransferCountBadge');
        if (countBadge) countBadge.textContent = pending.length + ' Pending';

        renderManagerFundTransfersList(pending);

    } catch (err) {
        console.error('❌ loadManagerFundTransfers error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

function renderManagerFundTransfersList(transfers) {
    const container = document.getElementById('managerFundTransfersContainer');
    if (!container) return;

    if (transfers.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;">💸</span>
                <div style="font-size:17px;font-weight:800;">No Transfers Pending</div>
                <div style="font-size:13px;">Transfers sent by Finance will appear here.</div>
            </div>`;
        return;
    }

    container.innerHTML = transfers.map(t => {
        const createdDate = t.createdAt ? new Date(t.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        return `
            <div style="background:white;border:1.5px solid var(--gray-200);border-radius:12px;padding:18px 20px;margin-bottom:12px;transition:all 0.25s;border-left:4px solid #f59e0b;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                            <span style="font-family:'Courier New',monospace;font-weight:800;color:#0f1f3d;font-size:14px;">${esc(t.transferId)}</span>
                            <span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(245,158,11,0.15);color:#d97706;">🟡 Pending Manager</span>
                        </div>
                        ${t.reason ? `<div style="font-size:13px;color:var(--gray-600);line-height:1.5;margin-bottom:8px;">${esc(t.reason)}</div>` : ''}
                        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--gray-500);margin-bottom:12px;">
                            <span>📅 Created: <strong style="color:var(--gray-700);">${createdDate}</strong></span>
                            <span>👤 By: <strong style="color:var(--gray-700);">${esc(t.createdBy || '—')}</strong></span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:22px;font-weight:900;color:#0f1f3d;font-family:'Courier New',monospace;">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:10px 0;padding:12px 16px;background:var(--gray-50);border-radius:10px;border:1px solid var(--gray-100);">
                    <div style="flex:1;min-width:180px;">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📤 From</div>
                        <div style="font-size:13px;font-weight:800;color:#1e293b;">${esc(t.fromAccount?.name || '—')}</div>
                        <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px;">${esc(t.fromAccount?.accountNumber || '')}</div>
                    </div>
                    <div style="font-size:20px;color:#0f1f3d;font-weight:900;">→</div>
                    <div style="flex:1;min-width:180px;">
                        <div style="font-size:9px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📥 To</div>
                        <div style="font-size:13px;font-weight:800;color:#1e293b;">${esc(t.toAccount?.name || '—')}</div>
                        <div style="font-size:11px;font-family:monospace;color:#64748b;margin-top:2px;">${esc(t.toAccount?.accountNumber || '')}</div>
                    </div>
                </div>

                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;">
                    <button onclick="viewManagerFundTransfer('${t.id}')" style="padding:8px 14px;background:rgba(15,31,61,0.1);color:#0f1f3d;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">👁 View</button>
                    <button onclick="managerVerifyFundTransfer('${t.id}')" style="padding:8px 14px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">✅ Verify & Send to CEO</button>
                    <button onclick="managerRejectFundTransfer('${t.id}')" style="padding:8px 14px;background:rgba(239,68,68,0.1);color:#dc2626;border:none;border-radius:7px;cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;">❌ Reject</button>
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
// MANAGER: PROCUREMENT APPROVALS (With History)
// ================================================================
let mgrAllProcurementRequests = [];
let currentMgrProcFilter = 'pending-manager';

async function loadManagerProcurementApprovals() {
    const container = document.getElementById('procurementApprovalsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading requests...</div>';

    try {
        // 🆕 Tumia /all ili tupate history yote
        const all = await API.getProcurementRequests('/all');
        const list = Array.isArray(all) ? all : [];

        // Chuja: requests zilizopita kwa Manager (pending-manager au zaidi)
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

        // Update counts
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
        if (countBadge) countBadge.textContent = pending.length + ' Pending';

        // Update filter counts
        const elPending = document.getElementById('mgrProcPendingCount');
        const elApproved = document.getElementById('mgrProcApprovedCount');
        const elRejected = document.getElementById('mgrProcRejectedCount');
        if (elPending) elPending.textContent = pending.length ? `(${pending.length})` : '';
        if (elApproved) elApproved.textContent = approved.length ? `(${approved.length})` : '';
        if (elRejected) elRejected.textContent = rejected.length ? `(${rejected.length})` : '';

        renderManagerProcurementList();
    } catch (err) {
        console.error('loadManagerProcurementApprovals error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:#dc2626;">❌ ${esc(err.message)}</div>`;
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
            <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;opacity:0.5;">📭</span>
                <div style="font-size:17px;font-weight:800;color:var(--gray-600);margin-bottom:6px;">
                    ${currentMgrProcFilter === 'pending-manager' ? 'No Pending Requests' : currentMgrProcFilter === 'approved' ? 'No Approved Requests Yet' : currentMgrProcFilter === 'rejected' ? 'No Rejected Requests' : 'No Requests'}
                </div>
                <div style="font-size:13px;">Requests matching this filter will appear here.</div>
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

        // Status badge
        let statusBadge = '';
        if (isPending) {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(245,158,11,0.15);color:#d97706;">⏳ Pending Your Approval</span>`;
        } else if (isApproved) {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(34,197,94,0.15);color:#16a34a;">✅ Approved by You</span>`;
        } else if (isRejected) {
            statusBadge = `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;text-transform:uppercase;letter-spacing:0.8px;background:rgba(239,68,68,0.15);color:#dc2626;">❌ Rejected by You</span>`;
        }

        const borderColor = isPending ? '#f59e0b' : isApproved ? '#22c55e' : '#dc2626';

        // Actions: pending → buttons; approved/rejected → view only
        let actions = `<button onclick="viewManagerRequest(${r.id})"
                                style="padding:9px 18px;background:rgba(15,31,61,0.08);color:#0f1f3d;border:1.5px solid rgba(15,31,61,0.15);border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;"
                                onmouseover="this.style.background='rgba(15,31,61,0.15)'"
                                onmouseout="this.style.background='rgba(15,31,61,0.08)'">
                            👁️ View Details
                        </button>`;

        if (isPending) {
            actions += `<button onclick="managerApproveRequest(${r.id})"
                                style="padding:9px 18px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(34,197,94,0.3);transition:all 0.2s;"
                                onmouseover="this.style.transform='translateY(-2px)'"
                                onmouseout="this.style.transform='translateY(0)'">
                            ✅ Approve & Send to CEO
                        </button>
                        <button onclick="managerRejectRequest(${r.id})"
                                style="padding:9px 18px;background:rgba(239,68,68,0.1);color:#dc2626;border:1.5px solid rgba(239,68,68,0.2);border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;transition:all 0.2s;"
                                onmouseover="this.style.background='rgba(239,68,68,0.2)'"
                                onmouseout="this.style.background='rgba(239,68,68,0.1)'">
                            ❌ Reject
                        </button>`;
        }

        return `
            <div style="background:white;border:1.5px solid var(--gray-200);border-radius:14px;padding:20px 22px;margin-bottom:14px;transition:all 0.25s;border-left:4px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.04);${isApproved ? 'opacity:0.92;' : ''}"
                 onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)'"
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
// MANAGER: VIEW REQUEST DETAILS (Dynamic footer by status)
// ================================================================
async function viewManagerRequest(id) {
    try {
        const request = await API.getProcurementRequestById(id);

        const isPending = request.status === 'pending-manager';
        const isRejected = (request.status === 'returned' || request.status === 'rejected') && request.rejection_stage === 'manager';
        const isApproved = !isPending && !isRejected;

        // Rangi ya header kulingana na status
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

        // Update header
        const headerEl = document.getElementById('mgrProcViewHeader');
        if (headerEl) headerEl.style.background = headerGradient;

        document.getElementById('mgrProcViewTitle').textContent = headerTitle;
        document.getElementById('mgrProcViewSubtitle').textContent =
            `${request.request_number} • ${request.department} • ${request.requested_by}`;

        // Update body
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

        // 🆕 Dynamic footer
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

function showToast(message, type = 'success') {
    if (typeof Toast !== 'undefined' && typeof Toast[type] === 'function') {
        Toast[type](message);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}