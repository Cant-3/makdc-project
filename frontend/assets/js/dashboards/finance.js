// ================================================================
// MAK DC INVESTMENT — FINANCE DASHBOARD (COMPLETE)
// ================================================================
let currentUser = null;
let currentProfilePic = null;
let allReceipts = [];
let currentReceiptFilter = '';

document.addEventListener('DOMContentLoaded', async function() {
    if (!protectPage('Finance', 'SuperAdmin', 'CEO')) return;

    currentUser = Auth.getUser();

    renderFinanceProfile();
    initSidebar();
    ensureCPDialogsExist();
    populatePayrollYears();
    setReportPreparedBy();
    await populatePayrollAccounts();
    await loadFinanceDashboard();
    await loadDashboardOverview();
});
function renderFinanceProfile() {
    if (!currentUser) return;

    const user = currentUser;
    const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

    setText('sidebarUserName', user.fullName);
    setAvatar('sidebarUserAvatar', user.profilePic, initials);
    setText('udName', user.fullName);
    setText('udRole', `💰 ${user.role}`);
    setAvatar('udAvatar', user.profilePic, initials);
    setText('udpName', user.fullName);
    setText('udpRole', `💰 ${user.role}`);
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

function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showToast(message, type = 'success') {
    if (typeof Toast !== 'undefined' && typeof Toast[type] === 'function') Toast[type](message);
    else console.log(`[${type.toUpperCase()}] ${message}`);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}

function cpToast(title, message, type = 'success', duration = 4000) {
    let container = document.getElementById('cpToastContainer');
    
    if (!container) {
        container = document.createElement('div');
        container.className = 'cp-toast-container';
        container.id = 'cpToastContainer';
        document.body.appendChild(container);
    }
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const el = document.createElement('div');
    el.className = `cp-toast ${type}`;
    el.innerHTML = `
        <div class="cp-toast-icon">${icons[type] || '✅'}</div>
        <div class="cp-toast-content">
            <div class="cp-toast-title">${title}</div>
            <div class="cp-toast-msg">${message}</div>
        </div>
        <button class="cp-toast-close" onclick="this.closest('.cp-toast').remove()">✕</button>
        <div class="cp-toast-progress"></div>
    `;
    container.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, duration);
}

function cpConfirm(opts = {}) {
    return new Promise((resolve) => {
        if (typeof modernConfirm === 'function') {
            return modernConfirm(opts).then(resolve);
        }
        const confirmed = window.confirm(opts.message || 'Are you sure?');
        resolve({ confirmed, reason: null });
    });
}

function formatNumber(num) {
    if (num === null || num === undefined || num === '') return '';
    const n = Number(num);
    if (isNaN(n)) return '';
    
    return n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function parseFormattedNumber(str) {
    if (!str) return 0;
    const cleaned = String(str).replace(/,/g, '').trim();
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
}

function attachNumberFormatter(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.type = 'text';
    input.inputMode = 'decimal';
    input.placeholder = '0.00';
    
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/[^\d.]/g, '');
        const parts = value.split('.');
        if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
        
        const [intPart, decPart] = value.split('.');
        const formattedInt = intPart ? Number(intPart).toLocaleString('en-US') : '';
        const result = decPart !== undefined ? `${formattedInt}.${decPart.slice(0, 2)}` : formattedInt;
        
        const cursorPos = e.target.selectionStart;
        const oldLen = e.target.value.length;
        e.target.value = result;
        const newLen = result.length;
        e.target.selectionStart = e.target.selectionEnd = cursorPos + (newLen - oldLen);
    });
    
    input.addEventListener('blur', () => {
        const n = parseFormattedNumber(input.value);
        input.value = n >= 0 ? formatNumber(n) : '';
    });
}

function attachAllNumberFormatters() {
    const amountInputs = ['resAmount', 'resUnitCost', 'resUnitValue', 'resWeight'];
    amountInputs.forEach(id => attachNumberFormatter(id));
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


function closeAllSidebarDropdowns() {
    document.querySelectorAll('.sidebar-nav-parent.open').forEach(el => {
        el.classList.remove('open');
        const sub = el.nextElementSibling;
        if (sub) sub.classList.remove('open');
    });
}


function ensureCPDialogsExist() {
    if (!document.getElementById('cpToastContainer')) {
        const el = document.createElement('div');
        el.className = 'cp-toast-container';
        el.id = 'cpToastContainer';
        document.body.appendChild(el);
    }

    if (!document.getElementById('cpImgPreview')) {
        const html = `
            <div class="cp-img-preview" id="cpImgPreview" onclick="closeCPImagePreview()">
                <button class="close-preview" onclick="closeCPImagePreview()">✕</button>
                <img id="cpImgPreviewSrc" src="" alt="Preview" onclick="event.stopPropagation()">
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
}

async function loadFinanceDashboard() {
    try {
        // 1. Vuta orders zote kutoka API
        const rawResponse = await API.getOrders().catch(() => []);

        // 2. Handle format mbili: {orders: [...]} au [...]
        let orders = [];
        if (Array.isArray(rawResponse)) {
            orders = rawResponse;
        } else if (rawResponse && Array.isArray(rawResponse.orders)) {
            orders = rawResponse.orders;
        } else if (rawResponse && Array.isArray(rawResponse.data)) {
            orders = rawResponse.data;
        }

        console.log('📦 Finance loaded orders:', orders.length);

        // 3. Filter kwa status tofauti
        const allOrders = orders;
        const pendingPayment = orders.filter(o => o.status === 'ready-for-finance');
        const awaitingPayment = orders.filter(o => o.status === 'awaiting-payment');
        const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'delivered' || o.status === 'completed');
        const receipts = orders.filter(o => o.receiptNumber);

        // 4. Update Badges za Sidebar
        setText('navAllOrdersBadge', allOrders.length);
        setText('navPendingBadge', pendingPayment.length);
        setText('navAwaitingBadge', awaitingPayment.length);
        setText('navPaidBadge', paidOrders.length);
        setText('navReceiptsBadge', receipts.length);

        // 5. Render kila section
        renderAllOrders(allOrders);
        renderPendingOrders(pendingPayment);
        renderAwaitingOrders(awaitingPayment);
        renderPaidOrders(paidOrders);

        // Hifadhi receipts kwa ajili ya tab ya receipts
        allReceipts = receipts;
        if (document.getElementById('receiptsContainer')) {
            renderReceiptsList();
        }

    } catch (err) {
        console.error('Finance dashboard error:', err);
        cpToast('Error', 'Failed to load orders: ' + err.message, 'error');
    }
}

function prefetchOrders(orders) {
    if (!Array.isArray(orders)) return;
    orders.slice(0, 10).forEach(o => {
        const key = `order_cache_${o.orderId}`;
        if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, JSON.stringify({ ...o, _cachedAt: Date.now() }));
        }
    });
}

function renderAllOrders(orders) {
    const container = document.getElementById('allOrdersContainer');
    if (!container) return;

    const safeOrders = Array.isArray(orders) ? orders : [];
    prefetchOrders(safeOrders);

    if (safeOrders.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--gray-400);"><span style="font-size:50px;display:block;margin-bottom:12px;">📭</span><div style="font-size:16px;font-weight:700;">No Orders Found</div></div>`;
        return;
    }

    const statusColors = {
        'pending':              { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', icon: '⏳', label: 'PENDING' },
        'ready-for-finance':    { bg: 'rgba(20,184,166,0.15)',  color: '#14b8a6', icon: '📤', label: 'READY FOR FINANCE' },
        'awaiting-payment':     { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', icon: '⏳', label: 'AWAITING PAYMENT' },
        'postpaid-approved':    { bg: 'rgba(79,70,229,0.15)',   color: '#4f46e5', icon: '📅', label: 'POSTPAID APPROVED' },
        'paid':                 { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', icon: '✅', label: 'PAID' },
        'delivered':            { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e', icon: '🚚', label: 'DELIVERED' },
        'completed':            { bg: 'rgba(22,163,74,0.15)',   color: '#16a34a', icon: '✅', label: 'COMPLETED' },
        'rejected':             { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', icon: '❌', label: 'REJECTED' }
    };

    container.innerHTML = `<div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
        ${safeOrders.map(order => {
            const sc = statusColors[order.status] || { bg: 'rgba(148,163,184,0.15)', color: '#64748b', icon: '📋', label: (order.status || 'unknown').toUpperCase() };
            return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--gray-100);gap:12px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                            <span style="font-family:monospace;font-weight:700;color:var(--primary);">${esc(order.orderId)}</span>
                            <span style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:10px;background:${sc.bg};color:${sc.color};text-transform:uppercase;letter-spacing:0.5px;">${sc.icon} ${sc.label}</span>
                        </div>
                        <div style="font-size:13px;font-weight:600;">${esc(order.customerName || '—')}</div>
                        <div style="font-size:12px;color:var(--gray-500);">${esc(order.phone || '—')}</div>
                        ${order.receiptNumber ? `<div style="font-size:11px;color:#16a34a;font-weight:700;margin-top:2px;">🧾 ${esc(order.receiptNumber)}</div>` : ''}
                    </div>
                    <span style="font-weight:800;color:var(--primary);">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
                    <div style="display:flex;gap:6px;">
                        <button onclick="viewFinanceOrder('${order.orderId}')" title="View Order" style="width:34px;height:34px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">👁</button>
                        ${order.status === 'ready-for-finance' ? `<button onclick="openSetupPaymentModal('${order.orderId}')" style="padding:8px 16px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">💳 Setup</button>` : ''}
                        ${(order.status === 'awaiting-payment' || order.status === 'postpaid-approved') ? `<button onclick="openVerifyPaymentModal('${order.orderId}')" style="padding:8px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">✅ Verify</button>` : ''}
                        ${order.receiptNumber ? `<button onclick="viewOrderReceipt('${order.orderId}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">🧾 Receipt</button>` : ''}
                    </div>
                </div>
            `;
        }).join('')}
    </div>`;
}

function renderPendingOrders(orders) {
    const container = document.getElementById('pendingOrdersContainer');
    if (!container) return;
    const safeOrders = Array.isArray(orders) ? orders : [];
    prefetchOrders(safeOrders);

    if (safeOrders.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--gray-400);"><span style="font-size:50px;display:block;margin-bottom:12px;">✅</span><div style="font-size:16px;font-weight:700;">No Orders Pending</div></div>`;
        return;
    }
    container.innerHTML = `<div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
        ${safeOrders.map(order => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--gray-100);gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">
                    <div style="font-family:monospace;font-weight:700;color:var(--primary);">${esc(order.orderId)}</div>
                    <div style="font-size:13px;font-weight:600;">${esc(order.customerName || '—')}</div>
                    <div style="font-size:12px;color:var(--gray-500);">${esc(order.phone || '—')}</div>
                </div>
                <span style="font-weight:800;color:var(--primary);">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
                <div style="display:flex;gap:6px;">
                    <button onclick="viewFinanceOrder('${order.orderId}')" title="View Order" style="width:34px;height:34px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">👁</button>
                    <button onclick="openSetupPaymentModal('${order.orderId}')" style="padding:8px 16px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">💳 Setup Payment</button>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function renderAwaitingOrders(orders) {
    const container = document.getElementById('awaitingOrdersContainer');
    if (!container) return;
    const safeOrders = Array.isArray(orders) ? orders : [];
    prefetchOrders(safeOrders);

    if (safeOrders.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--gray-400);"><span style="font-size:50px;display:block;margin-bottom:12px;">📭</span><div style="font-size:16px;font-weight:700;">No Awaiting Payments</div></div>`;
        return;
    }
    container.innerHTML = `<div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
        ${safeOrders.map(order => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--gray-100);gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;">
                    <div style="font-family:monospace;font-weight:700;color:var(--primary);">${esc(order.orderId)}</div>
                    <div style="font-size:13px;font-weight:600;">${esc(order.customerName || '—')}</div>
                </div>
                <span style="font-weight:800;color:var(--primary);">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
                <div style="display:flex;gap:6px;">
                    <button onclick="viewFinanceOrder('${order.orderId}')" title="View Order" style="width:34px;height:34px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">👁</button>
                    <button onclick="openVerifyPaymentModal('${order.orderId}')" style="padding:8px 16px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">✅ Verify</button>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function renderPaidOrders(orders) {
    const container = document.getElementById('paidOrdersContainer');
    if (!container) return;
    const safeOrders = Array.isArray(orders) ? orders : [];
    prefetchOrders(safeOrders);

    if (safeOrders.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:50px;color:var(--gray-400);">
                <span style="font-size:50px;display:block;margin-bottom:12px;">💵</span>
                <div style="font-size:16px;font-weight:700;">No Paid Orders Yet</div>
                <div style="font-size:13px;margin-top:6px;">Orders with confirmed payments will appear here.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
        ${safeOrders.map(order => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--gray-100);gap:12px;flex-wrap:wrap;border-left:4px solid #22c55e;background:linear-gradient(90deg, rgba(34,197,94,0.04), transparent);">
                <div style="flex:1;min-width:220px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
                        <span style="font-family:monospace;font-weight:700;color:var(--primary);">${esc(order.orderId)}</span>
                        <span style="font-size:9px;font-weight:800;padding:3px 10px;border-radius:10px;background:rgba(34,197,94,0.15);color:#22c55e;text-transform:uppercase;letter-spacing:0.5px;">✅ PAID</span>
                    </div>
                    <div style="font-size:13px;font-weight:600;">${esc(order.customerName || '—')}</div>
                    <div style="font-size:12px;color:var(--gray-500);">${esc(order.phone || '—')}</div>
                    ${order.receiptNumber ? `<div style="font-size:11px;color:#16a34a;font-weight:700;margin-top:2px;">🧾 ${esc(order.receiptNumber)}</div>` : ''}
                </div>
                <span style="font-weight:800;color:#22c55e;font-size:16px;">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
                <div style="display:flex;gap:6px;">
                    <button onclick="viewFinanceOrder('${order.orderId}')" title="View Order" style="width:34px;height:34px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;cursor:pointer;font-size:14px;">👁</button>
                    ${order.receiptNumber ? `<button onclick="viewOrderReceipt('${order.orderId}')" style="padding:8px 14px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit;">🧾 Receipt</button>` : ''}
                </div>
            </div>
        `).join('')}
    </div>`;
}
async function viewFinanceOrder(orderId) {
    const modal = document.getElementById('viewOrderModal');
    const body = document.getElementById('viewOrderBody');
    const title = document.getElementById('viewOrderTitle');
    const statusPill = document.getElementById('viewOrderStatusPill');

    if (title) title.textContent = orderId;
    if (modal) modal.classList.add('show');

    const cacheKey = `order_cache_${orderId}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
        try {
            const order = JSON.parse(cached);
            const age = Date.now() - (order._cachedAt || 0);
            if (age < 5 * 60 * 1000) {
                renderFinanceOrderView(order);
                API.getOrder(orderId).then(fresh => {
                    if (fresh) {
                        fresh._cachedAt = Date.now();
                        sessionStorage.setItem(cacheKey, JSON.stringify(fresh));
                        renderFinanceOrderView(fresh);
                    }
                }).catch(() => {});
                return;
            }
        } catch (e) {}
    }

    if (body) {
        body.innerHTML = `
            <div style="text-align:center; padding:50px 20px;">
                <div style="display:inline-block; width:44px; height:44px; border:4px solid #e5e7eb; border-top-color:#0f766e; border-radius:50%; animation: spin 0.8s linear infinite;"></div>
                <style>@keyframes spin{to{transform:rotate(360deg);}}</style>
                <div style="margin-top:14px; color:#64748b; font-size:13px; font-weight:600;">⏳ Loading order...</div>
            </div>
        `;
    }
    if (statusPill) {
        statusPill.textContent = 'LOADING';
        statusPill.style.cssText = 'background:#94a3b8;color:white;';
    }

    try {
        const order = await API.getOrder(orderId);
        if (!order) {
            if (body) body.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">❌ Order not found</div>';
            return;
        }
        order._cachedAt = Date.now();
        sessionStorage.setItem(cacheKey, JSON.stringify(order));
        renderFinanceOrderView(order);
    } catch (err) {
        if (body) body.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">❌ ${esc(err.message)}</div>`;
    }
}
async function loadFinanceProcurementPayments() {
    const container = document.getElementById('procurementPaymentsContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">⏳ Loading...</div>';
    
    try {
        const requests = await API.getProcurementRequests('/pending?stage=finance');
        
        if (requests.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">📭 No pending payments</div>';
            return;
        }
        
        container.innerHTML = requests.map(r => `
            <div style="background:white;border-radius:12px;padding:16px 20px;margin-bottom:12px;border-left:4px solid #14b8a6;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                    <div style="flex:1;min-width:220px;">
                        <div style="font-family:monospace;font-weight:800;color:#022908;font-size:14px;">${esc(r.request_number)}</div>
                        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:4px;">${esc(r.title || 'Untitled Request')}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;">Supplier: ${esc(r.supplier_name || '—')}</div>
                        ${r.invoice_number ? `<div style="font-size:11px;color:#14b8a6;font-weight:700;margin-top:2px;">🧾 Invoice: ${esc(r.invoice_number)}</div>` : ''}
                        ${r.imprest_number ? `<div style="margin-top:8px;"><a href="${API.getImprestPdfUrl(r.id)}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;background:#f59e0b;color:#022908;padding:4px 10px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:11px;">📥 Download Imprest (${r.imprest_number})
                        </a>
                    </div>
                ` : ''}
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:18px;font-weight:900;color:#022908;font-family:'Courier New',monospace;">TSh ${Number(r.total_amount || 0).toLocaleString()}</div>
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-top:2px;">To Pay</div>
                    </div>
                </div>
                <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
                    <!-- 🆕 Badilisha hapa: Tumia openProcVerify -->
                    <button onclick="openProcVerify(${r.id})" style="padding:8px 16px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;">✅ Verify & Send to Manager</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">❌ ${err.message}</div>`;
    }
}
async function financeMarkPaid(id) {
    const notes = prompt('Payment reference / notes:');
    if (!notes) return;
    try {
        await API.updateProcurementStatus(id, { status: 'paid', notes: notes });
        showToast('✅ Payment Recorded!', 'success');
        loadFinanceProcurementPayments();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
function renderFinanceOrderView(order) {
    const body = document.getElementById('viewOrderBody');
    const statusPill = document.getElementById('viewOrderStatusPill');
    if (!body) return;

    if (statusPill) {
        statusPill.textContent = (order.status || 'pending').toUpperCase();
        const colors = {
            'pending': 'background:#f59e0b;color:white;',
            'ready-for-finance': 'background:#14b8a6;color:white;',
            'awaiting-payment': 'background:#f59e0b;color:white;',
            'postpaid-approved': 'background:#4f46e5;color:white;',
            'paid': 'background:#22c55e;color:white;',
            'delivered': 'background:#22c55e;color:white;',
            'completed': 'background:#16a34a;color:white;',
            'rejected': 'background:#ef4444;color:white;'
        };
        statusPill.style.cssText = colors[order.status] || 'background:#f59e0b;color:white;';
    }

    const itemsHtml = (order.items || []).map(item => `
        <div class="order-item-row">
            <span class="item-name"><span class="item-qty">${item.quantity}×</span>${esc(item.productName)}</span>
            <span class="item-price">TSh ${Number(item.subtotal || 0).toLocaleString()}</span>
        </div>
    `).join('') || '<div style="padding:10px;color:#94a3b8;text-align:center;">No items</div>';

    body.innerHTML = `
        <div style="background:rgba(20,184,166,0.06); border-left:4px solid #14b8a6; border-radius:10px; padding:12px 16px; margin-bottom:16px;">
            <div style="font-size:10px;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:4px;">Order ID</div>
            <div style="font-family:monospace;font-size:15px;font-weight:800;color:#134e4a;">${esc(order.orderId)}</div>
        </div>

        <div style="font-size:12px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">👤 Customer Information</div>
        <div class="info-row"><span class="label">Name</span><span class="value">${esc(order.customerName || '—')}</span></div>
        <div class="info-row"><span class="label">Phone</span><span class="value">${esc(order.phone || '—')}</span></div>
        <div class="info-row"><span class="label">Email</span><span class="value">${esc(order.email || '—')}</span></div>
        <div class="info-row"><span class="label">Location</span><span class="value">${esc(order.district || '—')}, ${esc(order.region || '—')}</span></div>
        <div class="info-row"><span class="label">Payment Type</span><span class="value">${esc(order.paymentType || '—')}</span></div>
        ${order.receiptNumber ? `<div class="info-row"><span class="label">Receipt #</span><span class="value" style="font-family:monospace;color:#16a34a;">${esc(order.receiptNumber)}</span></div>` : ''}

        <div style="margin-top:16px; padding-top:12px; border-top:2px solid #e5e7eb;">
            <div style="font-size:12px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;">🛒 Items Purchased</div>
            <div style="background:var(--gray-50);border-radius:10px;padding:12px 16px;border:1px solid var(--gray-200);">${itemsHtml}</div>
            <div class="info-row" style="margin-top:10px; padding-top:12px; border-top:2px solid var(--gold); font-size:15px;">
                <span class="label" style="font-weight:800;">GRAND TOTAL</span>
                <span class="value" style="color:var(--gold); font-size:18px; font-weight:900;">TSh ${Number(order.totalAmount || 0).toLocaleString()}</span>
            </div>
        </div>

        ${order.notes ? `<div style="margin-top:16px;padding:12px 16px;background:rgba(245,158,11,0.06);border-left:3px solid #f59e0b;border-radius:8px;font-size:12px;color:#78350f;line-height:1.6;"><strong style="display:block;margin-bottom:4px;text-transform:uppercase;font-size:10px;letter-spacing:1px;">📝 Notes</strong>${esc(order.notes)}</div>` : ''}
    `;
}

let currentSetupOrderId = null;

async function openSetupPaymentModal(orderId) {
    currentSetupOrderId = orderId;

    // 1. Onyesha Modal MARA MOJA (Bila kusubiri API)
    let modal = document.getElementById('setupPaymentModal');
    if (!modal) {
        // ... (Weka hapa ule msimbo wako wote wa HTML wa kutengeneza modal kama ulivyokuwa awali) ...
        // (Nimeacha sehemu hii ili isichukue nafasi, nakili kutoka kwenye code yako ya awali)
    }

    // Weka maandishi ya "Loading" kwanza
    document.getElementById('setupOrderIdDisplay').textContent = orderId;
    document.getElementById('setupCustomerName').textContent = '⏳ Inatafuta taarifa...';
    document.getElementById('setupAmount').textContent = 'TSh ...';
    
    const accSelect = document.getElementById('setupPaymentAccount');
    accSelect.innerHTML = '<option value="">⏳ Inatafuta akaunti...</option>';
    
    document.getElementById('setupPaymentModal').classList.add('show');

    // 2. Sasa vuta data kwa nyuma (Background)
    try {
        const [order, allAccounts] = await Promise.all([
            API.getOrder(orderId).catch(() => null),
            (typeof API.getApprovedAccounts === 'function') ? API.getApprovedAccounts().catch(() => []) : Promise.resolve([])
        ]);

        if (!order) {
            cpToast('Not Found', 'Order not found', 'error');
            closeModal('setupPaymentModal');
            return;
        }

        // 3. Filter: Collections PEKEE
        const accounts = (allAccounts || []).filter(a => a.purpose === 'collections');

        // 4. Jaza Taarifa za Order
        document.getElementById('setupCustomerName').textContent = `${order.customerName || '—'} • ${order.phone || '—'}`;
        document.getElementById('setupAmount').textContent = 'TSh ' + Number(order.totalAmount || 0).toLocaleString();

        // 5. Jaza Akaunti
        accSelect.innerHTML = '<option value="">— Select Collection Account —</option>';
        if (accounts && accounts.length > 0) {
            accounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                const icon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';
                opt.textContent = `${icon} ${acc.name} — ${acc.accountNumber}`;
                accSelect.appendChild(opt);
            });
        } else {
            accSelect.innerHTML = '<option value="">⚠ Hakuna akaunti ya Collections</option>';
        }

    } catch (err) {
        cpToast('Failed', err.message, 'error');
        closeModal('setupPaymentModal');
    }
}
async function getOperationsAccounts() {
    try {
        const accounts = await API.getApprovedAccounts().catch(() => []);
        return (accounts || []).filter(a => a.purpose === 'operations');
    } catch (err) {
        console.error('Error fetching operations accounts:', err);
        return [];
    }
}

async function getCollectionsAccounts() {
    try {
        const accounts = await API.getApprovedAccounts().catch(() => []);
        return (accounts || []).filter(a => a.purpose === 'collections');
    } catch (err) {
        console.error('Error fetching collections accounts:', err);
        return [];
    }
}
async function confirmSetupPayment() {
    const paymentType = document.getElementById('setupPaymentType').value;
    const paymentAccountId = document.getElementById('setupPaymentAccount').value;
    const paymentInstructions = document.getElementById('setupPaymentInstructions').value.trim() || null;
    const paymentDeadline = document.getElementById('setupPaymentDeadline').value || null;

    if (paymentType === 'prepaid' && !paymentAccountId) {
        cpToast('Required', 'Please select a company account for prepaid.', 'warning');
        return;
    }

    try {
        await API.setupPayment(currentSetupOrderId, {
            paymentType,
            paymentAccountId: paymentAccountId ? parseInt(paymentAccountId) : null,
            paymentInstructions,
            paymentDeadline
        });
        closeModal('setupPaymentModal');
        cpToast('✅ Setup Complete', 'Payment instructions sent to customer.', 'success');
        sessionStorage.removeItem(`order_cache_${currentSetupOrderId}`);
        loadFinanceDashboard();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

let currentVerifyOrderId = null;

async function openVerifyPaymentModal(orderId) {
    currentVerifyOrderId = orderId;

    try {
        const order = await API.getOrder(orderId);
        if (!order) { cpToast('Not Found', 'Order not found', 'error'); return; }

        let modal = document.getElementById('verifyPaymentModal');
        if (!modal) {
            const html = `
                <div class="modal-overlay" id="verifyPaymentModal">
                    <div class="modal-box" style="max-width:560px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                        <div style="background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                            <div style="display:flex;align-items:center;gap:14px;">
                                <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">✅</div>
                                <div>
                                    <h3 style="font-size:18px;font-weight:800;color:white;margin:0 0 2px 0;">Verify Payment</h3>
                                    <p style="font-size:12px;color:rgba(255,255,255,0.85);margin:0;">Confirm payment received & issue receipt</p>
                                </div>
                            </div>
                            <button onclick="closeModal('verifyPaymentModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                        <div style="padding:22px 26px;overflow-y:auto;flex:1;">
                            <div style="background:rgba(34,197,94,0.06);border-left:4px solid #22c55e;border-radius:10px;padding:14px 18px;margin-bottom:18px;">
                                <div style="font-size:10px;color:#166534;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:4px;">Order</div>
                                <div style="font-family:monospace;font-size:15px;font-weight:800;color:#14532d;" id="verifyOrderIdDisplay">—</div>
                                <div style="font-size:12px;color:#475569;margin-top:6px;" id="verifyCustomerName">—</div>
                                <div style="font-size:16px;font-weight:900;color:#16a34a;margin-top:8px;" id="verifyAmount">TSh 0</div>
                            </div>

                            <div class="cp-form-group">
                                <label>Payment Reference / Receipt No. <span class="req">*</span></label>
                                <input type="text" id="verifyPaymentRef" placeholder="e.g., CRDB-REF-12345 / M-Pesa Code">
                            </div>

                            <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-left:4px solid #f59e0b;border-radius:8px;padding:12px 16px;font-size:12px;color:#78350f;line-height:1.6;">
                                ⚠️ <strong>Verify Payment:</strong> Confirm that the payment has been received and all transaction details are <strong>accurate</strong>.
                            </div>
                        </div>
                        <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;">
                            <button onclick="closeModal('verifyPaymentModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                            <button onclick="confirmVerifyPayment()" style="padding:11px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">✅ Verify & Issue Receipt</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);
        }

        document.getElementById('verifyOrderIdDisplay').textContent = order.orderId;
        document.getElementById('verifyCustomerName').textContent = `${order.customerName || '—'} • ${order.phone || '—'}`;
        document.getElementById('verifyAmount').textContent = 'TSh ' + Number(order.totalAmount || 0).toLocaleString();
        document.getElementById('verifyPaymentRef').value = order.paymentReference || '';

        document.getElementById('verifyPaymentModal').classList.add('show');

    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function confirmVerifyPayment() {
    const ref = document.getElementById('verifyPaymentRef').value.trim();
    if (!ref) {
        cpToast('Required', 'Payment reference is required.', 'warning');
        return;
    }

    try {
        const result = await API.verifyPayment(currentVerifyOrderId, ref);
        closeModal('verifyPaymentModal');
        cpToast('✅ Verified', `Payment verified! Receipt: ${result.receiptNumber || '—'}`, 'success');
        sessionStorage.removeItem(`order_cache_${currentVerifyOrderId}`);
        loadFinanceDashboard();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function loadReceipts() {
    const container = document.getElementById('receiptsContainer');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading receipts...</div>';
    try {
        const orders = await API.getOrders();
        const safeOrders = Array.isArray(orders) ? orders : [];
        allReceipts = safeOrders.filter(o => o.receiptNumber);
        allReceipts.sort((a, b) => new Date(b.receiptIssuedAt || 0) - new Date(a.receiptIssuedAt || 0));
        renderReceiptsList();
        setText('navReceiptsBadge', allReceipts.length);
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

function filterReceipts() {
    currentReceiptFilter = (document.getElementById('receiptSearchInput')?.value || '').toLowerCase().trim();
    renderReceiptsList();
}

function renderReceiptsList() {
    const container = document.getElementById('receiptsContainer');
    if (!container) return;
    let filtered = allReceipts;
    if (currentReceiptFilter) {
        filtered = allReceipts.filter(r =>
            (r.receiptNumber || '').toLowerCase().includes(currentReceiptFilter) ||
            (r.orderId || '').toLowerCase().includes(currentReceiptFilter) ||
            (r.customerName || '').toLowerCase().includes(currentReceiptFilter) ||
            (r.phone || '').toLowerCase().includes(currentReceiptFilter)
        );
    }
    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--gray-400);"><span style="font-size:50px;display:block;margin-bottom:12px;">🧾</span><div style="font-size:16px;font-weight:700;">${currentReceiptFilter ? 'No Match' : 'No Receipts Yet'}</div></div>`;
        return;
    }
    container.innerHTML = `<div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
        ${filtered.map(order => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--gray-100);gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:220px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <span style="font-family:monospace;font-weight:800;color:#0f766e;font-size:14px;">🧾 ${esc(order.receiptNumber)}</span>
                    </div>
                    <div style="font-size:14px;font-weight:700;color:#334155;">${esc(order.customerName || '—')}</div>
                    <div style="font-size:12px;color:#64748b;">📞 ${esc(order.phone || '—')}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:900;color:#0f766e;font-size:18px;">TSh ${Number(order.totalAmount || 0).toLocaleString()}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="viewOrderReceipt('${order.orderId}')" style="padding:9px 16px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;">🧾 View</button>
                </div>
            </div>
        `).join('')}
    </div>`;
}

async function viewOrderReceipt(orderId) {
    try {
        const order = await API.getOrder(orderId);
        if (!order) { showToast('Order not found', 'error'); return; }
        if (typeof showReceiptModal === 'function') showReceiptModal(order);
        else alert(`Receipt: ${order.receiptNumber || '—'}`);
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
}

async function loadCompanyAccounts() {
    const container = document.getElementById('accountsContainer');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading accounts...</div>';

    try {
        const accounts = await API.getAccounts().catch(() => []);
        const safeAccounts = Array.isArray(accounts) ? accounts : [];

        if (safeAccounts.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                    <span style="font-size:56px;display:block;margin-bottom:14px;opacity:0.5;">🏦</span>
                    <div style="font-size:17px;font-weight:800;color:var(--gray-600);margin-bottom:6px;">No Accounts Yet</div>
                    <div style="font-size:13px;">Click "➕ Add Account" to register your first company account.</div>
                </div>
            `;
            return;
        }

        safeAccounts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const statusLabels = {
            'draft':            { label: 'Draft',            color: '#64748b', bg: 'rgba(100,116,139,0.15)', icon: '📝' },
            'pending':          { label: 'Pending Manager',  color: '#d97706', bg: 'rgba(245,158,11,0.15)',  icon: '🟡' },
            'pending-manager':  { label: 'Pending Manager',  color: '#d97706', bg: 'rgba(245,158,11,0.15)',  icon: '🟡' },
            'pending-ceo':      { label: 'Pending CEO',      color: '#c2410c', bg: 'rgba(234,88,12,0.15)',   icon: '🟠' },
            'approved':         { label: 'Approved',         color: '#16a34a', bg: 'rgba(34,197,94,0.15)',   icon: '✅' },
            'rejected':         { label: 'Rejected',         color: '#dc2626', bg: 'rgba(239,68,68,0.15)',   icon: '❌' }
        };

        const userRole = (currentUser?.role || '').toLowerCase();
        const isFinance = userRole.includes('finance');
        const isManager = userRole.includes('manager');
        const isCeo = userRole.includes('ceo') || userRole.includes('superadmin');

        container.innerHTML = safeAccounts.map(acc => {
            const sInfo = statusLabels[acc.status] || statusLabels['draft'];
            const typeIcon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';
            const createdDate = acc.createdAt ? new Date(acc.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

            let actions = `<button class="cp-btn-view" onclick="viewAccountDetails('${acc.id}')">👁 View</button>`;

            if (acc.status === 'draft' && isFinance) {
                actions += `<button class="cp-btn-edit" onclick="editDraftAccount('${acc.id}')">🖋️ Edit</button>`;
                actions += `<button class="cp-btn-send" onclick="sendAccountToManager('${acc.id}')">📤 Send to Manager</button>`;
                actions += `<button class="cp-btn-reject" onclick="deleteDraftAccount('${acc.id}')">🗑️ Delete</button>`;
            }
            if ((acc.status === 'pending' || acc.status === 'pending-manager') && isManager) {
                actions += `<button class="cp-btn-verify" onclick="managerVerifyAccount('${acc.id}')">✅ Verify</button>`;
                actions += `<button class="cp-btn-reject" onclick="rejectAccount('${acc.id}')">❌ Reject</button>`;
            }
            if (acc.status === 'pending-ceo' && isCeo) {
                actions += `<button class="cp-btn-approve" onclick="ceoApproveAccount('${acc.id}')">✅ Approve</button>`;
                actions += `<button class="cp-btn-reject" onclick="rejectAccount('${acc.id}')">❌ Reject</button>`;
            }
            if (acc.status === 'rejected' && isFinance) {
                actions += `<button class="cp-btn-edit" onclick="editRejectedAccount('${acc.id}')">🖋️ Edit & Resubmit</button>`;
            }
            if (acc.status === 'approved') {
                actions += `<span style="font-size:11px;color:var(--gray-500);font-style:italic;padding:6px 10px;background:var(--gray-100);border-radius:6px;display:inline-flex;align-items:center;gap:4px;">🔒 Locked</span>`;
            }

            return `
                <div style="border:1.5px solid var(--gray-200);border-left:4px solid ${sInfo.color};border-radius:12px;padding:16px 20px;margin-bottom:12px;background:white;${acc.status === 'approved' ? 'background:linear-gradient(90deg,rgba(34,197,94,0.04),transparent);' : ''}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
                        <div style="flex:1;min-width:240px;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                                <span style="font-weight:700;color:var(--primary);font-size:15px;">${typeIcon} ${esc(acc.name)}</span>
                                <span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;background:${sInfo.bg};color:${sInfo.color};text-transform:uppercase;">${sInfo.icon} ${sInfo.label}</span>
                            </div>
                            <div style="font-size:12px;color:var(--gray-600);font-family:monospace;">${esc(acc.accountNumber)}</div>
                            ${acc.bankName ? `<div style="font-size:11px;color:var(--gray-500);margin-top:2px;">🏛️ ${esc(acc.bankName)}${acc.branch ? ' — ' + esc(acc.branch) : ''}</div>` : ''}
                            ${acc.balance ? `<div style="font-size:12px;color:var(--primary-dark);font-weight:700;margin-top:4px;">${acc.currency || 'TZS'} ${Number(acc.balance).toLocaleString()}</div>` : ''}
                            <div style="font-size:11px;color:var(--gray-500);margin-top:6px;">📅 Created: ${createdDate} • 👤 ${esc(acc.requester?.fullName || acc.createdBy || '—')}</div>
                        </div>
                    </div>
                    <div class="cp-actions" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap;">${actions}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('loadCompanyAccounts error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

async function sendAccountToManager(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }
        if (acc.status !== 'draft') {
            cpToast('Cannot Send', 'Only draft accounts can be sent.', 'warning');
            return;
        }

        const res = await cpConfirm({
            title: '📤 Send to Manager?',
            message: `Account "${acc.name}" will be sent to Manager for verification.`,
            detail: { label: 'Account', value: `${acc.name} • ${acc.accountNumber}` },
            warn: '⚠️ <strong>Important:</strong> Once sent, you cannot edit this account until Manager or CEO makes a decision.',
            type: 'primary',
            okText: '📤 Send Now',
            cancelText: 'Cancel'
        });
        if (!res.confirmed) return;

        await API.updateAccount(id, {
            status: 'pending-manager',
            sentToManagerAt: new Date().toISOString(),
            sentToManagerBy: currentUser?.fullName || 'Finance Officer'
        });

        cpToast('📤 Sent to Manager', `Account "${acc.name}" sent for verification.`, 'success');
        await loadCompanyAccounts();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function editDraftAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }
        if (acc.status !== 'draft') {
            cpToast('Cannot Edit', 'Only draft accounts can be edited.', 'warning');
            return;
        }

        window.__editingAccountId = id;
        window.__resubmitMode = false;

        openAddAccountModal();

        setTimeout(() => {
            const titleEl = document.querySelector('#addAccountModal h3');
            if (titleEl) titleEl.textContent = 'Edit Company Account';

            document.getElementById('accType').value = acc.type || '';
            document.getElementById('accPurpose').value = acc.purpose ||'';
            document.getElementById('accName').value = acc.name || '';
            document.getElementById('accNumber').value = acc.accountNumber || '';
            document.getElementById('accBank').value = acc.bankName || '';
            document.getElementById('accBranch').value = acc.branch || '';
            document.getElementById('accCurrency').value = acc.currency || 'TZS';
            document.getElementById('accBalance').value = acc.balance || 0;
            document.getElementById('accNotes').value = acc.notes || '';
        }, 100);
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function editRejectedAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }

        window.__editingAccountId = id;
        window.__resubmitMode = true;

        openAddAccountModal();

        setTimeout(() => {
            const titleEl = document.querySelector('#addAccountModal h3');
            if (titleEl) titleEl.textContent = 'Edit & Resubmit Account';

            document.getElementById('accType').value = acc.type || '';
            document.getElementById('accName').value = acc.name || '';
            document.getElementById('accPurpose').value = acc.purpose || '';
            document.getElementById('accNumber').value = acc.accountNumber || '';
            document.getElementById('accBank').value = acc.bankName || '';
            document.getElementById('accBranch').value = acc.branch || '';
            document.getElementById('accCurrency').value = acc.currency || 'TZS';
            document.getElementById('accBalance').value = acc.balance || 0;
            document.getElementById('accNotes').value = acc.notes || '';
        }, 100);
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function deleteDraftAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }
        if (acc.status !== 'draft') {
            cpToast('Cannot Delete', 'Only draft accounts can be deleted.', 'warning');
            return;
        }

        const res = await cpConfirm({
            title: '🗑️ Delete Draft?',
            message: `Delete draft account "${acc.name}"? This cannot be undone.`,
            type: 'danger',
            okText: '🗑️ Delete',
            cancelText: 'Keep it'
        });
        if (!res.confirmed) return;

        await API.deleteAccount(id);
        cpToast('🗑️ Deleted', `Draft "${acc.name}" deleted.`, 'info');
        await loadCompanyAccounts();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function managerVerifyAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }

        const res = await cpConfirm({
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

        cpToast('✅ Verified', `Account "${acc.name}" sent to CEO.`, 'success');
        await loadCompanyAccounts();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function ceoApproveAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }

        const res = await cpConfirm({
            title: '✅ Approve Account?',
            message: `Approve "${acc.name}"? It will be available for payment processing and LOCKED.`,
            detail: { label: 'Account', value: `${acc.name} • ${acc.accountNumber}` },
            warn: '🔒 <strong>Locked:</strong> Once approved, this account cannot be edited without Manager approval.',
            type: 'success',
            okText: '✅ Approve & Lock',
            cancelText: 'Cancel'
        });
        if (!res.confirmed) return;

        await API.approveAccount(id, {
            ceoApprovedBy: currentUser?.fullName || 'CEO'
        });

        cpToast('✅ Approved', `Account "${acc.name}" is now active and locked.`, 'success');
        await loadCompanyAccounts();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function rejectAccount(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }

        const res = await cpConfirm({
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

        const rejectedByRole = (currentUser?.role || '').toLowerCase().includes('ceo') ? 'CEO' : 'Manager';

        await API.updateAccount(id, {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: rejectedByRole,
            rejectionReason: res.reason
        });

        cpToast('❌ Rejected', `Account "${acc.name}" has been rejected.`, 'warning');
        await loadCompanyAccounts();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}
function openAddAccountModal() {
    window.__editingAccountId
    
    let modal = document.getElementById('addAccountModal');
    if (!modal) {
        const html = `
            <div class="modal-overlay" id="addAccountModal">
                <div class="modal-box" style="max-width:600px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#14b8a6 0%,#0f766e 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">🏦</div>
                            <div>
                                <h3 id="addAccountTitle" style="font-size:18px;font-weight:800;color:white;margin:0 0 2px 0;">Add Company Account</h3>
                                <p style="font-size:12px;color:rgba(255,255,255,0.85);margin:0;">Register a new company account</p>
                            </div>
                        </div>
                        <button onclick="closeModal('addAccountModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:22px 26px;overflow-y:auto;flex:1;">
                        
                        <div class="cp-form-row">
                            <div class="cp-form-group">
                                <label>Account Type <span class="req">*</span></label>
                                <select id="accType">
                                    <option value="">— Select Type —</option>
                                    <option value="Bank">🏦 Bank Account</option>
                                    <option value="Mobile Money">📱 Mobile Money</option>
                                    <option value="Cash">💵 Cash</option>
                                </select>
                            </div>
                            <div class="cp-form-group">
                                <label>Currency</label>
                                <select id="accCurrency">
                                    <option value="TZS">TZS — Tanzanian Shilling</option>
                                    <option value="USD">USD — US Dollar</option>
                                    <option value="EUR">EUR — Euro</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="cp-form-group">
                            <label>Account Name <span class="req">*</span></label>
                            <input type="text" id="accName" placeholder="e.g., CRDB Main Account">
                        </div>
                        
                        <div class="cp-form-row">
                            <div class="cp-form-group">
                                <label>Account Number <span class="req">*</span></label>
                                <input type="text" id="accNumber" placeholder="e.g., 0150123456789">
                            </div>
                            <div class="cp-form-group">
                                <label>Initial Balance</label>
                                <input type="number" id="accBalance" value="0" min="0" step="1000">
                            </div>
                        </div>
                        <div class="cp-form-row">
                            <div class="cp-form-group">
                                <label>Account Purpose <span class="req">*</span></label>
                                <select id="accPurpose">
                                    <option value="">— Select Purpose —</option>
                                    <option value="collections">💰 Collections (Makusanyo)</option>
                                    <option value="operations">💸 Operations (Malipo)</option>
                                    <option value="reserve">🔒 Reserve (Akiba)</option>
                                    <option value="general">📝 General (Kawaida)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="cp-form-row">
                            <div class="cp-form-group">
                                <label>Bank Name</label>
                                <input type="text" id="accBank" placeholder="e.g., CRDB, NMB, NBC">
                            </div>
                            <div class="cp-form-group">
                                <label>Branch</label>
                                <input type="text" id="accBranch" placeholder="e.g., Makete Branch">
                            </div>
                        </div>
                        
                        <div class="cp-form-group">
                            <label>Notes</label>
                            <textarea id="accNotes" placeholder="Additional information..."></textarea>
                        </div>
                        
                        <div id="accFormStatus" class="status-msg"></div>
                        
                    </div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
                        <button onclick="closeModal('addAccountModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                        <button onclick="submitAddAccount()" style="padding:11px 24px;background:linear-gradient(135deg,#14b8a6,#0f766e);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">💾 Save Account</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
    
    // Reset form
    document.getElementById('addAccountTitle').textContent = 'Add Company Account';
    document.getElementById('accType').value = '';    
    document.getElementById('accPurpose').value = ''; 
    document.getElementById('accCurrency').value = 'TZS';
    document.getElementById('accName').value = '';
    document.getElementById('accNumber').value = '';
    document.getElementById('accBalance').value = 0;
    document.getElementById('accBank').value = '';
    document.getElementById('accBranch').value = '';
    document.getElementById('accNotes').value = '';
    document.getElementById('accFormStatus').className = 'status-msg';
    document.getElementById('accFormStatus').textContent = '';
    
    document.getElementById('addAccountModal').classList.add('show');
}
async function submitAddAccount() {
    const statusDiv = document.getElementById('accFormStatus');
    const status = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
    };
    
    const type = document.getElementById('accType').value;
    const purpose = document.getElementById('accPurpose').value;  // 🆕
    const currency = document.getElementById('accCurrency').value;
    const name = document.getElementById('accName').value.trim();
    const accountNumber = document.getElementById('accNumber').value.trim();
    const balance = parseFloat(document.getElementById('accBalance').value) || 0;
    const bankName = document.getElementById('accBank').value.trim();
    const branch = document.getElementById('accBranch').value.trim();
    const notes = document.getElementById('accNotes').value.trim();
    
    if (!type) return status('⚠ Please select account type');
    if (!purpose) return status('⚠ Please select account purpose');  // 🆕
    if (!name) return status('⚠ Account name is required');
    if (!accountNumber) return status('⚠ Account number is required');
    
    const payload = {
        type,
        purpose,  // 🆕
        currency,
        name,
        accountNumber,
        accountName: name,
        balance,
        bankName: bankName || null,
        branch: branch || null,
        notes: notes || null
    };
    
    try {
        if (window.__editingAccountId) {
            const res = await API.updateAccount(window.__editingAccountId, {
                ...payload,
                status: window.__resubmitMode ? 'pending-manager' : undefined
            });
            closeModal('addAccountModal');
            cpToast('✅ Updated', `"${name}" updated.`, 'success');
            window.__editingAccountId = null;
            window.__resubmitMode = false;
        } else {
            payload.status = 'draft';
            await API.createAccount(payload);
            closeModal('addAccountModal');
            cpToast('✅ Created', `"${name}" added as draft.`, 'success');
        }
        
        await loadCompanyAccounts();
    } catch (err) {
        status('⚠ ' + err.message, 'error');
    }
}
async function viewAccountDetails(id) {
    try {
        const accounts = await API.getAccounts().catch(() => []);
        const acc = accounts.find(a => String(a.id) === String(id));
        if (!acc) { cpToast('Not Found', 'Account not found', 'error'); return; }

        const statusLabels = {
            'draft':           { label: 'Draft',           color: '#64748b', icon: '📝' },
            'pending':         { label: 'Pending Manager', color: '#d97706', icon: '🟡' },
            'pending-manager': { label: 'Pending Manager', color: '#d97706', icon: '🟡' },
            'pending-ceo':     { label: 'Pending CEO',     color: '#c2410c', icon: '🟠' },
            'approved':        { label: 'Approved',        color: '#16a34a', icon: '✅' },
            'rejected':        { label: 'Rejected',        color: '#dc2626', icon: '❌' }
        };
        const sInfo = statusLabels[acc.status] || statusLabels['draft'];

        let modal = document.getElementById('accountViewModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="accountViewModal">
                    <div class="modal-box" style="max-width:560px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                        <div style="background:linear-gradient(135deg,#14b8a6 0%,#0f766e 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                            <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">🏦 Account Details</h3>
                            <button onclick="closeModal('accountViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                        <div id="accountViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                        <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                            <button onclick="closeModal('accountViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                        </div>
                    </div>
                </div>
            `);
            modal = document.getElementById('accountViewModal');
        }

        document.getElementById('accountViewBody').innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${sInfo.color}20;border-radius:10px;border-left:4px solid ${sInfo.color};">
                <div style="font-size:12px;font-weight:700;color:${sInfo.color};text-transform:uppercase;">Status</div>
                <div style="font-size:14px;font-weight:800;color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
            </div>
            <div class="info-row"><span class="label">Account Name</span><span class="value">${esc(acc.name)}</span></div>
            <div class="info-row"><span class="label">Account Number</span><span class="value" style="font-family:monospace;">${esc(acc.accountNumber)}</span></div>
            <div class="info-row"><span class="label">Type</span><span class="value">${esc(acc.type || '—')}</span></div>
            ${acc.bankName ? `<div class="info-row"><span class="label">Bank</span><span class="value">${esc(acc.bankName)}</span></div>` : ''}
            ${acc.branch ? `<div class="info-row"><span class="label">Branch</span><span class="value">${esc(acc.branch)}</span></div>` : ''}
            <div class="info-row"><span class="label">Currency</span><span class="value">${esc(acc.currency || 'TZS')}</span></div>
            <div class="info-row"><span class="label">Balance</span><span class="value" style="font-weight:800;color:var(--primary-dark);">${acc.currency || 'TZS'} ${Number(acc.balance || 0).toLocaleString()}</span></div>
            <div class="info-row"><span class="label">Created By</span><span class="value">${esc(acc.requester?.fullName || acc.createdBy || '—')}</span></div>
            <div class="info-row"><span class="label">Created At</span><span class="value">${acc.createdAt ? new Date(acc.createdAt).toLocaleString() : '—'}</span></div>
            ${acc.notes ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid var(--primary);font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:var(--primary);font-size:11px;text-transform:uppercase;">Notes</strong>${esc(acc.notes)}</div>` : ''}
            ${acc.rejectionReason ? `<div style="margin-top:14px;padding:12px 16px;background:rgba(239,68,68,0.08);border-radius:8px;border-left:3px solid #ef4444;font-size:13px;color:#7f1d1d;line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#dc2626;font-size:11px;text-transform:uppercase;">Rejection Reason</strong>${esc(acc.rejectionReason)}</div>` : ''}
        `;

        modal.classList.add('show');
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}
async function loadEmployees() {
    const container = document.getElementById('employeesContainer');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400);">⏳ Loading...</div>';
    try {
        const employees = await API.getEmployees().catch(() => []);
        const safeEmployees = Array.isArray(employees) ? employees : [];
        const allStaff = safeEmployees.map(e => ({
            name: e.fullName, employeeId: e.employeeId, position: e.position,
            department: e.department, basicSalary: Number(e.basicSalary) || 0,
            allowances: Number(e.allowances) || 0, status: e.status
        }));
        const active = allStaff.filter(s => s.status === 'Active');
        const totalPayroll = active.reduce((sum, s) => sum + (s.basicSalary || 0) + (s.allowances || 0), 0);
        const avgSalary = active.length > 0 ? totalPayroll / active.length : 0;

        setText('totalEmployees', allStaff.length);
        setText('activeEmployees', active.length);
        setText('totalMonthlyPayroll', 'TSh ' + totalPayroll.toLocaleString());
        setText('avgSalary', 'TSh ' + Math.round(avgSalary).toLocaleString());
        setText('navEmployeesBadge', allStaff.length);

        if (allStaff.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">No employees found.</div>';
            return;
        }
        container.innerHTML = `<div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
            ${allStaff.map((emp, i) => `
                <div style="display:grid;grid-template-columns:40px 1.5fr 1.2fr 1fr 1fr 100px;gap:12px;padding:12px 18px;border-bottom:1px solid var(--gray-100);align-items:center;">
                    <span style="font-weight:800;color:var(--gold);">${String(i + 1).padStart(2, '0')}</span>
                    <div>
                        <div style="font-weight:700;font-size:13px;">${esc(emp.name)}</div>
                        <div style="font-family:monospace;font-size:11px;color:var(--primary);">${esc(emp.employeeId)}</div>
                    </div>
                    <span style="font-size:12px;">${esc(emp.position)}</span>
                    <span style="font-size:11px;color:var(--gray-600);">${esc(emp.department)}</span>
                    <span style="font-size:11px;font-weight:700;color:var(--primary);">${emp.basicSalary > 0 ? 'TSh ' + emp.basicSalary.toLocaleString() : '—'}</span>
                    <span style="font-size:9px;font-weight:800;padding:4px 8px;border-radius:12px;background:${emp.status === 'Active' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${emp.status === 'Active' ? 'var(--green)' : 'var(--red)'};text-align:center;">${esc(emp.status)}</span>
                </div>
            `).join('')}
        </div>`;
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}
function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-submenu a').forEach(a => a.classList.remove('active'));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');

    if (event && event.target) {
        const link = event.target.closest('.sidebar-submenu a');
        if (link) {
            link.classList.add('active');
            const submenu = link.closest('.sidebar-submenu');
            const parent = submenu?.previousElementSibling;
            if (parent && submenu) {
                document.querySelectorAll('.sidebar-nav-parent.open').forEach(el => {
                    if (el !== parent) {
                        el.classList.remove('open');
                        const sub = el.nextElementSibling;
                        if (sub) sub.classList.remove('open');
                    }
                });
                parent.classList.add('open');
                submenu.classList.add('open');
            }
        } else {
            closeAllSidebarDropdowns();
        }
    }

    // 🆕 Rekebisha mnyororo wa if/else if
    if (tabId === 'tab-dashboard') { loadFinanceDashboard(); loadDashboardOverview(); }
    else if (tabId === 'tab-all-orders') loadFinanceDashboard();
    else if (tabId === 'tab1') loadFinanceDashboard();
    else if (tabId === 'tab-awaiting') loadFinanceDashboard();
    else if (tabId === 'tab3') loadFinanceDashboard();
    else if (tabId === 'tab-receipts') loadReceipts();
    else if (tabId === 'tab-company-payments') loadCompanyPayments();
    else if (tabId === 'tab-accounts') loadCompanyAccounts();
    else if (tabId === 'tab-fund-transfer') loadFundTransfers();
    else if (tabId === 'tab-staff-payments') loadEmployees();
    else if (tabId === 'tab-payroll') { resetPayrollForm(); populatePayrollAccounts(); }
    else if (tabId === 'tab-reports') { setReportPreparedBy(); loadFinanceReport(); }
    else if (tabId === 'tab-payroll-history') loadPayrollHistory();
    else if (tabId === 'tab-resources') loadFinancialResources();
    else if (tabId === 'my-requests') { switchProcTab('my-req'); loadMyRequests(); } // Imerekebishwa
    else if (tabId === 'tab-my-budget') loadMyBudget(); 
    else if (tabId === 'tab-all-my-budgets') loadAllBudgetsPage();
    else if (tabId === 'tab-my-kpis') loadFinanceKpis();

    if (window.innerWidth <= 768) closeSidebar();
}
let allCompanyPayments = [];
let currentCPFilter = { search: '', status: '', type: '' };
let currentEditCPId = null;
let cpFormAttachments = [];

const CP_TYPES = {
    procurement: { icon: '🛒', label: 'Procurement' },
    salary:      { icon: '👥', label: 'Salary' },
    rent:        { icon: '🏢', label: 'Rent' },
    utilities:   { icon: '💡', label: 'Utilities' },
    transport:   { icon: '🚚', label: 'Transport' },
    marketing:   { icon: '📊', label: 'Marketing' },
    maintenance: { icon: '🔧', label: 'Maintenance' },
    other:       { icon: '📝', label: 'Other' }
};
async function viewFinanceRequestWithPermit(id) {
    try {
        const request = await API.getProcurementRequestById(id);
        if (!request) return cpToast('Error', 'Request not found', 'error');

        // Fungua Modal ya ku-view details
        openProcurementViewModal(request);

        // Ongeza Kitufe cha PDF Permit kama ipo
        if (request.imprest_number) {
            setTimeout(() => {
                const footer = document.querySelector('#procurementModal .modern-modal-footer');
                const existingBtn = document.getElementById('btnViewPermit');
                
                if (footer && !existingBtn) {
                    const btn = document.createElement('a');
                    // Hapa tunadhani una API ya kupata PDF ya permit
                    btn.href = `${CONFIG.API_URL}/imprests/${request.imprest_id}/pdf`; 
                    btn.target = '_blank';
                    btn.id = 'btnViewPermit';
                    btn.innerHTML = '📄 View Permit (PDF)';
                    btn.style.cssText = 'padding: 10px 24px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border-radius: 8px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-right: auto;';
                    footer.prepend(btn);
                }
            }, 200);
        }
    } catch (err) {
        cpToast('Error', err.message, 'error');
    }
}
const CP_STATUS = {
    'draft':           { icon: '📝', label: 'Draft',           color: '#64748b' },
    'pending-manager': { icon: '🟡', label: 'Pending Manager', color: '#d97706' },
    'pending-ceo':     { icon: '🟠', label: 'Pending CEO',     color: '#c2410c' },
    'approved':        { icon: '🟢', label: 'Approved',        color: '#0f766e' },
    'paid':            { icon: '✅', label: 'Paid',            color: '#16a34a' },
    'rejected':        { icon: '❌', label: 'Rejected',        color: '#dc2626' }
};

async function loadCompanyPayments() {
    const container = document.getElementById('companyPaymentsContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading payments...</div>';

    try {
        // 🆕 Tumia API pekee (sio localStorage)
        const payments = await API.getCompanyPayments().catch(() => []);
        allCompanyPayments = Array.isArray(payments) ? payments : [];
        allCompanyPayments.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        renderCompanyPaymentStats();
        renderCompanyPaymentsList();

        setText('navCompanyPaymentsBadge', allCompanyPayments.length);

    } catch (err) {
        console.error('Load company payments error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

function renderCompanyPaymentStats() {
    const dr = allCompanyPayments.filter(p => p.status === 'draft');
    const pm = allCompanyPayments.filter(p => p.status === 'pending-manager');
    const pc = allCompanyPayments.filter(p => p.status === 'pending-ceo');
    const ap = allCompanyPayments.filter(p => p.status === 'approved');

    const now = new Date();
    const paidMonth = allCompanyPayments.filter(p => {
        if (p.status !== 'paid' || !p.paidAt) return false;
        const d = new Date(p.paidAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const sum = arr => arr.reduce((s, p) => s + Number(p.amount || 0), 0);
    const fmt = n => 'TSh ' + Number(n).toLocaleString();

    setText('cpStatDraft', fmt(sum(dr)));
    setText('cpCountDraft', dr.length + ' payment' + (dr.length === 1 ? '' : 's'));
    setText('cpStatPendingManager', fmt(sum(pm)));
    setText('cpCountPendingManager', pm.length + ' payment' + (pm.length === 1 ? '' : 's'));
    setText('cpStatPendingCeo', fmt(sum(pc)));
    setText('cpCountPendingCeo', pc.length + ' payment' + (pc.length === 1 ? '' : 's'));
    setText('cpStatApproved', fmt(sum(ap)));
    setText('cpCountApproved', ap.length + ' payment' + (ap.length === 1 ? '' : 's'));
    setText('cpStatPaidMonth', fmt(sum(paidMonth)));
    setText('cpCountPaidMonth', paidMonth.length + ' payment' + (paidMonth.length === 1 ? '' : 's'));
    setText('cpCountBadge', allCompanyPayments.length);
}

function filterCompanyPayments() {
    currentCPFilter.search = (document.getElementById('companyPaymentSearch')?.value || '').toLowerCase().trim();
    currentCPFilter.status = document.getElementById('companyPaymentStatusFilter')?.value || '';
    currentCPFilter.type = document.getElementById('companyPaymentTypeFilter')?.value || '';
    renderCompanyPaymentsList();
}

function renderCompanyPaymentsList() {
    const container = document.getElementById('companyPaymentsContainer');
    if (!container) return;

    let filtered = allCompanyPayments;
    if (currentCPFilter.search) {
        const s = currentCPFilter.search;
        filtered = filtered.filter(p =>
            (p.reference || '').toLowerCase().includes(s) ||
            (p.vendor || '').toLowerCase().includes(s) ||
            (p.description || '').toLowerCase().includes(s)
        );
    }
    if (currentCPFilter.status) {
        filtered = filtered.filter(p => p.status === currentCPFilter.status);
    }
    if (currentCPFilter.type) {
        filtered = filtered.filter(p => p.type === currentCPFilter.type);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;opacity:0.5;">💸</span>
                <div style="font-size:17px;font-weight:800;color:var(--gray-600);margin-bottom:6px;">
                    ${allCompanyPayments.length === 0 ? 'No Company Payments Yet' : 'No Payments Match Your Filters'}
                </div>
                <div style="font-size:13px;">
                    ${allCompanyPayments.length === 0
                        ? 'Click "➕ Add Payment" to record your first expense.'
                        : 'Try adjusting your search or filter.'}
                </div>
            </div>
        `;
        return;
    }

    const userRole = (currentUser?.role || '').toLowerCase();
    const isFinance = userRole.includes('finance');
    const isManager = userRole.includes('manager');
    const isCeo = userRole.includes('ceo') || userRole.includes('superadmin');

    container.innerHTML = filtered.map(p => {
        const typeInfo = CP_TYPES[p.type] || CP_TYPES.other;
        const statusInfo = CP_STATUS[p.status] || CP_STATUS['draft'];
        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        let actions = `<button class="cp-btn-view" onclick="viewCompanyPayment('${p.id}')">👁 View</button>`;

        if (p.status === 'draft' && isFinance) {
            actions += `<button class="cp-btn-edit" onclick="openEditCompanyPaymentModal('${p.id}')">🖋️ Edit</button>`;
            actions += `<button class="cp-btn-send" onclick="sendCompanyPaymentToManager('${p.id}')">📤 Send to Manager</button>`;
            actions += `<button class="cp-btn-reject" onclick="deleteDraftPayment('${p.id}')">🗑️ Delete</button>`;
        }
        if (p.status === 'rejected' && isFinance) {
            actions += `<button class="cp-btn-edit" onclick="openEditCompanyPaymentModal('${p.id}')">🖋️ Edit & Resubmit</button>`;
            actions += `<button class="cp-btn-send" onclick="resubmitRejectedPayment('${p.id}')">📤 Resubmit to Manager</button>`;
        }
        if (p.status === 'pending-manager' && isManager) {
            actions += `<button class="cp-btn-verify" onclick="managerVerifyPayment('${p.id}')">✅ Verify</button>`;
            actions += `<button class="cp-btn-reject" onclick="rejectCompanyPayment('${p.id}')">❌ Reject</button>`;
        }
        if (p.status === 'pending-ceo' && isCeo) {
            actions += `<button class="cp-btn-approve" onclick="ceoApprovePayment('${p.id}')">✅ Approve</button>`;
            actions += `<button class="cp-btn-reject" onclick="rejectCompanyPayment('${p.id}')">❌ Reject</button>`;
        }
        if (p.status === 'approved' && isFinance) {
            actions += `<button class="cp-btn-pay" onclick="markCompanyPaymentPaid('${p.id}')">💰 Mark as Paid</button>`;
        }
        if (p.status === 'paid') {
            actions += `<button class="cp-btn-print" onclick="viewCompanyPaymentVoucher('${p.id}')">🧾 View Voucher</button>`;
        }

        return `
            <div class="cp-card status-${p.status}">
                <div class="cp-card-header">
                    <div style="flex:1;min-width:220px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                            <span class="cp-ref">${esc(p.reference || '—')}</span>
                            <span class="cp-badge type">${typeInfo.icon} ${typeInfo.label}</span>
                            <span class="cp-badge status-${p.status}">${statusInfo.icon} ${statusInfo.label}</span>
                        </div>
                        <div class="cp-vendor">${esc(p.vendor || '—')}</div>
                        ${p.description ? `<div class="cp-desc">${esc(p.description)}</div>` : ''}
                        <div class="cp-meta">
                            <span>📅 Created: <strong>${createdDate}</strong></span>
                            ${p.dueDate ? `<span>⏰ Due: <strong>${new Date(p.dueDate).toLocaleDateString('en-GB')}</strong></span>` : ''}
                            <span>👤 By: <strong>${esc(p.createdBy || '—')}</strong></span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div class="cp-amount">TSh ${Number(p.amount || 0).toLocaleString()}</div>
                    </div>
                </div>

                ${renderCPTimeline(p)}

                ${p.attachments && p.attachments.length > 0 ? `
                    <div class="cp-card-attachments">
                        ${p.attachments.map((att, i) => {
                            const isImg = att.type.startsWith('image/');
                            return `
                                <div class="cp-card-attach-thumb" title="${esc(att.name)}"
                                     onclick="${isImg ? `previewCPImage('${att.data}')` : `viewCPAttachmentFromCard('${p.id}', ${i})`}">
                                    ${isImg
                                        ? `<img src="${att.data}">`
                                        : `<div class="file-icon">📄</div>`
                                    }
                                </div>
                            `;
                        }).join('')}
                        <div style="font-size:11px;color:var(--gray-500);align-self:center;margin-left:6px;font-weight:600;">
                            📎 ${p.attachments.length} file${p.attachments.length === 1 ? '' : 's'}
                        </div>
                    </div>
                ` : ''}

                <div class="cp-actions">${actions}</div>
            </div>
        `;
    }).join('');
}

function renderCPTimeline(p) {
    const steps = [];

    steps.push({
        done: true, icon: '📝',
        label: 'Created by Finance',
        meta: `${p.createdBy || '—'} • ${p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}`
    });

    if (p.status === 'draft') {
        steps.push({ current: true, icon: '🖋️', label: 'Draft — Not Yet Sent', meta: 'You can still edit this payment' });
        return wrapTimeline(steps);
    }

    if (p.sentToManagerAt) {
        steps.push({ done: true, icon: '📤', label: 'Sent to Manager', meta: `${p.sentToManagerBy || '—'} • ${new Date(p.sentToManagerAt).toLocaleString()}` });
    }

    if (p.status === 'pending-manager') {
        steps.push({ current: true, icon: '⏳', label: 'Awaiting Manager Verification', meta: 'Pending review' });
    } else if (p.managerVerifiedAt) {
        steps.push({ done: true, icon: '✅', label: 'Verified by Manager', meta: `${p.managerVerifiedBy || '—'} • ${new Date(p.managerVerifiedAt).toLocaleString()}` });
    } else if (p.status === 'rejected' && p.rejectedBy === 'Manager') {
        steps.push({ rejected: true, icon: '❌', label: 'Rejected by Manager', meta: `${p.rejectedAt ? new Date(p.rejectedAt).toLocaleString() : ''} • ${p.rejectionReason || ''}` });
    }

    if (p.status === 'pending-ceo') {
        steps.push({ current: true, icon: '⏳', label: 'Awaiting CEO Approval', meta: 'Pending review' });
    } else if (p.ceoApprovedAt) {
        steps.push({ done: true, icon: '✅', label: 'Approved by CEO', meta: `${p.ceoApprovedBy || '—'} • ${new Date(p.ceoApprovedAt).toLocaleString()}` });
    } else if (p.status === 'rejected' && p.rejectedBy === 'CEO') {
        steps.push({ rejected: true, icon: '❌', label: 'Rejected by CEO', meta: `${p.rejectedAt ? new Date(p.rejectedAt).toLocaleString() : ''} • ${p.rejectionReason || ''}` });
    }

    if (p.status === 'paid' && p.paidAt) {
        steps.push({ done: true, icon: '💰', label: 'Payment Completed', meta: `${p.paidBy || '—'} • ${new Date(p.paidAt).toLocaleString()}` });
    } else if (p.status === 'approved') {
        steps.push({ current: true, icon: '⏳', label: 'Awaiting Payment', meta: 'Ready to pay' });
    }

    return wrapTimeline(steps);
}

function wrapTimeline(steps) {
    return `
        <div class="cp-timeline">
            <div class="cp-timeline-title">📊 Approval Timeline</div>
            ${steps.map(s => `
                <div class="cp-timeline-step">
                    <div class="cp-timeline-dot ${s.done ? 'done' : s.current ? 'current' : s.rejected ? 'rejected' : ''}">${s.icon}</div>
                    <div class="cp-timeline-info">
                        <div class="cp-timeline-label">${s.label}</div>
                        <div class="cp-timeline-meta">${s.meta}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function persistCompanyPayment(payment) {
    try {
        // 1. Jaribu API kwanza
        const existing = allCompanyPayments.find(p => String(p.id) === String(payment.id));
        
        if (existing && existing.id && !String(existing.id).startsWith('cp_')) {
            // Update existing
            await API.updateCompanyPayment(payment.id, payment);
            console.log('✅ Payment updated via API');
            return;
        } else {
            // Create new
            const result = await API.createCompanyPayment(payment);
            console.log('✅ Payment created via API:', result.id);
            
            // Update payment.id na result.id
            if (result && result.id) {
                payment.id = result.id;
            }
            return;
        }
    } catch (e) {
        console.warn('⚠️ API failed, using localStorage:', e.message);
    }

    // Fallback: localStorage (kama API inashindwa)
    let list = JSON.parse(localStorage.getItem('makdc_company_payments') || '[]');
    const idx = list.findIndex(x => String(x.id) === String(payment.id));
    if (idx >= 0) list[idx] = payment;
    else list.push(payment);
    localStorage.setItem('makdc_company_payments', JSON.stringify(list));
    console.log('💾 Payment saved to localStorage (fallback)');
}

function openAddCompanyPaymentModal() {
    currentEditCPId = null;
    cpFormAttachments = [];
    showCompanyPaymentForm('Add Company Payment', {});
}

function openEditCompanyPaymentModal(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) {
        cpToast('Not Found', 'Payment record not found', 'error');
        return;
    }
    if (p.status !== 'draft' && p.status !== 'rejected') {
        cpToast(
            'Cannot Edit',
            'Payment can only be edited while in DRAFT or REJECTED. Once sent to Manager, it cannot be changed.',
            'warning'
        );
        return;
    }
    currentEditCPId = id;
    cpFormAttachments = Array.isArray(p.attachments) ? [...p.attachments] : [];
    const title = p.status === 'rejected' ? 'Edit & Resubmit Payment' : 'Edit Company Payment';
    showCompanyPaymentForm(title, p);
}

async function showCompanyPaymentForm(title, data) {
    let modal = document.getElementById('companyPaymentFormModal');
    if (!modal) {
        const html = `
            <div class="modal-overlay" id="companyPaymentFormModal">
                <div class="modal-box" style="max-width:640px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#134e4a 0%,#0f766e 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">💸</div>
                            <div>
                                <h3 id="cpFormTitle" style="font-size:18px;font-weight:800;color:white;margin:0 0 2px 0;">Add Company Payment</h3>
                                <p style="font-size:12px;color:rgba(255,255,255,0.8);margin:0;">Record outgoing expense</p>
                            </div>
                        </div>
                        <button onclick="closeModal('companyPaymentFormModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:22px 26px;overflow-y:auto;flex:1;">
                        <div class="cp-form-row">
                            <div class="cp-form-group">
                                <label>Payment Type <span class="req">*</span></label>
                                <select id="cpFormType">
                                    <option value="">— Select Type —</option>
                                    ${Object.entries(CP_TYPES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
                                </select>
                            </div>
                            <div class="cp-form-group">
                                <label>Reference No. <span class="req">*</span></label>
                                <input type="text" id="cpFormReference" placeholder="e.g., PAY-2026-001">
                            </div>
                        </div>

                        <div class="cp-form-row">
                            <div class="cp-form-group">
                                <label>Vendor / Payee <span class="req">*</span></label>
                                <input type="text" id="cpFormVendor" placeholder="e.g., Tanzania Cement Ltd">
                            </div>
                            <div class="cp-form-group">
                                <label>Amount (TSh) <span class="req">*</span></label>
                                <input type="number" id="cpFormAmount" placeholder="0" min="0">
                            </div>
                        </div>

                       <div class="cp-form-group">
                            <label>💸 Operations Account <span class="req">*</span></label>
                            <select id="cpFormAccount" onchange="updateCPBalance()">
                                <option value="">— Select Operations Account —</option>
                            </select>
                            <small style="font-size:11px;color:var(--gray-500);margin-top:4px;display:block;">Malipo yanatoka kwenye account hii (Operations pekee)</small>
                        </div>

                        <!-- 🆕 BALANCE DISPLAY -->
                        <div id="cpBalanceBox" style="display:none;margin-bottom:14px;padding:12px 16px;background:linear-gradient(135deg,rgba(15,118,110,0.06),rgba(20,184,166,0.02));border:1.5px solid rgba(15,118,110,0.15);border-left:4px solid #0f766e;border-radius:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <div style="font-size:9px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:3px;">💰 Available Balance</div>
                                    <div style="font-size:18px;font-weight:900;color:#0f766e;font-family:'Courier New',monospace;" id="cpBalanceValue">TSh 0</div>
                                </div>
                                <div id="cpBalanceWarning" style="display:none;padding:6px 12px;background:rgba(220,38,38,0.1);border:1.5px solid rgba(220,38,38,0.3);border-radius:8px;font-size:11px;font-weight:800;color:#dc2626;">
                                    ⚠️ INSUFFICIENT
                                </div>
                                <div id="cpBalanceOk" style="display:none;padding:6px 12px;background:rgba(34,197,94,0.1);border:1.5px solid rgba(34,197,94,0.3);border-radius:8px;font-size:11px;font-weight:800;color:#16a34a;">
                                    ✅ OK
                                </div>
                            </div>
                        </div>

                        <div class="cp-form-row">
                            <div class="cp-form-group">
                                <label>Due Date</label>
                                <input type="date" id="cpFormDueDate">
                            </div>
                            <div class="cp-form-group">
                                <label>Payment Method</label>
                                <select id="cpFormMethod">
                                    <option value="">— Select —</option>
                                    <option value="bank">🏦 Bank Transfer</option>
                                    <option value="mobile">📱 Mobile Money</option>
                                    <option value="cash">💵 Cash</option>
                                    <option value="cheque">📄 Cheque</option>
                                </select>
                            </div>
                        </div>

                        <div class="cp-form-group">
                            <label>Description / Purpose</label>
                            <textarea id="cpFormDescription" placeholder="What is this payment for?"></textarea>
                        </div>

                        <div class="cp-form-group">
                            <label>📎 Attachments (Invoice / Receipt)</label>
                            <div class="cp-attach-area" id="cpAttachArea"
                                 onclick="document.getElementById('cpAttachInput').click()"
                                 ondragover="event.preventDefault(); this.classList.add('dragover');"
                                 ondragleave="this.classList.remove('dragover');"
                                 ondrop="event.preventDefault(); this.classList.remove('dragover'); handleCPAttachDrop(event);">
                                <span class="cp-attach-icon">📎</span>
                                <div class="cp-attach-text">Click or drag files here</div>
                                <div class="cp-attach-hint">PDF, JPG, PNG — max 5MB each (max 5 files)</div>
                                <input type="file" id="cpAttachInput" accept="image/*,application/pdf"
                                       multiple style="display:none" onchange="handleCPAttachFiles(event.target.files)">
                            </div>
                            <div class="cp-attach-list" id="cpAttachList"></div>
                        </div>

                        <div id="cpFormStatus" class="status-msg"></div>
                    </div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
                        <button onclick="closeModal('companyPaymentFormModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                        <button onclick="saveCompanyPayment()" style="padding:11px 24px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">💾 Save Payment</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    document.getElementById('cpFormTitle').textContent = title;
    document.getElementById('cpFormType').value = data.type || '';
    document.getElementById('cpFormReference').value = data.reference || generateCPReference();
    document.getElementById('cpFormVendor').value = data.vendor || '';
    document.getElementById('cpFormAmount').value = data.amount || '';
    document.getElementById('cpFormDueDate').value = data.dueDate || '';
    document.getElementById('cpFormMethod').value = data.method || '';
    document.getElementById('cpFormDescription').value = data.description || '';
    document.getElementById('cpFormStatus').className = 'status-msg';
    document.getElementById('cpFormStatus').textContent = '';

    renderCPFormAttachments();
    const amountInput = document.getElementById('cpFormAmount');
    if (amountInput) {
        amountInput.addEventListener('input', updateCPBalance);
    }
    const accountSelect = document.getElementById('cpFormAccount');
    if (accountSelect) {
        const opsAccounts = await getOperationsAccounts();
        accountSelect.innerHTML = '<option value="">— Select Operations Account —</option>';
        
        if (opsAccounts.length > 0) {
            opsAccounts.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.id;
                const icon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';
                opt.textContent = `${icon} ${acc.name} — ${acc.currency} ${Number(acc.balance || 0).toLocaleString()}`;
                opt.dataset.balance = acc.balance || 0;
                opt.dataset.currency = acc.currency || 'TZS';
                opt.dataset.name = acc.name;
                if (data && data.accountId && parseInt(data.accountId) === acc.id) opt.selected = true;
                accountSelect.appendChild(opt);
            });
        } else {
            accountSelect.innerHTML = '<option value="">⚠ No operations account available</option>';
        }
    }

    document.getElementById('companyPaymentFormModal').classList.add('show');
}

function generateCPReference() {
    const year = new Date().getFullYear();
    const count = allCompanyPayments.length + 1;
    return `PAY-${year}-${String(count).padStart(3, '0')}`;
}
async function saveCompanyPayment() {
    const statusDiv = document.getElementById('cpFormStatus');
    const status = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
    };

    const type = document.getElementById('cpFormType').value;
    const reference = document.getElementById('cpFormReference').value.trim();
    const vendor = document.getElementById('cpFormVendor').value.trim();
    const amount = parseFloat(document.getElementById('cpFormAmount').value) || 0;
    const dueDate = document.getElementById('cpFormDueDate').value || null;
    const method = document.getElementById('cpFormMethod').value || null;
    const description = document.getElementById('cpFormDescription').value.trim();
    const accountId = document.getElementById('cpFormAccount')?.value || null;

    if (!type) return status('⚠ Please select a payment type');
    if (!reference) return status('⚠ Reference number is required');
    if (!vendor) return status('⚠ Vendor name is required');
    if (amount <= 0) return status('⚠ Amount must be greater than 0');
    if (!accountId) return status('⚠ Please select an operations account');

    const opsAccounts = await getOperationsAccounts();
    const selectedAccount = opsAccounts.find(a => String(a.id) === String(accountId));

    if (!selectedAccount) {
        return status('⚠ Selected account not found');
    }

    const balance = Number(selectedAccount.balance || 0);

    if (amount > balance) {
        const shortage = amount - balance;
        return status(`⚠ Insufficient balance. Available: ${formatBalance(balance, selectedAccount.currency)}. Shortage: ${formatBalance(shortage, selectedAccount.currency)}`);
    }

    const existing = currentEditCPId ? allCompanyPayments.find(p => String(p.id) === String(currentEditCPId)) : null;

    const payment = {
        id: currentEditCPId || undefined,
        type, reference, vendor, amount,
        dueDate, method, description,
        accountId: accountId ? parseInt(accountId) : null,
        attachments: cpFormAttachments,
        status: existing?.status === 'rejected' ? 'pending-manager' : (existing ? existing.status : 'draft'),
        createdBy: currentUser?.fullName || 'Finance Officer'
    };

    try {
        await persistCompanyPayment(payment);
        closeModal('companyPaymentFormModal');
        if (currentEditCPId) {
            cpToast('✅ Updated', `Payment ${payment.reference} has been updated.`, 'success');
        } else {
            cpToast('📝 Draft Created', `Draft ${payment.reference} created. You can edit or send it to the Manager.`, 'success');
        }
        await loadCompanyPayments();
    } catch (err) {
        status('⚠ ' + err.message, 'error');
    }
}
async function sendCompanyPaymentToManager(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;
    if (p.status !== 'draft') {
        cpToast('Cannot Send', 'Only draft payments can be sent to Manager.', 'warning');
        return;
    }

    const res = await cpConfirm({
        title: '📤 Send to Manager?',
        message: `Payment ${p.reference} of TSh ${Number(p.amount).toLocaleString()} will be sent to Manager for verification.`,
        detail: {
            label: 'Reference • Amount',
            value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}`
        },
        warn: '⚠️ <strong>Important:</strong> Once sent, you cannot edit this payment. It will be locked until Manager or CEO makes a decision.',
        type: 'primary',
        okText: '📤 Send Now',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    p.status = 'pending-manager';
    p.sentToManagerAt = new Date().toISOString();
    p.sentToManagerBy = currentUser?.fullName || 'Finance Officer';

    try {
        await persistCompanyPayment(p);
        cpToast('📤 Sent to Manager', `Payment ${p.reference} has been sent to Manager for verification.`, 'success');
        await loadCompanyPayments();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function resubmitRejectedPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;
    if (p.status !== 'rejected') {
        cpToast('Cannot Resubmit', 'Only rejected payments can be resubmitted.', 'warning');
        return;
    }

    const res = await cpConfirm({
        title: '📤 Resubmit to Manager?',
        message: `Payment ${p.reference} (TSh ${Number(p.amount).toLocaleString()}) will be resubmitted to Manager for verification.`,
        detail: {
            label: 'Reference • Amount',
            value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}`
        },
        warn: '⚠️ <strong>Important:</strong> After resubmitting, you cannot edit this payment. It will start the approval process again.',
        type: 'primary',
        okText: '📤 Resubmit Now',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    p.status = 'pending-manager';
    p.sentToManagerAt = new Date().toISOString();
    p.sentToManagerBy = currentUser?.fullName || 'Finance Officer';
    p.rejectedAt = null;
    p.rejectedBy = null;
    p.rejectionReason = null;
    p.managerVerifiedAt = null;
    p.managerVerifiedBy = null;
    p.ceoApprovedAt = null;
    p.ceoApprovedBy = null;

    try {
        await persistCompanyPayment(p);
        cpToast('📤 Resubmitted', `Payment ${p.reference} has been resubmitted to Manager.`, 'success');
        await loadCompanyPayments();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}
// 🆕 Pata Operations Accounts PEKEE (na balance)
async function getOperationsAccounts() {
    try {
        const accounts = await API.getApprovedAccounts().catch(() => []);
        return (accounts || []).filter(a => a.purpose === 'operations');
    } catch (err) {
        console.error('Error fetching operations accounts:', err);
        return [];
    }
}

// 🆕 Pata Collections Accounts PEKEE (na balance)
async function getCollectionsAccounts() {
    try {
        const accounts = await API.getApprovedAccounts().catch(() => []);
        return (accounts || []).filter(a => a.purpose === 'collections');
    } catch (err) {
        console.error('Error fetching collections accounts:', err);
        return [];
    }
}

// 🆕 Format balance vizuri
function formatBalance(amount, currency = 'TZS') {
    return `${currency} ${Number(amount || 0).toLocaleString()}`;
}
// 🆕 Populate Payroll Account Selector
async function populatePayrollAccounts() {
    const select = document.getElementById('payrollAccount');
    if (!select) return;

    try {
        const opsAccounts = await getOperationsAccounts();
        select.innerHTML = '<option value="">— Select Operations Account —</option>';

        if (opsAccounts.length === 0) {
            select.innerHTML = '<option value="">⚠ No operations account available</option>';
            return;
        }

        opsAccounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id;
            const icon = acc.type === 'Bank' ? '🏦' : acc.type === 'Mobile Money' ? '📱' : '💵';
            opt.textContent = `${icon} ${acc.name} — ${acc.currency} ${Number(acc.balance || 0).toLocaleString()}`;
            opt.dataset.balance = acc.balance || 0;
            opt.dataset.currency = acc.currency || 'TZS';
            opt.dataset.name = acc.name;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('populatePayrollAccounts error:', err);
    }
}

// 🆕 Update Payroll Balance Display
function updatePayrollBalance() {
    const select = document.getElementById('payrollAccount');
    const box = document.getElementById('payrollBalanceBox');
    const valueEl = document.getElementById('payrollBalanceValue');
    const nameEl = document.getElementById('payrollAccountName');

    if (!select || !box) return;

    const selectedOpt = select.options[select.selectedIndex];
    if (!selectedOpt || !selectedOpt.value) {
        box.style.display = 'none';
        return;
    }

    const balance = Number(selectedOpt.dataset.balance || 0);
    const currency = selectedOpt.dataset.currency || 'TZS';
    const name = selectedOpt.dataset.name || '—';

    valueEl.textContent = formatBalance(balance, currency);
    nameEl.textContent = name;
    box.style.display = 'block';
}
async function deleteDraftPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;
    if (p.status !== 'draft') {
        cpToast('Cannot Delete', 'Only draft payments can be deleted.', 'warning');
        return;
    }

    const res = await cpConfirm({
        title: '🗑️ Delete Draft?',
        message: `Are you sure you want to delete draft payment "${p.reference}"? This cannot be undone.`,
        detail: {
            label: 'Reference • Amount',
            value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}`
        },
        warn: '⚠️ <strong>Warning:</strong> Once deleted, this draft cannot be recovered.',
        type: 'danger',
        okText: '🗑️ Delete Permanently',
        cancelText: 'Keep it'
    });

    if (!res.confirmed) return;

    try {
        if (typeof API.deleteCompanyPayment === 'function') {
            await API.deleteCompanyPayment(id).catch(() => {});
        }
        let list = JSON.parse(localStorage.getItem('makdc_company_payments') || '[]');
        list = list.filter(x => String(x.id) !== String(id));
        localStorage.setItem('makdc_company_payments', JSON.stringify(list));

        cpToast('🗑️ Draft Deleted', `Draft ${p.reference} has been deleted.`, 'info');
        await loadCompanyPayments();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

function viewCompanyPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) { cpToast('Not Found', 'Payment not found.', 'error'); return; }

    const typeInfo = CP_TYPES[p.type] || CP_TYPES.other;
    const statusInfo = CP_STATUS[p.status] || CP_STATUS['draft'];

    let modal = document.getElementById('cpViewModal');
    if (!modal) {
        const html = `
            <div class="modal-overlay" id="cpViewModal">
                <div class="modal-box" style="max-width:560px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#134e4a 0%,#0f766e 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">💸 Payment Details</h3>
                        <button onclick="closeModal('cpViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="cpViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;">
                        <button onclick="closeModal('cpViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    document.getElementById('cpViewBody').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${statusInfo.color}20;border-radius:10px;border-left:4px solid ${statusInfo.color};">
            <div style="font-size:12px;font-weight:700;color:${statusInfo.color};text-transform:uppercase;">Status</div>
            <div style="font-size:14px;font-weight:800;color:${statusInfo.color};">${statusInfo.icon} ${statusInfo.label}</div>
        </div>

        <div class="info-row"><span class="label">Reference</span><span class="value" style="font-family:monospace;color:var(--primary);">${esc(p.reference)}</span></div>
        <div class="info-row"><span class="label">Type</span><span class="value">${typeInfo.icon} ${typeInfo.label}</span></div>
        <div class="info-row"><span class="label">Vendor</span><span class="value">${esc(p.vendor || '—')}</span></div>
        <div class="info-row"><span class="label">Amount</span><span class="value" style="color:var(--primary-dark);font-weight:900;">TSh ${Number(p.amount || 0).toLocaleString()}</span></div>
        <div class="info-row"><span class="label">Due Date</span><span class="value">${p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-GB') : '—'}</span></div>
        <div class="info-row"><span class="label">Method</span><span class="value">${esc(p.method || '—')}</span></div>
        <div class="info-row"><span class="label">Created By</span><span class="value">${esc(p.createdBy || '—')}</span></div>
        <div class="info-row"><span class="label">Created At</span><span class="value">${p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}</span></div>
        ${p.description ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid var(--primary);font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:var(--primary);font-size:11px;text-transform:uppercase;">Description</strong>${esc(p.description)}</div>` : ''}
        ${p.rejectionReason ? `<div style="margin-top:14px;padding:12px 16px;background:rgba(239,68,68,0.08);border-radius:8px;border-left:3px solid #ef4444;font-size:13px;color:#7f1d1d;line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#dc2626;font-size:11px;text-transform:uppercase;">Rejection Reason</strong>${esc(p.rejectionReason)}</div>` : ''}

        ${p.attachments && p.attachments.length > 0 ? `
            <div style="margin-top:16px;">
                <div style="font-size:11px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;">📎 Attachments</div>
                <div class="cp-attach-list">
                    ${p.attachments.map((att, i) => {
                        const isImg = att.type.startsWith('image/');
                        return `
                            <div class="cp-attach-item" title="${esc(att.name)}">
                                ${isImg
                                    ? `<img src="${att.data}" onclick="previewCPImage('${att.data}')" style="cursor:zoom-in;">`
                                    : `<div class="cp-attach-file-icon" onclick="downloadCPAttachmentFromView('${p.id}', ${i})" style="cursor:pointer;">📄</div>`
                                }
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}

        <div style="margin-top:20px;">
            <div style="font-size:11px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">📊 Approval Timeline</div>
            ${renderCPTimeline(p)}
        </div>
    `;

    document.getElementById('cpViewModal').classList.add('show');
}

function downloadCPAttachmentFromView(paymentId, attIndex) {
    const p = allCompanyPayments.find(x => String(x.id) === String(paymentId));
    if (!p || !p.attachments || !p.attachments[attIndex]) return;
    const att = p.attachments[attIndex];
    const a = document.createElement('a');
    a.href = att.data;
    a.download = att.name;
    a.click();
}

async function managerVerifyPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await cpConfirm({
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
        await persistCompanyPayment(p);
        cpToast('✅ Verified', `Payment ${p.reference} verified and sent to CEO.`, 'success');
        await loadCompanyPayments();
    } catch (err) { cpToast('Failed', err.message, 'error'); }
}

async function ceoApprovePayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await cpConfirm({
        title: '✅ Approve Payment?',
        message: `Approve payment "${p.reference}" (TSh ${Number(p.amount).toLocaleString()})? Finance will be notified to process payment.`,
        detail: {
            label: 'Reference • Amount',
            value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}`
        },
        type: 'success',
        okText: '✅ Approve',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    p.status = 'approved';
    p.ceoApprovedAt = new Date().toISOString();
    p.ceoApprovedBy = currentUser?.fullName || 'CEO';

    try {
        await persistCompanyPayment(p);
        cpToast('✅ Approved', `Payment ${p.reference} approved. Finance notified.`, 'success');
        await loadCompanyPayments();
    } catch (err) { cpToast('Failed', err.message, 'error'); }
}
async function markCompanyPaymentPaid(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await cpConfirm({
        title: '💰 Mark as Paid?',
        message: `Confirm that payment "${p.reference}" (TSh ${Number(p.amount).toLocaleString()}) has been completed.`,
        detail: {
            label: 'Reference • Amount',
            value: `${p.reference} • TSh ${Number(p.amount).toLocaleString()}`
        },
        warn: '⚠️ <strong>Confirm:</strong> Fedha zitakatwa kwenye akaunti husika na Request itabadilika kuwa Imelipwa.',
        type: 'success',
        okText: '💰 Yes, Mark as Paid',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    p.status = 'paid';
    p.paidAt = new Date().toISOString();
    p.paidBy = currentUser?.fullName || 'Finance Officer';

    try {
        // 1. Hifadhi Company Payment kama 'paid'
        await persistCompanyPayment(p);

        // 2. 🆕 Punguza Fedha kwenye ACCOUNT (Sio Resource)
        if (p.accountId) {
            try {
                // Tunatumia API.updateAccount kuweka balance mpya
                const accounts = await API.getAccounts().catch(() => []);
                const selectedAccount = accounts.find(a => String(a.id) === String(p.accountId));
                
                if (selectedAccount) {
                    const currentBalance = Number(selectedAccount.balance || 0);
                    const newBalance = currentBalance - Number(p.amount);
                    
                    await API.updateAccount(p.accountId, {
                        balance: newBalance
                    });
                    console.log('✅ Fedha zimekatwa kwenye account:', p.accountId);
                }
            } catch (accErr) {
                console.warn('⚠️ Imeshindwa kukata fedha kwenye account:', accErr.message);
            }
        }

        // 3. 🆕 Sasisha Procurement Request husika kuwa 'paid'
        if (p.procurementRequestId) {
            await API.updateProcurementStatus(p.procurementRequestId, { status: 'paid' });
            console.log('✅ Procurement Request imebadilishwa kuwa paid:', p.procurementRequestId);
        }

        cpToast('💰 Payment Completed', `Payment ${p.reference} marked as paid. Fedha zimekatwa na Request imekamilika.`, 'success');
        
        // 4. Refresh data zote
        await loadCompanyPayments();
        if (typeof loadFinancialResources === 'function') await loadFinancialResources();
        
    } catch (err) { 
        cpToast('Failed', err.message, 'error'); 
    }
}
async function rejectCompanyPayment(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    const res = await cpConfirm({
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

    const rejectedByRole = (currentUser?.role || '').toLowerCase().includes('ceo') ? 'CEO' : 'Manager';

    p.status = 'rejected';
    p.rejectedAt = new Date().toISOString();
    p.rejectedBy = rejectedByRole;
    p.rejectionReason = res.reason;

    try {
        await persistCompanyPayment(p);
        cpToast('❌ Payment Rejected', `Payment ${p.reference} has been rejected.`, 'warning');
        await loadCompanyPayments();
    } catch (err) { cpToast('Failed', err.message, 'error'); }
}
function handleCPAttachFiles(files) {
    const list = Array.from(files);
    if (cpFormAttachments.length + list.length > 5) {
        cpToast('Too Many Files', 'Maximum 5 attachments per payment.', 'warning');
        return;
    }

    list.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            cpToast('File Too Large', `${file.name} exceeds 5MB.`, 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            cpFormAttachments.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: e.target.result
            });
            renderCPFormAttachments();
        };
        reader.readAsDataURL(file);
    });

    const input = document.getElementById('cpAttachInput');
    if (input) input.value = '';
}

function handleCPAttachDrop(event) {
    handleCPAttachFiles(event.dataTransfer.files);
}

function renderCPFormAttachments() {
    const container = document.getElementById('cpAttachList');
    if (!container) return;

    if (cpFormAttachments.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = cpFormAttachments.map((att, i) => {
        const isImg = att.type.startsWith('image/');
        return `
            <div class="cp-attach-item" title="${esc(att.name)}">
                ${isImg
                    ? `<img src="${att.data}" onclick="previewCPImage('${att.data}')" style="cursor:zoom-in;">`
                    : `<div class="cp-attach-file-icon" onclick="downloadCPAttachment(${i})" style="cursor:pointer;">📄</div>`
                }
                <button class="cp-attach-remove" onclick="event.stopPropagation(); removeCPAttachment(${i})">✕</button>
            </div>
        `;
    }).join('');
}

function removeCPAttachment(index) {
    cpFormAttachments.splice(index, 1);
    renderCPFormAttachments();
}

function previewCPImage(dataUrl) {
    const modal = document.getElementById('cpImgPreview');
    if (!modal) return;
    document.getElementById('cpImgPreviewSrc').src = dataUrl;
    modal.classList.add('show');
}

function closeCPImagePreview() {
    const modal = document.getElementById('cpImgPreview');
    if (modal) modal.classList.remove('show');
}

function downloadCPAttachment(index) {
    const att = cpFormAttachments[index];
    if (!att) return;
    const a = document.createElement('a');
    a.href = att.data;
    a.download = att.name;
    a.click();
}

function viewCPAttachmentFromCard(paymentId, attIndex) {
    const p = allCompanyPayments.find(x => String(x.id) === String(paymentId));
    if (!p || !p.attachments || !p.attachments[attIndex]) return;
    const att = p.attachments[attIndex];
    const a = document.createElement('a');
    a.href = att.data;
    a.download = att.name;
    a.click();
}
function viewCompanyPaymentVoucher(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    if (p.status !== 'paid') {
        cpToast('Not Yet Paid', 'Voucher can only be viewed after payment is completed.', 'warning');
        return;
    }

    let modal = document.getElementById('voucherViewModal');
    if (!modal) {
        const html = `
            <div class="modal-overlay" id="voucherViewModal">
                <div class="modal-box" style="max-width:820px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;background:#f1f5f9;">
                    <div style="background:linear-gradient(135deg,#134e4a 0%,#0f766e 100%);padding:18px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;">🧾</div>
                            <div>
                                <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">Payment Voucher Preview</h3>
                                <p style="font-size:12px;color:rgba(255,255,255,0.8);margin:0;">Review the voucher details before printing or downloading.</p>
                            </div>
                        </div>
                        <button onclick="closeModal('voucherViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="voucherViewBody" style="padding:20px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#ffffff;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;flex-wrap:wrap;">
                        <button onclick="closeModal('voucherViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                        <button onclick="printCompanyPaymentVoucher('${id}')" style="padding:11px 24px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">🖨️ Print</button>
                        <button onclick="downloadCompanyPaymentVoucher('${id}')" style="padding:11px 24px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">📥 Download PDF</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    document.getElementById('voucherViewBody').innerHTML = buildVoucherHTML(p);
    document.getElementById('voucherViewModal').classList.add('show');
}

function buildVoucherHTML(p) {
    const typeInfo = CP_TYPES[p.type] || CP_TYPES.other;
    const voucherNumber = 'VCH-' + p.reference.replace('PAY-', '') + '-' + new Date(p.paidAt || Date.now()).getFullYear();
    const paidDate = p.paidAt ? new Date(p.paidAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const dueDate = p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const logoUrl = 'assets/makdc-logo.jpg';

    const imageAttachments = (p.attachments || []).filter(a => a.type && a.type.startsWith('image/')).slice(0, 3);
    const attachmentsHtml = imageAttachments.length > 0 ? `
        <div style="margin-bottom:14px;">
            <div style="font-size:10px;font-weight:900;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:8px;">📎 Supporting Documents</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${imageAttachments.map(att => `
                    <div style="width:70px;height:70px;border-radius:8px;overflow:hidden;border:1.5px solid #e2e8f0;background:#f8fafc;">
                        <img src="${att.data}" style="width:100%;height:100%;object-fit:cover;" alt="${esc(att.name)}">
                    </div>
                `).join('')}
                ${(p.attachments || []).length > imageAttachments.length ? `
                    <div style="display:flex;align-items:center;padding:0 10px;background:#f8fafc;border-radius:8px;border:1.5px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:700;">
                        +${(p.attachments || []).length - imageAttachments.length} more
                    </div>
                ` : ''}
            </div>
        </div>
    ` : '';

    return `
        <div style="background:white;font-family:'Inter',Arial,sans-serif;max-width:210mm;margin:0 auto;box-sizing:border-box;">
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#134e4a 0%,#0f766e 100%);padding:18px 28px;color:white;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
                    <div style="display:flex;gap:12px;align-items:center;">
                        <div style="width:52px;height:52px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid #f59e0b;flex-shrink:0;">
                            <img src="${logoUrl}" alt="MAK DC" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
                                 onerror="this.style.display='none';this.parentElement.innerHTML='<span style=&quot;font-size:16px;font-weight:900;color:#0f766e;&quot;>MAK</span>';">
                        </div>
                        <div>
                            <div style="font-size:16px;font-weight:900;letter-spacing:-0.3px;line-height:1.1;">MAK DC Investment</div>
                            <div style="font-size:9px;font-weight:800;letter-spacing:1.5px;color:#f59e0b;margin-top:2px;">COMPANY LIMITED</div>
                            <div style="font-size:10px;font-style:italic;opacity:0.75;margin-top:2px;">"Quality service is our priority."</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:9px;font-weight:800;letter-spacing:1.5px;opacity:0.85;text-transform:uppercase;">Payment Voucher</div>
                        <div style="font-family:monospace;font-size:14px;font-weight:900;color:#fbbf24;margin-top:4px;">${voucherNumber}</div>
                        <div style="display:inline-block;margin-top:6px;padding:2px 10px;background:rgba(34,197,94,0.25);border:1.5px solid #22c55e;border-radius:12px;font-size:8px;font-weight:900;letter-spacing:1px;">✓ PAID IN FULL</div>
                    </div>
                </div>
            </div>

            <div style="height:4px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#0f766e);"></div>

            <div style="padding:18px 28px;">
                <div style="font-size:10px;font-weight:900;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:10px;">📋 Payment Information</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:14px;">
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e2e8f0;font-size:12px;"><span style="color:#64748b;font-weight:600;">Reference</span><span style="font-family:monospace;color:#134e4a;font-weight:800;">${esc(p.reference)}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e2e8f0;font-size:12px;"><span style="color:#64748b;font-weight:600;">Type</span><span style="color:#134e4a;font-weight:800;">${typeInfo.icon} ${typeInfo.label}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e2e8f0;font-size:12px;"><span style="color:#64748b;font-weight:600;">Vendor / Payee</span><span style="color:#134e4a;font-weight:800;">${esc(p.vendor)}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e2e8f0;font-size:12px;"><span style="color:#64748b;font-weight:600;">Method</span><span style="color:#134e4a;font-weight:800;">${esc(p.method || '—')}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e2e8f0;font-size:12px;"><span style="color:#64748b;font-weight:600;">Due Date</span><span style="color:#134e4a;font-weight:800;">${dueDate}</span></div>
                    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed #e2e8f0;font-size:12px;"><span style="color:#64748b;font-weight:600;">Paid Date</span><span style="color:#134e4a;font-weight:800;">${paidDate}</span></div>
                </div>

                ${p.description ? `
                <div style="margin-bottom:14px;">
                    <div style="font-size:10px;font-weight:900;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:8px;">📝 Description</div>
                    <div style="font-size:12px;line-height:1.5;color:#475569;padding:8px 12px;background:#f8fafc;border-radius:6px;border-left:3px solid #0f766e;">${esc(p.description)}</div>
                </div>` : ''}

                ${attachmentsHtml}

                <div style="background:linear-gradient(135deg,#134e4a,#0f766e);color:white;padding:14px 22px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;margin:14px 0;">
                    <div>
                        <div style="font-size:9px;font-weight:800;letter-spacing:2px;opacity:0.85;text-transform:uppercase;">Amount Paid</div>
                        <div style="font-size:10px;opacity:0.7;margin-top:2px;">Payment received in full</div>
                    </div>
                    <div style="font-size:22px;font-weight:900;color:#fbbf24;font-family:monospace;letter-spacing:-0.5px;">TSh ${Number(p.amount).toLocaleString()}</div>
                </div>

                <div style="font-size:10px;font-weight:900;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:10px;">✅ Approval Chain</div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
                    <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;border-left:3px solid #64748b;">
                        <div style="font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">📝 Prepared By</div>
                        <div style="font-size:11px;font-weight:800;color:#134e4a;">${esc(p.createdBy || '—')}</div>
                        <div style="font-size:9px;color:#94a3b8;margin-top:2px;">${p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-GB') : '—'}</div>
                    </div>
                    <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;border-left:3px solid #f59e0b;">
                        <div style="font-size:8px;font-weight:900;color:#d97706;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">🟡 Verified By</div>
                        <div style="font-size:11px;font-weight:800;color:#134e4a;">${esc(p.managerVerifiedBy || '—')}</div>
                        <div style="font-size:9px;color:#94a3b8;margin-top:2px;">${p.managerVerifiedAt ? new Date(p.managerVerifiedAt).toLocaleDateString('en-GB') : '—'}</div>
                    </div>
                    <div style="background:#f8fafc;border-radius:8px;padding:8px 10px;border-left:3px solid #22c55e;">
                        <div style="font-size:8px;font-weight:900;color:#16a34a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">🟢 Approved By</div>
                        <div style="font-size:11px;font-weight:800;color:#134e4a;">${esc(p.ceoApprovedBy || '—')}</div>
                        <div style="font-size:9px;color:#94a3b8;margin-top:2px;">${p.ceoApprovedAt ? new Date(p.ceoApprovedAt).toLocaleDateString('en-GB') : '—'}</div>
                    </div>
                </div>

                <div style="display:flex;gap:24px;margin-top:24px;margin-bottom:14px;">
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid #94a3b8;padding-top:6px;font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Prepared By</div>
                        <div style="font-size:10px;color:#0f766e;font-weight:700;margin-top:3px;">${esc(p.createdBy || '—')}</div>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid #94a3b8;padding-top:6px;font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Verified By</div>
                        <div style="font-size:10px;color:#0f766e;font-weight:700;margin-top:3px;">${esc(p.managerVerifiedBy || '—')}</div>
                    </div>
                    <div style="flex:1;text-align:center;">
                        <div style="border-top:1.5px solid #94a3b8;padding-top:6px;font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Approved By</div>
                        <div style="font-size:10px;color:#0f766e;font-weight:700;margin-top:3px;">${esc(p.ceoApprovedBy || '—')}</div>
                    </div>
                </div>

                <div style="margin-top:12px;padding:8px 12px;background:rgba(245,158,11,0.06);border-radius:6px;border-left:3px solid #f59e0b;">
                    <div style="font-size:8px;font-weight:900;color:#d97706;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">📌 Important Note</div>
                    <div style="font-size:10px;color:#78350f;line-height:1.4;">
                        This payment has been <strong>fully authorized and verified</strong>. All information on this voucher is accurate as of the date of issue. For inquiries, contact the Finance Department with the reference number above.
                    </div>
                </div>

                <div style="text-align:center;margin-top:10px;">
                    <div style="display:inline-block;padding:4px 14px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border-radius:16px;font-size:8px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;">
                        ✓ Verified & Approved by MAK DC Investment Company Ltd
                    </div>
                </div>
            </div>

            <div style="background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);padding:14px 28px 12px;border-top:2px dashed #e2e8f0;">
                <div style="font-size:9px;color:#64748b;line-height:1.5;text-align:left;margin-bottom:10px;padding:8px 12px;background:white;border-radius:6px;border-left:3px solid #0f766e;">
                    <div style="font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:0.8px;font-size:8px;margin-bottom:4px;">📋 Terms & Conditions</div>
                    <div>1. This voucher is an official document of <strong>MAK DC Investment Company Limited</strong>.</div>
                    <div>2. Payment has been verified and approved by authorized personnel.</div>
                    <div>3. Any alteration or forgery of this document is a criminal offense.</div>
                    <div>4. Retain this voucher for your records and audit purposes.</div>
                </div>

                <div style="display:flex;justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:8px;font-size:9px;">
                    <span style="color:#0f766e;font-weight:700;">📧 info@makdc.co.tz</span>
                    <span style="color:#0f766e;font-weight:700;">📞 +255 754 123 456</span>
                    <span style="color:#0f766e;font-weight:700;">🌐 www.makdc.co.tz</span>
                </div>

                <div style="text-align:center;padding-top:8px;border-top:1px solid #e2e8f0;">
                    <div style="font-size:9px;color:#94a3b8;margin-bottom:2px;">
                        This is a computer-generated voucher. No signature required.
                    </div>
                    <div style="font-size:8px;color:#cbd5e1;">
                        © 2026 MAK DC Investment Company Limited — All rights reserved.
                    </div>
                    <div style="font-size:8px;color:#cbd5e1;margin-top:2px;font-style:italic;">
                        "Quality service is our priority."
                    </div>
                </div>
            </div>
        </div>
    `;
}

function printCompanyPaymentVoucher(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    if (p.status !== 'paid') {
        cpToast('Not Yet Paid', 'Voucher can only be printed after payment is completed.', 'warning');
        return;
    }

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
        cpToast('Popup Blocked', 'Please allow popups to print voucher.', 'error');
        return;
    }

    w.document.write(`<!DOCTYPE html>
        <html>
        <head>
            <title>Payment Voucher - ${esc(p.reference)}</title>
            <meta charset="UTF-8">
            <style>
                @page { size: A4; margin: 8mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                html, body { font-family: 'Inter', Arial, sans-serif; background: #f1f5f9; padding: 20px; }
                body > div { max-width: 194mm; margin: 0 auto; }
                @media print {
                    html, body { background: white; padding: 0; }
                    body > div { max-width: 100%; page-break-after: avoid; page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>${buildVoucherHTML(p)}</body>
        </html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
}

function downloadCompanyPaymentVoucher(id) {
    const p = allCompanyPayments.find(x => String(x.id) === String(id));
    if (!p) return;

    if (p.status !== 'paid') {
        cpToast('Not Yet Paid', 'Voucher can only be downloaded after payment is completed.', 'warning');
        return;
    }

    if (typeof html2pdf === 'undefined') {
        cpToast('Loading Library', 'PDF library is loading... please wait', 'info');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = function() {
            cpToast('Library Loaded', 'Retrying PDF download...', 'info');
            _generateVoucherPDF(p);
        };
        script.onerror = function() {
            cpToast('Library Failed', 'Cannot load PDF library. Please refresh the page.', 'error');
        };
        document.head.appendChild(script);
        return;
    }

    _generateVoucherPDF(p);
}

function _generateVoucherPDF(p) {
    const voucherNumber = 'VCH-' + p.reference.replace('PAY-', '') + '-' + new Date(p.paidAt || Date.now()).getFullYear();

    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm';
    tempContainer.style.background = 'white';
    tempContainer.style.padding = '0';
    tempContainer.innerHTML = buildVoucherHTML(p);
    document.body.appendChild(tempContainer);

    cpToast('⏳ Generating PDF', 'Please wait...', 'info', 2000);

    const opt = {
        margin: [8, 8, 8, 8],
        filename: `${voucherNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: tempContainer.scrollWidth,
            windowHeight: tempContainer.scrollHeight
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        },
        pagebreak: {
            mode: ['avoid-all', 'css'],
            avoid: 'div, p, table, tr'
        }
    };

    html2pdf()
        .set(opt)
        .from(tempContainer.firstElementChild)
        .save()
        .then(() => {
            cpToast('✅ Downloaded', `${voucherNumber}.pdf saved to your Downloads folder.`, 'success');
            document.body.removeChild(tempContainer);
        })
        .catch((err) => {
            console.error('PDF generation error:', err);
            cpToast('PDF Failed', 'Failed to generate PDF. Please try again.', 'error');
            document.body.removeChild(tempContainer);
        });
}
let currentPayrollData = null;
let allPayrolls = [];

function openPayrollModal() {
    switchTab('tab-payroll');
}

function viewTotalStaffs() {
    switchTab('tab-staff-payments');
    cpToast('📋 Total Staffs', 'All employees are visible in this tab', 'info');
}

async function loadEmployeesForPayroll() {
    const month = parseInt(document.getElementById('payrollMonth').value);
    const year = parseInt(document.getElementById('payrollYear').value);
    const accountId = document.getElementById('payrollAccount')?.value;

    if (!month || !year) {
        cpToast('Required', 'Please select month and year.', 'warning');
        return;
    }

    // 🆕 Lazima uchague operations account
    if (!accountId) {
        cpToast('Required', 'Please select an operations account.', 'warning');
        return;
    }

    try {
        cpToast('⏳ Loading', 'Fetching employees...', 'info', 1500);

        // 🆕 Angalia kama kuna operations account
        const opsAccounts = await getOperationsAccounts();
        
        if (opsAccounts.length === 0) {
            cpToast(
                'No Operations Account',
                'You need at least one approved "Operations" account to process payroll. Please create one in Finance → Accounts.',
                'warning',
                6000
            );
            return;
        }

        // 🆕 Angalia balance
        const selectedAccount = opsAccounts.find(a => String(a.id) === String(accountId));
        if (!selectedAccount) {
            cpToast('Invalid Account', 'Selected account not found.', 'error');
            return;
        }

        const balance = Number(selectedAccount.balance || 0);
        const currency = selectedAccount.currency || 'TZS';

        const employees = await API.getEmployees();

        if (!employees || employees.length === 0) {
            cpToast('No Employees', 'No employees found. Ask Manager to add employees first.', 'warning');
            return;
        }

        const activeEmployees = employees.filter(e => e.status === 'Active');
        if (activeEmployees.length === 0) {
            cpToast('No Active Employees', 'No active employees found.', 'warning');
            return;
        }

        const items = activeEmployees.map(emp => {
            const basic = Number(emp.basicSalary) || 0;
            const allow = Number(emp.allowances) || 0;
            const deductions = 0;
            return {
                employeeId: emp.employeeId,
                employeeName: emp.fullName,
                position: emp.position || '—',
                department: emp.department || '—',
                basicSalary: basic,
                allowances: allow,
                deductions,
                netPay: basic + allow - deductions,
                paymentMode: emp.paymentMode || 'Bank Transfer',
                bankAccount: emp.bankAccount || ''
            };
        });

        const totalAmount = items.reduce((sum, i) => sum + i.netPay, 0);

        // 🆕 VALIDATION: Balance inatosha?
        if (totalAmount > balance) {
            const shortage = totalAmount - balance;
            cpToast(
                '⚠️ Insufficient Balance',
                `Payroll total: ${currency} ${totalAmount.toLocaleString()}, Available: ${currency} ${balance.toLocaleString()}, Shortage: ${currency} ${shortage.toLocaleString()}`,
                'error',
                8000
            );
            return;
        }

        // 🆕 Hifadhi accountId kwenye currentPayrollData
        currentPayrollData = {
            month, year, items,
            totalAmount,
            accountId: parseInt(accountId),           // 🆕 MUHIMU
            accountName: selectedAccount.name,
            accountBalance: balance,
            accountCurrency: currency
        };

        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        renderPayrollEmployees(items);
        document.getElementById('payrollStep1').style.display = 'none';
        document.getElementById('payrollStep2').style.display = 'block';
        document.getElementById('payrollMonthDisplay').textContent = `${monthNames[month - 1]} ${year}`;
        document.getElementById('payrollTotalAmount').textContent =
            `TSh ${currentPayrollData.totalAmount.toLocaleString()}`;

        // 🆕 Update banner ya account
        const banner = document.getElementById('payrollAccountBanner');
        const bannerName = document.getElementById('payrollBannerAccountName');
        const bannerBalance = document.getElementById('payrollBannerBalance');
        
        if (banner && bannerName && bannerBalance) {
            bannerName.textContent = selectedAccount.name;
            bannerBalance.textContent = `${currency} ${balance.toLocaleString()}`;
            banner.style.display = 'block';
        }

        cpToast('✅ Loaded', `${activeEmployees.length} employees loaded.`, 'success');

    } catch (error) {
        cpToast('Error', 'Failed to load employees: ' + error.message, 'error');
    }
}
function renderPayrollEmployees(items) {
    const container = document.getElementById('payrollEmployeesList');
    if (!container) return;

    const countEl = document.getElementById('payrollEmployeeCount');
    const totalEl = document.getElementById('payrollTotalAmountMini');
    const avgEl = document.getElementById('payrollAvgMini');
    
    const total = items.reduce((sum, i) => sum + i.netPay, 0);
    const avg = items.length > 0 ? total / items.length : 0;
    
    if (countEl) countEl.textContent = items.length;
    if (totalEl) totalEl.textContent = `TSh ${total.toLocaleString()}`;
    if (avgEl) avgEl.textContent = `TSh ${Math.round(avg).toLocaleString()}`;

    container.innerHTML = `
        <div style="background: white; border-radius: 14px; overflow: hidden; border: 1px solid var(--gray-200);">
            <div style="display: grid; grid-template-columns: 50px 1.6fr 1fr 1.1fr 1.1fr 1.1fr 1.2fr 70px; gap: 12px; padding: 14px 20px; background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 2px solid var(--gray-200); font-size: 10px; font-weight: 800; color: var(--gray-500); text-transform: uppercase; letter-spacing: 1px;">
                <span>#</span><span>Employee</span><span>Department</span>
                <span>Basic</span><span>Allowances</span><span>Deductions</span><span>Net Pay</span><span style="text-align:center;">Edit</span>
            </div>
            ${items.map((item, i) => `
                <div style="display: grid; grid-template-columns: 50px 1.6fr 1fr 1.1fr 1.1fr 1.1fr 1.2fr 70px; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--gray-100); align-items: center; font-size: 13px; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
                    <span style="font-weight: 800; color: #0f766e; font-size: 14px;">${String(i + 1).padStart(2, '0')}</span>
                    <div>
                        <div style="font-weight: 700; color: #1e293b; font-size: 13.5px;">${esc(item.employeeName)}</div>
                        <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 2px;">${esc(item.employeeId)}</div>
                    </div>
                    <span style="color: #475569; font-size: 12px;">${esc(item.department)}</span>
                    <span style="font-weight: 600; color: #0f766e; font-family: 'Courier New', monospace;">TSh ${item.basicSalary.toLocaleString()}</span>
                    <span style="color: #16a34a; font-family: 'Courier New', monospace; font-weight: 600;">+TSh ${item.allowances.toLocaleString()}</span>
                    <span style="color: #dc2626; font-family: 'Courier New', monospace; font-weight: 600;">-TSh ${item.deductions.toLocaleString()}</span>
                    <span style="font-weight: 800; color: #0f766e; font-family: 'Courier New', monospace;">TSh ${item.netPay.toLocaleString()}</span>
                    <div style="text-align:center;">
                        <button onclick="editPayrollItem(${i})" style="width: 34px; height: 34px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🖊️</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function editPayrollItem(index) {
    if (!currentPayrollData || !currentPayrollData.items[index]) return;
    const item = currentPayrollData.items[index];

    let modal = document.getElementById('editPayrollItemModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="editPayrollItemModal">
                <div class="modal-box" style="max-width:500px;padding:0;overflow:hidden;">
                    <div style="background:linear-gradient(135deg,#0f766e,#134e4a);padding:18px 24px;color:white;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">🖋️ Edit Employee Payroll</h3>
                        <button onclick="closeModal('editPayrollItemModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:22px 26px;">
                        <div style="background:rgba(15,118,110,0.06);border-left:4px solid #0f766e;border-radius:10px;padding:12px 16px;margin-bottom:18px;">
                            <div style="font-weight:700;color:#0f766e;font-size:14px;" id="editItemName">—</div>
                            <div style="font-size:12px;color:#64748b;font-family:monospace;margin-top:2px;" id="editItemId">—</div>
                        </div>

                        <div class="cp-form-group">
                            <label>Basic Salary (TSh)</label>
                            <input type="number" id="editItemBasic" min="0" step="1000">
                        </div>
                        <div class="cp-form-group">
                            <label>Allowances (TSh)</label>
                            <input type="number" id="editItemAllowances" min="0" step="500">
                        </div>
                        <div class="cp-form-group">
                            <label>Deductions (TSh)</label>
                            <input type="number" id="editItemDeductions" min="0" step="500">
                        </div>

                        <div style="background:linear-gradient(135deg,rgba(15,118,110,0.08),rgba(15,118,110,0.02));border-radius:10px;padding:14px 18px;margin-top:8px;border-left:4px solid #0f766e;">
                            <div style="display:flex;justify-content:space-between;align-items:center;">
                                <span style="font-size:12px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1px;">Net Pay</span>
                                <span style="font-size:20px;font-weight:900;color:#0f766e;font-family:'Courier New',monospace;" id="editItemNetPay">TSh 0</span>
                            </div>
                        </div>
                    </div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;">
                        <button onclick="closeModal('editPayrollItemModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                        <button onclick="savePayrollItemEdit(${index})" style="padding:11px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">💾 Save Changes</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('editPayrollItemModal');
    }

    document.getElementById('editItemName').textContent = item.employeeName;
    document.getElementById('editItemId').textContent = item.employeeId;
    document.getElementById('editItemBasic').value = item.basicSalary;
    document.getElementById('editItemAllowances').value = item.allowances;
    document.getElementById('editItemDeductions').value = item.deductions;

    const updateNet = () => {
        const basic = parseFloat(document.getElementById('editItemBasic').value) || 0;
        const allow = parseFloat(document.getElementById('editItemAllowances').value) || 0;
        const ded = parseFloat(document.getElementById('editItemDeductions').value) || 0;
        const net = basic + allow - ded;
        document.getElementById('editItemNetPay').textContent = `TSh ${net.toLocaleString()}`;
    };

    ['editItemBasic', 'editItemAllowances', 'editItemDeductions'].forEach(id => {
        document.getElementById(id).oninput = updateNet;
    });
    updateNet();

    modal.classList.add('show');
}

function savePayrollItemEdit(index) {
    if (!currentPayrollData || !currentPayrollData.items[index]) return;

    const basic = parseFloat(document.getElementById('editItemBasic').value) || 0;
    const allow = parseFloat(document.getElementById('editItemAllowances').value) || 0;
    const ded = parseFloat(document.getElementById('editItemDeductions').value) || 0;

    currentPayrollData.items[index].basicSalary = basic;
    currentPayrollData.items[index].allowances = allow;
    currentPayrollData.items[index].deductions = ded;
    currentPayrollData.items[index].netPay = basic + allow - ded;

    currentPayrollData.totalAmount = currentPayrollData.items.reduce((sum, i) => sum + i.netPay, 0);

    renderPayrollEmployees(currentPayrollData.items);
    document.getElementById('payrollTotalAmount').textContent =
        `TSh ${currentPayrollData.totalAmount.toLocaleString()}`;

    closeModal('editPayrollItemModal');
    cpToast('✅ Updated', `${currentPayrollData.items[index].employeeName} updated.`, 'success');
}

async function savePayrollDraft() {
    if (!currentPayrollData) return;
    await persistPayroll('draft', '📝 Draft Saved');
}

async function sendPayrollToManager() {
    if (!currentPayrollData) return;

    const res = await cpConfirm({
        title: '📤 Send Payroll to Manager?',
        message: `Send payroll for ${currentPayrollData.month}/${currentPayrollData.year} to Manager for verification?`,
        detail: {
            label: 'Total Amount',
            value: `TSh ${currentPayrollData.totalAmount.toLocaleString()}`
        },
        warn: '⚠️ <strong>Important:</strong> Once sent, you cannot edit this payroll.',
        type: 'primary',
        okText: '📤 Send Now',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;
    await persistPayroll('pending-manager', '📤 Sent to Manager');
}

async function persistPayroll(status, successTitle) {
    try {
        // 🆕 Angalia kama kuna accountId
        if (!currentPayrollData.accountId) {
            cpToast('Error', 'Operations account not selected. Please reload.', 'error');
            return;
        }

        await API.createPayroll({
            month: currentPayrollData.month,
            year: currentPayrollData.year,
            items: currentPayrollData.items,
            accountId: currentPayrollData.accountId,   // 🆕 MUHIMU
            createdBy: currentUser?.fullName || 'Finance Officer',
            status: status
        });

        cpToast(successTitle, `Payroll for ${currentPayrollData.month}/${currentPayrollData.year} saved.`, 'success');
        resetPayrollForm();
        loadPayrollHistory();
    } catch (error) {
        cpToast('Error', error.message, 'error');
    }
}
function resetPayrollForm() {
    currentPayrollData = null;
    const step1 = document.getElementById('payrollStep1');
    const step2 = document.getElementById('payrollStep2');
    const list = document.getElementById('payrollEmployeesList');

    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (list) list.innerHTML = '';

    const yearSelect = document.getElementById('payrollYear');
    if (yearSelect) yearSelect.value = new Date().getFullYear();

    const monthSelect = document.getElementById('payrollMonth');
    if (monthSelect) monthSelect.value = '1';
}
let dashboardCharts = {
    cashFlow: null,
    resources: null
};

async function loadDashboardOverview() {
    try {
        // Set user name na date
        const userName = currentUser?.fullName || 'Finance Officer';
        setText('dashboardUserName', userName.split(' ')[0]);
        setText('dashboardDate', new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }));

        // 🆕 Hakikisha API call inafanyika
        console.log('🔄 Fetching dashboard stats...');
        const stats = await API.getDashboardStats();
        console.log('✅ Dashboard stats received:', stats);

        if (!stats || !stats.kpi) {
            throw new Error('Invalid data format from server');
        }

        // Update Net Worth
        setText('dashboardNetWorth', `TSh ${Number(stats.kpi.totalResources || 0).toLocaleString()}`);

        // Render KPI Cards
        renderKPICards(stats.kpi);

        // Render Charts
        renderCashFlowChart(stats.charts?.cashFlowTrend || []);
        renderResourcesChart(stats.charts?.resourcesByCategory || []);

        // Render Modules
        renderModuleSummaries(stats.modules || {});

        // Render Recent Activities
        renderRecentActivities(stats.recent || {});

    } catch (err) {
        console.error('❌ loadDashboardOverview error:', err);
        
        // 🆕 Onyesha error kwenye screen kama data haipatikani
        const kpiContainer = document.getElementById('kpiCards');
        if (kpiContainer) {
            kpiContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:40px; color:#dc2626; background:#fef2f2; border-radius:12px; border:1px solid #fecaca;">
                    <div style="font-size:40px; margin-bottom:10px;">❌</div>
                    <div style="font-size:16px; font-weight:800;">Imeshindwa Kupata Data</div>
                    <div style="font-size:13px; margin-top:6px; color:#7f1d1d;">${esc(err.message)}</div>
                    <button onclick="loadDashboardOverview()" style="margin-top:16px; padding:10px 24px; background:#0f766e; color:white; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit;">🔄 Jaribu Tena</button>
                </div>
            `;
        }
    }
}

function renderKPICards(kpi) {
    const container = document.getElementById('kpiCards');
    if (!container) return;

    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();

    const cards = [
        { icon: '📥', label: 'Month Inflow', value: fmt(kpi.monthInflow), color: '#0f766e', bg: '#f0fdf4' },
        { icon: '📤', label: 'Month Outflow', value: fmt(kpi.monthOutflow), color: '#0f766e', bg: '#f0fdf4' },
        { icon: '📊', label: 'Net Change', value: (kpi.netChange >= 0 ? '+' : '') + fmt(kpi.netChange), color: kpi.netChange >= 0 ? '#0f766e' : '#dc2626', bg: '#f0fdf4' },
        { icon: '🛒', label: 'Total Sales', value: fmt(kpi.totalSales), color: '#0f766e', bg: '#f0fdf4' },
        { icon: '📦', label: 'Total Orders', value: kpi.totalOrders, sub: `${kpi.paidOrders} paid • ${kpi.pendingOrders} pending`, color: '#0f766e', bg: '#f0fdf4' },
        { icon: '💰', label: 'Total Resources', value: fmt(kpi.totalResources), color: '#0f766e', bg: '#f0fdf4' }
    ];

    container.innerHTML = cards.map(c => `
        <div class="kpi-card" style="border-left:4px solid #0f766e; background: white; padding: 18px 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(15,118,110,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${c.label}</div>
                <div style="width:36px;height:36px;border-radius:10px;background:${c.bg};color:${c.color};display:flex;align-items:center;justify-content:center;font-size:18px;">${c.icon}</div>
            </div>
            <div style="font-size:22px;font-weight:900;color:${c.color};font-family:'Courier New',monospace;letter-spacing:-0.5px;">${c.value}</div>
            ${c.sub ? `<div style="font-size:10px;color:#94a3b8;margin-top:4px;">${c.sub}</div>` : ''}
        </div>
    `).join('');
}
function renderCashFlowChart(trend) {
    const canvas = document.getElementById('cashFlowChart');
    if (!canvas) return;

    if (dashboardCharts.cashFlow) {
        dashboardCharts.cashFlow.destroy();
    }

    const labels = (trend || []).map(t => t.date);
    const inflows = (trend || []).map(t => t.inflow);
    const outflows = (trend || []).map(t => t.outflow);

    dashboardCharts.cashFlow = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Inflow',
                    data: inflows,
                    borderColor: '#16a34a',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#16a34a'
                },
                {
                    label: 'Outflow',
                    data: outflows,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220,38,38,0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#dc2626'
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
                        label: (ctx) => `${ctx.dataset.label}: TSh ${Number(ctx.parsed.y).toLocaleString()}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => {
                            if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
                            if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
                            return value;
                        },
                        font: { size: 10 }
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    ticks: { font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderResourcesChart(resourcesByCategory) {
    const canvas = document.getElementById('resourcesChart');
    if (!canvas) return;

    if (dashboardCharts.resources) {
        dashboardCharts.resources.destroy();
    }

    const data = resourcesByCategory || [];
    
    if (data.length === 0) {
        canvas.parentElement.innerHTML = '<div style="text-align:center;padding:60px;color:#94a3b8;">No resources</div>';
        return;
    }

    const labels = data.map(r => r.category.charAt(0).toUpperCase() + r.category.slice(1));
    const values = data.map(r => r.amount);
    
    // 🆕 Rangi za kijani tu (Teal, Emerald, Green, Lime)
    const colors = ['#0f766e', '#14b8a6', '#22c55e', '#4ade80', '#86efac', '#a7f3d0'];

    dashboardCharts.resources = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10, weight: '600' }, padding: 8, boxWidth: 10 } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.label}: TSh ${Number(ctx.parsed).toLocaleString()}` } }
            },
            cutout: '60%'
        }
    });
}

function renderModuleSummaries(modules) {
    const container = document.getElementById('moduleSummaries');
    if (!container) return;

    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();

    // 🆕 Gradients zote za kijani
    const cards = [
        { icon: '💰', title: 'Payroll', gradient: 'linear-gradient(135deg,#0f766e,#134e4a)', total: modules.payroll?.total || 0, amount: modules.payroll?.amount || 0, pending: modules.payroll?.pending || 0, unit: 'RUNS', viewTab: 'tab-payroll-history' },
        { icon: '🏢', title: 'Company Payments', gradient: 'linear-gradient(135deg,#0f766e,#134e4a)', total: modules.companyPayments?.total || 0, amount: modules.companyPayments?.amount || 0, pending: modules.companyPayments?.pending || 0, unit: 'RECORDS', viewTab: 'tab-company-payments' },
        { icon: '💸', title: 'Fund Transfers', gradient: 'linear-gradient(135deg,#0f766e,#134e4a)', total: modules.fundTransfers?.total || 0, amount: modules.fundTransfers?.amount || 0, pending: null, unit: 'MOVES', viewTab: 'tab-fund-transfer' }
    ];

    container.innerHTML = cards.map(c => `
        <div class="module-card" style="background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
            <div style="background:${c.gradient};padding:14px 20px;display:flex;justify-content:space-between;align-items:center;color:white;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;">${c.icon}</div>
                    <div style="font-size:14px;font-weight:800;">${c.title}</div>
                </div>
                <div style="font-size:10px;font-weight:800;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:20px;">${c.total} ${c.unit}</div>
            </div>
            <div style="padding:14px 20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px dashed #e2e8f0;">
                    <span style="font-size:11px;color:#64748b;">Total Amount</span>
                    <span style="font-size:14px;font-weight:900;color:#0f766e;font-family:'Courier New',monospace;">${fmt(c.amount)}</span>
                </div>
                ${c.pending !== null ? `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
                        <span style="font-size:11px;color:#64748b;">⏳ Pending</span>
                        <span style="font-size:13px;font-weight:800;color:#0f766e;">${c.pending} ${c.unit.toLowerCase()}</span>
                    </div>
                ` : ''}
                <button onclick="switchTab('${c.viewTab}')" style="margin-top:8px;width:100%;padding:8px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:8px;font-size:11px;font-weight:700;color:#0f766e;cursor:pointer;font-family:inherit;">
                    View ${c.title} →
                </button>
            </div>
        </div>
    `).join('');
}

function renderRecentActivities(recent) {
    const container = document.getElementById('recentActivities');
    if (!container) return;

    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();

    const formatDate = (d) => {
        if (!d) return '—';
        const date = new Date(d);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return 'Just now';
        if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
        if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const statusColors = {
        'draft': { color: '#64748b', label: 'Draft' },
        'pending': { color: '#f59e0b', label: 'Pending' },
        'pending-manager': { color: '#f59e0b', label: 'Pending Mgr' },
        'pending-ceo': { color: '#ea580c', label: 'Pending CEO' },
        'approved': { color: '#14b8a6', label: 'Approved' },
        'paid': { color: '#16a34a', label: 'Paid' },
        'completed': { color: '#16a34a', label: 'Completed' },
        'ready-for-finance': { color: '#3b82f6', label: 'Ready' },
        'awaiting-payment': { color: '#f59e0b', label: 'Awaiting' },
        'rejected': { color: '#dc2626', label: 'Rejected' }
    };

    const getStatus = (s) => statusColors[s] || { color: '#64748b', label: s };

    container.innerHTML = `
        <!-- RECENT ORDERS -->
        <div class="activity-card">
            <div class="activity-header">📦 Recent Orders</div>
            <div class="activity-body">
                ${(recent.orders || []).length === 0 
                    ? '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">No orders yet</div>'
                    : recent.orders.map(o => {
                        const st = getStatus(o.status);
                        return `
                            <div class="activity-item">
                                <div class="activity-icon" style="background:rgba(15,118,110,0.1);color:#0f766e;">📦</div>
                                <div class="activity-info">
                                    <div class="activity-title">${esc(o.orderId)}</div>
                                    <div class="activity-meta">${esc(o.customerName || '—')} • ${formatDate(o.createdAt)}</div>
                                </div>
                                <div class="activity-amount">
                                    <div class="activity-amount-value">${fmt(o.totalAmount)}</div>
                                    <div class="activity-amount-status" style="color:${st.color};">${st.label}</div>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        </div>

        <!-- RECENT PAYMENTS -->
        <div class="activity-card">
            <div class="activity-header">💸 Recent Company Payments</div>
            <div class="activity-body">
                ${(recent.companyPayments || []).length === 0 
                    ? '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">No payments yet</div>'
                    : recent.companyPayments.map(p => {
                        const st = getStatus(p.status);
                        return `
                            <div class="activity-item">
                                <div class="activity-icon" style="background:rgba(234,88,12,0.1);color:#ea580c;">💸</div>
                                <div class="activity-info">
                                    <div class="activity-title">${esc(p.reference)}</div>
                                    <div class="activity-meta">${esc(p.vendor || '—')} • ${formatDate(p.createdAt)}</div>
                                </div>
                                <div class="activity-amount">
                                    <div class="activity-amount-value">${fmt(p.amount)}</div>
                                    <div class="activity-amount-status" style="color:${st.color};">${st.label}</div>
                                </div>
                            </div>
                        `;
                    }).join('')
                }
            </div>
        </div>
    `;
}
async function loadPayrollHistory() {
    const container = document.getElementById('payrollHistoryContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading payrolls...</div>';

    try {
        const payrolls = await API.getPayrolls();
        allPayrolls = Array.isArray(payrolls) ? payrolls : [];

        const draftCount = allPayrolls.filter(p => p.status === 'draft').length;
        setText('navStaffPaymentsBadge', draftCount);

        renderPayrollHistory();

    } catch (error) {
        console.error('loadPayrollHistory error:', error);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(error.message)}</div>`;
    }
}

function filterPayrollHistory() {
    renderPayrollHistory();
}

function renderPayrollHistory() {
    const container = document.getElementById('payrollHistoryContainer');
    if (!container) return;

    const searchTerm = (document.getElementById('payrollSearchInput')?.value || '').toLowerCase().trim();
    const yearFilter = document.getElementById('payrollYearFilter')?.value || '';
    const statusFilter = document.getElementById('payrollStatusFilter')?.value || '';

    let filtered = allPayrolls;

    if (searchTerm) {
        filtered = filtered.filter(p =>
            (p.payrollId || '').toLowerCase().includes(searchTerm) ||
            (p.createdBy || '').toLowerCase().includes(searchTerm)
        );
    }
    if (yearFilter) {
        filtered = filtered.filter(p => String(p.year) === String(yearFilter));
    }
    if (statusFilter) {
        filtered = filtered.filter(p => p.status === statusFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;">💸</span>
                <div style="font-size:17px;font-weight:800;">No Payrolls Found</div>
                <div style="font-size:13px;">${allPayrolls.length === 0 ? 'Create your first payroll to get started.' : 'Try adjusting your filters.'}</div>
            </div>`;
        return;
    }

    const statusInfo = {
        'draft':            { icon: '📝', label: 'Draft',            color: '#64748b' },
        'pending-manager':  { icon: '🟡', label: 'Pending Manager',  color: '#d97706' },
        'pending-ceo':      { icon: '🟠', label: 'Pending CEO',      color: '#c2410c' },
        'approved':         { icon: '🟢', label: 'Approved',         color: '#16a34a' },
        'paid':             { icon: '✅', label: 'Paid',             color: '#0f766e' },
        'rejected':         { icon: '❌', label: 'Rejected',         color: '#dc2626' }
    };
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    container.innerHTML = filtered.map(p => {
        const sInfo = statusInfo[p.status] || statusInfo['draft'];
        const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

        return `
            <div style="background: white; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; border-left: 4px solid ${sInfo.color}; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div style="flex: 1; min-width: 220px;">
                        <div style="font-family: monospace; font-weight: 800; color: #0f766e; font-size: 14px;">${esc(p.payrollId)}</div>
                        <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 4px;">
                            ${monthNames[p.month - 1]} ${p.year}
                        </div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            👥 ${p.items?.length || 0} employees &nbsp;•&nbsp; 📅 Created: ${createdDate} &nbsp;•&nbsp; 👤 ${esc(p.createdBy || '—')}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: 900; color: #0f766e; font-family: 'Courier New', monospace;">
                            TSh ${Number(p.totalAmount).toLocaleString()}
                        </div>
                        <span style="display: inline-block; margin-top: 6px; padding: 4px 12px; border-radius: 12px; font-size: 10px; font-weight: 800; background: ${sInfo.color}20; color: ${sInfo.color}; text-transform: uppercase;">
                            ${sInfo.icon} ${sInfo.label}
                        </span>
                    </div>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                    <button onclick="viewPayrollDetails('${p.id}')" class="btn-secondary-action">👁 Review</button>
                    ${p.status === 'draft' ? `
                        <button onclick="editDraftPayroll('${p.id}')" class="btn-secondary-action" style="background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;">🖋️ Edit</button>
                        <button onclick="sendExistingPayrollToManager('${p.id}')" class="btn-primary-action" style="background: linear-gradient(135deg, #f59e0b, #d97706);">📤 Send to Manager</button>
                    ` : ''}
                    ${p.status === 'approved' ? `
                        <button onclick="markPayrollAsPaid('${p.id}')" class="btn-primary-action" style="background: linear-gradient(135deg, #22c55e, #16a34a);">💰 Mark as Paid</button>
                    ` : ''}
                    ${p.status === 'paid' ? `
                        <button onclick="viewPayrollDetails('${p.id}')" class="btn-secondary-action">🧾 Voucher</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function sendExistingPayrollToManager(id) {
    const res = await cpConfirm({
        title: '📤 Send to Manager?',
        message: 'Send this payroll to Manager for verification?',
        type: 'primary',
        okText: '📤 Send',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        await API.updatePayrollStatus(id, {
            status: 'pending-manager',
            actionBy: currentUser?.fullName || 'Finance Officer'
        });
        cpToast('📤 Sent', 'Payroll sent to Manager.', 'success');
        loadPayrollHistory();
    } catch (error) {
        cpToast('Error', error.message, 'error');
    }
}

async function markPayrollAsPaid(id) {
    const res = await cpConfirm({
        title: '💰 Mark as Paid?',
        message: 'Confirm this payroll has been paid to all employees.',
        type: 'success',
        okText: '💰 Yes, Mark Paid',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        await API.updatePayrollStatus(id, {
            status: 'paid',
            actionBy: currentUser?.fullName || 'Finance Officer'
        });
        cpToast('💰 Paid', 'Payroll marked as paid.', 'success');
        loadPayrollHistory();
    } catch (error) {
        cpToast('Error', error.message, 'error');
    }
}

async function viewPayrollDetails(id) {
    try {
        const p = await API.getPayroll(id);
        if (!p) { cpToast('Not Found', 'Payroll not found', 'error'); return; }

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
                <div style="font-family: monospace; font-weight: 800; color: #0f766e; font-size: 16px;">${esc(p.payrollId)}</div>
                <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 4px;">
                    ${monthNames[p.month - 1]} ${p.year}
                </div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                    📅 Created: ${p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'} &nbsp;•&nbsp; 👤 ${esc(p.createdBy || '—')}
                </div>
            </div>

            <div style="background: white; border-radius: 10px; overflow: hidden; border: 1px solid var(--gray-200);">
                <div style="display: grid; grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 10px 14px; background: var(--gray-50); border-bottom: 2px solid var(--gray-200); font-size: 10px; font-weight: 800; color: var(--gray-500); text-transform: uppercase;">
                    <span>#</span><span>Employee</span><span>Basic</span><span>Allowances</span><span>Deductions</span><span>Net Pay</span>
                </div>
                ${(p.items || []).map((item, i) => `
                    <div style="display: grid; grid-template-columns: 40px 1.5fr 1fr 1fr 1fr 1fr; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--gray-100); font-size: 12px; align-items: center;">
                        <span style="font-weight: 800; color: #0f766e;">${String(i+1).padStart(2,'0')}</span>
                        <div>
                            <div style="font-weight: 700;">${esc(item.employeeName)}</div>
                            <div style="font-size: 10px; color: #64748b; font-family: monospace;">${esc(item.employeeId)}</div>
                        </div>
                        <span>TSh ${Number(item.basicSalary).toLocaleString()}</span>
                        <span style="color: #16a34a;">+TSh ${Number(item.allowances).toLocaleString()}</span>
                        <span style="color: #dc2626;">-TSh ${Number(item.deductions || 0).toLocaleString()}</span>
                        <span style="font-weight: 800; color: #0f766e;">TSh ${Number(item.netPay).toLocaleString()}</span>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 14px; padding: 12px 16px; background: linear-gradient(135deg, rgba(15,118,110,0.08), rgba(15,118,110,0.02)); border-radius: 8px; border-left: 4px solid #0f766e; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: #0f766e; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">TOTAL NET PAY</span>
                <span style="font-weight: 900; color: #0f766e; font-size: 20px; font-family: 'Courier New', monospace;">TSh ${Number(p.totalAmount).toLocaleString()}</span>
            </div>

            ${p.rejectionReason ? `
                <div style="margin-top: 14px; padding: 12px 16px; background: rgba(239,68,68,0.08); border-radius: 8px; border-left: 4px solid #ef4444; font-size: 13px; color: #7f1d1d; line-height: 1.6;">
                    <strong style="display:block;margin-bottom:4px;color:#dc2626;font-size:11px;text-transform:uppercase;">Rejection Reason</strong>
                    ${esc(p.rejectionReason)}
                </div>
            ` : ''}
        `;

        let modal = document.getElementById('payrollDetailModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modal-overlay" id="payrollDetailModal">
                    <div class="modal-box" style="max-width:780px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                        <div style="background:linear-gradient(135deg,#0f766e,#134e4a);padding:18px 24px;color:white;display:flex;justify-content:space-between;align-items:center;">
                            <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">💸 Payroll Details</h3>
                            <button onclick="closeModal('payrollDetailModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                        <div id="payrollDetailBody" style="padding:20px 24px;overflow-y:auto;flex:1;"></div>
                        <div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                            <button onclick="closeModal('payrollDetailModal')" class="btn-secondary-action">Close</button>
                        </div>
                    </div>
                </div>
            `);
            modal = document.getElementById('payrollDetailModal');
        }
        document.getElementById('payrollDetailBody').innerHTML = body;
        modal.classList.add('show');
    } catch (error) {
        cpToast('Error', error.message, 'error');
    }
}

function populatePayrollYears() {
    const yearSelect = document.getElementById('payrollYear');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 15;
    const endYear = currentYear + 50;

    yearSelect.innerHTML = '';

    for (let y = startYear; y <= endYear; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
}

async function editDraftPayroll(id) {
    try {
        const p = await API.getPayroll(id);
        if (!p) { cpToast('Not Found', 'Payroll not found', 'error'); return; }
        if (p.status !== 'draft') {
            cpToast('Cannot Edit', 'Only draft payrolls can be edited.', 'warning');
            return;
        }

        currentPayrollData = {
            month: p.month,
            year: p.year,
            items: p.items.map(item => ({
                employeeId: item.employeeId,
                employeeName: item.employeeName,
                position: item.position,
                department: item.department,
                basicSalary: Number(item.basicSalary),
                allowances: Number(item.allowances),
                deductions: Number(item.deductions),
                netPay: Number(item.netPay),
                paymentMode: item.paymentMode,
                bankAccount: item.bankAccount
            })),
            totalAmount: Number(p.totalAmount)
        };

        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

        switchTab('tab-payroll');
        document.getElementById('payrollStep1').style.display = 'none';
        document.getElementById('payrollStep2').style.display = 'block';
        document.getElementById('payrollMonthDisplay').textContent = `${monthNames[p.month - 1]} ${p.year}`;
        document.getElementById('payrollTotalAmount').textContent = `TSh ${currentPayrollData.totalAmount.toLocaleString()}`;
        renderPayrollEmployees(currentPayrollData.items);

        cpToast('🖋️ Editing', `Editing payroll ${p.payrollId}`, 'info');

        currentPayrollData.existingId = id;
        currentPayrollData.isEditing = true;

    } catch (error) {
        cpToast('Error', error.message, 'error');
    }
}
function handleLogoutClick(event) {
    if (event) event.preventDefault();
    document.getElementById('logoutConfirmModal').classList.add('show');
    closeUserDropdown();
}
function closeLogoutDialog() { document.getElementById('logoutConfirmModal').classList.remove('show'); }
function confirmLogout() {
    closeLogoutDialog();
    cpToast('👋 Logging out...', 'Bye!', 'info');
    setTimeout(() => Auth.logout(), 400);
}
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
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    const isMobile = window.innerWidth <= 768;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    if (!isMobile) localStorage.setItem('makdc_finance_sidebar_collapsed', isCollapsed);
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
        const wasCollapsed = localStorage.getItem('makdc_finance_sidebar_collapsed') === 'true';
        if (wasCollapsed) sidebar.classList.add('collapsed');
    }
}
let allResources = [];
let allTransactions = [];

async function loadFinancialResources() {
    const container = document.getElementById('resourcesContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading...</div>';
    
    try {
        const [resources, transactions] = await Promise.all([
            API.getFinancialResources().catch(() => []),
            API.getTransactions().catch(() => [])
        ]);
        
        allResources = Array.isArray(resources) ? resources : [];
        allTransactions = Array.isArray(transactions) ? transactions : [];
        
        renderResourcesStats();
        renderResourcesList();
        
        setText('resourcesBadge', allResources.length);
    } catch (err) {
        console.error('loadFinancialResources error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

function renderResourcesStats() {
    const total = allResources
        .filter(r => r.status === 'active')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    
    const now = new Date();
    const thisMonth = allTransactions.filter(t => {
        const d = new Date(t.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const monthInflow = thisMonth
        .filter(t => t.type === 'INFLOW')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const monthOutflow = thisMonth
        .filter(t => t.type === 'OUTFLOW')
        .reduce((sum, t) => sum + Number(t.amount), 0);
    
    setText('resourcesTotalAmount', 'TSh ' + total.toLocaleString());
    setText('resourcesMonthInflow', '+TSh ' + monthInflow.toLocaleString());
    setText('resourcesMonthOutflow', '-TSh ' + monthOutflow.toLocaleString());
    setText('resourcesNetChange', 'TSh ' + (monthInflow - monthOutflow).toLocaleString());
}
function renderResourcesList() {
    const container = document.getElementById('resourcesContainer');
    if (!container) return;
    
    const search = (document.getElementById('resourceSearch')?.value || '').toLowerCase();
    const catFilter = (document.getElementById('resourceCategoryFilter')?.value || '').toLowerCase();
    
    let filtered = allResources;
    if (search) {
        filtered = filtered.filter(r =>
            (r.name || '').toLowerCase().includes(search) ||
            (r.resourceId || '').toLowerCase().includes(search)
        );
    }
    if (catFilter) {
        filtered = filtered.filter(r => (r.category || '').toLowerCase() === catFilter);
    }
    
    if (filtered.length === 0) {
        container.className = '';
        container.innerHTML = `
            <div style="text-align:center;padding:60px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;">💰</span>
                <div style="font-size:17px;font-weight:800;">No Resources Found</div>
                <div style="font-size:13px;">Click "➕ Add Resource" to get started.</div>
            </div>
        `;
        return;
    }
    
    const categoryIcons = {
        cash: '💵', bank: '🏦', asset: '🏞️',
        investment: '📈', equipment: '🏢', inventory: '📦',
        precious: '💎', other: '📝'
    };
    
    const categoryNames = {
        cash: 'Cash', bank: 'Bank Account', asset: 'Asset',
        investment: 'Investment', equipment: 'Equipment', inventory: 'Inventory',
        precious: 'Precious', other: 'Other'
    };
    
    const CASH_CATEGORIES = ['cash', 'bank'];
    
    container.className = 'resource-list-modern';
    
    container.innerHTML = filtered.map(r => {
        const icon = categoryIcons[r.category] || '📝';
        const catName = categoryNames[r.category] || r.category;
        const isActive = r.status === 'active';
        const amountFormatted = formatNumber(r.amount);
        
        const isCashResource = CASH_CATEGORIES.includes(r.category);
        
        const amountLabel = isCashResource 
            ? (isActive ? 'Current Balance' : 'Closed')
            : (isActive ? 'Estimated Value' : 'Closed');
        
        // 🆕 Purpose badge (kwa accounts zilizounganishwa)
        const purposeBadge = r.purpose === 'collections'
            ? '<span class="rr-default" style="background:rgba(59,130,246,0.15);color:#3b82f6;">💰 Collections</span>'
            : r.purpose === 'operations'
            ? '<span class="rr-default" style="background:rgba(239,68,68,0.15);color:#ef4444;">💸 Payments</span>'
            : r.purpose === 'reserve'
            ? '<span class="rr-default" style="background:rgba(139,92,246,0.15);color:#8b5cf6;">🔒 Reserve</span>'
            : '';
        
        return `
            <div class="resource-row ${isActive ? '' : 'closed'}">
                
                <!-- ICON -->
                <div class="rr-icon">${icon}</div>
                
                <!-- INFO -->
                <div class="rr-info">
                    <div class="rr-info-line1">
                        <span class="rr-name">${esc(r.name)}</span>
                        <span class="rr-status ${r.status}">${esc(r.status)}</span>
                        ${purposeBadge}
                    </div>
                    <div class="rr-info-line2">
                        <span class="rr-meta">${esc(r.resourceId)}</span>
                        <span class="rr-category">${icon} ${catName}</span>
                        ${r.location ? `<span class="rr-location">📍 ${esc(r.location)}</span>` : ''}
                    </div>
                </div>
                
                <!-- AMOUNT -->
                <div class="rr-amount">
                    <div class="rr-amount-value">
                        ${r.currency || 'TZS'} ${amountFormatted}
                    </div>
                    <div class="rr-amount-label">${amountLabel}</div>
                </div>
                
                <!-- ⋯ ACTION MENU -->
                <div class="rr-menu-wrap">
                    <button class="rr-menu-btn" onclick="toggleResourceMenu(event, ${r.id})" title="Actions">
                        ⋯
                    </button>
                    <div class="rr-dropdown" id="rrDropdown_${r.id}">
                        ${isCashResource ? `
                            <button class="rr-dropdown-item" onclick="closeResourceMenu(); viewResourceTransactions(${r.id});">
                                <span class="rr-dropdown-icon">📜</span> View Transactions
                            </button>
                        ` : ''}
                        
                        ${isCashResource && isActive ? `
                            <button class="rr-dropdown-item" onclick="closeResourceMenu(); openDepositModal(${r.id});">
                                <span class="rr-dropdown-icon">📥</span> Deposit Money
                            </button>
                            <button class="rr-dropdown-item" onclick="closeResourceMenu(); openWithdrawModal(${r.id});">
                                <span class="rr-dropdown-icon">📤</span> Withdraw Money
                            </button>
                        ` : ''}
                        
                        <div class="rr-dropdown-divider"></div>
                        <button class="rr-dropdown-item" onclick="closeResourceMenu(); editResource(${r.id});">
                            <span class="rr-dropdown-icon">🖋️</span> Edit Resource
                        </button>
                        <button class="rr-dropdown-item danger" onclick="closeResourceMenu(); deleteResource(${r.id});">
                            <span class="rr-dropdown-icon">🗑️</span> Delete Resource
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
function toggleResourceMenu(event, id) {
    event.stopPropagation();
    const dropdown = document.getElementById(`rrDropdown_${id}`);
    const btn = event.currentTarget;
    const row = btn.closest('.resource-row');
    
    // Close all other dropdowns
    document.querySelectorAll('.rr-dropdown.open').forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('open');
            const otherBtn = d.previousElementSibling;
            if (otherBtn) otherBtn.classList.remove('open');
            const otherRow = d.closest('.resource-row');
            if (otherRow) otherRow.classList.remove('menu-open');
        }
    });
    
    const isOpen = dropdown.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    
    if (row) {
        row.classList.toggle('menu-open', isOpen);
    }
}

function closeResourceMenu() {
    document.querySelectorAll('.rr-dropdown.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.rr-menu-btn.open').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.resource-row.menu-open').forEach(r => r.classList.remove('menu-open'));
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.rr-menu-wrap')) {
        closeResourceMenu();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeResourceMenu();
});
function toggleResourceMenu(event, id) {
    event.stopPropagation();
    const dropdown = document.getElementById(`rrDropdown_${id}`);
    const btn = event.currentTarget;
    const row = btn.closest('.resource-row');
    
    // Close all other dropdowns
    document.querySelectorAll('.rr-dropdown.open').forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('open');
            const otherBtn = d.previousElementSibling;
            if (otherBtn) otherBtn.classList.remove('open');
            // 🆕 Toa class kwenye rows zingine
            const otherRow = d.closest('.resource-row');
            if (otherRow) otherRow.classList.remove('menu-open');
        }
    });
    
    // Toggle current
    const isOpen = dropdown.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    
    if (row) {
        row.classList.toggle('menu-open', isOpen);
    }
}

function closeResourceMenu() {
    document.querySelectorAll('.rr-dropdown.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.rr-menu-btn.open').forEach(b => b.classList.remove('open'));
    // 🆕 Toa class kwenye rows zote
    document.querySelectorAll('.resource-row.menu-open').forEach(r => r.classList.remove('menu-open'));
}
function closeResourceMenu() {
    document.querySelectorAll('.rr-dropdown.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.rr-menu-btn.open').forEach(b => b.classList.remove('open'));
}
document.addEventListener('click', function(e) {
    if (!e.target.closest('.rr-menu-wrap')) {
        closeResourceMenu();
    }
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeResourceMenu();
});
function cpPrompt(opts = {}) {
    return new Promise((resolve) => {
        const {
            title = 'Input Required',
            message = '',
            fields = [],
            okText = 'Confirm',
            cancelText = 'Cancel',
            type = 'primary'
        } = opts;

        let modal = document.getElementById('cpPromptModal');
        if (!modal) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="cp-confirm-overlay" id="cpPromptModal">
                    <div class="cp-confirm-box">
                        <div class="cp-confirm-banner" id="cpPromptBanner"></div>
                        <div class="cp-confirm-icon-wrap">
                            <div class="cp-confirm-icon primary" id="cpPromptIcon">
                                <span>?</span>
                            </div>
                        </div>
                        <div class="cp-confirm-content" style="text-align:left;">
                            <h3 class="cp-confirm-title" id="cpPromptTitle" style="text-align:center;">Input Required</h3>
                            <p class="cp-confirm-msg" id="cpPromptMsg" style="text-align:center;"></p>
                            <div id="cpPromptFields" style="margin-top:16px;"></div>
                        </div>
                        <div class="cp-confirm-actions">
                            <button class="cp-btn-confirm-cancel" id="cpPromptCancelBtn">Cancel</button>
                            <button class="cp-btn-confirm-primary" id="cpPromptOkBtn">Confirm</button>
                        </div>
                    </div>
                </div>
            `);
            modal = document.getElementById('cpPromptModal');
        }

        // Set title na message
        document.getElementById('cpPromptTitle').textContent = title;
        document.getElementById('cpPromptMsg').innerHTML = message;

        // Set banner na icon
        const banner = document.getElementById('cpPromptBanner');
        const icon = document.getElementById('cpPromptIcon');
        const iconClasses = {
            primary: 'cp-confirm-icon primary',
            success: 'cp-confirm-icon success',
            danger:  'cp-confirm-icon danger',
            warning: 'cp-confirm-icon warning',
            info:    'cp-confirm-icon info'
        };
        const bannerClasses = {
            primary: 'cp-confirm-banner',
            success: 'cp-confirm-banner success',
            danger:  'cp-confirm-banner danger',
            warning: 'cp-confirm-banner warning',
            info:    'cp-confirm-banner info'
        };
        banner.className = bannerClasses[type] || 'cp-confirm-banner';
        icon.className = iconClasses[type] || 'cp-confirm-icon primary';

        // Unda fields
        const fieldsContainer = document.getElementById('cpPromptFields');
        fieldsContainer.innerHTML = fields.map(f => {
            const req = f.required ? '<span style="color:#dc2626;">*</span>' : '';
            if (f.type === 'select') {
                return `
                    <div style="margin-bottom:14px;">
                        <label style="display:block;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${f.label} ${req}</label>
                        <select id="cpPromptField_${f.name}" style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                            ${(f.options || []).map(o => `<option value="${o.value}" ${o.value === f.default ? 'selected' : ''}>${o.label}</option>`).join('')}
                        </select>
                    </div>
                `;
            }
            return `
                <div style="margin-bottom:14px;">
                    <label style="display:block;font-size:11px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${f.label} ${req}</label>
                    <input type="${f.type || 'text'}" id="cpPromptField_${f.name}" 
                           placeholder="${f.placeholder || ''}"
                           ${f.min !== undefined ? `min="${f.min}"` : ''}
                           ${f.max !== undefined ? `max="${f.max}"` : ''}
                           style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13.5px;font-family:inherit;background:#f8fafc;">
                </div>
            `;
        }).join('');

        // Set buttons
        const okBtn = document.getElementById('cpPromptOkBtn');
        const cancelBtn = document.getElementById('cpPromptCancelBtn');
        okBtn.textContent = okText;
        cancelBtn.textContent = cancelText;

        const btnClass = {
            primary: 'cp-btn-confirm-primary',
            success: 'cp-btn-confirm-success',
            danger:  'cp-btn-confirm-danger',
            warning: 'cp-btn-confirm-warning',
            info:    'cp-btn-confirm-primary'
        };
        okBtn.className = btnClass[type] || 'cp-btn-confirm-primary';

        // Handlers
        const cleanup = () => {
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            modal.classList.remove('show');
        };

        okBtn.onclick = () => {
            const values = {};
            let hasError = false;

            fields.forEach(f => {
                const input = document.getElementById(`cpPromptField_${f.name}`);
                let val = input.value.trim();

                if (f.required && !val) {
                    input.style.borderColor = '#dc2626';
                    input.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.15)';
                    hasError = true;
                    return;
                }
                input.style.borderColor = '#e2e8f0';
                input.style.boxShadow = 'none';

                // Convert number
                if (f.type === 'number') val = parseFloat(val) || 0;

                values[f.name] = val;
            });

            if (hasError) return;

            cleanup();
            resolve({ confirmed: true, values });
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve({ confirmed: false, values: null });
        };

        modal.classList.add('show');
        setTimeout(() => {
            const firstInput = fieldsContainer.querySelector('input, select');
            if (firstInput) firstInput.focus();
        }, 200);
    });
}
function viewResourceTransactions(resourceId) {
    window.__currentResourceId = resourceId;  // 🆕 Kwa export functions
    const r = allResources.find(x => x.id === resourceId);
    if (!r) return;
    
    const rTransactions = allTransactions
        .filter(t => t.resourceId === resourceId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Unda modal
    let modal = document.getElementById('resourceTransactionsModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="resourceTransactionsModal">
                <div class="modal-box" style="max-width:780px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#0f766e,#134e4a);padding:18px 24px;color:white;display:flex;justify-content:space-between;align-items:center;">
                        <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">📜 Transaction History</h3>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <button onclick="exportTransactionsPDF()" style="padding:8px 16px;background:rgba(255,255,255,0.2);color:white;border:1.5px solid rgba(255,255,255,0.3);border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;display:inline-flex;align-items:center;gap:6px;">
                                🖨️ Print
                            </button>
                            <button onclick="exportTransactionsExcel()" style="padding:8px 16px;background:rgba(255,255,255,0.2);color:white;border:1.5px solid rgba(255,255,255,0.3);border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:12px;display:inline-flex;align-items:center;gap:6px;">
                                📥 Excel
                            </button>
                            <button onclick="closeModal('resourceTransactionsModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                        </div>
                    </div>
                    <div id="resourceTransactionsBody" style="padding:20px 24px;overflow-y:auto;flex:1;"></div>
                </div>
            </div>
        `);
        modal = document.getElementById('resourceTransactionsModal');
    }
    
    document.getElementById('resourceTransactionsBody').innerHTML = `
        <div style="margin-bottom:16px;padding:14px 18px;background:rgba(20,184,166,0.06);border-left:4px solid #14b8a6;border-radius:10px;">
            <div style="font-weight:800;color:#0f766e;font-size:15px;">${esc(r.name)}</div>
            <div style="font-size:12px;color:#64748b;font-family:monospace;margin-top:4px;">${esc(r.resourceId)}</div>
            <div style="font-size:20px;font-weight:900;color:#0f766e;margin-top:8px;">${r.currency || 'TZS'} ${Number(r.amount).toLocaleString()}</div>
        </div>
        
        ${rTransactions.length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No transactions yet.</div>' : `
            <div style="background:white;border-radius:12px;overflow:hidden;border:1px solid var(--gray-200);">
                <div style="display:grid;grid-template-columns:100px 1fr 120px 120px 120px;gap:12px;padding:12px 18px;background:var(--gray-50);border-bottom:2px solid var(--gray-200);font-size:10px;font-weight:800;color:var(--gray-500);text-transform:uppercase;">
                    <span>Type</span><span>Description</span><span>Amount</span><span>Balance After</span><span>Date</span>
                </div>
                ${rTransactions.map(t => `
                    <div style="display:grid;grid-template-columns:100px 1fr 120px 120px 120px;gap:12px;padding:12px 18px;border-bottom:1px solid var(--gray-100);font-size:12px;align-items:center;">
                        <span style="font-weight:800;color:${t.type === 'INFLOW' ? '#16a34a' : '#dc2626'};">
                            ${t.type === 'INFLOW' ? '📥 IN' : '📤 OUT'}
                        </span>
                        <div>
                            <div style="font-weight:700;">${esc(t.reference)}</div>
                            <div style="font-size:11px;color:#64748b;">${esc(t.source)} • ${esc(t.description || '')}</div>
                        </div>
                        <span style="font-weight:800;color:${t.type === 'INFLOW' ? '#16a34a' : '#dc2626'};font-family:monospace;">
                            ${t.type === 'INFLOW' ? '+' : '-'}TSh ${Number(t.amount).toLocaleString()}
                        </span>
                        <span style="font-weight:700;font-family:monospace;">TSh ${Number(t.balanceAfter).toLocaleString()}</span>
                        <span style="font-size:11px;color:#64748b;">${new Date(t.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                `).join('')}
            </div>
        `}
    `;
    
    modal.classList.add('show');
}
function exportTransactionsPDF() {
    const resourceId = window.__currentResourceId;
    const r = allResources.find(x => x.id === resourceId);
    if (!r) return;
    
    const rTransactions = allTransactions
        .filter(t => t.resourceId === resourceId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
        cpToast('Popup Blocked', 'Please allow popups to print.', 'error');
        return;
    }
    
    const rows = rTransactions.map((t, i) => `
        <tr style="border-bottom:1px solid #e5e7eb;">
            <td style="padding:8px;font-weight:700;color:#0f766e;">${String(i+1).padStart(2, '0')}</td>
            <td style="padding:8px;">
                <div style="font-weight:800;color:${t.type === 'INFLOW' ? '#16a34a' : '#dc2626'};">
                    ${t.type === 'INFLOW' ? '📥 INFLOW' : '📤 OUTFLOW'}
                </div>
            </td>
            <td style="padding:8px;font-family:monospace;">${esc(t.reference)}</td>
            <td style="padding:8px;font-size:12px;color:#64748b;">${esc(t.description || '—')}</td>
            <td style="padding:8px;text-align:right;font-weight:800;color:${t.type === 'INFLOW' ? '#16a34a' : '#dc2626'};">
                ${t.type === 'INFLOW' ? '+' : '-'}TSh ${Number(t.amount).toLocaleString()}
            </td>
            <td style="padding:8px;text-align:right;font-weight:700;font-family:monospace;">TSh ${Number(t.balanceAfter).toLocaleString()}</td>
            <td style="padding:8px;font-size:11px;color:#64748b;">${new Date(t.createdAt).toLocaleDateString('en-GB')}</td>
        </tr>
    `).join('');
    
    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Transactions — ${esc(r.name)}</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { font-family: 'Inter', Arial, sans-serif; padding: 20px; background: white; }
                table { width: 100%; border-collapse: collapse; }
                th { background: #0f766e; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
                th:last-child, th:nth-last-child(2) { text-align: right; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div style="text-align:center;margin-bottom:20px;padding-bottom:16px;border-bottom:3px solid #0f766e;">
                <h1 style="font-size:22px;font-weight:900;color:#0f766e;">MAK DC INVESTMENT COMPANY LTD</h1>
                <p style="font-size:12px;color:#64748b;margin-top:4px;">"Quality service is our priority."</p>
                <div style="margin-top:14px;">
                    <div style="font-size:16px;font-weight:800;color:#134e4a;">📜 TRANSACTION HISTORY</div>
                    <div style="font-size:13px;color:#64748b;margin-top:4px;">${esc(r.name)} (${esc(r.resourceId)})</div>
                    <div style="font-size:12px;color:#94a3b8;margin-top:2px;">Current Balance: <strong>${r.currency || 'TZS'} ${Number(r.amount).toLocaleString()}</strong></div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Generated: ${new Date().toLocaleString()}</div>
                </div>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Type</th>
                        <th>Reference</th>
                        <th>Description</th>
                        <th style="text-align:right;">Amount</th>
                        <th style="text-align:right;">Balance</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows || '<tr><td colspan="7" style="text-align:center;padding:40px;color:#94a3b8;">No transactions</td></tr>'}
                </tbody>
            </table>
            
            <div style="margin-top:20px;padding:14px;background:#f8fafc;border-radius:8px;border-left:4px solid #0f766e;text-align:center;">
                <div style="font-size:12px;color:#64748b;">Total Transactions: <strong>${rTransactions.length}</strong></div>
            </div>
            
            <div style="text-align:center;margin-top:20px;padding-top:14px;border-top:1px solid #e5e7eb;">
                <div style="font-size:10px;color:#94a3b8;">This is a computer-generated report. No signature required.</div>
                <div style="font-size:10px;color:#cbd5e1;margin-top:2px;">© 2026 MAK DC Investment Company Limited</div>
            </div>
        </body>
        </html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
}
function exportTransactionsExcel() {
    const resourceId = window.__currentResourceId;
    const r = allResources.find(x => x.id === resourceId);
    if (!r) return;
    
    const rTransactions = allTransactions
        .filter(t => t.resourceId === resourceId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (rTransactions.length === 0) {
        cpToast('No Data', 'No transactions to export.', 'warning');
        return;
    }
    
    // Unda CSV content
    const headers = ['#', 'Type', 'Reference', 'Description', 'Amount', 'Currency', 'Balance After', 'Source', 'Date'];
    const rows = rTransactions.map((t, i) => [
        i + 1,
        t.type,
        t.reference || '',
        t.description || '',
        Number(t.amount).toFixed(2),
        t.currency || 'TZS',
        Number(t.balanceAfter).toFixed(2),
        t.source || '',
        new Date(t.createdAt).toLocaleString('en-GB')
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            const str = String(cell);
            if (str.includes(',') || str.includes('"')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.resourceId}_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    cpToast('📥 Downloaded', `${rTransactions.length} transactions exported to CSV.`, 'success');
}
async function deleteResource(id) {
    const r = allResources.find(x => x.id === id);
    if (!r) {
        cpToast('Not Found', 'Resource not found.', 'error');
        return;
    }
    
    // 🆕 Zuia Main Cash
    if (r.category === 'cash' && (r.name || '').toLowerCase().includes('main cash')) {
        cpToast(
            '⭐ Cannot Delete',
            'Main Cash is the default resource and cannot be deleted.',
            'warning',
            5000
        );
        return;
    }
    
    // Angalia transactions
    const txnCount = allTransactions.filter(t => t.resourceId === id).length;
    
    if (txnCount > 0) {
        cpToast(
            '⚠️ Cannot Delete',
            `"${r.name}" has ${txnCount} transaction(s). Cannot delete for audit purposes.`,
            'warning',
            5000
        );
        return;
    }
    
    const res = await cpConfirm({
        title: '🗑️ Delete Resource?',
        message: `Are you sure you want to permanently delete "${r.name}"? This cannot be undone.`,
        detail: {
            label: 'Resource',
            value: `${r.name} • ${r.currency || 'TZS'} ${formatNumber(r.amount)}`
        },
        warn: '⚠️ <strong>Warning:</strong> This action is <strong>permanent</strong> and cannot be undone.',
        type: 'danger',
        okText: '🗑️ Delete Permanently',
        cancelText: 'Cancel'
    });
    
    if (!res.confirmed) return;
    
    try {
        await API.deleteFinancialResource(id);
        cpToast('🗑️ Deleted', `"${r.name}" has been deleted permanently.`, 'info');
        await loadFinancialResources();
    } catch (err) {
        if (err.message && err.message.toLowerCase().includes('transaction')) {
            cpToast('Cannot Delete', 'Resource has transactions. Cannot delete.', 'warning');
        } else if (err.message && err.message.toLowerCase().includes('main cash')) {
            cpToast('Cannot Delete', 'Main Cash cannot be deleted.', 'warning');
        } else {
            cpToast('Failed', err.message, 'error');
        }
    }
}
function openResourceForm() {
    window.__editingResourceId = null;
    currentResourceCategory = null;
    
    document.getElementById('resourcesListView').style.display = 'none';
    document.getElementById('resourceFormView').style.display = 'block';
    document.getElementById('resourceFormHeroTitle').textContent = 'Add Financial Resource';
    document.getElementById('resourceFormHeroSub').textContent = 'Record a new company asset or resource.';
    document.getElementById('resourceDetailsCard').style.display = 'none';
    document.getElementById('resourceFormActions').style.display = 'none';
    document.getElementById('resCategory').value = '';
    document.getElementById('resName').value = '';
    document.getElementById('resLocation').value = '';
    document.getElementById('resDescription').value = '';
    document.getElementById('dynamicFields').innerHTML = '';
    
    document.querySelectorAll('.category-option').forEach(el => el.classList.remove('selected'));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeResourceForm() {
    console.log('🔙 Closing resource form...');
    
    const listView = document.getElementById('resourcesListView');
    const formView = document.getElementById('resourceFormView');
    
    if (listView) {
        listView.style.display = 'block';
        console.log('✅ List view shown');
    } else {
        console.error('❌ #resourcesListView not found');
    }
    
    if (formView) {
        formView.style.display = 'none';
        console.log('✅ Form view hidden');
    } else {
        console.error('❌ #resourceFormView not found');
    }
    
    window.__editingResourceId = null;
    currentResourceCategory = null;
    
    // Reset form
    const resName = document.getElementById('resName');
    if (resName) resName.value = '';
    
    const resLocation = document.getElementById('resLocation');
    if (resLocation) resLocation.value = '';
    
    const resDescription = document.getElementById('resDescription');
    if (resDescription) resDescription.value = '';
    
    document.querySelectorAll('.category-option').forEach(el => el.classList.remove('selected'));
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectCategory(cat) {
    currentResourceCategory = cat;
    document.getElementById('resCategory').value = cat;
    
    document.querySelectorAll('.category-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.cat === cat);
    });
    
    renderDynamicFields(cat);
    setTimeout(attachAllNumberFormatters, 50);
    
    document.getElementById('resourceDetailsCard').style.display = 'block';
    document.getElementById('resourceFormActions').style.display = 'flex';
    
    const titles = {
        cash: '💵 Cash Details',
        bank: '🏦 Bank Account Details',
        asset: '🏞️ Asset Details',
        investment: '📈 Investment Details',
        equipment: '🏢 Equipment Details',
        inventory: '📦 Inventory Details',
        precious: '💎 Precious Item Details',
        other: '📝 Other Details'
    };
    document.getElementById('detailsCardTitle').textContent = titles[cat] || 'Resource Details';
    
    document.getElementById('resourceDetailsCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderDynamicFields(cat) {
    const container = document.getElementById('dynamicFields');
    
    const templates = {
        cash: `
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Currency <span class="req">*</span></label>
                    <select id="resCurrency" required>
                        <option value="TZS">TZS — Tanzanian Shilling</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Initial Amount <span class="req">*</span></label>
                    <input type="text" id="resAmount" inputmode="decimal" placeholder="0.00">
                    <small class="res-hint">Amount of money available</small>
                </div>
            </div>
        `,
        bank: `
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Bank Name <span class="req">*</span></label>
                    <input type="text" id="resBankName" placeholder="e.g., CRDB, NMB, NBC" required>
                </div>
                <div class="res-field-group">
                    <label>Account Number <span class="req">*</span></label>
                    <input type="text" id="resAccountNumber" placeholder="e.g., 0150123456789" required>
                </div>
            </div>
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Currency <span class="req">*</span></label>
                    <select id="resCurrency" required>
                        <option value="TZS">TZS — Tanzanian Shilling</option>
                        <option value="USD">USD — US Dollar</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Initial Balance <span class="req">*</span></label>
                    <input type="text" id="resAmount" inputmode="decimal" placeholder="0.00" required>
                </div>
            </div>
        `,
        asset: `
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Asset Type <span class="req">*</span></label>
                    <select id="resAssetType" required>
                        <option value="">— Select Type —</option>
                        <option value="vehicle">🚗 Vehicle</option>
                        <option value="building">🏢 Building</option>
                        <option value="land">🏞️ Land</option>
                        <option value="machinery">⚙️ Machinery</option>
                        <option value="furniture">🪑 Furniture</option>
                        <option value="other">📝 Other</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Estimated Value (TZS) <span class="req">*</span></label>
                    <input type="text" id="resAmount" inputmode="decimal" placeholder="0.00" required>
                    <small class="res-hint">Current market value</small>
                </div>
            </div>
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Condition</label>
                    <select id="resCondition">
                        <option value="new">🆕 New</option>
                        <option value="good">✅ Good</option>
                        <option value="fair">⚠️ Fair</option>
                        <option value="poor">❌ Poor</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Year Acquired</label>
                    <input type="text" id="resYear" placeholder="e.g., 2020">
                </div>
            </div>
        `,
        equipment: `
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Equipment Type <span class="req">*</span></label>
                    <select id="resEquipmentType" required>
                        <option value="">— Select Type —</option>
                        <option value="computer">💻 Computer</option>
                        <option value="printer">🖨️ Printer</option>
                        <option value="phone">📱 Phone</option>
                        <option value="furniture">🪑 Furniture</option>
                        <option value="machine">⚙️ Machine</option>
                        <option value="tool">🔧 Tool</option>
                        <option value="other">📝 Other</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Quantity <span class="req">*</span></label>
                    <input type="number" id="resQuantity" placeholder="1" min="1" value="1" required>
                </div>
            </div>
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Unit Value (TZS) <span class="req">*</span></label>
                    <input type="text" id="resAmount" inputmode="decimal" placeholder="0.00" required>
                    <small class="res-hint">Value per unit</small>
                </div>
                <div class="res-field-group">
                    <label>Condition</label>
                    <select id="resCondition">
                        <option value="new">🆕 New</option>
                        <option value="good">✅ Good</option>
                        <option value="fair">⚠️ Fair</option>
                        <option value="poor">❌ Poor</option>
                    </select>
                </div>
            </div>
        `,
        investment: `
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Investment Type <span class="req">*</span></label>
                    <select id="resInvestmentType" required>
                        <option value="">— Select Type —</option>
                        <option value="shares">📊 Shares</option>
                        <option value="bonds">📜 Bonds</option>
                        <option value="mutual_fund">💰 Mutual Fund</option>
                        <option value="real_estate">🏢 Real Estate</option>
                        <option value="other">📝 Other</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Currency <span class="req">*</span></label>
                    <select id="resCurrency" required>
                        <option value="TZS">TZS</option>
                        <option value="USD">USD</option>
                    </select>
                </div>
            </div>
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Amount Invested <span class="req">*</span></label>
                    <input type="text" id="resAmount" inputmode="decimal" placeholder="0.00" required>
                </div>
                <div class="res-field-group">
                    <label>Date Invested</label>
                    <input type="date" id="resDate">
                </div>
            </div>
        `,
        inventory: `
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Item Type <span class="req">*</span></label>
                    <input type="text" id="resItemType" placeholder="e.g., Cement, Rice, etc." required>
                </div>
                <div class="res-field-group">
                    <label>Quantity <span class="req">*</span></label>
                    <input type="number" id="resQuantity" placeholder="0" min="0" required>
                </div>
            </div>
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Unit Cost (TZS) <span class="req">*</span></label>
                    <input type="text" id="resUnitCost" inputmode="decimal" placeholder="0.00" required>
                </div>
                <div class="res-field-group">
                    <label>Total Value (TZS)</label>
                    <input type="text" id="resTotalValueDisplay" placeholder="Auto-calculated" readonly style="background:var(--gray-100);font-weight:800;color:#0f766e;">
                    <input type="hidden" id="resAmount">
                </div>
            </div>
        `,
        precious: `
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Type <span class="req">*</span></label>
                    <select id="resPreciousType" required>
                        <option value="">— Select —</option>
                        <option value="gold">🥇 Gold</option>
                        <option value="diamond">💎 Diamond</option>
                        <option value="silver">🥈 Silver</option>
                        <option value="other">📝 Other</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Weight</label>
                    <input type="text" id="resWeight" inputmode="decimal" placeholder="0.00">
                </div>
            </div>
            <div class="res-field-row">
                <div class="res-field-group">
                    <label>Unit</label>
                    <select id="resWeightUnit">
                        <option value="g">Gram (g)</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="carat">Carat (ct)</option>
                        <option value="oz">Ounce (oz)</option>
                    </select>
                </div>
                <div class="res-field-group">
                    <label>Estimated Value (TZS) <span class="req">*</span></label>
                    <input type="text" id="resAmount" inputmode="decimal" placeholder="0.00" required>
                </div>
            </div>
        `,
        other: `
            <div class="res-field-group">
                <label>Estimated Value (TZS) <span class="req">*</span></label>
                <input type="text" id="resAmount" inputmode="decimal" placeholder="0.00" required>
            </div>
        `
    };
    
    container.innerHTML = templates[cat] || '';
    
    if (cat === 'inventory') {
        const qtyInput = document.getElementById('resQuantity');
        const costInput = document.getElementById('resUnitCost');
        const display = document.getElementById('resTotalValueDisplay');
        const hidden = document.getElementById('resAmount');
        
        const update = () => {
            const qty = parseFloat(qtyInput?.value) || 0;
            const cost = parseFormattedNumber(costInput?.value) || 0;
            const total = qty * cost;
            if (display) display.value = `TSh ${total.toLocaleString()}`;
            if (hidden) hidden.value = total;
        };
        
        qtyInput?.addEventListener('input', update);
        costInput?.addEventListener('input', update);
    }
}

async function saveResource(e) {
    e.preventDefault();
    
    const statusDiv = document.getElementById('resFormStatus');
    const status = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
        statusDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    
    const category = document.getElementById('resCategory').value;
    const name = document.getElementById('resName').value.trim();
    const amount = parseFormattedNumber(document.getElementById('resAmount')?.value);
    const location = document.getElementById('resLocation').value.trim();
    const description = document.getElementById('resDescription').value.trim();
    
    if (!category) return status('⚠ Please select a category');
    if (!name) return status('⚠ Resource name is required');
    if (name.toLowerCase().includes('main cash')) {return status('⚠ "Main Cash" is a reserved name and cannot be used. Please choose a different name.');}
    if (amount < 0) return status('⚠ Amount cannot be negative');
    
    const payload = {
        name,
        category,
        amount,
        currency: document.getElementById('resCurrency')?.value || 'TZS',
        location: location || null,
        description: description || null,
        status: 'active',
        createdBy: currentUser?.fullName || 'Finance Officer'
    };
    
    const bankName = document.getElementById('resBankName')?.value;
    if (bankName) payload.location = `${bankName}${location ? ' - ' + location : ''}`;
    
    const accountNumber = document.getElementById('resAccountNumber')?.value;
    if (accountNumber) payload.description = `Account: ${accountNumber}\n${description}`.trim();
    
    const subType = document.getElementById('resAssetType')?.value
                 || document.getElementById('resEquipmentType')?.value
                 || document.getElementById('resInvestmentType')?.value
                 || document.getElementById('resPreciousType')?.value;
    if (subType) payload.description = `Type: ${subType}\n${payload.description || ''}`.trim();
    
    const condition = document.getElementById('resCondition')?.value;
    if (condition) payload.description = `Condition: ${condition}\n${payload.description || ''}`.trim();
    
    const quantity = document.getElementById('resQuantity')?.value;
    if (quantity) payload.description = `Quantity: ${quantity}\n${payload.description || ''}`.trim();
    
    try {
        if (window.__editingResourceId) {
            await API.updateFinancialResource(window.__editingResourceId, payload);
            cpToast('✅ Updated', `${name} has been updated.`, 'success');
        } else {
            await API.createFinancialResource(payload);
            cpToast('✅ Created', `${name} has been added.`, 'success');
        }
        
        closeResourceForm();
        await loadFinancialResources();
    } catch (err) {
        status('⚠ ' + err.message, 'error');
    }
}

function editResource(id) {
    const r = allResources.find(x => x.id === id);
    if (!r) { cpToast('Not Found', 'Resource not found.', 'error'); return; }
    
    const isMainCash = r.category === 'cash' && (r.name || '').toLowerCase().includes('main cash');
    if (isMainCash) {
        cpToast(
            '⭐ Cannot Edit',
            'Main Cash is the default resource and cannot be edited.',
            'warning',
            5000
        );
        return;
    }
    window.__editingResourceId = id;
    currentResourceCategory = r.category;
    
    document.getElementById('resourcesListView').style.display = 'none';
    document.getElementById('resourceFormView').style.display = 'block';
    document.getElementById('resourceFormHeroTitle').textContent = 'Edit Financial Resource';
    document.getElementById('resourceFormHeroSub').textContent = 'Update resource details.';
    
    document.getElementById('resCategory').value = r.category;
    document.querySelectorAll('.category-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.cat === r.category);
    });
    
    renderDynamicFields(r.category);
    
    setTimeout(() => {
        document.getElementById('resName').value = r.name || '';
        document.getElementById('resLocation').value = r.location || '';
        document.getElementById('resDescription').value = r.description || '';
        
        const currencyEl = document.getElementById('resCurrency');
        if (currencyEl) currencyEl.value = r.currency || 'TZS';
        const amountEl = document.getElementById('resAmount');
        if (amountEl) amountEl.value = r.amount || 0;
    }, 100);
    
    document.getElementById('resourceDetailsCard').style.display = 'block';
    document.getElementById('resourceFormActions').style.display = 'flex';
    
    const titles = {
        cash: '💵 Cash Details',
        bank: '🏦 Bank Account Details',
        asset: '🏞️ Asset Details',
        investment: '📈 Investment Details',
        equipment: '🏢 Equipment Details',
        inventory: '📦 Inventory Details',
        precious: '💎 Precious Item Details',
        other: '📝 Other Details'
    };
    document.getElementById('detailsCardTitle').textContent = titles[r.category] || 'Resource Details';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterResources() {
    renderResourcesList();
}
async function openDepositModal(resourceId) {
    const resource = allResources?.find(r => String(r.id) === String(resourceId));
    if (!resource) {
        cpToast('Not Found', 'Resource not found', 'error');
        return;
    }

    const res = await cpPrompt({
        title: '📥 Deposit Money',
        message: `Deposit into <strong>${esc(resource.name)}</strong>`,
        fields: [
            {
                name: 'amount',
                label: 'Amount (TSh)',
                type: 'number',
                placeholder: '0',
                required: true,
                min: 1
            },
            {
                name: 'description',
                label: 'Description',
                type: 'text',
                placeholder: 'e.g., Capital injection, Bank interest',
                required: true
            },
            {
                name: 'category',
                label: 'Category',
                type: 'select',
                options: [
                    { value: 'capital', label: '💰 Capital Injection' },
                    { value: 'interest', label: '🏦 Bank Interest' },
                    { value: 'transfer', label: '🔁 Cash Transfer' },
                    { value: 'correction', label: '🔧 Correction' },
                    { value: 'other', label: '📝 Other' }
                ],
                default: 'capital'
            }
        ],
        okText: '📥 Deposit',
        type: 'success'
    });

    if (!res.confirmed) return;

    try {
        const result = await API.depositToResource(resourceId, {
            amount: res.values.amount,
            description: res.values.description,
            category: res.values.category
        });

        cpToast('📥 Deposit Recorded',
            `TSh ${Number(res.values.amount).toLocaleString()} added to ${resource.name}`,
            'success');

        await loadFinancialResources();
        if (typeof loadTransactions === 'function') await loadTransactions();

    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function openWithdrawModal(resourceId) {
    const resource = allResources?.find(r => String(r.id) === String(resourceId));
    if (!resource) {
        cpToast('Not Found', 'Resource not found', 'error');
        return;
    }

    const balance = Number(resource.amount || 0);

    const res = await cpPrompt({
        title: '📤 Withdraw Money',
        message: `Withdraw from <strong>${esc(resource.name)}</strong><br>
                  <small style="color:var(--gray-500);">Available: TSh ${balance.toLocaleString()}</small>`,
        fields: [
            {
                name: 'amount',
                label: 'Amount (TSh)',
                type: 'number',
                placeholder: '0',
                required: true,
                min: 1,
                max: balance
            },
            {
                name: 'description',
                label: 'Description',
                type: 'text',
                placeholder: 'e.g., Owner withdrawal, Bank charges',
                required: true
            },
            {
                name: 'category',
                label: 'Category',
                type: 'select',
                options: [
                    { value: 'owner', label: '👤 Owner Withdrawal' },
                    { value: 'bank_charges', label: '🏦 Bank Charges' },
                    { value: 'tax', label: '📊 Tax Payment' },
                    { value: 'transfer', label: '🔁 Cash Transfer' },
                    { value: 'correction', label: '🔧 Correction' },
                    { value: 'other', label: '📝 Other' }
                ],
                default: 'owner'
            }
        ],
        okText: '📤 Withdraw',
        type: 'danger'
    });

    if (!res.confirmed) return;

    try {
        const result = await API.withdrawFromResource(resourceId, {
            amount: res.values.amount,
            description: res.values.description,
            category: res.values.category
        });

        cpToast('📤 Withdrawal Recorded',
            `TSh ${Number(res.values.amount).toLocaleString()} withdrawn from ${resource.name}`,
            'success');

        await loadFinancialResources();
        if (typeof loadTransactions === 'function') await loadTransactions();

    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}
let allFundTransfers = [];
let currentFTFilter = { search: '', status: '' };

async function loadFundTransfers() {
    const container = document.getElementById('fundTransfersContainer');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:50px;color:var(--gray-400);">⏳ Loading transfers...</div>';

    try {
        const transfers = await API.getFundTransfers();
        allFundTransfers = Array.isArray(transfers) ? transfers : [];
        allFundTransfers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        // Update badges
        const pending = allFundTransfers.filter(t => t.status === 'pending-manager' || t.status === 'pending-ceo').length;
        setText('navFundTransferBadge', pending);
        setText('ftCountBadge', allFundTransfers.length);

        renderFundTransfersList();

    } catch (err) {
        console.error('❌ loadFundTransfers error:', err);
        container.innerHTML = `<div style="text-align:center;padding:50px;color:var(--red);">Error: ${esc(err.message)}</div>`;
    }
}

function filterFundTransfers() {
    currentFTFilter.search = (document.getElementById('ftSearchInput')?.value || '').toLowerCase().trim();
    currentFTFilter.status = document.getElementById('ftStatusFilter')?.value || '';
    renderFundTransfersList();
}

function renderFundTransfersList() {
    const container = document.getElementById('fundTransfersContainer');
    if (!container) return;

    let filtered = allFundTransfers;

    if (currentFTFilter.search) {
        const s = currentFTFilter.search;
        filtered = filtered.filter(t =>
            (t.transferId || '').toLowerCase().includes(s) ||
            (t.reason || '').toLowerCase().includes(s) ||
            (t.fromAccount?.name || '').toLowerCase().includes(s) ||
            (t.toAccount?.name || '').toLowerCase().includes(s)
        );
    }
    if (currentFTFilter.status) {
        filtered = filtered.filter(t => t.status === currentFTFilter.status);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--gray-400);">
                <span style="font-size:56px;display:block;margin-bottom:14px;opacity:0.5;">💸</span>
                <div style="font-size:17px;font-weight:800;color:var(--gray-600);margin-bottom:6px;">
                    ${allFundTransfers.length === 0 ? 'No Fund Transfers Yet' : 'No Transfers Match Filters'}
                </div>
                <div style="font-size:13px;">
                    ${allFundTransfers.length === 0
                        ? 'Click "➕ New Transfer" to create your first transfer.'
                        : 'Try adjusting your search or filter.'}
                </div>
            </div>
        `;
        return;
    }

    const statusInfo = {
        'draft':           { icon: '📝', label: 'Draft',           color: '#64748b' },
        'pending-manager': { icon: '🟡', label: 'Pending Manager', color: '#d97706' },
        'pending-ceo':     { icon: '🟠', label: 'Pending CEO',     color: '#c2410c' },
        'approved':        { icon: '🟢', label: 'Approved',        color: '#14b8a6' },
        'completed':       { icon: '✅', label: 'Completed',       color: '#16a34a' },
        'rejected':        { icon: '❌', label: 'Rejected',        color: '#dc2626' }
    };

    const userRole = (currentUser?.role || '').toLowerCase();
    const isFinance = userRole.includes('finance');

    container.innerHTML = filtered.map(t => {
        const sInfo = statusInfo[t.status] || statusInfo['draft'];
        const createdDate = t.createdAt ? new Date(t.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

        let actions = `<button onclick="viewFundTransfer('${t.id}')" style="background:rgba(15,118,110,0.1);color:#0f766e;">👁 View</button>`;
        if (t.status === 'draft' && isFinance) {
            actions += `<button onclick="openEditTransferModal('${t.id}')" style="background:rgba(245,158,11,0.1);color:#d97706;">🖋️ Edit</button>`;
            actions += `<button onclick="sendTransferToManager('${t.id}')" style="background:rgba(15,118,110,0.12);color:#0f766e;">📤 Send to Manager</button>`;
            actions += `<button onclick="deleteDraftTransfer('${t.id}')" style="background:rgba(239,68,68,0.1);color:#dc2626;">🗑️ Delete</button>`;
        }
        if (t.status === 'approved' && isFinance) {
            actions += `<button onclick="executeTransfer('${t.id}')" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:white;">💸 Execute Transfer</button>`;
        }
        if (t.status === 'completed') {
            actions += `<button onclick="viewTransferNotice('${t.id}')" style="background:linear-gradient(135deg,#0f766e,#134e4a);color:white;">📄 View Notice</button>`;
        }

        return `
            <div class="ft-card status-${t.status}">
                <div class="ft-header">
                    <div style="flex:1;min-width:220px;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                            <span class="ft-ref">${esc(t.transferId)}</span>
                            <span class="ft-badge status-${t.status}">${sInfo.icon} ${sInfo.label}</span>
                        </div>
                        ${t.reason ? `<div style="font-size:13px;color:#475569;line-height:1.5;margin-bottom:6px;">${esc(t.reason)}</div>` : ''}
                        <div style="font-size:11px;color:#94a3b8;">
                            📅 Created: <strong style="color:#64748b;">${createdDate}</strong> • 👤 ${esc(t.createdBy || '—')}
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div class="ft-amount">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div class="ft-from-to">
                    <div class="ft-account">
                        <div class="ft-account-label">📤 From</div>
                        <div class="ft-account-name">${esc(t.fromAccount?.name || '—')}</div>
                        <div class="ft-account-number">${esc(t.fromAccount?.accountNumber || '')}</div>
                    </div>
                    <div class="ft-arrow">→</div>
                    <div class="ft-account">
                        <div class="ft-account-label">📥 To</div>
                        <div class="ft-account-name">${esc(t.toAccount?.name || '—')}</div>
                        <div class="ft-account-number">${esc(t.toAccount?.accountNumber || '')}</div>
                    </div>
                </div>

                ${renderTransferTimeline(t)}

                ${t.status === 'rejected' && t.rejectionReason ? `
                    <div style="margin-top:12px;padding:10px 14px;background:rgba(239,68,68,0.08);border-radius:8px;border-left:3px solid #ef4444;font-size:12px;color:#7f1d1d;line-height:1.5;">
                        <strong style="display:block;margin-bottom:3px;color:#dc2626;font-size:10px;text-transform:uppercase;">Rejection Reason</strong>
                        ${esc(t.rejectionReason)}
                    </div>
                ` : ''}

                <div class="ft-actions">${actions}</div>
            </div>
        `;
    }).join('');
}

function renderTransferTimeline(t) {
    const steps = [];

    steps.push({
        done: true, icon: '📝',
        label: 'Created by Finance',
        meta: `${t.createdBy || '—'} • ${t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}`
    });

    if (t.status === 'draft') {
        steps.push({ current: true, icon: '🖋️', label: 'Draft — Not Yet Sent', meta: 'You can still edit this transfer' });
        return wrapTransferTimeline(steps);
    }

    if (t.sentToManagerAt) {
        steps.push({ done: true, icon: '📤', label: 'Sent to Manager', meta: `${t.sentToManagerBy || '—'} • ${new Date(t.sentToManagerAt).toLocaleString()}` });
    }

    if (t.status === 'pending-manager') {
        steps.push({ current: true, icon: '⏳', label: 'Awaiting Manager Verification', meta: 'Pending review' });
    } else if (t.managerVerifiedAt) {
        steps.push({ done: true, icon: '✅', label: 'Verified by Manager', meta: `${t.managerVerifiedBy || '—'} • ${new Date(t.managerVerifiedAt).toLocaleString()}` });
    }

    if (t.status === 'pending-ceo') {
        steps.push({ current: true, icon: '⏳', label: 'Awaiting CEO Approval', meta: 'Pending review' });
    } else if (t.ceoApprovedAt) {
        steps.push({ done: true, icon: '✅', label: 'Approved by CEO', meta: `${t.ceoApprovedBy || '—'} • ${new Date(t.ceoApprovedAt).toLocaleString()}` });
    }

    if (t.status === 'approved') {
        steps.push({ current: true, icon: '⏳', label: 'Ready to Execute', meta: 'Click Execute Transfer' });
    }

    if (t.status === 'completed' && t.executedAt) {
        steps.push({ done: true, icon: '💸', label: 'Transfer Executed', meta: `${t.executedBy || '—'} • ${new Date(t.executedAt).toLocaleString()}` });
    }

    if (t.status === 'rejected') {
        steps.push({ rejected: true, icon: '❌', label: `Rejected by ${t.rejectedBy || '—'}`, meta: `${t.rejectedAt ? new Date(t.rejectedAt).toLocaleString() : ''}` });
    }

    return wrapTransferTimeline(steps);
}

function wrapTransferTimeline(steps) {
    return `
        <div class="cp-timeline" style="margin-top:12px;">
            <div class="cp-timeline-title">📊 Approval Timeline</div>
            ${steps.map(s => `
                <div class="cp-timeline-step">
                    <div class="cp-timeline-dot ${s.done ? 'done' : s.current ? 'current' : s.rejected ? 'rejected' : ''}">${s.icon}</div>
                    <div class="cp-timeline-info">
                        <div class="cp-timeline-label">${s.label}</div>
                        <div class="cp-timeline-meta">${s.meta}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function openAddTransferModal() {
    // Pata accounts zilizoidhinishwa
    const accounts = await API.getAccounts().catch(() => []);
    const approvedAccounts = accounts.filter(a => a.status === 'approved' && a.isActive);

    // 🆕 Filter by purpose
    const collectionAccounts = approvedAccounts.filter(a => a.purpose === 'collections');
    const operationsAccounts = approvedAccounts.filter(a => a.purpose === 'operations');

    if (collectionAccounts.length === 0) {
        cpToast(
            'No Collection Account',
            'You need at least one approved "Collections" account to transfer from. Please create one in Finance → Accounts.',
            'warning',
            6000
        );
        return;
    }

    if (operationsAccounts.length === 0) {
        cpToast(
            'No Operations Account',
            'You need at least one approved "Operations" account to transfer to. Please create one in Finance → Accounts.',
            'warning',
            6000
        );
        return;
    }

    let modal = document.getElementById('fundTransferFormModal');
    if (!modal) {
        const html = `
            <div class="modal-overlay" id="fundTransferFormModal">
                <div class="modal-box" style="max-width:600px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:14px;">
                            <div style="width:48px;height:48px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">💸</div>
                            <div>
                                <h3 id="ftFormTitle" style="font-size:18px;font-weight:800;color:white;margin:0 0 2px 0;">New Fund Transfer</h3>
                                <p style="font-size:12px;color:rgba(255,255,255,0.85);margin:0;">Move money from Collections → Operations</p>
                            </div>
                        </div>
                        <button onclick="closeModal('fundTransferFormModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div style="padding:22px 26px;overflow-y:auto;flex:1;">
                        
                        <div class="cp-form-group">
                            <label>💰 From (Collection Account) <span class="req">*</span></label>
                            <select id="ftFromAccount" onchange="updateFTBalance()"></select>
                            <small style="font-size:11px;color:var(--gray-500);margin-top:4px;display:block;">Fedha zinatoka kwenye account hii (Collections pekee)</small>
                        </div>

                        <!-- 🆕 BALANCE DISPLAY -->
                        <div id="ftBalanceBox" style="display:none;margin:10px 0;padding:12px 16px;background:linear-gradient(135deg,rgba(15,118,110,0.06),rgba(20,184,166,0.02));border:1.5px solid rgba(15,118,110,0.15);border-left:4px solid #0f766e;border-radius:10px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <div style="font-size:9px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:3px;">💰 Available Balance</div>
                                    <div style="font-size:18px;font-weight:900;color:#0f766e;font-family:'Courier New',monospace;" id="ftBalanceValue">TSh 0</div>
                                </div>
                                <div id="ftBalanceWarning" style="display:none;padding:6px 12px;background:rgba(220,38,38,0.1);border:1.5px solid rgba(220,38,38,0.3);border-radius:8px;font-size:11px;font-weight:800;color:#dc2626;">
                                    ⚠️ INSUFFICIENT
                                </div>
                                <div id="ftBalanceOk" style="display:none;padding:6px 12px;background:rgba(34,197,94,0.1);border:1.5px solid rgba(34,197,94,0.3);border-radius:8px;font-size:11px;font-weight:800;color:#16a34a;">
                                    ✅ OK
                                </div>
                            </div>
                        </div>

                        <div style="text-align:center;margin:10px 0;font-size:20px;color:#0f766e;">↓</div>

                        <div class="cp-form-group">
                            <label>💸 To (Operations Account) <span class="req">*</span></label>
                            <select id="ftToAccount"></select>
                            <small style="font-size:11px;color:var(--gray-500);margin-top:4px;display:block;">Fedha zinaenda kwenye account hii (Operations pekee)</small>
                        </div>

                        <div class="cp-form-group">
                            <label>Amount (TSh) <span class="req">*</span></label>
                            <input type="number" id="ftAmount" placeholder="0" min="1" oninput="updateFTBalance()">
                        </div>

                        <div class="cp-form-group">
                            <label>Reason / Purpose</label>
                            <textarea id="ftReason" placeholder="e.g., Kwa malipo ya payroll na company payments"></textarea>
                        </div>

                        <div id="ftFormStatus" class="status-msg"></div>
                    </div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;gap:12px;justify-content:flex-end;flex-shrink:0;">
                        <button onclick="closeModal('fundTransferFormModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>
                        <button onclick="saveFundTransfer()" style="padding:11px 24px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">💾 Save Transfer</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        modal = document.getElementById('fundTransferFormModal');
    }

    const fromSelect = document.getElementById('ftFromAccount');
    const toSelect = document.getElementById('ftToAccount');
    // FROM: Collections PEKEE
    fromSelect.innerHTML = collectionAccounts.map(a => {
        const icon = a.type === 'Bank' ? '🏦' : a.type === 'Mobile Money' ? '📱' : '💵';
        return `<option value="${a.id}" data-balance="${a.balance || 0}" data-currency="${a.currency || 'TZS'}" data-name="${esc(a.name)}">${icon} ${esc(a.name)} — ${a.currency} ${Number(a.balance || 0).toLocaleString()}</option>`;
    }).join('');

    // TO: Operations PEKEE
    toSelect.innerHTML = operationsAccounts.map(a => {
        const icon = a.type === 'Bank' ? '🏦' : a.type === 'Mobile Money' ? '📱' : '💵';
        return `<option value="${a.id}">${icon} ${esc(a.name)} — ${a.currency} ${Number(a.balance || 0).toLocaleString()}</option>`;
    }).join('');

    // Set default
    if (collectionAccounts.length > 0) fromSelect.value = collectionAccounts[0].id;
    if (operationsAccounts.length > 0) toSelect.value = operationsAccounts[0].id;

    document.getElementById('ftFormTitle').textContent = 'New Fund Transfer';
    document.getElementById('ftAmount').value = '';
    document.getElementById('ftReason').value = '';
    document.getElementById('ftFormStatus').className = 'status-msg';
    document.getElementById('ftFormStatus').textContent = '';

    window.__editingTransferId = null;

    modal.classList.add('show');
}

async function saveFundTransfer() {
    const statusDiv = document.getElementById('ftFormStatus');
    const status = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
    };

    const fromAccountId = parseInt(document.getElementById('ftFromAccount').value);
    const toAccountId = parseInt(document.getElementById('ftToAccount').value);
    const amount = parseFloat(document.getElementById('ftAmount').value);
    const reason = document.getElementById('ftReason').value.trim();

    if (!fromAccountId || !toAccountId) return status('⚠ Please select both accounts');
    if (fromAccountId === toAccountId) return status('⚠ From and To accounts cannot be the same');
    if (!amount || amount <= 0) return status('⚠ Amount must be greater than 0');

    // 🆕 Angalia balance ya from account
    const fromSelect = document.getElementById('ftFromAccount');
    const selectedOpt = fromSelect.options[fromSelect.selectedIndex];
    const fromBalance = Number(selectedOpt?.dataset.balance || 0);
    const currency = selectedOpt?.dataset.currency || 'TZS';

    if (amount > fromBalance) {
        const shortage = amount - fromBalance;
        return status(`⚠ Insufficient balance. Available: ${formatBalance(fromBalance, currency)}. Shortage: ${formatBalance(shortage, currency)}`);
    }
    const payload = {
        fromAccountId,
        toAccountId,
        amount,
        reason: reason || null,
        status: 'draft'
    };

    try {
        await API.createFundTransfer(payload);
        closeModal('fundTransferFormModal');
        cpToast('✅ Transfer Created', 'Draft transfer saved. You can now send it to Manager.', 'success');
        await loadFundTransfers();
    } catch (err) {
        status('⚠ ' + err.message, 'error');
    }
}

async function sendTransferToManager(id) {
    const t = allFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const res = await cpConfirm({
        title: '📤 Send to Manager?',
        message: `Transfer ${t.transferId} (${t.currency} ${Number(t.amount).toLocaleString()}) will be sent to Manager for verification.`,
        detail: {
            label: 'Transfer',
            value: `${t.fromAccount?.name} → ${t.toAccount?.name}`
        },
        warn: '⚠️ <strong>Important:</strong> Once sent, you cannot edit this transfer.',
        type: 'primary',
        okText: '📤 Send Now',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    try {
        await API.sendFundTransferToManager(id);
        cpToast('📤 Sent to Manager', 'Transfer sent for verification.', 'success');
        await loadFundTransfers();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function executeTransfer(id) {
    const t = allFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const res = await cpConfirm({
        title: '💸 Execute Transfer?',
        message: `Execute transfer ${t.transferId}? Money will be moved from "${t.fromAccount?.name}" to "${t.toAccount?.name}".`,
        detail: {
            label: 'Amount',
            value: `${t.currency} ${Number(t.amount).toLocaleString()}`
        },
        warn: '⚠️ <strong>Important:</strong> This action will <strong>actually move money</strong> between accounts and cannot be undone.',
        type: 'success',
        okText: '💸 Yes, Execute',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    try {
        const result = await API.executeFundTransfer(id);
        cpToast('✅ Transfer Completed',
            `${t.transferId} executed. Notice: ${result.notice?.noticeId}`,
            'success', 5000);
        await loadFundTransfers();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}

async function deleteDraftTransfer(id) {
    const t = allFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const res = await cpConfirm({
        title: '🗑️ Delete Draft?',
        message: `Delete draft transfer ${t.transferId}? This cannot be undone.`,
        type: 'danger',
        okText: '🗑️ Delete',
        cancelText: 'Keep it'
    });

    if (!res.confirmed) return;

    try {
        await API.deleteFundTransfer(id);
        cpToast('🗑️ Deleted', 'Draft transfer deleted.', 'info');
        await loadFundTransfers();
    } catch (err) {
        cpToast('Failed', err.message, 'error');
    }
}
// 🆕 Update Fund Transfer Balance Display
function updateFTBalance() {
    const select = document.getElementById('ftFromAccount');
    const amountInput = document.getElementById('ftAmount');
    const box = document.getElementById('ftBalanceBox');
    const valueEl = document.getElementById('ftBalanceValue');
    const warnEl = document.getElementById('ftBalanceWarning');
    const okEl = document.getElementById('ftBalanceOk');

    if (!select || !box) return;

    const selectedOpt = select.options[select.selectedIndex];
    if (!selectedOpt || !selectedOpt.value) {
        box.style.display = 'none';
        return;
    }

    const balance = Number(selectedOpt.dataset.balance || 0);
    const currency = selectedOpt.dataset.currency || 'TZS';
    const transferAmount = parseFloat(amountInput?.value) || 0;

    valueEl.textContent = formatBalance(balance, currency);
    box.style.display = 'block';

    if (transferAmount > 0 && transferAmount > balance) {
        warnEl.style.display = 'inline-block';
        okEl.style.display = 'none';
        box.style.borderLeftColor = '#dc2626';
        box.style.background = 'linear-gradient(135deg,rgba(220,38,38,0.06),rgba(220,38,38,0.02))';
    } else if (transferAmount > 0) {
        warnEl.style.display = 'none';
        okEl.style.display = 'inline-block';
        box.style.borderLeftColor = '#22c55e';
        box.style.background = 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(34,197,94,0.02))';
    } else {
        warnEl.style.display = 'none';
        okEl.style.display = 'none';
        box.style.borderLeftColor = '#0f766e';
        box.style.background = 'linear-gradient(135deg,rgba(15,118,110,0.06),rgba(20,184,166,0.02))';
    }
}

function viewFundTransfer(id) {
    const t = allFundTransfers.find(x => String(x.id) === String(id));
    if (!t) { cpToast('Not Found', 'Transfer not found.', 'error'); return; }

    const sInfo = {
        'draft':           { icon: '📝', label: 'Draft',           color: '#64748b' },
        'pending-manager': { icon: '🟡', label: 'Pending Manager', color: '#d97706' },
        'pending-ceo':     { icon: '🟠', label: 'Pending CEO',     color: '#c2410c' },
        'approved':        { icon: '🟢', label: 'Approved',        color: '#14b8a6' },
        'completed':       { icon: '✅', label: 'Completed',       color: '#16a34a' },
        'rejected':        { icon: '❌', label: 'Rejected',        color: '#dc2626' }
    }[t.status] || { icon: '📝', label: 'Unknown', color: '#64748b' };

    let modal = document.getElementById('ftViewModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="ftViewModal">
                <div class="modal-box" style="max-width:600px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;">
                    <div style="background:linear-gradient(135deg,#0f766e,#134e4a);padding:20px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <h3 style="font-size:18px;font-weight:800;color:white;margin:0;">💸 Transfer Details</h3>
                        <button onclick="closeModal('ftViewModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="ftViewBody" style="padding:22px 26px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;">
                        <button onclick="closeModal('ftViewModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('ftViewModal');
    }

    document.getElementById('ftViewBody').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:14px 18px;background:${sInfo.color}20;border-radius:10px;border-left:4px solid ${sInfo.color};">
            <div style="font-size:12px;font-weight:700;color:${sInfo.color};text-transform:uppercase;">Status</div>
            <div style="font-size:14px;font-weight:800;color:${sInfo.color};">${sInfo.icon} ${sInfo.label}</div>
        </div>

        <div class="info-row"><span class="label">Transfer ID</span><span class="value" style="font-family:monospace;">${esc(t.transferId)}</span></div>
        <div class="info-row"><span class="label">From Account</span><span class="value">${esc(t.fromAccount?.name || '—')} • ${esc(t.fromAccount?.accountNumber || '')}</span></div>
        <div class="info-row"><span class="label">To Account</span><span class="value">${esc(t.toAccount?.name || '—')} • ${esc(t.toAccount?.accountNumber || '')}</span></div>
        <div class="info-row"><span class="label">Amount</span><span class="value" style="color:#4f46e5;font-weight:900;font-size:16px;">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</span></div>
        <div class="info-row"><span class="label">Created By</span><span class="value">${esc(t.createdBy || '—')}</span></div>
        <div class="info-row"><span class="label">Created At</span><span class="value">${t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'}</span></div>

        ${t.reason ? `<div style="margin-top:14px;padding:12px 16px;background:var(--gray-50);border-radius:8px;border-left:3px solid #0f766e;font-size:13px;color:var(--gray-700);line-height:1.6;"><strong style="display:block;margin-bottom:4px;color:#4f46e5;font-size:11px;text-transform:uppercase;">Reason</strong>${esc(t.reason)}</div>` : ''}

        <div style="margin-top:20px;">
            <div style="font-size:11px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--gray-100);">📊 Approval Timeline</div>
            ${renderTransferTimeline(t)}
        </div>
    `;

    modal.classList.add('show');
}

async function editDraftPayroll(id) { /* placeholder - existing function */ }

function viewTransferNotice(id) {
    const t = allFundTransfers.find(x => String(x.id) === String(id));
    if (!t) { cpToast('Not Found', 'Transfer not found.', 'error'); return; }

    let modal = document.getElementById('transferNoticeModal');
    if (!modal) {
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" id="transferNoticeModal">
                <div class="modal-box" style="max-width:820px;padding:0;overflow:hidden;max-height:92vh;display:flex;flex-direction:column;background:#f1f5f9;">
                    <div style="background:linear-gradient(135deg,#0f766e,#134e4a);padding:18px 26px;color:white;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;">📄</div>
                            <div>
                                <h3 style="font-size:17px;font-weight:800;color:white;margin:0;">Transfer Notice</h3>
                                <p style="font-size:12px;color:rgba(255,255,255,0.8);margin:0;">Official transfer record</p>
                            </div>
                        </div>
                        <button onclick="closeModal('transferNoticeModal')" style="background:rgba(255,255,255,0.2);border:none;color:white;width:34px;height:34px;border-radius:50%;font-size:18px;cursor:pointer;">✕</button>
                    </div>
                    <div id="transferNoticeBody" style="padding:20px;overflow-y:auto;flex:1;"></div>
                    <div style="padding:14px 26px;background:#ffffff;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end;flex-shrink:0;flex-wrap:wrap;">
                        <button onclick="closeModal('transferNoticeModal')" style="padding:11px 24px;background:#e5e7eb;color:#475569;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">Close</button>
                        <button onclick="printTransferNotice('${id}')" style="padding:11px 24px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">🖨️ Print</button>
                        <button onclick="downloadTransferNotice('${id}')" style="padding:11px 24px;background:linear-gradient(135deg,#4f46e5,#4338ca);color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-family:inherit;font-size:13px;">📥 Download PDF</button>
                    </div>
                </div>
            </div>
        `);
        modal = document.getElementById('transferNoticeModal');
    }

    document.getElementById('transferNoticeBody').innerHTML = buildTransferNoticeHTML(t);
    modal.classList.add('show');
}

function buildTransferNoticeHTML(t) {
    const createdDate = t.createdAt ? new Date(t.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const executedDate = t.executedAt ? new Date(t.executedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
    const logoUrl = 'assets/makdc-logo.jpg';

    return `
        <div style="background:white;font-family:'Inter',Arial,sans-serif;max-width:210mm;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
            <!-- HEADER -->
            <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:24px 32px;color:white;position:relative;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
                    <div style="display:flex;gap:14px;align-items:center;">
                        <div style="width:56px;height:56px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;overflow:hidden;border:3px solid #f59e0b;flex-shrink:0;">
                            <img src="${logoUrl}" alt="MAK DC" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
                                 onerror="this.style.display='none';this.parentElement.innerHTML='<span style=&quot;font-size:16px;font-weight:900;color:#0f766e;&quot;>MAK</span>';">
                        </div>
                        <div>
                            <div style="font-size:16px;font-weight:900;letter-spacing:-0.3px;line-height:1.1;">MAK DC Investment</div>
                            <div style="font-size:9px;font-weight:800;letter-spacing:1.5px;color:#f59e0b;margin-top:2px;">COMPANY LIMITED</div>
                            <div style="font-size:10px;font-style:italic;opacity:0.75;margin-top:2px;">"Quality service is our priority."</div>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:9px;font-weight:800;letter-spacing:1.5px;opacity:0.85;text-transform:uppercase;">Fund Transfer Notice</div>
                        <div style="font-family:monospace;font-size:14px;font-weight:900;color:#fbbf24;margin-top:4px;">${esc(t.noticeId || '—')}</div>
                        <div style="display:inline-block;margin-top:6px;padding:3px 12px;background:rgba(34,197,94,0.25);border:1.5px solid #22c55e;border-radius:12px;font-size:8px;font-weight:900;letter-spacing:1px;">✓ COMPLETED</div>
                    </div>
                </div>
            </div>

            <div style="height:4px;background:linear-gradient(90deg,#f59e0b,#fbbf24,#0f766e);"></div>

            <div style="padding:24px 32px;">
                <div style="font-size:10px;font-weight:900;color:#4f46e5;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:14px;">📋 Transfer Information</div>
                
                <div class="info-row"><span class="label">Transfer ID</span><span class="value" style="font-family:monospace;">${esc(t.transferId)}</span></div>
                <div class="info-row"><span class="label">Notice ID</span><span class="value" style="font-family:monospace;color:#4f46e5;">${esc(t.noticeId || '—')}</span></div>
                <div class="info-row"><span class="label">Status</span><span class="value" style="color:#16a34a;">✅ Completed</span></div>
                <div class="info-row"><span class="label">Created At</span><span class="value">${createdDate}</span></div>
                <div class="info-row"><span class="label">Executed At</span><span class="value">${executedDate}</span></div>

                <div style="margin-top:20px;font-size:10px;font-weight:900;color:#4f46e5;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:14px;">💸 Accounts Involved</div>

                <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;margin-bottom:16px;border-left:4px solid #ef4444;">
                    <div style="font-size:9px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">📤 FROM</div>
                    <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:4px;">${esc(t.fromAccount?.name || '—')}</div>
                    <div style="font-size:12px;color:#64748b;font-family:monospace;">${esc(t.fromAccount?.accountNumber || '—')}</div>
                    <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px dashed #cbd5e1;">
                        <span style="font-size:11px;color:#64748b;">Balance Before:</span>
                        <span style="font-size:13px;font-weight:800;font-family:monospace;">${t.currency || 'TZS'} ${Number(t.fromBalanceBefore || 0).toLocaleString()}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:6px;">
                        <span style="font-size:11px;color:#64748b;">Balance After:</span>
                        <span style="font-size:13px;font-weight:800;font-family:monospace;color:#dc2626;">${t.currency || 'TZS'} ${Number(t.fromBalanceAfter || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div style="background:#f8fafc;border-radius:10px;padding:16px 18px;margin-bottom:16px;border-left:4px solid #22c55e;">
                    <div style="font-size:9px;font-weight:900;color:#16a34a;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;">📥 TO</div>
                    <div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:4px;">${esc(t.toAccount?.name || '—')}</div>
                    <div style="font-size:12px;color:#64748b;font-family:monospace;">${esc(t.toAccount?.accountNumber || '—')}</div>
                    <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px dashed #cbd5e1;">
                        <span style="font-size:11px;color:#64748b;">Balance Before:</span>
                        <span style="font-size:13px;font-weight:800;font-family:monospace;">${t.currency || 'TZS'} ${Number(t.toBalanceBefore || 0).toLocaleString()}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:6px;">
                        <span style="font-size:11px;color:#64748b;">Balance After:</span>
                        <span style="font-size:13px;font-weight:800;font-family:monospace;color:#16a34a;">${t.currency || 'TZS'} ${Number(t.toBalanceAfter || 0).toLocaleString()}</span>
                    </div>
                </div>

                <div style="background:linear-gradient(135deg,#0f766e,#134e4a);color:white;padding:16px 22px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <div style="font-size:9px;font-weight:800;letter-spacing:2px;opacity:0.85;text-transform:uppercase;">Amount Transferred</div>
                        <div style="font-size:10px;opacity:0.7;margin-top:2px;">Successfully moved</div>
                    </div>
                    <div style="font-size:24px;font-weight:900;color:#fbbf24;font-family:monospace;letter-spacing:-0.5px;">${t.currency || 'TZS'} ${Number(t.amount || 0).toLocaleString()}</div>
                </div>

                ${t.reason ? `
                <div style="margin-top:16px;">
                    <div style="font-size:10px;font-weight:900;color:#4f46e5;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:10px;">📝 Reason</div>
                    <div style="font-size:12px;line-height:1.5;color:#475569;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #0f766e;">${esc(t.reason)}</div>
                </div>` : ''}

                <div style="margin-top:20px;">
                    <div style="font-size:10px;font-weight:900;color:#4f46e5;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:6px;border-bottom:2px solid #f1f5f9;margin-bottom:12px;">✅ Approval Chain</div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
                        <div style="background:#f8fafc;border-radius:8px;padding:10px;border-left:3px solid #64748b;text-align:center;">
                            <div style="font-size:8px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">📝 Created</div>
                            <div style="font-size:11px;font-weight:800;color:#1e293b;">${esc(t.createdBy || '—')}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:8px;padding:10px;border-left:3px solid #f59e0b;text-align:center;">
                            <div style="font-size:8px;font-weight:900;color:#d97706;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">🟡 Verified</div>
                            <div style="font-size:11px;font-weight:800;color:#1e293b;">${esc(t.managerVerifiedBy || '—')}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:8px;padding:10px;border-left:3px solid #22c55e;text-align:center;">
                            <div style="font-size:8px;font-weight:900;color:#16a34a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">🟢 Approved</div>
                            <div style="font-size:11px;font-weight:800;color:#1e293b;">${esc(t.ceoApprovedBy || '—')}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:8px;padding:10px;border-left:3px solid #0f766e;text-align:center;">
                            <div style="font-size:8px;font-weight:900;color:#4f46e5;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">💸 Executed</div>
                            <div style="font-size:11px;font-weight:800;color:#1e293b;">${esc(t.executedBy || '—')}</div>
                        </div>
                    </div>
                </div>

                <div style="margin-top:20px;padding:12px 16px;background:rgba(15,118,110,0.06);border-radius:8px;border-left:3px solid #0f766e;font-size:11px;color:#134e4a;line-height:1.5;">
                    <strong style="display:block;margin-bottom:4px;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;">📌 Important Note</strong>
                    This transfer has been fully authorized and executed. All information is accurate as of the date of issue.
                </div>

                <div style="margin-top:20px;padding-top:16px;border-top:2px dashed #e2e8f0;text-align:center;">
                    <div style="font-size:10px;color:#94a3b8;">This is a computer-generated notice. No signature required.</div>
                    <div style="font-size:9px;color:#cbd5e1;margin-top:4px;">© 2026 MAK DC Investment Company Limited — All rights reserved.</div>
                    <div style="font-size:9px;color:#cbd5e1;font-style:italic;margin-top:2px;">"Quality service is our priority."</div>
                </div>
            </div>
        </div>
    `;
}

function printTransferNotice(id) {
    const t = allFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
        cpToast('Popup Blocked', 'Please allow popups to print.', 'error');
        return;
    }

    w.document.write(`<!DOCTYPE html>
        <html>
        <head>
            <title>Transfer Notice - ${esc(t.transferId)}</title>
            <meta charset="UTF-8">
            <style>
                @page { size: A4; margin: 8mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                html, body { font-family: 'Inter', Arial, sans-serif; background: #f1f5f9; padding: 20px; }
                body > div { max-width: 194mm; margin: 0 auto; }
                .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; gap: 10px; }
                .info-row .label { color: #64748b; font-weight: 600; }
                .info-row .value { font-weight: 700; color: #1e293b; text-align: right; }
                @media print {
                    html, body { background: white; padding: 0; }
                    body > div { max-width: 100%; }
                }
            </style>
        </head>
        <body>${buildTransferNoticeHTML(t)}</body>
        </html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
}

function downloadTransferNotice(id) {
    const t = allFundTransfers.find(x => String(x.id) === String(id));
    if (!t) return;

    if (typeof html2pdf === 'undefined') {
        cpToast('Loading Library', 'PDF library is loading... please wait', 'info');
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => _generateTransferNoticePDF(t);
        script.onerror = () => cpToast('Library Failed', 'Cannot load PDF library.', 'error');
        document.head.appendChild(script);
        return;
    }

    _generateTransferNoticePDF(t);
}

function _generateTransferNoticePDF(t) {
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '210mm';
    tempContainer.style.background = 'white';
    tempContainer.innerHTML = buildTransferNoticeHTML(t);
    document.body.appendChild(tempContainer);

    cpToast('⏳ Generating PDF', 'Please wait...', 'info', 2000);

    const opt = {
        margin: [8, 8, 8, 8],
        filename: `${t.noticeId || t.transferId}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css'], avoid: 'div, p' }
    };

    html2pdf()
        .set(opt)
        .from(tempContainer.firstElementChild)
        .save()
        .then(() => {
            cpToast('✅ Downloaded', `${t.noticeId || t.transferId}.pdf saved.`, 'success');
            document.body.removeChild(tempContainer);
        })
        .catch((err) => {
            console.error('PDF error:', err);
            cpToast('PDF Failed', 'Failed to generate PDF.', 'error');
            document.body.removeChild(tempContainer);
        });
}

let currentFinanceReport = null;
let currentReportType = 'cash-flow';

function setReportType(type) {
    currentReportType = type;
    const select = document.getElementById('reportType');
    if (select) select.value = type;
    loadFinanceReport();
}
function switchReportType() {
    const select = document.getElementById('reportType');
    if (select) {
        currentReportType = select.value;
        loadFinanceReport();
    }
}
async function loadFinanceReport() {
    const period = document.getElementById('reportPeriod')?.value || 'monthly';
    const loadingEl = document.getElementById('reportLoading');
    const contentEl = document.getElementById('reportContent');

    // 🆕 Jenga params
    const params = { period };
    
    if (period === 'custom') {
        const from = document.getElementById('reportFromDate')?.value;
        const to = document.getElementById('reportToDate')?.value;
        
        if (!from || !to) {
            cpToast('Missing Dates', 'Please select both From and To dates.', 'warning');
            return;
        }
        
        if (new Date(from) > new Date(to)) {
            cpToast('Invalid Range', 'From date must be before To date.', 'warning');
            return;
        }
        
        params.from = from;
        params.to = to;
    }

    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.opacity = '0.3';

    try {
        let data = null;
        let title = '';
        let icon = '';

        switch (currentReportType) {
            case 'cash-flow':
                data = await API.getCashFlowReport(params);
                title = '💵 Cash Flow Report';
                icon = '💵';
                break;
            case 'payroll':
                data = await API.getPayrollReport(params);
                title = '💰 Payroll Report';
                icon = '💰';
                break;
            case 'fund-transfers':
                data = await API.getFundTransferReport(params);
                title = '💸 Fund Transfer Report';
                icon = '💸';
                break;
            case 'company-payments':
                data = await API.getCompanyPaymentsReport(params);
                title = '🏢 Company Payments Report';
                icon = '🏢';
                break;
            case 'financial-summary':
                data = await API.getFinancialSummaryReport(params);
                title = '📊 Financial Summary Report';
                icon = '📊';
                break;
            case 'reconciliation':
                data = await API.getReconciliationReport(params);
                title = '🔍 Reconciliation Report';
                icon = '🔍';
                break;
            case 'overall':
                data = await API.getOverallReport(params);
                title = '📋 Overall Report';
                icon = '📋';
                break;
            default:
                data = await API.getCashFlowReport(params);
                title = '💵 Cash Flow Report';
                icon = '💵';
        }

        currentFinanceReport = { type: currentReportType, data, period, params };

        setText('reportPeriodTitle', title);
        setText('reportPeriodSubtitle', data?.period?.label || '—');
        setText('reportPeriodIcon', icon);

        renderFinanceReport(data);

    } catch (err) {
        console.error('❌ loadFinanceReport error:', err);
        if (contentEl) {
            contentEl.innerHTML = `
                <div style="text-align:center;padding:50px;color:#dc2626;">
                    <div style="font-size:50px;margin-bottom:14px;">❌</div>
                    <div style="font-size:16px;font-weight:700;">Failed to Load Report</div>
                    <div style="font-size:13px;color:#64748b;margin-top:6px;">${esc(err.message)}</div>
                </div>`;
        }
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.opacity = '1';
    }
}
function renderFinanceReport(data) {
    const container = document.getElementById('reportContent');
    if (!container || !data) return;

    switch (currentReportType) {
        case 'cash-flow':
            renderCashFlowReport(data, container);
            break;
        case 'payroll':
            renderPayrollReport(data, container);
            break;
        case 'fund-transfers':
            renderFundTransferReport(data, container);
            break;
        case 'company-payments':
            renderCompanyPaymentsReport(data, container);
            break;
        case 'financial-summary':
            renderFinancialSummaryReport(data, container);
            break;
        case 'reconciliation':
            renderReconciliationReport(data, container);
            break;
        case 'overall':
            renderOverallReport(data, container);
            break;
    }
}
function renderCashFlowReport(data, container) {
    const s = data.summary || {};
    container.innerHTML = `
        <!-- KPI Cards -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #22c55e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📥 Total Inflow</div>
                <div style="font-size:22px;font-weight:900;color:#16a34a;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalInflow || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #ef4444;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📤 Total Outflow</div>
                <div style="font-size:22px;font-weight:900;color:#dc2626;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalOutflow || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #0f766e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📊 Net Change</div>
                <div style="font-size:22px;font-weight:900;color:${s.netChange >= 0 ? '#16a34a' : '#dc2626'};margin-top:6px;font-family:monospace;">${s.netChange >= 0 ? '+' : ''}TSh ${Number(s.netChange || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #f59e0b;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">💰 Current Balance</div>
                <div style="font-size:22px;font-weight:900;color:#0f766e;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalBalance || 0).toLocaleString()}</div>
            </div>
        </div>

        <!-- Sources Breakdown -->
        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📊 Breakdown by Source</h2>
            </div>
            <div class="orders-body">
                ${(data.sources || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                                <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Source</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Inflow</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Outflow</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Count</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.sources.map(src => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;">${src.source}</td>
                                    <td style="padding:10px;text-align:right;color:#16a34a;font-weight:800;font-family:monospace;">TSh ${Number(src.inflow).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:#dc2626;font-weight:800;font-family:monospace;">TSh ${Number(src.outflow).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:#64748b;font-weight:600;">${src.count}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>

        <!-- Resources Breakdown -->
        <div class="orders-section">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>🏦 Breakdown by Resource</h2>
            </div>
            <div class="orders-body">
                ${(data.resources || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                                <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Resource</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Inflow</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Outflow</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Net</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.resources.map(r => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;">${r.name}</td>
                                    <td style="padding:10px;text-align:right;color:#16a34a;font-weight:800;font-family:monospace;">TSh ${Number(r.inflow).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:#dc2626;font-weight:800;font-family:monospace;">TSh ${Number(r.outflow).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:${(r.inflow - r.outflow) >= 0 ? '#16a34a' : '#dc2626'};font-weight:800;font-family:monospace;">${(r.inflow - r.outflow) >= 0 ? '+' : ''}TSh ${Number(r.inflow - r.outflow).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}
function updateCPBalance() {
    const select = document.getElementById('cpFormAccount');
    const amountInput = document.getElementById('cpFormAmount');
    const box = document.getElementById('cpBalanceBox');
    const valueEl = document.getElementById('cpBalanceValue');
    const warnEl = document.getElementById('cpBalanceWarning');
    const okEl = document.getElementById('cpBalanceOk');

    if (!select || !box) return;

    const selectedOpt = select.options[select.selectedIndex];
    if (!selectedOpt || !selectedOpt.value) {
        box.style.display = 'none';
        return;
    }

    const balance = Number(selectedOpt.dataset.balance || 0);
    const currency = selectedOpt.dataset.currency || 'TZS';
    const paymentAmount = parseFloat(amountInput?.value) || 0;

    valueEl.textContent = formatBalance(balance, currency);
    box.style.display = 'block';

    // 🆕 Angalia kama amount inatosha
    if (paymentAmount > 0 && paymentAmount > balance) {
        warnEl.style.display = 'inline-block';
        okEl.style.display = 'none';
        box.style.borderLeftColor = '#dc2626';
        box.style.background = 'linear-gradient(135deg,rgba(220,38,38,0.06),rgba(220,38,38,0.02))';
    } else if (paymentAmount > 0) {
        warnEl.style.display = 'none';
        okEl.style.display = 'inline-block';
        box.style.borderLeftColor = '#22c55e';
        box.style.background = 'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(34,197,94,0.02))';
    } else {
        warnEl.style.display = 'none';
        okEl.style.display = 'none';
        box.style.borderLeftColor = '#0f766e';
        box.style.background = 'linear-gradient(135deg,rgba(15,118,110,0.06),rgba(20,184,166,0.02))';
    }
}
function renderPayrollReport(data, container) {
    const s = data.summary || {};
    const st = data.statusBreakdown || {};

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #0f766e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📋 Total Payrolls</div>
                <div style="font-size:22px;font-weight:900;color:#0f766e;margin-top:6px;font-family:monospace;">${s.totalPayrolls || 0}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #f59e0b;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">💰 Total Amount</div>
                <div style="font-size:22px;font-weight:900;color:#d97706;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalAmount || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #22c55e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">✅ Paid Amount</div>
                <div style="font-size:22px;font-weight:900;color:#16a34a;margin-top:6px;font-family:monospace;">TSh ${Number(s.paidAmount || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #3b82f6;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">👥 Total Employees</div>
                <div style="font-size:22px;font-weight:900;color:#2563eb;margin-top:6px;font-family:monospace;">${s.totalEmployees || 0}</div>
            </div>
        </div>

        <!-- Status Breakdown -->
        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📊 Status Breakdown</h2>
            </div>
            <div class="orders-body">
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                    ${Object.entries(st).map(([key, val]) => {
                        const labels = {
                            draft: '📝 Draft', pendingManager: '🟡 Pending Manager',
                            pendingCeo: '🟠 Pending CEO', approved: '🟢 Approved',
                            paid: '✅ Paid', rejected: '❌ Rejected'
                        };
                        return `
                            <div style="background:var(--gray-50);padding:14px;border-radius:10px;border:1px solid var(--gray-200);text-align:center;">
                                <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">${labels[key] || key}</div>
                                <div style="font-size:20px;font-weight:900;color:#0f766e;font-family:monospace;margin-top:4px;">${val}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>

        <!-- Recent Payrolls -->
        <div class="orders-section">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📋 Recent Payrolls</h2>
            </div>
            <div class="orders-body">
                ${(data.recentPayrolls || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No payrolls</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                                <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Payroll ID</th>
                                <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Period</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                                <th style="padding:10px;text-align:center;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.recentPayrolls.map(p => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-family:monospace;font-weight:700;color:#0f766e;">${p.payrollId}</td>
                                    <td style="padding:10px;color:#334155;">${p.month}/${p.year}</td>
                                    <td style="padding:10px;text-align:right;font-weight:800;color:#0f766e;font-family:monospace;">TSh ${Number(p.amount).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:center;"><span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;background:rgba(15,118,110,0.1);color:#0f766e;text-transform:uppercase;">${p.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}
function renderFundTransferReport(data, container) {
    const s = data.summary || {};
    const st = data.statusBreakdown || {};

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #0f766e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">💸 Total Transfers</div>
                <div style="font-size:22px;font-weight:900;color:#0f766e;margin-top:6px;font-family:monospace;">${s.totalTransfers || 0}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #f59e0b;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">💰 Total Amount</div>
                <div style="font-size:22px;font-weight:900;color:#d97706;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalAmount || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #22c55e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">✅ Completed</div>
                <div style="font-size:22px;font-weight:900;color:#16a34a;margin-top:6px;font-family:monospace;">TSh ${Number(s.completedAmount || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #3b82f6;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📊 Average</div>
                <div style="font-size:22px;font-weight:900;color:#2563eb;margin-top:6px;font-family:monospace;">TSh ${Number(s.averageTransfer || 0).toLocaleString()}</div>
            </div>
        </div>

        <!-- Status -->
        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📊 Status Breakdown</h2>
            </div>
            <div class="orders-body">
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
                    ${Object.entries(st).map(([key, val]) => {
                        const labels = {
                            draft: '📝 Draft', pendingManager: '🟡 Pending Manager',
                            pendingCeo: '🟠 Pending CEO', approved: '🟢 Approved',
                            completed: '✅ Completed', rejected: '❌ Rejected'
                        };
                        return `
                            <div style="background:var(--gray-50);padding:14px;border-radius:10px;border:1px solid var(--gray-200);text-align:center;">
                                <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">${labels[key] || key}</div>
                                <div style="font-size:20px;font-weight:900;color:#0f766e;font-family:monospace;margin-top:4px;">${val}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>

        <!-- Account Pairs -->
        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>🔄 Top Transfer Pairs</h2>
            </div>
            <div class="orders-body">
                ${(data.accountPairs || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                                <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">From → To</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Count</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.accountPairs.map(p => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;">${p.pair}</td>
                                    <td style="padding:10px;text-align:right;color:#64748b;">${p.count}</td>
                                    <td style="padding:10px;text-align:right;font-weight:800;color:#0f766e;font-family:monospace;">TSh ${Number(p.amount).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>

        <!-- Recent -->
        <div class="orders-section">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📋 Recent Transfers</h2>
            </div>
            <div class="orders-body">
                ${(data.recentTransfers || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No transfers</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                                <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Transfer ID</th>
                                <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">From → To</th>
                                <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                                <th style="padding:10px;text-align:center;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.recentTransfers.map(t => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-family:monospace;font-weight:700;color:#0f766e;">${t.transferId}</td>
                                    <td style="padding:10px;font-size:12px;color:#334155;">${t.from} → ${t.to}</td>
                                    <td style="padding:10px;text-align:right;font-weight:800;color:#0f766e;font-family:monospace;">TSh ${Number(t.amount).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:center;"><span style="font-size:10px;font-weight:800;padding:4px 10px;border-radius:10px;background:rgba(15,118,110,0.1);color:#0f766e;text-transform:uppercase;">${t.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}
function renderCompanyPaymentsReport(data, container) {
    const s = data.summary || {};
    const st = data.statusBreakdown || {};

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #0f766e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">🏢 Total Payments</div>
                <div style="font-size:22px;font-weight:900;color:#0f766e;margin-top:6px;font-family:monospace;">${s.totalPayments || 0}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #f59e0b;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">💰 Total Amount</div>
                <div style="font-size:22px;font-weight:900;color:#d97706;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalAmount || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #22c55e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">✅ Paid</div>
                <div style="font-size:22px;font-weight:900;color:#16a34a;margin-top:6px;font-family:monospace;">TSh ${Number(s.paidAmount || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #dc2626;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">⏳ Pending</div>
                <div style="font-size:22px;font-weight:900;color:#dc2626;margin-top:6px;font-family:monospace;">TSh ${Number(s.pendingAmount || 0).toLocaleString()}</div>
            </div>
        </div>

        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📊 Breakdown by Type</h2>
            </div>
            <div class="orders-body">
                ${(data.byType || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                            <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Type</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Count</th>
                        </tr></thead>
                        <tbody>
                            ${data.byType.map(t => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;text-transform:capitalize;">${t.type}</td>
                                    <td style="padding:10px;text-align:right;color:#0f766e;font-weight:800;font-family:monospace;">TSh ${Number(t.amount).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:#64748b;">${t.count}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>

        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>🏪 Top Vendors</h2>
            </div>
            <div class="orders-body">
                ${(data.byVendor || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                            <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Vendor</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Count</th>
                        </tr></thead>
                        <tbody>
                            ${data.byVendor.map(v => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;">${v.vendor}</td>
                                    <td style="padding:10px;text-align:right;color:#0f766e;font-weight:800;font-family:monospace;">TSh ${Number(v.amount).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:#64748b;">${v.count}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>

        <div class="orders-section">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📈 Monthly Trend</h2>
            </div>
            <div class="orders-body">
                ${(data.monthlyTrend || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                            <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Month</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Count</th>
                        </tr></thead>
                        <tbody>
                            ${data.monthlyTrend.map(m => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;">${m.month}/${m.year}</td>
                                    <td style="padding:10px;text-align:right;color:#0f766e;font-weight:800;font-family:monospace;">TSh ${Number(m.amount).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:#64748b;">${m.count}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}
function renderFinancialSummaryReport(data, container) {
    const s = data.summary || {};

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #0f766e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">💰 Total Resources</div>
                <div style="font-size:22px;font-weight:900;color:#0f766e;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalResources || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #3b82f6;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📊 Net Worth</div>
                <div style="font-size:22px;font-weight:900;color:#2563eb;margin-top:6px;font-family:monospace;">TSh ${Number(s.netWorth || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #22c55e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📥 Inflow</div>
                <div style="font-size:22px;font-weight:900;color:#16a34a;margin-top:6px;font-family:monospace;">+TSh ${Number(s.totalInflow || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #dc2626;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📤 Outflow</div>
                <div style="font-size:22px;font-weight:900;color:#dc2626;margin-top:6px;font-family:monospace;">-TSh ${Number(s.totalOutflow || 0).toLocaleString()}</div>
            </div>
        </div>

        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>📁 Resources by Category</h2>
            </div>
            <div class="orders-body">
                ${(data.byCategory || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                            <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Category</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Count</th>
                        </tr></thead>
                        <tbody>
                            ${data.byCategory.map(c => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;text-transform:capitalize;">${c.category}</td>
                                    <td style="padding:10px;text-align:right;color:#0f766e;font-weight:800;font-family:monospace;">TSh ${Number(c.amount).toLocaleString()}</td>
                                    <td style="padding:10px;text-align:right;color:#64748b;">${c.count}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>

        <div class="orders-section">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>🏆 Top Resources</h2>
            </div>
            <div class="orders-body">
                ${(data.topResources || []).length === 0 ? '<div style="text-align:center;padding:40px;color:#94a3b8;">No data</div>' : `
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:var(--gray-50);border-bottom:2px solid var(--gray-200);">
                            <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Resource</th>
                            <th style="padding:10px;text-align:left;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Category</th>
                            <th style="padding:10px;text-align:right;font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;">Amount</th>
                        </tr></thead>
                        <tbody>
                            ${data.topResources.map(r => `
                                <tr style="border-bottom:1px solid var(--gray-100);">
                                    <td style="padding:10px;font-weight:700;color:#1e293b;">${r.name}</td>
                                    <td style="padding:10px;color:#64748b;text-transform:capitalize;">${r.category}</td>
                                    <td style="padding:10px;text-align:right;color:#0f766e;font-weight:800;font-family:monospace;">${r.currency} ${Number(r.amount).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
        </div>
    `;
}
function renderReconciliationReport(data, container) {
    const s = data.summary || {};
    const discrepancies = data.discrepancies || [];

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:20px;">
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #3b82f6;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">💰 Total Sales</div>
                <div style="font-size:22px;font-weight:900;color:#2563eb;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalSales || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid #22c55e;">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📥 Payments Received</div>
                <div style="font-size:22px;font-weight:900;color:#16a34a;margin-top:6px;font-family:monospace;">TSh ${Number(s.totalPaymentsReceived || 0).toLocaleString()}</div>
            </div>
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);border-left:4px solid ${Math.abs(s.salesVsPaymentsDiff || 0) > 1 ? '#dc2626' : '#22c55e'};">
                <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">⚠️ Difference</div>
                <div style="font-size:22px;font-weight:900;color:${Math.abs(s.salesVsPaymentsDiff || 0) > 1 ? '#dc2626' : '#16a34a'};margin-top:6px;font-family:monospace;">${(s.salesVsPaymentsDiff || 0) >= 0 ? '+' : ''}TSh ${Number(s.salesVsPaymentsDiff || 0).toLocaleString()}</div>
            </div>
        </div>

        <div class="orders-section" style="margin-bottom:20px;">
            <div class="orders-header" style="background:linear-gradient(135deg,#0f766e,#134e4a);">
                <h2>🔍 Discrepancies ${discrepancies.length > 0 ? `(${discrepancies.length})` : ''}</h2>
            </div>
            <div class="orders-body">
                ${discrepancies.length === 0 ? `
                    <div style="text-align:center;padding:60px 20px;">
                        <div style="font-size:60px;margin-bottom:14px;">✅</div>
                        <div style="font-size:17px;font-weight:800;color:#16a34a;">All Reconciles!</div>
                        <div style="font-size:13px;color:#64748b;margin-top:6px;">No discrepancies found in this period.</div>
                    </div>
                ` : `
                    ${discrepancies.map(d => `
                        <div style="padding:16px 20px;background:${d.severity === 'high' ? 'rgba(220,38,38,0.06)' : 'rgba(245,158,11,0.06)'};border-left:4px solid ${d.severity === 'high' ? '#dc2626' : '#f59e0b'};border-radius:10px;margin-bottom:12px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                                <div style="font-weight:800;color:${d.severity === 'high' ? '#dc2626' : '#d97706'};font-size:14px;">⚠️ ${d.type}</div>
                                <span style="font-size:10px;font-weight:800;padding:3px 10px;border-radius:10px;background:${d.severity === 'high' ? 'rgba(220,38,38,0.15)' : 'rgba(245,158,11,0.15)'};color:${d.severity === 'high' ? '#dc2626' : '#d97706'};text-transform:uppercase;">${d.severity} severity</span>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;font-size:12px;">
                                <div><span style="color:#64748b;">Expected:</span> <strong style="color:#1e293b;font-family:monospace;">TSh ${Number(d.expected).toLocaleString()}</strong></div>
                                <div><span style="color:#64748b;">Actual:</span> <strong style="color:#1e293b;font-family:monospace;">TSh ${Number(d.actual).toLocaleString()}</strong></div>
                                <div><span style="color:#64748b;">Difference:</span> <strong style="color:${d.severity === 'high' ? '#dc2626' : '#d97706'};font-family:monospace;">${d.difference >= 0 ? '+' : ''}TSh ${Number(d.difference).toLocaleString()}</strong></div>
                            </div>
                        </div>
                    `).join('')}
                `}
            </div>
        </div>
    `;
}
function printFinanceReport() {
    if (!currentFinanceReport || !currentFinanceReport.data) {
        cpToast('No Data', 'Load a report first.', 'warning');
        return;
    }

    const contentEl = document.getElementById('reportContent');
    if (!contentEl) return;

    const reportTitles = {
        'cash-flow': 'Cash Flow Report',
        'payroll': 'Payroll Report',
        'fund-transfers': 'Fund Transfer Report',
        'company-payments': 'Company Payments Report',
        'financial-summary': 'Financial Summary Report',
        'reconciliation': 'Reconciliation Report'
    };

    const title = reportTitles[currentReportType] || 'Report';
    const periodLabel = currentFinanceReport.data?.period?.label || '—';

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
        cpToast('Popup Blocked', 'Please allow popups to print.', 'error');
        return;
    }

    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <style>
                @page { size: A4; margin: 10mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { font-family: 'Inter', Arial, sans-serif; background: white; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th { background: #0f766e; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
                td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0f766e;">
                <div style="font-size:22px;font-weight:900;color:#0f766e;">MAK DC INVESTMENT COMPANY LTD</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;font-style:italic;">"Quality service is our priority."</div>
                <div style="font-size:16px;font-weight:800;color:#134e4a;margin-top:14px;">${title}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Period: ${periodLabel}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Generated: ${new Date().toLocaleString()}</div>
            </div>
            <div>${contentEl.innerHTML}</div>
            <div style="margin-top:24px;padding-top:16px;border-top:2px dashed #e2e8f0;text-align:center;">
                <div style="font-size:10px;color:#94a3b8;">This is a computer-generated report. No signature required.</div>
                <div style="font-size:9px;color:#cbd5e1;margin-top:4px;">© 2026 MAK DC Investment Company Limited</div>
            </div>
        </body>
        </html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
}
function renderOverallReport(data, container) {
    const es = data.executiveSummary || {};
    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();
    const fmtShort = (n) => {
        const num = Number(n || 0);
        if (num >= 1e9) return 'TSh ' + (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return 'TSh ' + (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return 'TSh ' + (num / 1e3).toFixed(1) + 'K';
        return 'TSh ' + num.toLocaleString();
    };

    container.innerHTML = `
     ${renderNarrativeSection(data.narrative)}
        <!-- ================= HERO HEADER ================= -->
        <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 50%,#0f766e 100%);border-radius:20px;padding:28px 32px;margin-bottom:20px;color:white;position:relative;overflow:hidden;box-shadow:0 15px 40px rgba(15,118,110,0.3);">
            <div style="position:absolute;top:-50px;right:-50px;width:250px;height:250px;background:radial-gradient(circle,rgba(245,158,11,0.3) 0%,transparent 70%);border-radius:50%;pointer-events:none;"></div>
            <div style="position:absolute;bottom:-80px;left:-30px;width:200px;height:200px;background:radial-gradient(circle,rgba(20,184,166,0.25) 0%,transparent 70%);border-radius:50%;pointer-events:none;"></div>
            
            <div style="position:relative;z-index:1;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
                    <div>
                        <div style="font-size:11px;font-weight:800;letter-spacing:2.5px;opacity:0.8;text-transform:uppercase;margin-bottom:6px;">📋 Executive Summary</div>
                        <div style="font-size:32px;font-weight:900;letter-spacing:-0.8px;line-height:1.1;">Overall Financial Report</div>
                        <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:8px;font-weight:500;">${data.period?.label || '—'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:10px;font-weight:800;letter-spacing:1.5px;opacity:0.7;text-transform:uppercase;margin-bottom:4px;">Net Worth</div>
                        <div style="font-size:34px;font-weight:900;color:#fbbf24;font-family:'Courier New',monospace;letter-spacing:-1px;line-height:1;">${fmt(es.netWorth)}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.6);margin-top:6px;">Generated: ${new Date(data.generatedAt).toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================= KPI GRID ================= -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;">
            
            <!-- Inflow -->
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);position:relative;overflow:hidden;transition:all 0.25s;">
                <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#22c55e;"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📥 Total Inflow</div>
                    <div style="width:32px;height:32px;border-radius:8px;background:rgba(34,197,94,0.12);display:flex;align-items:center;justify-content:center;font-size:15px;">📥</div>
                </div>
                <div style="font-size:22px;font-weight:900;color:#16a34a;font-family:'Courier New',monospace;letter-spacing:-0.5px;">${fmtShort(es.totalInflow)}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${fmt(es.totalInflow)}</div>
            </div>

            <!-- Outflow -->
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);position:relative;overflow:hidden;transition:all 0.25s;">
                <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#dc2626;"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📤 Total Outflow</div>
                    <div style="width:32px;height:32px;border-radius:8px;background:rgba(220,38,38,0.12);display:flex;align-items:center;justify-content:center;font-size:15px;">📤</div>
                </div>
                <div style="font-size:22px;font-weight:900;color:#dc2626;font-family:'Courier New',monospace;letter-spacing:-0.5px;">${fmtShort(es.totalOutflow)}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${fmt(es.totalOutflow)}</div>
            </div>

            <!-- Net Change -->
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);position:relative;overflow:hidden;transition:all 0.25s;">
                <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${es.netChange >= 0 ? '#22c55e' : '#dc2626'};"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">📊 Net Change</div>
                    <div style="width:32px;height:32px;border-radius:8px;background:rgba(15,118,110,0.12);display:flex;align-items:center;justify-content:center;font-size:15px;">📊</div>
                </div>
                <div style="font-size:22px;font-weight:900;color:${es.netChange >= 0 ? '#16a34a' : '#dc2626'};font-family:'Courier New',monospace;letter-spacing:-0.5px;">${es.netChange >= 0 ? '+' : ''}${fmtShort(es.netChange)}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${es.netChange >= 0 ? '+' : ''}${fmt(es.netChange)}</div>
            </div>

            <!-- Sales -->
            <div style="background:white;border-radius:14px;padding:18px 20px;border:1px solid var(--gray-200);position:relative;overflow:hidden;transition:all 0.25s;">
                <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:#0f766e;"></div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">🛒 Total Sales</div>
                    <div style="width:32px;height:32px;border-radius:8px;background:rgba(15,118,110,0.12);display:flex;align-items:center;justify-content:center;font-size:15px;">🛒</div>
                </div>
                <div style="font-size:22px;font-weight:900;color:#0f766e;font-family:'Courier New',monospace;letter-spacing:-0.5px;">${fmtShort(es.totalSales)}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${fmt(es.totalSales)}</div>
            </div>
        </div>

        <!-- ================= MODULE CARDS ================= -->
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-bottom:20px;">

            <!-- PAYROLL -->
            <div style="background:white;border-radius:16px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
                <div style="background:linear-gradient(135deg,#4f46e5 0%,#4338ca 100%);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;">💰</div>
                        <div>
                            <div style="font-size:14px;font-weight:800;color:white;">Payroll</div>
                            <div style="font-size:10px;color:rgba(255,255,255,0.75);">Employee salaries</div>
                        </div>
                    </div>
                    <div style="font-size:10px;font-weight:800;color:white;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:20px;">${data.payroll.totalPayrolls} RUNS</div>
                </div>
                <div style="padding:14px 20px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #22c55e;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Paid</div>
                            <div style="font-size:14px;font-weight:900;color:#16a34a;font-family:'Courier New',monospace;">${fmtShort(data.payroll.paidAmount)}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #f59e0b;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Pending</div>
                            <div style="font-size:14px;font-weight:900;color:#d97706;font-family:'Courier New',monospace;">${fmtShort(data.payroll.pendingAmount)}</div>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;border-top:1px dashed #e2e8f0;">
                        <span>👥 Employees</span>
                        <strong style="color:#334155;">${data.payroll.totalEmployees}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;">
                        <span>💰 Total Amount</span>
                        <strong style="color:#4f46e5;font-family:'Courier New',monospace;">${fmt(data.payroll.totalAmount)}</strong>
                    </div>
                </div>
            </div>

            <!-- COMPANY PAYMENTS -->
            <div style="background:white;border-radius:16px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
                <div style="background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;">🏢</div>
                        <div>
                            <div style="font-size:14px;font-weight:800;color:white;">Company Payments</div>
                            <div style="font-size:10px;color:rgba(255,255,255,0.75);">Vendor & operational</div>
                        </div>
                    </div>
                    <div style="font-size:10px;font-weight:800;color:white;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:20px;">${data.companyPayments.totalPayments} RECORDS</div>
                </div>
                <div style="padding:14px 20px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #22c55e;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Paid</div>
                            <div style="font-size:14px;font-weight:900;color:#16a34a;font-family:'Courier New',monospace;">${fmtShort(data.companyPayments.paidAmount)}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #f59e0b;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Pending</div>
                            <div style="font-size:14px;font-weight:900;color:#d97706;font-family:'Courier New',monospace;">${fmtShort(data.companyPayments.pendingAmount)}</div>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;border-top:1px dashed #e2e8f0;">
                        <span>📋 Records</span>
                        <strong style="color:#334155;">${data.companyPayments.totalPayments}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;">
                        <span>💰 Total Amount</span>
                        <strong style="color:#ea580c;font-family:'Courier New',monospace;">${fmt(data.companyPayments.totalAmount)}</strong>
                    </div>
                </div>
            </div>

            <!-- FUND TRANSFERS -->
            <div style="background:white;border-radius:16px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
                <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;">💸</div>
                        <div>
                            <div style="font-size:14px;font-weight:800;color:white;">Fund Transfers</div>
                            <div style="font-size:10px;color:rgba(255,255,255,0.75);">Between accounts</div>
                        </div>
                    </div>
                    <div style="font-size:10px;font-weight:800;color:white;padding:4px 10px;background:rgba(255,255,255,0.15);border-radius:20px;">${data.fundTransfers.totalTransfers} MOVES</div>
                </div>
                <div style="padding:14px 20px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #22c55e;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Completed</div>
                            <div style="font-size:14px;font-weight:900;color:#16a34a;font-family:'Courier New',monospace;">${fmtShort(data.fundTransfers.completedAmount)}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #f59e0b;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Pending</div>
                            <div style="font-size:14px;font-weight:900;color:#d97706;font-family:'Courier New',monospace;">${fmtShort(data.fundTransfers.pendingAmount)}</div>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;border-top:1px dashed #e2e8f0;">
                        <span>🔄 Transfers</span>
                        <strong style="color:#334155;">${data.fundTransfers.totalTransfers}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;">
                        <span>💰 Total Amount</span>
                        <strong style="color:#0f766e;font-family:'Courier New',monospace;">${fmt(data.fundTransfers.totalAmount)}</strong>
                    </div>
                </div>
            </div>

            <!-- SALES & RECONCILIATION -->
            <div style="background:white;border-radius:16px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
                <div style="background:linear-gradient(135deg,#0891b2 0%,#0e7490 100%);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:18px;">🛒</div>
                        <div>
                            <div style="font-size:14px;font-weight:800;color:white;">Sales & Reconciliation</div>
                            <div style="font-size:10px;color:rgba(255,255,255,0.75);">Orders & payments</div>
                        </div>
                    </div>
                    <div style="font-size:10px;font-weight:800;color:white;padding:4px 10px;background:${data.reconciliation.hasDiscrepancy ? 'rgba(220,38,38,0.3)' : 'rgba(34,197,94,0.3)'};border-radius:20px;">
                        ${data.reconciliation.hasDiscrepancy ? '⚠️ DISCREPANCY' : '✅ BALANCED'}
                    </div>
                </div>
                <div style="padding:14px 20px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #0891b2;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Sales</div>
                            <div style="font-size:14px;font-weight:900;color:#0891b2;font-family:'Courier New',monospace;">${fmtShort(data.sales.totalSales)}</div>
                        </div>
                        <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #22c55e;">
                            <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Received</div>
                            <div style="font-size:14px;font-weight:900;color:#16a34a;font-family:'Courier New',monospace;">${fmtShort(data.sales.totalPaymentsReceived)}</div>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;border-top:1px dashed #e2e8f0;">
                        <span>📦 Orders</span>
                        <strong style="color:#334155;">${data.sales.totalOrders} <span style="color:#16a34a;font-size:10px;">(${data.sales.paidOrders} paid)</span></strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;padding:6px 0;">
                        <span>⚠️ Difference</span>
                        <strong style="color:${Math.abs(data.sales.difference) > 1 ? '#dc2626' : '#16a34a'};font-family:'Courier New',monospace;">
                            ${data.sales.difference >= 0 ? '+' : ''}${fmt(data.sales.difference)}
                        </strong>
                    </div>
                </div>
            </div>
        </div>

        <!-- ================= RESOURCES BY CATEGORY ================= -->
        <div style="background:white;border-radius:16px;border:1px solid var(--gray-200);overflow:hidden;margin-bottom:20px;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
            <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;">💰</div>
                    <div>
                        <div style="font-size:15px;font-weight:800;color:white;">Resources by Category</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.75);">Company assets & holdings</div>
                    </div>
                </div>
                <div style="font-size:11px;font-weight:800;color:white;padding:5px 12px;background:rgba(255,255,255,0.15);border-radius:20px;">
                    Total: ${fmt(es.netWorth)}
                </div>
            </div>
            <div style="padding:18px 24px;">
                ${(data.resources.byCategory || []).length === 0 ? 
                    '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">No resources</div>' : `
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
                        ${data.resources.byCategory.map(c => {
                            const icons = { cash: '💵', bank: '🏦', asset: '🏞️', investment: '📈', equipment: '🏢', inventory: '📦', precious: '💎', other: '📝' };
                            const colors = { cash: '#22c55e', bank: '#0ea5e9', asset: '#8b5cf6', investment: '#f59e0b', equipment: '#06b6d4', inventory: '#ec4899', precious: '#eab308', other: '#64748b' };
                            const icon = icons[c.category] || '📝';
                            const color = colors[c.category] || '#64748b';
                            const pct = es.netWorth > 0 ? (c.amount / es.netWorth * 100).toFixed(1) : 0;
                            return `
                                <div style="background:#f8fafc;border-radius:12px;padding:14px 16px;border-left:4px solid ${color};">
                                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                        <div style="font-size:13px;font-weight:800;color:#334155;text-transform:capitalize;">${icon} ${c.category}</div>
                                        <div style="font-size:10px;font-weight:800;color:${color};">${pct}%</div>
                                    </div>
                                    <div style="font-size:16px;font-weight:900;color:${color};font-family:'Courier New',monospace;letter-spacing:-0.3px;">${fmt(c.amount)}</div>
                                    <div style="font-size:10px;color:#94a3b8;margin-top:4px;">${c.count} item${c.count === 1 ? '' : 's'}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        </div>

        <!-- ================= TOP RESOURCES ================= -->
        <div style="background:white;border-radius:16px;border:1px solid var(--gray-200);overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
            <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;">🏆</div>
                    <div>
                        <div style="font-size:15px;font-weight:800;color:white;">Top 5 Resources</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.75);">Highest value holdings</div>
                    </div>
                </div>
            </div>
            <div style="padding:0;">
                ${(data.resources.topResources || []).length === 0 ? 
                    '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:13px;">No resources</div>' : `
                    ${data.resources.topResources.map((r, i) => {
                        const icons = { cash: '💵', bank: '🏦', asset: '🏞️', investment: '📈', equipment: '🏢', inventory: '📦', precious: '💎', other: '📝' };
                        const icon = icons[r.category] || '📝';
                        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || '•';
                        return `
                            <div style="display:flex;align-items:center;gap:14px;padding:14px 24px;${i < data.resources.topResources.length - 1 ? 'border-bottom:1px solid #f1f5f9;' : ''}">
                                <div style="font-size:22px;width:32px;text-align:center;flex-shrink:0;">${medal}</div>
                                <div style="width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,rgba(15,118,110,0.1),rgba(20,184,166,0.05));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${icon}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:13.5px;font-weight:800;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.name}</div>
                                    <div style="font-size:11px;color:#94a3b8;text-transform:capitalize;margin-top:2px;">${r.category}</div>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:15px;font-weight:900;color:#0f766e;font-family:'Courier New',monospace;letter-spacing:-0.3px;">${r.currency} ${Number(r.amount).toLocaleString()}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                `}
            </div>
        </div>
    `;
}
async function exportFinanceReportPDF() {
    console.log('🚀 PDF Export started');
    console.log('currentFinanceReport:', currentFinanceReport);
    console.log('currentReportType:', currentReportType);
    if (!currentFinanceReport || !currentFinanceReport.data) {
        cpToast('No Data', 'Load a report first.', 'warning');
        return;
    }

    const data = currentFinanceReport.data;
    const reportTitles = {
        'cash-flow': 'Cash Flow Report',
        'payroll': 'Payroll Report',
        'fund-transfers': 'Fund Transfer Report',
        'company-payments': 'Company Payments Report',
        'financial-summary': 'Financial Summary Report',
        'reconciliation': 'Reconciliation Report',
        'overall': 'Overall Financial Report'
    };

    const title = reportTitles[currentReportType] || 'Report';
    const periodLabel = data?.period?.label || '—';
    const dateStr = new Date().toISOString().split('T')[0];

    // ============================================================
    // BUILD CLEAN PDF HTML
    // ============================================================
    const pdfHTML = buildPDFTemplate(title, periodLabel, data);

    const pdfContainer = document.createElement('div');
    pdfContainer.setAttribute('data-pdf-container', 'true');
    pdfContainer.style.cssText = 'position:fixed;top:0;left:0;width:210mm;background:#ffffff;font-family:Arial,Helvetica,sans-serif;z-index:-9999;opacity:0.01;pointer-events:none;';
    pdfContainer.innerHTML = pdfHTML;
    document.body.appendChild(pdfContainer);
    
    // 🆕 Subiri DOM itengeneze
    await new Promise(resolve => setTimeout(resolve, 500));

    cpToast('⏳ Generating PDF', 'Please wait...', 'info', 2000);

    const opt = {
        margin: [10, 10, 12, 10],
        filename: `${title.replace(/\s+/g, '_')}_${dateStr}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            letterRendering: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 794,
            windowHeight: pdfContainer.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            onclone: function(clonedDoc) {
                const clonedContainer = clonedDoc.querySelector('[data-pdf-container]');
                if (clonedContainer) {
                    clonedContainer.style.position = 'static';
                    clonedContainer.style.opacity = '1';
                    clonedContainer.style.zIndex = '1';
                    clonedContainer.style.left = '0';
                    clonedContainer.style.top = '0';
                    clonedContainer.style.visibility = 'visible';
                    clonedContainer.style.display = 'block';
                }
            }
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        },
        pagebreak: {
            mode: ['css', 'legacy'],
            avoid: ['tr', '.pdf-no-break']
        }
    };

    html2pdf()
        .set(opt)
        .from(pdfContainer)
        .save()
        .then(() => {
            cpToast('✅ PDF Downloaded', `${title} saved.`, 'success');
            setTimeout(() => {
                if (document.body.contains(pdfContainer)) {
                    document.body.removeChild(pdfContainer);
                }
            }, 100);
        })
        .catch((err) => {
            console.error('PDF error:', err);
            cpToast('PDF Failed', 'Failed to generate PDF.', 'error');
            if (document.body.contains(pdfContainer)) {
                document.body.removeChild(pdfContainer);
            }
        });
}
function buildPDFTemplate(title, periodLabel, data) {
    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();
    const generatedDate = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // ============================================================
    // 🆕 PREPARED BY — Pata jina la mtumiaji aliyeingia
    // ============================================================
    const preparedByInput = document.getElementById('reportPreparedBy');
    const currentUser = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    const preparedBy = (preparedByInput && preparedByInput.value) 
        || (currentUser && currentUser.fullName) 
        || 'Finance Officer';

    // ============================================================
    // HEADER
    // ============================================================
    const header = `
        <div style="text-align:center;padding-bottom:14px;border-bottom:2px solid #0f766e;margin-bottom:20px;">
            <div style="font-size:20px;font-weight:900;color:#0f766e;letter-spacing:0.5px;">MAK DC INVESTMENT COMPANY LTD</div>
            <div style="font-size:10px;color:#64748b;font-style:italic;margin-top:3px;">"Quality service is our priority."</div>
            <div style="font-size:14px;font-weight:800;color:#134e4a;margin-top:10px;text-transform:uppercase;letter-spacing:1px;">${title}</div>
            
            <!-- 🆕 INFO BAR -->
            <table style="width:100%;margin-top:12px;font-size:10.5px;color:#475569;border-collapse:collapse;">
                <tr>
                    <td style="width:33%;text-align:left;padding:4px 0;">
                        <strong style="color:#0f766e;">Period:</strong> ${periodLabel}
                    </td>
                    <td style="width:34%;text-align:center;padding:4px 0;">
                        <strong style="color:#0f766e;">Prepared By:</strong> ${preparedBy}
                    </td>
                    <td style="width:33%;text-align:right;padding:4px 0;">
                        <strong style="color:#0f766e;">Generated:</strong> ${generatedDate}
                    </td>
                </tr>
            </table>
        </div>
    `;

    // ============================================================
    // FOOTER — Signing lines 3
    // ============================================================
    const footer = `
        <div style="margin-top:24px;padding-top:14px;border-top:1px solid #cbd5e1;">
            
            <!-- SIGNATURE LINES -->
            <table style="width:100%;border-collapse:collapse;font-size:10px;color:#475569;margin-bottom:14px;">
                <tr>
                    <td style="width:33%;text-align:center;padding:0 8px;">
                        <div style="border-top:1px solid #94a3b8;padding-top:6px;margin-top:30px;">
                            <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;">Prepared By</div>
                            <div style="font-size:10.5px;color:#0f766e;font-weight:800;margin-top:4px;">${preparedBy}</div>
                        </div>
                    </td>
                    <td style="width:33%;text-align:center;padding:0 8px;">
                        <div style="border-top:1px solid #94a3b8;padding-top:6px;margin-top:30px;">
                            <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;">Reviewed By</div>
                            <div style="font-size:10px;color:#94a3b8;margin-top:4px;font-style:italic;">____________________</div>
                        </div>
                    </td>
                    <td style="width:33%;text-align:center;padding:0 8px;">
                        <div style="border-top:1px solid #94a3b8;padding-top:6px;margin-top:30px;">
                            <div style="font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:#64748b;">Approved By</div>
                            <div style="font-size:10px;color:#94a3b8;margin-top:4px;font-style:italic;">____________________</div>
                        </div>
                    </td>
                </tr>
            </table>

            <!-- COPYRIGHT -->
            <div style="text-align:center;padding-top:10px;border-top:1px solid #e2e8f0;">
                <div style="font-size:9px;color:#94a3b8;">This is a computer-generated report. No signature required.</div>
                <div style="font-size:8px;color:#cbd5e1;margin-top:3px;">© 2026 MAK DC Investment Company Limited — All rights reserved.</div>
            </div>
        </div>
    `;

    let body = '';
    const d = data;

    // ============================================================
    // OVERALL REPORT
    // ============================================================
    if (currentReportType === 'overall') {
        const es = d.executiveSummary || {};
        
        body = `
            <!-- EXECUTIVE SUMMARY -->
            <div style="background:#f0fdfa;border:1px solid #99f6e4;border-left:4px solid #0f766e;padding:14px 18px;margin-bottom:16px;">
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;">Executive Summary</div>
                <table style="width:100%;border-collapse:collapse;font-size:11px;">
                    <tr>
                        <td style="padding:6px 0;color:#64748b;">Net Worth</td>
                        <td style="padding:6px 0;text-align:right;font-weight:900;color:#0f766e;font-family:Courier,monospace;font-size:13px;">${fmt(es.netWorth)}</td>
                    </tr>
                    <tr style="border-top:1px solid #e2e8f0;">
                        <td style="padding:6px 0;color:#64748b;">Total Inflow</td>
                        <td style="padding:6px 0;text-align:right;font-weight:700;color:#16a34a;">${fmt(es.totalInflow)}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#64748b;">Total Outflow</td>
                        <td style="padding:6px 0;text-align:right;font-weight:700;color:#dc2626;">${fmt(es.totalOutflow)}</td>
                    </tr>
                    <tr style="border-top:1px solid #e2e8f0;">
                        <td style="padding:6px 0;color:#64748b;">Net Change</td>
                        <td style="padding:6px 0;text-align:right;font-weight:900;color:${es.netChange >= 0 ? '#16a34a' : '#dc2626'};">${es.netChange >= 0 ? '+' : ''}${fmt(es.netChange)}</td>
                    </tr>
                </table>
            </div>

            <!-- MODULE SUMMARIES -->
            <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px;">
                <tr style="background:#0f766e;color:white;">
                    <th style="padding:8px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;">Module</th>
                    <th style="padding:8px 10px;text-align:right;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;">Total</th>
                    <th style="padding:8px 10px;text-align:right;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;">Paid/Completed</th>
                    <th style="padding:8px 10px;text-align:right;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:0.8px;">Pending</th>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px 10px;font-weight:700;color:#334155;">💰 Payroll</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;">${fmt(d.payroll.totalAmount)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:#16a34a;">${fmt(d.payroll.paidAmount)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:#d97706;">${fmt(d.payroll.pendingAmount)}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;background:#f8fafc;">
                    <td style="padding:8px 10px;font-weight:700;color:#334155;">🏢 Company Payments</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;">${fmt(d.companyPayments.totalAmount)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:#16a34a;">${fmt(d.companyPayments.paidAmount)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:#d97706;">${fmt(d.companyPayments.pendingAmount)}</td>
                </tr>
                <tr style="border-bottom:1px solid #e2e8f0;">
                    <td style="padding:8px 10px;font-weight:700;color:#334155;">💸 Fund Transfers</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;">${fmt(d.fundTransfers.totalAmount)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:#16a34a;">${fmt(d.fundTransfers.completedAmount)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:#d97706;">${fmt(d.fundTransfers.pendingAmount)}</td>
                </tr>
                <tr style="background:#f8fafc;">
                    <td style="padding:8px 10px;font-weight:700;color:#334155;">🛒 Sales</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;">${fmt(d.sales.totalSales)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:#16a34a;">${fmt(d.sales.totalPaymentsReceived)}</td>
                    <td style="padding:8px 10px;text-align:right;font-family:Courier,monospace;color:${Math.abs(d.sales.difference) > 1 ? '#dc2626' : '#16a34a'};">${d.sales.difference >= 0 ? '+' : ''}${fmt(d.sales.difference)}</td>
                </tr>
            </table>

            <!-- RESOURCES BY CATEGORY -->
            ${d.resources?.byCategory?.length > 0 ? `
                <div style="margin-top:16px;">
                    <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Resources by Category</div>
                    <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
                        <tr style="background:#f1f5f9;">
                            <th style="padding:7px 10px;text-align:left;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#475569;">Category</th>
                            <th style="padding:7px 10px;text-align:right;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#475569;">Count</th>
                            <th style="padding:7px 10px;text-align:right;font-weight:700;font-size:9.5px;text-transform:uppercase;color:#475569;">Amount</th>
                        </tr>
                        ${d.resources.byCategory.map((c, i) => `
                            <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                                <td style="padding:7px 10px;font-weight:700;text-transform:capitalize;color:#334155;">${c.category}</td>
                                <td style="padding:7px 10px;text-align:right;color:#64748b;">${c.count}</td>
                                <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:700;color:#0f766e;">${fmt(c.amount)}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            ` : ''}

            <!-- NARRATIVE -->
            ${d.narrative ? buildPDFNarrative(d.narrative) : ''}
        `;
    }

    // ============================================================
    // CASH FLOW
    // ============================================================
    else if (currentReportType === 'cash-flow') {
        body = `
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
                <tr>
                    <td style="padding:10px;background:#f0fdf4;border-left:3px solid #16a34a;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Total Inflow</div>
                        <div style="font-size:15px;font-weight:900;color:#16a34a;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalInflow)}</div>
                    </td>
                    <td style="padding:10px;background:#fef2f2;border-left:3px solid #dc2626;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Total Outflow</div>
                        <div style="font-size:15px;font-weight:900;color:#dc2626;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalOutflow)}</div>
                    </td>
                    <td style="padding:10px;background:#f0fdfa;border-left:3px solid #0f766e;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Net Change</div>
                        <div style="font-size:15px;font-weight:900;color:${d.summary.netChange >= 0 ? '#16a34a' : '#dc2626'};font-family:Courier,monospace;margin-top:3px;">${d.summary.netChange >= 0 ? '+' : ''}${fmt(d.summary.netChange)}</div>
                    </td>
                    <td style="padding:10px;background:#fffbeb;border-left:3px solid #f59e0b;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Total Balance</div>
                        <div style="font-size:15px;font-weight:900;color:#d97706;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalBalance)}</div>
                    </td>
                </tr>
            </table>

            ${d.sources?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Breakdown by Source</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Source</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Inflow</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Outflow</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Count</th>
                    </tr>
                    ${d.sources.map((s, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;color:#334155;">${s.source}</td>
                            <td style="padding:7px 10px;text-align:right;color:#16a34a;font-family:Courier,monospace;">${fmt(s.inflow)}</td>
                            <td style="padding:7px 10px;text-align:right;color:#dc2626;font-family:Courier,monospace;">${fmt(s.outflow)}</td>
                            <td style="padding:7px 10px;text-align:right;color:#64748b;">${s.count}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}

            ${d.resources?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Breakdown by Resource</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Resource</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Inflow</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Outflow</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Net</th>
                    </tr>
                    ${d.resources.map((r, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;color:#334155;">${r.name}</td>
                            <td style="padding:7px 10px;text-align:right;color:#16a34a;font-family:Courier,monospace;">${fmt(r.inflow)}</td>
                            <td style="padding:7px 10px;text-align:right;color:#dc2626;font-family:Courier,monospace;">${fmt(r.outflow)}</td>
                            <td style="padding:7px 10px;text-align:right;font-weight:800;color:${(r.inflow - r.outflow) >= 0 ? '#16a34a' : '#dc2626'};font-family:Courier,monospace;">${(r.inflow - r.outflow) >= 0 ? '+' : ''}${fmt(r.inflow - r.outflow)}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
        `;
    }

    // ============================================================
    // PAYROLL
    // ============================================================
    else if (currentReportType === 'payroll') {
        body = `
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
                <tr>
                    <td style="padding:10px;background:#eef2ff;border-left:3px solid #4f46e5;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Payrolls</div>
                        <div style="font-size:15px;font-weight:900;color:#4f46e5;font-family:Courier,monospace;margin-top:3px;">${d.summary.totalPayrolls}</div>
                    </td>
                    <td style="padding:10px;background:#f0fdfa;border-left:3px solid #0f766e;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Amount</div>
                        <div style="font-size:15px;font-weight:900;color:#0f766e;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalAmount)}</div>
                    </td>
                    <td style="padding:10px;background:#f0fdf4;border-left:3px solid #16a34a;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Paid</div>
                        <div style="font-size:15px;font-weight:900;color:#16a34a;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.paidAmount)}</div>
                    </td>
                    <td style="padding:10px;background:#eff6ff;border-left:3px solid #3b82f6;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Employees</div>
                        <div style="font-size:15px;font-weight:900;color:#3b82f6;font-family:Courier,monospace;margin-top:3px;">${d.summary.totalEmployees}</div>
                    </td>
                </tr>
            </table>

            ${d.recentPayrolls?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Recent Payrolls</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Payroll ID</th>
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Period</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Amount</th>
                        <th style="padding:7px 10px;text-align:center;font-size:9.5px;text-transform:uppercase;color:#475569;">Status</th>
                    </tr>
                    ${d.recentPayrolls.map((p, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-family:Courier,monospace;font-weight:700;color:#0f766e;">${p.payrollId}</td>
                            <td style="padding:7px 10px;color:#334155;">${p.month}/${p.year}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:700;">${fmt(p.amount)}</td>
                            <td style="padding:7px 10px;text-align:center;font-size:9.5px;font-weight:700;text-transform:uppercase;">${p.status}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
        `;
    }

    // ============================================================
    // FUND TRANSFERS
    // ============================================================
    else if (currentReportType === 'fund-transfers') {
        body = `
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
                <tr>
                    <td style="padding:10px;background:#f0fdfa;border-left:3px solid #0f766e;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Transfers</div>
                        <div style="font-size:15px;font-weight:900;color:#0f766e;font-family:Courier,monospace;margin-top:3px;">${d.summary.totalTransfers}</div>
                    </td>
                    <td style="padding:10px;background:#fffbeb;border-left:3px solid #f59e0b;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Amount</div>
                        <div style="font-size:15px;font-weight:900;color:#d97706;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalAmount)}</div>
                    </td>
                    <td style="padding:10px;background:#f0fdf4;border-left:3px solid #16a34a;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Completed</div>
                        <div style="font-size:15px;font-weight:900;color:#16a34a;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.completedAmount)}</div>
                    </td>
                    <td style="padding:10px;background:#eff6ff;border-left:3px solid #3b82f6;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Average</div>
                        <div style="font-size:15px;font-weight:900;color:#3b82f6;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.averageTransfer)}</div>
                    </td>
                </tr>
            </table>

            ${d.accountPairs?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Top Transfer Pairs</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">From → To</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Count</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Amount</th>
                    </tr>
                    ${d.accountPairs.map((p, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;color:#334155;">${p.pair}</td>
                            <td style="padding:7px 10px;text-align:right;color:#64748b;">${p.count}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:700;color:#0f766e;">${fmt(p.amount)}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
        `;
    }

    // ============================================================
    // COMPANY PAYMENTS
    // ============================================================
    else if (currentReportType === 'company-payments') {
        body = `
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
                <tr>
                    <td style="padding:10px;background:#f0fdfa;border-left:3px solid #0f766e;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Payments</div>
                        <div style="font-size:15px;font-weight:900;color:#0f766e;font-family:Courier,monospace;margin-top:3px;">${d.summary.totalPayments}</div>
                    </td>
                    <td style="padding:10px;background:#fffbeb;border-left:3px solid #f59e0b;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Amount</div>
                        <div style="font-size:15px;font-weight:900;color:#d97706;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalAmount)}</div>
                    </td>
                    <td style="padding:10px;background:#f0fdf4;border-left:3px solid #16a34a;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Paid</div>
                        <div style="font-size:15px;font-weight:900;color:#16a34a;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.paidAmount)}</div>
                    </td>
                    <td style="padding:10px;background:#fef2f2;border-left:3px solid #dc2626;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Pending</div>
                        <div style="font-size:15px;font-weight:900;color:#dc2626;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.pendingAmount)}</div>
                    </td>
                </tr>
            </table>

            ${d.byType?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Breakdown by Type</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Type</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Amount</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Count</th>
                    </tr>
                    ${d.byType.map((t, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;text-transform:capitalize;color:#334155;">${t.type}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:700;color:#0f766e;">${fmt(t.amount)}</td>
                            <td style="padding:7px 10px;text-align:right;color:#64748b;">${t.count}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}

            ${d.byVendor?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Top Vendors</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Vendor</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Amount</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Count</th>
                    </tr>
                    ${d.byVendor.map((v, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;color:#334155;">${v.vendor}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:700;color:#0f766e;">${fmt(v.amount)}</td>
                            <td style="padding:7px 10px;text-align:right;color:#64748b;">${v.count}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
        `;
    }

    // ============================================================
    // FINANCIAL SUMMARY
    // ============================================================
    else if (currentReportType === 'financial-summary') {
        body = `
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
                <tr>
                    <td style="padding:10px;background:#f0fdfa;border-left:3px solid #0f766e;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Resources</div>
                        <div style="font-size:14px;font-weight:900;color:#0f766e;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalResources)}</div>
                    </td>
                    <td style="padding:10px;background:#eff6ff;border-left:3px solid #3b82f6;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Net Worth</div>
                        <div style="font-size:14px;font-weight:900;color:#2563eb;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.netWorth)}</div>
                    </td>
                    <td style="padding:10px;background:#f0fdf4;border-left:3px solid #16a34a;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Inflow</div>
                        <div style="font-size:14px;font-weight:900;color:#16a34a;font-family:Courier,monospace;margin-top:3px;">+${fmt(d.summary.totalInflow)}</div>
                    </td>
                    <td style="padding:10px;background:#fef2f2;border-left:3px solid #dc2626;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Outflow</div>
                        <div style="font-size:14px;font-weight:900;color:#dc2626;font-family:Courier,monospace;margin-top:3px;">-${fmt(d.summary.totalOutflow)}</div>
                    </td>
                </tr>
            </table>

            ${d.byCategory?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Resources by Category</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Category</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Amount</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Count</th>
                    </tr>
                    ${d.byCategory.map((c, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;text-transform:capitalize;color:#334155;">${c.category}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:700;color:#0f766e;">${fmt(c.amount)}</td>
                            <td style="padding:7px 10px;text-align:right;color:#64748b;">${c.count}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}

            ${d.topResources?.length > 0 ? `
                <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Top Resources</div>
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Resource</th>
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Category</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Amount</th>
                    </tr>
                    ${d.topResources.map((r, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;color:#334155;">${r.name}</td>
                            <td style="padding:7px 10px;text-transform:capitalize;color:#64748b;">${r.category}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:700;color:#0f766e;">${r.currency} ${Number(r.amount).toLocaleString()}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : ''}
        `;
    }

    // ============================================================
    // RECONCILIATION
    // ============================================================
    else if (currentReportType === 'reconciliation') {
        body = `
            <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px;">
                <tr>
                    <td style="padding:10px;background:#eff6ff;border-left:3px solid #3b82f6;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Total Sales</div>
                        <div style="font-size:14px;font-weight:900;color:#2563eb;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalSales)}</div>
                    </td>
                    <td style="padding:10px;background:#f0fdf4;border-left:3px solid #16a34a;">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Payments Received</div>
                        <div style="font-size:14px;font-weight:900;color:#16a34a;font-family:Courier,monospace;margin-top:3px;">${fmt(d.summary.totalPaymentsReceived)}</div>
                    </td>
                    <td style="padding:10px;background:${Math.abs(d.summary.salesVsPaymentsDiff) > 1 ? '#fef2f2' : '#f0fdf4'};border-left:3px solid ${Math.abs(d.summary.salesVsPaymentsDiff) > 1 ? '#dc2626' : '#16a34a'};">
                        <div style="font-size:9px;font-weight:800;color:#64748b;text-transform:uppercase;">Difference</div>
                        <div style="font-size:14px;font-weight:900;color:${Math.abs(d.summary.salesVsPaymentsDiff) > 1 ? '#dc2626' : '#16a34a'};font-family:Courier,monospace;margin-top:3px;">${d.summary.salesVsPaymentsDiff >= 0 ? '+' : ''}${fmt(d.summary.salesVsPaymentsDiff)}</div>
                    </td>
                </tr>
            </table>

            <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #e2e8f0;">Discrepancies</div>
            ${(d.discrepancies || []).length === 0 ? `
                <div style="text-align:center;padding:24px;background:#f0fdf4;border-radius:8px;border:1px solid #86efac;">
                    <div style="font-size:24px;margin-bottom:6px;">✅</div>
                    <div style="font-size:12px;font-weight:800;color:#16a34a;">All Reconciles!</div>
                    <div style="font-size:10.5px;color:#64748b;margin-top:4px;">No discrepancies found in this period.</div>
                </div>
            ` : `
                <table style="width:100%;border-collapse:collapse;font-size:10.5px;">
                    <tr style="background:#f1f5f9;">
                        <th style="padding:7px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;">Type</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Expected</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Actual</th>
                        <th style="padding:7px 10px;text-align:right;font-size:9.5px;text-transform:uppercase;color:#475569;">Difference</th>
                        <th style="padding:7px 10px;text-align:center;font-size:9.5px;text-transform:uppercase;color:#475569;">Severity</th>
                    </tr>
                    ${d.discrepancies.map((x, i) => `
                        <tr style="border-bottom:1px solid #e2e8f0;${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
                            <td style="padding:7px 10px;font-weight:700;color:#334155;">${x.type}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;">${fmt(x.expected)}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;">${fmt(x.actual)}</td>
                            <td style="padding:7px 10px;text-align:right;font-family:Courier,monospace;font-weight:800;color:${x.severity === 'high' ? '#dc2626' : '#d97706'};">${x.difference >= 0 ? '+' : ''}${fmt(x.difference)}</td>
                            <td style="padding:7px 10px;text-align:center;font-size:9.5px;font-weight:800;text-transform:uppercase;color:${x.severity === 'high' ? '#dc2626' : '#d97706'};">${x.severity}</td>
                        </tr>
                    `).join('')}
                </table>
            `}
        `;
    }

    // ============================================================
    // RETURN
    // ============================================================
    return `
        <div style="background:white;padding:0;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
            ${header}
            ${body}
            ${footer}
        </div>
    `;
}
function buildPDFNarrative(narrative) {
    if (!narrative) return '';
    
    return `
        <div style="margin-top:20px;padding-top:14px;border-top:2px solid #e2e8f0;">
            <div style="font-size:12px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:12px;">📖 Executive Analysis</div>
            
            <div style="background:#f0fdfa;border-left:3px solid #0f766e;padding:10px 14px;margin-bottom:12px;font-size:10.5px;line-height:1.6;">
                <div style="font-weight:800;color:#0f766e;font-size:9.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Muhtasari</div>
                <div>${narrative.summary}</div>
            </div>

            <div style="background:#f8fafc;border-left:3px solid #4f46e5;padding:10px 14px;margin-bottom:12px;font-size:10.5px;line-height:1.6;">
                <div style="font-weight:800;color:#4f46e5;font-size:9.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">💵 Mtiririko wa Fedha</div>
                <div>${narrative.cashFlow}</div>
            </div>

            <div style="background:#f8fafc;border-left:3px solid #ea580c;padding:10px 14px;margin-bottom:12px;font-size:10.5px;line-height:1.6;">
                <div style="font-weight:800;color:#ea580c;font-size:9.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">🛒 Mauzo na Ulinganisho</div>
                <div>${narrative.sales}</div>
            </div>

            ${narrative.warnings && narrative.warnings.length > 0 ? `
                <div style="margin-bottom:12px;">
                    <div style="font-weight:800;color:#334155;font-size:9.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">⚠️ Tahadhari</div>
                    ${narrative.warnings.map(w => `
                        <div style="background:#fffbeb;border-left:3px solid #f59e0b;padding:8px 12px;margin-bottom:6px;font-size:10.5px;line-height:1.5;">
                            <div style="font-weight:800;color:#78350f;font-size:10px;">${w.icon} ${w.title}</div>
                            <div style="margin-top:2px;color:#475569;">${w.message}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            ${narrative.recommendations && narrative.recommendations.length > 0 ? `
                <div style="background:#eef2ff;border-left:3px solid #4f46e5;padding:10px 14px;margin-bottom:12px;font-size:10.5px;line-height:1.6;">
                    <div style="font-weight:800;color:#4f46e5;font-size:9.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">💡 Mapendekezo</div>
                    <ol style="margin:0;padding-left:18px;">
                        ${narrative.recommendations.map(r => `<li style="margin-bottom:4px;">${r}</li>`).join('')}
                    </ol>
                </div>
            ` : ''}

            <div style="background:#f0fdfa;border:1px solid #86efac;border-left:4px solid #0f766e;padding:12px 16px;font-size:10.5px;line-height:1.6;">
                <div style="font-weight:800;color:#0f766e;font-size:9.5px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">📌 Hitimisho</div>
                <div>${narrative.conclusion}</div>
            </div>
        </div>
    `;
}
function exportFinanceReportExcel() {
    if (!currentFinanceReport || !currentFinanceReport.data) {
        cpToast('No Data', 'Load a report first.', 'warning');
        return;
    }

    const data = currentFinanceReport.data;
    const periodLabel = data?.period?.label || '—';
    const dateStr = new Date().toISOString().split('T')[0];

    let csvContent = '';
    let filename = 'report';

    if (currentReportType === 'cash-flow') {
        filename = `cash_flow_${dateStr}.csv`;
        csvContent = buildCSV([
            ['CASH FLOW REPORT'],
            ['Period', periodLabel],
            ['Generated', new Date().toLocaleString()],
            [],
            ['SUMMARY'],
            ['Total Inflow', data.summary.totalInflow],
            ['Total Outflow', data.summary.totalOutflow],
            ['Net Change', data.summary.netChange],
            ['Total Balance', data.summary.totalBalance],
            ['Transaction Count', data.summary.transactionCount],
            [],
            ['BREAKDOWN BY SOURCE'],
            ['Source', 'Inflow', 'Outflow', 'Count'],
            ...data.sources.map(s => [s.source, s.inflow, s.outflow, s.count]),
            [],
            ['BREAKDOWN BY RESOURCE'],
            ['Resource', 'Category', 'Inflow', 'Outflow', 'Count'],
            ...data.resources.map(r => [r.name, r.category, r.inflow, r.outflow, r.count])
        ]);
    }
    else if (currentReportType === 'payroll') {
        filename = `payroll_${dateStr}.csv`;
        csvContent = buildCSV([
            ['PAYROLL REPORT'],
            ['Period', periodLabel],
            ['Generated', new Date().toLocaleString()],
            [],
            ['SUMMARY'],
            ['Total Payrolls', data.summary.totalPayrolls],
            ['Total Amount', data.summary.totalAmount],
            ['Paid Amount', data.summary.paidAmount],
            ['Total Employees', data.summary.totalEmployees],
            [],
            ['STATUS BREAKDOWN'],
            ['Status', 'Count'],
            ['Draft', data.statusBreakdown.draft],
            ['Pending Manager', data.statusBreakdown.pendingManager],
            ['Pending CEO', data.statusBreakdown.pendingCeo],
            ['Approved', data.statusBreakdown.approved],
            ['Paid', data.statusBreakdown.paid],
            ['Rejected', data.statusBreakdown.rejected],
            [],
            ['RECENT PAYROLLS'],
            ['Payroll ID', 'Period', 'Amount', 'Status', 'Employees'],
            ...data.recentPayrolls.map(p => [p.payrollId, `${p.month}/${p.year}`, p.amount, p.status, p.employees])
        ]);
    }
    else if (currentReportType === 'fund-transfers') {
        filename = `fund_transfers_${dateStr}.csv`;
        csvContent = buildCSV([
            ['FUND TRANSFER REPORT'],
            ['Period', periodLabel],
            ['Generated', new Date().toLocaleString()],
            [],
            ['SUMMARY'],
            ['Total Transfers', data.summary.totalTransfers],
            ['Total Amount', data.summary.totalAmount],
            ['Completed Amount', data.summary.completedAmount],
            ['Average Transfer', data.summary.averageTransfer],
            [],
            ['STATUS BREAKDOWN'],
            ['Status', 'Count'],
            ['Draft', data.statusBreakdown.draft],
            ['Pending Manager', data.statusBreakdown.pendingManager],
            ['Pending CEO', data.statusBreakdown.pendingCeo],
            ['Approved', data.statusBreakdown.approved],
            ['Completed', data.statusBreakdown.completed],
            ['Rejected', data.statusBreakdown.rejected],
            [],
            ['TOP TRANSFER PAIRS'],
            ['Pair', 'Count', 'Amount'],
            ...data.accountPairs.map(p => [p.pair, p.count, p.amount])
        ]);
    }
    else if (currentReportType === 'company-payments') {
        filename = `company_payments_${dateStr}.csv`;
        csvContent = buildCSV([
            ['COMPANY PAYMENTS REPORT'],
            ['Period', periodLabel],
            ['Generated', new Date().toLocaleString()],
            [],
            ['SUMMARY'],
            ['Total Payments', data.summary.totalPayments],
            ['Total Amount', data.summary.totalAmount],
            ['Paid Amount', data.summary.paidAmount],
            ['Pending Amount', data.summary.pendingAmount],
            [],
            ['BREAKDOWN BY TYPE'],
            ['Type', 'Amount', 'Count'],
            ...data.byType.map(t => [t.type, t.amount, t.count]),
            [],
            ['TOP VENDORS'],
            ['Vendor', 'Amount', 'Count'],
            ...data.byVendor.map(v => [v.vendor, v.amount, v.count])
        ]);
    }
    else if (currentReportType === 'financial-summary') {
        filename = `financial_summary_${dateStr}.csv`;
        csvContent = buildCSV([
            ['FINANCIAL SUMMARY REPORT'],
            ['Period', periodLabel],
            ['Generated', new Date().toLocaleString()],
            [],
            ['SUMMARY'],
            ['Total Resources', data.summary.totalResources],
            ['Net Worth', data.summary.netWorth],
            ['Total Inflow', data.summary.totalInflow],
            ['Total Outflow', data.summary.totalOutflow],
            ['Net Change', data.summary.netChange],
            [],
            ['BY CATEGORY'],
            ['Category', 'Amount', 'Count'],
            ...data.byCategory.map(c => [c.category, c.amount, c.count]),
            [],
            ['TOP RESOURCES'],
            ['Name', 'Category', 'Amount', 'Currency'],
            ...data.topResources.map(r => [r.name, r.category, r.amount, r.currency])
        ]);
    }
    else if (currentReportType === 'reconciliation') {
        filename = `reconciliation_${dateStr}.csv`;
        csvContent = buildCSV([
            ['RECONCILIATION REPORT'],
            ['Period', periodLabel],
            ['Generated', new Date().toLocaleString()],
            [],
            ['SUMMARY'],
            ['Total Sales', data.summary.totalSales],
            ['Payments Received', data.summary.totalPaymentsReceived],
            ['Difference', data.summary.salesVsPaymentsDiff],
            ['Total Transfers', data.summary.totalTransfers],
            ['Transfer Transactions', data.summary.totalTransferTransactions],
            ['Transfer Difference', data.summary.transfersVsTransactionsDiff],
            ['Discrepancy Count', data.summary.discrepancyCount],
            [],
            ['DISCREPANCIES'],
            ['Type', 'Expected', 'Actual', 'Difference', 'Severity'],
            ...data.discrepancies.map(d => [d.type, d.expected, d.actual, d.difference, d.severity])
        ]);
    }
    else if (currentReportType === 'overall') {
        filename = `overall_report_${dateStr}.csv`;
        const es = data.executiveSummary || {};
        csvContent = buildCSV([
            ['OVERALL REPORT — MAK DC INVESTMENT COMPANY LTD'],
            ['Period', periodLabel],
            ['Generated', new Date().toLocaleString()],
            [],
            ['EXECUTIVE SUMMARY'],
            ['Net Worth', es.netWorth],
            ['Total Inflow', es.totalInflow],
            ['Total Outflow', es.totalOutflow],
            ['Net Change', es.netChange],
            [],
            ['PAYROLL'],
            ['Total Payrolls', data.payroll.totalPayrolls],
            ['Total Amount', data.payroll.totalAmount],
            ['Paid', data.payroll.paidAmount],
            ['Pending', data.payroll.pendingAmount],
            ['Employees', data.payroll.totalEmployees],
            [],
            ['COMPANY PAYMENTS'],
            ['Total Payments', data.companyPayments.totalPayments],
            ['Total Amount', data.companyPayments.totalAmount],
            ['Paid', data.companyPayments.paidAmount],
            ['Pending', data.companyPayments.pendingAmount],
            [],
            ['FUND TRANSFERS'],
            ['Total Transfers', data.fundTransfers.totalTransfers],
            ['Total Amount', data.fundTransfers.totalAmount],
            ['Completed', data.fundTransfers.completedAmount],
            ['Pending', data.fundTransfers.pendingAmount],
            [],
            ['SALES'],
            ['Total Orders', data.sales.totalOrders],
            ['Paid Orders', data.sales.paidOrders],
            ['Total Sales', data.sales.totalSales],
            ['Payments Received', data.sales.totalPaymentsReceived],
            ['Difference', data.sales.difference]
        ]);
    }

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    cpToast('📊 Excel Downloaded', `${filename} saved.`, 'success');
}
function buildCSV(rows) {
    return rows.map(row =>
        row.map(cell => {
            const str = String(cell === null || cell === undefined ? '' : cell);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    ).join('\n');
}
function printFinanceReport() {
    if (!currentFinanceReport || !currentFinanceReport.data) {
        cpToast('No Data', 'Load a report first.', 'warning');
        return;
    }

    const contentEl = document.getElementById('reportContent');
    if (!contentEl) return;

    const reportTitles = {
        'cash-flow': 'Cash Flow Report',
        'payroll': 'Payroll Report',
        'fund-transfers': 'Fund Transfer Report',
        'company-payments': 'Company Payments Report',
        'financial-summary': 'Financial Summary Report',
        'reconciliation': 'Reconciliation Report',
        'overall': 'Overall Report'
    };

    const title = reportTitles[currentReportType] || 'Report';
    const periodLabel = currentFinanceReport.data?.period?.label || '—';

    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
        cpToast('Popup Blocked', 'Please allow popups to print.', 'error');
        return;
    }

    w.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <meta charset="UTF-8">
            <style>
                @page { size: A4; margin: 10mm; }
                * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body { font-family: 'Inter', Arial, sans-serif; background: white; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
                th { background: #0f766e; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
                td { padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div style="text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #0f766e;">
                <div style="font-size:22px;font-weight:900;color:#0f766e;">MAK DC INVESTMENT COMPANY LTD</div>
                <div style="font-size:11px;color:#64748b;margin-top:4px;font-style:italic;">"Quality service is our priority."</div>
                <div style="font-size:16px;font-weight:800;color:#134e4a;margin-top:14px;">${title}</div>
                <div style="font-size:12px;color:#64748b;margin-top:4px;">Period: ${periodLabel}</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Generated: ${new Date().toLocaleString()}</div>
            </div>
            <div>${contentEl.innerHTML}</div>
            <div style="margin-top:24px;padding-top:16px;border-top:2px dashed #e2e8f0;text-align:center;">
                <div style="font-size:10px;color:#94a3b8;">This is a computer-generated report. No signature required.</div>
                <div style="font-size:9px;color:#cbd5e1;margin-top:4px;">© 2026 MAK DC Investment Company Limited</div>
            </div>
        </body>
        </html>
    `);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
}
function renderNarrativeSection(narrative) {
    if (!narrative) return '';

    const health = narrative.health || {};
    
    return `
        <!-- ================= NARRATIVE ANALYSIS ================= -->
        <div style="background:white;border-radius:16px;border:1px solid var(--gray-200);overflow:hidden;margin-bottom:20px;box-shadow:0 4px 20px rgba(15,23,42,0.04);">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0f766e 0%,#134e4a 100%);padding:18px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;">📖</div>
                    <div>
                        <div style="font-size:16px;font-weight:800;color:white;">Uchambuzi wa Kina (Executive Analysis)</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.75);margin-top:2px;">Maelezo kamili ya hali ya kifedha ya kampuni</div>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;background:${health.color}20;border:1.5px solid ${health.color};border-radius:20px;">
                    <span style="font-size:18px;">${health.icon}</span>
                    <div>
                        <div style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px;">Hali ya Kifedha</div>
                        <div style="font-size:12px;font-weight:900;color:white;">${health.status}</div>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div style="padding:24px;">

                <!-- Summary -->
                <div style="background:linear-gradient(135deg,rgba(15,118,110,0.06),rgba(20,184,166,0.02));border-left:4px solid #0f766e;border-radius:12px;padding:18px 22px;margin-bottom:20px;">
                    <div style="font-size:11px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">📋 Muhtasari wa Jumla</div>
                    <div style="font-size:14px;color:#334155;line-height:1.7;">${narrative.summary}</div>
                </div>

                <!-- Sections Grid -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
                    
                    <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;border-left:4px solid #0f766e;">
                        <div style="font-size:10px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <span style="font-size:14px;">💵</span> MTIRIRIKO WA FEDHA
                        </div>
                        <div style="font-size:12.5px;color:#475569;line-height:1.7;">${narrative.cashFlow}</div>
                    </div>

                    <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;border-left:4px solid #4f46e5;">
                        <div style="font-size:10px;font-weight:800;color:#4f46e5;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <span style="font-size:14px;">💰</span> MISHAHARA (PAYROLL)
                        </div>
                        <div style="font-size:12.5px;color:#475569;line-height:1.7;">${narrative.payroll}</div>
                    </div>

                    <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;border-left:4px solid #ea580c;">
                        <div style="font-size:10px;font-weight:800;color:#ea580c;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <span style="font-size:14px;">🏢</span> MALIPO YA KAMPUNI
                        </div>
                        <div style="font-size:12.5px;color:#475569;line-height:1.7;">${narrative.companyPayments}</div>
                    </div>

                    <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;border-left:4px solid #0f766e;">
                        <div style="font-size:10px;font-weight:800;color:#0f766e;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <span style="font-size:14px;">💸</span> UHAMISHO WA FEDHA
                        </div>
                        <div style="font-size:12.5px;color:#475569;line-height:1.7;">${narrative.fundTransfers}</div>
                    </div>

                    <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;border-left:4px solid #0891b2;">
                        <div style="font-size:10px;font-weight:800;color:#0891b2;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <span style="font-size:14px;">🛒</span> MAUZO NA ULINGANISHO
                        </div>
                        <div style="font-size:12.5px;color:#475569;line-height:1.7;">${narrative.sales}</div>
                    </div>

                    <div style="background:#f8fafc;border-radius:12px;padding:16px 18px;border-left:4px solid #8b5cf6;">
                        <div style="font-size:10px;font-weight:800;color:#8b5cf6;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
                            <span style="font-size:14px;">💎</span> MALI ZA KAMPUNI
                        </div>
                        <div style="font-size:12.5px;color:#475569;line-height:1.7;">${narrative.resources}</div>
                    </div>
                </div>

                <!-- Warnings -->
                ${narrative.warnings && narrative.warnings.length > 0 ? `
                    <div style="margin-bottom:20px;">
                        <div style="font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                            <span style="font-size:16px;">⚠️</span> TAHADHARI NA MAAFA
                        </div>
                        <div style="display:flex;flex-direction:column;gap:10px;">
                            ${narrative.warnings.map(w => {
                                const colors = {
                                    'cash-flow': { bg: 'rgba(220,38,38,0.06)', border: '#dc2626', text: '#7f1d1d' },
                                    'payroll': { bg: 'rgba(245,158,11,0.06)', border: '#f59e0b', text: '#78350f' },
                                    'payments': { bg: 'rgba(245,158,11,0.06)', border: '#f59e0b', text: '#78350f' },
                                    'transfers': { bg: 'rgba(245,158,11,0.06)', border: '#f59e0b', text: '#78350f' },
                                    'reconciliation': { bg: 'rgba(220,38,38,0.06)', border: '#dc2626', text: '#7f1d1d' },
                                    'success': { bg: 'rgba(34,197,94,0.06)', border: '#22c55e', text: '#166534' }
                                };
                                const c = colors[w.type] || colors['success'];
                                return `
                                    <div style="background:${c.bg};border-left:4px solid ${c.border};border-radius:10px;padding:14px 18px;display:flex;gap:12px;align-items:flex-start;">
                                        <div style="font-size:20px;flex-shrink:0;">${w.icon}</div>
                                        <div style="flex:1;">
                                            <div style="font-size:13px;font-weight:800;color:${c.text};margin-bottom:4px;">${w.title}</div>
                                            <div style="font-size:12px;color:#475569;line-height:1.6;">${w.message}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- Recommendations -->
                ${narrative.recommendations && narrative.recommendations.length > 0 ? `
                    <div style="margin-bottom:20px;">
                        <div style="font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
                            <span style="font-size:16px;">💡</span> MAPENDEKEZO
                        </div>
                        <div style="background:linear-gradient(135deg,rgba(79,70,229,0.05),rgba(79,70,229,0.02));border-radius:12px;padding:18px 22px;border-left:4px solid #4f46e5;">
                            <ul style="margin:0;padding-left:20px;list-style:none;">
                                ${narrative.recommendations.map((r, i) => `
                                    <li style="font-size:13px;color:#334155;line-height:1.8;margin-bottom:8px;display:flex;gap:8px;align-items:flex-start;">
                                        <span style="color:#4f46e5;font-weight:900;flex-shrink:0;">${i + 1}.</span>
                                        <span>${r}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                ` : ''}

                <!-- Conclusion -->
                <div style="background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border-radius:14px;padding:22px 26px;position:relative;overflow:hidden;">
                    <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;background:radial-gradient(circle,rgba(245,158,11,0.3),transparent 70%);border-radius:50%;"></div>
                    <div style="position:relative;z-index:1;">
                        <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;opacity:0.85;text-transform:uppercase;margin-bottom:10px;">📌 HITIMISHO</div>
                        <div style="font-size:13.5px;line-height:1.8;color:rgba(255,255,255,0.95);">${narrative.conclusion}</div>
                    </div>
                </div>

            </div>
        </div>
    `;
}
function handlePeriodChange() {
    const period = document.getElementById('reportPeriod')?.value;
    const customWrap = document.getElementById('customDateRangeWrap');
    
    if (period === 'custom') {
        customWrap.style.display = 'flex';
        
        // Set defaults: mwanzo wa mwezi huu hadi leo
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const fromInput = document.getElementById('reportFromDate');
        const toInput = document.getElementById('reportToDate');
        
        if (fromInput && !fromInput.value) {
            fromInput.value = firstDay.toISOString().split('T')[0];
        }
        if (toInput && !toInput.value) {
            toInput.value = today.toISOString().split('T')[0];
        }
    } else {
        customWrap.style.display = 'none';
        loadFinanceReport();
    }
} 

function setReportPreparedBy() {
    const input = document.getElementById('reportPreparedBy');
    if (!input) return;
    
    const user = Auth.getUser();
    if (user && user.fullName) {
        input.value = user.fullName;
    } else {
        input.value = 'Finance Officer';
    }
}
async function loadDashboardOverview() {
    try {
        const userName = currentUser?.fullName || 'Finance Officer';
        setText('dashboardUserName', userName.split(' ')[0]);
        setText('dashboardDate', new Date().toLocaleDateString('en-GB', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
        }));

        const stats = await API.getDashboardStats();
        if (!stats || !stats.kpi) throw new Error('Invalid data format');

        setText('dashboardNetWorth', `TSh ${Number(stats.kpi.totalResources || 0).toLocaleString()}`);

        renderKPICards(stats.kpi);
        renderCashFlowChart(stats.charts?.cashFlowTrend || []);
        renderResourcesChart(stats.charts?.resourcesByCategory || []);
        renderModuleSummaries(stats.modules || {});
        renderRecentActivities(stats.recent || {});

    } catch (err) {
        console.error('❌ loadDashboardOverview error:', err);
        const kpiContainer = document.getElementById('kpiCards');
        if (kpiContainer) {
            kpiContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #dc2626; background: #fef2f2; border-radius: 12px; border: 1px solid #fecaca;">
                    <div style="font-size: 40px; margin-bottom: 10px;">❌</div>
                    <div style="font-size: 16px; font-weight: 800;">Imeshindwa Kupata Data</div>
                    <div style="font-size: 13px; margin-top: 6px; color: #7f1d1d;">${esc(err.message)}</div>
                    <button onclick="loadDashboardOverview()" style="margin-top: 16px; padding: 10px 24px; background: #0f766e; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-family: inherit;">🔄 Jaribu Tena</button>
                </div>
            `;
        }
    }
}

function renderKPICards(kpi) {
    const container = document.getElementById('kpiCards');
    if (!container) return;
    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();

    const cards = [
        { icon: '📥', label: 'Month Inflow', value: fmt(kpi.monthInflow) },
        { icon: '📤', label: 'Month Outflow', value: fmt(kpi.monthOutflow) },
        { icon: '📊', label: 'Net Change', value: (kpi.netChange >= 0 ? '+' : '') + fmt(kpi.netChange) },
        { icon: '🛒', label: 'Total Sales', value: fmt(kpi.totalSales) },
        { icon: '📦', label: 'Total Orders', value: kpi.totalOrders, sub: `${kpi.paidOrders} paid • ${kpi.pendingOrders} pending` },
        { icon: '💰', label: 'Total Resources', value: fmt(kpi.totalResources) }
    ];

    container.innerHTML = cards.map(c => `
        <div style="background: white; border-radius: 12px; padding: 18px 20px; border: 1px solid #e2e8f0; border-left: 4px solid #0f766e; box-shadow: 0 2px 10px rgba(15,118,110,0.05);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">${c.label}</div>
                <div style="width: 36px; height: 36px; border-radius: 10px; background: #f0fdf4; color: #0f766e; display: flex; align-items: center; justify-content: center; font-size: 18px;">${c.icon}</div>
            </div>
            <div style="font-size: 22px; font-weight: 900; color: #0f766e; font-family: 'Courier New', monospace; letter-spacing: -0.5px;">${c.value}</div>
            ${c.sub ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">${c.sub}</div>` : ''}
        </div>
    `).join('');
}

function renderCashFlowChart(trend) {
    const canvas = document.getElementById('cashFlowChart');
    if (!canvas) return;
    if (dashboardCharts.cashFlow) dashboardCharts.cashFlow.destroy();

    const labels = (trend || []).map(t => t.date);
    const inflows = (trend || []).map(t => t.inflow);
    const outflows = (trend || []).map(t => t.outflow);

    dashboardCharts.cashFlow = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Inflow', data: inflows, borderColor: '#16a34a', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#16a34a' },
                { label: 'Outflow', data: outflows, borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.1)', tension: 0.4, fill: true, pointRadius: 4, pointBackgroundColor: '#dc2626' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: TSh ${Number(ctx.parsed.y).toLocaleString()}` } } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: (v) => v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(1)+'K' : v, font: { size: 10 } }, grid: { color: '#f1f5f9' } },
                x: { ticks: { font: { size: 10 } }, grid: { display: false } }
            }
        }
    });
}

function renderResourcesChart(resourcesByCategory) {
    const canvas = document.getElementById('resourcesChart');
    if (!canvas) return;
    if (dashboardCharts.resources) dashboardCharts.resources.destroy();

    const data = resourcesByCategory || [];
    if (data.length === 0) {
        canvas.parentElement.innerHTML = '<div style="text-align: center; padding: 60px; color: #94a3b8;">No resources</div>';
        return;
    }

    const labels = data.map(r => r.category.charAt(0).toUpperCase() + r.category.slice(1));
    const values = data.map(r => r.amount);
    const colors = ['#0f766e', '#14b8a6', '#22c55e', '#4ade80', '#86efac', '#a7f3d0'];

    dashboardCharts.resources = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, data.length), borderWidth: 3, borderColor: '#ffffff' }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { font: { size: 10, weight: '600' }, padding: 8, boxWidth: 10 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: TSh ${Number(ctx.parsed).toLocaleString()}` } } },
            cutout: '60%'
        }
    });
}

function renderModuleSummaries(modules) {
    const container = document.getElementById('moduleSummaries');
    if (!container) return;
    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();

    const cards = [
        { icon: '💰', title: 'Payroll', total: modules.payroll?.total || 0, amount: modules.payroll?.amount || 0, pending: modules.payroll?.pending || 0, unit: 'RUNS', viewTab: 'tab-payroll-history' },
        { icon: '🏢', title: 'Company Payments', total: modules.companyPayments?.total || 0, amount: modules.companyPayments?.amount || 0, pending: modules.companyPayments?.pending || 0, unit: 'RECORDS', viewTab: 'tab-company-payments' },
        { icon: '💸', title: 'Fund Transfers', total: modules.fundTransfers?.total || 0, amount: modules.fundTransfers?.amount || 0, pending: null, unit: 'MOVES', viewTab: 'tab-fund-transfer' }
    ];

    container.innerHTML = cards.map(c => `
        <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(15,23,42,0.04);">
            <div style="background: linear-gradient(135deg, #0f766e, #134e4a); padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; color: white;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 18px;">${c.icon}</div>
                    <div style="font-size: 14px; font-weight: 800;">${c.title}</div>
                </div>
                <div style="font-size: 10px; font-weight: 800; padding: 4px 10px; background: rgba(255,255,255,0.15); border-radius: 20px;">${c.total} ${c.unit}</div>
            </div>
            <div style="padding: 14px 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                    <span style="font-size: 11px; color: #64748b;">Total Amount</span>
                    <span style="font-size: 14px; font-weight: 900; color: #0f766e; font-family: 'Courier New', monospace;">${fmt(c.amount)}</span>
                </div>
                ${c.pending !== null ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                        <span style="font-size: 11px; color: #64748b;">⏳ Pending</span>
                        <span style="font-size: 13px; font-weight: 800; color: #0f766e;">${c.pending} ${c.unit.toLowerCase()}</span>
                    </div>
                ` : ''}
                <button onclick="switchTab('${c.viewTab}')" style="margin-top: 8px; width: 100%; padding: 8px; background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; font-size: 11px; font-weight: 700; color: #0f766e; cursor: pointer; font-family: inherit;">
                    View ${c.title} →
                </button>
            </div>
        </div>
    `).join('');
}

function renderRecentActivities(recent) {
    const container = document.getElementById('recentActivities');
    if (!container) return;
    const fmt = (n) => 'TSh ' + Number(n || 0).toLocaleString();
    const formatDate = (d) => {
        if (!d) return '—';
        const date = new Date(d); const now = new Date(); const diff = Math.floor((now - date) / 1000);
        if (diff < 60) return 'Just now'; if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
        if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'; if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };
    const getStatus = (s) => {
        if (s === 'rejected') return { color: '#dc2626', label: 'Rejected' };
        return { color: '#0f766e', label: s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) };
    };

    container.innerHTML = `
        <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(15,23,42,0.04);">
            <div style="background: linear-gradient(135deg, #0f766e, #134e4a); padding: 14px 20px; color: white; font-size: 14px; font-weight: 800;">📦 Recent Orders</div>
            <div style="padding: 8px 0; max-height: 350px; overflow-y: auto;">
                ${(recent.orders || []).length === 0 ? '<div style="text-align: center; padding: 40px; color: #94a3b8; font-size: 13px;">No orders yet</div>' : recent.orders.map(o => {
                    const st = getStatus(o.status);
                    return `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #f1f5f9;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: #f0fdf4; color: #0f766e; display: flex; align-items: center; justify-content: center; font-size: 16px;">📦</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 13px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(o.orderId)}</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${esc(o.customerName || '—')} • ${formatDate(o.createdAt)}</div>
                            </div>
                            <div style="text-align: right; flex-shrink: 0;">
                                <div style="font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; color: #0f766e;">${fmt(o.totalAmount)}</div>
                                <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${st.color}; margin-top: 3px;">${st.label}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px rgba(15,23,42,0.04);">
            <div style="background: linear-gradient(135deg, #0f766e, #134e4a); padding: 14px 20px; color: white; font-size: 14px; font-weight: 800;">💸 Recent Company Payments</div>
            <div style="padding: 8px 0; max-height: 350px; overflow-y: auto;">
                ${(recent.companyPayments || []).length === 0 ? '<div style="text-align: center; padding: 40px; color: #94a3b8; font-size: 13px;">No payments yet</div>' : recent.companyPayments.map(p => {
                    const st = getStatus(p.status);
                    return `
                        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #f1f5f9;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: #f0fdf4; color: #0f766e; display: flex; align-items: center; justify-content: center; font-size: 16px;">💸</div>
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 13px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${esc(p.reference)}</div>
                                <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">${esc(p.vendor || '—')} • ${formatDate(p.createdAt)}</div>
                            </div>
                            <div style="text-align: right; flex-shrink: 0;">
                                <div style="font-size: 14px; font-weight: 900; font-family: 'Courier New', monospace; color: #0f766e;">${fmt(p.amount)}</div>
                                <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; color: ${st.color}; margin-top: 3px;">${st.label}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}
function openEditProfileModal() {
    if (!currentUser) {
        currentUser = Auth.getUser();
        if (!currentUser) { showToast('User data not found', 'error'); return; }
    }
    
    // Jaza data
    const nameEl = document.getElementById('editProfileName');
    if (nameEl) nameEl.value = currentUser.fullName || '';
    
    const titleEl = document.getElementById('editProfileTitle');
    if (titleEl) titleEl.value = currentUser.role || '';
    
    const deptEl = document.getElementById('editProfileDepartment');
    if (deptEl) deptEl.value = currentUser.department || 'Finance';
    
    const emailEl = document.getElementById('editProfileEmail');
    if (emailEl) emailEl.value = currentUser.email || '';
    
    const phoneEl = document.getElementById('editProfilePhone');
    if (phoneEl) phoneEl.value = currentUser.phone || '';
    
    const idEl = document.getElementById('editProfileEmployeeId');
    if (idEl) idEl.value = currentUser.employeeId || '';

    // Preview picture
    const preview = document.getElementById('editPicPreview');
    if (preview) {
        const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        if (currentUser.profilePic) {
            preview.innerHTML = `<img src="${currentUser.profilePic}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            preview.innerHTML = `<span>${initials}</span>`;
        }
    }
    
    currentProfilePic = currentUser.profilePic || null;
    
    const status = document.getElementById('editProfileStatus');
    if (status) { status.className = 'status-msg'; status.textContent = ''; }
    
    document.getElementById('editProfileModal').classList.add('show');
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
        showToast('📷 Photo uploaded!', 'info');
    };
    reader.readAsDataURL(file);
}
function removeProfilePic() {
    currentProfilePic = null;
    if (!currentUser) return;
    const initials = currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const preview = document.getElementById('editPicPreview');
    if (preview) preview.innerHTML = `<span>${initials}</span>`;
    showToast('🗑️ Photo removed.', 'warning');
}
async function saveUserProfile() {
    const statusDiv = document.getElementById('editProfileStatus');
    const phone = document.getElementById('editProfilePhone')?.value.trim();
    
    if (!phone) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please enter Phone Number.';
        return;
    }
    
    const phoneRegex = /^\+?[\d\s\-()]{9,}$/;
    if (!phoneRegex.test(phone)) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Invalid phone number.';
        return;
    }
    
    try {
        const payload = { phone };
        if (currentProfilePic !== currentUser.profilePic) payload.profilePic = currentProfilePic;
        
        const response = await API.updateOwnProfile(payload);
        currentUser = { ...currentUser, ...response.user };
        
        Auth.saveSession(Auth.getToken(), currentUser);
        renderFinanceProfile(); // Refresh Sidebar & Header
        
        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Profile updated!';
        showToast('✅ Profile saved!', 'success');
        
        setTimeout(() => closeModal('editProfileModal'), 1000);
        
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}

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
let currentViewingRequestId = null;
function openProcurementViewModal(requestData) {
    // 1. Hifadhi ID kwa usalama (String)
    currentViewingRequestId = String(requestData.id || requestData.requestNumber || requestData.reqNumber);

    // 2. Jaza Taarifa za Juu (Header)
    document.getElementById('viewProcurementId').innerText = requestData.id || requestData.requestNumber || '—';
    document.getElementById('viewProcurementDept').innerText = requestData.department || 'Finance Department';
    document.getElementById('viewProcurementRequester').innerText = requestData.requestedBy || requestData.requesterName || '—';
    
    // Format tarehe
    let dateStr = '—';
    if (requestData.date || requestData.createdAt) {
        const d = new Date(requestData.date || requestData.createdAt);
        dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    document.getElementById('viewProcurementDate').innerText = dateStr;
    
    document.getElementById('viewProcurementUrgency').innerText = (requestData.urgency || 'NORMAL').toUpperCase();
    document.getElementById('viewProcurementRequiredBy').innerText = requestData.requiredBy || '—';
    document.getElementById('viewProcurementJustification').innerText = requestData.justification || '—';

    // 3. Weka Status na Badge Rangi
    const statusText = (requestData.status || 'pending').toLowerCase();
    const statusBadge = document.getElementById('badgeStatus');
    const statusSpan = document.getElementById('viewProcurementStatus');
    const rejectBox = document.getElementById('viewProcurementRejectReason');
    const btnResubmit = document.getElementById('btnResubmitRequest');

    // Reset default
    statusSpan.innerText = statusText.replace(/-/g, ' ').toUpperCase();
    statusBadge.style.background = 'rgba(245, 158, 11, 0.15)';
    statusBadge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
    statusBadge.style.color = '#fbbf24';
    rejectBox.style.display = 'none';
    btnResubmit.style.display = 'none';

    // Angalia kama imekataliwa au imerudishwa
    if (statusText === 'rejected' || statusText === 'returned' || statusText === 'declined') {
        // Badilisha rangi ya Badge kuwa Nyekundu
        statusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        statusBadge.style.color = '#f87171';
        
        // Onyesha Sanduku la Sababu ya Kukataliwa
        if (requestData.rejectReason || requestData.returnReason) {
            rejectBox.style.display = 'block';
            document.getElementById('viewProcurementRejectText').innerText = requestData.rejectReason || requestData.returnReason;
        }

        // 🆕 Onyesha Kitufe cha Edit & Resubmit
        btnResubmit.style.display = 'flex';

    } else if (statusText === 'approved' || statusText === 'completed') {
        // Badilisha rangi kuwa Kijani
        statusBadge.style.background = 'rgba(34, 197, 94, 0.15)';
        statusBadge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        statusBadge.style.color = '#4ade80';
    }

    // 4. Jaza Items kwenye Orodha
    const itemsContainer = document.getElementById('viewProcurementItemsContainer');
    itemsContainer.innerHTML = ''; // Safisha kwanza
    
    let totalAmount = 0;
    const items = requestData.items || [];

    if (items.length === 0) {
        itemsContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #64748b; font-size: 13px;">No items listed.</div>`;
    } else {
        items.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice || item.price) || 0;
            const subtotal = qty * price;
            totalAmount += subtotal;

            const itemHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: white; border-bottom: 1px solid #e2e8f0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${item.name || item.itemName}</div>
                        <div style="font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px;">
                            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #475569;">📦 ${item.specification || item.spec || 'General'}</span>
                            ${qty} ${item.unit || 'pcs'} × TSh ${price.toLocaleString()}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">SUBTOTAL</div>
                        <div style="font-size: 15px; font-weight: 900; color: #0f172a; font-family: 'Courier New', monospace;">TSh ${subtotal.toLocaleString()}</div>
                    </div>
                </div>
            `;
            itemsContainer.innerHTML += itemHTML;
        });
    }
    document.getElementById('viewProcurementItemCount').innerText = items.length;
    document.getElementById('viewProcurementTotal').innerText = 'TSh ' + totalAmount.toLocaleString();

    // 6. Fungua Modal
    document.getElementById('procurementModal').classList.add('show');
}
let allMyRequests = [];
function editAndResubmitRequest() {
    if (!currentViewingRequestId) return;
    
    // 1. Funga Modal ya ku-view
    document.getElementById('procurementModal').classList.remove('show');
    
    // 2. Tafuta data ya ombi hili kwenye array yako
    const requestToEdit = allMyRequests.find(r => 
        String(r.id) === String(currentViewingRequestId) || 
        String(r.requestNumber) === String(currentViewingRequestId) ||
        String(r.reqNumber) === String(currentViewingRequestId)
    );
    
    if (requestToEdit) {
        // 3. Fungua Fomu ya kuandika ombi (Create Modal)
        openDeptRequestModal(); 
        
        // 4. Jaza taarifa za msingi
        document.getElementById('deptRequestTitle').value = requestToEdit.title || requestToEdit.request_title || '';
        document.getElementById('deptRequestJustification').value = requestToEdit.justification || requestToEdit.request_justification || '';
        document.getElementById('deptRequestUrgency').value = requestToEdit.urgency || 'normal';
        document.getElementById('deptRequestRequiredBy').value = requestToEdit.requiredBy || requestToEdit.required_by || '';

        // 5. Jaza orodha ya bidhaa (Items)
        const itemsBody = document.getElementById('deptRequestItemsBody');
        if (itemsBody) {
            itemsBody.innerHTML = ''; // Safisha kwanza
            
            const items = requestToEdit.items || [];
            if (items.length > 0) {
                items.forEach(item => {
                    // Tunaita function ya kuongeza mstari na kujaza data
                    addDeptRequestItemRow(
                        item.name || item.itemName, 
                        item.specification || item.spec, 
                        item.quantity, 
                        item.unit, 
                        item.unitPrice || item.price
                    );
                });
                // Sasisha jumla kuu kama unayo function hiyo
                if (typeof updateDeptRequestTotal === 'function') {
                    updateDeptRequestTotal();
                }
            } else {
                // Kama hakuwa na bidhaa, ongeza mstari mmoja mtupu
                addDeptRequestItemRow();
            }
        }
    } else {
        cpToast('Error', 'Data ya ombi hili haipo kwenye mfumo!', 'error');
    }
}
let currentFinanceRequestId = null;
let currentFinanceMsgReqId = null;
let deptRequestItemCounter = 0;
window.deptRequestAttachments = [];

function handleDeptRequestFiles(event) {
    const files = event.target.files;
    const listDiv = document.getElementById('deptRequestFilesList');
    
    if (files.length === 0) {
        listDiv.innerHTML = 'No files attached yet.';
        return;
    }

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Max 5MB.`);
            continue;
        }
        window.deptRequestAttachments.push(file);
    }

    // Update UI
    if (window.deptRequestAttachments.length > 0) {
        listDiv.innerHTML = window.deptRequestAttachments.map(f => `📄 ${f.name}`).join('<br>');
    } else {
        listDiv.innerHTML = 'No files attached yet.';
    }
}
function submitDeptRequest() {
    const statusDiv = document.getElementById('deptRequestStatus');
    const showStatus = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
    };

    const title = document.getElementById('deptRequestTitle').value.trim();
    const justification = document.getElementById('deptRequestJustification').value.trim();
    
    // 🆕 Pata taarifa za message
    const msgSubject = document.getElementById('deptRequestMsgSubject')?.value.trim();
    const msgBody = document.getElementById('deptRequestMsgBody')?.value.trim();

    if (!title) return showStatus('⚠ Please enter a request title');
    if (!justification) return showStatus('⚠ Please provide a justification');

    const items = [];
    document.querySelectorAll('#deptRequestItemsBody tr').forEach(row => {
        const name = row.querySelector('.dept-item-name')?.value.trim();
        const spec = row.querySelector('.dept-item-spec')?.value.trim();
        const qty = parseFloat(row.querySelector('.dept-item-qty')?.value) || 0;
        const unit = row.querySelector('.dept-item-unit')?.value || 'pcs';
        const price = parseFloat(row.querySelector('.dept-item-price')?.value) || 0;

        if (name && qty > 0) {
            items.push({ itemName: name, specification: spec || null, quantity: qty, unit, estimatedPrice: price });
        }
    });

    if (items.length === 0) return showStatus('⚠ Add at least one item');

    const user = Auth.getUser();
    const payload = {
        department: user?.department || 'Finance Department',
        title: title,
        notes: justification,
        urgency: document.getElementById('deptRequestUrgency').value,
        requiredBy: document.getElementById('deptRequestRequiredBy').value || null,
        items: items,
        // 🆕 Ongeza ujumbe kama upo
        messageSubject: msgSubject || null,
        messageBody: msgBody || null,
        // 🆕 Ongeza attachments kama zipo (kama API yako inaruhusu)
        attachments: window.deptRequestAttachments.length > 0 ? window.deptRequestAttachments : null
    };

    // Hifadhi payload kwenye global variable kwa ajili ya Preview
    __pendingDeptPayload = payload;
    
    if (typeof showDeptRequestPreview === 'function') {
        showDeptRequestPreview(payload);
        closeDeptRequestModal();
    } else {
        confirmDeptRequestSubmit();
    }
}
async function confirmDeptRequestSubmit() {
    // 🆕 Tumia payload iliyohifadhiwa kwenye preview
    const payload = __pendingDeptPayload;
    
    if (!payload) {
        cpToast('❌ Error', 'No pending request to submit. Please create the request again.', 'error');
        return;
    }
    
    try {
        await API.createProcurementRequest(payload);
        cpToast('✅ Success', 'Request sent to Procurement successfully!', 'success');
        __pendingDeptPayload = null;
        closeDeptRequestModal();
        closeDeptRequestPreview();
        loadMyRequests();
    } catch (err) {
        cpToast('❌ Failed', err.message, 'error');
    }
}
function addDeptRequestItemRow(name = '', spec = '', qty = 1, unit = 'pcs', price = '') {
    const tbody = document.getElementById('deptRequestItemsBody');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #e2e8f0';
    
    row.innerHTML = `
        <td style="padding:6px 4px;">
            <input type="text" class="dept-item-name" value="${name}" placeholder="Item name" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;">
        </td>
        <td style="padding:6px 4px;">
            <input type="text" class="dept-item-spec" value="${spec}" placeholder="Spec" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;">
        </td>
        <td style="padding:6px 4px;">
            <input type="number" class="dept-item-qty" value="${qty}" min="1" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;" oninput="updateDeptRequestTotal()">
        </td>
        <td style="padding:6px 4px;">
            <select class="dept-item-unit" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;">
                <option value="pcs" ${unit === 'pcs' ? 'selected' : ''}>Pcs</option>
                <option value="bags" ${unit === 'bags' ? 'selected' : ''}>Bags</option>
                <option value="blocks" ${unit === 'blocks' ? 'selected' : ''}>Blocks</option>
                <option value="tons" ${unit === 'tons' ? 'selected' : ''}>Tons</option>
                <option value="kg" ${unit === 'kg' ? 'selected' : ''}>Kg</option>
                <option value="litres" ${unit === 'litres' ? 'selected' : ''}>Litres</option>
                <option value="boxes" ${unit === 'boxes' ? 'selected' : ''}>Boxes</option>
                <option value="sheets" ${unit === 'sheets' ? 'selected' : ''}>Sheets</option>
            </select>
        </td>
        <td style="padding:6px 4px;">
            <input type="number" class="dept-item-price" value="${price}" placeholder="0" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:12px;font-family:inherit;" oninput="updateDeptRequestTotal()">
        </td>
        <td style="padding:6px 4px;text-align:center;">
            <button type="button" onclick="this.closest('tr').remove(); updateDeptRequestTotal();" style="background:#ef4444;color:white;border:none;border-radius:6px;width:30px;height:30px;cursor:pointer;font-size:14px;display:inline-flex;align-items:center;justify-content:center;">✕</button>
        </td>
    `;
    
    tbody.appendChild(row);
}
function updateDeptRequestTotal() {
    const rows = document.querySelectorAll('#deptRequestItemsBody tr');
    let total = 0;
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.dept-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.dept-item-price')?.value) || 0;
        total += (qty * price);
    });
    const el = document.getElementById('deptRequestTotalDisplay');
    if (el) el.innerText = 'TSh ' + total.toLocaleString();
}
async function loadMyRequests() {
    const tbody = document.getElementById('myRequestsTableBody');
    if (!tbody) return;

    // ✅ FIX: colspan="6" (badala ya 8)
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#9aa38b;">⏳ Loading requests...</td></tr>`;

    try {
        const all = await API.getProcurementRequests('/all');
        const user = Auth.getUser();
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        
        const myRequests = list.filter(r => {
            if (r.requested_by_id && user.userId) return Number(r.requested_by_id) === Number(user.userId);
            return r.requested_by === user.fullName;
        });

        // ✅ FIX: Hifadhi kwa ajili ya edit & resubmit
        allMyRequests = myRequests;

        if (myRequests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#9aa38b;">📭 You haven't submitted any requests yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = myRequests.map(r => {
            const statusInfo = getDeptStatusInfo(r.status);
            const unread = Number(r.unread_messages || 0);
            const msgBadge = unread ? `<span style="background:#dc2626;color:#fff;border-radius:10px;padding:0 6px;font-size:10px;margin-left:3px;">${unread}</span>` : '';

            // ✅ FIX: data-* attributes badala ya onclick injection
            const safeTitle = esc(r.title || '');

            return `
            <tr style="border-bottom:1px solid #eef0ea;">
                <td style="padding:10px 12px;"><strong style="font-family:monospace;color:#0f766e;">${esc(r.request_number || '—')}</strong></td>
                <td style="padding:10px 12px;">${esc(r.title || '—')}</td>
                <td style="padding:10px 12px;">TSh ${Number(r.total_amount || 0).toLocaleString()}</td>
                <td style="padding:10px 12px;">
                    <span style="display:inline-flex;align-items:center;gap:4px;background:${statusInfo.bg};color:${statusInfo.color};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;">
                        ${statusInfo.icon} ${statusInfo.label}
                    </span>
                </td>
                <td style="padding:10px 12px;">${r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '—'}</td>
                <td style="padding:10px 12px;text-align:center;white-space:nowrap;">
                    <button onclick="viewFinanceRequest(${r.id})" style="padding:4px 10px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">👁</button>
                    <button data-req-id="${r.id}" data-req-title="${safeTitle}" onclick="openFinanceMessages(this.dataset.reqId, this.dataset.reqTitle)" style="padding:4px 10px;background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;border-radius:6px;font-size:11px;cursor:pointer;font-weight:700;margin-left:4px;">
                        💬 ${msgBadge}
                    </button>
                    ${r.status === 'pending-finance' ? `
                        <button onclick="financePayRequest(${r.id})" style="padding:4px 10px;background:#22c55e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;margin-left:4px;">💰 Pay</button>
                    ` : ''}
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        console.error('❌ loadMyRequests error:', err);
        // ✅ FIX: colspan="6"
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#dc2626;">
            ❌ Error: ${esc(err.message)}
        </td></tr>`;
    }
}
async function viewFinanceRequest(id) {
    try {
        // Vuta data halisi kutoka API
        const request = await API.getProcurementRequestById(id);
        if (!request) return cpToast('Error', 'Request not found', 'error');

        // 1. Rekebisha jina la Request Number
        const reqNumber = request.request_number || request.reqNumber || request.id;
        document.getElementById('viewProcurementId').innerText = reqNumber;
        
        // 2. Rekebisha Department na Requested By (Angalia majina ya fields kwenye database yako)
        document.getElementById('viewProcurementDept').innerText = request.department || 'Finance Department';
        document.getElementById('viewProcurementRequester').innerText = request.requested_by || request.requesterName || '—';
        
        // 3. Rekebisha Tarehe
        let dateStr = '—';
        if (request.created_at || request.date) {
            const d = new Date(request.created_at || request.date);
            dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        document.getElementById('viewProcurementDate').innerText = dateStr;
        
        document.getElementById('viewProcurementUrgency').innerText = (request.urgency || 'NORMAL').toUpperCase();
        document.getElementById('viewProcurementRequiredBy').innerText = request.required_by || request.requiredBy || '—';
        
        // 4. Rekebisha Justification
        document.getElementById('viewProcurementJustification').innerText = request.notes || request.justification || '—';

        // 5. Rekebisha Items (Hapa ndio kuna 'undefined' kwenye picha)
        const itemsContainer = document.getElementById('viewProcurementItemsContainer');
        itemsContainer.innerHTML = ''; 
        let totalAmount = 0;
        const items = request.items || [];

        items.forEach(item => {
            // Angalia majina ya fields kwenye database yako (mfano: item.itemName au item.name)
            const itemName = item.item_name || item.itemName || item.name || 'Unnamed Item';
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price || item.estimatedPrice || item.price) || 0;
            const subtotal = qty * price;
            totalAmount += subtotal;

            itemsContainer.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; background: white; border-bottom: 1px solid #e2e8f0;">
                    <div>
                        <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${esc(itemName)}</div>
                        <div style="font-size: 12px; color: #64748b;">
                            ${qty} ${item.unit || 'pcs'} × TSh ${price.toLocaleString()}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 9px; font-weight: 800; color: #94a3b8;">SUBTOTAL</div>
                        <div style="font-size: 15px; font-weight: 900; color: #0f172a; font-family: 'Courier New', monospace;">TSh ${subtotal.toLocaleString()}</div>
                    </div>
                </div>
            `;
        });

        document.getElementById('viewProcurementItemCount').innerText = items.length;
        document.getElementById('viewProcurementTotal').innerText = 'TSh ' + totalAmount.toLocaleString();

        // 6. Ongeza Vitufe vya PDF na Setup Payment kwenye Footer
        const footer = document.querySelector('#procurementModal .modern-modal-footer');
        // Safisha vitufe vya zamani kama vipo
        const oldBtns = footer.querySelectorAll('.dynamic-action-btn');
        oldBtns.forEach(b => b.remove());

        // Kitufe cha ku-view PDF
        if (request.imprest_id || request.permit_url) {
            const pdfBtn = document.createElement('a');
            // Badilisha URL hii iendane na API yako ya kupata PDF
            pdfBtn.href = request.permit_url || `${CONFIG.API_URL}/imprests/${request.imprest_id}/pdf`; 
            pdfBtn.target = '_blank';
            pdfBtn.className = 'dynamic-action-btn';
            pdfBtn.innerHTML = '📄 View Permit (PDF)';
            pdfBtn.style.cssText = 'padding: 10px 24px; background: #f59e0b; color: white; border-radius: 8px; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; margin-right: auto;';
            footer.prepend(pdfBtn);
        }

        // Kitufe cha Setup Payment (Kama request iko kwa Finance)
        if (request.status === 'pending-finance' || request.status === 'approved') {
            const payBtn = document.createElement('button');
            payBtn.className = 'dynamic-action-btn';
            payBtn.innerHTML = '💸 Proceed to Payment';
            payBtn.style.cssText = 'padding: 10px 24px; background: linear-gradient(135deg, #0f766e, #134e4a); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px;';
            payBtn.onclick = () => {
                closeModal('procurementModal');
                setupPaymentForRequest(request.id);
            };
            footer.appendChild(payBtn);
        }

        // Fungua Modal
        document.getElementById('procurementModal').classList.add('show');

    } catch (err) {
        console.error(err);
        cpToast('Error', err.message, 'error');
    }
}
// ================================================================
// MESSAGES (Finance) - OPEN / CLOSE & LOAD
// ================================================================
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
        // Pata jina lako kamili kwa ajili ya kulinganisha
        const myFullName = (user.fullName || '').toLowerCase().trim(); 
        const myInitials = user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'ME';

        thread.innerHTML = msgs.map(m => {
            // ✅ FIX: Angalia kama sender_name inafanana na jina lako
            const senderNameLower = (m.sender_name || '').toLowerCase().trim();
            const isMine = (senderNameLower === myFullName) || (Number(m.sender_id) === Number(user.userId));
            
            const rowClass = isMine ? 'mine' : 'theirs';
            const senderInit = m.sender_name ? m.sender_name.substring(0, 2).toUpperCase() : '??';
            const displayInitials = isMine ? myInitials : senderInit;
            
            const ticks = isMine ? '<span class="chat-ticks">✓✓</span>' : '';
            const senderNameDisplay = isMine ? 'You' : esc(m.sender_name || 'Unknown');
            
            // Format muda
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
        
        // Scroll chini kabisa
        setTimeout(() => {
            thread.scrollTop = thread.scrollHeight;
        }, 50);
    })
    .catch(err => {
        thread.innerHTML = `<p style="color:#dc2626;text-align:center;padding:20px;">❌ ${esc(err.message)}</p>`;
    });
}
function openProcVerify(id) {
    document.getElementById('pv_req_id').value = id;
    document.getElementById('pv_ref').value = '';
    document.getElementById('procVerifyModal').classList.add('show');
}

async function submitProcVerify() {
    const id = document.getElementById('pv_req_id').value;
    const ref = document.getElementById('pv_ref').value;
    if(!ref) return cpToast('Kosa', 'Weka Reference Number', 'error');

    try {
        await API.financeVerifyProcurement(id, { 
            paymentReference: ref 
        });
        cpToast('✅ Imefanikiwa', 'Malipo yamepelekwa kwa Manager (Company Payments).', 'success');
        closeModal('procVerifyModal');
        
        // Refresh
        loadMyRequests(); 
        loadCompanyPayments(); // Refresh Company Payments table
    } catch(e) { 
        cpToast('Kosa', e.message, 'error'); 
    }
}
// ================================================================
// SEND MESSAGE
// ================================================================
async function sendMessage(btn) {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();
    
    if (!body) { 
        cpToast('Empty Message', 'Write a message first.', 'warning'); 
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
        cpToast('Failed', 'Could not send message: ' + err.message, 'error');
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

// ================================================================
// TYPING INDICATOR (Hiari)
// ================================================================
function handleTypingInput() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = 'flex';
        // Ficha baada ya sekunde 2 za ukimya
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }
}
async function financePayRequest(id) {
    // ✅ FIX: Tumia cpPrompt badala ya prompt()
    const res = await cpPrompt({
        title: '💰 Mark Request as Paid',
        message: 'Enter payment reference to confirm this request has been paid.',
        fields: [
            { 
                name: 'reference', 
                label: 'Payment Reference', 
                type: 'text', 
                required: true, 
                placeholder: 'e.g., CRDB-REF-12345 / M-Pesa Code' 
            },
            { 
                name: 'notes', 
                label: 'Notes (optional)', 
                type: 'text', 
                placeholder: 'Any additional information' 
            }
        ],
        okText: '💰 Mark as Paid',
        cancelText: 'Cancel',
        type: 'success'
    });
    
    if (!res.confirmed) return;
    
    try {
        await API.updateProcurementStatus(id, { 
            status: 'paid', 
            notes: res.values.notes || res.values.reference,
            paymentReference: res.values.reference
        });
        cpToast('✅ Payment Recorded', 'Request marked as paid successfully.', 'success');
        loadMyRequests();
        if (typeof loadFinanceDashboard === 'function') loadFinanceDashboard();
    } catch (err) {
        cpToast('❌ Failed', err.message, 'error');
    }
}
function getDeptStatusInfo(status) {
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
function openDeptRequestModal() {
    document.getElementById('deptRequestTitle').value = '';
    document.getElementById('deptRequestJustification').value = '';
    document.getElementById('deptRequestUrgency').value = 'normal';
    document.getElementById('deptRequestRequiredBy').value = '';
    document.getElementById('deptRequestItemsBody').innerHTML = '';
    document.getElementById('deptRequestStatus').className = 'status-msg';
    document.getElementById('deptRequestStatus').textContent = '';
    
    // 🆕 Safisha message na attachments
    if(document.getElementById('deptRequestMsgSubject')) document.getElementById('deptRequestMsgSubject').value = '';
    if(document.getElementById('deptRequestMsgBody')) document.getElementById('deptRequestMsgBody').value = '';
    window.deptRequestAttachments = [];
    if(document.getElementById('deptRequestFilesList')) document.getElementById('deptRequestFilesList').innerHTML = 'No files attached yet.';
    if(document.getElementById('deptRequestFiles')) document.getElementById('deptRequestFiles').value = '';

    deptRequestItemCounter = 0;
    addDeptRequestItemRow();
    updateDeptRequestTotal();
    
    document.getElementById('deptRequestModal').classList.add('show');
}
function closeDeptRequestModal() {
    document.getElementById('deptRequestModal').classList.remove('show');
}
let __pendingDeptPayload = null;

function showDeptRequestPreview(payload) {
    __pendingDeptPayload = payload;
    
    // Jaza taarifa za msingi
    const nameEl = document.getElementById('previewDeptName');
    const titleEl = document.getElementById('previewDeptTitle');
    const urgencyEl = document.getElementById('previewDeptUrgency');
    const requiredByEl = document.getElementById('previewDeptRequiredBy');
    const justificationEl = document.getElementById('previewDeptJustification');
    const itemsBody = document.getElementById('previewDeptItemsBody');
    const totalEl = document.getElementById('previewDeptTotal');
    
    if (nameEl) nameEl.textContent = payload.department || '—';
    if (titleEl) titleEl.textContent = payload.title || '—';
    if (urgencyEl) urgencyEl.textContent = (payload.urgency || 'normal').toUpperCase();
    if (requiredByEl) requiredByEl.textContent = payload.requiredBy || '—';
    if (justificationEl) justificationEl.textContent = payload.notes || '—';
    
    // Jaza items
    if (itemsBody) {
        const total = (payload.items || []).reduce((s, i) => s + (Number(i.quantity) * Number(i.estimatedPrice)), 0);
        
        itemsBody.innerHTML = (payload.items || []).map(item => `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:8px;font-weight:700;color:#1e293b;">${esc(item.itemName)}</td>
                <td style="padding:8px;color:#64748b;">${esc(item.specification || '—')}</td>
                <td style="padding:8px;text-align:center;">${item.quantity} ${item.unit}</td>
                <td style="padding:8px;text-align:right;font-weight:800;font-family:monospace;color:#0f766e;">TSh ${(Number(item.quantity) * Number(item.estimatedPrice)).toLocaleString()}</td>
            </tr>
        `).join('');
        
        if (totalEl) totalEl.textContent = 'TSh ' + total.toLocaleString();
    }
    
    document.getElementById('previewDeptRequestModal').classList.add('show');
}

function closeDeptRequestPreview() {
    const modal = document.getElementById('previewDeptRequestModal');
    if (modal) modal.classList.remove('show');
    __pendingDeptPayload = null;
}
// ================================================================
// PROCUREMENT HUB (SUB-TABS)
// ================================================================
function switchProcTab(tabName, event) {
    // 1. Ficha zote
    document.querySelectorAll('.proc-subtab').forEach(el => el.style.display = 'none');
    
    // 2. Ondoa active kwenye vitufe
    const btns = ['my-req', 'all-req', 'payments'];
    btns.forEach(b => {
        const btn = document.getElementById(`btn-tab-${b}`);
        if (btn) {
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '700';
        }
    });

    // 3. Onyesha iliyochaguliwa
    document.getElementById(`proc-tab-${tabName}`).style.display = 'block';
    if (event && event.currentTarget) {
        event.currentTarget.style.borderBottomColor = '#0f766e';
        event.currentTarget.style.color = '#0f766e';
        event.currentTarget.style.fontWeight = '800';
    }

    // 4. Load data kulingana na tab
    if (tabName === 'my-req') {
        loadMyRequests();
    } else if (tabName === 'all-req') {
        loadAllDeptRequests();
    } else if (tabName === 'payments') {
        loadProcurementFinanceRequests();
    }
}

// ================================================================
// LOAD ALL DEPARTMENT REQUESTS (Kwa ajili ya Finance kuona)
// ================================================================
async function loadAllDeptRequests() {
    const tbody = document.getElementById('allRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#9aa38b;">⏳ Loading...</td></tr>`;

    try {
        const all = await API.getProcurementRequests('/all');
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#9aa38b;">📭 No requests found.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(r => {
            const statusInfo = getDeptStatusInfo(r.status); // Function yako ya status
            return `
            <tr style="border-bottom:1px solid #eef0ea;">
                <td style="padding:10px 12px;"><strong style="font-family:monospace;color:#0f766e;">${esc(r.request_number || '—')}</strong></td>
                <td style="padding:10px 12px;">
                    <div style="font-weight:700;color:#1e293b;">${esc(r.department || '—')}</div>
                    <div style="font-size:11px;color:#64748b;">By: ${esc(r.requested_by || '—')}</div>
                </td>
                <td style="padding:10px 12px;">${esc(r.title || '—')}</td>
                <td style="padding:10px 12px;font-weight:800;color:#0f766e;">TSh ${Number(r.total_amount || 0).toLocaleString()}</td>
                <td style="padding:10px 12px;">
                    <span style="display:inline-flex;align-items:center;gap:4px;background:${statusInfo.bg};color:${statusInfo.color};padding:4px 10px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;">
                        ${statusInfo.icon} ${statusInfo.label}
                    </span>
                </td>
                <td style="padding:10px 12px;text-align:center;white-space:nowrap;">
                    <button onclick="viewFinanceRequest(${r.id})" style="padding:6px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;">👁 View</button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:#dc2626;">❌ ${esc(err.message)}</td></tr>`;
    }
}

// ================================================================
// LOAD PROCUREMENT PAYMENTS (Zilizofika kwa Finance)
// ================================================================
async function loadProcurementFinanceRequests() {
    const container = document.getElementById('procurementPaymentsContainer');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8;">⏳ Loading...</div>';
    
    try {
        // API hii inapaswa kurudisha requests zenye status 'pending-finance' au zilizokwama kwa Finance
        const requests = await API.getProcurementRequests('/pending?stage=finance');
        
        // Update badge kwenye tab
        const badge = document.getElementById('navProcPaymentsBadge');
        if (badge) {
            if (requests.length > 0) {
                badge.textContent = requests.length;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        if (requests.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8;">📭 No pending procurement payments.</div>';
            return;
        }
        
        container.innerHTML = requests.map(r => `
            <div style="background:white;border-radius:12px;padding:16px 20px;margin-bottom:12px;border-left:4px solid #14b8a6;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                    <div style="flex:1;min-width:220px;">
                        <div style="font-family:monospace;font-weight:800;color:#022908;font-size:14px;">${esc(r.request_number)}</div>
                        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-top:4px;">${esc(r.title || 'Untitled Request')}</div>
                        <div style="font-size:12px;color:#64748b;margin-top:4px;">Dept: ${esc(r.department)} • By: ${esc(r.requested_by)}</div>
                        ${r.imprest_number ? `<div style="font-size:11px;color:#14b8a6;font-weight:700;margin-top:2px;">📄 Permit: ${esc(r.imprest_number)}</div>` : ''}
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:18px;font-weight:900;color:#022908;font-family:'Courier New',monospace;">TSh ${Number(r.total_amount || 0).toLocaleString()}</div>
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-top:2px;">To Pay</div>
                    </div>
                </div>
                <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
                    <button onclick="viewFinanceRequest(${r.id})" style="padding:8px 16px;background:#f0fdfa;color:#0f766e;border:1.5px solid #ccfbf1;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;">👁 View Details & Permit</button>
                    <button onclick="setupPaymentForRequest(${r.id})" style="padding:8px 16px;background:linear-gradient(135deg,#0f766e,#134e4a);color:white;border:none;border-radius:8px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;">💸 Proceed to Payment</button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">❌ ${err.message}</div>`;
    }
}
async function setupPaymentForRequest(reqId) {
    try {
        const req = await API.getProcurementRequestById(reqId);
        if (!req) return;

        // 1. Vuta accounts zote zilizoidhinishwa
        const accounts = await API.getApprovedAccounts().catch(() => []);
        
        // Chuja kwa uangalifu zaidi: Chukua zote zenye operations AU collections
        const opsAccounts = accounts.filter(a => 
            a.purpose === 'operations' || 
            a.purpose === 'collections' || 
            !a.purpose // Kama haina purpose, iweke pia
        );
        
        if (opsAccounts.length === 0) {
            return cpToast('Hakuna Account', 'Hakuna Account iliyoidhinishwa kwa sasa. Tafadhali nenda kwenye "Accounts" uunde na uidhinishwe kwanza.', 'warning');
        }

        const options = opsAccounts.map(a => ({
            value: String(a.id), 
            label: `${a.name} (${a.currency || 'TZS'} ${Number(a.balance || 0).toLocaleString()})`
        }));

        // 2. Fungua Fomu
        const res = await cpPrompt({
            title: '💸 Setup Procurement Payment',
            message: `Set up payment for <strong>${esc(req.request_number)}</strong> (TSh ${Number(req.total_amount).toLocaleString()})`,
            fields: [
                { 
                    name: 'accountId', 
                    label: 'Chagua Account ya Malipo', 
                    type: 'select', 
                    options: options, 
                    required: true 
                },
                { 
                    name: 'invoiceNumber', 
                    label: 'Invoice Number', 
                    type: 'text', 
                    placeholder: 'e.g., INV-12345', 
                    required: true 
                },
                { 
                    name: 'supplierName', 
                    label: 'Supplier Name', 
                    type: 'text', 
                    placeholder: 'e.g., Mkalimu Ltd', 
                    required: true 
                }
            ],
            okText: 'Tengeneza Company Payment',
            type: 'primary'
        });

        if (!res.confirmed) return;

        // 🆕 Ulinzi mkali wa accountId
        const selectedAccountId = res.values.accountId; 
        if (!selectedAccountId) {
            return cpToast('Kosa', 'Tafadhali chagua account kabla ya kuendelea.', 'error');
        }

        // Pata jina la account iliyochaguliwa
        const selectedAccount = opsAccounts.find(a => String(a.id) === String(selectedAccountId));
        const accountName = selectedAccount ? selectedAccount.name : 'Unknown Account';

        // 3. TENGENEZA COMPANY PAYMENT
        const newCompanyPayment = {
            type: 'procurement',
            reference: `PAY-${req.request_number}`, 
            vendor: res.values.supplierName,
            amount: Number(req.total_amount),
            dueDate: null,
            method: 'bank',
            description: `Malipo ya Manunuzi: ${req.title} (Invoice: ${res.values.invoiceNumber}) | Account: ${accountName}`,
            accountId: parseInt(selectedAccountId), // 🆕 MUHIMU: Hii inasave account ID
            status: 'draft', 
            procurementRequestId: reqId 
        };

        // Hifadhi Company Payment kwenye API
        await API.createCompanyPayment(newCompanyPayment);
        
        // 4. Sasisha Procurement Request (Bado haijalipwa, inasubiri Manager)
        await API.updateProcurementStatus(reqId, { status: 'pending-manager' });

        cpToast('✅ Success', 'Payment setup complete. Sent to Manager for verification.', 'success');
        
        // Refresh data
        if (typeof loadProcurementFinanceRequests === 'function') loadProcurementFinanceRequests(); 
        if (typeof loadCompanyPayments === 'function') loadCompanyPayments(); 
        
    } catch (err) {
        console.error('Setup payment error:', err);
        cpToast('Failed', err.message || 'Failed to setup payment', 'error');
    }
}
function refreshAll() { loadFinanceDashboard(); cpToast('🔄 Refreshed!', 'Dashboard refreshed.', 'info'); }
function refreshEmployees() { loadEmployees(); cpToast('🔄 Refreshed!', 'Employees refreshed.', 'info'); }
 
function openResourceModal() { cpToast('Coming Soon', 'Financial Resources — Feature coming soon', 'info'); }
function openReportsHub(tab) { cpToast('Coming Soon', 'Reports — Feature coming soon', 'info'); }
// ================================================================
// 🆕 MY BUDGET — Finance Department View
// 🎨 RANGI: #0f766e (Teal) + #f59e0b (Gold)
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

        if (allocStatus === 'draft') {
            badgeText = '📝 Draft Saved';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="...">✏️ Continue Draft</button>`;
        } 
        else if (allocStatus === 'submitted' || allocStatus === 'approved') {
            badgeText = '✅ Submitted';
            buttonHtml = `
                <button onclick="viewSubmittedBreakdown()" style="...">👁️ View Details</button>
                <!-- HAPA NDIPO KITUFE CHA BUDGET BOOK KINAPASWA KUWA -->
                <button onclick="openMyDeptBudgetBook()" style="padding:12px 24px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; margin-left:8px; box-shadow:0 4px 12px rgba(22,163,74,0.3);">📖 Open Budget Book</button>
                <span style="display:inline-flex; align-items:center; padding:0 16px; background:#f1f5f9; color:#94a3b8; border-radius:10px; font-weight:800; font-size:12px; margin-left:8px;">🔒 Locked</span>
            `;
        }
        else {
            badgeText = '⏳ Action Required';
            buttonHtml = `<button onclick="openBudgetBreakdownPage()" style="...">➕ Prepare Breakdown</button>`;
        }

        if (badge) badge.textContent = badgeText;

        const isSubmitted = allocStatus === 'submitted' || allocStatus === 'approved';
        
        // 🎨 RANGI: #0f766e + #f59e0b
        container.innerHTML = `
            <div style="background:linear-gradient(135deg, #0f766e, #134e4a); padding:24px 28px; border-radius:14px; color:white; margin-bottom:20px; border-left: 5px solid #f59e0b;">
                <div style="font-size:11px; font-weight:800; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:1.5px; margin-bottom:6px;">Ceiling Allocated</div>
                <div style="font-size:32px; font-weight:900; font-family:'Courier New',monospace; color:#fbbf24;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
                <div style="font-size:12px; color:rgba(255,255,255,0.7); margin-top:8px;">${esc(latest.title)} • ${esc(latest.period)}</div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div style="background:#f8fafc; border-radius:10px; padding:16px; border:1px solid #e2e8f0; border-left: 4px solid #0f766e;">
                    <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Status</div>
                    <div style="font-size:14px; font-weight:800; color:${isSubmitted ? '#16a34a' : allocStatus === 'draft' ? '#d97706' : '#64748b'};">
                        ${isSubmitted ? '✅ Submitted' : allocStatus === 'draft' ? '📝 Draft Saved' : '⏳ Pending'}
                    </div>
                </div>
                <div style="background:#f8fafc; border-radius:10px; padding:16px; border:1px solid #e2e8f0; border-left: 4px solid #f59e0b;">
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

    // 🎨 RANGI: #0f766e + #f59e0b
    const activityHtml = `
        <div id="${activityId}" style="background:white; border-radius:14px; border:1.5px solid #e2e8f0; margin-bottom:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.04); border-left: 4px solid #0f766e;">
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
                    <div class="bd-activity-total" style="font-size:20px; font-weight:900; color:#0f766e; font-family:'Courier New',monospace;">TSh 0</div>
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
                <button onclick="addItemToActivity('${activityId}')" style="margin-top:12px; padding:8px 16px; background:rgba(245,158,11,0.15); color:#d97706; border:1px solid rgba(245,158,11,0.3); border-radius:8px; font-weight:700; cursor:pointer; font-family:inherit; font-size:12px;">➕ Add Item</button>
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
            <span class="bd-item-subtotal" style="font-family:'Courier New',monospace; font-weight:800; color:#0f766e; font-size:12px;">TSh 0</span>
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
                    <span style="font-weight:700; color:#0f766e; font-family:'Courier New',monospace;">TSh ${subtotal.toLocaleString()}</span>
                </div>
            `;
        }).join('');

        grandTotal += activityTotal;

        activitiesHtml += `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:10px; margin-bottom:12px; overflow:hidden;">
                <div style="background:#f8fafc; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0;">
                    <div style="font-weight:800; color:#0f766e; font-size:14px;">${idx + 1}. ${esc(activityName)}</div>
                    <div style="font-weight:900; color:#0f766e; font-family:'Courier New',monospace; font-size:14px;">TSh ${activityTotal.toLocaleString()}</div>
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
    
    // 🎨 RANGI: #0f766e + #f59e0b
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; max-width:700px; width:100%; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.4);">
            <div style="background:linear-gradient(135deg,#0f766e,#134e4a); padding:20px 26px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom: 3px solid #f59e0b;">
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
                    <div style="background:white; padding:14px 18px; border-radius:10px; border:1px solid #e2e8f0; border-left: 3px solid #0f766e;">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Ceiling</div>
                        <div style="font-size:18px; font-weight:900; color:#0f766e; font-family:'Courier New',monospace;">TSh ${Number(myAllocation.ceilingAmount).toLocaleString()}</div>
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
                <button onclick="document.getElementById('viewBreakdownModal').remove()" style="padding:12px 28px; background:linear-gradient(135deg,#0f766e,#134e4a); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; border: 1.5px solid #f59e0b;">Close</button>
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
                <div style="font-weight:800; color:#0f766e; font-size:14px;">${idx + 1}. ${esc(act.activityName)}</div>
                <div style="font-weight:900; color:#0f766e; font-family:'Courier New',monospace; font-size:14px;">TSh ${act.activityTotal.toLocaleString()}</div>
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
    
    // 🎨 RANGI: #0f766e + #f59e0b
    modal.innerHTML = `
        <div style="background:white; border-radius:20px; max-width:750px; width:100%; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 30px 80px rgba(0,0,0,0.4); transform:scale(0.95); transition:transform 0.3s;">
            <div style="background:linear-gradient(135deg,#0f766e,#134e4a); padding:20px 28px; color:white; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; border-bottom: 3px solid #f59e0b;">
                <div>
                    <h3 style="font-size:20px; font-weight:900; margin:0 0 4px 0;">👁️ Review Your Breakdown</h3>
                    <div style="font-size:12px; color:rgba(255,255,255,0.7);">Please verify everything is correct before submitting</div>
                </div>
                <button onclick="document.getElementById('budgetReviewModal').remove()" style="background:rgba(255,255,255,0.2); border:none; color:white; width:36px; height:36px; border-radius:50%; font-size:18px; cursor:pointer;">✕</button>
            </div>

            <div style="padding:24px 28px; overflow-y:auto; flex:1; background:#f8fafc;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:20px;">
                    <div style="background:white; padding:16px 20px; border-radius:10px; border:1px solid #e2e8f0; border-left: 3px solid #0f766e;">
                        <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Your Ceiling</div>
                        <div style="font-size:20px; font-weight:900; color:#0f766e; font-family:'Courier New',monospace;">TSh ${ceiling.toLocaleString()}</div>
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
                <button onclick="confirmAndSubmitBudget()" ${grandTotal > ceiling ? 'disabled' : ''} style="padding:12px 28px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-family:inherit; font-size:13px; box-shadow:0 4px 12px rgba(245,158,11,0.3); ${grandTotal > ceiling ? 'opacity:0.5; cursor:not-allowed;' : ''}">✅ Confirm & Submit to Manager</button>
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

    // 🎨 RANGI: #0f766e + #f59e0b
    const modalHTML = `
        <div class="modal-overlay show" id="budgetSuccessModal" style="z-index: 60000;">
            <div style="background:white; border-radius:20px; max-width:400px; width:100%; text-align:center; padding:32px 28px; box-shadow:0 25px 60px rgba(0,0,0,0.3); animation: modalIn 0.3s ease;">
                <div style="width:80px; height:80px; border-radius:50%; background:linear-gradient(135deg, #0f766e, #134e4a); display:flex; align-items:center; justify-content:center; margin:0 auto 20px; box-shadow:0 8px 24px rgba(15,118,110,0.4); border: 3px solid #f59e0b;">
                    <span style="font-size:40px; color:#f59e0b;">✔</span>
                </div>
                <h3 style="font-size:22px; font-weight:900; color:#0f766e; margin:0 0 10px 0;">${title}</h3>
                <p style="font-size:14px; color:#64748b; line-height:1.6; margin:0 0 24px 0;">${message}</p>
                <button onclick="document.getElementById('budgetSuccessModal').remove()" 
                        style="width:100%; padding:14px; background:linear-gradient(135deg, #0f766e, #134e4a); color:white; border:none; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer; transition:transform 0.2s; border: 1.5px solid #f59e0b;"
                        onmouseover="this.style.transform='translateY(-2px)'" 
                        onmouseout="this.style.transform='translateY(0)'">
                    Understood
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}
// ===== FINANCE: RENDER BUDGETS FILTERS =====
function renderBudgetsFilters() {
    const container = document.getElementById('allBudgetsContainer');
    if (!container) return;

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2023; y <= currentYear + 2; y++) years.push(y);
    years.sort((a, b) => b - a);

    const primary = '#0f766e';
    const accent = '#f59e0b';

    container.innerHTML = `
        <div id="budgetsStatsGrid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;"></div>
        <div style="background:white; border-radius:12px; padding:16px 20px; border:1px solid #e2e8f0; margin-bottom:20px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="budgetSearchInput" placeholder="🔍 Search budget..." oninput="filterBudgets()" style="flex:1; min-width:200px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
            <div style="position:relative; display:flex; align-items:center;">
                <input type="date" id="budgetDateFilter" onchange="filterBudgets()" style="padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; background:white; outline:none; cursor:pointer; color:#334155; font-weight:600;">
                <button onclick="clearDateFilter()" id="clearDateBtn" style="display:none; position:absolute; right:8px; background:#f1f5f9; border:none; width:22px; height:22px; border-radius:50%; cursor:pointer; color:#64748b; font-size:12px; font-weight:800;">✕</button>
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
function renderBudgetsList() {
    const container = document.getElementById('budgetsListContainer');
    if (!container) return;

    let filtered = [...allMyBudgets];

    // Filter by Search
    if (currentBudgetFilter.search) {
        const s = currentBudgetFilter.search;
        filtered = filtered.filter(b =>
            (b.title || '').toLowerCase().includes(s) ||
            (b.period || '').toLowerCase().includes(s) ||
            (b.createdBy || '').toLowerCase().includes(s)
        );
    }

    // Filter by Custom Date
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

    // Filter by Status
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

    const primary = '#0f766e';
    const accent = '#14b8a6';

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

                    // --- ACTION BUTTONS ---
                    let btnAction = `
                        <button data-id="${b.id}" onclick="viewBudgetDetailsFromAll(this.dataset.id)" style="padding:6px 12px; background:white; color:${primary}; border:1.5px solid ${primary}; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit;">
                            👁 View
                        </button>`;
                    
                    if (status === 'pending' || status === 'pending-department') {
                        btnAction += `
                            <button data-id="${b.id}" data-status="${status}" onclick="openBudgetForDepartment(this.dataset.id, this.dataset.status)" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#134e4a); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">
                                ➕ Add
                            </button>`;
                    } else if (status === 'draft') {
                        btnAction += `
                            <button data-id="${b.id}" onclick="openBudgetForDepartment(this.dataset.id, 'draft')" style="padding:6px 12px; background:linear-gradient(135deg,${accent},#0d9488); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">
                                ✏️ Edit
                            </button>`;
                    } else if (status === 'submitted' || status === 'approved') {
                        // KITUFE CHA BOOK KINAONEKANA HAPA
                        btnAction = `
                            <button data-id="${b.id}" onclick="viewBudgetDetailsFromAll(this.dataset.id)" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#134e4a); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; border:1.5px solid ${accent};">
                                📋 Breakdown
                            </button>
                            <button data-id="${b.id}" onclick="openBudgetBookForDept(this.dataset.id)" style="padding:6px 12px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
                                📖 Book
                            </button>`;
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
// ================================================================
// 🆕 ALL MY BUDGETS (Finance Version - Teal Theme)
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
                <button onclick="loadAllMyBudgets()" style="margin-top:16px;padding:10px 20px;background:#0f766e;color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Jaribu Tena</button>
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
        <div style="background:white; border-radius:14px; padding:18px 20px; border-left:4px solid #0f766e; border:1px solid #e2e8f0;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">📊 Total</div>
            <div style="font-size:24px; font-weight:900; color:#0f766e; font-family:'Courier New',monospace;">${total}</div>
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

// 3. RENDER FILTERS & LAYOUT
function renderBudgetsFilters() {
    const container = document.getElementById('allBudgetsContainer');
    if (!container) return;

    const primary = '#0f766e';
    const accent = '#14b8a6';

    container.innerHTML = `
        <div id="budgetsStatsGrid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;"></div>
        <div style="background:white; border-radius:12px; padding:16px 20px; border:1px solid #e2e8f0; margin-bottom:20px; display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
            <input type="text" id="budgetSearchInput" placeholder="🔍 Search budget..." oninput="filterBudgets()" style="flex:1; min-width:200px; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
            <div style="position:relative; display:flex; align-items:center;">
                <input type="date" id="budgetDateFilter" onchange="filterBudgets()" style="padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:8px; font-size:13px; font-family:inherit; background:white; outline:none; cursor:pointer; color:#334155; font-weight:600;">
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

// 4. RENDER BUDGETS LIST
function renderBudgetsList() {
    const container = document.getElementById('budgetsListContainer');
    if (!container) return;

    let filtered = [...allMyBudgets];

    // Filter by Search
    if (currentBudgetFilter.search) {
        const s = currentBudgetFilter.search;
        filtered = filtered.filter(b =>
            (b.title || '').toLowerCase().includes(s) ||
            (b.period || '').toLowerCase().includes(s) ||
            (b.createdBy || '').toLowerCase().includes(s)
        );
    }

    // Filter by Custom Date
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

    // Filter by Status
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

    const primary = '#0f766e';
    const accent = '#14b8a6';

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

                    // --- ACTION BUTTONS ---
                    let btnAction = `
                        <button data-id="${b.id}" onclick="viewBudgetDetailsFromAll(this.dataset.id)" style="padding:6px 12px; background:white; color:${primary}; border:1.5px solid ${primary}; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit;">
                            👁 View
                        </button>`;
                    
                    if (status === 'pending' || status === 'pending-department') {
                        btnAction += `
                            <button data-id="${b.id}" data-status="${status}" onclick="openBudgetForDepartment(this.dataset.id, this.dataset.status)" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#134e4a); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">
                                ➕ Add
                            </button>`;
                    } else if (status === 'draft') {
                        btnAction += `
                            <button data-id="${b.id}" onclick="openBudgetForDepartment(this.dataset.id, 'draft')" style="padding:6px 12px; background:linear-gradient(135deg,${accent},#0d9488); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px;">
                                ✏️ Edit
                            </button>`;
                    } else if (status === 'submitted' || status === 'approved') {
                        btnAction = `
                            <button data-id="${b.id}" onclick="viewBudgetDetailsFromAll(this.dataset.id)" style="padding:6px 12px; background:linear-gradient(135deg,${primary},#134e4a); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; border:1.5px solid ${accent};">
                                📋 Breakdown
                            </button>
                            <button data-id="${b.id}" onclick="openBudgetBookForDept(this.dataset.id)" style="padding:6px 12px; background:linear-gradient(135deg,#16a34a,#15803d); color:white; border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; font-family:inherit; margin-left:4px; box-shadow:0 2px 8px rgba(22,163,74,0.3);">
                                📖 Book
                            </button>`;
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

// 5. FILTERS & UTILS
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

// 6. ENTRY POINT
function loadAllBudgetsPage() {
    renderBudgetsFilters();
    setTimeout(() => {
        loadAllMyBudgets();
    }, 100);
}

// 7. OPEN BUDGET & VIEW DETAILS
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
        openBudgetBreakdownPage(); // Hii function inatakiwa iwepo kwenye finance.js
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
        viewSubmittedBreakdown(); // Hii function inatakiwa iwepo kwenye finance.js
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
// ================================================================
// 🆕 OPEN DEPARTMENT BUDGET BOOK (Premium Redesign - No Stats)
// ================================================================
async function openMyDeptBudgetBook(budgetData = null) {
    const b = budgetData || currentDeptBudget;

    if (!b || !b.myAllocation) {
        showToast('⚠ No budget data available to generate book', 'error');
        return;
    }

    const alloc = b.myAllocation;
    
    // Hesabu jumla ya matumizi
    let totalItemsCost = 0;
    if (alloc.items && alloc.items.length > 0) {
        totalItemsCost = alloc.items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
    }

    // 🆕 Panga vitu kwa Makundi ya Shughuli (Group by ActivityName)
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

    // Tengeneza HTML ya Makundi (Cards)
    let activitiesHtml = '';
    let activityIndex = 1;

    Object.keys(groupedActivities).forEach(actName => {
        const group = groupedActivities[actName];
        
        // Tengeneza HTML ya vitu vilivyomo ndani ya shughuli hii
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
                <!-- Kichwa cha Shughuli -->
                <div style="background:#f8fafc; padding:14px 18px; border-bottom:2px solid #0f172a; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="background:#0f172a; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">${activityIndex++}</span>
                        <strong style="font-size:14px; color:#0f172a; text-transform:uppercase; letter-spacing:0.5px;">${esc(actName)}</strong>
                    </div>
                    <div style="font-size:13px; font-weight:800; color:#16a34a; background:rgba(22,163,74,0.1); padding:4px 10px; border-radius:6px;">
                        TSh ${group.total.toLocaleString()}
                    </div>
                </div>
                
                <!-- Jedwali la Vitu ndani ya Shughuli -->
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

    // Unda Modal
    let modal = document.getElementById('myBudgetBookModal');
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = 'myBudgetBookModal';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.85); z-index:60000; display:flex; align-items:flex-start; justify-content:center; padding:20px; overflow-y:auto;';
    
    modal.innerHTML = `
        <div style="background:white; border-radius:12px; max-width:1000px; width:100%; box-shadow:0 20px 50px rgba(0,0,0,0.5); position:relative; margin: 20px auto; overflow:hidden;">
            
            <!-- Action Bar (Top) - Hidden on Print -->
            <div class="no-print" style="background:#1e293b; padding:16px 24px; display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #cbd5e1;">
                <div style="color:white; font-size:14px; font-weight:600;">📄 Preview Mode</div>
                <div style="display:flex; gap:12px; align-items:center;">
                    
                    <!-- Language Toggle -->
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

            <!-- Printable Area -->
            <div id="budgetBookPrintArea" style="padding:50px 60px; background:white;">
                
                <!-- Header -->
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

                <!-- Narrative Section -->
                <div style="margin-bottom:35px; background:#f8fafc; padding:30px; border-radius:10px; border-left:6px solid #0f172a; box-shadow:0 4px 15px rgba(0,0,0,0.02); page-break-inside:avoid;">
                    
                    <!-- Swahili Narrative -->
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

                    <!-- English Narrative -->
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

                <!-- Table Section (Grouped Activities) -->
                <div class="lang-sw">
                    <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:20px; border-bottom:2px solid #cbd5e1; padding-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Mgawanyo wa Kina wa Matumizi</h3>
                </div>
                <div class="lang-en" style="display:none;">
                    <h3 style="font-size:16px; font-weight:900; color:#0f172a; margin-bottom:20px; border-bottom:2px solid #cbd5e1; padding-bottom:8px; text-transform:uppercase; letter-spacing:1px;">Detailed Breakdown of Expenses</h3>
                </div>
                
                <!-- Hapa ndipo Kadi za Shughuli (Activity Cards) zinatokea -->
                ${activitiesHtml || '<p style="text-align:center; color:#64748b; padding:20px;">Hakuna data ya matumizi.</p>'}

                <!-- Overall Grand Total Box -->
                <div style="margin-top:20px; background:#0f172a; border-radius:10px; padding:20px 30px; display:flex; justify-content:space-between; align-items:center; page-break-inside:avoid;">
                    <div>
                        <div class="lang-sw" style="font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Jumla Kuu ya Matumizi Yote</div>
                        <div class="lang-en" style="display:none; font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Overall Grand Total</div>
                    </div>
                    <div style="font-size:28px; font-weight:900; color:#2ecc71; font-family:'Courier New', monospace;">
                        TSh ${totalItemsCost.toLocaleString()}
                    </div>
                </div>

                <!-- Signatures -->
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

                <!-- Footer -->
                <div style="text-align:center; margin-top:60px; font-size:10px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:15px;">
                    <span class="lang-sw">Hati hii imetengenezwa na mfumo wa kompyuta. Ilizalishwa tarehe ${new Date().toLocaleString()}.</span>
                    <span class="lang-en" style="display:none;">This is a computer-generated document. Generated on ${new Date().toLocaleString()}.</span>
                    <br>MAK DC Investment Company LTD &copy; ${new Date().getFullYear()}
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
    window.currentBookLang = 'sw'; // Lugha ya kwanza ni Kiswahili
}
function toggleBookLanguage(lang) {
    window.currentBookLang = lang;
    
    // Chagua vitu vyote vyenye class ya lugha
    const swElements = document.querySelectorAll('#myBudgetBookModal .lang-sw');
    const enElements = document.querySelectorAll('#myBudgetBookModal .lang-en');
    
    const btnSw = document.getElementById('btnLangSw');
    const btnEn = document.getElementById('btnLangEn');

    if (lang === 'sw') {
        // Onyesha Kiswahili, Ficha Kiingereza
        swElements.forEach(el => {
            el.style.display = (el.tagName === 'TD' || el.tagName === 'TH') ? 'table-cell' : (el.tagName === 'TR' ? 'table-row' : 'block');
        });
        enElements.forEach(el => el.style.display = 'none');
        
        // Badilisha rangi ya vitufe
        if(btnSw) { btnSw.style.background = '#0f172a'; btnSw.style.color = 'white'; }
        if(btnEn) { btnEn.style.background = 'transparent'; btnEn.style.color = '#94a3b8'; }
    } else {
        // Onyesha Kiingereza, Ficha Kiswahili
        swElements.forEach(el => el.style.display = 'none');
        enElements.forEach(el => {
            el.style.display = (el.tagName === 'TD' || el.tagName === 'TH') ? 'table-cell' : (el.tagName === 'TR' ? 'table-row' : 'block');
        });
        
        // Badilisha rangi ya vitufe
        if(btnEn) { btnEn.style.background = '#0f172a'; btnEn.style.color = 'white'; }
        if(btnSw) { btnSw.style.background = 'transparent'; btnSw.style.color = '#94a3b8'; }
    }
}
function printBudgetBook() {
    // 1. Chukua maudhui ya kitabu
    const printContents = document.getElementById('budgetBookPrintArea').innerHTML;
    const lang = window.currentBookLang || 'sw';

    // 2. Fungua dirisha jipya la kuchapisha (Window mpya inazuia CSS ya dashboard kuingilia)
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    
    // 3. Andika HTML kamili kwenye dirisha jipya
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Budget Book - MAK DC</title>
            <style>
                /* CSS Maalum kwa ajili ya PDF/Print */
                @page {
                    size: A4 portrait;
                    margin: 15mm;
                }
                body {
                    font-family: 'Inter', Arial, sans-serif;
                    color: #0f172a;
                    background: white;
                    margin: 0;
                    padding: 0;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                /* Ficha vitufe vyote vya rangi na sehemu zisizohitajika */
                .no-print, button, .action-bar {
                    display: none !important;
                }

                /* Mpangilio wa lugha */
                .lang-sw { display: ${lang === 'sw' ? 'block' : 'none'} !important; }
                .lang-en { display: ${lang === 'en' ? 'block' : 'none'} !important; }
                
                /* Kwa ajili ya vitu vya ndani ya table */
                td.lang-sw, th.lang-sw { display: ${lang === 'sw' ? 'table-cell' : 'none'} !important; }
                td.lang-en, th.lang-en { display: ${lang === 'en' ? 'table-cell' : 'none'} !important; }

                /* Kila kadi ya shughuli isivunjike katikati */
                .activity-card {
                    page-break-inside: avoid;
                    margin-bottom: 20px !important;
                }
                
                /* Jedwali lisitoke nje ya ukurasa */
                table {
                    width: 100% !important;
                    max-width: 100% !important;
                    border-collapse: collapse !important;
                }
                
                /* Rudisha ukubwa wa picha na fonts */
                img { max-width: 100%; height: auto; }
            </style>
        </head>
        <body>
            ${printContents}
        </body>
        </html>
    `);

    // 4. Subiri kidogo kisha chapisha
    setTimeout(() => {
        printWindow.document.close(); // Muhimu kwa baadhi ya browsers
        printWindow.focus();
        printWindow.print();
        // printWindow.close(); // Kama unataka ifunge baada ya kuchapisha, ondoa alama ya //
    }, 500);
}
async function openBudgetBookForDept(budgetId) {
    try {
        // 1. Vuta taarifa za bajeti husika
        const budget = await API.getMasterBudgetById(budgetId);
        if (!budget) {
            showToast('⚠ Budget not found', 'error');
            return;
        }

        // 2. Tafuta mgao (allocation) wa idara yako kwenye bajeti hiyo
        const user = Auth.getUser();
        const myDept = user?.department || user?.departmentName;
        const myAllocation = budget.allocations.find(a => a.department === myDept);

        if (!myAllocation) {
            showToast('❌ You have no allocation in this budget', 'error');
            return;
        }

        // 3. Weka data kwenye variable ya muda
        const tempBudgetData = { ...budget, myAllocation };

        // 4. Fungua Kitabu kwa kutumia data hiyo
        await openMyDeptBudgetBook(tempBudgetData);

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
// ================================================================
// 🆕 FINANCE KPI DASHBOARD
// 🎨 RANGI: #0f766e (Teal) + #f59e0b (Gold)
// ================================================================
let isLoadingFinanceKpis = false;
let allFinanceKpisData = [];
let currentUpdateFinanceKpiId = null;
let currentFinanceKpiData = null;

// ===== LOAD KPIs =====
async function loadFinanceKpis() {
    const container = document.getElementById('financeKpiContainer');
    const periodLabel = document.getElementById('financeKpiPeriodLabel');
    if (!container) return;

    if (isLoadingFinanceKpis) return;
    isLoadingFinanceKpis = true;

    const periodSelect = document.getElementById('filterFinanceKpiPeriod');
    if (periodSelect && periodSelect.options.length === 0) {
        populateFinanceKpiPeriodSelector();
    }

    const selectedPeriod = periodSelect?.value;
    const now = new Date();
    const currentPeriod = selectedPeriod || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: #64748b;">
            <div style="font-size: 40px; margin-bottom: 10px; opacity: 0.5;">⏳</div>
            <div style="font-weight: 700;">Loading targets for ${currentPeriod}...</div>
        </div>`;

    try {
        const user = Auth.getUser();
        // 🆕 FIX: Tumia userId au id tu. Usijaribu kunasa employeeId kama haipo kwenye auth session.
        const empId = user.userId || user.id; 
        
        if (!empId) throw new Error("User ID not found in session.");

        // Vuta KPI zote za mtumiaji huyu
        const kpis = await API.getEmployeeKpis({ 
            employeeId: Number(empId), 
            period: currentPeriod,
            status: 'released'
        });

        let rawData = kpis || [];

        // 🆕 FIX: Kichujio cha Usalama (Frontend Filter)
        // Hii inahakikisha kwamba hata kama API imerudisha data ya wote, 
        // Finance anaona zake tu (kwa kulinganisha jina au ID)
        const myFullName = (user.fullName || '').toLowerCase().trim();
        allFinanceKpisData = rawData.filter(kpi => {
            // Kama API inarudisha employeeName au assignedTo, chuja hapa
            if (kpi.employeeName) {
                return kpi.employeeName.toLowerCase().trim() === myFullName;
            }
            if (kpi.employeeId) {
                return String(kpi.employeeId) === String(empId);
            }
            return true; // Kama haina taarifa hizo, iachie (API ndio inapaswa kuchuja)
        });

        if (allFinanceKpisData.length === 0) {
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

        periodLabel.textContent = allFinanceKpisData[0].periodLabel || currentPeriod;
        renderFinanceKpiTable(allFinanceKpisData);

    } catch (err) {
        console.error("KPI Load Error:", err);
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc2626;">❌ Failed to load KPIs: ${err.message}</div>`;
    } finally {
        isLoadingFinanceKpis = false; 
    }
}

// ===== RENDER TABLE =====
function renderFinanceKpiTable(kpis) {
    const container = document.getElementById('financeKpiContainer');
    if (!container) return;

    if (kpis.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;">No targets match your search.</div>`;
        return;
    }

    // 🎨 RANGI ZA FINANCE
    const PRIMARY = '#0f766e';
    const ACCENT = '#f59e0b';

    let rowsHtml = '';

    kpis.forEach((kpi) => {
        let percentage = 0;
        let statusColor = '#64748b'; 
        let statusText = 'Pending';
        let bgStatus = '#f1f5f9';
        let isOver = false;

        if (kpi.actualValue !== null && kpi.actualValue !== undefined) {
            if (kpi.metricType === 'WASTE_PERCENT') {
                percentage = kpi.actualValue <= kpi.targetValue ? 100 : (kpi.targetValue / kpi.actualValue) * 100;
            } else {
                percentage = (kpi.actualValue / kpi.targetValue) * 100;
            }
            percentage = Math.round(percentage);
            
            if (percentage > 100) {
                isOver = true;
                statusColor = ACCENT;
                bgStatus = 'rgba(245,158,11,0.15)';
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

        // History from notes
        let historyHtml = '';
        if (kpi.notes && kpi.notes.includes('[')) {
            const historyLines = kpi.notes.split('\n').filter(l => l.includes('['));
            const recentHistory = historyLines.slice(-3).reverse();
            historyHtml = `
                <div style="margin-top: 8px; background: #f8fafc; padding: 8px 12px; border-radius: 8px; border-left: 3px solid ${PRIMARY};">
                    <div style="font-size: 9px; font-weight: 800; color: ${PRIMARY}; text-transform: uppercase; margin-bottom: 4px;">📅 Recent Progress Log</div>
                    ${recentHistory.map(line => `<div style="font-size: 11px; color: #475569; margin-bottom: 2px;">${esc(line.trim())}</div>`).join('')}
                </div>
            `;
        }

        rowsHtml += `
            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='white'">
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
                    <button onclick="openUpdateFinanceActualModal(${kpi.id}, '${kpi.metricLabel}', '${kpi.metricUnit}', ${kpi.actualValue || 0}, ${kpi.targetValue || 0}, \`${(kpi.notes || '').replace(/`/g, '\\`')}\`)" 
                            style="padding: 6px 12px; background: rgba(15,118,110,0.1); color: ${PRIMARY}; border: 1px solid rgba(15,118,110,0.2); border-radius: 6px; font-weight: 700; font-size: 11px; cursor: pointer; font-family: inherit;">
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

// ===== FILTER =====
function filterFinanceKpis() {
    const searchTerm = (document.getElementById('searchFinanceKpi')?.value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('filterFinanceKpiStatus')?.value || '';

    const filteredData = allFinanceKpisData.filter(kpi => {
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

    renderFinanceKpiTable(filteredData);
}

// ===== PERIOD SELECTOR =====
function populateFinanceKpiPeriodSelector() {
    const select = document.getElementById('filterFinanceKpiPeriod');
    if (!select) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    let options = '';

    for (let year = currentYear; year >= currentYear - 1; year--) {
        for (let m = 11; m >= 0; m--) {
            const monthValue = `${year}-${String(m + 1).padStart(2, '0')}`;
            const label = `${monthNames[m]} ${year}`;
            const isCurrent = (year === currentYear && m === now.getMonth());
            
            options += `<option value="${monthValue}" ${isCurrent ? 'selected' : ''}>${label}</option>`;
        }
    }

    select.innerHTML = options;
}

// ===== UPDATE ACTUAL MODAL =====
function openUpdateFinanceActualModal(kpiId, metricLabel, metricUnit, currentActual, targetValue, historyNotes) {
    currentUpdateFinanceKpiId = kpiId;
    currentFinanceKpiData = { currentActual, targetValue, metricUnit };
    
    document.getElementById('financeUaKpiName').textContent = metricLabel;
    document.getElementById('financeUaKpiUnit').textContent = metricUnit;
    document.getElementById('financeUaTargetDisplay').textContent = `${Number(targetValue).toLocaleString()} ${metricUnit}`;
    document.getElementById('financeUaIncrementValue').value = '';
    document.getElementById('financeUaNotes').value = '';
    document.getElementById('financeUaLivePreview').style.display = 'none';
    
    // Historia
    const historyContainer = document.getElementById('financeUaHistory');
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

    document.getElementById('financeUaStatus').className = 'status-msg';
    document.getElementById('financeUaStatus').textContent = '';
    
    const btn = document.getElementById('financeUaSaveBtn');
    btn.disabled = false;
    btn.textContent = '🚀 Save Progress';

    document.getElementById('updateFinanceActualModal').classList.add('show');
}

function updateFinancePreviewTotal() {
    const increment = parseFloat(document.getElementById('financeUaIncrementValue').value) || 0;
    const previewDiv = document.getElementById('financeUaLivePreview');
    const display = document.getElementById('financeUaNewTotalDisplay');

    if (increment > 0) {
        const newTotal = currentFinanceKpiData.currentActual + increment;
        display.textContent = `${newTotal.toLocaleString()} ${currentFinanceKpiData.metricUnit}`;
        previewDiv.style.display = 'block';
    } else {
        previewDiv.style.display = 'none';
    }
}

async function saveFinanceActualValue() {
    const statusDiv = document.getElementById('financeUaStatus');
    const saveBtn = document.getElementById('financeUaSaveBtn');
    const incrementValue = parseFloat(document.getElementById('financeUaIncrementValue').value);
    const notes = document.getElementById('financeUaNotes').value.trim();

    if (isNaN(incrementValue) || incrementValue <= 0) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Please enter a valid number greater than 0.';
        return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';
    saveBtn.style.opacity = '0.7';

    try {
        await API.updateEmployeeKpi(currentUpdateFinanceKpiId, { 
            incrementValue: incrementValue,
            notes: notes 
        });

        statusDiv.className = 'status-msg success';
        statusDiv.textContent = '✓ Progress saved successfully!';

        setTimeout(() => {
            closeModal('updateFinanceActualModal');
            loadFinanceKpis();
        }, 800);

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        saveBtn.disabled = false;
        saveBtn.textContent = '🚀 Save Progress';
        saveBtn.style.opacity = '1';
    }
}