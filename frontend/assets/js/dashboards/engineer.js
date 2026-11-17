// ================================================================
// MAK DC INVESTMENT — ENGINEER (PRODUCTION MANAGER) DASHBOARD
// API-Based Frontend Logic
// ================================================================

let currentUser = null;
let currentProfilePic = null;
let allMaterials = [];
let allProducts = [];
let usageRowCounter = 0;

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!protectPage('Engineer', 'SuperAdmin', 'CEO', 'Manager')) return;
    currentUser = Auth.getUser();
    renderEngineerProfile();
    initSidebar();
    await loadDashboard();
    await loadProductsForDropdown();
    await loadRawMaterials(); 
});

// ================================================================
// PROFILE RENDER
// ================================================================
function renderEngineerProfile() {
    if (!currentUser) return;
    const user = currentUser;
    const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    setText('sidebarUserName', user.fullName);
    setAvatar('sidebarUserAvatar', user.profilePic, initials);
    setText('udName', user.fullName);
    setText('udRole', `🏭 ${user.role}`);
    setAvatar('udAvatar', user.profilePic, initials);
    setText('udpName', user.fullName);
    setText('udpRole', `🏭 ${user.role}`);
    setText('udpEmail', user.email || '—');
    setText('udpPhone', user.phone || '—');
    setText('udpDepartment', user.department || '—');
    setText('udpEmployeeId', user.employeeId || '—');
    setAvatar('udpPic', user.profilePic, initials);
}

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

// ================================================================
// TABS NAVIGATION
// ================================================================
function switchTab(tabId, event) {
    if(event) event.preventDefault();
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    if(event && event.currentTarget) event.currentTarget.classList.add('active');
    
    switch(tabId) {
        case 'tab1': loadDashboard(); break;
        case 'tab2': loadRawMaterials(); loadReceipts(); break;
        case 'tab3': loadBatches(); break;
        case 'tab4': loadStock(); break;
        case 'tab5': loadPendingRelease(); break;
        case 'tab6': loadQualityControl(); break;
        case 'tab7': handleReportTypeChange(); break;
        case 'my-requests': loadMyRequests(); break;
        case 'tab-my-budget': loadMyBudget(); break;
        case 'tab-all-my-budgets': loadAllBudgetsPage(); break;
        
        // 🆕 Ongeza mstari huu hapa chini
        case 'tab-my-kpis': loadEngineerKpis(); break;
    }
    if (window.innerWidth <= 768) closeSidebar();
}
// ================================================================
// MY REQUESTS (PROCUREMENT) - ENGINEER
// ================================================================
async function loadMyRequests() {
    const tbody = document.getElementById('myRequestsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">⏳ Loading requests...</td></tr>`;

    try {
        const all = await API.getProcurementRequests('/all');
        const user = Auth.getUser();
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        
        // Chuja requests za mtumiaji huyu pekee
        const myRequests = list.filter(r => {
            if (r.requested_by_id && user.userId) return Number(r.requested_by_id) === Number(user.userId);
            return r.requested_by === user.fullName;
        });

        // Hifadhi kwa ajili ya ku-edit (kama ipo)
        window.allMyRequests = myRequests;

        if (myRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#94a3b8;">📭 You haven't submitted any requests yet.</td></tr>`;
            return;
        }

        // Chora jedwali
        tbody.innerHTML = myRequests.map(r => {
            // Pata status badge (Unaweza kutumia function uliyonayo au hii hapa chini)
            const statusInfo = getRequestStatusInfo(r.status); 
            
            const unread = Number(r.unread_messages || 0);
            const msgBadge = unread ? `<span style="background:#dc2626;color:#fff;border-radius:10px;padding:0 6px;font-size:10px;margin-left:3px;">${unread}</span>` : '';

            const safeTitle = esc(r.title || '');

            return `
            <tr style="border-bottom:1px solid #eef0ea;">
                <td style="padding:10px 12px;"><strong style="font-family:monospace;color:var(--primary);">${esc(r.request_number || '—')}</strong></td>
                <td style="padding:10px 12px;">${esc(r.title || '—')}</td>
                <td style="padding:10px 12px;">TSh ${Number(r.total_amount || 0).toLocaleString()}</td>
                <td style="padding:10px 12px;">
                    <span style="display:inline-flex;align-items:center;gap:4px;background:${statusInfo.bg};color:${statusInfo.color};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;">
                        ${statusInfo.icon} ${statusInfo.label}
                    </span>
                </td>
                <td style="padding:10px 12px;">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</td>
                <td style="padding:10px 12px;text-align:center;white-space:nowrap;">
                    <!-- View Button -->
                    <button onclick="viewMyRequest(${r.id})" style="padding:4px 10px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">👁</button>
                    
                    <!-- 🆕 MESSAGES BUTTON -->
                    <button data-req-id="${r.id}" data-req-title="${safeTitle}" onclick="openFinanceMessages(this.dataset.reqId, this.dataset.reqTitle)" style="padding:4px 10px;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-left:4px;">
                        💬 ${msgBadge}
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error('❌ loadMyRequests error:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#dc2626;">
            ❌ Error: ${esc(err.message)}
        </td></tr>`;
    }
}

// Helper function ya kupata rangi za status (Weka hii pia kama huna)
function getRequestStatusInfo(status) {
    const map = {
        'pending':         { icon: '⏳', label: 'Awaiting Procurement', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'pending-manager': { icon: '👔', label: 'With Manager', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
        'pending-ceo':     { icon: '🏢', label: 'With CEO', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
        'approved':        { icon: '✅', label: 'Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
        'purchasing':      { icon: '🛒', label: 'In Purchasing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'pending-finance': { icon: '💰', label: 'With Finance', color: '#14b8a6', bg: 'rgba(20,184,166,0.15)' },
        'paid':            { icon: '💵', label: 'Paid', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
        'completed':       { icon: '🎉', label: 'Completed', color: '#16a34a', bg: 'rgba(22,163,74,0.15)' },
        'returned':        { icon: '🔄', label: 'Returned', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
        'rejected':        { icon: '❌', label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
    };
    return map[status] || { icon: '❓', label: status || 'Unknown', color: '#64748b', bg: 'rgba(100,116,139,0.15)' };
}

// Function ya ku-view request (Unaweza kuongeza details zake hapa)
function viewMyRequest(id) {
    // Kama una modal ya ku-view, itumie hapa
    // Mfano:
    const req = window.allMyRequests.find(r => r.id === id);
    if(req) {
        showToast(`Request: ${req.title} (TSh ${Number(req.total_amount).toLocaleString()})`, 'info');
    }
}
// ================================================================
// MESSAGES (Engineer)
// ================================================================
let currentFinanceMsgReqId = null; // Tutaitumia kuhifadhi ID ya request

function openFinanceMessages(reqId, reqTitle) {
    currentFinanceMsgReqId = reqId;
    let modal = document.getElementById('messagesModal');
    if (!modal) return;

    // Weka jina la Request
    document.getElementById('msgReqLabel').textContent = `${reqTitle} (${reqId})`;
    document.getElementById('msgSubject').value = '';
    document.getElementById('msgBody').value = '';
    modal.style.display = 'flex';
    
    // Pakia ujumbe
    loadFinanceMessages(reqId);
}

function closeMessages() {
    const modal = document.getElementById('messagesModal');
    if (modal) modal.style.display = 'none';
    currentFinanceMsgReqId = null;
}

function loadFinanceMessages(reqId) {
    const thread = document.getElementById('msgThread');
    if (!thread) return;

    thread.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:20px;">⏳ Loading messages...</p>';

    API.getRequestMessages(reqId)
    .then(msgs => {
        if (!msgs || msgs.length === 0) {
            thread.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:40px;">💬 No messages yet. Start the conversation.</p>';
            return;
        }

        const user = Auth.getUser();
        const myFullName = (user.fullName || '').toLowerCase().trim(); 
        const myInitials = user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'ME';

        thread.innerHTML = msgs.map(m => {
            const senderNameLower = (m.sender_name || '').toLowerCase().trim();
            const isMine = (senderNameLower === myFullName) || (Number(m.sender_id) === Number(user.userId));
            
            const rowClass = isMine ? 'mine' : 'theirs';
            const senderInit = m.sender_name ? m.sender_name.substring(0, 2).toUpperCase() : '??';
            const displayInitials = isMine ? myInitials : senderInit;
            
            const ticks = isMine ? '<span class="chat-ticks">✓✓</span>' : '';
            const senderNameDisplay = isMine ? 'You' : esc(m.sender_name || 'Unknown');
            
            const dateObj = new Date(m.created_at);
            const time = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            return `
            <div class="chat-msg-row ${rowClass}">
                <div class="chat-avatar">${displayInitials}</div>
                <div class="chat-bubble-wrap">
                    <div class="chat-bubble">
                        ${m.subject ? `<div class="chat-subject">${esc(m.subject)}</div>` : ''}
                        <div>${esc(m.body)}</div>
                    </div>
                    <div class="chat-footer">
                        ${senderNameDisplay} • ${time} ${ticks}
                    </div>
                </div>
            </div>`;
        }).join('');
        
        setTimeout(() => {
            thread.scrollTop = thread.scrollHeight;
        }, 50);
    })
    .catch(err => {
        thread.innerHTML = `<p style="color:#dc2626;text-align:center;padding:20px;">❌ ${esc(err.message)}</p>`;
    });
}

async function sendMessage(btn) {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();
    
    if (!body) { 
        showToast('Write a message first.', 'warning'); 
        return; 
    }

    if (!btn) btn = document.querySelector('#messagesModal button[onclick*="sendMessage"]');
    if (!btn) return;
    
    const origText = btn.innerHTML;
    btn.innerHTML = '⏳';
    btn.disabled = true;

    try {
        await API.sendRequestMessage(currentFinanceMsgReqId, { subject, body });
        document.getElementById('msgBody').value = '';
        document.getElementById('msgSubject').value = '';
        loadFinanceMessages(currentFinanceMsgReqId);
    } catch (err) {
        showToast('Could not send message: ' + err.message, 'error');
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

function handleTypingInput() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }
}

// ================================================================
// ACCORDION SUBMENU
// ================================================================
function toggleSubmenu(event, submenuId) {
    if (event) event.preventDefault(); 
    const clickedLink = event.currentTarget;
    const submenu = document.getElementById(submenuId);
    
    if (document.getElementById('sidebar').classList.contains('collapsed')) {
        document.getElementById('sidebar').classList.remove('collapsed');
        return;
    }

    clickedLink.classList.toggle('open');
    if (submenu) {
        submenu.classList.toggle('show');
    }
}

// ================================================================
// DASHBOARD (Tab 1)
// ================================================================
// Variables za Charts
let productionTrendChart = null;
let qualityRatioChart = null;
let productBreakdownChart = null;

async function loadDashboard() {
    try {
        // Update Hero
        if (currentUser) {
            const firstName = currentUser.fullName.split(' ')[0];
            setText('heroEngineerName', firstName);
        }
        setText('heroDate', new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }));

        const data = await API.getProductionDashboard();
        if (!data) return;

        // Update Net Worth (Stock Value)
        const totalStock = data.kpi.totalStock || 0;
        setText('heroNetWorth', 'TSh ' + totalStock.toLocaleString());

        // Render Charts
        renderProductionTrend(data.charts.productionTrend);
        renderQualityRatio(data.kpi.totalStock, data.kpi.totalDamagedStock);
        renderProductBreakdown(data.charts.productBreakdown);

        // Render Activity Feed
        renderActivityFeed(data.recentActivity.batches);

        // Render Low Stock Alerts
        renderLowStockAlerts(data.lowStockMaterials);

    } catch (err) {
        console.error('Dashboard error:', err);
        showToast('Error loading dashboard: ' + err.message, 'error');
    }
}

function renderProductionTrend(trendData) {
    const ctx = document.getElementById('productionTrendChart');
    if (!ctx) return;

    if (productionTrendChart) {
        productionTrendChart.destroy();
    }

    const labels = trendData.map(d => d.label);
    const goodData = trendData.map(d => d.produced - d.damaged);
    const damagedData = trendData.map(d => d.damaged);

    productionTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Good Products',
                    data: goodData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2ecc71',
                    pointRadius: 5
                },
                {
                    label: 'Damaged',
                    data: damagedData,
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    tension: 0.4,
                    borderDash: [5, 5],
                    pointBackgroundColor: '#ef4444',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()} units`
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(226, 232, 240, 0.5)' } 
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderQualityRatio(goodStock, damagedStock) {
    const ctx = document.getElementById('qualityRatioChart');
    if (!ctx) return;

    if (qualityRatioChart) {
        qualityRatioChart.destroy();
    }

    qualityRatioChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Good Stock', 'Damaged Stock'],
            datasets: [{
                data: [goodStock, damagedStock],
                backgroundColor: ['#2ecc71', '#ef4444'],
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 11, weight: '600' },
                        padding: 12,
                        boxWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed.toLocaleString()} units`
                    }
                }
            }
        }
    });
}

function renderProductBreakdown(products) {
    const ctx = document.getElementById('productBreakdownChart');
    if (!ctx) return;

    if (productBreakdownChart) {
        productBreakdownChart.destroy();
    }

    if (products.length === 0) {
        ctx.parentElement.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gray-400); font-size: 14px;">No production data this month.</div>';
        return;
    }

    const labels = products.map(p => p.name);
    const data = products.map(p => p.produced);

    const colors = [
        'rgba(26, 127, 90, 0.85)',
        'rgba(34, 160, 107, 0.85)',
        'rgba(46, 204, 113, 0.85)',
        'rgba(14, 165, 164, 0.85)',
        'rgba(15, 118, 110, 0.85)'
    ];

    productBreakdownChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Produced Units',
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `Produced: ${ctx.parsed.y.toLocaleString()} units`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.5)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderActivityFeed(batches) {
    const container = document.getElementById('activityFeed');
    if (!container) return;

    if (batches.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--gray-400); font-size: 13px;">No recent activity.</div>';
        return;
    }

    container.innerHTML = batches.map(b => {
        const timeAgo = getTimeAgo(new Date(b.createdAt));
        return `
            <div style="display: flex; gap: 12px; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(26, 127, 90, 0.1); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">🏭</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; color: var(--gray-800); font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${esc(b.product)} — ${esc(b.batchNo)}
                    </div>
                    <div style="font-size: 11px; color: var(--gray-500); margin-top: 2px;">
                        Produced: <strong style="color: var(--green);">${b.produced}</strong> ${esc(b.unit)} • 
                        Damaged: <strong style="color: var(--red);">${b.damaged}</strong> • 
                        By: ${esc(b.reportedBy)}
                    </div>
                </div>
                <div style="font-size: 10px; color: var(--gray-400); white-space: nowrap; align-self: center;">${timeAgo}</div>
            </div>
        `;
    }).join('');
}

