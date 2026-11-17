// ================================================================
// MAK DC INVESTMENT — SUPER ADMIN DASHBOARD (FIXED)
// ================================================================

// ================================================================
// STATE
// ================================================================
let currentUser = null;
let currentContentKey = null;
let currentContentValue = '';
let currentProfilePic = null;
let currentLeaderId = null;
let currentProductId = null;
let currentTestimonialId = null;
let currentNewsId = null;
let currentProjectId = null;
let currentHeroId = null;
let currentStatId = null;

// ================================================================
// INITIALIZE DASHBOARD
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!Auth.requireSuperAdmin()) return;

    currentUser = Auth.getUser();
    updateUserInfo();
    renderUserDropdown();

    // Load overview stats
    await loadOverview();

    // Pre-load data zote ili "Loading..." isionekane
    Promise.all([
        loadSiteContent().catch(err => console.warn('Site content preload:', err)),
        loadTestimonials().catch(err => console.warn('Testimonials preload:', err)),
        loadNews().catch(err => console.warn('News preload:', err)),
        loadProjects().catch(err => console.warn('Projects preload:', err)),
        loadHeroSlides().catch(err => console.warn('Hero preload:', err)),
        loadStats().catch(err => console.warn('Stats preload:', err)),
        loadUsers().catch(err => console.warn('Users preload:', err)),
        loadLeadership().catch(err => console.warn('Leadership preload:', err)),
        loadProducts().catch(err => console.warn('Products preload:', err)),
        loadOrders().catch(err => console.warn('Orders preload:', err)),
        loadPayments().catch(err => console.warn('Payments preload:', err)),
        loadAuditLogs().catch(err => console.warn('Audit logs preload:', err))
    ]);

    console.log('✅ All data preloaded');
});

// ================================================================
// 🆕 LIVE CLOCK
// ================================================================
function startLiveClock() {
    const clockEl = document.getElementById('liveClock');
    const dateEl = document.getElementById('liveDate');
    if (!clockEl || !dateEl) return;

    setInterval(() => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-GB');
        dateEl.textContent = now.toLocaleDateString('en-GB', { 
            weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' 
        }).toUpperCase();
    }, 1000);
}

// ================================================================
// 🆕 UPDATE USER INFO
// ================================================================
function updateUserInfo() {
    if (!currentUser) return;

    const initials = currentUser.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    setEl('sidebarUserName', currentUser.fullName);
    setEl('sidebarUserAvatar', initials);
    
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) welcomeName.textContent = currentUser.fullName;

    setEl('headerUserName', currentUser.fullName);
    setEl('headerUserAvatar', initials);

    startLiveClock();
}

// ================================================================
// 🆕 LOAD OVERVIEW (MAIN DASHBOARD LOGIC) — FIXED
// ================================================================
async function loadOverview() {
    try {
        // Soma thamani ya dropdown (7 au 30)
        const trendRange = document.getElementById('trendRange');
        const days = parseInt(trendRange?.value) || 7;

        // 1. Vuta data zote kwa wakati mmoja
        const [users, orders, payments, logs, liveAnalytics, systemTrend, moduleActivity] = await Promise.all([
            API.getUsers().catch(() => []),
            API.getOrders().catch(() => []),
            API.getPayments().catch(() => []),
            API.getAuditLogs().catch(() => []),
            API.getLiveAnalytics().catch(() => null),
            API.getSystemUsageTrend(days).catch(() => null),
            API.getModuleActivity(days).catch(() => null)
        ]);

        // 2. Render Recent Activity
        const safeLogs = Array.isArray(logs) ? logs : (logs?.logs || []);
        renderLiveActivity(safeLogs);

        // 3. Render Live Analytics (Live Traffic)
        if (liveAnalytics) {
            renderLiveAnalytics(liveAnalytics);
        } else {
            // Kama API haipo, onyesha 0 (sio Mock Data)
            renderLiveAnalytics({
                onlineNow: 0,
                todayVisitors: 0,
                locations: [],
                devices: { mobile: 0, desktop: 0, tablet: 0 }
            });
        }

        // 4. Render Charts
        if (systemTrend && systemTrend.labels && systemTrend.labels.length > 0) {
            renderSystemUsageChart(systemTrend);
        } else {
            // Chora graph tupu kama hakuna data
            renderSystemUsageChart({
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                logins: [0, 0, 0, 0, 0, 0, 0],
                actions: [0, 0, 0, 0, 0, 0, 0]
            });
        }
        // 4. Render Charts
        if (moduleActivity && moduleActivity.labels && moduleActivity.labels.length > 0) {
            renderModuleActivityChart(moduleActivity);
        } else {
            renderModuleActivityChart({
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                users: [0, 0, 0, 0, 0, 0, 0],
                products: [0, 0, 0, 0, 0, 0, 0],
                orders: [0, 0, 0, 0, 0, 0, 0],
                payments: [0, 0, 0, 0, 0, 0, 0],
                leadership: [0, 0, 0, 0, 0, 0, 0],
                testimonials: [0, 0, 0, 0, 0, 0, 0],
                projects: [0, 0, 0, 0, 0, 0, 0]
            });
        }

    } catch (err) {
        console.error('Overview load error:', err);
    }
}

// ================================================================
// 🆕 RENDER SYSTEM USAGE CHART (Line)
// ================================================================
function renderSystemUsageChart(data) {
    const ctx = document.getElementById('systemUsageChart');
    if (!ctx) return;
    
    // Destroy previous chart kama ipo
    if (window._systemUsageChart) window._systemUsageChart.destroy();
    
    window._systemUsageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Logins',
                    data: data.logins,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.5,
                    fill: true,
                    borderWidth: 3,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                },
                {
                    label: 'System Actions',
                    data: data.actions,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.5,
                    fill: true,
                    borderWidth: 3,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#334155', font: { weight: 'bold' }, usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b' } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            }
        }
    });
}

// ================================================================
// 🆕 RENDER MODULE ACTIVITY (Line Chart)
// ================================================================
function renderModuleActivityChart(data) {
    const canvas = document.getElementById('moduleActivityChart');
    if (!canvas) return;
    
    if (window._moduleActivityChart) window._moduleActivityChart.destroy();
    
    window._moduleActivityChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [
                { label: 'Users', data: data.users || [], borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#3b82f6', pointBorderColor: '#ffffff', pointBorderWidth: 2 },
                { label: 'Products', data: data.products || [], borderColor: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.05)', tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#f59e0b', pointBorderColor: '#ffffff', pointBorderWidth: 2 },
                { label: 'Orders', data: data.orders || [], borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.05)', tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#22c55e', pointBorderColor: '#ffffff', pointBorderWidth: 2 },
                { label: 'Payments', data: data.payments || [], borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.05)', tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#8b5cf6', pointBorderColor: '#ffffff', pointBorderWidth: 2 },
                { label: 'Leadership', data: data.leadership || [], borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)', tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#ef4444', pointBorderColor: '#ffffff', pointBorderWidth: 2 },
                { label: 'Testimonials', data: data.testimonials || [], borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.05)', tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#0ea5e9', pointBorderColor: '#ffffff', pointBorderWidth: 2 },
                { label: 'Projects', data: data.projects || [], borderColor: '#ec4899', backgroundColor: 'rgba(236, 72, 153, 0.05)', tension: 0.4, borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#ec4899', pointBorderColor: '#ffffff', pointBorderWidth: 2 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: '#334155', font: { weight: 'bold', size: 11 }, usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', stepSize: 1, precision: 0 } },
                x: { grid: { display: false }, ticks: { color: '#64748b' } }
            }
        }
    });
}

