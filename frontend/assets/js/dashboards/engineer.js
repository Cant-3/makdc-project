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
    if(event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    switch(tabId) {
        case 'tab1': loadDashboard(); break;
        case 'tab2': loadRawMaterials(); loadReceipts(); break;
        case 'tab3': loadBatches(); break;
        case 'tab4': loadStock(); break;
        case 'tab5': loadPendingRelease(); break;
        case 'tab6': loadQualityControl(); break;
        case 'tab7': handleReportTypeChange(); break;
        case 'my-requests': loadMyRequests();break;
    }
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
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        showToast(err.message, 'error');
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
    // Badilisha maandishi ya Confirm Modal
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
    
    // Weka action ya kitufe
    const confirmBtn = document.getElementById('confirmActionBtn');
    // Ondoa event listeners zote za zamani
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    
    // Ongeza event listener mpya
    newConfirmBtn.addEventListener('click', async function() {
        closeModal('customConfirmModal');
        showToast('⏳ Releasing batch...', 'info');
        
        try {
            const res = await API.releaseBatchToSales(id);
            showToast(res.message, 'success');
            
            // Refresh data zote
            await loadPendingRelease();
            await loadStock();
            await loadBatches();
            await loadDashboard();
            
            // Baada ya Release, nenda kwenye tab ya History
            switchReleaseTab('released');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    // Fungua Modal
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