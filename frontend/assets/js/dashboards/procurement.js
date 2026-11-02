// ================================================================
// MAK DC INVESTMENT — PROCUREMENT DASHBOARD (API-Based)
// ================================================================

let currentUser = null;
let currentProfilePic = null;
let currentViewRequest = null;

// ================================================================
// MESSAGE NOTIFICATION STATE
// ================================================================
let lastSeenMessageCount = {};
let unreadMessageCount = 0;

// ================================================================
// INIT
// ================================================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!protectPage('Procurement', 'SuperAdmin', 'CEO', 'Manager')) return;
    
    currentUser = Auth.getUser();
    
    renderProcurementProfile();
    initSidebar();
    await loadProcurementDashboard();
    
    // Start polling after 5 seconds
    setTimeout(() => {
        checkNewMessages();
        setInterval(checkNewMessages, 30000);
    }, 5000);
});

// ================================================================
// PROFILE RENDER
// ================================================================
function renderProcurementProfile() {
    const user = Auth.getUser();
    if (!user) return;
    
    const initials = (user.fullName || 'PO')
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    
    setText('sidebarUserAvatar', initials);
    setText('sidebarUserName', user.fullName || 'Procurement Officer');
    setText('sidebarUserRole', '📦 ' + (user.department || 'Procurement & Store'));
    
    setText('udInitials', initials);
    setText('udName', user.fullName || 'Procurement Officer');
    setText('udRole', '📦 ' + (user.department || 'Procurement & Store'));
    setText('udpInitials', initials);
    setText('udpName', user.fullName || 'Procurement Officer');
    setText('udpRole', '📦 ' + (user.department || 'Procurement & Store'));
    setText('udpEmail', user.email || '—');
    setText('udpPhone', user.phone || '—');
    setText('udpDepartment', user.department || 'Procurement & Store');
    setText('udpEmployeeId', user.employeeId || '—');
    
    if (user.profilePic) {
        currentProfilePic = user.profilePic;
        const avatars = ['sidebarUserAvatar', 'udAvatar', 'udpPic'];
        avatars.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `<img src="${user.profilePic}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        });
    }
}

function initSidebar() {
    const firstParent = document.querySelector('.sidebar-nav-parent');
    if (firstParent) {
        const submenu = firstParent.nextElementSibling;
        if (submenu) submenu.classList.add('open');
    }
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
        
        if (!response.ok) throw new Error(data.error || 'Failed to change password');
        
        showToast('✅ Password changed successfully!', 'success');
        closeModal('changePasswordModal');
        setTimeout(() => Auth.logout(), 2000);
        
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Password';
    }
}

// ================================================================
// MESSAGES & FOLLOW-UPS
// ================================================================
let currentMsgReqId = null;
let currentFollowUpReqId = null;

function openMessages(reqId, reqTitle) {
    currentMsgReqId = reqId;
    document.getElementById('msgReqLabel').textContent = `${reqTitle} (${reqId})`;
    document.getElementById('messagesModal').style.display = 'flex';
    document.getElementById('msgSubject').value = '';
    document.getElementById('msgBody').value = '';
    loadMessages(reqId);
}

function closeMessages() {
    document.getElementById('messagesModal').style.display = 'none';
    currentMsgReqId = null;
}

function loadMessages(reqId) {
    const thread = document.getElementById('msgThread');
    thread.innerHTML = `
        <div style="text-align:center;color:#9aa38b;padding:40px 20px;">
            <div style="font-size:36px;margin-bottom:8px;opacity:0.4;">💬</div>
            <div style="font-size:13px;">Loading messages...</div>
        </div>`;

    API.getRequestMessages(reqId)
    .then(msgs => {
        if (!msgs || msgs.length === 0) {
            thread.innerHTML = `
                <div style="text-align:center;color:#9aa38b;padding:50px 20px;">
                    <div style="font-size:48px;margin-bottom:12px;opacity:0.4;">💬</div>
                    <div style="font-size:14px;font-weight:700;color:#64748b;">No messages yet</div>
                    <div style="font-size:12px;margin-top:6px;">Start the conversation below</div>
                </div>`;
            return;
        }

        const user = Auth.getUser();
        const myId = Number(user?.userId || user?.id);
        let lastDate = null;

        thread.innerHTML = msgs.map(m => {
            const rawSenderId = m.sender_id !== undefined ? m.sender_id : m.senderId;
            const senderId = Number(rawSenderId);
            const mine = senderId === myId;
            
            const initials = (m.sender_name || m.senderName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            const msgDate = new Date(m.created_at || m.createdAt);
            const dateKey = msgDate.toDateString();
            let dateSep = '';
            if (dateKey !== lastDate) {
                const today = new Date();
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                
                let label = msgDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                if (msgDate.toDateString() === today.toDateString()) label = 'Today';
                else if (msgDate.toDateString() === yesterday.toDateString()) label = 'Yesterday';
                
                dateSep = `<div class="chat-date-sep"><span>${label}</span></div>`;
                lastDate = dateKey;
            }
            
            const time = msgDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            
            let statusHtml = '';
            if (mine) {
                const isRead = m.is_read === true || m.isRead === true;
                statusHtml = isRead 
                    ? `<span class="msg-status read" title="Read">✓✓</span>` 
                    : `<span class="msg-status sent" title="Sent">✓</span>`;
            }
            
            return `
            ${dateSep}
            <div class="chat-msg-row ${mine ? 'mine' : ''}">
                <div class="chat-avatar ${mine ? 'mine' : 'other'}">${initials}</div>
                <div class="chat-bubble-wrap">
                    <div class="chat-bubble ${mine ? 'mine' : 'other'}">
                        ${m.subject ? `<div class="chat-subject">${esc(m.subject)}</div>` : ''}
                        ${esc(m.body)}
                    </div>
                    <div class="chat-meta">
                        ${mine ? 'You' : `<strong>${esc(m.sender_name || m.senderName || 'Unknown')}</strong>`} • ${time}
                        ${statusHtml}
                    </div>
                </div>
            </div>`;
        }).join('');

        thread.scrollTop = thread.scrollHeight;
        
        if (typeof API.markMessagesAsRead === 'function') {
            API.markMessagesAsRead(reqId).catch(() => {});
        }
    })
    .catch(err => {
        thread.innerHTML = `
            <div style="text-align:center;color:#dc2626;padding:40px 20px;">
                <div style="font-size:40px;margin-bottom:8px;">❌</div>
                <div style="font-size:13px;font-weight:600;">${esc(err.message)}</div>
            </div>`;
    });
}

async function sendMessage() {
    const subject = document.getElementById('msgSubject').value.trim();
    const body = document.getElementById('msgBody').value.trim();
    const sendBtn = document.querySelector('#messagesModal button[onclick="sendMessage()"]');
    
    if (!body) {
        alert('Write a message first.');
        return;
    }

    const originalHtml = sendBtn ? sendBtn.innerHTML : '';
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = '⏳ Sending...';
        sendBtn.style.opacity = '0.7';
        sendBtn.style.cursor = 'not-allowed';
    }

    try {
        await API.sendRequestMessage(currentMsgReqId, { subject, body });
        document.getElementById('msgBody').value = '';
        document.getElementById('msgSubject').value = '';
        loadMessages(currentMsgReqId);
    } catch (err) {
        alert('Failed to send: ' + err.message);
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalHtml;
            sendBtn.style.opacity = '';
            sendBtn.style.cursor = '';
        }
    }
}

function openFollowUpModal(reqId, reqTitle) {
    currentFollowUpReqId = reqId;
    document.getElementById('followUpReqLabel').textContent = `Request: ${reqTitle} (${reqId})`;
    document.getElementById('followUpNote').value = '';
    document.getElementById('followUpModal').style.display = 'flex';
}

function closeFollowUpModal() {
    document.getElementById('followUpModal').style.display = 'none';
    currentFollowUpReqId = null;
}

async function saveFollowUp() {
    const note = document.getElementById('followUpNote').value.trim();
    const saveBtn = document.querySelector('#followUpModal button[onclick="saveFollowUp()"]');
    
    if (!note) {
        alert('Write a follow-up note.');
        return;
    }

    const originalHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '⏳ Saving...';
        saveBtn.style.opacity = '0.7';
    }

    try {
        await API.saveRequestFollowUp(currentFollowUpReqId, note);
        closeFollowUpModal();
        showToast('✅ Follow-up saved!', 'success');
        loadAllRequests();
        loadIncomingRequests();
    } catch (err) {
        alert('Failed: ' + err.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalHtml;
            saveBtn.style.opacity = '';
        }
    }
}

// ================================================================
// MESSAGE NOTIFICATIONS (POLLING)
// ================================================================
async function checkNewMessages() {
    try {
        const user = Auth.getUser();
        if (!user) return;
        
        const all = await API.getProcurementRequests('/all');
        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        
        let totalNew = 0;
        let latestNewMsg = null;

        for (const req of list) {
            try {
                const msgs = await API.getRequestMessages(req.id);
                if (!msgs || msgs.length === 0) continue;
                
                const otherMsgs = msgs.filter(m => Number(m.sender_id) !== Number(user.userId));
                if (otherMsgs.length === 0) continue;
                
                const lastMsg = otherMsgs[otherMsgs.length - 1];
                const lastMsgId = lastMsg.id;
                
                const prevSeen = lastSeenMessageCount[req.id];
                if (prevSeen === undefined) {
                    lastSeenMessageCount[req.id] = lastMsgId;
                    continue;
                }
                
                if (lastMsgId > prevSeen) {
                    totalNew++;
                    if (!latestNewMsg || new Date(lastMsg.created_at) > new Date(latestNewMsg.created_at)) {
                        latestNewMsg = {
                            ...lastMsg,
                            requestNumber: req.request_number,
                            requestId: req.id,
                            requestTitle: req.request_number
                        };
                    }
                    lastSeenMessageCount[req.id] = lastMsgId;
                }
            } catch (e) {}
        }

        if (totalNew > 0 && latestNewMsg) {
            unreadMessageCount += totalNew;
            updateMessageBadges();
            showNewMessageToast(latestNewMsg, totalNew);
        }
    } catch (err) {
        console.error('checkNewMessages error:', err);
    }
}

function updateMessageBadges() {
    const myReqLink = document.querySelector('a[onclick*="sub-all-requests"]');
    if (myReqLink) {
        let badge = myReqLink.querySelector('.msg-badge');
        if (unreadMessageCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'msg-badge';
                myReqLink.style.position = 'relative';
                myReqLink.appendChild(badge);
            }
            badge.textContent = unreadMessageCount > 99 ? '99+' : unreadMessageCount;
        } else if (badge) {
            badge.remove();
        }
    }
}

function showNewMessageToast(msg, count) {
    document.querySelectorAll('.new-msg-toast').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'new-msg-toast';
    toast.innerHTML = `
        <div class="nmt-icon">💬</div>
        <div class="nmt-content">
            <div class="nmt-title">${count > 1 ? `${count} new messages` : 'New message'} from ${esc(msg.sender_name)}</div>
            <div class="nmt-text">${esc(msg.body).substring(0, 60)}${msg.body.length > 60 ? '...' : ''}</div>
        </div>
        <button class="nmt-close" onclick="event.stopPropagation();this.parentElement.remove();">×</button>
    `;
    
    toast.onclick = () => {
        openMessages(msg.requestId, msg.requestTitle || msg.requestNumber);
        toast.remove();
        unreadMessageCount = 0;
        updateMessageBadges();
    };
    
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }
    }, 8000);
}

// ================================================================
// SIDEBAR DROPDOWN
// ================================================================
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
// CREATE REQUEST MODAL
// ================================================================
let requestItemCounter = 0;
let currentAttachments = [];

function openCreateRequestModal() {
    document.getElementById('createDept').value = '';
    document.getElementById('createRequestedBy').value = currentUser?.fullName || '';
    document.getElementById('createUrgency').value = 'normal';
    document.getElementById('createTitle').value = '';
    document.getElementById('createRequiredBy').value = '';
    document.getElementById('createJustification').value = '';
    document.getElementById('requestItemsBody').innerHTML = '';
    document.getElementById('requestTotal').textContent = 'TSh 0';
    document.getElementById('attachmentsList').innerHTML = '';
    document.getElementById('createRequestStatus').className = 'status-msg';
    document.getElementById('createRequestStatus').textContent = '';
    
    currentAttachments = [];
    requestItemCounter = 0;
    addRequestItemRow();
    showModal('createRequestModal');
}

function addRequestItemRow() {
    const tbody = document.getElementById('requestItemsBody');
    const rowId = 'req-item-' + requestItemCounter++;
    
    const row = document.createElement('tr');
    row.id = rowId;
    row.style.borderBottom = '1px solid var(--gray-100)';
    row.innerHTML = `
        <td style="padding:6px;">
            <input type="text" class="req-item-name" placeholder="Item name" style="width:100%;padding:8px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:inherit;background:white;">
        </td>
        <td style="padding:6px;">
            <input type="text" class="req-item-spec" placeholder="e.g., 6 inch, Red, A4" style="width:100%;padding:8px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:inherit;background:white;">
        </td>
        <td style="padding:6px;">
            <input type="number" class="req-item-qty" placeholder="0" min="1" style="width:100%;padding:8px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:inherit;background:white;">
        </td>
        <td style="padding:6px;">
            <select class="req-item-unit" style="width:100%;padding:8px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:inherit;background:white;">
                <option value="pcs">Pieces</option>
                <option value="bags">Bags</option>
                <option value="blocks">Blocks</option>
                <option value="tons">Tons</option>
                <option value="kg">Kg</option>
                <option value="litres">Litres</option>
                <option value="boxes">Boxes</option>
                <option value="rolls">Rolls</option>
                <option value="sheets">Sheets</option>
            </select>
        </td>
        <td style="padding:6px;">
            <input type="number" class="req-item-price" placeholder="0" min="0" step="1000" style="width:100%;padding:8px 10px;border:1px solid var(--gray-200);border-radius:6px;font-size:13px;font-family:inherit;background:white;">
        </td>
        <td style="padding:6px;text-align:right;">
            <span class="req-item-subtotal" style="font-weight:700;color:var(--primary);font-family:'Courier New',monospace;">TSh 0</span>
        </td>
        <td style="padding:6px;text-align:center;">
            <button type="button" onclick="removeRequestItem('${rowId}')" style="background:var(--red);color:white;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:700;">✕</button>
        </td>
    `;
    tbody.appendChild(row);
    
    row.querySelector('.req-item-qty').addEventListener('input', calculateRequestTotal);
    row.querySelector('.req-item-price').addEventListener('input', calculateRequestTotal);
}

function removeRequestItem(rowId) {
    const row = document.getElementById(rowId);
    if (row) { row.remove(); calculateRequestTotal(); }
}

function calculateRequestTotal() {
    const rows = document.querySelectorAll('#requestItemsBody tr');
    let total = 0;
    
    rows.forEach(row => {
        const qty = parseFloat(row.querySelector('.req-item-qty')?.value) || 0;
        const price = parseFloat(row.querySelector('.req-item-price')?.value) || 0;
        const subtotal = qty * price;
        
        const subtotalEl = row.querySelector('.req-item-subtotal');
        if (subtotalEl) subtotalEl.textContent = 'TSh ' + subtotal.toLocaleString();
        
        total += subtotal;
    });
    
    document.getElementById('requestTotal').textContent = 'TSh ' + total.toLocaleString();
}

function handleRequestAttachments(event) {
    const files = Array.from(event.target.files);
    const list = document.getElementById('attachmentsList');
    
    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name} is too large (max 5MB)`, 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            currentAttachments.push({ name: file.name, type: file.type, data: e.target.result });
            list.innerHTML += `
                <div style="padding:6px 12px;background:white;border:1px solid var(--gray-200);border-radius:6px;font-size:11px;font-weight:700;color:var(--gray-700);display:flex;align-items:center;gap:6px;">
                    📎 ${file.name}
                </div>
            `;
        };
        reader.readAsDataURL(file);
    });
}