function renderLowStockAlerts(materials) {
    const container = document.getElementById('lowStockAlerts');
    if (!container) return;

    if (!materials || materials.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--green); font-weight: 700; font-size: 13px;">✓ All materials are sufficiently stocked.</div>';
        return;
    }

    container.innerHTML = materials.map(m => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid #f1f5f9; transition: background 0.15s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='white'">
            <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: var(--red); display: flex; align-items: center; justify-content: center; font-size: 18px;">⚠️</div>
                <div>
                    <div style="font-size: 13px; font-weight: 700; color: var(--gray-800);">${esc(m.name)}</div>
                    <div style="font-size: 11px; color: var(--gray-500); margin-top: 2px;">Reorder at: ${m.reorderLevel} ${esc(m.unit)}</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 15px; font-weight: 800; color: var(--red);">${m.currentStock} ${esc(m.unit)}</div>
                <div style="font-size: 10px; color: var(--gray-400);">Remaining</div>
            </div>
        </div>
    `).join('');
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

// Helper: Time Ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}
// ================================================================
// RAW MATERIALS (Tab 2)
// ================================================================
function openReceiveMaterialModal() {
    document.getElementById('rcvMaterialName').value = '';
    document.getElementById('rcvSpecs').value = '';
    document.getElementById('rcvUnit').value = '';
    document.getElementById('rcvQuantity').value = '';
    document.getElementById('rcvUnitCost').value = '';
    document.getElementById('rcvSupplier').value = '';
    document.getElementById('rcvInvoice').value = '';
    document.getElementById('rcvStatusMsg').className = 'status-msg';

    const datalist = document.getElementById('materialSuggestions');
    datalist.innerHTML = '';
    if (allMaterials) {
        allMaterials.forEach(m => {
            datalist.innerHTML += `<option value="${esc(m.name)}">`;
        });
    }
    document.getElementById('receiveMaterialModal').classList.add('show');
}

async function loadRawMaterials() {
    try {
        const materials = await API.getRawMaterials();
        allMaterials = materials;

        let totalValue = 0;
        let lowStockCount = 0;

        materials.forEach(m => {
            if (m.unitCost) totalValue += (m.currentStock * parseFloat(m.unitCost));
            if (m.currentStock <= m.reorderLevel) lowStockCount++;
        });

        document.getElementById('rawTotalMaterials').textContent = materials.length;
        document.getElementById('rawLowStockCount').textContent = lowStockCount;
        document.getElementById('rawTotalValue').textContent = 'TSh ' + totalValue.toLocaleString();

        const tbody = document.getElementById('rawMaterialsTableBody');
        if (!tbody) return;

        if (materials.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:var(--gray-500);">No materials yet. Click "+ Receive Material" to start.</td></tr>`;
            return;
        }

        tbody.innerHTML = materials.map(m => {
            const isLow = m.currentStock <= m.reorderLevel;
            const isOut = m.currentStock === 0;
            
            let badgeClass = 'ok';
            let badgeText = 'In Stock';
            if (isOut) { badgeClass = 'out'; badgeText = 'Out of Stock'; }
            else if (isLow) { badgeClass = 'low'; badgeText = 'Low Stock'; }

            const specsDisplay = m.specs ? `<br><span style="font-size: 11px; color: var(--gray-500); font-weight: 400;">${esc(m.specs)}</span>` : '';

            return `
                <tr>
                    <td style="font-weight: 700;">${esc(m.name)}${specsDisplay}</td>
                    <td style="color:var(--gray-500);">${esc(m.unit)}</td>
                    <td style="font-weight: 800; color: ${isOut ? 'var(--red)' : (isLow ? 'var(--orange)' : 'var(--green)')};">
                        ${m.currentStock.toLocaleString()}
                    </td>
                    <td style="color:var(--gray-500);">${m.reorderLevel}</td>
                    <td><span class="badge-status ${badgeClass}">${badgeText}</span></td>
                    <td>
                        <button class="btn-action primary" style="padding: 6px 12px; font-size: 12px; background: #3b82f6;" onclick="viewMaterialHistory(${m.id}, '${esc(m.name)}', '${esc(m.unit)}')">
                            👁️ View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Load raw materials error:', err);
    }
}

async function viewMaterialHistory(materialId, materialName, unit) {
    document.getElementById('histMaterialName').textContent = `📦 ${materialName} — History`;
    document.getElementById('histMaterialBody').innerHTML = '<p style="text-align:center; color:var(--gray-500);">Loading history...</p>';
    document.getElementById('materialHistoryModal').classList.add('show');

    try {
        const receipts = await API.getRawMaterialReceipts({ materialId: materialId });
        const usages = await API.getRawMaterialUsage(materialId);
        
        let html = '<h4 style="font-size:13px; color:var(--gray-700); margin-bottom:10px;">📜 Received (Inflow)</h4>';
        
        if (receipts.length === 0) {
            html += '<p style="color:var(--gray-400); font-size:12px;">No receipts yet.</p>';
        } else {
            html += receipts.map(r => `
                <div style="padding: 10px; border-bottom: 1px solid var(--gray-100); display:flex; justify-content:space-between;">
                    <div>
                        <div style="font-weight:700; color:var(--green);">+${r.quantity} ${unit}</div>
                        <div style="font-size:11px; color:var(--gray-500);">${r.supplier ? 'Supplier: ' + r.supplier : 'No supplier'} | By: ${r.receivedBy.fullName}</div>
                    </div>
                    <div style="font-size:11px; color:var(--gray-400);">${new Date(r.receivedAt).toLocaleString()}</div>
                </div>
            `).join('');
        }

        html += '<h4 style="font-size:13px; color:var(--gray-700); margin:16px 0 10px;">🏭 Used in Production (Outflow)</h4>';
        
        if (usages.length === 0) {
            html += '<p style="color:var(--gray-400); font-size:12px;">No production usage yet.</p>';
        } else {
            html += usages.map(u => `
                <div style="padding: 10px; border-bottom: 1px solid var(--gray-100); display:flex; justify-content:space-between;">
                    <div>
                        <div style="font-weight:700; color:var(--red);">-${u.quantityUsed} ${unit}</div>
                        <div style="font-size:11px; color:var(--gray-500);">
                            Batch: <strong>${u.batch.batchNo}</strong> (${u.batch.product.name})
                        </div>
                    </div>
                    <div style="font-size:11px; color:var(--gray-400);">${new Date(u.batch.productionDate).toLocaleString()}</div>
                </div>
            `).join('');
        }

        document.getElementById('histMaterialBody').innerHTML = html;
    } catch (err) {
        document.getElementById('histMaterialBody').innerHTML = `<p style="color:var(--red);">Error: ${err.message}</p>`;
    }
}

async function submitReceiveMaterial() {
    const statusDiv = document.getElementById('rcvStatusMsg');
    const materialName = document.getElementById('rcvMaterialName').value.trim();
    const specs = document.getElementById('rcvSpecs').value.trim();
    const unit = document.getElementById('rcvUnit').value.trim();
    const quantity = document.getElementById('rcvQuantity').value;
    const unitCost = document.getElementById('rcvUnitCost').value;
    const supplier = document.getElementById('rcvSupplier').value.trim();
    const invoiceNo = document.getElementById('rcvInvoice').value.trim();
    
    if (!materialName || !quantity || !unit) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Material Name, Unit, and Quantity are required';
        return;
    }
    
    try {
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '⏳ Processing...';

        const res = await API.receiveRawMaterial({
            materialName: materialName,
            specs: specs || null,
            unit: unit,
            quantity: parseFloat(quantity),
            unitCost: unitCost ? parseFloat(unitCost) : null,
            supplier: supplier || null,
            invoiceNo: invoiceNo || null,
        });
        
        showToast(res.message, 'success');
        
        setTimeout(() => {
            closeModal('receiveMaterialModal');
            loadRawMaterials(); 
            loadReceipts();     
            loadDashboard();    
        }, 1000);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}

async function loadReceipts() {
    try {
        const receipts = await API.getRawMaterialReceipts({ limit: 20 });
        const container = document.getElementById('receiptsList');
        if (!container) return;
        if (receipts.length === 0) {
            container.innerHTML = '<p style="color:var(--gray-400);font-size:12px;">No receipts yet.</p>';
            return;
        }
        container.innerHTML = receipts.map(r => `
            <div class="list-item">
                <div class="item-left">
                    <div class="item-title">${esc(r.material.name)} — ${r.quantity} ${esc(r.material.unit)}</div>
                    <div class="item-sub">${r.supplier ? 'Supplier: ' + esc(r.supplier) + ' | ' : ''}By: ${esc(r.receivedBy.fullName)} | ${new Date(r.receivedAt).toLocaleString()}</div>
                </div>
                <div class="item-right">
                    <span style="font-weight:700;color:var(--green);">+${r.quantity} ${esc(r.material.unit)}</span>
                </div>
            </div>
        `).join('');
    } catch (err) { console.error('Load receipts error:', err); }
}

// ================================================================
// PRODUCTION (Tab 3)
// ================================================================
async function loadProductsForDropdown() {
    try {
        allProducts = await API.getProductionProducts();
        const sel = document.getElementById('prodProduct');
        if (sel) {
            sel.innerHTML = '<option value="">— Select Product —</option>';
            for (const p of allProducts) {
                sel.innerHTML += `<option value="${p.id}">${esc(p.name)} (${esc(p.unit)})</option>`;
            }
        }
    } catch (err) { console.error('Load products error:', err); }
}

function addUsageRow() {
    usageRowCounter++;
    const container = document.getElementById('usageContainer');
    if (!container) return;
    
    const emptyMsg = document.getElementById('emptyUsageMsg');
    if (emptyMsg) emptyMsg.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'usage-row';
    row.id = `usageRow-${usageRowCounter}`;
    row.style.background = 'white';
    row.style.padding = '10px';
    row.style.borderRadius = '8px';
    row.style.border = '1px solid var(--gray-200)';
    row.style.marginBottom = '8px';
    
    let optionsHtml = '<option value="">— Select Material to use —</option>';
    allMaterials.forEach(m => {
        optionsHtml += `<option value="${m.id}">${esc(m.name)} (Stock: ${m.currentStock} ${esc(m.unit)})</option>`;
    });

    row.innerHTML = `
        <select class="usage-material" style="width: 60%;">${optionsHtml}</select>
        <input type="number" class="usage-qty" placeholder="Qty to use" step="0.01" style="width: 30%;">
        <button class="remove-btn" onclick="document.getElementById('usageRow-${usageRowCounter}').remove()">✕</button>
    `;
    container.appendChild(row);
}

function clearProductionForm() {
    document.getElementById('prodProduct').value = '';
    document.getElementById('prodProduced').value = '';
    document.getElementById('prodGood').value = '';
    document.getElementById('prodDamaged').value = '';
    document.getElementById('prodShift').value = '';
    document.getElementById('prodWorkers').value = '';
    document.getElementById('prodMachine').value = '';
    document.getElementById('prodDate').value = '';
    document.getElementById('prodDamagedReason').value = '';
    document.getElementById('usageContainer').innerHTML = '';
    usageRowCounter = 0;
    document.getElementById('prodStatusMsg').className = 'status-msg';
}

async function submitProductionBatch() {
    const statusDiv = document.getElementById('prodStatusMsg');
    
    // 🆕 Kizuizi cha Double-Click
    const submitBtn = document.querySelector('button[onclick="submitProductionBatch()"]');
    if (submitBtn && submitBtn.disabled) return; // Kama tayari inatuma, usifanye kitu
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ Creating...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
    }

    const productId = document.getElementById('prodProduct').value;
    const quantityProduced = document.getElementById('prodProduced').value;
    const quantityGood = document.getElementById('prodGood').value;
    const quantityDamaged = document.getElementById('prodDamaged').value;
    const shift = document.getElementById('prodShift').value;
    const workersCount = document.getElementById('prodWorkers').value;
    const machineUsed = document.getElementById('prodMachine').value.trim();
    const productionDate = document.getElementById('prodDate').value;
    const damagedReason = document.getElementById('prodDamagedReason').value.trim();
    
    if (!productId || !quantityProduced) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Product and Quantity Produced are required';
        // Rudisha kitufe kama kuna kosa la validation
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🏭 Create & Deduct Stock';
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
        return;
    }
    
    const usages = [];
    document.querySelectorAll('.usage-row').forEach(row => {
        const matId = row.querySelector('.usage-material')?.value;
        const qty = row.querySelector('.usage-qty')?.value;
        if (matId && qty) {
            usages.push({ materialId: parseInt(matId), quantityUsed: parseFloat(qty) });
        }
    });
    
    try {
        const res = await API.createProductionBatch({
            productId: parseInt(productId),
            quantityProduced: parseFloat(quantityProduced),
            quantityGood: quantityGood ? parseFloat(quantityGood) : parseFloat(quantityProduced),
            quantityDamaged: quantityDamaged ? parseFloat(quantityDamaged) : 0,
            damagedReason: damagedReason || null,
            shift: shift || null,
            workersCount: workersCount ? parseInt(workersCount) : 0,
            machineUsed: machineUsed || null,
            productionDate: productionDate || null,
            usages
        });
        
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ ' + res.message;
        showToast(res.message, 'success');
        clearProductionForm();
        
        await loadBatches();
        await loadRawMaterials();
        await loadDashboard();
        if (typeof loadEngineerKpis === 'function') loadEngineerKpis();
        
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        showToast(err.message, 'error');
    } finally {
        // 🆕 Rudisha kitufe kwenye hali ya kawaida baada ya kumaliza
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🏭 Create & Deduct Stock';
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }
}

async function loadBatches() {
    try {
        const batches = await API.getProductionBatches({ limit: 30 });
        const tbody = document.getElementById('batchesTableBody');
        if (!tbody) return;
        
        if (batches.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--gray-500);">No production batches yet.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = batches.map(b => `
            <tr>
                <td style="font-weight:700; color:var(--primary);">${esc(b.batchNo)}</td>
                <td style="font-weight:600;">${esc(b.product.name)}</td>
                <td>
                    <span style="color:var(--green); font-weight:700;">${b.quantityGood}</span> / 
                    <span style="color:var(--red); font-weight:700;">${b.quantityDamaged}</span> ${esc(b.product.unit)}
                </td>
                <td><span class="badge-status ${b.wastePercent > 5 ? 'out' : 'ok'}">${b.wastePercent.toFixed(1)}%</span></td>
                <td style="color:var(--gray-500); font-size:12px;">${new Date(b.productionDate).toLocaleDateString()}</td>
                <td>
                    <span class="status-tag ${b.releasedToSales ? 'released' : 'pending'}">
                        ${b.releasedToSales ? '✓ Released' : '⏳ Pending'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error('Load batches error:', err); }
}

// ================================================================
// STOCK (Tab 4)
// ================================================================
async function loadStock() {
    try {
        const data = await API.getStockOverview();
        if (!data) return;
        
        document.getElementById('stockTotalProducts').textContent = data.summary.totalProducts;
        document.getElementById('stockTotalUnits').textContent = data.summary.totalStock.toLocaleString();
        document.getElementById('stockLowCount').textContent = data.summary.lowStockCount;
        document.getElementById('stockOutCount').textContent = data.summary.outOfStockCount;

        const tbody = document.getElementById('stockTableBody');
        if (!tbody) return;

        if (data.products.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--gray-500);">No finished products in stock. Create a production batch first.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.products.map(p => {
            let stockBadgeClass = 'ok';
            let stockBadgeText = 'In Stock';
            if (p.status === 'OUT') { stockBadgeClass = 'out'; stockBadgeText = 'Out of Stock'; }
            else if (p.status === 'LOW') { stockBadgeClass = 'low'; stockBadgeText = 'Low Stock'; }

            const saleStatusHtml = p.availableForSale 
                ? `<span style="color:var(--green); font-size:11px; font-weight:700;">✓ Released</span>` 
                : `<span style="color:var(--orange); font-size:11px; font-weight:700;">⏳ Not Released</span>`;

            return `
                <tr>
                    <td style="font-weight: 700; color:var(--gray-800);">${esc(p.name)}</td>
                    <td style="color:var(--gray-500); font-size:12px;">${p.category ? esc(p.category) : '—'}</td>
                    <td style="font-weight: 800; color: ${p.status === 'OUT' ? 'var(--red)' : (p.status === 'LOW' ? 'var(--orange)' : 'var(--green)')};">
                        ${p.currentStock.toLocaleString()} ${esc(p.unit)}
                    </td>
                    <td style="color:var(--gray-500);">${p.minStockLevel} ${esc(p.unit)}</td>
                    <td>${saleStatusHtml}</td>
                    <td><span class="badge-status ${stockBadgeClass}">${stockBadgeText}</span></td>
                    <td>
                        <button class="btn-action primary" style="padding: 4px 12px; font-size: 11px; background: var(--blue);" onclick="viewProductDetails(${p.id}, '${esc(p.name)}')">
                            👁️ Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Load stock error:', err);
    }
}

async function viewProductDetails(productId, productName) {
    document.getElementById('detailProductName').textContent = productName;
    document.getElementById('detailProductCategory').textContent = 'Loading...';
    document.getElementById('productDetailsBody').innerHTML = '<p style="text-align:center; color:var(--gray-500);">Fetching details...</p>';
    document.getElementById('productDetailsModal').classList.add('show');

    try {
        const batches = await API.getProductionBatches({ productId: productId, limit: 50 });
        const stockData = await API.getStockOverview();
        const product = stockData.products.find(p => p.id === productId);

        if (product) {
            document.getElementById('detailProductCategory').textContent = product.category || 'General';
        }

        let html = '';
        
        if (product) {
            html += `
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; margin-bottom:20px;">
                    <div style="background:var(--gray-50); padding:16px; border-radius:10px; border:1px solid var(--gray-200); text-align:center;">
                        <div style="font-size:24px; font-weight:800; color:var(--primary);">${product.currentStock}</div>
                        <div style="font-size:11px; color:var(--gray-500); text-transform:uppercase;">In Stock</div>
                    </div>
                    <div style="background:var(--gray-50); padding:16px; border-radius:10px; border:1px solid var(--gray-200); text-align:center;">
                        <div style="font-size:24px; font-weight:800; color:var(--green);">${product.availableForSale ? 'YES' : 'NO'}</div>
                        <div style="font-size:11px; color:var(--gray-500); text-transform:uppercase;">Ready to Sell</div>
                    </div>
                    <div style="background:var(--gray-50); padding:16px; border-radius:10px; border:1px solid var(--gray-200); text-align:center;">
                        <div style="font-size:24px; font-weight:800; color:${product.status === 'OUT' ? 'var(--red)' : 'var(--gray-800)'};">${product.status}</div>
                        <div style="font-size:11px; color:var(--gray-500); text-transform:uppercase;">Stock Status</div>
                    </div>
                </div>
            `;
        }

        html += '<h4 style="font-size:13px; color:var(--gray-700); margin-bottom:10px;">🏭 Production History</h4>';
        
        if (batches.length === 0) {
            html += '<p style="color:var(--gray-400); font-size:12px; text-align:center; padding:20px;">No production batches found for this product.</p>';
        } else {
            html += '<div style="border:1px solid var(--gray-200); border-radius:8px; overflow:hidden;">';
            html += batches.map((b, idx) => `
                <div style="padding: 12px 16px; background: ${idx % 2 === 0 ? 'white' : 'var(--gray-50)'}; border-bottom: 1px solid var(--gray-100); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700; color:var(--gray-800); font-size:13px;">${b.batchNo}</div>
                        <div style="font-size:11px; color:var(--gray-500);">${new Date(b.productionDate).toLocaleDateString()} | Shift: ${b.shift || '—'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:12px; font-weight:700; color:var(--green);">+${b.quantityGood} Good</div>
                        <div style="font-size:11px; color:var(--red);">-${b.quantityDamaged} Damaged</div>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }

        document.getElementById('productDetailsBody').innerHTML = html;

    } catch (err) {
        document.getElementById('productDetailsBody').innerHTML = `<p style="color:var(--red); text-align:center;">Error: ${err.message}</p>`;
    }
}
async function loadPendingRelease() {
    try {
        const batches = await API.getProductionBatches({ limit: 100 });
        const tbody = document.getElementById('releaseTableBody');
        if (!tbody) return;
        
        // Chuja batches zilizopita QC lakini hazijatolewa (Pending Release)
        const pending = batches.filter(b => 
            b.qcStatus === 'passed' && 
            !b.releasedToSales && 
            b.quantityGood > 0
        );

        // Sasisha Kadi za Muhtasari
        document.getElementById('releasePendingBatches').textContent = pending.length;
        
        const totalUnits = pending.reduce((sum, b) => sum + b.quantityGood, 0);
        document.getElementById('releasePendingUnits').textContent = totalUnits.toLocaleString();

        let totalValue = 0;
        pending.forEach(b => {
            const price = b.product.price ? parseFloat(b.product.price) : 0;
            totalValue += (b.quantityGood * price);
        });
        document.getElementById('releasePendingValue').textContent = 'TSh ' + totalValue.toLocaleString();

        // Kama hakuna kitu
        if (pending.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--green); font-weight:600;">✓ No items pending release. All items have been released!</td></tr>`;
            return;
        }
        
        // Onyesha Jedwali lenye Kitufe cha "Release Now"
        tbody.innerHTML = pending.map(b => `
            <tr>
                <td style="font-weight:700; color:var(--primary);">${esc(b.batchNo)}</td>
                <td style="font-weight:600;">${esc(b.product.name)}</td>
                <td style="font-weight:800; color:var(--green);">${b.quantityGood.toLocaleString()} ${esc(b.product.unit)}</td>
                <td style="color:var(--gray-500); font-size:12px;">${new Date(b.productionDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn-action gold" style="padding: 6px 14px; font-size: 11px;" onclick="releaseBatch(${b.id}, '${esc(b.batchNo)}', ${b.quantityGood}, '${esc(b.product.unit)}')">
                        📤 Release Now
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) { 
        console.error('Load pending release error:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--red);">Error loading data: ${err.message}</td></tr>`;
        }
    }
}
async function releaseBatch(id, batchNo, quantity, unit) {
    document.getElementById('confirmTitle').textContent = '📤 Release Batch to Sales';
    document.getElementById('confirmMessage').innerHTML = `
        <div style="background: var(--gray-50); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: var(--gray-500); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Batch Number</div>
            <div style="font-size: 15px; font-weight: 800; color: var(--primary);">${batchNo}</div>
        </div>
        <div style="background: var(--gray-50); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: var(--gray-500); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Quantity Ready</div>
            <div style="font-size: 15px; font-weight: 800; color: var(--green);">${quantity} ${unit}</div>
        </div>
        <p style="font-size: 12px; color: var(--gray-500); margin-top: 10px;">
            These items will be added to the Sales Warehouse and will be available for sale.
        </p>
    `;
    const confirmBtn = document.getElementById('confirmActionBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', async function() {
        closeModal('customConfirmModal');
        showToast('⏳ Releasing batch...', 'info');
        try {
            const res = await API.releaseBatchToSales(id);
            showToast(res.message, 'success');
            await loadPendingRelease();
            await loadStock();
            await loadBatches();
            await loadDashboard();
            
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
    document.getElementById('customConfirmModal').classList.add('show');
}

function switchReleaseTab(tab) {
    const btnPending = document.getElementById('btnTabPending');
    const btnReleased = document.getElementById('btnTabReleased');
    const secPending = document.getElementById('releaseSectionPending');
    const secReleased = document.getElementById('releaseSectionReleased');

    if (tab === 'pending') {
        btnPending.style.background = 'white'; btnPending.style.color = 'var(--gray-800)'; btnPending.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnReleased.style.background = 'transparent'; btnReleased.style.color = 'var(--gray-500)'; btnReleased.style.boxShadow = 'none';
        secPending.style.display = 'block'; secReleased.style.display = 'none';
        loadPendingRelease();
    } else {
        btnReleased.style.background = 'white'; btnReleased.style.color = 'var(--gray-800)'; btnReleased.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnPending.style.background = 'transparent'; btnPending.style.color = 'var(--gray-500)'; btnPending.style.boxShadow = 'none';
        secReleased.style.display = 'block'; secPending.style.display = 'none';
        loadReleasedHistory(); 
    }
}

async function loadReleasedHistory() {
    try {
        const batches = await API.getProductionBatches({ released: 'true' });
        const tbody = document.getElementById('releasedTableBody');
        if (!tbody) return;

        if (batches.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--gray-500);">No released history found.</td></tr>`;
            return;
        }

        tbody.innerHTML = batches.map(b => `
            <tr>
                <td style="font-weight:700; color:var(--primary);">${esc(b.batchNo)}</td>
                <td style="font-weight:600;">${esc(b.product.name)}</td>
                <td style="font-weight:800; color:var(--blue);">${b.quantityGood.toLocaleString()} ${esc(b.product.unit)}</td>
                <td style="color:var(--gray-500); font-size:12px;">${b.releasedAt ? new Date(b.releasedAt).toLocaleDateString() : '—'}</td>
                <td>
                <button class="btn-action primary" style="padding: 4px 12px; font-size: 11px; background: var(--blue);" onclick="viewInspectionNotice('${b.qcNoticeNo || 'N/A'}', '${b.batchNo}', '${esc(b.qcInspectorName || 'N/A')}', '${b.qcNotes || 'No notes'}', '${b.qcCheckedAt || b.releasedAt}')">
                    📜 View Notice
                </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Load released history error:', err);
    }
}

function viewReleasedDetails(id, batchNo, productName, qty, unit, date, releasedBy) {
    document.getElementById('viewModalTitle').textContent = `📦 ${batchNo} — Details`;
    
    let html = `
        <div class="info-row"><span class="label">Product:</span><span class="value">${productName}</span></div>
        <div class="info-row"><span class="label">Qty Released:</span><span class="value" style="color:var(--green); font-weight:800;">${qty} ${unit}</span></div>
        <div class="info-row"><span class="label">Date Released:</span><span class="value">${date ? new Date(date).toLocaleString() : '—'}</span></div>
        <div class="info-row"><span class="label">Reported By:</span><span class="value">${releasedBy}</span></div>
        
        <div style="margin-top:16px; padding:12px; background:rgba(34, 197, 94, 0.1); border-left:4px solid var(--green); border-radius:6px; font-size:12px; color:var(--gray-700);">
            <strong>Status:</strong> These items are in the Sales system and available for sale.
        </div>
    `;
    
    document.getElementById('viewModalBody').innerHTML = html;
    document.getElementById('viewModal').classList.add('show');
}
function viewInspectionNotice(noticeNo, batchNo, inspector, notes, date) {
    // Tengeneza QR Code
    const qrText = `MAK DC INVESTMENT - QUALITY CERTIFICATE\nNotice: ${noticeNo}\nBatch: ${batchNo}\nInspector: ${inspector}\nDate: ${new Date(date).toLocaleDateString()}\nStatus: PASSED`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrText)}`;

    // Tunachukua ile div ya ndani tuliyoweka kwenye HTML (yenye z-index: 1)
    const contentDiv = document.querySelector('#inspectionNoticeBody > div:last-child');

    let html = `
        <!-- Status Seal -->
        <div style="text-align:center; margin-bottom:20px;">
            <div style="display:inline-flex; align-items:center; justify-content:center; width:70px; height:70px; background:rgba(34, 197, 94, 0.08); border: 2px solid rgba(34, 197, 94, 0.3); border-radius:50%; margin-bottom:10px; position:relative;">
                <span style="font-size:36px; color:var(--green);">✓</span>
                <div style="position:absolute; bottom: -8px; background:var(--green); color:white; font-size:8px; font-weight:800; padding:2px 8px; border-radius:10px; letter-spacing:1px;">VERIFIED</div>
            </div>
            <h2 style="font-family: 'Georgia', serif; font-size:24px; font-weight:800; color:var(--primary-dark); margin-bottom:4px;">Inspection Passed</h2>
        </div>

        <!-- Narrative -->
        <div style="text-align:center; margin-bottom:24px; padding: 0 10px;">
            <p style="font-size:13px; color:var(--gray-600); line-height:1.6;">
                This is to certify that the production batch <strong>${batchNo}</strong> has been thoroughly inspected by the Quality Assurance Department. 
                All items have met the required standards and specifications. 
                Therefore, this batch is hereby <strong>approved and released</strong> for marketing and distribution.
            </p>
        </div>

        <!-- Details Grid -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:24px; padding: 0 10px;">
            <div style="border-bottom: 1px dashed var(--gray-300); padding-bottom: 8px;">
                <div style="font-size:9px; font-weight:800; color:var(--gray-400); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Notice Number</div>
                <div style="font-size:15px; font-weight:900; color:var(--primary); font-family: monospace;">${noticeNo}</div>
            </div>
            <div style="border-bottom: 1px dashed var(--gray-300); padding-bottom: 8px;">
                <div style="font-size:9px; font-weight:800; color:var(--gray-400); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Batch Number</div>
                <div style="font-size:14px; font-weight:800; color:var(--gray-800); font-family: monospace;">${batchNo}</div>
            </div>
            <div style="border-bottom: 1px dashed var(--gray-300); padding-bottom: 8px;">
                <div style="font-size:9px; font-weight:800; color:var(--gray-400); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Inspected By</div>
                <div style="font-size:14px; font-weight:700; color:var(--gray-800);">${inspector}</div>
            </div>
            <div style="border-bottom: 1px dashed var(--gray-300); padding-bottom: 8px;">
                <div style="font-size:9px; font-weight:800; color:var(--gray-400); text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Date & Time</div>
                <div style="font-size:12px; font-weight:700; color:var(--gray-700);">${new Date(date).toLocaleString()}</div>
            </div>
        </div>

        <!-- Inspector Notes -->
        <div style="margin-bottom:24px; padding: 0 10px;">
            <div style="font-size:10px; font-weight:800; color:var(--gray-500); text-transform:uppercase; letter-spacing:1px; margin-bottom:6px;">Inspector Comments</div>
            <div style="background: rgba(248, 250, 252, 0.8); border-left: 4px solid var(--gold); padding: 12px 16px; border-radius: 0 6px 6px 0;">
                <p style="font-size:13px; color:var(--gray-700); line-height:1.5; font-style:italic;">"${notes}"</p>
            </div>
        </div>

        <!-- QR Code & Signatures -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; padding: 16px 10px 0; border-top: 1px solid var(--gray-200);">
            
            <!-- QR Code Section -->
            <div style="text-align:center;">
                <img src="${qrUrl}" alt="QR Code" style="width: 80px; height: 80px; border: 2px solid var(--gray-200); border-radius: 6px; padding: 3px; background: white;">
                <div style="font-size:8px; font-weight:700; color:var(--gray-500); margin-top:4px; letter-spacing:1px;">SCAN TO VERIFY</div>
            </div>

            <!-- Signature Section -->
            <div style="text-align:center; width: 200px;">
                <div style="font-family: 'Brush Script MT', 'Caveat', cursive, sans-serif; font-size:28px; color:var(--primary-dark); margin-bottom:6px; transform: rotate(-3deg);">${inspector}</div>
                <div style="border-bottom:2px solid var(--gray-400); margin-bottom:4px;"></div>
                <div style="font-size:10px; font-weight:800; color:var(--gray-500); text-transform:uppercase; letter-spacing:1px;">Authorized Signature</div>
            </div>
        </div>
    `;
    
    contentDiv.innerHTML = html;
    document.getElementById('inspectionNoticeModal').classList.add('show');
}
// ================================================================
// DAMAGED PRODUCTS (Tab 6)
// ================================================================
async function loadDamaged() {
    try {
        const data = await API.getDamagedProducts();
        if (!data) return;
        
        // Update Summary Cards
        document.getElementById('damagedTotalBatches').textContent = data.summary.totalDamagedBatches;
        document.getElementById('damagedTotalQty').textContent = data.summary.totalDamagedQty.toLocaleString();
        document.getElementById('damagedTotalValue').textContent = 'TSh ' + Number(data.summary.totalDamagedValue).toLocaleString();

        // Update Table
        const tbody = document.getElementById('damagedTableBody');
        if (!tbody) return;

        if (data.batches.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:30px; color:var(--green); font-weight:600;">✓ No damaged products recorded. Great job!</td></tr>`;
            return;
        }

        tbody.innerHTML = data.batches.map(b => `
            <tr>
                <td style="font-weight:700; color:var(--primary);">${esc(b.batchNo)}</td>
                <td style="font-weight:600;">${esc(b.product.name)}</td>
                <td style="color:var(--gray-600);">${b.quantityProduced} ${esc(b.product.unit)}</td> <!-- 🆕 Ongeza hii -->
                <td style="font-weight:800; color:var(--red);">${b.quantityDamaged} ${esc(b.product.unit)}</td>
                <td><span class="badge-status out">${b.wastePercent.toFixed(1)}%</span></td>
                <td style="font-size:12px; color:var(--gray-600);">${b.damagedReason ? esc(b.damagedReason) : '—'}</td>
                <td style="color:var(--gray-500); font-size:12px;">${new Date(b.productionDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn-action primary" style="padding: 4px 12px; font-size: 11px; background: var(--blue);" onclick="viewDamageDetails(${b.id}, '${esc(b.batchNo)}', '${esc(b.product.name)}', ${b.quantityProduced}, ${b.quantityDamaged}, '${esc(b.product.unit)}', ${b.wastePercent}, '${esc(b.damagedReason || '')}', '${b.productionDate}', '${esc(b.reportedBy.fullName)}')">
                        👁️ Details
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (err) { 
        console.error('Load damaged error:', err); 
    }
}
function viewDamageDetails(id, batchNo, productName, produced, damaged, unit, wastePercent, reason, date, reportedBy) {
    document.getElementById('viewModalTitle').textContent = `⚠️ ${batchNo} — Damage Details`;
    
    let html = `
        <div class="info-row"><span class="label">Product:</span><span class="value">${productName}</span></div>
        <div class="info-row"><span class="label">Total Produced:</span><span class="value">${produced} ${unit}</span></div>
        <div class="info-row"><span class="label">Damaged Qty:</span><span class="value" style="color:var(--red); font-weight:800;">${damaged} ${unit}</span></div>
        <div class="info-row"><span class="label">Waste Percentage:</span><span class="value" style="color:var(--orange); font-weight:800;">${wastePercent.toFixed(1)}%</span></div>
        <div class="info-row"><span class="label">Date:</span><span class="value">${new Date(date).toLocaleString()}</span></div>
        <div class="info-row"><span class="label">Reported By:</span><span class="value">${reportedBy}</span></div>
        
        <div style="margin-top:16px; padding:12px; background:rgba(239, 68, 68, 0.05); border-left:4px solid var(--red); border-radius:6px; font-size:13px; color:var(--gray-700);">
            <strong>Reason for Damage:</strong><br>
            ${reason ? reason : 'No reason provided.'}
        </div>
    `;
    
    document.getElementById('viewModalBody').innerHTML = html;
    document.getElementById('viewModal').classList.add('show');
}
// ================================================================
// QUALITY CONTROL (Tab 6)
// ================================================================
async function loadQualityControl() {
    try {
        // Kuchukua batches zote na kuchuja zile za pending QC
        const batches = await API.getProductionBatches({ limit: 100 });
        const tbody = document.getElementById('qcTableBody');
        if (!tbody) return;

        const pendingQC = batches.filter(b => (b.qcStatus === 'pending' || !b.qcStatus) && b.quantityGood > 0);

        if (pendingQC.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--green); font-weight:600;">✓ No products pending Quality Check. All clear!</td></tr>`;
            return;
        }

        tbody.innerHTML = pendingQC.map(b => `
            <tr>
                <td style="font-weight:700; color:var(--primary);">${esc(b.batchNo)}</td>
                <td style="font-weight:600;">${esc(b.product.name)}</td>
                <td style="font-weight:800; color:var(--gray-800);">${b.quantityGood} ${esc(b.product.unit)}</td>
                <td style="color:var(--gray-500); font-size:12px;">${new Date(b.productionDate).toLocaleDateString()}</td>
                <td><span class="badge-status low">Pending QC</span></td>
                <td>
                    <button class="btn-action gold" style="padding: 4px 12px; font-size: 11px;" onclick="openQCModal(${b.id}, '${esc(b.batchNo)}')">
                        🔍 Inspect
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Load QC error:', err);
    }
}

function openQCModal(batchId, batchNo) {
    document.getElementById('qcBatchId').value = batchId;
    document.getElementById('qcModalTitle').innerHTML = `<span style="font-size: 20px;">🔍</span> QC for ${batchNo}`;
    document.getElementById('qcNotes').value = '';
    document.getElementById('qcStatusMsg').className = 'status-msg';
    document.getElementById('qcModal').classList.add('show');
}

async function submitQC(result) {
    const statusDiv = document.getElementById('qcStatusMsg');
    const batchId = document.getElementById('qcBatchId').value;
    const notes = document.getElementById('qcNotes').value.trim();

    if (!notes) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please provide inspection notes before proceeding.';
        return;
    }

    try {
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '⏳ Generating Inspection Notice...';

        const res = await API.submitBatchQC(parseInt(batchId), { result, notes });
        
        // 🆕 Badilisha Modal iwe ni "Inspection Notice"
        const modalBody = document.querySelector('#qcModal > div.modal-box > div:nth-child(2)');
        const modalFooter = document.querySelector('#qcModal > div.modal-box > div:nth-child(3)');
        
        // Ficha fomu
        modalBody.innerHTML = `
            <div style="text-align:center; padding: 20px 0;">
                <div style="font-size: 48px; color: var(--green); margin-bottom: 10px;">${result === 'passed' ? '✅' : '❌'}</div>
                <h2 style="color: var(--gray-800); margin-bottom: 5px;">Quality Inspection ${result === 'passed' ? 'PASSED' : 'FAILED'}</h2>
                <p style="color: var(--gray-500); font-size: 13px;">An official notice has been generated.</p>
                
                <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: 12px; padding: 20px; margin-top: 20px; text-align: left;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--gray-200); padding-bottom:8px; margin-bottom:8px;">
                        <span style="font-size:11px; color:var(--gray-500); font-weight:700;">NOTICE NUMBER</span>
                        <span style="font-weight:800; color:var(--primary);">${res.batch.qcNoticeNo}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--gray-200); padding-bottom:8px; margin-bottom:8px;">
                        <span style="font-size:11px; color:var(--gray-500); font-weight:700;">BATCH NO</span>
                        <span style="font-weight:700;">${res.batch.batchNo}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--gray-200); padding-bottom:8px; margin-bottom:8px;">
                        <span style="font-size:11px; color:var(--gray-500); font-weight:700;">INSPECTOR</span>
                        <span style="font-weight:700;">${res.batch.qcInspectorName}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--gray-200); padding-bottom:8px; margin-bottom:8px;">
                        <span style="font-size:11px; color:var(--gray-500); font-weight:700;">DATE</span>
                        <span style="font-weight:700;">${new Date().toLocaleString()}</span>
                    </div>
                    <div style="margin-top:10px;">
                        <span style="font-size:11px; color:var(--gray-500); font-weight:700;">INSPECTOR NOTES</span>
                        <p style="font-size:12px; color:var(--gray-700); margin-top:4px;">"${notes}"</p>
                    </div>
                </div>
            </div>
        `;
        
        // Badilisha vitufe kuwa "Print Notice"
        modalFooter.innerHTML = `
            <button class="btn-action primary" onclick="window.print()" style="flex:1; justify-content:center; padding: 12px; font-size: 13px; font-weight:700;">
                🖨️ Print Notice
            </button>
            <button class="btn-action" style="background:var(--gray-200); color:var(--gray-700); flex:1; justify-content:center; padding: 12px; font-size: 13px; font-weight:700;" onclick="closeQcModalAndRefresh()">
                Done
            </button>
        `;

        // Update data zote kwa nyuma
        loadDashboard(); loadStock(); loadPendingRelease(); loadDamaged(); loadQualityControl();

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}
// Function ya kufunga Modal na ku-refresh ukurasa
function closeQcModalAndRefresh() {
    document.getElementById('qcModal').classList.remove('show');
    // Rudisha fomu ya QC kama ilivyokuwa
    setTimeout(() => {
        location.reload(); 
    }, 300);
}
// ================================================================
// DAILY REPORTS (Tab 7)
// ================================================================
async function loadDailyReports() {
    try {
        const reports = await API.getDailyProductionReports({ limit: 30 });
        const container = document.getElementById('dailyReportsList');
        if (!container) return;
        if (reports.length === 0) {
            container.innerHTML = '<p style="color:var(--gray-400);font-size:12px;">No reports yet.</p>';
            return;
        }
        container.innerHTML = reports.map(r => `
            <div style="margin-bottom:14px;padding:12px;background:var(--gray-50);border-radius:10px;border-left:4px solid var(--primary);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-weight:800;color:var(--gray-800);font-size:13px;">📅 ${new Date(r.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div style="font-size:11px;color:var(--gray-500);">
                        ${r.batches.length} batches | Produced: <strong>${r.totalProduced}</strong> | Good: <strong style="color:var(--green);">${r.totalGood}</strong> | Damaged: <strong style="color:var(--red);">${r.totalDamaged}</strong>
                    </div>
                </div>
                ${r.batches.map(b => `
                    <div style="padding:6px 0;border-top:1px solid var(--gray-200);font-size:12px;color:var(--gray-600);">
                        <strong>${esc(b.batchNo)}</strong> — ${esc(b.product.name)}: ${b.quantityGood} ${esc(b.product.unit)} good, ${b.quantityDamaged} damaged
                    </div>
                `).join('')}
            </div>
        `).join('');
    } catch (err) { console.error('Load daily reports error:', err); }
}
// ================================================================
// PRODUCTION REPORTS (Tab 7)
// ================================================================

// Badilisha fomu kulingana na aina ya ripoti
function handleReportTypeChange() {
    const type = document.getElementById('reportType').value;
    
    // Ficha zote kwanza
    document.getElementById('monthlySelectGroup').style.display = 'none';
    document.getElementById('startDateGroup').style.display = 'none';
    document.getElementById('endDateGroup').style.display = 'none';
    
    // Onyesha kulingana na aina
    if (type === 'monthly') {
        document.getElementById('monthlySelectGroup').style.display = 'block';
        // Weka mwezi wa sasa kama default
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        document.getElementById('reportMonth').value = monthStr;
    } else if (type === 'custom') {
        document.getElementById('startDateGroup').style.display = 'block';
        document.getElementById('endDateGroup').style.display = 'block';
        // Weka tarehe ya leo kama default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('reportStartDate').value = today;
        document.getElementById('reportEndDate').value = today;
    }
}

// Zalisha Ripoti
async function generateProductionReport() {
    const type = document.getElementById('reportType').value;
    let startDate, endDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (type === 'daily') {
        startDate = endDate = today.toISOString().split('T')[0];
    } else if (type === 'monthly') {
        const monthVal = document.getElementById('reportMonth').value;
        if (!monthVal) { showToast('Please select a month', 'error'); return; }
        const [year, month] = monthVal.split('-');
        startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (type === 'quarterly') {
        const currentMonth = today.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        const startMonth = currentQuarter * 3;
        const startYear = today.getFullYear();
        startDate = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-01`;
        const endMonth = startMonth + 2;
        const lastDay = new Date(startYear, endMonth + 1, 0).getDate();
        endDate = `${startYear}-${String(endMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (type === 'yearly') {
        const currentYear = today.getFullYear();
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
    } else if (type === 'custom') {
        startDate = document.getElementById('reportStartDate').value;
        endDate = document.getElementById('reportEndDate').value;
        if (!startDate || !endDate) { showToast('Please select both dates', 'error'); return; }
    }
    document.getElementById('reportPeriodText').textContent = `Reporting Period: ${new Date(startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} to ${new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    document.getElementById('reportEmptyState').style.display = 'none';
    document.getElementById('reportResultsContainer').style.display = 'none';
    document.getElementById('reportGeneratedDate').textContent = `Generated on: ${new Date().toLocaleString()}`;
    showToast('⏳ Generating report...', 'info');

    try {
        // Chukua data zote kwa pamoja
        const [summaryData, materialsData] = await Promise.all([
            API.getProductionSummary({ startDate, endDate }),
            API.getReportMaterials({ startDate, endDate })
        ]);
        
        if (!summaryData) return;

        document.getElementById('reportResultsContainer').style.display = 'block';
        document.getElementById('reportPeriodText').textContent = `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;

        // 1. Kadi za Muhtasari
        document.getElementById('repTotalBatches').textContent = summaryData.totals.totalBatches;
        document.getElementById('repTotalProduced').textContent = summaryData.totals.totalProduced.toLocaleString();
        document.getElementById('repTotalDamaged').textContent = summaryData.totals.totalDamaged.toLocaleString();
        document.getElementById('repWastePercent').textContent = summaryData.totals.wastePercent + '%';

        // 2. Unda Narrative (Maelezo)
        const t = summaryData.totals;
        let narrative = `During this reporting period, the production department operated <strong>${t.totalBatches} production batches</strong>. `;
        narrative += `A total of <strong>${t.totalProduced.toLocaleString()} units</strong> were produced. `;
        
        if (t.totalDamaged > 0) {
            narrative += `Unfortunately, <strong>${t.totalDamaged.toLocaleString()} units (${t.wastePercent}%)</strong> were damaged or rejected, which is a slight concern. Management should investigate the causes of these damages to reduce future losses. `;
        } else {
            narrative += `Excellent performance! There were <strong>zero damaged items</strong> recorded during this period. `;
        }

        if (t.totalReleased > 0) {
            narrative += `Out of the good items, <strong>${t.totalReleased.toLocaleString()} units</strong> have been successfully inspected and released to the Sales department for marketing. `;
        }
        
        if (t.pendingRelease > 0) {
            narrative += `However, <strong>${t.pendingRelease.toLocaleString()} units</strong> are still waiting for QC clearance or release to the market.`;
        } else {
            narrative += `All items that passed QC have been successfully released to Sales.`;
        }

        document.getElementById('reportNarrative').innerHTML = narrative;

        // 3. Jaza Jedwali la Malighafi
        const matBody = document.getElementById('reportMaterialsBody');
        if (materialsData.length === 0) {
            matBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--gray-500);">No raw materials consumed during this period.</td></tr>`;
        } else {
            matBody.innerHTML = materialsData.map(m => `
                <tr>
                    <td style="font-weight: 700;">${esc(m.name)}</td>
                    <td style="font-weight: 800; color: var(--blue);">${m.quantity.toLocaleString()}</td>
                    <td style="color: var(--gray-500);">${esc(m.unit)}</td>
                </tr>
            `).join('');
        }

        // 4. Jaza Jedwali la Bidhaa
        const tbody = document.getElementById('reportTableBody');
        if (summaryData.byProduct.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--gray-500);">No production data found for this period.</td></tr>`;
        } else {
            tbody.innerHTML = summaryData.byProduct.map(p => {
                const wastePercent = p.produced > 0 ? ((p.damaged / p.produced) * 100).toFixed(1) : 0;
                let wasteBadgeClass = 'ok';
                if (wastePercent > 10) wasteBadgeClass = 'out';
                else if (wastePercent > 5) wasteBadgeClass = 'low';

                return `
                    <tr>
                        <td style="font-weight: 700;">${esc(p.name)}</td>
                        <td style="color: var(--gray-500);">${esc(p.unit)}</td>
                        <td style="font-weight: 700;">${p.produced.toLocaleString()}</td>
                        <td style="color: var(--green); font-weight: 700;">${p.good.toLocaleString()}</td>
                        <td style="color: var(--red); font-weight: 700;">${p.damaged.toLocaleString()}</td>
                        <td style="color: var(--blue); font-weight: 700;">${p.released.toLocaleString()}</td>
                        <td><span class="badge-status ${wasteBadgeClass}">${wastePercent}%</span></td>
                    </tr>
                `;
            }).join('');
        }

        showToast('✓ Report generated successfully!', 'success');

    } catch (err) {
        console.error('Report generation error:', err);
        showToast('Error generating report: ' + err.message, 'error');
        document.getElementById('reportEmptyState').style.display = 'block';
    }
}

// ================================================================
// PROFILE EDIT
// ================================================================
function openEditProfileModal() {
    if (!currentUser) currentUser = Auth.getUser();
    if (!currentUser) return;
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
    document.getElementById('editProfileModal')?.classList.add('show');
}

function setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
}

function handleProfilePicUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large (max 2MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = function(e) {
        currentProfilePic = e.target.result;
        const preview = document.getElementById('editPicPreview');
        if (preview) preview.innerHTML = `<img src="${currentProfilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
}

async function saveUserProfile() {
    const statusDiv = document.getElementById('editProfileStatus');
    const phone = document.getElementById('editProfilePhone')?.value.trim();
    if (!phone) { statusDiv.className = 'status-msg error'; statusDiv.textContent = '⚠ Phone required'; return; }
    try {
        const payload = { phone };
        if (currentProfilePic !== currentUser.profilePic) payload.profilePic = currentProfilePic;
        const response = await API.updateOwnProfile(payload);
        currentUser = { ...currentUser, ...response.user };
        Auth.saveSession(Auth.getToken(), currentUser);
        renderEngineerProfile();
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Updated!';
        showToast('Profile updated', 'success');
        setTimeout(() => closeModal('editProfileModal'), 1000);
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
// LOGOUT
// ================================================================
function handleLogoutClick(event) {
    if (event) event.preventDefault();
    document.getElementById('logoutConfirmModal')?.classList.add('show');
    closeUserDropdown();
}

function closeLogoutDialog() { document.getElementById('logoutConfirmModal')?.classList.remove('show'); }

function confirmLogout() {
    closeLogoutDialog();
    setTimeout(() => Auth.logout(), 400);
}

// ================================================================
// USER DROPDOWN
// ================================================================
function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    document.getElementById('userDropdownWrap')?.classList.toggle('open');
}

function closeUserDropdown() { document.getElementById('userDropdownWrap')?.classList.remove('open'); }

document.addEventListener('click', function(e) {
    const wrap = document.getElementById('userDropdownWrap');
    if (wrap && wrap.classList.contains('open') && !wrap.contains(e.target)) wrap.classList.remove('open');
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUserDropdown();
        document.querySelectorAll('.modal-overlay.show').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.confirm-overlay.show').forEach(m => m.classList.remove('show'));
    }
});

function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
});

// ================================================================
// SIDEBAR
// ================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (window.innerWidth <= 768) {
        if (!isCollapsed) { backdrop.classList.add('show'); document.body.style.overflow = 'hidden'; }
        else { backdrop.classList.remove('show'); document.body.style.overflow = ''; }
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
    if (window.innerWidth <= 768) sidebar.classList.add('collapsed');
}

// ================================================================
// UTILS
// ================================================================
async function refreshAll() {
    showToast('🔄 Refreshing...', 'info');
    await loadDashboard();
    await loadProductsForDropdown();
    await loadRawMaterials();
    await loadReceipts();
    await loadBatches();
    showToast('✓ Refreshed!', 'success');
}

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
    if (typeof Toast !== 'undefined' && typeof Toast[type] === 'function') Toast[type](message);
    else console.log(`[${type}] ${message}`);
}
// ================================================================
// 🆕 MY BUDGET — Production Department View
// 🎨 RANGI: #1a7f5a (Kijani cha Bahari) + #0f2942 (Navy) + #2ecc71 (Bright Green)
// ================================================================
let currentDeptBudget = null;
let bdActivityCounter = 0;

const STANDARD_ACTIVITIES = [
    "Safari / Field Work",
    "Mafunzo (Training)",
    "Ujenzi / Renovation",
    "Ununuzi wa Vifaa",
    "Matengenezo (Maintenance)",
    "Uendeshaji (Operations)",
    "Masoko (Marketing)",
    "Ushauri (Consultancy)",
    "Nyingine (Other)"
];

const STANDARD_ITEMS = [
    "Perdiem (Posho ya Safari)",
    "Mafuta (Fuel)",
    "Extraduty Allowance",
    "Kodi ya Gari (Car Hire)",
    "Nauli (Transport)",
    "Malazi (Accommodation)",
    "Chakula (Meals)",
    "Saruji (Cement)",
    "Mbao (Timber)",
    "Misumari (Nails)",
    "Rangi (Paint)",
    "Umeme (Electricity)",
    "Maji (Water)",
    "Karatasi (Stationery)",
    "Wino (Ink)",
    "Vifaa vya Ofisi",
    "Nyingine (Other)"
];

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
            return;
        }

        const budgets = await API.getMasterBudgets();
        
        const myBudgets = (budgets || []).filter(b => 
            b.allocations && b.allocations.some(a => a.department === departmentName)
        );

        if (myBudgets.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px 20px;">
                    <div style="font-size:56px;margin-bottom:14px;opacity:0.6;">💰</div>
                    <div style="font-size:17px;font-weight:800;color:#334155;margin-bottom:6px;">No Budget Assigned Yet</div>
                    <div style="font-size:13px;color:#64748b;">Your department (<strong>${esc(departmentName)}</strong>) has not been allocated a budget yet.</div>
                </div>`;
            if (badge) badge.textContent = '—';
            return;
        }

        const latest = myBudgets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        const myAllocation = latest.allocations.find(a => a.department === departmentName);
        
        currentDeptBudget = { ...latest, myAllocation };

        const allocStatus = myAllocation.status;
        let badgeText = '';
        let buttonHtml = '';

        // Ndani ya loadMyBudget(), badilisha sehemu ya buttonHtml iwe hivi:
        if (allocStatus === 'draft') {
            badgeText = '📝 Draft Saved';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="padding:12px 24px; background:linear-gradient(135deg,#2ecc71,#1a7f5a); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; box-shadow:0 4px 12px rgba(46,204,113,0.3);">✏️ Continue Draft</button>`;
        } 
        else if (allocStatus === 'submitted' || allocStatus === 'approved') {
            badgeText = '✅ Submitted';
            buttonHtml = `
                <button onclick="viewSubmittedBreakdown()" style="padding:12px 24px; background:linear-gradient(135deg,#1a7f5a,#0f2942); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #2ecc71;">👁️ View Details</button>
                <!-- KITUFE KIPYA CHA BUDGET BOOK -->
                <button onclick="openMyDeptBudgetBook()" style="padding:12px 24px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; margin-left:8px; box-shadow:0 4px 12px rgba(22,163,74,0.3);">📖 Open Budget Book</button>
                <span style="display:inline-flex; align-items:center; padding:0 16px; background:#f1f5f9; color:#94a3b8; border-radius:10px; font-weight:800; font-size:12px; margin-left:8px;">🔒 Locked</span>
            `;
        }
        else {
            badgeText = '⏳ Action Required';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="padding:12px 24px; background:linear-gradient(135deg,#1a7f5a,#0f2942); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #2ecc71;">➕ Prepare Breakdown</button>`;
        }

        if (badge) badge.textContent = badgeText;

        const isSubmitted = allocStatus === 'submitted' || allocStatus === 'approved';
        
        // 🎨 RANGI: #1a7f5a + #0f2942 + #2ecc71
        container.innerHTML = `
            <div style="background:linear-gradient(135deg, #1a7f5a, #0f2942); padding:24px 28px; border-radius:14px; color:white; margin-bottom:20px; border-left: 5px solid #2ecc71;">
                <div style="font-size:11px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px;">Ceiling Allocated</div>
                <div style="font-size:32px; font-weight:900; font-family:'Courier New',monospace; color:#2ecc71;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
                <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:8px;">${esc(latest.title)} • ${esc(latest.period)}</div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div style="background:#f8fafc; border-radius:10px; padding:16px; border:1px solid #e2e8f0; border-left: 4px solid #1a7f5a;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Status</div>
                    <div style="font-size:14px; font-weight:800; color:${isSubmitted ? '#16a34a' : allocStatus === 'draft' ? '#d97706' : '#64748b'};">
                        ${isSubmitted ? '✅ Submitted' : allocStatus === 'draft' ? '📝 Draft Saved' : '⏳ Pending'}
                    </div>
                </div>
                <div style="background:#f8fafc; border-radius:10px; padding:16px; border:1px solid #e2e8f0; border-left: 4px solid #2ecc71;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Activities</div>
                    <div style="font-size:14px; font-weight:800; color:#1e293b;">${(myAllocation.items || []).length} items listed</div>
                </div>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${buttonHtml}
            </div>
        `;

    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:#dc2626;">❌ ${esc(err.message)}</div>`;
    }
}

function openBudgetBreakdownPage() {
    if (!currentDeptBudget) {
        showToast('⚠ No budget loaded', 'error');
        return;
    }

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

        Object.keys(grouped).forEach(activityName => {
            addNewActivity(activityName, grouped[activityName]);
        });
    } else {
        addNewActivity();
    }

    updateGrandTotal();
}

function closeBudgetBreakdownPage() {
    document.getElementById('budgetBreakdownPage').style.display = 'none';
    document.getElementById('myBudgetContent').parentElement.style.display = 'block';
}

function addNewActivity(activityName = '', items = []) {
    const container = document.getElementById('bdActivitiesList');
    const activityId = 'bd-activity-' + (bdActivityCounter++);

    const activityOptions = STANDARD_ACTIVITIES.map(act => 
        `<option value="${act}" ${act === activityName ? 'selected' : ''}>${act}</option>`
    ).join('');

    // 🎨 RANGI: #1a7f5a + #2ecc71
    const activityHtml = `
        <div id="${activityId}" style="background:white; border-radius:14px; border:1.5px solid #e2e8f0; margin-bottom:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04); border-left: 4px solid #1a7f5a;">
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
                    <div class="bd-activity-total" style="font-size:20px; font-weight:900; color:#1a7f5a; font-family:'Courier New',monospace;">TSh 0</div>
                </div>
                <button onclick="document.getElementById('${activityId}').remove(); updateGrandTotal();" style="padding:8px 14px; background:rgba(239,68,68,0.1); color:#dc2626; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:12px;">🗑️ Remove</button>
            </div>

            <div style="padding:16px 20px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0;">Item</th>
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:80px;">Qty</th>
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:90px;">Unit</th>
                            <th style="padding:10px; text-align:left; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:130px;">Unit Price</th>
                            <th style="padding:10px; text-align:right; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; border-bottom:1px solid #e2e8f0; width:130px;">Subtotal</th>
                            <th style="width:40px; border-bottom:1px solid #e2e8f0;"></th>
                        </tr>
                    </thead>
                    <tbody class="bd-items-body"></tbody>
                </table>
                <button onclick="addItemToActivity('${activityId}')" style="margin-top:12px; padding:8px 16px; background:rgba(46,204,113,0.15); color:#1a7f5a; border:1px solid rgba(46,204,113,0.3); border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:12px;">➕ Add Item</button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', activityHtml);

    const activitySelect = document.querySelector(`#${activityId} .bd-activity-name`);
    const activityCustom = document.querySelector(`#${activityId} .bd-activity-custom`);
    if (activitySelect && activityCustom) {
        activitySelect.addEventListener('change', function() {
            if (this.value === '__custom__') {
                activityCustom.style.display = 'block';
                activityCustom.focus();
            } else {
                activityCustom.style.display = 'none';
                activityCustom.value = '';
            }
        });
    }

    const activityEl = document.getElementById(activityId);
    const tbody = activityEl.querySelector('.bd-items-body');
    
    if (items.length > 0) {
        items.forEach(item => {
            addItemRowToTable(tbody, item.itemName, item.quantity, item.unit, item.unitPrice);
        });
    } else {
        addItemRowToTable(tbody);
    }

    updateActivityTotal(activityId);
}

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

    const itemOptions = STANDARD_ITEMS.map(item => 
        `<option value="${item}" ${item === itemName ? 'selected' : ''}>${item}</option>`
    ).join('');

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
            <span class="bd-item-subtotal" style="font-family:'Courier New',monospace; font-weight:800; color:#1a7f5a; font-size:12px;">TSh 0</span>
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
            if (this.value === '__custom__') {
                itemCustom.style.display = 'block';
                itemCustom.focus();
            } else {
                itemCustom.style.display = 'none';
                itemCustom.value = '';
            }
        });
    }
}

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
                    <span style="font-weight:700; color:#1a7f5a; font-family:'Courier New',monospace;">TSh ${subtotal.toLocaleString()}</span>
                </div>
            `;
        }).join('');

        grandTotal += activityTotal;

        activitiesHtml += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:12px; overflow:hidden;">
                <div style="background:#f8fafc; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
                    <div style="font-weight:800; color:#1a7f5a; font-size:14px;">${idx + 1}. ${esc(activityName)}</div>
                    <div style="font-weight:900; color:#1a7f5a; font-family:'Courier New',monospace; font-size:14px;">TSh ${activityTotal.toLocaleString()}</div>
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
    
    // 🎨 RANGI: #1a7f5a + #0f2942 + #2ecc71
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; max-width:700px; width:100%; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.4);">
            <div style="background:linear-gradient(135deg,#1a7f5a,#0f2942); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom: 3px solid #2ecc71;">
                <div>
                    <h3 style="font-size:20px; font-weight:900; margin:0 0 4px 0;">🔒 Submitted Breakdown</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">${esc(title)} • ${esc(period)}</div>
                </div>
                <button onclick="document.getElementById('viewBreakdownModal').remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>

            <div style="padding:24px 26px; overflow-y:auto; flex:1; background:#f8fafc;">
                <div style="background:rgba(46,204,113,0.08); border-left:4px solid #2ecc71; border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:13px; color:#14532d;">
                    👁️ This is a read-only view. Your breakdown has been submitted and cannot be edited.
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
                    <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e2e8f0; border-left: 3px solid #1a7f5a;">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Ceiling</div>
                        <div style="font-size:18px; font-weight:900; color:#1a7f5a; font-family:'Courier New',monospace;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
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
                <button onclick="document.getElementById('viewBreakdownModal').remove()" style="padding:12px 28px; background:linear-gradient(135deg,#1a7f5a,#0f2942); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #2ecc71;">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

async function submitBudgetBreakdown(isDraft = false) {
    if (!currentDeptBudget) return;

    const { myAllocation, id: budgetId } = currentDeptBudget;
    const items = [];

    document.querySelectorAll('#bdActivitiesList > div').forEach(activityEl => {
        const activitySelect = activityEl.querySelector('.bd-activity-name');
        const activityCustom = activityEl.querySelector('.bd-activity-custom');
        let activityName = activitySelect.value === '__custom__' 
            ? (activityCustom?.value.trim() || 'Unnamed Activity') 
            : activitySelect.value;

        activityEl.querySelectorAll('.bd-items-body tr').forEach(row => {
            const itemSelect = row.querySelector('.bd-item-name');
            const itemCustom = row.querySelector('.bd-item-custom');
            let itemName = itemSelect.value === '__custom__' 
                ? (itemCustom?.value.trim() || '') 
                : itemSelect.value;

            const quantity = parseFloat(row.querySelector('.bd-item-qty')?.value) || 0;
            const unit = row.querySelector('.bd-item-unit')?.value || 'pcs';
            const unitPrice = parseFloat(row.querySelector('.bd-item-price')?.value) || 0;

            if (itemName && quantity > 0) {
                items.push({ activityName, itemName, quantity, unit, unitPrice, totalCost: quantity * unitPrice });
            }
        });
    });

    if (items.length === 0) {
        showToast('⚠ Add at least one item with quantity', 'error');
        return;
    }

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

    const btn = document.querySelector(isDraft 
        ? 'button[onclick="submitBudgetBreakdown(true)"]' 
        : 'button[onclick="openBudgetReviewModal()"]');
    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '⏳ Saving...';
        btn.style.opacity = '0.7';
    }

    try {
        await API.submitDepartmentBreakdown(budgetId, myAllocation.department, { 
            items: items,
            status: isDraft ? 'draft' : 'submitted'
        });
        
        showBudgetSuccessDialog(
            isDraft ? '💾 Draft Saved!' : '✅ Breakdown Submitted!', 
            isDraft 
                ? 'Your work has been saved as a draft. You can continue later.' 
                : 'Your breakdown has been successfully sent to the Manager for review.'
        );

        closeBudgetBreakdownPage();
        loadMyBudget();

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
            btn.style.opacity = '1';
        }
    }
}

function openBudgetReviewModal() {
    if (!currentDeptBudget) return;

    const { myAllocation } = currentDeptBudget;
    const ceiling = Number(myAllocation.ceilingAmount);

    const activities = [];
    let grandTotal = 0;

    document.querySelectorAll('#bdActivitiesList > div').forEach(activityEl => {
        const activitySelect = activityEl.querySelector('.bd-activity-name');
        const activityCustom = activityEl.querySelector('.bd-activity-custom');
        let activityName = activitySelect.value === '__custom__' 
            ? (activityCustom?.value.trim() || 'Unnamed Activity') 
            : activitySelect.value;

        const items = [];
        let activityTotal = 0;

        activityEl.querySelectorAll('.bd-items-body tr').forEach(row => {
            const itemSelect = row.querySelector('.bd-item-name');
            const itemCustom = row.querySelector('.bd-item-custom');
            let itemName = itemSelect.value === '__custom__' 
                ? (itemCustom?.value.trim() || '') 
                : itemSelect.value;

            const quantity = parseFloat(row.querySelector('.bd-item-qty')?.value) || 0;
            const unit = row.querySelector('.bd-item-unit')?.value || 'pcs';
            const unitPrice = parseFloat(row.querySelector('.bd-item-price')?.value) || 0;
            const subtotal = quantity * unitPrice;

            if (itemName && quantity > 0) {
                items.push({ itemName, quantity, unit, unitPrice, subtotal });
                activityTotal += subtotal;
            }
        });

        if (items.length > 0) {
            activities.push({ activityName, items, activityTotal });
            grandTotal += activityTotal;
        }
    });

    if (activities.length === 0) {
        showToast('⚠ Add at least one activity with items', 'error');
        return;
    }

    const activitiesHtml = activities.map((act, idx) => `
        <div style="background:white; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:12px; overflow:hidden;">
            <div style="background:#f8fafc; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
                <div style="font-weight:800; color:#1a7f5a; font-size:14px;">${idx + 1}. ${esc(act.activityName)}</div>
                <div style="font-weight:900; color:#1a7f5a; font-family:'Courier New',monospace; font-size:14px;">TSh ${act.activityTotal.toLocaleString()}</div>
            </div>
            <div style="padding:8px 16px;">
                ${act.items.map(item => `
                    <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:12px; border-bottom:1px dashed #f1f5f9;">
                        <span style="color:#475569;">${esc(item.itemName)} <span style="color:#94a3b8;">(${item.quantity} ${item.unit} × TSh ${item.unitPrice.toLocaleString()})</span></span>
                        <span style="font-weight:700; color:#1e293b; font-family:'Courier New',monospace;">TSh ${item.subtotal.toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    let modal = document.getElementById('budgetReviewModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'budgetReviewModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.7); backdrop-filter:blur(6px); z-index:50000; display:flex; align-items:center; justify-content:center; padding:20px; opacity:0; transition:opacity 0.3s;';
    
    // 🎨 RANGI: #1a7f5a + #0f2942 + #2ecc71
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; max-width:750px; width:100%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.4); transform:scale(0.95); transition:transform 0.3s;">
            <div style="background:linear-gradient(135deg,#1a7f5a,#0f2942); padding:20px 28px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom: 3px solid #2ecc71;">
                <div>
                    <h3 style="font-size:20px; font-weight:900; margin:0 0 4px 0;">👁️ Review Your Breakdown</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">Please verify everything is correct before submitting</div>
                </div>
                <button onclick="document.getElementById('budgetReviewModal').remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>

            <div style="padding:24px 28px; overflow-y:auto; flex:1; background:#f8fafc;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
                    <div style="background:white; padding:16px 20px; border-radius:10px; border:1px solid #e2e8f0; border-left: 3px solid #1a7f5a;">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Ceiling</div>
                        <div style="font-size:20px; font-weight:900; color:#1a7f5a; font-family:'Courier New',monospace;">TSh ${ceiling.toLocaleString()}</div>
                    </div>
                    <div style="background:white; padding:16px 20px; border-radius:10px; border:1px solid #e2e8f0; border-left: 3px solid ${grandTotal > ceiling ? '#dc2626' : '#16a34a'};">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Total</div>
                        <div style="font-size:20px; font-weight:900; color:${grandTotal > ceiling ? '#dc2626' : '#16a34a'}; font-family:'Courier New',monospace;">TSh ${grandTotal.toLocaleString()}</div>
                    </div>
                </div>

                ${grandTotal > ceiling 
                    ? `<div style="background:rgba(239,68,68,0.08); border-left:4px solid #dc2626; padding:12px 16px; border-radius:8px; margin-bottom:20px; font-size:13px; color:#7f1d1d;">
                        ❌ <strong>Over Budget!</strong> Your total (TSh ${grandTotal.toLocaleString()}) exceeds your ceiling by TSh ${(grandTotal - ceiling).toLocaleString()}. Please adjust before submitting.
                    </div>` 
                    : `<div style="background:rgba(34,197,94,0.08); border-left:4px solid #16a34a; padding:12px 16px; border-radius:8px; margin-bottom:20px; font-size:13px; color:#14532d;">
                        ✅ <strong>Within Budget!</strong> You have TSh ${(ceiling - grandTotal).toLocaleString()} remaining.
                    </div>`
                }

                <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">📋 Activities (${activities.length})</div>
                ${activitiesHtml}
            </div>

            <div style="padding:16px 28px; background:white; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; gap:12px; flex-shrink:0;">
                <button onclick="document.getElementById('budgetReviewModal').remove()" style="padding:12px 24px; background:#f1f5f9; color:#475569; border:1.5px solid #cbd5e1; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:13px;">← Edit</button>
                <button onclick="confirmAndSubmitBudget()" ${grandTotal > ceiling ? 'disabled' : ''} style="padding:12px 28px; background:linear-gradient(135deg,#2ecc71,#1a7f5a); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; box-shadow:0 4px 12px rgba(46,204,113,0.3); ${grandTotal > ceiling ? 'opacity:0.5; cursor:not-allowed;' : ''}">✅ Confirm & Submit to Manager</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    setTimeout(() => {
        modal.style.opacity = '1';
        modal.querySelector('div').style.transform = 'scale(1)';
    }, 10);
}

async function confirmAndSubmitBudget() {
    if (!currentDeptBudget) return;

    const modal = document.getElementById('budgetReviewModal');
    if (modal) modal.remove();

    setTimeout(() => {
        submitBudgetBreakdown();
    }, 100);
}

function showBudgetSuccessDialog(title, message) {
    const existing = document.getElementById('budgetSuccessModal');
    if (existing) existing.remove();

    // 🎨 RANGI: #1a7f5a + #0f2942 + #2ecc71
    const modalHTML = `
        <div class="modal-overlay show" id="budgetSuccessModal" style="z-index: 60000;">
            <div style="background:white; border-radius:20px; max-width:400px; width:100%; text-align:center; padding:32px 28px; box-shadow:0 25px 60px rgba(0,0,0,0.3); animation: modalIn 0.3s ease;">
                <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #1a7f5a, #0f2942); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; box-shadow:0 8px 24px rgba(26,127,90,0.4); border: 3px solid #2ecc71;">
                    <span style="font-size:40px; color:#2ecc71;">✔</span>
                </div>
                <h3 style="font-size:22px; font-weight:900; color:#1a7f5a; margin:0 0 10px 0;">${title}</h3>
                <p style="font-size:14px; color:#64748b; line-height:1.6; margin:0 0 24px 0;">${message}</p>
                <button onclick="document.getElementById('budgetSuccessModal').remove()" 
                        style="width:100%; padding:14px; background:linear-gradient(135deg, #1a7f5a, #0f2942); color:white; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer; transition:transform 0.2s; border: 1.5px solid #2ecc71;"
                        onmouseover="this.style.transform='translateY(-2px)'" 
                        onmouseout="this.style.transform='translateY(0)'">
                    Understood
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
// ===== 3. RENDER FILTERS & LAYOUT (Engineer Version) =====
function renderBudgetsFilters() {
    const container = document.getElementById('allBudgetsContainer');
    if (!container) return;

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2023; y <= currentYear + 2; y++) {
        years.push(y);
    }
    years.sort((a, b) => b - a);

    // Rangi za Engineer
    const primary = '#1a7f5a'; // Sea Green
    const accent = '#f59e0b';  // Gold

    container.innerHTML = `
        <div id="budgetsStatsGrid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;"></div>

        <div style="background:white; border-radius:12px; padding:16px 20px; border:1px solid #e2e8f0; margin-bottom:20px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="budgetSearchInput" placeholder="🔍 Search budget..." oninput="filterBudgets()" style="flex:1; min-width:200px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
            
            <!-- 🆕 Kalenda ya Kuchuja -->
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

// ===== FILTER BUDGETS (Engineer Version) =====
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

// ===== RENDER BUDGETS LIST (Engineer Version - Compact Table) =====
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

    // 🆕 Filter by Custom Date
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

    const primary = '#1a7f5a'; // Sea Green ya Engineer
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

                   // Ndani ya renderBudgetsList(), badilisha sehemu ya btnAction iwe hivi:
                    let btnAction = `<button data-id="${b.id}" onclick="viewBudgetDetailsFromAll(this.dataset.id)" style="padding:6px 12px; background:white; color:${primary}; border:1.5px solid ${primary}; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit;">👁 View</button>`;

                    if (status === 'pending' || status === 'pending-department') {
                        btnAction += `<button data-id="${b.id}" data-status="${status}" onclick="openBudgetForDepartment(this.dataset.id, this.dataset.status)" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#0f2942); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">➕ Add</button>`;
                    } else if (status === 'draft') {
                        btnAction += `<button data-id="${b.id}" onclick="openBudgetForDepartment(this.dataset.id, 'draft')" style="padding:6px 12px; background:linear-gradient(135deg,#2ecc71,#1a7f5a); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">✏️ Edit</button>`;
                    } else if (status === 'submitted' || status === 'approved') {
                        // HAPA NDIPO KITUFE CHA BOOK KINAPASWA KUWA KWA ENGINEER
                        btnAction = `
                            <button data-id="${b.id}" onclick="viewBudgetDetailsFromAll(this.dataset.id)" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#0f2942); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; border:1.5px solid #2ecc71;">📋 Breakdown</button>
                            <button data-id="${b.id}" onclick="openBudgetBookForDept(this.dataset.id)" style="padding:6px 12px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px; box-shadow:0 2px 8px rgba(22,163,74,0.3);">📖 Book</button>
                        `;
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
function toggleSidebarDropdown(parentEl, event) {
    if (event) event.stopPropagation();
    const submenu = parentEl.nextElementSibling;
    if (!submenu) return;
    const isOpen = parentEl.classList.contains('open');
    
    document.querySelectorAll('.sidebar-nav-parent.open').forEach(el => {
        if (el !== parentEl) {
            el.classList.remove('open');
            const sub = el.nextElementSibling;
            if (sub) sub.classList.remove('open');
        }
    });
    
    parentEl.classList.toggle('open', !isOpen);
    submenu.classList.toggle('open', !isOpen);
}
// ================================================================
// 🆕 ALL MY BUDGETS (Engineer Version)
// ================================================================
let allMyBudgets = [];
let currentBudgetFilter = { search: '', date: '', status: '' };

// 1. LOAD ALL MY BUDGETS
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
                <button onclick="loadAllMyBudgets()" style="margin-top:16px;padding:10px 20px;background:#1a7f5a;color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Jaribu Tena</button>
            </div>`;
    }
}

// 2. RENDER STATS
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

    statsContainer.innerHTML = `
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #1a7f5a; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">📊 Total</div>
            <div style="font-size:24px; font-weight:900; color:#1a7f5a; font-family:'Courier New',monospace;">${total}</div>
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

// 3. LOAD ALL BUDGETS PAGE (Entry point)
function loadAllBudgetsPage() {
    renderBudgetsFilters();
    setTimeout(() => {
        loadAllMyBudgets();
    }, 100);
}

// 4. RESET FILTERS
function resetBudgetsFilters() {
    if(document.getElementById('budgetSearchInput')) document.getElementById('budgetSearchInput').value = '';
    if(document.getElementById('budgetDateFilter')) document.getElementById('budgetDateFilter').value = '';
    if(document.getElementById('budgetStatusFilter')) document.getElementById('budgetStatusFilter').value = '';
    
    const clearBtn = document.getElementById('clearDateBtn');
    if(clearBtn) clearBtn.style.display = 'none';
    
    filterBudgets();
    showToast('🔄 Filters reset', 'info');
}

// 5. OPEN BUDGET FOR DEPARTMENT
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

// 6. VIEW BUDGET DETAILS
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
// ================================================================
// 🆕 BUDGET BOOK (Engineer Version - Sea Green Theme)
// ================================================================
async function openMyDeptBudgetBook(budgetData = null) {
    const b = budgetData || currentDeptBudget;

    if (!b || !b.myAllocation) {
        showToast('⚠ No budget data available to generate book', 'error');
        return;
    }

    const alloc = b.myAllocation;
    
    let totalItemsCost = 0;
    if (alloc.items && alloc.items.length > 0) {
        totalItemsCost = alloc.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
    }

    const groupedActivities = {};
    (alloc.items || []).forEach(item => {
        const actName = item.activityName || 'General Activity';
        if (!groupedActivities[actName]) {
            groupedActivities[actName] = {
                items: [],
                total: 0
            };
        }
        groupedActivities[actName].items.push(item);
        groupedActivities[actName].total += Number(item.totalCost || 0);
    });

    let activitiesHtml = '';
    let activityIndex = 1;

    Object.keys(groupedActivities).forEach(actName => {
        const group = groupedActivities[actName];
        
        const itemsRows = group.items.map((item, idx) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:10px 14px; font-size:12px; color:#64748b; text-align:center; width:40px;">${idx + 1}</td>
                <td style="padding:10px 14px; font-size:13px; color:#0f172a; font-weight:500;">
                    ${esc(item.itemName)}
                </td>
                <td style="padding:10px 14px; font-size:12px; color:#475569; text-align:center; width:100px;">${item.quantity} ${item.unit}</td>
                <td style="padding:10px 14px; font-size:12px; color:#475569; text-align:right; width:120px;">TSh ${Number(item.unitPrice).toLocaleString()}</td>
                <td style="padding:10px 14px; font-size:13px; color:#0f172a; font-weight:700; text-align:right; width:130px;">TSh ${Number(item.totalCost).toLocaleString()}</td>
            </tr>
        `).join('');

        activitiesHtml += `
            <div style="margin-bottom:25px; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; page-break-inside:avoid; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <div style="background:#f8fafc; padding:14px 18px; border-bottom:2px solid #0f172a; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="background:#1a7f5a; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">${activityIndex++}</span>
                        <strong style="font-size:14px; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">${esc(actName)}</strong>
                    </div>
                    <div style="font-size:13px; font-weight:800; color:#16a34a; background:rgba(22,163,74,0.1); padding:4px 10px; border-radius:6px;">
                        TSh ${group.total.toLocaleString()}
                    </div>
                </div>
                
                <table style="width:100%; border-collapse:collapse;">
                    <thead style="background:#ffffff; border-bottom:1px solid #e2e8f0;">
                        <tr>
                            <th style="padding:8px 14px; text-align:center; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">#</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:left; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Kitu / Maelezo</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:left; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Item / Description</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:center; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Idadi</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:center; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Qty</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Bei</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Unit Price</th>
                            <th class="lang-sw" style="padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Jumla</th>
                            <th class="lang-en" style="display:none; padding:8px 14px; text-align:right; font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsRows}
                    </tbody>
                </table>
            </div>
        `;
    });

    let modal = document.getElementById('myBudgetBookModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'myBudgetBookModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.85); z-index:60000; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto;';
    
    modal.innerHTML = `
        <div style="background:white; border-radius:12px; max-width:1000px; width:100%; box-shadow:0 20px 50px rgba(0,0,0,0.5); position:relative; margin: 20px auto; overflow:hidden;">
            
            <div class="no-print" style="background:#1e293b; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #cbd5e1;">
                <div style="color:white; font-size:14px; font-weight:600;">📄 Preview Mode</div>
                <div style="display:flex; gap:12px; align-items:center;">
                    
                    <div style="display:flex; background:#334155; border-radius:8px; padding:4px; margin-right:16px;">
                        <button id="btnLangSw" onclick="toggleBookLanguage('sw')" style="padding:8px 16px; border:none; border-radius:6px; font-weight:800; font-size:12px; cursor:pointer; background:#0f172a; color:white; transition:0.2s;">🇹🇿 Kiswahili</button>
                        <button id="btnLangEn" onclick="toggleBookLanguage('en')" style="padding:8px 16px; border:none; border-radius:6px; font-weight:800; font-size:12px; cursor:pointer; background:transparent; color:#94a3b8; transition:0.2s;">🇬🇧 English</button>
                    </div>

                    <button onclick="printBudgetBook()" style="padding:10px 20px; background:#16a34a; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(22,163,74,0.3);">
                        🖨️ Print / Save as PDF
                    </button>
                    <button onclick="document.getElementById('myBudgetBookModal').remove()" style="padding:10px 20px; background:#ef4444; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer;">
                        ✕ Close
                    </button>
                </div>
            </div>

            <div id="budgetBookPrintArea" style="padding:50px 60px; background:white;">
                
                <div style="text-align:center; border-bottom:4px double #0f172a; padding-bottom:25px; margin-bottom:30px;">
                    <img src="assets/makdc-logo.jpg" alt="Logo" style="height:90px; margin-bottom:15px;">
                    <h1 style="font-size:26px; font-weight:900; color:#0f172a; margin:0; font-family: 'Times New Roman', serif; letter-spacing:1px;">MAK DC INVESTMENT COMPANY LTD</h1>
                    <h2 class="lang-sw" style="font-size:18px; font-weight:700; color:#334155; margin:10px 0 5px 0; text-transform:uppercase; letter-spacing:2px;">KITABU RASMI CHA BAJETI YA IDARA</h2>
                    <h2 class="lang-en" style="display:none; font-size:18px; font-weight:700; color:#334155; margin:10px 0 5px 0; text-transform:uppercase; letter-spacing:2px;">OFFICIAL DEPARTMENTAL BUDGET BOOK</h2>
                    
                    <div style="font-size:14px; margin-top:15px; color:#475569; font-weight:600;">
                        <span class="lang-sw">Idara:</span><span class="lang-en" style="display:none;">Department:</span>
                        <span style="color:#0f172a;">${esc(alloc.department)}</span>
                        &nbsp;|&nbsp; 
                        <span class="lang-sw">Kipindi:</span><span class="lang-en" style="display:none;">Period:</span>
                        <span style="color:#0f172a;">${esc(b.period)}</span>
                        &nbsp;|&nbsp; 
                        <span class="lang-sw">Mwaka:</span><span class="lang-en" style="display:none;">Year:</span>
                        <span style="color:#0f172a;">${b.year || '—'}</span>
                    </div>
                </div>

                <div style="margin-bottom:35px; background:#f8fafc; padding:30px; border-radius:10px; border-left:6px solid #0f172a; box-shadow:0 4px 15px rgba(0,0,0,0.02); page-break-inside:avoid;">
                    
                    <div class="lang-sw">
                        <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">Muhtasari wa Bajeti</h3>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            Hiki ni Kitabu Rasmi cha Bajeti kwa ajili ya idara ya <strong>${esc(alloc.department)}</strong> kwa kipindi cha <strong>${esc(b.period)}</strong>. Kitabu hiki kinaeleza kwa kina jinsi kiasi cha <strong>TSh ${Number(alloc.ceilingAmount).toLocaleString()}</strong> kilichotengwa na Menejimenti kwa ajili ya idara hii kimetumika. 
                        </p>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            Bajeti hii imeandaliwa kwa kuzingatia mahitaji halisi ya uendeshaji wa idara ili kuhakikisha kuwa malengo ya kimkakati yanafikiwa kwa wakati. Jumla ya matumizi yaliyopendekezwa na kupitishwa ni <strong>TSh ${totalItemsCost.toLocaleString()}</strong>. Kiasi hiki kimetumika katika shughuli mbalimbali muhimu zikiwemo safari za kikazi, ununuzi wa vifaa vya ofisi, na uendeshaji wa jumla. 
                        </p>
                        <p style="font-size:14px; line-height:1.8; text-align:justify; color:#334155;">
                            Tunatarajia kuwa utekelezaji wa bajeti hii utaleta tija na kuongeza ufanisi katika utendaji kazi wa kila siku. Hati hii imesainiwa na kupelekwa kwa Ofisi ya Mkurugenzi Mtendaji (CEO) kwa ajili ya uhakiki wa mwisho na matumizi.
                        </p>
                    </div>

                    <div class="lang-en" style="display:none;">
                        <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">Executive Summary</h3>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            This document serves as the Official Budget Book for the <strong>${esc(alloc.department)}</strong> for the period of <strong>${esc(b.period)}</strong>. It provides a detailed breakdown of how the allocated ceiling of <strong>TSh ${Number(alloc.ceilingAmount).toLocaleString()}</strong> is being utilized to support the department's operational needs.
                        </p>
                        <p style="font-size:14px; line-height:1.8; margin-bottom:15px; text-align:justify; color:#334155;">
                            The budget has been carefully prepared to align with the strategic goals of the company. The total proposed and approved expenditure amounts to <strong>TSh ${totalItemsCost.toLocaleString()}</strong>. These funds are allocated to essential activities including field operations, procurement of necessary office supplies, and general administrative operations.
                        </p>
                        <p style="font-size:14px; line-height:1.8; text-align:justify; color:#334155;">
                            We anticipate that the execution of this budget will significantly improve efficiency and productivity within the department. This document is hereby submitted for final review and utilization by the Office of the Chief Executive Officer (CEO).
                        </p>
                    </div>
                </div>

                <div class="lang-sw">
                    <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:20px; border-bottom:2px solid #cbd5e1; padding-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Mgawanyo wa Kina wa Matumizi</h3>
                </div>
                <div class="lang-en" style="display:none;">
                    <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:20px; border-bottom:2px solid #cbd5e1; padding-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Detailed Breakdown of Expenses</h3>
                </div>
                
                ${activitiesHtml || '<p style="text-align:center; color:#64748b; padding:20px;">Hakuna data ya matumizi.</p>'}

                <div style="margin-top:20px; background:#1a7f5a; border-radius:10px; padding:20px 30px; display:flex; justify-content:space-between; align-items:center; page-break-inside:avoid;">
                    <div>
                        <div class="lang-sw" style="font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Jumla Kuu ya Matumizi Yote</div>
                        <div class="lang-en" style="display:none; font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Overall Grand Total</div>
                    </div>
                    <div style="font-size:28px; font-weight:900; color:#2ecc71; font-family:'Courier New', monospace;">
                        TSh ${totalItemsCost.toLocaleString()}
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; margin-top:80px; page-break-inside:avoid;">
                    <div style="text-align:center; width:250px;">
                        <div class="lang-sw" style="font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Imeandaliwa Na:</div>
                        <div class="lang-en" style="display:none; font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Prepared By:</div>
                        <div style="border-bottom:2px solid #000; height:30px;"></div>
                        <div style="font-size:13px; font-weight:bold; margin-top:10px;">${esc(b.createdBy || 'Manager')}</div>
                        <div class="lang-sw" style="font-size:11px; color:#64748b;">(Meneja)</div>
                        <div class="lang-en" style="display:none; font-size:11px; color:#64748b;">(Manager)</div>
                    </div>
                    <div style="text-align:center; width:250px;">
                        <div class="lang-sw" style="font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Imeidhinishwa Na:</div>
                        <div class="lang-en" style="display:none; font-size:12px; font-weight:bold; color:#475569; margin-bottom:50px;">Approved By:</div>
                        <div style="border-bottom:2px solid #000; height:30px;"></div>
                        <div style="font-size:13px; font-weight:bold; margin-top:10px;">CEO</div>
                        <div class="lang-sw" style="font-size:11px; color:#64748b;">(Mkurugenzi Mtendaji)</div>
                        <div class="lang-en" style="display:none; font-size:11px; color:#64748b;">(Chief Executive Officer)</div>
                    </div>
                </div>

                <div style="text-align:center; margin-top:60px; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:15px;">
                    <span class="lang-sw">Hati hii imetengenezwa na mfumo wa kompyuta. Ilizalishwa tarehe ${new Date().toLocaleString()}.</span>
                    <span class="lang-en" style="display:none;">This is a computer-generated document. Generated on ${new Date().toLocaleString()}.</span>
                    <br>MAK DC Investment Company LTD &copy; ${new Date().getFullYear()}
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.currentBookLang = 'sw';
}

function toggleBookLanguage(lang) {
    window.currentBookLang = lang;
    
    const swElements = document.querySelectorAll('#myBudgetBookModal .lang-sw');
    const enElements = document.querySelectorAll('#myBudgetBookModal .lang-en');
    
    const btnSw = document.getElementById('btnLangSw');
    const btnEn = document.getElementById('btnLangEn');

    if (lang === 'sw') {
        swElements.forEach(el => {
            el.style.display = (el.tagName === 'TD' || el.tagName === 'TH') ? 'table-cell' : (el.tagName === 'TR' ? 'table-row' : 'block');
        });
        enElements.forEach(el => el.style.display = 'none');
        
        if(btnSw) { btnSw.style.background = '#0f172a'; btnSw.style.color = 'white'; }
        if(btnEn) { btnEn.style.background = 'transparent'; btnEn.style.color = '#94a3b8'; }
    } else {
        swElements.forEach(el => el.style.display = 'none');
        enElements.forEach(el => {
            el.style.display = (el.tagName === 'TD' || el.tagName === 'TH') ? 'table-cell' : (el.tagName === 'TR' ? 'table-row' : 'block');
        });
        
        if(btnEn) { btnEn.style.background = '#0f172a'; btnEn.style.color = 'white'; }
        if(btnSw) { btnSw.style.background = 'transparent'; btnSw.style.color = '#94a3b8'; }
    }
}

function printBudgetBook() {
    const printContents = document.getElementById('budgetBookPrintArea').innerHTML;
    const lang = window.currentBookLang || 'sw';

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Budget Book - MAK DC</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                body { font-family: 'Inter', Arial, sans-serif; color: #0f172a; background: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .no-print, button, .action-bar { display: none !important; }
                .lang-sw { display: ${lang === 'sw' ? 'block' : 'none'} !important; }
                .lang-en { display: ${lang === 'en' ? 'block' : 'none'} !important; }
                td.lang-sw, th.lang-sw { display: ${lang === 'sw' ? 'table-cell' : 'none'} !important; }
                td.lang-en, th.lang-en { display: ${lang === 'en' ? 'table-cell' : 'none'} !important; }
                .activity-card { page-break-inside: avoid; margin-bottom: 20px !important; }
                table { width: 100% !important; max-width: 100% !important; border-collapse: collapse !important; }
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            ${printContents}
        </body>
        </html>
    `);

    setTimeout(() => {
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }, 500);
}

async function openBudgetBookForDept(budgetId) {
    try {
        const budget = await API.getMasterBudgetById(budgetId);
        if (!budget) {
            showToast('⚠ Budget not found', 'error');
            return;
        }

        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        const myAllocation = budget.allocations.find(a => a.department === myDept);

        if (!myAllocation) {
            showToast('❌ You have no allocation in this budget', 'error');
            return;
        }

        const tempBudgetData = { ...budget, myAllocation };
        await openMyDeptBudgetBook(tempBudgetData);

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
// ================================================================
// 🆕 ENGINEER KPI DASHBOARD (Table View)
// ================================================================
let isLoadingKpis = false;
let allMyKpisData = []; 

async function loadEngineerKpis() {
    const container = document.getElementById('engineerKpiContainer');
    const periodLabel = document.getElementById('kpiPeriodLabel');
    if (!container) return;

    if (isLoadingKpis) return;
    isLoadingKpis = true;

    // 🆕 Jaza miezi kama bado
    const periodSelect = document.getElementById('filterKpiPeriod');
    if (periodSelect && periodSelect.options.length === 0) {
        populateKpiPeriodSelector();
    }

    // 🆕 Chukua mwezi uliochaguliwa
    const selectedPeriod = periodSelect?.value;
    
    // Kama hakuna mwezi uliochaguliwa, chukua wa sasa
    const now = new Date();
    const currentPeriod = selectedPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #64748b;">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Loading targets for ${currentPeriod}...</div>
        </div>`;

    try {
        const user = Auth.getUser();
        const empId = user.employeeId || user.userId || user.id;
        
        if (!empId) throw new Error("User ID not found in session.");

        // Vuta data kwa mwezi uliochaguliwa
        const kpis = await API.getEmployeeKpis({ 
            employeeId: Number(empId), 
            period: currentPeriod, // 🆕 Tumia mwezi uliochaguliwa
            status: 'released'
        });

        allMyKpisData = kpis || [];

        if (allMyKpisData.length === 0) {
            periodLabel.textContent = 'No Targets';
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🎯</div>
                    <div style="font-size: 16px; font-weight: 800; color: #475569;">No Targets Assigned</div>
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">CEO has not assigned any KPIs for <strong>${currentPeriod}</strong>.</div>
                </div>
            `;
            return;
        }

        // Weka label ya mwezi
        periodLabel.textContent = allMyKpisData[0].periodLabel || currentPeriod;

        renderEngineerKpiTable(allMyKpisData);

    } catch (err) {
        console.error("KPI Load Error:", err);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc2626;">❌ Failed to load KPIs: ${err.message}</div>`;
    } finally {
        isLoadingKpis = false; 
    }
}
function renderEngineerKpiTable(kpis) {
    const container = document.getElementById('engineerKpiContainer');
    if (!container) return;

    if (kpis.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;">No targets match your search.</div>`;
        return;
    }

    let rowsHtml = '';

    kpis.forEach((kpi) => {
        let percentage = 0;
        let statusColor = '#64748b'; 
        let statusText = 'Pending';
        let bgStatus = '#f1f5f9';
        let statusKey = 'pending';
        let isOver = false; // 🆕 Alama ya Over Performance

        if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
            if (kpi.metricType === 'WASTE_PERCENT') {
                percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
            } else {
                percentage = (kpi.actualValue / kpi.targetValue) * 100;
            }
            percentage = Math.round(percentage);
            
            // 🆕 FIX: Kama amezidi 100%
            if (percentage > 100) {
                isOver = true;
                statusColor = '#8b5cf6'; // Rangi ya Zambarau (Premium)
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

        // 🆕 Chambua historia kutoka kwenye notes
        let historyHtml = '';
        if (kpi.notes && kpi.notes.includes('[')) {
            const historyLines = kpi.notes.split('\n').filter(l => l.includes('['));
            // Chukua mistari 3 ya mwisho tu
            const recentHistory = historyLines.slice(-3).reverse();
            historyHtml = `
                <div style="margin-top: 8px; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border-left: 3px solid #cbd5e1;">
                    <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">📅 Recent Progress Log</div>
                    ${recentHistory.map(line => `<div style="font-size: 11px; color: #475569; margin-bottom: 2px;">${esc(line.trim())}</div>`).join('')}
                </div>
            `;
        }

        rowsHtml += `
            <tr data-status="${statusKey}" data-name="${kpi.metricLabel.toLowerCase()}" style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                <td style="padding: 16px; font-weight: 800; color: #1e293b; font-size: 14px;">
                    ${kpi.metricLabel}
                    ${historyHtml}
                </td>
                <td style="padding: 16px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; gap: 8px; background: #f8fafc; padding: 4px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <span style="font-size: 13px; font-weight: 800; color: #64748b;">${tarText}</span>
                        <span style="color: #cbd5e1; font-size: 14px;">➔</span>
                        <span style="font-size: 13px; font-weight: 900; color: ${statusColor};">${valText}</span>
                        <span style="font-size: 10px; font-weight: 700; color: #94a3b8; margin-left: 2px;">${kpi.metricUnit}</span>
                    </div>
                </td>
                <td style="padding: 16px; width: 200px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 6px;">
                        <span>Progress</span>
                        <span style="color: ${statusColor};">${percentage}%</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${barWidth}%; height: 100%; background: ${statusColor}; border-radius: 3px;"></div>
                    </div>
                </td>
                <td style="padding: 16px; text-align: right;">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; background: ${bgStatus}; color: ${statusColor}; font-size: 10px; font-weight: 800; text-transform: uppercase;">
                        ${statusText}
                    </span>
                </td>
                <td style="padding: 16px; text-align: center;">
                    <button onclick="openUpdateActualModal(${kpi.id}, '${kpi.metricLabel}', '${kpi.metricUnit}', ${kpi.actualValue || 0}, ${kpi.targetValue || 0}, \`${(kpi.notes || '').replace(/`/g, '\\`')}\`)" style="padding: 6px 12px; background: #f1f5f9; color: #1a7f5a; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; font-family: inherit;">
                        ✏️ Update
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
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Metric</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Target ➔ Actual</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Completion</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: right;">Status</th>
                        <th style="padding: 14px 16px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: center;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}
// Function ya Kuchuja (Search & Filter)
function filterEngineerKpis() {
    const searchTerm = (document.getElementById('searchKpi')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filterKpiStatus')?.value || '';

    const filteredData = allMyKpisData.filter(kpi => {
        const matchName = kpi.metricLabel.toLowerCase().includes(searchTerm);
        
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
                if (percentage >= 100) statusKey = 'achieved';
                else if (percentage >= 80) statusKey = 'ontrack';
                else statusKey = 'below';
            }
            matchStatus = statusKey === statusFilter;
        }

        return matchName && matchStatus;
    });

    renderEngineerKpiTable(filteredData);
}

// Function ya Kufungua Maelezo ya Kina (Modal)
function viewKpiDetail(id) {
    const kpi = allMyKpisData.find(k => String(k.id) === String(id));
    if (!kpi) return;

    document.getElementById('modalKpiName').textContent = kpi.metricLabel;

    let percentage = 0;
    let statusColor = '#64748b'; 
    let statusText = 'Pending';
    let bgStatus = '#f1f5f9';

    if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
        if (kpi.metricType === 'WASTE_PERCENT') {
            percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
        } else {
            percentage = (kpi.actualValue / kpi.targetValue) * 100;
        }
        percentage = Math.round(percentage);
        
        if (percentage >= 100) {
            statusColor = '#16a34a'; bgStatus = '#f0fdf4'; statusText = 'Achieved';
        } else if (percentage >= 80) {
            statusColor = '#f59e0b'; bgStatus = '#fffbeb'; statusText = 'On Track';
        } else {
            statusColor = '#dc2626'; bgStatus = '#fef2f2'; statusText = 'Below Target';
        }
    }

    const valText = kpi.actualValue !== null ? kpi.actualValue.toLocaleString() : '—';
    const tarText = kpi.targetValue ? kpi.targetValue.toLocaleString() : '—';

    document.getElementById('modalKpiBody').innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
                <div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Target Value</div>
                <div style="font-size: 24px; font-weight: 900; color: #1e293b; font-family: 'Courier New', monospace;">${tarText} <span style="font-size: 12px; color: #64748b;">${kpi.metricUnit}</span></div>
            </div>
            <span style="font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 8px; background: ${bgStatus}; color: ${statusColor}; text-transform: uppercase;">${statusText}</span>
        </div>

        <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
            <div style="font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Actual Achieved</div>
            <div style="font-size: 28px; font-weight: 900; color: ${statusColor}; font-family: 'Courier New', monospace;">${valText} <span style="font-size: 12px; color: #64748b;">${kpi.metricUnit}</span></div>
        </div>

        <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #334155; margin-bottom: 6px;">
                <span>Completion Rate</span>
                <span style="color: ${statusColor};">${percentage}%</span>
            </div>
            <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                <div style="width: ${Math.min(percentage, 100)}%; height: 100%; background: ${statusColor}; border-radius: 4px;"></div>
            </div>
        </div>

        ${kpi.notes ? `
            <div style="background: rgba(26,127,90,0.05); border-left: 3px solid #1a7f5a; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #475569;">
                <strong style="display:block; margin-bottom: 4px; font-size: 10px; text-transform: uppercase; color: #1a7f5a;">CEO Note</strong>
                ${kpi.notes}
            </div>
        ` : ''}
    `;

    document.getElementById('viewKpiDetailModal').classList.add('show');
}
// ================================================================
// 🆕 Populate Period Selector (Miezi)
// ================================================================
function populateKpiPeriodSelector() {
    const select = document.getElementById('filterKpiPeriod');
    if (!select) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let options = '';

    // Tengeneza miezi ya mwaka huu na mwaka jana
    for (let year = currentYear; year >= currentYear - 1; year--) {
        for (let m = 11; m >= 0; m--) {
            const monthValue = `${year}-${String(m + 1).padStart(2, '0')}`;
            const label = `${monthNames[m]} ${year}`;
            
            // Kama ni mwezi wa sasa, iwe selected by default
            const isCurrent = (year === currentYear && m === now.getMonth());
            
            options += `<option value="${monthValue}" ${isCurrent ? 'selected' : ''}>${label}</option>`;
        }
    }

    select.innerHTML = options;
}
// ================================================================
// 🆕 UPDATE ACTUAL VALUE (Manual Entry)
// ================================================================
let currentUpdateKpiId = null;
let currentKpiData = null; // Hifadhi data ya KPI

function openUpdateActualModal(kpiId, metricLabel, metricUnit, currentActual, targetValue, historyNotes) {
    currentUpdateKpiId = kpiId;
    currentKpiData = { currentActual, targetValue, metricUnit };
    
    document.getElementById('uaKpiName').textContent = metricLabel;
    document.getElementById('uaKpiUnit').textContent = metricUnit;
    document.getElementById('uaTargetDisplay').textContent = `${Number(targetValue).toLocaleString()} ${metricUnit}`;
    document.getElementById('uaIncrementValue').value = '';
    document.getElementById('uaNotes').value = '';
    document.getElementById('uaLivePreview').style.display = 'none';
    
    // Historia
    const historyContainer = document.getElementById('uaHistory');
    if (historyNotes && historyNotes.includes('[')) {
        const historyLines = historyNotes.split('\n').filter(l => l.includes('[')).reverse();
        historyContainer.innerHTML = historyLines.map(line => `
            <div style="font-size: 11.5px; color: #475569; padding: 6px 0; border-bottom: 1px dashed #e2e8f0;">
                ${line}
            </div>
        `).join('');
    } else {
        historyContainer.innerHTML = `<div style="font-size: 12px; color: #94a3b8; font-style: italic;">No history yet.</div>`;
    }

    document.getElementById('uaStatus').className = 'status-msg';
    document.getElementById('uaStatus').textContent = '';
    
    const btn = document.getElementById('uaSaveBtn');
    btn.disabled = false;
    btn.textContent = '🚀 Save Progress';

    document.getElementById('updateActualModal').classList.add('show');
}

// 🆕 Function ya Kuonyesha Preview Wakati Anaandika
function updatePreviewTotal() {
    const increment = parseFloat(document.getElementById('uaIncrementValue').value) || 0;
    const previewDiv = document.getElementById('uaLivePreview');
    const display = document.getElementById('uaNewTotalDisplay');

    if (increment > 0) {
        const newTotal = currentKpiData.currentActual + increment;
        display.textContent = `${newTotal.toLocaleString()} ${currentKpiData.metricUnit}`;
        previewDiv.style.display = 'block';
    } else {
        previewDiv.style.display = 'none';
    }
}

async function saveActualValue() {
    const statusDiv = document.getElementById('uaStatus');
    const saveBtn = document.getElementById('uaSaveBtn');
    const incrementValue = parseFloat(document.getElementById('uaIncrementValue').value);
    const notes = document.getElementById('uaNotes').value.trim();

    if (isNaN(incrementValue) || incrementValue <= 0) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please enter a valid number greater than 0.';
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';
    saveBtn.style.opacity = '0.7';

    try {
        // Tuma kwa API kama 'incrementValue'
        await API.updateEmployeeKpi(currentUpdateKpiId, { 
            incrementValue: incrementValue,
            notes: notes 
        });

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Progress saved successfully!';

        setTimeout(() => {
            closeModal('updateActualModal');
            loadEngineerKpis(); // Refresh table
        }, 800);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        saveBtn.disabled = false;
        saveBtn.textContent = '🚀 Save Progress';
        saveBtn.style.opacity = '1';
    }
}
// ================================================================
// MAIL SYSTEM — ENGINEER DASHBOARD
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
                <div style="background: linear-gradient(135deg, #1a7f5a, #0f2942); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 800;">↩️ Reply: ${esc(msg.subject)}</h3>
                    <button onclick="document.getElementById('replyMailModal').remove()" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 18px; cursor: pointer;">✕</button>
                </div>
                <div style="padding: 24px; background: #f8fafc;">
                    <textarea id="replyBody" rows="6" placeholder="Write your reply here..." style="width: 100%; padding: 14px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"></textarea>
                </div>
                <div style="padding: 16px 24px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                    <button onclick="document.getElementById('replyMailModal').remove()" style="padding: 10px 20px; background: #f1f5f9; color: #475569; border: 1.5px solid #cbd5e1; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">Cancel</button>
                    <button onclick="submitReply('${originalId}')" style="padding: 10px 24px; background: linear-gradient(135deg, #2ecc71, #1a7f5a); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; font-family: inherit;">📤 Send Reply</button>
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
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">${sizeStr} • <span style="color:#1a7f5a; font-weight:800;">${esc(att.source)}</span></div>
                        </div>
                    </div>
                    <button onclick="downloadMailAttachment('${att.data}', '${esc(att.name)}')" style="padding:8px 16px; background:#f0fdf4; color:#1a7f5a; border:1.5px solid #bbf7d0; border-radius:8px; font-weight:800; cursor:pointer; font-size:12px;">
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
setInterval(() => {
    if (document.getElementById('tab-mail-center')?.classList.contains('active')) {
        loadMailBadges();
    }
}, 30000);
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        loadMailBadges().catch(() => {});
    }, 3000);
});
// ================================================================
// 🆕 SUBMIT REPORT TO CEO (NA NARRATIVE)
// ================================================================
async function openSubmitReportModal() {
    let modal = document.getElementById('submitReportModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="submitReportModal" style="z-index: 10000;">
                <div class="modal-box" style="max-width: 700px; padding: 0; overflow: hidden; border-radius: 16px; display: flex; flex-direction: column; max-height: 92vh;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0a1929 0%, #1a7f5a 100%); padding: 20px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                        <div style="font-size: 16px; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 20px;">📤</span> Send Report to CEO
                        </div>
                        <button onclick="closeModal('submitReportModal')" style="background: rgba(255,255,255,0.15); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; font-size: 16px; cursor: pointer;">✕</button>
                    </div>

                    <!-- Body -->
                    <div style="padding: 24px; overflow-y: auto; flex: 1;">
                        <div id="submitReportStatus" class="status-msg" style="display:none; margin-bottom: 16px;"></div>
                        
                        <!-- SEHEMU YA KUGENERATE DATA (Hii ndio ilikosekana) -->
                        <div style="margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1.5px solid #e2e8f0;">
                            <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Step 1: Select Month & Year</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; margin-bottom: 12px;">
                                <select id="repMonth" style="width: 100%; padding: 10px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-family: inherit; outline: none;">
                                    <option value="01">January</option>
                                    <option value="02">February</option>
                                    <option value="03">March</option>
                                    <option value="04">April</option>
                                    <option value="05">May</option>
                                    <option value="06">June</option>
                                    <option value="07">July</option>
                                    <option value="08">August</option>
                                    <option value="09">September</option>
                                    <option value="10">October</option>
                                    <option value="11">November</option>
                                    <option value="12">December</option>
                                </select>
                                <input type="number" id="repYear" value="${new Date().getFullYear()}" style="width: 100%; padding: 10px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-family: inherit; outline: none;">
                            </div>
                            <button onclick="generateReportData(this)" style="width: 100%; padding: 12px; background: #1a7f5a; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;">
                                🔄 Generate Data from System
                            </button>
                        </div>

                        <!-- Title & Period -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                            <div>
                                <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Report Title *</label>
                                <input type="text" id="repTitle" placeholder="Waiting for generation..." style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; margin-top: 6px; background: #f8fafc;">
                            </div>
                            <div>
                                <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Period *</label>
                                <input type="text" id="repPeriod" placeholder="Waiting for generation..." style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; margin-top: 6px; background: #f8fafc;">
                            </div>
                        </div>

                        <!-- Narrative -->
                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Executive Narrative (Maelezo ya Ziada) *</label>
                            <textarea id="repNarrative" placeholder="Click 'Generate Data' first..." style="width: 100%; padding: 12px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; margin-top: 6px; min-height: 150px; resize: vertical; line-height: 1.6; background: #f8fafc;"></textarea>
                            <div style="font-size: 10px; color: var(--gray-400); margin-top: 4px;">You can edit this narrative before submitting.</div>
                        </div>

                        <!-- Metrics -->
                        <div style="margin-bottom: 16px;">
                            <label style="font-size: 11px; font-weight: 800; color: var(--gray-700); text-transform: uppercase; letter-spacing: 1px;">Key Metrics (Auto-Generated)</label>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px;">
                                <input type="text" id="metricBatches" placeholder="Total Batches" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                                <input type="text" id="metricProduced" placeholder="Total Produced" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                                <input type="text" id="metricDamaged" placeholder="Damaged" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                                <input type="text" id="metricWaste" placeholder="Waste %" style="width: 100%; padding: 10px 14px; border: 1.5px solid var(--gray-300); border-radius: 8px; font-size: 13px; font-family: inherit; background: #f8fafc;">
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 16px 24px; background: var(--gray-50); border-top: 1px solid var(--gray-200); display: flex; justify-content: flex-end; gap: 12px; flex-shrink: 0;">
                        <button onclick="closeModal('submitReportModal')" style="padding: 10px 20px; background: white; border: 1px solid var(--gray-300); color: var(--gray-700); border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">Cancel</button>
                        <button onclick="submitReportToCEO(this)" style="padding: 10px 24px; background: linear-gradient(135deg, #1a7f5a, #0f2942); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">📤 Submit Report</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('submitReportModal');
    }

    // Reset form
    document.getElementById('repTitle').value = '';
    document.getElementById('repPeriod').value = '';
    document.getElementById('repNarrative').value = '';
    document.getElementById('metricBatches').value = '';
    document.getElementById('metricProduced').value = '';
    document.getElementById('metricDamaged').value = '';
    document.getElementById('metricWaste').value = '';
    document.getElementById('submitReportStatus').style.display = 'none';
    
    modal.classList.add('show');
}
async function submitReportToCEO(btn) {
    const statusDiv = document.getElementById('submitReportStatus');
    const title = document.getElementById('repTitle').value.trim();
    const period = document.getElementById('repPeriod').value.trim();
    const narrative = document.getElementById('repNarrative').value.trim();
    const user = Auth.getUser();

    if (!title || !period || !narrative) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please generate or fill in the data first.';
        return;
    }

    const metrics = {
        totalBatches: document.getElementById('metricBatches').value.trim(),
        totalProduced: document.getElementById('metricProduced').value.trim(),
        totalDamaged: document.getElementById('metricDamaged').value.trim(),
        wastePercent: document.getElementById('metricWaste').value.trim()
    };

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Submitting...';
    btn.disabled = true;

    try {
        await API.submitDepartmentReport({
            department: user.department || 'Production',
            title: title,
            period: period,
            summary: narrative,
            metrics: metrics
        });

        statusDiv.style.display = 'block';
        statusDiv.className = 'status-msg success';
        statusDiv.style.background = '#f0fdf4';
        statusDiv.style.color = '#15803d';
        statusDiv.textContent = '✓ Report submitted successfully to CEO!';
        
        setTimeout(() => {
            closeModal('submitReportModal');
            showToast('Report sent to CEO successfully!', 'success');
        }, 1500);

    } catch (err) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'status-msg error';
        statusDiv.style.background = '#fef2f2';
        statusDiv.style.color = '#dc2626';
        statusDiv.textContent = '⚠ ' + err.message;
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
async function generateReportData(btn) {
    const month = document.getElementById('repMonth').value;
    const year = document.getElementById('repYear').value;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Fetching data...';
    btn.disabled = true;

    try {
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        
        const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
        const periodLabel = `${monthName} ${year}`;

        // Tunavuta data kwa kutumia API zilizopo
        const summaryData = await API.getProductionSummary({ startDate, endDate });

        if (!summaryData || !summaryData.totals) {
            throw new Error("Hakuna data ya uzalishaji kwa mwezi huu.");
        }

        const t = summaryData.totals;
        
        document.getElementById('repTitle').value = `Production Report - ${periodLabel}`;
        document.getElementById('repPeriod').value = periodLabel;

        document.getElementById('metricBatches').value = t.totalBatches || 0;
        document.getElementById('metricProduced').value = (t.totalProduced || 0).toLocaleString() + ' units';
        document.getElementById('metricDamaged').value = (t.totalDamaged || 0).toLocaleString() + ' units';
        document.getElementById('metricWaste').value = (t.wastePercent || 0) + '%';

        // Tengeneza Narrative
        let narrative = `During the month of ${periodLabel}, the Production Department operated ${t.totalBatches || 0} production batches. `;
        narrative += `A total of ${(t.totalProduced || 0).toLocaleString()} units were produced. `;
        
        if (t.totalDamaged > 0) {
            narrative += `Unfortunately, ${(t.totalDamaged || 0).toLocaleString()} units (${t.wastePercent || 0}%) were damaged or rejected, which is a slight concern. Management should investigate the causes of these damages to reduce future losses. `;
        } else {
            narrative += `Excellent performance! There were zero damaged items recorded during this period. `;
        }

        if (t.totalReleased > 0) {
            narrative += `Out of the good items, ${(t.totalReleased || 0).toLocaleString()} units have been successfully inspected and released to the Sales department for marketing. `;
        }
        
        if (t.pendingRelease > 0) {
            narrative += `However, ${(t.pendingRelease || 0).toLocaleString()} units are still waiting for QC clearance or release to the market.`;
        } else {
            narrative += `All items that passed QC have been successfully released to Sales.`;
        }

        document.getElementById('repNarrative').value = narrative;

        // Weka rangi nyeupe kuonyesha data imejazwa
        ['repTitle', 'repPeriod', 'repNarrative', 'metricBatches', 'metricProduced', 'metricDamaged', 'metricWaste'].forEach(id => {
            document.getElementById(id).style.background = 'white';
        });

        showToast('✓ Data imejazwa kikamilifu. Unaweza kuhariri kabla ya kutuma.', 'success');

    } catch (err) {
        console.error('Generate error:', err);
        showToast('⚠ ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
async function loadMySubmittedReports() {
    const container = document.getElementById('mySubmittedReportsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--gray-400);">⏳ Loading your reports...</div>';

    try {
        const user = Auth.getUser();
        // Tunavuta ripoti zote, kisha tunachuja zile za mtumiaji huyu
        const allReports = await API.getDepartmentReports();
        
        // Chuja kwa kutumia ID ya mtumiaji au jina lake
        const myReports = (allReports || []).filter(r => 
            r.submittedById === user.userId || 
            r.submittedBy === user.fullName
        ).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)); // Mpya kwanza

        if (myReports.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:60px 20px; color:var(--gray-400);">
                    <span style="font-size:56px; display:block; margin-bottom:14px; opacity:0.6;">📭</span>
                    <div style="font-size:16px; font-weight:800; color:var(--gray-600);">No Reports Submitted Yet</div>
                    <div style="font-size:13px; margin-top:6px;">Reports you submit to the CEO will appear here.</div>
                </div>`;
            return;
        }

        // Tengeneza HTML ya kila ripoti
        container.innerHTML = myReports.map(r => {
            const dateStr = new Date(r.submittedAt).toLocaleDateString('en-GB', { 
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
            });

            // Rangi za status
            const isUnread = r.status === 'unread';
            const statusBg = isUnread ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)';
            const statusColor = isUnread ? '#b45309' : '#15803d';
            const statusText = isUnread ? '🆕 Unread by CEO' : '✅ Reviewed by CEO';

            return `
                <div style="background: white; border: 1.5px solid var(--gray-200); border-left: 4px solid #1a7f5a; border-radius: 12px; padding: 20px; margin-bottom: 12px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.02);" onmouseover="this.style.boxShadow='0 8px 24px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.02)'">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <div style="font-size: 16px; font-weight: 800; color: var(--gray-800); margin-bottom: 4px;">${esc(r.title)}</div>
                            <div style="font-size: 12px; color: var(--gray-500); display: flex; gap: 12px; flex-wrap: wrap;">
                                <span>📅 ${dateStr}</span>
                                <span>🏢 ${esc(r.department)}</span>
                                <span>📆 Period: ${esc(r.period)}</span>
                            </div>
                        </div>
                        <span style="font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 10px; background: ${statusBg}; color: ${statusColor}; text-transform: uppercase;">
                            ${statusText}
                        </span>
                    </div>
                    <div style="font-size: 13px; color: var(--gray-600); line-height: 1.6; background: var(--gray-50); padding: 12px; border-radius: 8px; border-left: 3px solid var(--gray-300); margin-bottom: 12px;">
                        <div style="font-size: 10px; font-weight: 800; color: var(--gray-500); text-transform: uppercase; margin-bottom: 4px;">Summary</div>
                        ${esc(r.summary).substring(0, 200)}${r.summary && r.summary.length > 200 ? '...' : ''}
                    </div>
                    <button onclick="viewMySubmittedReport(${r.id})" style="padding: 8px 16px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                        👁️ View Full Report
                    </button>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Load my reports error:', err);
        container.innerHTML = `<div style="text-align:center; padding:40px; color:#dc2626;">❌ Failed to load reports: ${esc(err.message)}</div>`;
    }
}
async function viewMySubmittedReport(id) {
    try {
        const allReports = await API.getDepartmentReports();
        const report = allReports.find(r => r.id === id);

        if (!report) {
            showToast('Report not found', 'error');
            return;
        }

        let modal = document.getElementById('viewMyReportModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="viewMyReportModal" style="z-index: 10000; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);">
                    <div class="modal-box" style="max-width: 800px; padding: 0; overflow: hidden; max-height: 92vh; display: flex; flex-direction: column; border-radius: 12px; background: white;">
                        <div style="background: linear-gradient(135deg, #0a1929, #1a7f5a); padding: 16px 24px; color: white; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                            <div style="font-size: 16px; font-weight: 700;">📄 Report Details</div>
                            <button onclick="closeModal('viewMyReportModal')" style="background: rgba(255,255,255,0.1); border: none; color: white; width: 36px; height: 36px; border-radius: 6px; font-size: 18px; cursor: pointer;">✕</button>
                        </div>
                        <div id="viewMyReportBody" style="padding: 32px; overflow-y: auto; flex: 1;"></div>
                    </div>
                </div>
            `);
            modal = document.getElementById('viewMyReportModal');
        }

        const dateStr = new Date(report.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
        let metricsHtml = '';
        
        if (report.metrics && Object.keys(report.metrics).length > 0) {
            metricsHtml = `
                <div style="margin-top: 20px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
                    <h4 style="font-size: 12px; font-weight: 800; color: #1a7f5a; text-transform: uppercase; margin-top: 0; margin-bottom: 12px;">📊 Key Metrics</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        ${Object.entries(report.metrics).map(([key, value]) => `
                            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 800;">${esc(key)}</div>
                                <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 4px;">${esc(value)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        document.getElementById('viewMyReportBody').innerHTML = `
            <div style="margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
                <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0;">${esc(report.title)}</h1>
                <div style="display: flex; gap: 16px; font-size: 13px; color: #64748b; font-weight: 600;">
                    <span>📅 ${dateStr}</span>
                    <span>🏢 ${esc(report.department)}</span>
                    <span>📆 ${esc(report.period)}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4 style="font-size: 12px; font-weight: 800; color: #1a7f5a; text-transform: uppercase; margin-top: 0; margin-bottom: 8px;">📝 Executive Narrative</h4>
                <div style="font-size: 14px; line-height: 1.8; color: #334155; white-space: pre-wrap;">${esc(report.summary)}</div>
            </div>

            ${metricsHtml}

            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
                Submitted by: <strong>${esc(report.submittedBy)}</strong>
            </div>
        `;

        modal.classList.add('show');
    } catch (err) {
        console.error('View my report error:', err);
        showToast('Failed to load report details', 'error');
    }
}