// ================================================================
// 🆕 RENDER LIVE ANALYTICS
// ================================================================
function renderLiveAnalytics(data) {
    // Online Now & Today's Visitors
    document.getElementById('onlineNowCount').textContent = data.onlineNow || 0;
    document.getElementById('todayVisitorsCount').textContent = data.todayVisitors || 0;

    // Locations
    const locContainer = document.getElementById('locationTrafficContainer');
    if (locContainer && data.locations) {
        const maxCount = Math.max(...data.locations.map(l => l.count));
        locContainer.innerHTML = data.locations.map(loc => {
            const percentage = (loc.count / maxCount) * 100;
            const flag = loc.flag || '🌍';
            return `
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px;">
                        <span>${flag} ${esc(loc.city)}</span>
                        <span>${loc.count}</span>
                    </div>
                    <div style="height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Devices
    const deviceBar = document.getElementById('deviceBreakdownBar');
    const deviceLabels = document.getElementById('deviceLabels');
    if (deviceBar && deviceLabels && data.devices) {
        const { mobile = 0, desktop = 0, tablet = 0 } = data.devices;
        deviceBar.innerHTML = `
            <div style="width: ${mobile}%; background: #f59e0b;"></div>
            <div style="width: ${desktop}%; background: #3b82f6;"></div>
            <div style="width: ${tablet}%; background: #8b5cf6;"></div>
        `;
        deviceLabels.innerHTML = `
            <span style="color: #f59e0b;">📱 Mobile ${mobile}%</span>
            <span style="color: #3b82f6;">💻 Desktop ${desktop}%</span>
            <span style="color: #8b5cf6;">📟 Tablet ${tablet}%</span>
        `;
    }
}

function renderLiveActivity(logs) {
    const container = document.getElementById('liveActivityFeed');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 13px; padding: 20px;">No recent activities.</div>';
        return;
    }

    const recent = logs.slice(0, 5);

    container.innerHTML = recent.map((log) => {
        let dotColor = '#3b82f6';
        let icon = '🔄';
        
        const action = (log.action || '').toLowerCase();
        if (action.includes('create')) { dotColor = '#22c55e'; icon = '✅'; }
        else if (action.includes('delete')) { dotColor = '#ef4444'; icon = '🗑️'; }
        else if (action.includes('update')) { dotColor = '#f59e0b'; icon = '🖊️'; }
        else if (action.includes('login')) { dotColor = '#3b82f6'; icon = '🔐'; }

        const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now';
        const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'}) : '';

        // Tumia userName kutoka backend
        const userName = log.userName || log.userId || 'System';

        return `
            <div style="position: relative; margin-bottom: 24px; padding-left: 10px;">
                <div style="position: absolute; left: -28px; top: 2px; width: 14px; height: 14px; border-radius: 50%; background: ${dotColor}; border: 3px solid #ffffff; box-shadow: 0 0 0 3px ${dotColor}30;"></div>
                <div style="font-size: 13px; font-weight: 700; color: #1e293b;">${icon} ${esc(log.action || 'System Activity')}</div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 6px; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                    <span>👤 ${esc(userName)}</span>
                    <span>•</span>
                    <span>${dateStr} ${timeStr}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderUserDropdown() {
    if (!currentUser) return;

    const initials = currentUser.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    setEl('udName', currentUser.fullName);
    setEl('udRole', `🦸 ${currentUser.title || 'Super Administrator'}`);

    const udAvatar = document.getElementById('udAvatar');
    if (udAvatar) {
        if (currentUser.profilePic) {
            udAvatar.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile">`;
        } else {
            udAvatar.innerHTML = `<span>${initials}</span>`;
        }
    }

    setEl('udpName', currentUser.fullName);
    setEl('udpRole', `🦸 ${currentUser.title || 'Super Administrator'}`);
    setEl('udpEmail', currentUser.email || '—');
    setEl('udpPhone', currentUser.phone || '—');
    setEl('udpTitle', currentUser.title || 'System Owner');

    const udpPic = document.getElementById('udpPic');
    if (udpPic) {
        if (currentUser.profilePic) {
            udpPic.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile">`;
        } else {
            udpPic.innerHTML = `<span>${initials}</span>`;
        }
    }

    const sidebarAvatar = document.getElementById('sidebarUserAvatar');
    if (sidebarAvatar) {
        if (currentUser.profilePic) {
            sidebarAvatar.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile">`;
        } else {
            sidebarAvatar.textContent = initials;
        }
    }
}

// ================================================================
// ESCAPE HTML
// ================================================================
function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ================================================================
// TAB SWITCHING
// ================================================================
function switchTab(tabName) {
    closeAllMailModals();
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) targetTab.classList.add('active');

    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`.sidebar-nav a[onclick*="${tabName}"]`);
    if (activeLink) activeLink.classList.add('active');

    loadTabData(tabName);
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'overview': loadOverview(); break;
        case 'users': loadUsers(); break;
        case 'leadership': loadLeadership(); break;
        case 'products': loadProducts(); break;
        case 'content': loadSiteContent(); break;
        case 'orders': loadOrders(); break;
        case 'payments': loadPayments(); break;
        case 'audit': loadAuditLogs(); break;
    }
}

// ================================================================
// SITE CONTENT SUB-TABS
// ================================================================
function switchContentSubTab(subtab, btnElement) {
    document.querySelectorAll('.content-subtab').forEach(el => {
        el.classList.remove('active');
    });

    document.querySelectorAll('.subtab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const target = document.getElementById(`content-subtab-${subtab}`);
    if (target) target.classList.add('active');

    if (btnElement) btnElement.classList.add('active');

    switch(subtab) {
        case 'general': 
            loadSiteContent(); 
            break;
        case 'testimonials': 
            loadTestimonials(); 
            break;
        case 'news': 
            loadNews(); 
            break;
        case 'projects': 
            loadProjects(); 
            break;
        case 'hero': 
            loadHeroSlides();
            loadStats();
            break;
    }
}


// ================================================================
// LOAD USERS
// ================================================================
async function loadUsers() {
    const container = document.getElementById('usersContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading users...</div>';

    try {
        const users = await API.getUsers();

        if (!users || users.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">👥</span>
                    <div class="empty-title">No Users Found</div>
                    <div class="empty-desc">Click "Add User" to create one.</div>
                </div>
            `;
            return;
        }
 
        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map((user, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="font-weight:700;">${esc(user.fullName)}</div>
                                <div style="font-size:11px;color:#64748b;font-family:monospace;">${esc(user.employeeId || 'N/A')}</div>
                            </td>
                            <td>${esc(user.email)}</td>
                            <td><span class="status-badge role-badge">${esc(user.role)}</span></td>
                            <td>${esc(user.department || 'N/A')}</td>
                            <td><span class="status-badge ${esc((user.status || '').toLowerCase())}">${esc(user.status)}</span></td>
                            <td>
                                <button class="btn-icon view" onclick="openViewUserModal(${user.id})" title="View Profile" style="background: rgba(59,130,246,0.1); color: #3b82f6; border: 1px solid rgba(59,130,246,0.2); margin-right: 4px;">👁️</button>
                                <button class="btn-icon edit" onclick="openEditUserModal(${user.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteUser(${user.id}, '${esc(user.fullName)}')" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        setEl('navUsersBadge', users.length);
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Users</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

// ================================================================
// 🆕 VIEW USER PROFILE
// ================================================================
async function openViewUserModal(userId) {
    try {
        // Vuta data za mtumiaji kutoka API
        const users = await API.getUsers();
        const user = users.find(u => String(u.id) === String(userId));

        if (!user) {
            Toast.error('User not found');
            return;
        }

        // Jaza data kwenye Modal
        setEl('viewUserName', user.fullName);
        setEl('viewUserEmail', user.email || '—');
        setEl('viewUserPhone', user.phone || '—');
        setEl('viewUserDept', user.department || '—');
        setEl('viewUserEmpId', user.employeeId || '—');
        
        // Role Badge
        const roleBadge = document.getElementById('viewUserRoleBadge');
        if (roleBadge) {
            roleBadge.textContent = user.role || 'User';
        }

        // Status
        const statusEl = document.getElementById('viewUserStatus');
        if (statusEl) {
            if (user.status === 'Active') {
                statusEl.innerHTML = '✅ ACTIVE';
                statusEl.style.color = '#16a34a';
            } else {
                statusEl.innerHTML = '⏸ INACTIVE';
                statusEl.style.color = '#dc2626';
            }
        }

        // Avatar (Profile Pic au Initials)
        const avatarEl = document.getElementById('viewUserAvatar');
        if (avatarEl) {
            if (user.profilePic) {
                avatarEl.innerHTML = `<img src="${user.profilePic}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                const initials = user.fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                avatarEl.innerHTML = `<span>${initials}</span>`;
            }
        }

        // Fungua Modal
        showModal('viewUserModal');

    } catch (err) {
        console.error('View user error:', err);
        Toast.error('Failed to load user profile');
    }
}

// ================================================================
// 🆕 EXPORT USERS TO CSV (Excel) - FIXED
// ================================================================
async function exportUsersToCSV() {
    try {
        const users = await API.getUsers();

        if (!users || users.length === 0) {
            Toast.error('No users to export');
            return;
        }

        const headers = [
            'No', 'Full Name', 'Employee ID', 'Email', 
            'Phone', 'Role', 'Department', 'Status'
        ];

        const rows = users.map((user, index) => [
            index + 1,
            user.fullName || '',
            user.employeeId || '',
            user.email || '',
            user.phone || '',
            user.role || '',
            user.department || '',
            user.status || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // HAPA NDIPO KOSA LILIKUWA: Ilikuwa haijakamilika
        link.href = url;
        link.setAttribute('download', 'MAK-DC-Users.csv'); 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); 
        
        Toast.success('Users exported successfully!');

    } catch (err) {
        console.error('Export error:', err);
        Toast.error('Failed to export users');
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
// LOAD SITE CONTENT
// ================================================================
async function loadSiteContent() {
    const container = document.getElementById('contentContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading content...</div>';

    try {
        const content = await API.getSiteContent();
        const entries = Object.entries(content || {});

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🎨</span>
                    <div class="empty-title">No Content Found</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Key</th>
                        <th>Value</th>
                        <th>Category</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${entries.map(([key, value]) => `
                        <tr>
                            <td><strong style="font-family:monospace;font-size:12px;">${esc(key)}</strong></td>
                            <td style="max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(value)}</td>
                            <td><span class="status-badge role-badge">${esc(key.split('_')[0])}</span></td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditContent('${esc(key)}')" title="Edit">✏</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Content</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

// ================================================================
// LOAD ORDERS
// ================================================================
async function loadOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading orders...</div>';

    try {
        const orders = await API.getOrders();

        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <div class="empty-title">No Orders Yet</div>
                    <div class="empty-desc">Orders will appear here.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td><strong style="font-family:monospace;">${esc(order.orderId)}</strong></td>
                            <td>${esc(order.customerName || 'N/A')}</td>
                            <td>TSh ${Number(order.totalAmount || 0).toLocaleString()}</td>
                            <td><span class="status-badge ${esc(order.status)}">${esc(order.status)}</span></td>
                            <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Orders</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

// ================================================================
// LOAD PAYMENTS
// ================================================================
async function loadPayments() {
    const container = document.getElementById('paymentsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading payments...</div>';

    try {
        const payments = await API.getPayments();

        if (!payments || payments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">💰</span>
                    <div class="empty-title">No Payments Yet</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Receipt #</th><th>Order ID</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                    ${payments.map(p => `
                        <tr>
                            <td><strong style="font-family:monospace;">${esc(p.receiptNumber || 'N/A')}</strong></td>
                            <td>${esc(p.orderId)}</td>
                            <td>TSh ${Number(p.amount || 0).toLocaleString()}</td>
                            <td>${esc(p.paymentMethod || 'N/A')}</td>
                            <td><span class="status-badge ${esc(p.status)}">${esc(p.status)}</span></td>
                            <td>${new Date(p.createdAt).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Payments</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

// ================================================================
// LOAD AUDIT LOGS
// ================================================================
async function loadAuditLogs() {
    const container = document.getElementById('auditContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading audit logs...</div>';

    try {
        const logs = await API.getAuditLogs();

        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📋</span>
                    <div class="empty-title">No Audit Logs</div>
                    <div class="empty-desc">Activity will appear here.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>IP</th></tr>
                </thead>
                <tbody>
                    ${logs.map(log => `
                        <tr>
                            <td>${new Date(log.createdAt).toLocaleString()}</td>
                            <td>${esc(log.userId || 'System')}</td>
                            <td><span class="status-badge role-badge">${esc(log.action)}</span></td>
                            <td>${esc(log.entityType || 'N/A')} ${esc(log.entityId || '')}</td>
                            <td>${esc(log.ipAddress || 'N/A')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Audit Logs</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

// ================================================================
// USER MANAGEMENT
// ================================================================
function openAddUserModal() {
    ['newUserName', 'newUserEmail', 'newUserPassword', 'newUserDepartment',
     'newUserPhone', 'newUserEmployeeId'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    setEl('newUserRole', '');
    setEl('newUserStatus', 'Active');

    const status = document.getElementById('addUserStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('addUserModal');
}

async function saveNewUser() {
    const statusDiv = document.getElementById('addUserStatus');

    const userData = {
        fullName: document.getElementById('newUserName').value.trim(),
        email: document.getElementById('newUserEmail').value.trim(),
        password: document.getElementById('newUserPassword').value,
        role: document.getElementById('newUserRole').value,
        department: document.getElementById('newUserDepartment').value.trim(),
        phone: document.getElementById('newUserPhone').value.trim(),
        employeeId: document.getElementById('newUserEmployeeId').value.trim(),
        status: document.getElementById('newUserStatus').value
    };

    if (!userData.fullName || !userData.email || !userData.password || !userData.role) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please fill all required fields';
        return;
    }

    try {
        await API.createUser(userData);
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ User created successfully!';

        setTimeout(() => {
            closeModal('addUserModal');
            loadUsers();
            Toast.success('User created successfully!');
        }, 1000);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`Delete user "${userName}"? This cannot be undone.`)) return;

    try {
        await API.deleteUser(userId);
        Toast.success('User deleted successfully');
        loadUsers();
    } catch (err) {
        Toast.error('Failed to delete user: ' + err.message);
    }
}

// ================================================================
// SITE CONTENT MANAGEMENT
// ================================================================
async function openEditContent(key) {
    currentContentKey = key;

    try {
        const content = await API.getSiteContent();
        currentContentValue = content[key] || '';
    } catch (err) {
        currentContentValue = '';
    }

    setEl('editContentKey', key);
    setEl('editContentValue', currentContentValue);
    setEl('editContentCategory', key.split('_')[0]);

    const status = document.getElementById('editContentStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('editContentModal');
}

async function saveContentChanges() {
    const statusDiv = document.getElementById('editContentStatus');
    const newValue = document.getElementById('editContentValue').value.trim();

    if (!newValue) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Value cannot be empty';
        return;
    }

    try {
        await API.updateSiteContent(currentContentKey, newValue);
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Content updated successfully!';

        setTimeout(() => {
            closeModal('editContentModal');
            loadSiteContent();
            Toast.success('Content updated!');
        }, 1000);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}

// ================================================================
// ADD NEW CONTENT
// ================================================================
function openAddContentModal() {
    setEl('newContentKey', '');
    setEl('newContentValue', '');
    setEl('newContentCategory', '');

    const status = document.getElementById('addContentStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('addContentModal');
}

async function saveNewContent() {
    const statusDiv = document.getElementById('addContentStatus');

    const key = document.getElementById('newContentKey').value.trim();
    const textValue = document.getElementById('newContentValue').value.trim();
    const imageBase64 = document.getElementById('newContentImageBase64').value; // 🆕

    // 🆕 Kama kuna picha, tumia picha. Kama hakuna, tumia maandishi.
    const finalValue = imageBase64 ? imageBase64 : textValue;

    if (!key || !finalValue) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Key na Value (au Picha) zinahitajika';
        return;
    }

    if (!/^[a-z0-9_]+$/.test(key)) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Key iwe na herufi ndogo, namba, na underscore pekee';
        return;
    }

    const saveBtn = document.querySelector('#addContentModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        await API.updateSiteContent(key, finalValue); // Tumia finalValue

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Content imeongezwa!';

        setTimeout(() => {
            closeModal('addContentModal');
            loadSiteContent();
            Toast.success('✅ Content imeongezwa!');
            // Safisha fomu
            document.getElementById('newContentImageBase64').value = '';
            document.getElementById('newContentImageName').textContent = 'Hakuna picha iliyochaguliwa';
        }, 800);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Content';
        }
    }
}
// ================================================================
// LEADERSHIP MANAGEMENT
// ================================================================
async function loadLeadership() {
    const container = document.getElementById('leadershipContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading leadership...</div>';

    try {
        const leaders = await API.getLeadershipAdmin();

        if (!leaders || leaders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">👔</span>
                    <div class="empty-title">No Leaders Found</div>
                    <div class="empty-desc">Click "Add Leader" to create one.</div>
                </div>
            `;
            setEl('navLeadershipBadge', 0);
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaders.map((leader, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="font-weight:700;">${esc(leader.fullName)}</div>
                                <div style="font-size:11px;color:#64748b;">${esc((leader.bio || '').slice(0, 50))}${(leader.bio || '').length > 50 ? '...' : ''}</div>
                            </td>
                            <td><span class="status-badge role-badge">${esc(leader.role)}</span></td>
                            <td>${leader.order}</td>
                            <td>
                                <span class="status-badge ${leader.isActive ? 'active' : 'inactive'}">
                                    ${leader.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditLeaderModal(${leader.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteLeader(${leader.id}, '${esc(leader.fullName)}')" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        setEl('navLeadershipBadge', leaders.length);
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Leadership</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

function openAddLeaderModal() {
    currentLeaderId = null;
    setEl('leaderModalTitle', '➕ Add Leader');
    setEl('leaderFullName', '');
    setEl('leaderRole', '');
    setEl('leaderBio', '');
    setEl('leaderEmail', '');
    setEl('leaderPhone', '');
    setEl('leaderLinkedin', '');
    setEl('leaderOrder', 0);
    setEl('leaderIsActive', 'true');
    removeLeaderPhoto();

    const status = document.getElementById('leaderStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('leaderModal');
}

async function openEditLeaderModal(id) {
    currentLeaderId = id;
    setEl('leaderModalTitle', '🖋️ Edit Leader');

    try {
        const leaders = await API.getLeadershipAdmin();
        const leader = leaders.find(l => l.id === id);

        if (!leader) {
            Toast.error('Leader not found');
            return;
        }

        setEl('leaderFullName', leader.fullName);
        setEl('leaderRole', leader.role);
        setEl('leaderBio', leader.bio || '');
        setEl('leaderEmail', leader.email || '');
        setEl('leaderPhone', leader.phone || '');
        setEl('leaderLinkedin', leader.linkedin || '');
        setEl('leaderOrder', leader.order);
        setEl('leaderIsActive', leader.isActive ? 'true' : 'false');
        setLeaderPhotoPreview(leader.photo || '');

        const status = document.getElementById('leaderStatus');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('leaderModal');
    } catch (err) {
        Toast.error('Failed to load leader: ' + err.message);
    }
}

async function saveLeader() {
    const statusDiv = document.getElementById('leaderStatus');

    const data = {
        fullName: document.getElementById('leaderFullName').value.trim(),
        role: document.getElementById('leaderRole').value.trim(),
        bio: document.getElementById('leaderBio').value.trim(),
        photo: document.getElementById('leaderPhoto').value || '',
        email: document.getElementById('leaderEmail').value.trim(),
        phone: document.getElementById('leaderPhone').value.trim(),
        linkedin: document.getElementById('leaderLinkedin').value.trim(),
        order: parseInt(document.getElementById('leaderOrder').value) || 0,
        isActive: document.getElementById('leaderIsActive').value === 'true'
    };

    if (!data.fullName || !data.role) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Full Name and Role are required';
        return;
    }

    const saveBtn = document.querySelector('#leaderModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        if (currentLeaderId) {
            await API.updateLeadership(currentLeaderId, data);
            Toast.success('✅ Leader updated!');
        } else {
            await API.createLeadership(data);
            Toast.success('✅ Leader created!');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved successfully!';

        setTimeout(() => {
            closeModal('leaderModal');
            loadLeadership();
        }, 800);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        Toast.error('Failed to save');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Leader';
        }
    }
}

async function deleteLeader(id, name) {
    if (!confirm(`Delete leader "${name}"? This cannot be undone.`)) return;

    try {
        await API.deleteLeadership(id);
        Toast.success('Leader deleted successfully');
        loadLeadership();
    } catch (err) {
        Toast.error('Failed to delete: ' + err.message);
    }
}

function handleLeaderPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Image too large (max 2MB)');
        event.target.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        Toast.error('Please select an image file');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('leaderPhoto').value = base64;
        document.getElementById('leaderPhotoPreview').innerHTML = `<img src="${base64}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function removeLeaderPhoto() {
    document.getElementById('leaderPhoto').value = '';
    document.getElementById('leaderPhotoInput').value = '';
    document.getElementById('leaderPhotoPreview').innerHTML = '<span>📷</span>';
}

function setLeaderPhotoPreview(photo) {
    const preview = document.getElementById('leaderPhotoPreview');
    const hiddenInput = document.getElementById('leaderPhoto');

    if (photo) {
        preview.innerHTML = `<img src="${photo}" alt="Leader">`;
        hiddenInput.value = photo;
    } else {
        preview.innerHTML = '<span>📷</span>';
        hiddenInput.value = '';
    }
}

// ================================================================
// PRODUCTS MANAGEMENT
// ================================================================
async function loadProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading products...</div>';

    try {
        const products = await API.getProductsAdmin();

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📦</span>
                    <div class="empty-title">No Products Found</div>
                    <div class="empty-desc">Click "Add Product" to create one.</div>
                </div>
            `;
            setEl('navProductsBadge', 0);
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map((p, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${p.image
                                        ? `<img src="${p.image}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;">`
                                        : `<div style="width:40px;height:40px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:18px;">📦</div>`
                                    }
                                    <div>
                                        <div style="font-weight:700;">${esc(p.name)}</div>
                                        <div style="font-size:11px;color:#64748b;">${esc(p.tag || '')}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span class="status-badge role-badge">${esc(p.category || 'N/A')}</span></td>
                            <td><strong>TSh ${Number(p.price).toLocaleString()}</strong> <small style="color:#64748b;">${esc(p.unit)}</small></td>
                            <td>${p.stock}</td>
                            <td>
                                <span class="status-badge ${p.isActive ? 'active' : 'inactive'}">
                                    ${p.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditProductModal(${p.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteProduct(${p.id}, '${esc(p.name)}')" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        setEl('navProductsBadge', products.length);
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Products</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

function openAddProductModal() {
    currentProductId = null;
    setEl('productModalTitle', '➕ Add Product');
    setEl('productName', '');
    setEl('productDescription', '');
    setEl('productPrice', '');
    setEl('productUnit', 'per piece');
    setEl('productCategory', '');
    setEl('productTag', '');
    setEl('productStock', 0);
    setEl('productOrder', 0);
    setEl('productIsActive', 'true');
    removeProductPhoto();

    const status = document.getElementById('productStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('productModal');
}

async function openEditProductModal(id) {
    currentProductId = id;
    setEl('productModalTitle', '🖋️ Edit Product');

    try {
        const products = await API.getProductsAdmin();
        const product = products.find(p => p.id === id);

        if (!product) {
            Toast.error('Product not found');
            return;
        }

        setEl('productName', product.name);
        setEl('productDescription', product.description || '');
        setEl('productPrice', product.price);
        setEl('productUnit', product.unit);
        setEl('productCategory', product.category || '');
        setEl('productTag', product.tag || '');
        setEl('productStock', product.stock);
        setEl('productOrder', product.order);
        setEl('productIsActive', product.isActive ? 'true' : 'false');
        setProductPhotoPreview(product.image || '');

        const status = document.getElementById('productStatus');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('productModal');
    } catch (err) {
        Toast.error('Failed to load product: ' + err.message);
    }
}

function handleProductPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Image too large (max 2MB)');
        event.target.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        Toast.error('Please select an image file');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('productImage').value = base64;
        document.getElementById('productPhotoPreview').innerHTML = `<img src="${base64}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function removeProductPhoto() {
    document.getElementById('productImage').value = '';
    document.getElementById('productPhotoInput').value = '';
    document.getElementById('productPhotoPreview').innerHTML = '<span>📦</span>';
}

function setProductPhotoPreview(photo) {
    const preview = document.getElementById('productPhotoPreview');
    const hiddenInput = document.getElementById('productImage');

    if (photo) {
        preview.innerHTML = `<img src="${photo}" alt="Product">`;
        hiddenInput.value = photo;
    } else {
        preview.innerHTML = '<span>📦</span>';
        hiddenInput.value = '';
    }
}

async function saveProduct() {
    const statusDiv = document.getElementById('productStatus');

    const data = {
        name: document.getElementById('productName').value.trim(),
        description: document.getElementById('productDescription').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value) || 0,
        unit: document.getElementById('productUnit').value,
        category: document.getElementById('productCategory').value,
        tag: document.getElementById('productTag').value.trim(),
        image: document.getElementById('productImage').value || '',
        stock: parseInt(document.getElementById('productStock').value) || 0,
        order: parseInt(document.getElementById('productOrder').value) || 0,
        isActive: document.getElementById('productIsActive').value === 'true'
    };

    if (!data.name || !data.price) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Name and Price are required';
        return;
    }

    const saveBtn = document.querySelector('#productModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        if (currentProductId) {
            await API.updateProduct(currentProductId, data);
            Toast.success('✅ Product updated!');
        } else {
            await API.createProduct(data);
            Toast.success('✅ Product created!');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved successfully!';

        setTimeout(() => {
            closeModal('productModal');
            loadProducts();
        }, 800);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        Toast.error('Failed to save');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Product';
        }
    }
}

async function deleteProduct(id, name) {
    if (!confirm(`Delete product "${name}"? This cannot be undone.`)) return;

    try {
        await API.deleteProduct(id);
        Toast.success('Product deleted successfully');
        loadProducts();
    } catch (err) {
        Toast.error('Failed to delete: ' + err.message);
    }
}

// ================================================================
// TESTIMONIALS MANAGEMENT
// ================================================================
async function loadTestimonials() {
    const container = document.getElementById('testimonialsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading testimonials...</div>';

    try {
        const testimonials = await API.getTestimonialsAdmin();

        if (!testimonials || testimonials.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">⭐</span>
                    <div class="empty-title">No Testimonials Found</div>
                    <div class="empty-desc">Click "Add Testimonial" to create one.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Customer</th>
                        <th>Message</th>
                        <th>Rating</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${testimonials.map((t, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${t.photo 
                                        ? `<img src="${t.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
                                        : `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${(t.customerName || '?').charAt(0).toUpperCase()}</div>`
                                    }
                                    <div>
                                        <div style="font-weight:700;">${esc(t.customerName)}</div>
                                        <div style="font-size:11px;color:#64748b;">${esc(t.role || '—')}</div>
                                    </div>
                                </div>
                            </td>
                            <td style="max-width:300px;">
                                <div style="font-size:12px;color:#475569;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">
                                    ${esc(t.message)}
                                </div>
                            </td>
                            <td>
                                <span style="color:#f59e0b;font-size:14px;">
                                    ${'⭐'.repeat(t.rating || 5)}
                                </span>
                            </td>
                            <td>${t.order}</td>
                            <td>
                                <span class="status-badge ${t.isActive ? 'active' : 'inactive'}">
                                    ${t.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditTestimonialModal(${t.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteTestimonial(${t.id}, '${esc(t.customerName)}')" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Testimonials</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

function openAddTestimonialModal() {
    currentTestimonialId = null;
    setEl('testimonialModalTitle', '➕ Add Testimonial');
    setEl('testimonialName', '');
    setEl('testimonialRole', '');
    setEl('testimonialMessage', '');
    setEl('testimonialRating', '5');
    setEl('testimonialOrder', 0);
    setEl('testimonialIsActive', 'true');
    removeTestimonialPhoto();

    const status = document.getElementById('testimonialStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('testimonialModal');
}

async function openEditTestimonialModal(id) {
    currentTestimonialId = id;
    setEl('testimonialModalTitle', '🖋️ Edit Testimonial');

    try {
        const testimonials = await API.getTestimonialsAdmin();
        const t = testimonials.find(x => x.id === id);

        if (!t) {
            Toast.error('Testimonial not found');
            return;
        }

        setEl('testimonialName', t.customerName);
        setEl('testimonialRole', t.role || '');
        setEl('testimonialMessage', t.message);
        setEl('testimonialRating', String(t.rating || 5));
        setEl('testimonialOrder', t.order);
        setEl('testimonialIsActive', t.isActive ? 'true' : 'false');
        setTestimonialPhotoPreview(t.photo || '');

        const status = document.getElementById('testimonialStatus');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('testimonialModal');
    } catch (err) {
        Toast.error('Failed to load: ' + err.message);
    }
}

async function saveTestimonial() {
    const statusDiv = document.getElementById('testimonialStatus');

    const data = {
        customerName: document.getElementById('testimonialName').value.trim(),
        role: document.getElementById('testimonialRole').value.trim(),
        message: document.getElementById('testimonialMessage').value.trim(),
        rating: parseInt(document.getElementById('testimonialRating').value) || 5,
        photo: document.getElementById('testimonialPhoto').value || '',
        order: parseInt(document.getElementById('testimonialOrder').value) || 0,
        isActive: document.getElementById('testimonialIsActive').value === 'true'
    };

    if (!data.customerName || !data.message) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Customer Name and Message are required';
        return;
    }

    const saveBtn = document.querySelector('#testimonialModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        if (currentTestimonialId) {
            await API.updateTestimonial(currentTestimonialId, data);
            Toast.success('✅ Testimonial updated!');
        } else {
            await API.createTestimonial(data);
            Toast.success('✅ Testimonial created!');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved successfully!';

        setTimeout(() => {
            closeModal('testimonialModal');
            loadTestimonials();
        }, 800);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        Toast.error('Failed to save');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Testimonial';
        }
    }
}

async function deleteTestimonial(id, name) {
    if (!confirm(`Delete testimonial from "${name}"? This cannot be undone.`)) return;

    try {
        await API.deleteTestimonial(id);
        Toast.success('Testimonial deleted');
        loadTestimonials();
    } catch (err) {
        Toast.error('Failed to delete: ' + err.message);
    }
}

function handleTestimonialPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Image too large (max 2MB)');
        event.target.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        Toast.error('Please select an image file');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('testimonialPhoto').value = base64;
        document.getElementById('testimonialPhotoPreview').innerHTML = `<img src="${base64}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function removeTestimonialPhoto() {
    document.getElementById('testimonialPhoto').value = '';
    document.getElementById('testimonialPhotoInput').value = '';
    document.getElementById('testimonialPhotoPreview').innerHTML = '<span>👤</span>';
}

function setTestimonialPhotoPreview(photo) {
    const preview = document.getElementById('testimonialPhotoPreview');
    const hiddenInput = document.getElementById('testimonialPhoto');

    if (photo) {
        preview.innerHTML = `<img src="${photo}" alt="Photo">`;
        hiddenInput.value = photo;
    } else {
        preview.innerHTML = '<span>👤</span>';
        hiddenInput.value = '';
    }
}

// ================================================================
// USER DROPDOWN
// ================================================================
function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    document.getElementById('userDropdownWrap')?.classList.toggle('open');
}

function closeUserDropdown() {
    document.getElementById('userDropdownWrap')?.classList.remove('open');
}

document.addEventListener('click', function(e) {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap && wrap.classList.contains('open') && !wrap.contains(e.target)) {
        wrap.classList.remove('open');
    }
});

// ================================================================
// LOGOUT
// ================================================================
function handleLogoutClick(event) {
    if (event) event.preventDefault();
    document.getElementById('logoutConfirmModal')?.classList.add('show');
    closeUserDropdown();
}

function closeLogoutDialog() {
    document.getElementById('logoutConfirmModal')?.classList.remove('show');
}

function confirmLogout() {
    closeLogoutDialog();
    setTimeout(() => Auth.logout(), 400);
}

// ================================================================
// EDIT PROFILE
// ================================================================
function openEditProfileModal() {
    if (!currentUser) currentUser = Auth.getUser();
    if (!currentUser) return;

    const initials = currentUser.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    setInputValue('editProfileName', currentUser.fullName);
    setInputValue('editProfileTitle', currentUser.title || 'System Owner');
    setInputValue('editProfileEmail', currentUser.email);
    setInputValue('editProfilePhone', currentUser.phone || '');

    const preview = document.getElementById('editPicPreview');
    if (preview) {
        if (currentUser.profilePic) {
            preview.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile">`;
        } else {
            preview.innerHTML = `<span>${initials}</span>`;
        }
    }
    currentProfilePic = currentUser.profilePic || null;

    const status = document.getElementById('editProfileStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('editProfileModal');
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Image too large (max 2MB)');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        currentProfilePic = e.target.result;
        const preview = document.getElementById('editPicPreview');
        if (preview) {
            preview.innerHTML = `<img src="${currentProfilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        }
    };
    reader.readAsDataURL(file);
}

function removeProfilePic() {
    currentProfilePic = null;
    if (!currentUser) return;
    const initials = currentUser.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    const preview = document.getElementById('editPicPreview');
    if (preview) preview.innerHTML = `<span>${initials}</span>`;
}

async function saveUserProfile() {
    const statusDiv = document.getElementById('editProfileStatus');

    const fullName = document.getElementById('editProfileName')?.value.trim();
    const email = document.getElementById('editProfileEmail')?.value.trim();
    const phone = document.getElementById('editProfilePhone')?.value.trim();
    const title = document.getElementById('editProfileTitle')?.value.trim();

    if (!fullName || !email || !phone) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Full Name, Email, and Phone are required';
        return;
    }

    const saveBtn = document.querySelector('#editProfileModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        const payload = { fullName, email, phone, title };
        if (currentProfilePic !== currentUser.profilePic) {
            payload.profilePic = currentProfilePic;
        }

        const response = await API.updateOwnProfile(payload);
        currentUser = { ...currentUser, ...response.user };
        Auth.saveSession(Auth.getToken(), currentUser);

        updateUserInfo();
        renderUserDropdown();

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Profile updated successfully!';
        Toast.success('✅ Profile saved!');

        setTimeout(() => closeModal('editProfileModal'), 1000);
    } catch (err) {
        console.error('Save profile error:', err);
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        Toast.error('Failed to save profile');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Changes';
        }
    }
}

// ================================================================
// MODAL HELPERS
// ================================================================
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('show');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.confirm-overlay.show').forEach(m => m.classList.remove('show'));
    }
});

// ================================================================
// SIDEBAR TOGGLE
// ================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}

// ================================================================
// NEWS MANAGEMENT
// ================================================================
async function loadNews() {
    const container = document.getElementById('newsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading news...</div>';

    try {
        const news = await API.getNewsAdmin();

        if (!news || news.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📰</span>
                    <div class="empty-title">No News Found</div>
                    <div class="empty-desc">Click "Add News" to create one.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>News</th>
                        <th>Category</th>
                        <th>Published</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${news.map((n, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${n.image 
                                        ? `<img src="${n.image}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">`
                                        : `<div style="width:50px;height:50px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:22px;">📰</div>`
                                    }
                                    <div>
                                        <div style="font-weight:700;">${esc(n.title)}</div>
                                        <div style="font-size:11px;color:#64748b;">${esc((n.excerpt || n.content || '').slice(0, 60))}${(n.excerpt || n.content || '').length > 60 ? '...' : ''}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span class="status-badge role-badge">${esc(n.category)}</span></td>
                            <td>${n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : '—'}</td>
                            <td>${n.order}</td>
                            <td>
                                <span class="status-badge ${n.isActive ? 'active' : 'inactive'}">
                                    ${n.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditNewsModal(${n.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteNews(${n.id}, '${esc(n.title)}')" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load News</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

function openAddNewsModal() {
    currentNewsId = null;
    setEl('newsModalTitle', '➕ Add News');
    setEl('newsTitle', '');
    setEl('newsCategory', 'News');
    setEl('newsAuthor', '');
    setEl('newsExcerpt', '');
    setEl('newsContent', '');
    setEl('newsPublishedAt', new Date().toISOString().split('T')[0]);
    setEl('newsOrder', 0);
    setEl('newsIsActive', 'true');
    removeNewsPhoto();

    const status = document.getElementById('newsStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('newsModal');
}

async function openEditNewsModal(id) {
    currentNewsId = id;
    setEl('newsModalTitle', '🖋️ Edit News');

    try {
        const news = await API.getNewsAdmin();
        const n = news.find(x => x.id === id);

        if (!n) {
            Toast.error('News not found');
            return;
        }

        setEl('newsTitle', n.title);
        setEl('newsCategory', n.category || 'News');
        setEl('newsAuthor', n.author || '');
        setEl('newsExcerpt', n.excerpt || '');
        setEl('newsContent', n.content || '');
        setEl('newsPublishedAt', n.publishedAt ? new Date(n.publishedAt).toISOString().split('T')[0] : '');
        setEl('newsOrder', n.order);
        setEl('newsIsActive', n.isActive ? 'true' : 'false');
        setNewsPhotoPreview(n.image || '');
        setNewsAttachmentPreview(n.attachment || '', n.attachmentName || '');

        const status = document.getElementById('newsStatus');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('newsModal');
    } catch (err) {
        Toast.error('Failed to load: ' + err.message);
    }
}

async function saveNews() {
    const statusDiv = document.getElementById('newsStatus');

    const data = {
        title: document.getElementById('newsTitle').value.trim(),
        category: document.getElementById('newsCategory').value,
        author: document.getElementById('newsAuthor').value.trim(),
        excerpt: document.getElementById('newsExcerpt').value.trim(),
        content: document.getElementById('newsContent').value.trim(),
        image: document.getElementById('newsImage').value || '',
        attachment: document.getElementById('newsAttachment').value || '',
        attachmentName: document.getElementById('newsAttachmentName').value || '',
        publishedAt: document.getElementById('newsPublishedAt').value || null,
        order: parseInt(document.getElementById('newsOrder').value) || 0,
        isActive: document.getElementById('newsIsActive').value === 'true'
    };

    if (!data.title || !data.content) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Title and Content are required';
        return;
    }

    const saveBtn = document.querySelector('#newsModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        if (currentNewsId) {
            await API.updateNews(currentNewsId, data);
            Toast.success('✅ News updated!');
        } else {
            await API.createNews(data);
            Toast.success('✅ News created!');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved successfully!';

        setTimeout(() => {
            closeModal('newsModal');
            loadNews();
        }, 800);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        Toast.error('Failed to save');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save News';
        }
    }
}

async function deleteNews(id, title) {
    if (!confirm(`Delete news "${title}"? This cannot be undone.`)) return;

    try {
        await API.deleteNews(id);
        Toast.success('News deleted');
        loadNews();
    } catch (err) {
        Toast.error('Failed to delete: ' + err.message);
    }
}

function handleNewsPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Image too large (max 2MB)');
        event.target.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        Toast.error('Please select an image file');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('newsImage').value = base64;
        document.getElementById('newsPhotoPreview').innerHTML = `<img src="${base64}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function removeNewsPhoto() {
    document.getElementById('newsImage').value = '';
    document.getElementById('newsPhotoInput').value = '';
    document.getElementById('newsPhotoPreview').innerHTML = '<span>📰</span>';
}

function setNewsPhotoPreview(photo) {
    const preview = document.getElementById('newsPhotoPreview');
    const hiddenInput = document.getElementById('newsImage');

    if (photo) {
        preview.innerHTML = `<img src="${photo}" alt="News">`;
        hiddenInput.value = photo;
    } else {
        preview.innerHTML = '<span>📰</span>';
        hiddenInput.value = '';
    }
}

// ================================================================
// NEWS ATTACHMENT HANDLING
// ================================================================
function handleNewsAttachmentUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        Toast.error('File too large (max 5MB)');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('newsAttachment').value = base64;
        document.getElementById('newsAttachmentName').value = file.name;
        document.getElementById('newsAttachmentPreview').innerHTML = 
            `<div style="font-size: 12px; text-align: center; padding: 8px; word-break: break-all;">📎 ${file.name}</div>`;
    };
    reader.readAsDataURL(file);
}

function removeNewsAttachment() {
    document.getElementById('newsAttachment').value = '';
    document.getElementById('newsAttachmentName').value = '';
    document.getElementById('newsAttachmentInput').value = '';
    document.getElementById('newsAttachmentPreview').innerHTML = '<span>📎</span>';
}

function setNewsAttachmentPreview(attachment, name) {
    const preview = document.getElementById('newsAttachmentPreview');
    const hiddenInput = document.getElementById('newsAttachment');
    const hiddenName = document.getElementById('newsAttachmentName');

    if (attachment) {
        preview.innerHTML = `<div style="font-size: 12px; text-align: center; padding: 8px; word-break: break-all;">📎 ${name || 'Document'}</div>`;
        hiddenInput.value = attachment;
        hiddenName.value = name || '';
    } else {
        preview.innerHTML = '<span>📎</span>';
        hiddenInput.value = '';
        hiddenName.value = '';
    }
}

// ================================================================
// PROJECTS MANAGEMENT
// ================================================================
async function loadProjects() {
    const container = document.getElementById('projectsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading projects...</div>';

    try {
        const projects = await API.getProjectsAdmin();

        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🏗️</span>
                    <div class="empty-title">No Projects Found</div>
                    <div class="empty-desc">Click "Add Project" to create one.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Project</th>
                        <th>Category</th>
                        <th>Location</th>
                        <th>Year</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${projects.map((p, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="display:flex;align-items:center;gap:10px;">
                                    ${p.image 
                                        ? `<img src="${p.image}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;">`
                                        : `<div style="width:50px;height:50px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:22px;">🏗️</div>`
                                    }
                                    <div>
                                        <div style="font-weight:700;">${esc(p.title)}</div>
                                        <div style="font-size:11px;color:#64748b;">${esc((p.description || '').slice(0, 60))}${(p.description || '').length > 60 ? '...' : ''}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span class="status-badge role-badge">${esc(p.category)}</span></td>
                            <td>${esc(p.location || '—')}</td>
                            <td>${esc(p.year || '—')}</td>
                            <td>${p.order}</td>
                            <td>
                                <span class="status-badge ${p.isActive ? 'active' : 'inactive'}">
                                    ${p.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditProjectModal(${p.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteProject(${p.id}, '${esc(p.title)}')" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Projects</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

function openAddProjectModal() {
    currentProjectId = null;
    setEl('projectModalTitle', '➕ Add Project');
    setEl('projectTitle', '');
    setEl('projectCategory', 'Commercial');
    setEl('projectYear', '');
    setEl('projectLocation', '');
    setEl('projectClient', '');
    setEl('projectDescription', '');
    setEl('projectContent', '');
    setEl('projectOrder', 0);
    setEl('projectIsActive', 'true');
    removeProjectPhoto();

    const status = document.getElementById('projectStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('projectModal');
}

async function openEditProjectModal(id) {
    currentProjectId = id;
    setEl('projectModalTitle', '🖋️ Edit Project');

    try {
        const projects = await API.getProjectsAdmin();
        const p = projects.find(x => x.id === id);

        if (!p) {
            Toast.error('Project not found');
            return;
        }

        setEl('projectTitle', p.title);
        setEl('projectCategory', p.category || 'Commercial');
        setEl('projectYear', p.year || '');
        setEl('projectLocation', p.location || '');
        setEl('projectClient', p.client || '');
        setEl('projectDescription', p.description || '');
        setEl('projectContent', p.content || '');
        setEl('projectOrder', p.order);
        setEl('projectIsActive', p.isActive ? 'true' : 'false');
        setProjectPhotoPreview(p.image || '');

        const status = document.getElementById('projectStatus');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('projectModal');
    } catch (err) {
        Toast.error('Failed to load: ' + err.message);
    }
}

async function saveProject() {
    const statusDiv = document.getElementById('projectStatus');

    const data = {
        title: document.getElementById('projectTitle').value.trim(),
        category: document.getElementById('projectCategory').value,
        year: document.getElementById('projectYear').value.trim(),
        location: document.getElementById('projectLocation').value.trim(),
        client: document.getElementById('projectClient').value.trim(),
        description: document.getElementById('projectDescription').value.trim(),
        content: document.getElementById('projectContent').value.trim(),
        image: document.getElementById('projectImage').value || '',
        order: parseInt(document.getElementById('projectOrder').value) || 0,
        isActive: document.getElementById('projectIsActive').value === 'true'
    };

    if (!data.title) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Title is required';
        return;
    }

    const saveBtn = document.querySelector('#projectModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        if (currentProjectId) {
            await API.updateProject(currentProjectId, data);
            Toast.success('✅ Project updated!');
        } else {
            await API.createProject(data);
            Toast.success('✅ Project created!');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved successfully!';

        setTimeout(() => {
            closeModal('projectModal');
            loadProjects();
        }, 800);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        Toast.error('Failed to save');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Project';
        }
    }
}

async function deleteProject(id, title) {
    if (!confirm(`Delete project "${title}"? This cannot be undone.`)) return;

    try {
        await API.deleteProject(id);
        Toast.success('Project deleted');
        loadProjects();
    } catch (err) {
        Toast.error('Failed to delete: ' + err.message);
    }
}

function handleProjectPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Image too large (max 2MB)');
        event.target.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        Toast.error('Please select an image file');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('projectImage').value = base64;
        document.getElementById('projectPhotoPreview').innerHTML = `<img src="${base64}" alt="Preview">`;
    };
    reader.readAsDataURL(file);
}

function removeProjectPhoto() {
    document.getElementById('projectImage').value = '';
    document.getElementById('projectPhotoInput').value = '';
    document.getElementById('projectPhotoPreview').innerHTML = '<span>🏗️</span>';
}

function setProjectPhotoPreview(photo) {
    const preview = document.getElementById('projectPhotoPreview');
    const hiddenInput = document.getElementById('projectImage');

    if (photo) {
        preview.innerHTML = `<img src="${photo}" alt="Project">`;
        hiddenInput.value = photo;
    } else {
        preview.innerHTML = '<span>🏗️</span>';
        hiddenInput.value = '';
    }
}

// ================================================================
// HERO SLIDES MANAGEMENT
// ================================================================
async function loadHeroSlides() {
    const container = document.getElementById('heroContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading hero slides...</div>';

    try {
        const slides = await API.getHeroSlidesAdmin();

        if (!slides || slides.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🖼️</span>
                    <div class="empty-title">No Hero Slides Found</div>
                    <div class="empty-desc">Click "Add Slide" to create one.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Preview</th>
                        <th>Title</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${slides.map((s, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td>
                                <div style="width:100px;height:56px;border-radius:8px;background-image:url('${s.image}');background-size:cover;background-position:center;border:1px solid #e2e8f0;"></div>
                            </td>
                            <td>
                                <div style="font-weight:700;">${esc(s.title || 'Untitled')}</div>
                                <div style="font-size:11px;color:#64748b;">${esc((s.subtitle || '').slice(0, 50))}${(s.subtitle || '').length > 50 ? '...' : ''}</div>
                            </td>
                            <td>${s.order}</td>
                            <td>
                                <span class="status-badge ${s.isActive ? 'active' : 'inactive'}">
                                    ${s.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditHeroModal(${s.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteHeroSlide(${s.id})" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Hero Slides</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

function openAddHeroModal() {
    currentHeroId = null;
    setEl('heroModalTitle', '➕ Add Hero Slide');
    setEl('heroTitle', '');
    setEl('heroSubtitle', '');
    setEl('heroOrder', 0);
    setEl('heroIsActive', 'true');
    removeHeroPhoto();

    const status = document.getElementById('heroStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('heroModal');
}

async function openEditHeroModal(id) {
    currentHeroId = id;
    setEl('heroModalTitle', '🖋️ Edit Hero Slide');

    try {
        const slides = await API.getHeroSlidesAdmin();
        const s = slides.find(x => x.id === id);

        if (!s) {
            Toast.error('Slide not found');
            return;
        }

        setEl('heroTitle', s.title || '');
        setEl('heroSubtitle', s.subtitle || '');
        setEl('heroOrder', s.order);
        setEl('heroIsActive', s.isActive ? 'true' : 'false');
        setHeroPhotoPreview(s.image);

        const status = document.getElementById('heroStatus');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('heroModal');
    } catch (err) {
        Toast.error('Failed to load: ' + err.message);
    }
}

async function saveHeroSlide() {
    const statusDiv = document.getElementById('heroStatus');

    const data = {
        title: document.getElementById('heroTitle').value.trim(),
        subtitle: document.getElementById('heroSubtitle').value.trim(),
        image: document.getElementById('heroImage').value || '',
        order: parseInt(document.getElementById('heroOrder').value) || 0,
        isActive: document.getElementById('heroIsActive').value === 'true'
    };

    if (!data.image) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Image is required';
        return;
    }

    const saveBtn = document.querySelector('#heroModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        if (currentHeroId) {
            await API.updateHeroSlide(currentHeroId, data);
            Toast.success('✅ Slide updated!');
        } else {
            await API.createHeroSlide(data);
            Toast.success('✅ Slide created!');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved!';

        setTimeout(() => {
            closeModal('heroModal');
            loadHeroSlides();
        }, 800);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Slide';
        }
    }
}

async function deleteHeroSlide(id) {
    if (!confirm('Delete this hero slide? This cannot be undone.')) return;

    try {
        await API.deleteHeroSlide(id);
        Toast.success('Slide deleted');
        loadHeroSlides();
    } catch (err) {
        Toast.error('Failed to delete: ' + err.message);
    }
}

function handleHeroPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Image too large (max 2MB)');
        return;
    }

    if (!file.type.startsWith('image/')) {
        Toast.error('Please select an image');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('heroImage').value = base64;
        document.getElementById('heroPhotoPreview').innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
    };
    reader.readAsDataURL(file);
}

function removeHeroPhoto() {
    document.getElementById('heroImage').value = '';
    document.getElementById('heroPhotoInput').value = '';
    document.getElementById('heroPhotoPreview').innerHTML = '<span>🖼️</span>';
}

function setHeroPhotoPreview(photo) {
    const preview = document.getElementById('heroPhotoPreview');
    const hiddenInput = document.getElementById('heroImage');

    if (photo) {
        preview.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`;
        hiddenInput.value = photo;
    } else {
        preview.innerHTML = '<span>🖼️</span>';
        hiddenInput.value = '';
    }
}

// ================================================================
// STATS MANAGEMENT
// ================================================================
async function loadStats() {
    const container = document.getElementById('statsContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">⏳ Loading stats...</div>';

    try {
        const stats = await API.getStatsAdmin();

        if (!stats || stats.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📊</span>
                    <div class="empty-title">No Stats Found</div>
                    <div class="empty-desc">Click "Add Stat" to create one.</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Icon</th>
                        <th>Label</th>
                        <th>Value</th>
                        <th>Order</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.map((s, index) => `
                        <tr>
                            <td><strong>${String(index + 1).padStart(2, '0')}</strong></td>
                            <td style="font-size:24px;">${esc(s.icon || '📊')}</td>
                            <td><div style="font-weight:700;">${esc(s.label)}</div></td>
                            <td><strong style="color:#0f766e;">${s.value}+</strong></td>
                            <td>${s.order}</td>
                            <td>
                                <span class="status-badge ${s.isActive ? 'active' : 'inactive'}">
                                    ${s.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <button class="btn-icon edit" onclick="openEditStatModal(${s.id})" title="Edit">✏</button>
                                <button class="btn-icon delete" onclick="deleteStat(${s.id})" title="Delete">🗑</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">❌</span>
                <div class="empty-title">Failed to Load Stats</div>
                <div class="empty-desc">${esc(err.message)}</div>
            </div>
        `;
    }
}

function openAddStatModal() {
    currentStatId = null;
    setEl('statModalTitle', '➕ Add Stat');
    setEl('statLabel', '');
    setEl('statValue', '');
    setEl('statIcon', '');
    setEl('statOrder', 0);
    setEl('statIsActive', 'true');

    const status = document.getElementById('statStatus');
    if (status) {
        status.className = 'status-msg';
        status.textContent = '';
    }

    showModal('statModal');
}

async function openEditStatModal(id) {
    currentStatId = id;
    setEl('statModalTitle', '🖋️ Edit Stat');

    try {
        const stats = await API.getStatsAdmin();
        const s = stats.find(x => x.id === id);

        if (!s) {
            Toast.error('Stat not found');
            return;
        }

        setEl('statLabel', s.label);
        setEl('statValue', s.value);
        setEl('statIcon', s.icon || '');
        setEl('statOrder', s.order);
        setEl('statIsActive', s.isActive ? 'true' : 'false');

        const status = document.getElementById('statStatus');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('statModal');
    } catch (err) {
        Toast.error('Failed to load: ' + err.message);
    }
}

async function saveStat() {
    const statusDiv = document.getElementById('statStatus');

    const data = {
        label: document.getElementById('statLabel').value.trim(),
        value: parseInt(document.getElementById('statValue').value) || 0,
        icon: document.getElementById('statIcon').value.trim(),
        order: parseInt(document.getElementById('statOrder').value) || 0,
        isActive: document.getElementById('statIsActive').value === 'true'
    };

    if (!data.label || !data.value) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Label and Value are required';
        return;
    }

    const saveBtn = document.querySelector('#statModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Saving...';
    }

    try {
        if (currentStatId) {
            await API.updateStat(currentStatId, data);
            Toast.success('✅ Stat updated!');
        } else {
            await API.createStat(data);
            Toast.success('✅ Stat created!');
        }

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Saved!';

        setTimeout(() => {
            closeModal('statModal');
            loadStats();
        }, 800);
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save Stat';
        }
    }
}

async function deleteStat(id) {
    if (!confirm('Delete this stat? This cannot be undone.')) return;

    try {
        await API.deleteStat(id);
        Toast.success('Stat deleted');
        loadStats();
    } catch (err) {
        Toast.error('Failed to delete: ' + err.message);
    }
}

async function openEditUserModal(userId) {
    try {
        const users = await API.getUsers();
        // Hakikisha tunalinganisha ID kwa usahihi (kama ni string au number)
        const user = users.find(u => String(u.id) === String(userId));

        if (!user) {
            Toast.error('User not found');
            return;
        }

        setEl('editUserId', user.id);
        setEl('editUserName', user.fullName);
        setEl('editUserEmail', user.email);
        setEl('editUserPassword', '');
        
        // 🆕 FIX: Hakikisha Role inachaguliwa vizuri
        // Kama database ina "Super Admin" au "SuperAdmin", tunailazimisha iwe "SuperAdmin" ili iendane na HTML
        let userRole = user.role;
        if (userRole === 'Super Admin' || userRole === 'superadmin') {
            userRole = 'SuperAdmin';
        }
        setEl('editUserRole', userRole);

        setEl('editUserDepartment', user.department || '');
        setEl('editUserPhone', user.phone || '');
        setEl('editUserEmployeeId', user.employeeId || '');
        
        // Status
        const userStatus = (user.status === 'Inactive') ? 'Inactive' : 'Active';
        setEl('editUserStatus', userStatus);

        const status = document.getElementById('editUserStatusMsg');
        if (status) {
            status.className = 'status-msg';
            status.textContent = '';
        }

        showModal('editUserModal');
    } catch (err) {
        Toast.error('Failed to load user: ' + err.message);
    }
}

async function saveEditUser() {
    const statusDiv = document.getElementById('editUserStatusMsg');
    const userId = document.getElementById('editUserId').value;

    const data = {
        fullName: document.getElementById('editUserName').value.trim(),
        email: document.getElementById('editUserEmail').value.trim(),
        role: document.getElementById('editUserRole').value,
        department: document.getElementById('editUserDepartment').value.trim(),
        phone: document.getElementById('editUserPhone').value.trim(),
        employeeId: document.getElementById('editUserEmployeeId').value.trim(),
        status: document.getElementById('editUserStatus').value
    };

    const password = document.getElementById('editUserPassword').value;
    if (password) data.password = password;

    if (!data.fullName || !data.email || !data.role) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Name, Email, and Role are required';
        return;
    }

    const saveBtn = document.querySelector('#editUserModal .btn-submit');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Updating...';
    }

    try {
        await API.updateUser(userId, data);

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ User updated successfully!';

        setTimeout(() => {
            closeModal('editUserModal');
            loadUsers();
            Toast.success('✅ User updated!');
        }, 800);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        Toast.error('Failed to update user');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Update User';
        }
    }
} 
// 🆕 Function ya Kupakia Picha kwenye Add Content
function handleNewContentImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Angalia ukubwa (Max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        Toast.error('Picha ni kubwa mno (Max 2MB)');
        event.target.value = '';
        return;
    }

    if (!file.type.startsWith('image/')) {
        Toast.error('Tafadhali chagua faili la picha');
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64 = e.target.result;
        document.getElementById('newContentImageBase64').value = base64;
        document.getElementById('newContentImageName').textContent = file.name;
        document.getElementById('newContentImageName').style.color = '#16a34a';
    };
    reader.readAsDataURL(file);
}

// ================================================================
// HELPER — Set element value/text
// ================================================================
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            el.value = value;
        } else {
            el.textContent = value;
        }
    }
}
// ================================================================
// MAIL SYSTEM — SUPER ADMIN DASHBOARD
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

    const navIds = ['inbox', 'pending', 'minutes', 'sent', 'drafts', 'starred'];
    navIds.forEach(nav => {
        const btn = document.getElementById(`mail-nav-${nav}`);
        if (btn) btn.classList.remove('active');
    });
    
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
            <div class="mail-item ${isUnread ? 'unread' : ''}" onclick="viewMailDetail('${msg.id}')">
                <div class="mi-avatar" style="background: ${avatarColor}15; color: ${avatarColor}; border: 1.5px solid ${avatarColor}30;">
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
    
    body.innerHTML = `
        <div style="text-align: center; padding: 60px; color: var(--gray-500);">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Loading message...</div>
        </div>
    `;

    try {
        let msg = await API.getInternalMailById(id); 
        if (!msg) {
            body.innerHTML = `<div style="color: var(--red); text-align: center; padding: 40px; font-weight: 800;">❌ Message not found.</div>`;
            return;
        }
        
        if (!window.mailCache) window.mailCache = {};
        window.mailCache[id] = msg;

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
        
        let totalAtts = 0;
        if (msg.attachments && Array.isArray(msg.attachments)) totalAtts += msg.attachments.length;
        if (msg.attendance && Array.isArray(msg.attendance)) {
            msg.attendance.forEach(att => {
                if (att.attachments && Array.isArray(att.attachments)) totalAtts += att.attachments.length;
            });
        }

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

// ================= 7. RENDER WORKFLOW CHAIN =================
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
                
                let actionClass = 'attended';
                let actionLabel = 'Attended';
                if (action.includes('created') || action === 'send') { 
                    actionClass = 'created'; actionLabel = 'Created'; 
                } else if (action.includes('assign')) { 
                    actionClass = 'assigned'; actionLabel = 'Assigned'; 
                } else if (action.includes('close')) { 
                    actionClass = 'closed'; actionLabel = 'Closed'; 
                }

                let assignHtml = '';
                if (att.assignedTo && att.assignedTo.length > 0) {
                    const names = att.assignedNames && att.assignedNames.length > 0 
                        ? att.assignedNames : ['Unknown'];
                    assignHtml = `
                        <div class="md-tl-assign-pill">
                            ➡️ Assigned to: <strong>${names.map(n => esc(n)).join(', ')}</strong>
                        </div>`;
                }

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

// ================= 8. HELPERS =================
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

function closeMailDetailView() {
    document.getElementById('mailListView').style.display = 'flex';
    document.getElementById('mailDetailView').style.display = 'none';
    currentMailId = null;
}

function refreshCurrentMailbox() {
    if (!currentMailBoxType) return;
    delete mailListCache[currentMailBoxType];
    delete mailListCacheTime[currentMailBoxType];
    loadMailboxMessages(currentMailBoxType);
    showToast('🔄 Refreshed', 'info');
}

// ================= 9. HOOK INTO switchTab =================
(function hookMailCenter() {
    const _orig = window.switchTab;
    if (typeof _orig !== 'function' || _orig.__mailHooked) return;
    const wrapped = function(tabId, event) {
        const result = _orig.call(this, tabId, event);
        if (tabId === 'tab-mail-center') {
            if (!document.getElementById('tab-mail-center').classList.contains('active')) {
                switchMailBox('inbox');
            }
            loadMailBadges();
        }
        return result;
    };
    wrapped.__mailHooked = true;
    window.switchTab = wrapped;
})();
// ================================================================
// MAIL SYSTEM — HELPER STATE
// ================================================================
let currentMinuteAttachments = [];
let currentAttendAttachments = [];
let currentCloseAttachments = [];

// ================================================================
// 10. COMPOSE MAIL
// ================================================================
async function openComposeMailModal() {
    closeAllMailModals();
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

    if (allMailUsers.length === 0) {
        try {
            const users = await API.getUsers();
            const currentUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== currentUser.userId && u.role !== 'SuperAdmin');
        } catch (err) {
            console.error("Failed to load users:", err);
            showToast('⚠ Imeshindwa kupata orodha ya watumiaji.', 'warning');
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
            showToast('⚠ Too Large: ' + file.name, 'error');
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
    
    if (selectedSendTo.length === 0) return showToast('Please select at least one recipient', 'error');
    if (!subject) return showToast('Please enter a subject', 'error');
    if (!body) return showToast('Please write a message', 'error');

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

        showToast('✅ Message sent successfully!', 'success');
        closeComposeModal();
        loadMailBadges();
        if (currentMailBoxType === 'sent') loadMailboxMessages('sent');
        
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}

async function saveMailDraft() {
    const subject = document.getElementById('mailSubject').value.trim();
    const body = document.getElementById('mailBody').value.trim();
    
    if (!subject && !body) return showToast('Write something to save', 'error');

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
        showToast('💾 Draft saved!', 'success');
        closeComposeModal();
        if (currentMailBoxType === 'drafts') loadMailboxMessages('drafts');
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

// ================================================================
// 11. MINUTE COMPOSE
// ================================================================
async function openMinuteComposeModal() {
    closeAllMailModals();
    document.getElementById('minuteSubject').value = '';
    document.getElementById('minuteBody').value = '';
    currentMinuteAttachments = [];
    document.getElementById('minuteAttachList').innerHTML = '';
    
    const select = document.getElementById('minuteAssignTo');
    select.innerHTML = '<option value="">-- Select Person --</option>';
    
    if (allMailUsers.length === 0) {
        try {
            const users = await API.getUsers();
            const curUser = Auth.getUser();
            allMailUsers = (users || []).filter(u => u.id !== curUser.userId && u.role !== 'SuperAdmin');
        } catch (err) {
            console.error("Failed to load users:", err);
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
            showToast('⚠ Too Large: ' + file.name, 'error');
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
    
    if (!subject || !assignToId || !body) return showToast('Please fill all required fields', 'error');

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
        
        showToast('✅ Minute created and assigned!', 'success');
        closeModal('minuteComposeModal');
        loadMailBadges();
        if (currentMailBoxType === 'minutes') loadMailboxMessages('minutes');
        
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}

// ================================================================
// 12. ATTEND MODAL
// ================================================================
async function openAttendModal(mailId) {
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
            showToast('⚠ Too Large: ' + file.name, 'error');
            return;
        }
        if (currentAttendAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentAttendAttachments.push(file);
    });

    list.innerHTML = currentAttendAttachments.map((file, index) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeAttendAttachment(${index})" class="rm">✕</button></div>
    `).join('');
    
    event.target.value = '';
}

function removeAttendAttachment(index) {
    currentAttendAttachments.splice(index, 1);
    document.getElementById('attendAttachList').innerHTML = currentAttendAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeAttendAttachment(${idx})" class="rm">✕</button></div>
    `).join('');
}

async function submitAttend() {
    const mailId = currentMailId;
    if (!mailId) return;

    const comment = (document.getElementById('attendComment')?.value || '').trim();
    const assignToVal = document.getElementById('attendAssignTo')?.value;
    const assignTo = assignToVal ? [parseInt(assignToVal)] : [];
    const btn = document.getElementById('attendSubmitBtn');

    if (!comment && assignTo.length === 0) {
        showToast('Tafadhali andika maoni au chagua mtu.', 'warning');
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Processing...';

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

        showToast('✅ Maoni yamewekwa.', 'success');
        document.getElementById('attendMailModal')?.classList.remove('show');

        if (window.mailCache && window.mailCache[mailId]) delete window.mailCache[mailId];
        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        await viewMailDetail(mailId);
        loadMailBadges();
        if (currentMailBoxType) loadMailboxMessages(currentMailBoxType);

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ================================================================
// 13. CLOSE WORKFLOW
// ================================================================
async function closeCurrentMail() {
    if (!currentMailId) return;
    
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
            showToast('⚠ Too Large: ' + file.name, 'error');
            return;
        }
        if (currentCloseAttachments.find(f => f.name === file.name && f.size === file.size)) return;
        currentCloseAttachments.push(file);
    });

    list.innerHTML = currentCloseAttachments.map((file, index) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeCloseAttachment(${index})" class="rm">✕</button></div>
    `).join('');
    
    event.target.value = '';
}

function removeCloseAttachment(index) {
    currentCloseAttachments.splice(index, 1);
    document.getElementById('closeAttachList').innerHTML = currentCloseAttachments.map((file, idx) => `
        <div class="mc-attach-chip"><span>📎</span><span>${file.name}</span><button onclick="event.stopPropagation(); removeCloseAttachment(${idx})" class="rm">✕</button></div>
    `).join('');
}

async function submitCloseWorkflow() {
    const comment = (document.getElementById('closeComment')?.value || '').trim();
    const assignToVal = document.getElementById('closeAssignTo')?.value;
    const assignTo = assignToVal ? [parseInt(assignToVal)] : [];
    const btn = document.getElementById('closeSubmitBtn');

    if (!comment) {
        showToast('Tafadhali andika kile kilichofanyika.', 'warning');
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '⏳ Closing...';

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

        showToast('✅ Workflow imefungwa.', 'success');
        document.getElementById('closeWorkflowModal')?.classList.remove('show');

        if (window.mailCache && window.mailCache[currentMailId]) delete window.mailCache[currentMailId];
        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        await viewMailDetail(currentMailId);
        loadMailBadges();
        if (currentMailBoxType) loadMailboxMessages(currentMailBoxType);

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// ================================================================
// 14. REPLY
// ================================================================
async function openReplyModal(originalId) {
    const msg = await API.getInternalMailById(originalId);
    if (!msg) return;

    let modal = document.getElementById('replyMailModal');
    if (modal) modal.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-overlay show" id="replyMailModal">
            <div class="modal-box" style="max-width: 600px; padding: 0; overflow: hidden; border-radius: 16px;">
                <div style="background: linear-gradient(135deg, #1A2421, #0f1a16); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800;">↩️ Reply: ${esc(msg.subject)}</h3>
                    <button onclick="document.getElementById('replyMailModal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <div style="padding: 24px; background: #f8fafc;">
                    <textarea id="replyBody" rows="6" placeholder="Write your reply here..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
                </div>
                <div style="padding: 16px 24px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="document.getElementById('replyMailModal').remove()" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e1; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">Cancel</button>
                    <button onclick="submitReply('${originalId}')" style="padding: 10px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; font-family: inherit;">📤 Send Reply</button>
                </div>
            </div>
        </div>
    `);
}

async function submitReply(originalId) {
    const body = document.getElementById('replyBody').value.trim();
    if (!body) return showToast('Reply body is required', 'error');

    const btn = document.querySelector(`#replyMailModal button[onclick="submitReply('${originalId}')"]`);
    const originalBtn = btn.innerHTML;
    btn.innerHTML = '⏳ Sending...'; btn.disabled = true;

    try {
        await API.replyInternalMail(originalId, { body, attachments: [] });

        Object.keys(mailListCache).forEach(k => delete mailListCache[k]);

        if (window.mailCache && window.mailCache[originalId]) {
            delete window.mailCache[originalId];
        }

        showToast('✅ Reply sent successfully!', 'success');
        document.getElementById('replyMailModal').remove();
        loadMailBadges();
        if (currentMailId == originalId) viewMailDetail(originalId);
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        btn.innerHTML = originalBtn; btn.disabled = false;
    }
}

// ================================================================
// 15. STAR / ARCHIVE / DELETE
// ================================================================
async function toggleStarCurrentMail() {
    if (!currentMailId) return;
    try {
        const res = await API.starMail(currentMailId);
        document.getElementById('btnStarMail').textContent = res.isStarred ? '⭐' : '☆';
        showToast(res.isStarred ? '⭐ Message starred' : 'Star removed', 'success');
        loadMailboxMessages(currentMailBoxType);
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function toggleArchiveCurrentMail() {
    if (!currentMailId) return;
    try {
        const res = await API.archiveMail(currentMailId);
        document.getElementById('btnArchiveMail').textContent = res.isArchived ? '📂' : '📁';
        showToast(res.isArchived ? '📂 Message archived' : 'Message unarchived', 'success');
        loadMailboxMessages(currentMailBoxType);
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

async function deleteCurrentMail() {
    if (!currentMailId) return;
    if (!confirm('Delete this message? It will move to trash.')) return;
    try {
        await API.deleteMail(currentMailId);
        showToast('🗑️ Message moved to trash.', 'success');
        closeMailDetailView();
        loadMailboxMessages(currentMailBoxType);
        loadMailBadges();
    } catch (err) { showToast('❌ ' + err.message, 'error'); }
}

// ================================================================
// 16. ATTACHMENTS VIEWER
// ================================================================
function openAttachmentsModal(id) {
    const msg = window.mailCache[id];
    if (!msg) {
        showToast('❌ Message data not found.', 'error');
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
                <div style="display:flex; justify-content:space-between; align-items:center; background:white; border:1.5px solid #e2e8f0; padding:14px 18px; border-radius:12px; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:14px;">
                        <div style="width: 40px; height: 40px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            ${icon}
                        </div>
                        <div>
                            <div style="font-weight:800; color:#0f172a; font-size:14px;">${esc(att.name)}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">${sizeStr} • <span style="color:#1A2421; font-weight:800;">${esc(att.source)}</span></div>
                        </div>
                    </div>
                    <button onclick="downloadMailAttachment('${att.data}', '${esc(att.name)}')" style="padding:8px 16px; background:#f0fdfa; color:#1A2421; border:1.5px solid #99f6e4; border-radius:8px; font-weight:800; cursor:pointer; font-size:12px;">
                        ⬇️ Download
                    </button>
                </div>
            `;
        }).join('');
    }

    document.getElementById('attachmentsCount').textContent = `${allFiles.length} file(s) attached`;
    document.getElementById('attachmentsListBody').innerHTML = filesHtml;
    document.getElementById('viewAttachmentsModal').classList.add('show');
}

function downloadMailAttachment(fileData, fileName) {
    if (!fileData) return showToast('File data is missing', 'error');
    
    const a = document.createElement('a');
    a.href = fileData;
    a.download = fileName || 'attachment';
    document.body.appendChild(a);
    a.click();
    a.remove();
    
    showToast('⬇️ Downloading ' + fileName, 'info');
}

// ================================================================
// 17. POLLING — CHECK FOR NEW MESSAGES
// ================================================================
setInterval(() => {
    if (document.getElementById('tab-mail-center')?.classList.contains('active')) {
        loadMailBadges();
    }
}, 30000);

// ================================================================
// 18. INIT MAIL BADGES ON LOAD
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadMailBadges().catch(() => {});
    }, 3000);
});
// ================================================================
// 🆕 FUNGA MODALS ZOTE KABLA YA KUFUNGUA MPYA
// ================================================================
function closeAllMailModals() {
    document.querySelectorAll('.mc-overlay').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
}