// ================================================================
// SUBMIT → PREVIEW
// ================================================================
let pendingRequestData = null;

function submitCreateRequest() {
    const statusDiv = document.getElementById('createRequestStatus');
    const status = (msg, type = 'error') => {
        statusDiv.className = 'status-msg ' + type;
        statusDiv.textContent = msg;
    };
    
    const dept = document.getElementById('createDept').value;
    const requestedBy = document.getElementById('createRequestedBy').value.trim();
    const title = document.getElementById('createTitle').value.trim();
    const justification = document.getElementById('createJustification').value.trim();
    
    if (!dept) return status('⚠ Please select a department');
    if (!requestedBy) return status('⚠ Requested by is required');
    if (!title) return status('⚠ Request title is required');
    if (!justification) return status('⚠ Justification is required');
    
    const rows = document.querySelectorAll('#requestItemsBody tr');
    const items = [];
    
    rows.forEach(row => {
        const name = row.querySelector('.req-item-name')?.value.trim();
        const spec = row.querySelector('.req-item-spec')?.value.trim();
        const qty = parseFloat(row.querySelector('.req-item-qty')?.value) || 0;
        const unit = row.querySelector('.req-item-unit')?.value || 'pcs';
        const price = parseFloat(row.querySelector('.req-item-price')?.value) || 0;
        
        if (name && qty > 0) {
            items.push({
                itemName: name,
                specification: spec || null,
                quantity: qty,
                unit: unit,
                estimatedPrice: price
            });
        }
    });
    
    if (items.length === 0) return status('⚠ Add at least one item');
    
    pendingRequestData = {
        department: dept,
        requestedBy: requestedBy,
        urgency: document.getElementById('createUrgency').value,
        requiredBy: document.getElementById('createRequiredBy').value || null,
        title: title,
        notes: justification,
        items: items,
        attachments: currentAttachments
    };
    
    showPreviewModal(pendingRequestData);
    closeModal('createRequestModal');
}

function showPreviewModal(data) {
    document.getElementById('previewDept').textContent = data.department;
    document.getElementById('previewRequestedBy').textContent = data.requestedBy;
    document.getElementById('previewUrgency').textContent = 
        data.urgency === 'urgent' ? '🔴 Urgent' : 
        data.urgency === 'high' ? '🟡 High' : '🟢 Normal';
    document.getElementById('previewRequiredBy').textContent = data.requiredBy || '—';
    document.getElementById('previewTitle').textContent = data.title;
    document.getElementById('previewJustification').textContent = data.notes;
    
    const itemsBody = document.getElementById('previewItemsBody');
    let total = 0;
    
    itemsBody.innerHTML = data.items.map(item => {
        const subtotal = (item.estimatedPrice || 0) * item.quantity;
        total += subtotal;
        return `
            <tr style="border-bottom:1px solid var(--gray-200);">
                <td style="padding:6px;font-weight:600;">${esc(item.itemName)}</td>
                <td style="padding:6px;color:var(--gray-500);font-size:11px;">${esc(item.specification || '—')}</td>
                <td style="padding:6px;">${item.quantity} ${item.unit}</td>
                <td style="padding:6px;text-align:right;font-weight:700;color:var(--primary);">TSh ${subtotal.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
    
    document.getElementById('previewTotal').textContent = 'TSh ' + total.toLocaleString();
    
    const btn = document.getElementById('previewConfirmBtn');
    btn.disabled = false;
    btn.textContent = '✅ Confirm & Send to Manager';
    
    showModal('previewRequestModal');
}

async function confirmAndSubmitRequest() {
    if (!pendingRequestData) return;
    
    const btn = document.getElementById('previewConfirmBtn');
    btn.disabled = true;
    btn.innerHTML = '⏳ Sending... Please wait';
    
    try {
        await API.createProcurementRequest(pendingRequestData);
        
        btn.innerHTML = '✅ Sent Successfully!';
        btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
        
        showToast('✅ Request sent successfully!', 'success');
        
        setTimeout(() => {
            closeModal('previewRequestModal');
            pendingRequestData = null;
            loadProcurementDashboard();
            loadAllRequests();
        }, 1500);
        
    } catch (err) {
        btn.disabled = false;
        btn.textContent = '✅ Confirm & Send to Manager';
        showToast('❌ Failed: ' + err.message, 'error');
    }
}

// ================================================================
// SWITCH SIDEBAR TAB
// ================================================================
function switchSidebarTab(targetId, event) {
    if (!targetId) return;

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    
    const mainTarget = document.getElementById(targetId);
    if (mainTarget) mainTarget.classList.add('active');

    document.querySelectorAll('.sidebar-nav a, .sidebar-submenu a').forEach(link => link.classList.remove('active'));
    
    if (event && event.target) {
        const link = event.target.closest('a');
        if (link) link.classList.add('active');
    }

    if (targetId === 'sub-all-requests') loadAllRequests();
    else if (targetId === 'sub-incoming') loadIncomingRequests();
    else if (targetId === 'sub-remedial') loadRemedialRequests();
    else if (targetId === 'sub-pending') loadPendingRequests('');
    else if (targetId === 'sub-approved') loadApprovedRequests();
    else if (targetId === 'sub-paid') loadPaidProcurements();
    else if (targetId === 'sub-all-stock') loadStockItems();
    else if (targetId === 'sub-stock-trans') loadStockTransactions();
    else if (targetId === 'sub-all-assets') loadAssets();
    else if (targetId === 'sub-maintenance') loadMaintenanceLog();
    
    if (window.innerWidth <= 768) closeSidebar();
}

// ================================================================
// LOAD DASHBOARD
// ================================================================
async function loadProcurementDashboard() {
    try {
        const [all, pending, approved, paid] = await Promise.all([
            API.getProcurementRequests('/all').catch(() => []),
            API.getProcurementRequests('/pending').catch(() => []),
            API.getProcurementRequests('/approved').catch(() => []),
            API.getProcurementRequests('/paid').catch(() => [])
        ]);
        
        setText('statTotalProcurements', (all || []).length);
        setText('statPendingProcurements', (pending || []).length);
        setText('statApprovedProcurements', (approved || []).length);
        setText('statPaidProcurements', (paid || []).length);
    } catch (err) {
        console.error('Dashboard error:', err);
    }
}

// ================================================================
// LOAD ALL REQUESTS
// ================================================================
async function loadAllRequests() {
    const tbody = document.getElementById('allRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const requests = await API.getProcurementRequests('/all');
        document.getElementById('allRequestsCount').textContent = requests.length;
        renderRequestsTable(tbody, requests);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

async function loadIncomingRequests() {
    const tbody = document.getElementById('incomingRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const requests = await API.getProcurementRequests('/incoming');
        document.getElementById('incomingRequestsCount').textContent = requests.length;
        renderRequestsTable(tbody, requests, true);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

async function loadRemedialRequests() {
    const tbody = document.getElementById('remedialRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const requests = await API.getProcurementRequests('/remedial');
        document.getElementById('remedialRequestsCount').textContent = requests.length;
        if (requests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No remedial requests.</td></tr>`;
            return;
        }
        tbody.innerHTML = requests.map(r => `
            <tr>
                <td><strong>${esc(r.request_number)}</strong></td>
                <td>${esc(r.department)}</td>
                <td>${esc(r.requested_by)}</td>
                <td>${r.item_count || 0} items</td>
                <td>TSh ${Number(r.total_amount || 0).toLocaleString()}</td>
                <td><span class="status-badge ${r.status === 'rejected' ? 'rejected' : 'pending'}">${(r.status || '').toUpperCase()}</span></td>
                <td style="font-size:12px;color:var(--red);">${esc(r.rejection_reason || '—')}</td>
                <td><button class="action-btn blue" onclick="viewRequestDetail(${r.id})">📋 View</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

async function loadPendingRequests(stage = '') {
    const tbody = document.getElementById('pendingRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const url = stage ? `/pending?stage=${stage}` : '/pending';
        const requests = await API.getProcurementRequests(url);
        document.getElementById('pendingRequestsCount').textContent = requests.length;
        renderRequestsTable(tbody, requests);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

function filterPendingByStage(stage) {
    loadPendingRequests(stage);
}

async function loadApprovedRequests() {
    const tbody = document.getElementById('approvedRequestsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const requests = await API.getProcurementRequests('/approved');
        document.getElementById('approvedRequestsCount').textContent = requests.length;
        renderRequestsTable(tbody, requests, true);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

async function loadPaidProcurements() {
    const tbody = document.getElementById('paidProcurementsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const requests = await API.getProcurementRequests('/paid');
        document.getElementById('paidProcurementsCount').textContent = requests.length;
        renderRequestsTable(tbody, requests, true);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

function renderRequestsTable(tbody, requests, showActions = true, showPurchase = false) {
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No requests found.</td></tr>`;
        return;
    }
    
        tbody.innerHTML = requests.map(r => {
        let dropdownItems = `<button onclick="viewRequestDetail(${r.id})">👁️ View Details</button>`;

        if (showActions) {
            if (r.status === 'pending' || r.status === 'pending-procurement') {
                dropdownItems += `<button onclick="forwardToManager(${r.id})">📤 Forward to Manager</button>`;
                dropdownItems += `<button class="text-red" onclick="rejectRequest(${r.id})">❌ Reject Request</button>`;
            } else if (r.status === 'pending-purchaser-details') {
                dropdownItems += `<button onclick="openPurchaserDetailsModal(${r.id})">📝 Fill Purchaser Details</button>`;
            } else if (r.status === 'paid') {
                dropdownItems += `<button onclick="receiveStock(${r.id})">📦 Receive Stock</button>`;
            }
            // Chat button
            let badgeHtml = '';
            if (typeof unreadMessageCount !== 'undefined' && unreadMessageCount > 0) {
                badgeHtml = `<span style="background:#dc2626;color:white;font-size:9px;font-weight:900;padding:1px 5px;border-radius:10px;margin-left:auto;">${unreadMessageCount}</span>`;
            }
            dropdownItems += `<button onclick="openMessages(${r.id}, '${esc(r.request_number)}')" style="justify-content:space-between;">💬 Chat ${badgeHtml}</button>`;
        }

        const statusClass = getStatusClass(r.status);
        
        return `
            <tr>
                <td><strong style="font-family:monospace;">${esc(r.request_number)}</strong></td>
                <td>${esc(r.department)}</td>
                <td>${esc(r.requested_by)}</td>
                <td>${r.item_count || 0} items</td>
                <td>TSh ${Number(r.total_amount || 0).toLocaleString()}</td>
                <td><span class="status-badge ${statusClass}">${(r.status || '').toUpperCase().replace(/-/g, ' ')}</span></td>
                <td style="text-align:center;">
                    <div class="action-dropdown" id="dropdown-${r.id}">
                        <button class="action-dropdown-btn" onclick="toggleActionDropdown(event, ${r.id})">⋯</button>
                        <div class="action-dropdown-content">
                            ${dropdownItems}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleActionDropdown(event, id) {
    event.stopPropagation();
    
    document.querySelectorAll('.action-dropdown').forEach(d => {
        if (d.id !== `dropdown-${id}`) d.classList.remove('open');
    });
    
    const currentDropdown = document.getElementById(`dropdown-${id}`);
    if (!currentDropdown) return;

    const isOpen = currentDropdown.classList.contains('open');
    
    if (isOpen) {
        currentDropdown.classList.remove('open');
        return;
    }
    
    const btn = currentDropdown.querySelector('.action-dropdown-btn');
    const content = currentDropdown.querySelector('.action-dropdown-content');
    const rect = btn.getBoundingClientRect();
    
    content.style.top = `${rect.bottom + 5}px`;
    content.style.left = `${rect.right - 160}px`;
    
    currentDropdown.classList.add('open');
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.action-dropdown')) {
        document.querySelectorAll('.action-dropdown').forEach(d => d.classList.remove('open'));
    }
});

function getStatusClass(status) {
    const map = {
        'pending': 'pending',
        'pending-procurement': 'pending-approval',
        'pending-manager': 'pending-approval',
        'pending-ceo': 'pending-approval',
        'pending-purchaser-details': 'in-progress',
        'pending-finance': 'in-progress',
        'pending-payment-approval': 'pending-approval',
        'payment-approved': 'approved',
        'approved': 'approved',
        'purchasing': 'in-progress',
        'paid': 'completed',
        'completed': 'completed',
        'rejected': 'rejected',
        'returned': 'rejected'
    };
    return map[status] || 'pending';
}

// ================================================================
// VIEW REQUEST DETAILS
// ================================================================
async function viewRequestDetail(id) {
    try {
        const request = await API.getProcurementRequestById(id);
        currentViewRequest = request;
        
        document.getElementById('viewProcTitle').textContent = request.request_number;
        document.getElementById('viewProcSubtitle').textContent = 
            `${request.department} • ${request.requested_by}`;
        
        const statusBar = document.getElementById('viewProcStatusBar');
        const statusClass = getStatusClass(request.status);
        statusBar.innerHTML = `
            <span class="status-badge ${statusClass}" style="font-size:12px;padding:6px 14px;">
                ${(request.status || '').toUpperCase()}
            </span>
            <span style="font-size:12px;color:rgba(255,255,255,0.7);">
                📅 ${new Date(request.created_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
            </span>
        `;
        
        const body = document.getElementById('viewProcBody');
        const itemsHtml = (request.items || []).map(item => `
            <div style="background:white;padding:12px 16px;border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;border:1px solid var(--gray-200);">
                <div>
                    <div style="font-weight:700;">${esc(item.item_name)}</div>
                    <div style="font-size:11px;color:var(--gray-500);">
                        ${item.specification ? esc(item.specification) + ' • ' : ''}
                        ${item.quantity} ${item.unit} × TSh ${Number(item.estimated_price || 0).toLocaleString()}
                    </div>
                </div>
                <div style="font-weight:700;color:var(--primary);">
                    TSh ${Number((item.estimated_price || 0) * item.quantity).toLocaleString()}
                </div>
            </div>
        `).join('');
        
        body.innerHTML = `
            <div style="background:white;padding:18px;border-radius:12px;margin-bottom:16px;border:1px solid var(--gray-200);">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;">Department</div>
                        <div style="font-weight:700;">${esc(request.department)}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;">Urgency</div>
                        <div style="font-weight:700;">${request.urgency === 'urgent' ? '🔴 Urgent' : request.urgency === 'high' ? '🟡 High' : '🟢 Normal'}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;">Title</div>
                        <div style="font-weight:600;">${esc(request.title || '—')}</div>
                    </div>
                    <div>
                        <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;">Required By</div>
                        <div style="font-weight:600;">${request.required_by ? new Date(request.required_by).toLocaleDateString('en-GB') : '—'}</div>
                    </div>
                </div>
                <div style="margin-top:12px;">
                    <div style="font-size:10px;font-weight:800;color:var(--gray-400);text-transform:uppercase;margin-bottom:4px;">Justification</div>
                    <div style="font-size:13px;color:var(--gray-700);">${esc(request.notes || '—')}</div>
                </div>
            </div>
            
            <div style="font-size:11px;font-weight:800;color:var(--gray-500);text-transform:uppercase;margin-bottom:8px;">🛒 Items (${(request.items || []).length})</div>
            ${itemsHtml}
            
            <div style="background:linear-gradient(135deg,var(--primary) 0%,var(--primary-mid) 100%);color:white;padding:18px;border-radius:12px;margin-top:16px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total Amount</span>
                <span style="font-size:24px;font-weight:900;color:var(--gold);font-family:'Courier New',monospace;">TSh ${Number(request.total_amount || 0).toLocaleString()}</span>
            </div>
            
            ${request.rejection_reason ? `
                <div style="background:rgba(239,68,68,0.05);border-left:4px solid var(--red);padding:14px;border-radius:8px;margin-top:16px;">
                    <div style="font-size:10px;font-weight:800;color:#b91c1c;text-transform:uppercase;margin-bottom:4px;">❌ Reason</div>
                    <div style="font-size:13px;color:#7f1d1d;">${esc(request.rejection_reason)}</div>
                </div>
            ` : ''}
        `;
        
       // ================================================================
        // DYNAMIC ACTIONS (by status)
        // ================================================================
        const actionsEl = document.getElementById('viewProcActions');
        let actionsHtml = '';

        if (request.status === 'pending' || request.status === 'pending-procurement') {
            actionsHtml = `
                <button class="action-btn gold" onclick="forwardToManager(${request.id})">📤 Forward to Manager</button>
                <button class="action-btn red" onclick="rejectRequest(${request.id})">❌ Reject</button>
            `;}
        else if (request.status === 'pending-manager') {
            actionsHtml = `<span style="font-size:12px;color:#d97706;padding:10px 14px;background:rgba(245,158,11,0.1);border-radius:8px;font-weight:700;">⏳ Waiting for Manager Approval</span>`;}
        else if (request.status === 'pending-ceo') {
            actionsHtml = `<span style="font-size:12px;color:#6d28d9;padding:10px 14px;background:rgba(139,92,246,0.1);border-radius:8px;font-weight:700;">⏳ Waiting for CEO Approval</span>`;}
        else if (request.status === 'pending-purchaser-details') {
            actionsHtml = `<button class="action-btn gold" onclick="openPurchaserDetailsModal(${request.id})">📝 Fill Purchaser Details</button>`;}
        else if (request.status === 'pending-finance') {
            actionsHtml = `<span style="font-size:12px;color:#0f766e;padding:10px 14px;background:rgba(20,184,166,0.1);border-radius:8px;font-weight:700;">⏳ Waiting for Finance Verification</span>`;}
        else if (request.status === 'pending-payment-approval') {
            actionsHtml = `<span style="font-size:12px;color:#c2410c;padding:10px 14px;background:rgba(234,88,12,0.1);border-radius:8px;font-weight:700;">⏳ Payment Pending Approval</span>`;}
        else if (request.status === 'payment-approved') {
            actionsHtml = `<span style="font-size:12px;color:#16a34a;padding:10px 14px;background:rgba(34,197,94,0.1);border-radius:8px;font-weight:700;">✅ Payment Approved — Waiting for Finance to Pay</span>`;}
        else if (request.status === 'paid') {
            actionsHtml = `<button class="action-btn green" onclick="receiveStock(${request.id})">📦 Receive Stock</button>`;}
        else if (request.status === 'completed') {
            actionsHtml = `<span style="font-size:12px;color:#16a34a;padding:10px 14px;background:rgba(34,197,94,0.1);border-radius:8px;font-weight:700;">✅ Completed</span>`;}
        else if (request.status === 'returned' || request.status === 'rejected') {
            actionsHtml = `<span style="font-size:12px;color:#dc2626;padding:10px 14px;background:rgba(239,68,68,0.1);border-radius:8px;font-weight:700;">❌ Rejected ${request.rejection_stage ? 'by ' + request.rejection_stage.charAt(0).toUpperCase() + request.rejection_stage.slice(1) : ''}</span>`;}
        actionsEl.innerHTML = actionsHtml;
        showModal('viewProcurementModal');
        
    } catch (err) {
        showToast('Failed to load request: ' + err.message, 'error');
    }
}

// ================================================================
// MODERN CONFIRM + TOAST (kama hazipo)
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

        // Kama modal haipo kwenye HTML, tengeneza kwa dynamic
        if (!document.getElementById('modernConfirmOverlay')) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="modern-confirm-overlay" id="modernConfirmOverlay">
                    <div class="modern-confirm-box">
                        <div class="modern-confirm-banner" id="modernConfirmBanner"></div>
                        <div class="modern-confirm-icon-wrap">
                            <div class="modern-confirm-icon" id="modernConfirmIcon">
                                <span id="modernConfirmIconEmoji">?</span>
                                <span class="modal-icon-pulse"></span>
                            </div>
                        </div>
                        <div class="modern-confirm-content">
                            <h3 class="modern-confirm-title" id="modernConfirmTitle">Confirm?</h3>
                            <p class="modern-confirm-msg" id="modernConfirmMsg">Are you sure?</p>
                            <div id="modernConfirmDetail"></div>
                            <div id="modernConfirmForm"></div>
                        </div>
                        <div class="modern-confirm-actions">
                            <button class="btn-confirm-cancel" id="modernConfirmCancelBtn" onclick="modernConfirmCancel()">Cancel</button>
                            <button class="btn-confirm-primary" id="modernConfirmOkBtn" onclick="modernConfirmOk()">Confirm</button>
                        </div>
                    </div>
                </div>
            `);
        }

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

function modernToast(title, message, type = 'success', duration = 4000) {
    if (!document.getElementById('modernToastContainer')) {
        document.body.insertAdjacentHTML('beforeend', '<div class="modern-toast-container" id="modernToastContainer"></div>');
    }
    const container = document.getElementById('modernToastContainer');
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
// 1. Forward to Manager
async function forwardToManager(id) {
    const res = await modernConfirm({
        title: '📤 Forward to Manager?',
        message: 'This request will be sent to the Manager for approval.',
        type: 'success',
        okText: '📤 Forward',
        cancelText: 'Cancel'
    });
    if (!res.confirmed) return;

    try {
        await API.forwardRequestToManager(id);
        modernToast('✅ Forwarded', 'Request sent to Manager.', 'success');
        closeModal('viewProcurementModal');
        loadAllRequests();
        loadProcurementDashboard();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}
// 2. Open Purchaser Details Modal (After CEO Approval)
function openPurchaserDetailsModal(reqId) {
    const r = currentViewRequest || allRequests.find(x => x.id == reqId);
    if(!r) { showToast('Request not found', 'error'); return; }

    document.getElementById('pd_request_id').value = reqId;
    document.getElementById('pd_total').value = r.total_amount || 0;
    
    const dlBtn = document.getElementById('downloadImprestBtn');
    if(dlBtn) dlBtn.href = API.getImprestPdfUrl(reqId);

    document.getElementById('pd_error').style.display = 'none';
    document.getElementById('purchaserDetailsModal').classList.add('show');
}

// 3. Submit Purchaser Details
async function submitPurchaserDetails() {
    const id = document.getElementById('pd_request_id').value;
    const supplierName = document.getElementById('pd_supplier').value.trim();
    const supplierContact = document.getElementById('pd_contact').value.trim();
    const invoiceNumber = document.getElementById('pd_invoice').value.trim();
    const invoiceDate = document.getElementById('pd_invoice_date').value;
    const actualTotal = document.getElementById('pd_total').value;
    const paymentTerms = document.getElementById('pd_terms').value.trim();
    const fileInput = document.getElementById('pd_imprest_file');
    const errorDiv = document.getElementById('pd_error');

    if(!supplierName || !invoiceNumber || !fileInput.files[0]) {
        errorDiv.textContent = "⚠️ Please fill Supplier Name, Invoice Number, and Attach PDF.";
        errorDiv.style.display = 'block';
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    const submitBtn = document.querySelector('#purchaserDetailsModal button[onclick="submitPurchaserDetails()"]');
    const origText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Submitting...';
    submitBtn.disabled = true;

    reader.onload = async function(e) {
        const base64File = e.target.result;

        try {
            await API.submitPurchaserDetails(id, {
                supplierName, 
                supplierContact, 
                invoiceNumber, 
                invoiceDate, 
                actualTotal: parseFloat(actualTotal), 
                paymentTerms,
                imprestAttachment: base64File
            });
            showToast('✅ Details sent to Finance successfully!', 'success');
            closeModal('purchaserDetailsModal');
            loadAllRequests(); 
            closeModal('viewProcurementModal');
        } catch(err) {
            errorDiv.textContent = "Error: " + err.message;
            errorDiv.style.display = 'block';
        } finally {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}

// Legacy functions (kept for old statuses)
async function sendToFinance(id) {
    if (!confirm('Send this request to Finance for payment?')) return;
    try {
        await API.updateProcurementStatus(id, { status: 'pending-finance' });
        showToast('✅ Sent to Finance!', 'success');
        closeModal('viewProcurementModal');
        loadAllRequests();
        loadProcurementDashboard();
    } catch (err) {
        showToast('❌ Failed: ' + err.message, 'error');
    }
}

async function rejectRequest(id) {
    const res = await modernConfirm({
        title: '❌ Reject Request?',
        message: 'Provide a reason for rejecting this request.',
        type: 'danger',
        okText: '❌ Reject',
        cancelText: 'Cancel',
        needsReason: true,
        reasonLabel: 'Rejection Reason'
    });
    if (!res.confirmed) return;

    try {
        await API.updateProcurementStatus(id, { status: 'rejected', notes: res.reason });
        modernToast('❌ Rejected', 'Request has been rejected.', 'warning');
        closeModal('viewProcurementModal');
        loadAllRequests();
        loadProcurementDashboard();
    } catch (err) {
        modernToast('Failed', err.message, 'error');
    }
}

async function receiveStock(id) {
    if (!confirm('Receive items to store? This will add items to stock.')) return;
    try {
        await API.receiveStock(id);
        showToast('✅ Stock received!', 'success');
        closeModal('viewProcurementModal');
        loadAllRequests();
        loadProcurementDashboard();
    } catch (err) {
        showToast('❌ Failed: ' + err.message, 'error');
    }
}
function showToast(message, type = 'success') {
    // 1. Tengeneza div mpya ya toast
    const toast = document.createElement('div');
    toast.textContent = message;
    
    // 2. Weka mitindo (Styles) ya haraka
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.color = '#fff';
    toast.style.fontWeight = 'bold';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toast.style.transition = 'opacity 0.3s ease-in-out';
    
    // 3. Chagua rangi kulingana na aina ya ujumbe
    if (type === 'error') {
        toast.style.backgroundColor = '#dc2626'; // Nyekundu
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#f59e0b'; // Njano
    } else {
        toast.style.backgroundColor = '#16a34a'; // Kijani
    }

    // 4. Iunganishe kwenye ukurasa
    document.body.appendChild(toast);

    // 5. Ifute baada ya sekunde 3
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if(toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}
// ================================================================
// IMPREST PDF: DOWNLOAD & AUTO-ATTACH
// ================================================================

async function downloadAndAttachImprest() {
    const reqId = document.getElementById('pd_request_id').value;
    if (!reqId) return;
    
    // Tunaita function ile ya auto-fetch
    await autoFetchAndAttachPdf(reqId);
}
async function downloadImprestManually() {
    const reqId = document.getElementById('pd_request_id').value;
    if (!reqId) return;

    try {
        const response = await fetch(API.getImprestPdfUrl(reqId), {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error("Imeshindikana kupata PDF. Hakikisha CEO ameidhinisha.");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Fungua kwenye tab mpya
        window.open(url, '_blank');
        
        // Safisha memory
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);

    } catch (error) {
        showToast('❌ ' + error.message, 'error');
    }
}
function openPurchaserDetailsModal(reqId) {
    const r = currentViewRequest || (typeof allRequests !== 'undefined' ? allRequests.find(x => x.id == reqId) : null);
    if(!r) { showToast('Request not found', 'error'); return; }

    document.getElementById('pd_request_id').value = reqId;
    document.getElementById('pd_total').value = r.total_amount || 0;
    
    // Futa file ya zamani na status
    const fileInput = document.getElementById('pd_imprest_file');
    fileInput.value = '';
    document.getElementById('pd_file_status').style.display = 'none';
    document.getElementById('pd_error').style.display = 'none';

    document.getElementById('purchaserDetailsModal').classList.add('show');

    // 🆕 AUTO-FETCH: Pakua na uweke kwenye input mara moja!
    autoFetchAndAttachPdf(reqId);
}

// Function mpya ya kupakua kimyakimya (background)
async function autoFetchAndAttachPdf(reqId) {
    const btn = document.getElementById('btnAutoAttachPdf');
    const statusTxt = document.getElementById('pd_file_status');
    const fileInput = document.getElementById('pd_imprest_file');
    
    if (!reqId) return;

    if (btn) {
        btn.innerHTML = '⏳ Inapakua PDF...';
        btn.disabled = true;
    }

    try {
        const response = await fetch(API.getImprestPdfUrl(reqId), {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });

        if (!response.ok) {
            throw new Error("Imeshindikana kupakua PDF. Hakikisha CEO ameidhinisha.");
        }

        const blob = await response.blob();
        const fileName = `Imprest_${reqId}.pdf`;
        const file = new File([blob], fileName, { type: 'application/pdf' });

        // Weka kwenye input type="file"
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;

        // Onyesha ujumbe
        if (statusTxt) statusTxt.style.display = 'block';
        if (btn) btn.innerHTML = '✅ PDF Imeattach';

    } catch (error) {
        showToast('❌ ' + error.message, 'error');
        if (btn) btn.innerHTML = '📥 Download & Auto-Attach PDF';
        if (btn) btn.disabled = false;
    }
}
async function loadStockItems() {
    const container = document.getElementById('stockListContainer');
    if (!container) return;
    container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:30px;">⏳ Loading...</p>';
    
    try {
        const items = await API.getStockItems();
        
        if (!items || items.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:30px;">📭 No stock items yet. Add stock to get started.</p>';
            return;
        }
        
        container.innerHTML = `
            <div class="stock-grid">
                ${items.map(item => {
                    const qty = Number(item.quantity || 0);
                    const min = Number(item.min_stock_level || 10);
                    let status = 'in-stock', label = '✅ In Stock';
                    if (qty === 0) { status = 'out-of-stock'; label = '❌ Out of Stock'; }
                    else if (qty < min) { status = 'low-stock'; label = '⚠️ Low Stock'; }
                    
                    return `
                        <div class="stock-card">
                            <div class="stock-name">${esc(item.item_name)}</div>
                            <div class="stock-qty">${qty}</div>
                            <div class="stock-unit">${esc(item.unit || 'pcs')}</div>
                            <div class="stock-status ${status}">${label}</div>
                            <div style="font-size:11px;color:var(--gray-500);margin-top:6px;">
                                TSh ${Number(item.unit_price || 0).toLocaleString()} / unit
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<p style="text-align:center;color:var(--red);padding:30px;">❌ ${err.message}</p>`;
    }
}

async function loadStockTransactions() {
    const tbody = document.getElementById('stockTransTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const transactions = await API.getStockTransactions();
        
        if (!transactions || transactions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No transactions yet.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td>${new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                <td><strong>${esc(t.item_name || '—')}</strong></td>
                <td>
                    <span class="status-badge ${t.transaction_type === 'in' ? 'approved' : 'pending'}">
                        ${t.transaction_type === 'in' ? '📥 IN' : '📤 OUT'}
                    </span>
                </td>
                <td>${Number(t.quantity).toLocaleString()} ${esc(t.unit || '')}</td>
                <td>${esc(t.reference || t.notes || '—')}</td>
                <td>${esc(t.performed_by || '—')}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

function openStockEntryModal() {
    document.getElementById('stockItemName').value = '';
    document.getElementById('stockCategory').value = 'Building Materials';
    document.getElementById('stockQty').value = '';
    document.getElementById('stockUnit').value = '';
    document.getElementById('stockPrice').value = '';
    document.getElementById('stockTransType').value = 'in';
    document.getElementById('stockNotes').value = '';
    document.getElementById('stockEntryStatus').className = 'status-msg';
    document.getElementById('stockEntryStatus').textContent = '';
    showModal('stockEntryModal');
}
// ================================================================
// ASSETS MODULE LOGIC
// ================================================================
let currentAssets = [];
let assetSearchTimeout = null;

// 1. Load Assets (Kutoka DB kwenda kwenye Table)
async function loadAssets() {
    const tbody = document.getElementById('assetsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;

    const category = document.getElementById('assetFilterCategory')?.value || '';
    const status = document.getElementById('assetFilterStatus')?.value || '';
    const search = document.getElementById('assetSearchInput')?.value || '';

    try {
        // Pata data zote kwa mpigo
        const [assets, stats] = await Promise.all([
            API.getAssets({ category, status, search }),
            API.getAssetStats().catch(() => null)
        ]);

        currentAssets = assets;
        document.getElementById('assetsCount').textContent = assets.length;
        
        // Render Stats Cards
        if (stats) 
            document.getElementById('assetStatsGrid').className = 'asset-stats-grid';
            document.getElementById('assetStatsGrid').innerHTML = `             
                <div class="stat-card"><div class="stat-icon">🏷️</div><div class="stat-number">${stats.total}</div><div class="stat-label">Total Assets</div></div>
                <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-number">${stats.active}</div><div class="stat-label">Active</div></div>
                <div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-number">${stats.inMaintenance}</div><div class="stat-label">In Maintenance</div></div>
                <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-number">TSh ${Number(stats.totalCurrentValue).toLocaleString()}</div><div class="stat-label">Current Value</div></div>
            `;
        }

        // Render Table
        if (!assets || assets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No assets found.</td></tr>`;
            return;
        }

        tbody.innerHTML = assets.map(a => {
            let badgeColor = a.status === 'Active' ? 'approved' : (a.status === 'In Maintenance' ? 'pending' : 'rejected');
            return `
            <tr>
                <td><strong style="font-family:monospace;">${esc(a.asset_tag)}</strong></td>
                <td>${esc(a.name)}</td>
                <td>${esc(a.category)}</td>
                <td>${esc(a.location || '—')}</td>
                <td>${esc(a.custodian_name || '—')}</td>
                <td><strong style="color:var(--primary);">TSh ${Number(a.current_value).toLocaleString()}</strong></td>
                <td><span class="status-badge ${badgeColor}">${esc(a.status)}</span></td>
                <td>
                    <div class="action-dropdown">
                        <button class="action-dropdown-btn" onclick="toggleActionDropdown(event, 'asset-${a.id}')">⋯</button>
                        <div class="action-dropdown-content" id="dropdown-asset-${a.id}">
                            <button onclick="viewAssetDetail(${a.id})">👁️ View Details</button>
                            <button onclick="openAssetModal(${a.id})">✏️ Edit</button>
                            <button onclick="retireAssetPrompt(${a.id})">🗑️ Retire</button>
                        </div>
                    </div>
                </td>
            </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

function debounceLoadAssets() {
    clearTimeout(assetSearchTimeout);
    assetSearchTimeout = setTimeout(loadAssets, 500);
}

// 2. Open Modal (Add / Edit)
function openAssetModal(id = null) {
    document.getElementById('asset_error').style.display = 'none';
    document.getElementById('assetModalTitle').textContent = id ? '✏️ Edit Asset' : '📝 Add New Asset';
    document.getElementById('asset_id').value = id || '';
    
    if (id) {
        const asset = currentAssets.find(a => a.id == id);
        if (asset) {
            document.getElementById('asset_name').value = asset.name || '';
            document.getElementById('asset_category').value = asset.category || 'Equipment';
            document.getElementById('asset_serial').value = asset.serial_number || '';
            document.getElementById('asset_pdate').value = asset.purchase_date ? asset.purchase_date.split('T')[0] : '';
            document.getElementById('asset_value').value = asset.purchase_value || '';
            document.getElementById('asset_life').value = asset.useful_life_years || 5;
            document.getElementById('asset_location').value = asset.location || '';
            document.getElementById('asset_custodian').value = asset.custodian_name || '';
            document.getElementById('asset_notes').value = asset.notes || '';
        }
    } else {
        document.getElementById('asset_name').value = '';
        document.getElementById('asset_category').value = 'Equipment';
        document.getElementById('asset_serial').value = '';
        document.getElementById('asset_pdate').value = new Date().toISOString().split('T')[0];
        document.getElementById('asset_value').value = '';
        document.getElementById('asset_life').value = 5;
        document.getElementById('asset_location').value = '';
        document.getElementById('asset_custodian').value = '';
        document.getElementById('asset_notes').value = '';
    }
    
    document.getElementById('assetModal').classList.add('show');
}

// 3. Submit Asset
async function submitAsset() {
    const id = document.getElementById('asset_id').value;
    const btn = document.getElementById('saveAssetBtn');
    const errDiv = document.getElementById('asset_error');
    
    const data = {
        name: document.getElementById('asset_name').value.trim(),
        category: document.getElementById('asset_category').value,
        serialNumber: document.getElementById('asset_serial').value.trim(),
        purchaseDate: document.getElementById('asset_pdate').value || null,
        purchaseValue: parseFloat(document.getElementById('asset_value').value) || 0,
        usefulLifeYears: parseInt(document.getElementById('asset_life').value) || 5,
        location: document.getElementById('asset_location').value.trim(),
        custodianName: document.getElementById('asset_custodian').value.trim(),
        notes: document.getElementById('asset_notes').value.trim()
    };

    if (!data.name || !data.purchaseValue) {
        errDiv.textContent = '⚠️ Jina na Bei ya Manunuzi ni lazima!';
        errDiv.style.display = 'block';
        return;
    }

    btn.innerHTML = '⏳ Saving...';
    btn.disabled = true;

    try {
        if (id) {
            await API.updateAsset(id, data);
            showToast('✅ Asset updated!', 'success');
        } else {
            await API.createAsset(data);
            showToast('✅ Asset created!', 'success');
        }
        closeModal('assetModal');
        loadAssets();
    } catch (err) {
        errDiv.textContent = '❌ ' + err.message;
        errDiv.style.display = 'block';
    } finally {
        btn.innerHTML = '💾 Save Asset';
        btn.disabled = false;
    }
}

// 4. View Asset Details
async function viewAssetDetail(id) {
    try {
        const asset = await API.getAsset(id);
        let html = `
            <div style="padding:20px;">
                <h3 style="margin-top:0;">${esc(asset.name)} (${asset.asset_tag})</h3>
                <p><strong>Status:</strong> ${esc(asset.status)} | <strong>Condition:</strong> ${esc(asset.condition)}</p>
                <p><strong>Purchase Value:</strong> TSh ${Number(asset.purchase_value).toLocaleString()}</p>
                <p><strong>Current Value:</strong> TSh ${Number(asset.current_value).toLocaleString()}</p>
                <p><strong>Location:</strong> ${esc(asset.location || '—')} | <strong>Custodian:</strong> ${esc(asset.custodian_name || '—')}</p>
            </div>
        `;
        // Kama unataka kutumia modern confirm kwa kuonyesha info
        modernToast('Asset Details', `${asset.name} - TSh ${Number(asset.current_value).toLocaleString()}`, 'info');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 5. Retire Asset
async function retireAssetPrompt(id) {
    const res = await modernConfirm({
        title: '🗑️ Retire Asset?',
        message: 'Una uhakika unataka kuweka asset hii kwenye Retired?',
        type: 'danger',
        okText: '🗑️ Retire',
        needsReason: true,
        reasonLabel: 'Sababu ya kustaafisha'
    });
    if (!res.confirmed) return;

    try {
        await API.retireAsset(id, { reason: res.reason, status: 'Retired' });
        showToast('✅ Asset retired!', 'success');
        loadAssets();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 6. Maintenance Log (Load All)
async function loadMaintenanceLog() {
    const tbody = document.getElementById('maintenanceTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;
    
    try {
        const logs = await API.getAllMaintenance();
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No maintenance logs.</td></tr>`;
            return;
        }
        tbody.innerHTML = logs.map(l => `
            <tr>
                <td><strong>${esc(l.asset_name)}</strong> (${esc(l.asset_tag)})</td>
                <td>${esc(l.type)}</td>
                <td>${esc(l.description)}</td>
                <td>TSh ${Number(l.cost || 0).toLocaleString()}</td>
                <td><span class="status-badge ${l.status === 'completed' ? 'approved' : 'pending'}">${esc(l.status)}</span></td>
                <td>${l.completed_date ? new Date(l.completed_date).toLocaleDateString() : '—'}</td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

// 7. Ongeza hii kwenye switchSidebarTab() ili tab zifanye kazi
// (Tafuta switchSidebarTab kwenye procurement.js yako na uongeze hizi chini ya nyingine)
// else if (targetId === 'sub-all-assets') loadAssets();
// else if (targetId === 'sub-maintenance') loadMaintenanceLog();
async function submitStockEntry() {
    const statusDiv = document.getElementById('stockEntryStatus');
    const itemName = document.getElementById('stockItemName').value.trim();
    const quantity = parseFloat(document.getElementById('stockQty').value) || 0;
    
    if (!itemName) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Item name is required';
        return;
    }
    if (quantity <= 0) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Quantity must be greater than 0';
        return;
    }
    
    try {
        await API.addStockItem({
            itemName,
            category: document.getElementById('stockCategory').value,
            quantity,
            unit: document.getElementById('stockUnit').value || 'pcs',
            unitPrice: parseFloat(document.getElementById('stockPrice').value) || 0,
            notes: document.getElementById('stockNotes').value
        });
        
        showToast('✅ Stock added successfully!', 'success');
        closeModal('stockEntryModal');
        loadStockItems();
    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    }
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================
function esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}