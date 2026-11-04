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
  
  // 🆕 Reset unread count
  unreadMessageCount = 0;
  updateMessageBadges();
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
        
        // Kama kuna shida ya mtandao, usiandike kosa kwenye console
        const all = await API.getProcurementRequests('/all').catch(() => null);
        if (!all) return; // Ikishindwa kupata, tulia

        const list = Array.isArray(all) ? all : (all?.requests || all?.data || []);
        
        // ... mabaki ya code yako ya checkNewMessages ...
    } catch (err) {
        // Tulia kimya kimya usilete kosa kwenye console
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
// 1. ADD STOCK MODAL
// ================================================================
function openStockEntryModal() {
  document.getElementById('stockItemName').value = '';
  document.getElementById('stockCategory').value = 'Building Materials';
  document.getElementById('stockSpecification').value = '';
  document.getElementById('stockQty').value = '';
  document.getElementById('stockUnit').value = 'pcs';
  document.getElementById('stockPrice').value = '';
  document.getElementById('stockMinLevel').value = '10';
  document.getElementById('stockLocation').value = '';
  document.getElementById('stockNotes').value = '';
  document.getElementById('stockEntryStatus').className = 'status-msg';
  document.getElementById('stockEntryStatus').textContent = '';
  showModal('stockEntryModal');
}

async function submitStockEntry() {
  const statusDiv = document.getElementById('stockEntryStatus');
  const itemName = document.getElementById('stockItemName').value.trim();
  const quantity = parseFloat(document.getElementById('stockQty').value) || 0;
  
  if (!itemName) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Item name ni lazima.';
    return;
  }
  if (quantity < 0) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Quantity haiwezi kuwa hasi.';
    return;
  }

  const submitBtn = document.querySelector('#stockEntryModal button[onclick="submitStockEntry()"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Saving...';

  try {
    await API.addStockItem({
      itemName,
      category: document.getElementById('stockCategory').value,
      specification: document.getElementById('stockSpecification').value.trim() || null,
      quantity,
      unit: document.getElementById('stockUnit').value,
      unitPrice: parseFloat(document.getElementById('stockPrice').value) || 0,
      minStockLevel: parseFloat(document.getElementById('stockMinLevel').value) || 10,
      location: document.getElementById('stockLocation').value.trim() || null,
      notes: document.getElementById('stockNotes').value.trim() || null
    });
    
    showToast('✅ Stock imeongezwa!', 'success');
    closeModal('stockEntryModal');
    loadStockItems();
  } catch (err) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ ' + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// ================================================================
// 2. ISSUE STOCK MODAL
// ================================================================
function openStockIssueModal(stockItemId, itemName, availableQty) {
  document.getElementById('issueStockItemId').value = stockItemId;
  document.getElementById('issueStockItemName').textContent = itemName || '—';
  document.getElementById('issueStockItemAvailable').textContent = 
    `Available: ${availableQty !== undefined ? availableQty : '—'}`;
  document.getElementById('issueStockQty').value = '';
  document.getElementById('issueStockDepartment').value = '';
  document.getElementById('issueStockIssuedTo').value = '';
  document.getElementById('issueStockNotes').value = '';
  document.getElementById('stockIssueStatus').className = 'status-msg';
  document.getElementById('stockIssueStatus').textContent = '';
  showModal('stockIssueModal');
}

async function submitStockIssue() {
  const statusDiv = document.getElementById('stockIssueStatus');
  const stockItemId = parseInt(document.getElementById('issueStockItemId').value);
  const quantity = parseFloat(document.getElementById('issueStockQty').value) || 0;
  const department = document.getElementById('issueStockDepartment').value;
  const issuedTo = document.getElementById('issueStockIssuedTo').value.trim();
  const notes = document.getElementById('issueStockNotes').value.trim();

  if (!quantity || quantity <= 0) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Quantity lazima iwe zaidi ya 0.';
    return;
  }
  if (!department) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Chagua department.';
    return;
  }

  const submitBtn = document.querySelector('#stockIssueModal button[onclick="submitStockIssue()"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Issuing...';

  try {
    await API.stockOut({
      stockItemId,
      quantity,
      department,
      issuedTo: issuedTo || null,
      notes
    });
    
    showToast('✅ Stock imetolewa!', 'success');
    closeModal('stockIssueModal');
    loadStockItems();
  } catch (err) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ ' + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// ================================================================
// 3. ADJUST STOCK MODAL
// ================================================================
function openStockAdjustModal(stockItemId, itemName, currentQty) {
  document.getElementById('adjustStockItemId').value = stockItemId;
  document.getElementById('adjustStockItemName').textContent = itemName || '—';
  document.getElementById('adjustCurrentQty').value = currentQty;
  document.getElementById('adjustNewQty').value = currentQty;
  document.getElementById('adjustReason').value = '';
  document.getElementById('adjustNotes').value = '';
  document.getElementById('stockAdjustStatus').className = 'status-msg';
  document.getElementById('stockAdjustStatus').textContent = '';
  document.getElementById('adjustDiffBox').style.display = 'none';

  // Listener for diff
  const newQtyInput = document.getElementById('adjustNewQty');
  newQtyInput.oninput = function() {
    const current = parseFloat(document.getElementById('adjustCurrentQty').value) || 0;
    const newQty = parseFloat(this.value) || 0;
    const diff = newQty - current;
    
    const diffBox = document.getElementById('adjustDiffBox');
    const diffValue = document.getElementById('adjustDiffValue');
    
    if (diff !== 0) {
      diffBox.style.display = 'block';
      diffValue.textContent = (diff > 0 ? '+' : '') + diff + ` (${diff > 0 ? 'increase' : 'decrease'})`;
      diffValue.style.color = diff > 0 ? 'var(--green)' : 'var(--red)';
    } else {
      diffBox.style.display = 'none';
    }
  };
  
  showModal('stockAdjustModal');
}

async function submitStockAdjust() {
  const statusDiv = document.getElementById('stockAdjustStatus');
  const stockItemId = parseInt(document.getElementById('adjustStockItemId').value);
  const newQuantity = parseFloat(document.getElementById('adjustNewQty').value);
  const reason = document.getElementById('adjustReason').value;
  const notes = document.getElementById('adjustNotes').value.trim();

  if (isNaN(newQuantity) || newQuantity < 0) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ New quantity lazima iwe namba >= 0.';
    return;
  }
  if (!reason) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Chagua reason.';
    return;
  }

  const submitBtn = document.querySelector('#stockAdjustModal button[onclick="submitStockAdjust()"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Adjusting...';

  try {
    const result = await API.adjustStockItem({
      stockItemId,
      newQuantity,
      reason,
      notes
    });
    
    showToast('✅ Adjustment imefanyika!', 'success');
    closeModal('stockAdjustModal');
    loadStockItems();
  } catch (err) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ ' + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
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
    else if (targetId === 'sub-all-stock') {loadStockItems();loadSuppliers();loadPurchaseOrders();}
    else if (targetId === 'sub-add-stock') openStockEntryModal();
    else if (targetId === 'sub-stock-trans') loadStockTransactions();
    else if (targetId === 'sub-stock-trans') loadStockTransactions();
    else if (targetId === 'sub-all-assets') loadAssets();
    else if (targetId === 'sub-stock-out') loadRecentStockOuts();
    else if (targetId === 'sub-stock-out') loadStockItems();
    else if (targetId === 'sub-stock-receive') loadPendingReceives();
    else if (targetId === 'sub-maintenance') loadMaintenanceLog();
    else if (targetId === 'sub-report-annual') loadMasterReport();

    if (window.innerWidth <= 768) closeSidebar();
}
// ================================================================
// 🆕 PROCUREMENT REPORT
// ================================================================
async function loadProcurementReport() {
    const statsGrid = document.getElementById('reportStatsGrid');
    const recentContainer = document.getElementById('reportRecentTable');
    if (!statsGrid) return;

    const period = document.getElementById('reportPeriodFilter').value;

    statsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">⏳ Loading...</p>';
    recentContainer.innerHTML = '';

    try {
        const data = await API.getProcurementSummary({ period });
        const s = data.summary;

        statsGrid.innerHTML = `
            <div class="stat-card" style="border-left:4px solid var(--blue);">
                <div class="stat-icon">📋</div>
                <div class="stat-number">${s.total_requests || 0}</div>
                <div class="stat-label">Total Requests</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--green);">
                <div class="stat-icon">💰</div>
                <div class="stat-number" style="color:var(--green); font-size:20px;">TSh ${Number(s.paid_value || 0).toLocaleString()}</div>
                <div class="stat-label">Paid Amount</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--orange);">
                <div class="stat-icon">⏳</div>
                <div class="stat-number" style="color:var(--orange); font-size:20px;">TSh ${Number(s.pending_value || 0).toLocaleString()}</div>
                <div class="stat-label">Pending Amount</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--red);">
                <div class="stat-icon">⚠️</div>
                <div class="stat-number" style="color:var(--red);">${s.pending_manager || 0}</div>
                <div class="stat-label">Waiting Manager</div>
            </div>
        `;

        if (!data.recentRequests || data.recentRequests.length === 0) {
            recentContainer.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:20px;">Hakuna requests katika kipindi hiki.</p>';
            return;
        }

        recentContainer.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th>Request #</th><th>Title</th><th>Amount</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                    ${data.recentRequests.map(r => `
                        <tr>
                            <td><strong style="font-family:monospace;">${esc(r.request_number)}</strong></td>
                            <td>${esc(r.title || '—')}</td>
                            <td>TSh ${Number(r.total_amount).toLocaleString()}</td>
                            <td><span class="status-badge ${getStatusClass(r.status)}">${(r.status || '').toUpperCase()}</span></td>
                            <td>${new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        statsGrid.innerHTML = `<p style="grid-column:1/-1;color:red;">❌ ${err.message}</p>`;
    }
}
async function loadProcurementDashboard() {
    try {
        // 1. Tunachukua data za Procurement kwanza (hizi ni muhimu)
        const results = await Promise.allSettled([
            API.getProcurementRequests('/all'),
            API.getProcurementRequests('/pending'),
            API.getProcurementRequests('/approved'),
            API.getProcurementRequests('/paid')
        ]);

        const all = results[0].status === 'fulfilled' ? results[0].value : [];
        const pending = results[1].status === 'fulfilled' ? results[1].value : [];
        const approved = results[2].status === 'fulfilled' ? results[2].value : [];
        const paid = results[3].status === 'fulfilled' ? results[3].value : [];

        setText('statTotalProcurements', (all || []).length);
        setText('statPendingProcurements', (pending || []).length);
        setText('statApprovedProcurements', (approved || []).length);
        setText('statPaidProcurements', (paid || []).length);

        // 2. Tunachukua Stock Summary kwa nyuma (background) bila kuzuia ukurasa
        API.getStockSummary().then(stockSummary => {
            if (stockSummary) {
                renderStockSummary(stockSummary?.summary || {});
            }
        }).catch(() => {
            // Kama inashindwa, tulia kimya kimya
        });

    } catch (err) {
        console.error('Dashboard error:', err);
    }
}
// ================================================================
// 🆕 MASTER REPORT (Executive Summary)
// ================================================================
let currentMasterReport = null;

async function loadMasterReport() {
    const narrative = document.getElementById('masterNarrativeText');
    const grid = document.getElementById('masterKPIGrid');
    const period = document.getElementById('masterPeriodFilter').value;

    narrative.textContent = '⏳ Loading report...';
    grid.innerHTML = '';

    try {
        const data = await API.getMasterReport({ period });
        currentMasterReport = data;

        // Onyesha Narrative
        narrative.textContent = data.narrative;

        // Onyesha KPI Cards
        grid.innerHTML = `
            <div class="stat-card" style="border-left:4px solid var(--blue);">
                <div class="stat-icon">📋</div>
                <div class="stat-number">${data.procurement.total_requests || 0}</div>
                <div class="stat-label">Procurement Requests</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">TSh ${Number(data.procurement.total_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--green);">
                <div class="stat-icon">📦</div>
                <div class="stat-number">${data.stock.total_items || 0}</div>
                <div class="stat-label">Stock Items</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Value: TSh ${Number(data.stock.total_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--orange);">
                <div class="stat-icon">🏷️</div>
                <div class="stat-number">${data.assets.total_assets || 0}</div>
                <div class="stat-label">Fixed Assets</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Value: TSh ${Number(data.assets.total_current_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--purple);">
                <div class="stat-icon">📄</div>
                <div class="stat-number">${data.tenders.total_tenders || 0}</div>
                <div class="stat-label">Tenders Registered</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Won: ${data.tenders.won || 0} (TSh ${Number(data.tenders.won_value || 0).toLocaleString()})</div>
            </div>
        `;

    } catch (err) {
        narrative.textContent = '❌ Failed to load report: ' + err.message;
        narrative.style.color = 'red';
    }
}
function printMasterReport() {
    if (!currentMasterReport) {
        showToast('Load the report first.', 'warning');
        return;
    }

    const d = currentMasterReport;
    const html = `
        <html>
        <head>
            <title>Executive Summary Report - MAK DC</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                .header { text-align: center; border-bottom: 3px solid #022908; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; font-size: 22px; color: #022908; }
                .header p { margin: 5px 0; font-size: 13px; color: #666; }
                .narrative { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin-bottom: 25px; font-size: 14px; line-height: 1.8; }
                .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
                .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .card-label { font-size: 11px; color: #666; text-transform: uppercase; }
                .card-value { font-size: 20px; font-weight: 900; color: #022908; }
                .footer { text-align: center; font-size: 11px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>MAK DC INVESTMENT COMPANY LTD</h1>
                <p>Executive Summary Report — ${d.period.toUpperCase()}</p>
                <p>Generated on ${new Date().toLocaleString()} by ${Auth.getUser().fullName}</p>
            </div>
            <div class="narrative">${d.narrative}</div>
            <div class="stats">
                <div class="card"><div class="card-label">Procurement Requests</div><div class="card-value">${d.procurement.total_requests || 0} (TSh ${Number(d.procurement.total_value || 0).toLocaleString()})</div></div>
                <div class="card"><div class="card-label">Stock Value</div><div class="card-value">TSh ${Number(d.stock.total_value || 0).toLocaleString()}</div></div>
                <div class="card"><div class="card-label">Assets Value</div><div class="card-value">TSh ${Number(d.assets.total_current_value || 0).toLocaleString()}</div></div>
                <div class="card"><div class="card-label">Tenders Won</div><div class="card-value">${d.tenders.won || 0} (TSh ${Number(d.tenders.won_value || 0).toLocaleString()})</div></div>
            </div>
            <div class="footer">
                This is a computer-generated document. No signature required.<br>
                MAK DC Investment Company LTD &copy; ${new Date().getFullYear()}
            </div>
        </body>
        </html>
    `;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
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
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }

    const targetId = `dropdown-${id}`;
    document.querySelectorAll('.action-dropdown').forEach(d => {
        if (d.id !== targetId) d.classList.remove('open');
    });

    const currentDropdown = document.getElementById(targetId);
    if (!currentDropdown) return;

    const isOpen = currentDropdown.classList.contains('open');
    if (isOpen) {
        currentDropdown.classList.remove('open');
        return;
    }

    const btn = currentDropdown.querySelector('.action-dropdown-btn');
    const content = currentDropdown.querySelector('.action-dropdown-content');
    if (!btn || !content) return;

    const rect = btn.getBoundingClientRect();
    content.style.top = `${rect.bottom + 5}px`;
    content.style.left = `${rect.right - 160}px`;
    currentDropdown.classList.add('open');
}

window.toggleActionDropdown = toggleActionDropdown;

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
async function openPurchaserDetailsModal(reqId) {
  let r = currentViewRequest;
  if (!r || r.id != reqId) {
    try {
      r = await API.getProcurementRequestById(reqId);
    } catch (e) {
      showToast('Request not found', 'error');
      return;
    }
  }

  document.getElementById('pd_request_id').value = reqId;
  document.getElementById('pd_total').value = r.total_amount || 0;
  
  const fileInput = document.getElementById('pd_imprest_file');
  fileInput.value = '';
  document.getElementById('pd_file_status').style.display = 'none';
  document.getElementById('pd_error').style.display = 'none';

  document.getElementById('purchaserDetailsModal').classList.add('show');

  autoFetchAndAttachPdf(reqId);
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
// ================================================================
// UTILITY: Toast — wraps modernToast for backward compatibility
// ================================================================
function showToast(message, type = 'success') {
  const titles = {
    success: '✅ Succesfully',
    error: '❌ There is some issue to handle',
    warning: '⚠️ Precaution',
    info: 'ℹ️ Information'
  };

  // Kama modernToast ipo (kwenye procurement.js), itumike
  if (typeof modernToast === 'function') {
    modernToast(titles[type] || 'Taarifa', message, type);
  } else {
    // Fallback (kama modernToast haipo)
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
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
function renderLowStockList(items = []) {
    const container = document.getElementById('lowStockListContainer');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:12px 0;">✅ No low stock alerts.</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div style="padding:10px 12px;border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.04);border-radius:10px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <strong style="font-size:13px;">${esc(item.item_name)}</strong>
                <span style="font-size:11px;padding:4px 7px;border-radius:999px;background:rgba(245,158,11,0.12);color:var(--orange);font-weight:800;">${Number(item.quantity || 0)} / ${Number(item.min_stock_level || 0)}</span>
            </div>
            <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">${esc(item.category || 'General')} • ${esc(item.location || 'Store')}</div>
        </div>
    `).join('');
}

function renderStockSummary(summary = {}) {
    const grid = document.getElementById('stockSummaryGrid');
    if (!grid) return;

    const data = summary || {};
    const cards = [
        { label: 'Total Items', value: data.total_items ?? 0, icon: '📦' },
        { label: 'Total Qty', value: data.total_quantity ?? 0, icon: '🔢' },
        { label: 'Low Stock', value: data.low_stock_count ?? 0, icon: '⚠️' },
        { label: 'Out of Stock', value: data.out_of_stock_count ?? 0, icon: '❌' },
        { label: 'In Stock', value: data.in_stock_count ?? 0, icon: '✅' }
    ];

    grid.innerHTML = cards.map(card => `
        <div style="background:linear-gradient(135deg,#ffffff,#f8fafc);border:1px solid var(--gray-200);border-radius:14px;padding:16px;box-shadow:0 8px 20px rgba(15,23,42,0.04);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <span style="font-size:18px;">${card.icon}</span>
                <span style="font-size:10px;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.08em;">${card.label}</span>
            </div>
            <div style="font-size:24px;font-weight:900;color:var(--primary);">${card.value}</div>
        </div>
    `).join('');

    const countWrap = document.getElementById('stockSummaryCount');
    if (countWrap) countWrap.textContent = data.total_items ?? 0;
}

async function loadStockSummary() {
    const grid = document.getElementById('stockSummaryGrid');
    if (!grid) return;

    try {
        const payload = await API.getStockSummary();
        renderStockSummary(payload?.summary || {});
        renderLowStockList(payload?.lowStockItems || []);
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1; background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15); color:var(--red); border-radius:12px; padding:16px;">❌ ${esc(err.message)}</div>`;
    }
}
// ================================================================
// STOCK — MODERN TABLE & DASHBOARD
// ================================================================
let stockSearchTimeout = null;

// 1. LOAD STOCK ITEMS (Inajaza Table Mpya)
async function loadStockItems() {
  const tbody = document.getElementById('stockTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading data...</td></tr>`;

  const category = document.getElementById('stockFilterCategory')?.value || '';
  const status = document.getElementById('stockFilterStatus')?.value || '';
  const search = document.getElementById('stockSearchInput')?.value || '';

  try {
    const [items, summaryData] = await Promise.all([
      API.getStockItems({ category, search }),
      API.getStockSummary().catch(() => null)
    ]);

    // Render summary (Hii inajaza kadi za juu)
    if (summaryData) {
      renderStockSummary(summaryData.summary || {});
    }

    // Hifadhi items kwa ajili ya dropdown ya Stock Out
    window._allStockItems = items;
    populateStockOutDropdown(items);

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No stock items found. Click "➕ Add Stock" to get started.</td></tr>`;
      return;
    }

    // Filter by stock status (Frontend filtering)
    let filteredItems = items;
    if (status === 'in-stock') {
      filteredItems = items.filter(i => Number(i.quantity) > Number(i.min_stock_level));
    } else if (status === 'low-stock') {
      filteredItems = items.filter(i => Number(i.quantity) > 0 && Number(i.quantity) <= Number(i.min_stock_level));
    } else if (status === 'out-of-stock') {
      filteredItems = items.filter(i => Number(i.quantity) === 0);
    }

    // Render Table Rows
    tbody.innerHTML = filteredItems.map(item => {
      const qty = Number(item.quantity || 0);
      const min = Number(item.min_stock_level || 10);
      
      let badge = '<span style="background:rgba(34,197,94,0.1);color:#16a34a;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">✅ In Stock</span>';
      if (qty === 0) {
        badge = '<span style="background:rgba(239,68,68,0.1);color:#dc2626;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">❌ Out of Stock</span>';
      } else if (qty <= min) {
        badge = '<span style="background:rgba(245,158,11,0.1);color:#d97706;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">⚠️ Low Stock</span>';
      }

      return `
        <tr style="border-bottom:1px solid var(--gray-100); transition:background 0.2s;" onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='white'">
          <td style="padding:14px;">
            <div style="font-weight:800; color:var(--primary); font-size:14px;">${esc(item.item_name)}</div>
            <div style="font-size:11px; color:var(--gray-500); font-family:monospace;">${esc(item.item_code || 'No Code')} • ${esc(item.specification || 'No Spec')}</div>
          </td>
          <td style="padding:14px; font-size:12px; font-weight:600; color:var(--gray-700);">${esc(item.category || 'General')}</td>
          <td style="padding:14px; font-size:12px; color:var(--gray-600);">${esc(item.location || '—')}</td>
          <td style="padding:14px; text-align:center;">
            <div style="font-size:16px; font-weight:900; color:${qty === 0 ? 'var(--red)' : (qty <= min ? 'var(--orange)' : 'var(--primary)')};">${qty}</div>
            <div style="font-size:10px; color:var(--gray-500); text-transform:uppercase;">${esc(item.unit || 'pcs')}</div>
          </td>
          <td style="padding:14px; text-align:right; font-weight:700; font-size:13px; color:var(--gray-800);">
            TSh ${Number(item.unit_price || 0).toLocaleString()}
          </td>
          <td style="padding:14px; text-align:center;">${badge}</td>
          <td style="padding:14px; text-align:center;">
            <div style="display:flex; gap:6px; justify-content:center;">
                <button onclick="openStockAdjustModal(${item.id}, '${esc(item.item_name).replace(/'/g, "\\'")}', ${qty})" style="padding:6px 12px; background:var(--gray-200); color:var(--gray-800); border:none; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;" title="Adjust Stock">
                    🔧 Adjust
                </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--red);">❌ ${esc(err.message)}</td></tr>`;
  }
}

// 2. RENDER STOCK SUMMARY
function renderStockSummary(summary) {
  const grid = document.getElementById('stockSummaryGrid');
  if (!grid) return;

  const data = summary || {};
  const cards = [
    { label: 'Total Items', value: data.total_items ?? 0, icon: '📦' },
    { label: 'Total Quantity', value: Number(data.total_quantity ?? 0).toFixed(0), icon: '🔢' },
    { label: 'Low Stock', value: data.low_stock_count ?? 0, icon: '⚠️' },
    { label: 'Out of Stock', value: data.out_of_stock_count ?? 0, icon: '❌' }
  ];

  grid.innerHTML = cards.map(card => `
    <div style="background:linear-gradient(135deg,#ffffff,#f8fafc);border:1px solid var(--gray-200);border-radius:14px;padding:16px;box-shadow:0 4px 12px rgba(15,23,42,0.04);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:20px;">${card.icon}</span>
        <span style="font-size:10px;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.08em;font-weight:800;">${card.label}</span>
      </div>
      <div style="font-size:24px;font-weight:900;color:var(--primary);">${card.value}</div>
    </div>
  `).join('');

  const countWrap = document.getElementById('stockSummaryCount');
  if (countWrap) countWrap.textContent = data.total_items ?? 0;
}

// 3. DEBOUNCE SEARCH
function debounceLoadStock() {
  clearTimeout(stockSearchTimeout);
  stockSearchTimeout = setTimeout(loadStockItems, 400);
}

// ================================================================
// STOCK OUT (Form ya Kutoa Stock)
// ================================================================
function populateStockOutDropdown(items) {
  const select = document.getElementById('so_stockItemId');
  if (!select) return;

  select.innerHTML = '<option value="">-- Chagua Bidhaa --</option>';
  items.filter(i => i.quantity > 0).forEach(item => {
    select.innerHTML += `<option value="${item.id}">${esc(item.item_name)} (Iliyopo: ${item.quantity} ${item.unit})</option>`;
  });
}

async function submitStockOutForm() {
  const statusDiv = document.getElementById('so_status');
  const stockItemId = document.getElementById('so_stockItemId').value;
  const quantity = parseFloat(document.getElementById('so_quantity').value) || 0;
  const department = document.getElementById('so_department').value;
  const issuedTo = document.getElementById('so_issuedTo').value.trim();
  const notes = document.getElementById('so_notes').value.trim();

  if (!stockItemId || quantity <= 0 || !department || !issuedTo) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Chagua bidhaa, weka idadi, chagua idara, na weka jina la mpokeaji.';
    return;
  }

  const btn = document.querySelector('#sub-stock-out button[onclick="submitStockOutForm()"]');
  btn.disabled = true;
  btn.innerHTML = '⏳ Issuing...';

  try {
    const res = await API.stockOut({ stockItemId, quantity, department, issuedTo, notes });
    showToast('✅ Stock imetolewa!', 'success');
   
    openVoucherModal(res.movement); 
    // Safisha form
    document.getElementById('so_stockItemId').value = '';
    document.getElementById('so_quantity').value = '';
    document.getElementById('so_issuedTo').value = '';
    document.getElementById('so_notes').value = '';
    statusDiv.className = 'status-msg';

    loadStockItems(); 
    loadStockTransactions(); 

  } catch (err) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ ' + err.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '📤 Issue Item Now';
  }
}

// Function ya ku-print Voucher
function printIssueVoucher(movement) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>Issue Voucher - ${movement.reference}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 5px 0; font-size: 14px; color: #555; }
                .details { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .details th, .details td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                .details th { background: #f9f9f9; width: 30%; }
                .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
                .sig-box { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>MAK DC INVESTMENT COMPANY LTD</h1>
                <p>Procurement & Store Department</p>
                <h2 style="margin-top: 20px; text-decoration: underline;">STOCK ISSUE VOUCHER</h2>
            </div>
            
            <table class="details">
                <tr><th>Voucher No.</th><td><strong>${movement.reference}</strong></td></tr>
                <tr><th>Date Issued</th><td>${new Date(movement.created_at).toLocaleString()}</td></tr>
                <tr><th>Item Issued</th><td>${movement.item_name}</td></tr>
                <tr><th>Quantity</th><td><strong>${movement.quantity} ${movement.item_unit}</strong></td></tr>
                <tr><th>Department</th><td>${movement.department}</td></tr>
                <tr><th>Issued To (Receiver)</th><td><strong>${movement.issued_to}</strong></td></tr>
                <tr><th>Issued By (Store)</th><td>${movement.performed_by}</td></tr>
                <tr><th>Notes</th><td>${movement.reason || '-'}</td></tr>
            </table>

            <div class="signatures">
                <div class="sig-box">
                    <br><br>
                    <strong>Store Officer Signature</strong>
                </div>
                <div class="sig-box">
                    <br><br>
                    <strong>Receiver Signature</strong>
                </div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
}
// ================================================================
// STOCK MOVEMENTS (Transactions History)
// ================================================================
async function loadStockTransactions() {
  const tbody = document.getElementById('stockTransTableBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading...</td></tr>`;

  try {
    const filters = {
      type: document.getElementById('movementFilterType')?.value || '',
      startDate: document.getElementById('movementStartDate')?.value || '',
      endDate: document.getElementById('movementEndDate')?.value || ''
    };

    const movements = await API.getStockMovements(filters);

    if (!movements || movements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No movements found.</td></tr>`;
      return;
    }

    const typeIcons = {
      'in': '📥', 'out': '📤', 'adjustment': '🔧', 'damage': '❌',
      'return': '↩️', 'transfer': '🚚', 'production-in': '🏭', 
      'production-out': '🏭', 'asset-convert': '🏷️', 'sale': '💰'
    };

    tbody.innerHTML = movements.map(m => {
      const typeIcon = typeIcons[m.transaction_type] || '📋';
      const typeClass = ['in', 'return', 'production-in'].includes(m.transaction_type) ? 'approved' :
                        ['out', 'damage', 'production-out', 'sale'].includes(m.transaction_type) ? 'pending' : 'in-progress';
      
      return `
        <tr>
          <td style="font-size:11px;">${new Date(m.created_at).toLocaleDateString('en-GB')}</td>
          <td><strong style="font-family:monospace;font-size:11px;">${esc(m.movement_number || '—')}</strong></td>
          <td>
            <strong>${esc(m.item_name || '—')}</strong>
            ${m.item_code ? `<div style="font-size:10px;color:var(--gray-500);font-family:monospace;">${esc(m.item_code)}</div>` : ''}
          </td>
          <td><span class="status-badge ${typeClass}" style="font-size:10px;">${typeIcon} ${(m.transaction_type || '').toUpperCase()}</span></td>
          <td><strong>${Number(m.quantity || 0)}</strong> ${esc(m.item_unit || '')}</td>
          <td style="font-size:11px;color:var(--gray-600);">
            ${m.balance_before !== null ? `${Number(m.balance_before)} → ${Number(m.balance_after)}` : '—'}
          </td>
          <td style="font-size:11px;">${esc(m.department || '—')}</td>
          <td style="font-size:11px;color:var(--gray-600);">${esc(m.reference || m.reference_id || '—')}</td>
          <td style="font-size:11px;">${esc(m.performed_by || '—')}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--red);">❌ ${esc(err.message)}</td></tr>`;
  }
}
// ================================================================
// MODAL: ADD STOCK
// ================================================================
function openStockEntryModal() {
  document.getElementById('stockItemName').value = '';
  document.getElementById('stockCategory').value = 'Building Materials';
  document.getElementById('stockSpecification').value = '';
  document.getElementById('stockQty').value = '';
  document.getElementById('stockUnit').value = 'pcs';
  document.getElementById('stockPrice').value = '';
  document.getElementById('stockMinLevel').value = '10';
  document.getElementById('stockLocation').value = '';
  document.getElementById('stockNotes').value = '';
  document.getElementById('stockEntryStatus').className = 'status-msg';
  document.getElementById('stockEntryStatus').textContent = '';
  showModal('stockEntryModal');
}

async function submitStockEntry() {
  const statusDiv = document.getElementById('stockEntryStatus');
  const itemName = document.getElementById('stockItemName').value.trim();
  const quantity = parseFloat(document.getElementById('stockQty').value) || 0;
  
  if (!itemName) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Item name ni lazima.';
    return;
  }
  if (quantity < 0) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Quantity haiwezi kuwa hasi.';
    return;
  }

  const submitBtn = document.querySelector('#stockEntryModal button[onclick="submitStockEntry()"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Saving...';

  try {
    await API.addStockItem({
      itemName,
      category: document.getElementById('stockCategory').value,
      specification: document.getElementById('stockSpecification').value.trim() || null,
      quantity,
      unit: document.getElementById('stockUnit').value,
      unitPrice: parseFloat(document.getElementById('stockPrice').value) || 0,
      minStockLevel: parseFloat(document.getElementById('stockMinLevel').value) || 10,
      location: document.getElementById('stockLocation').value.trim() || null,
      notes: document.getElementById('stockNotes').value.trim() || null
    });
    
    showToast('✅ Stock imeongezwa!', 'success');
    closeModal('stockEntryModal');
    loadStockItems();
  } catch (err) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ ' + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// ================================================================
// MODAL: ISSUE STOCK
// ================================================================
function openStockIssueModal(stockItemId, itemName, availableQty) {
  document.getElementById('issueStockItemId').value = stockItemId;
  document.getElementById('issueStockItemName').textContent = itemName || '—';
  document.getElementById('issueStockItemAvailable').textContent = 
    `Available: ${availableQty !== undefined ? availableQty : '—'}`;
  document.getElementById('issueStockQty').value = '';
  document.getElementById('issueStockDepartment').value = '';
  document.getElementById('issueStockIssuedTo').value = '';
  document.getElementById('issueStockNotes').value = '';
  document.getElementById('stockIssueStatus').className = 'status-msg';
  document.getElementById('stockIssueStatus').textContent = '';
  showModal('stockIssueModal');
}

async function submitStockIssue() {
  const statusDiv = document.getElementById('stockIssueStatus');
  const stockItemId = parseInt(document.getElementById('issueStockItemId').value);
  const quantity = parseFloat(document.getElementById('issueStockQty').value) || 0;
  const department = document.getElementById('issueStockDepartment').value;
  const issuedTo = document.getElementById('issueStockIssuedTo').value.trim();
  const notes = document.getElementById('issueStockNotes').value.trim();

  if (!quantity || quantity <= 0) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Quantity lazima iwe zaidi ya 0.';
    return;
  }
  if (!department) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Chagua department.';
    return;
  }

  const submitBtn = document.querySelector('#stockIssueModal button[onclick="submitStockIssue()"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Issuing...';

  try {
    await API.stockOut({
      stockItemId,
      quantity,
      department,
      issuedTo: issuedTo || null,
      notes
    });
    
    showToast('✅ Stock imetolewa!', 'success');
    closeModal('stockIssueModal');
    loadStockItems();
  } catch (err) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ ' + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// ================================================================
// MODAL: ADJUST STOCK
// ================================================================
function openStockAdjustModal(stockItemId, itemName, currentQty) {
  document.getElementById('adjustStockItemId').value = stockItemId;
  document.getElementById('adjustStockItemName').textContent = itemName || '—';
  document.getElementById('adjustCurrentQty').value = currentQty;
  document.getElementById('adjustNewQty').value = currentQty;
  document.getElementById('adjustReason').value = '';
  document.getElementById('adjustNotes').value = '';
  document.getElementById('stockAdjustStatus').className = 'status-msg';
  document.getElementById('stockAdjustStatus').textContent = '';
  document.getElementById('adjustDiffBox').style.display = 'none';

  // Listener for diff
  const newQtyInput = document.getElementById('adjustNewQty');
  newQtyInput.oninput = function() {
    const current = parseFloat(document.getElementById('adjustCurrentQty').value) || 0;
    const newQty = parseFloat(this.value) || 0;
    const diff = newQty - current;
    
    const diffBox = document.getElementById('adjustDiffBox');
    const diffValue = document.getElementById('adjustDiffValue');
    
    if (diff !== 0) {
      diffBox.style.display = 'block';
      diffValue.textContent = (diff > 0 ? '+' : '') + diff + ` (${diff > 0 ? 'increase' : 'decrease'})`;
      diffValue.style.color = diff > 0 ? 'var(--green)' : 'var(--red)';
    } else {
      diffBox.style.display = 'none';
    }
  };
  
  showModal('stockAdjustModal');
}

async function submitStockAdjust() {
  const statusDiv = document.getElementById('stockAdjustStatus');
  const stockItemId = parseInt(document.getElementById('adjustStockItemId').value);
  const newQuantity = parseFloat(document.getElementById('adjustNewQty').value);
  const reason = document.getElementById('adjustReason').value;
  const notes = document.getElementById('adjustNotes').value.trim();

  if (isNaN(newQuantity) || newQuantity < 0) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ New quantity lazima iwe namba >= 0.';
    return;
  }
  if (!reason) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ Chagua reason.';
    return;
  }

  const submitBtn = document.querySelector('#stockAdjustModal button[onclick="submitStockAdjust()"]');
  const originalHtml = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Adjusting...';

  try {
    const result = await API.adjustStockItem({
      stockItemId,
      newQuantity,
      reason,
      notes
    });
    
    showToast('✅ Adjustment imefanyika!', 'success');
    closeModal('stockAdjustModal');
    loadStockItems();
  } catch (err) {
    statusDiv.className = 'status-msg error';
    statusDiv.textContent = '⚠ ' + err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}
async function loadPendingReceives() {
    const tbody = document.getElementById('receiveTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;">⏳ Loading...</td></tr>`;

    try {
        const data = await API.getPendingReceives();
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;">✅ No pending stock to receive.</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(m => `
            <tr>
                <td>${new Date(m.created_at).toLocaleDateString()}</td>
                <td><strong>${m.reference}</strong></td>
                <td>${m.item_name}</td>
                <td>${m.quantity} ${m.item_unit}</td>
                <td>${m.performed_by}</td>
                <td><span class="status-badge pending">Pending Receive</span></td>
                <td><button class="action-btn green" onclick="confirmReceiveItem(${m.id})">✅ Confirm Receive</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">❌ ${err.message}</td></tr>`;
    }
}

async function confirmReceiveItem(id) {
    const res = await modernConfirm({
        title: '📥 Confirm Receive?',
        message: 'Je, una uhakika umepokea bidhaa hizi kikamilifu?',
        type: 'success',
        okText: '✅ Ndiyo, Nimepokea',
        cancelText: 'Cancel'
    });

    if (!res.confirmed) return;

    try {
        // Onyesha kitufe kimebonyezwa
        const btn = document.querySelector(`button[onclick="confirmReceiveItem(${id})"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '⏳ Receiving...';
        }

        await API.confirmReceive(id);
        showToast('✅ Bidhaa zimepokelewa kikamilifu!', 'success');
        
        // Refresh table
        loadPendingReceives();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        
        // Rudisha kitufe kama kilikuwa
        const btn = document.querySelector(`button[onclick="confirmReceiveItem(${id})"]`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '✅ Confirm Receive';
        }
    }
}
// ================================================================
// 1. RENDER TABLE (Badala ya Kadi)
// ================================================================
// Futa renderStockCard na uweke hii badala yake (iite kwenye loadStockItems)
function renderStockTableRows(filteredItems) {
    const tbody = document.getElementById('stockTableBody');
    if (filteredItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No items found.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredItems.map(item => {
        const qty = Number(item.quantity || 0);
        const min = Number(item.min_stock_level || 10);
        
        let badge = '<span style="background:rgba(34,197,94,0.1);color:#16a34a;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">✅ In Stock</span>';
        if (qty === 0) {
            badge = '<span style="background:rgba(239,68,68,0.1);color:#dc2626;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">❌ Out of Stock</span>';
        } else if (qty <= min) {
            badge = '<span style="background:rgba(245,158,11,0.1);color:#d97706;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">⚠️ Low Stock</span>';
        }

        return `
            <tr style="border-bottom:1px solid var(--gray-100);">
                <td style="padding:14px;">
                    <div style="font-weight:800; color:var(--primary); font-size:14px;">${esc(item.item_name)}</div>
                    <div style="font-size:11px; color:var(--gray-500); font-family:monospace;">${esc(item.item_code || 'No Code')} • ${esc(item.specification || 'No Spec')}</div>
                </td>
                <td style="padding:14px; font-size:12px; font-weight:600; color:var(--gray-700);">${esc(item.category || 'General')}</td>
                <td style="padding:14px; text-align:center;">
                    <div style="font-size:16px; font-weight:900; color:${qty === 0 ? 'var(--red)' : (qty <= min ? 'var(--orange)' : 'var(--primary)')};">${qty}</div>
                    <div style="font-size:10px; color:var(--gray-500); text-transform:uppercase;">${esc(item.unit || 'pcs')}</div>
                </td>
                <td style="padding:14px; text-align:right; font-weight:700; font-size:13px; color:var(--gray-800);">TSh ${Number(item.unit_price || 0).toLocaleString()}</td>
                <td style="padding:14px; text-align:center;">${badge}</td>
                <td style="padding:14px; text-align:center;">
                <div class="action-dropdown" id="dropdown-stock-${item.id}">
                    <button class="action-dropdown-btn" onclick="toggleActionDropdown(event, 'stock-${item.id}')">⋯</button>
                    <div class="action-dropdown-content">
                        <button onclick="openStockIssueModal(${item.id}, '${esc(item.item_name)}', ${qty})">📤 Issue to Dept</button>
                        <button onclick="openStockAdjustModal(${item.id}, '${esc(item.item_name)}', ${qty})">🔧 Adjust Stock</button>
                        <button onclick="openItemHistory(${item.id}, '${esc(item.item_name)}')">👁️ View Vouchers / History</button>
                    </div>
                </div>
            </td>
            </tr>
        `;
    }).join('');
}

// ================================================================
// 2. FOMU YA STOCK OUT NA HISTORY YAKE
// ================================================================
// Futa submitStockOutForm ya awali na uweke hii:
async function submitStockOutForm() {
    const statusDiv = document.getElementById('so_status');
    const stockItemId = document.getElementById('so_stockItemId').value;
    const quantity = parseFloat(document.getElementById('so_quantity').value) || 0;
    const department = document.getElementById('so_department').value;
    const issuedTo = document.getElementById('so_issuedTo').value.trim();
    const notes = document.getElementById('so_notes').value.trim();

    if (!stockItemId || quantity <= 0 || !department || !issuedTo) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ Jaza sehemu zote zilizo na alama nyekundu (*).';
        return;
    }

    const btn = document.querySelector('#sub-stock-out button[onclick="submitStockOutForm()"]');
    btn.disabled = true;
    btn.innerHTML = '⏳ Issuing...';

    try {
        const res = await API.stockOut({ stockItemId, quantity, department, issuedTo, notes });
        showToast('✅ Stock imetolewa!', 'success');
        
        // Print Voucher Mpya
        printIssueVoucher(res.movement); 

        // Safisha form
        document.getElementById('so_stockItemId').value = '';
        document.getElementById('so_quantity').value = '';
        document.getElementById('so_issuedTo').value = '';
        document.getElementById('so_notes').value = '';
        statusDiv.className = 'status-msg';

        loadStockItems(); 
        loadRecentStockOuts(); // Hii ita-update history upande wa kulia

    } catch (err) {
        statusDiv.className = 'status-msg error';
        statusDiv.textContent = '⚠ ' + err.message;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📤 Issue Item Now';
    }
}

// Load Recent Stock Outs (Kwa ajili ya upande wa kulia)
async function loadRecentStockOuts() {
    const container = document.getElementById('recentStockOutContainer');
    if (!container) return;
    
    try {
        const movements = await API.getStockMovements({ type: 'out', limit: 5 });
        if (movements.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--gray-400);font-size:13px;">No recent issues.</p>';
            return;
        }
        
        container.innerHTML = movements.map(m => `
            <div style="padding:12px; border:1px solid var(--gray-200); border-radius:8px; background:var(--gray-50); display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:800; font-size:13px; color:var(--primary);">${esc(m.item_name)}</div>
                    <div style="font-size:11px; color:var(--gray-600);">${esc(m.quantity)} ${esc(m.item_unit)} to <strong>${esc(m.department)}</strong></div>
                    <div style="font-size:10px; color:var(--gray-400); margin-top:2px;">${new Date(m.created_at).toLocaleString()}</div>
                </div>
                <button onclick='openVoucherModal(${JSON.stringify(m).replace(/'/g, "&#39;")})' style="padding:6px 10px; background:white; border:1px solid var(--gray-300); border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">
                    👁️ View
                </button>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = `<p style="color:red;">${err.message}</p>`;
    }
}
let currentVoucherData = null;

function openVoucherModal(movement) {
    currentVoucherData = movement;
    const isIn = movement.transaction_type === 'in';
    const isOut = movement.transaction_type === 'out';
    
    // Set Header
    document.getElementById('voucherTitle').textContent = isIn ? 'Goods Received Note (GRN)' : 'Store Issue Voucher (SIV)';
    document.getElementById('voucherSubtitle').textContent = movement.reference || movement.movement_number;
    document.getElementById('voucherIcon').textContent = isIn ? '📥' : '📤';

    // Set Body
    const body = document.getElementById('voucherContent');
    body.innerHTML = `
        <div style="text-align:center; margin-bottom: 25px; border-bottom: 2px dashed var(--gray-300); padding-bottom: 20px;">
            <h1 style="margin:0; font-size: 26px; color: var(--primary); letter-spacing: 1px;">MAK DC INVESTMENT</h1>
            <p style="margin:5px 0 0 0; font-size: 13px; color: var(--gray-500);">Procurement & Store Department</p>
            <div style="display:inline-block; margin-top: 12px; background: var(--gold); color: var(--primary-dark); padding: 4px 16px; border-radius: 20px; font-weight: 800; font-size: 14px;">
                ${isIn ? 'GOODS RECEIVED NOTE' : 'STORE ISSUE VOUCHER'}
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom: 25px;">
            <div style="background:white; padding: 15px; border-radius: 10px; border: 1px solid var(--gray-200);">
                <div style="font-size:10px; font-weight:800; color:var(--gray-400); text-transform:uppercase; margin-bottom:5px;">Voucher Number</div>
                <div style="font-size:15px; font-weight:900; color:var(--primary); font-family:monospace;">${movement.reference || 'N/A'}</div>
            </div>
            <div style="background:white; padding: 15px; border-radius: 10px; border: 1px solid var(--gray-200);">
                <div style="font-size:10px; font-weight:800; color:var(--gray-400); text-transform:uppercase; margin-bottom:5px;">Date & Time</div>
                <div style="font-size:14px; font-weight:700;">${new Date(movement.created_at).toLocaleString()}</div>
            </div>
        </div>

        <div style="background: white; border: 1px solid var(--gray-200); border-radius: 10px; overflow: hidden; margin-bottom: 25px;">
            <table style="width:100%; border-collapse: collapse; font-size: 13px;">
                <thead style="background:var(--gray-50); border-bottom:2px solid var(--gray-200);">
                    <tr>
                        <th style="padding:12px; text-align:left; color:var(--gray-600);">Item Description</th>
                        <th style="padding:12px; text-align:center; color:var(--gray-600);">Quantity</th>
                        <th style="padding:12px; text-align:right; color:var(--gray-600);">Balance</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding:15px;">
                            <div style="font-weight:800; color:var(--primary);">${esc(movement.item_name)}</div>
                            <div style="font-size:11px; color:var(--gray-500);">${esc(movement.item_code || '')}</div>
                        </td>
                        <td style="padding:15px; text-align:center; font-size:16px; font-weight:800; color:${isIn ? 'var(--green)' : 'var(--red)'};">
                            ${isIn ? '+' : '-'}${movement.quantity} ${esc(movement.item_unit)}
                        </td>
                        <td style="padding:15px; text-align:right; font-weight:700; color:var(--gray-600);">
                            ${movement.balance_before} → ${movement.balance_after}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom: 30px;">
            <div style="background: var(--gray-50); padding: 15px; border-radius: 10px;">
                <div style="font-size:10px; font-weight:800; color:var(--gray-400); text-transform:uppercase; margin-bottom:8px;">${isIn ? 'Received From' : 'Issued To'}</div>
                <div style="font-size:14px; font-weight:700;">${isIn ? (movement.department || 'Supplier') : (movement.issued_to || 'Department')}</div>
            </div>
            <div style="background: var(--gray-50); padding: 15px; border-radius: 10px;">
                <div style="font-size:10px; font-weight:800; color:var(--gray-400); text-transform:uppercase; margin-bottom:8px;">${isIn ? 'Received By' : 'Issued By'}</div>
                <div style="font-size:14px; font-weight:700;">${movement.performed_by}</div>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <div style="font-size:10px; font-weight:800; color:var(--gray-400); text-transform:uppercase; margin-bottom:5px;">Notes / Purpose</div>
            <div style="font-size:13px; color:var(--gray-700); background: var(--gray-50); padding: 12px; border-radius: 8px;">${movement.reason || 'No additional notes.'}</div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top: 50px;">
            <div style="width:45%; border-top: 1px solid var(--gray-400); padding-top: 10px; text-align:center; font-size:12px; font-weight:700; color:var(--gray-500);">
                Authorized Signature
            </div>
            <div style="width:45%; border-top: 1px solid var(--gray-400); padding-top: 10px; text-align:center; font-size:12px; font-weight:700; color:var(--gray-500);">
                ${isIn ? 'Supplier / Deliverer Signature' : 'Receiver Signature'}
            </div>
        </div>
    `;

    showModal('viewVoucherModal');
}
function printCurrentVoucher() {
    if (!currentVoucherData) return;
    const content = document.getElementById('voucherContent').innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=800');
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Voucher - ${currentVoucherData.reference}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 10px; }
                .status-badge { background: #f1f5f9; color: #333; padding: 4px 10px; border-radius: 10px; font-size: 12px; }
            </style>
        </head>
        <body>${content}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}
async function openItemHistory(itemId, itemName) {
    // 1. Onyesha Modal ya loading kwanza
    document.getElementById('voucherTitle').textContent = `History: ${itemName}`;
    document.getElementById('voucherSubtitle').textContent = `All In/Out Movements`;
    document.getElementById('voucherIcon').textContent = '📜';
    document.getElementById('voucherContent').innerHTML = '<p style="text-align:center;padding:30px;">⏳ Loading history...</p>';
    
    // 2. Badilisha kitufe cha Print kuwa "Close" kwa muda
    const footer = document.querySelector('#viewVoucherModal .modal-footer');
    footer.innerHTML = `<button onclick="closeModal('viewVoucherModal')" style="padding:10px 20px;background:var(--gray-100);color:var(--gray-700);border:none;border-radius:8px;font-weight:700;cursor:pointer;">Close</button>`;
    
    showModal('viewVoucherModal');

    // 3. Pata data
    try {
        const movements = await API.getStockMovements({ stockItemId: itemId, limit: 50 });
        
        if (movements.length === 0) {
            document.getElementById('voucherContent').innerHTML = '<p style="text-align:center;padding:30px;color:var(--gray-500);">No movements found for this item.</p>';
            return;
        }

        // 4. Jenga table ya history
        let html = `
            <div style="background:white; border:1px solid var(--gray-200); border-radius:10px; overflow:hidden;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead style="background:var(--gray-50); border-bottom:2px solid var(--gray-200);">
                        <tr>
                            <th style="padding:12px; text-align:left;">Date</th>
                            <th style="padding:12px; text-align:left;">Voucher No.</th>
                            <th style="padding:12px; text-align:center;">Type</th>
                            <th style="padding:12px; text-align:center;">Qty</th>
                            <th style="padding:12px; text-align:right;">Balance</th>
                            <th style="padding:12px; text-align:center;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        movements.forEach(m => {
            const isIn = ['in', 'return', 'production-in'].includes(m.transaction_type);
            const typeColor = isIn ? 'var(--green)' : (m.transaction_type === 'adjustment' ? 'var(--blue)' : 'var(--red)');
            const typeSign = isIn ? '+' : (m.transaction_type === 'adjustment' ? '' : '-');
            
            html += `
                <tr style="border-bottom:1px solid var(--gray-100);">
                    <td style="padding:12px;">${new Date(m.created_at).toLocaleDateString()}</td>
                    <td style="padding:12px; font-family:monospace; font-weight:700;">${m.reference || m.movement_number}</td>
                    <td style="padding:12px; text-align:center; font-weight:800; color:${typeColor};">${m.transaction_type.toUpperCase()}</td>
                    <td style="padding:12px; text-align:center; font-weight:800; color:${typeColor};">${typeSign}${m.quantity}</td>
                    <td style="padding:12px; text-align:right; color:var(--gray-600);">${m.balance_before} → ${m.balance_after}</td>
                    <td style="padding:12px; text-align:center;">
                        <button onclick='openVoucherModal(${JSON.stringify(m).replace(/'/g, "&#39;")})' style="padding:4px 10px; background:var(--gray-200); border:none; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer;">View Voucher</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
        document.getElementById('voucherContent').innerHTML = html;

    } catch (err) {
        document.getElementById('voucherContent').innerHTML = `<p style="color:red; text-align:center; padding:30px;">❌ ${err.message}</p>`;
    }
}
// ================================================================
// 3. VOUCHER MPYA (KISASA)
// ================================================================
function printIssueVoucher(m) {
    const printWindow = window.open('', '_blank', 'width=800,height=700');
    printWindow.document.write(`
        <html>
        <head>
            <title>Issue Voucher - ${m.reference || m.movement_number}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
                .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #022908; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { width: 80px; height: 80px; border-radius: 50%; border: 2px solid #f59e0b; }
                .company-info h1 { margin: 0; font-size: 24px; color: #022908; text-transform: uppercase; letter-spacing: 1px; }
                .company-info p { margin: 4px 0; font-size: 13px; color: #666; font-weight: 600; }
                .voucher-title { text-align: center; margin-bottom: 30px; }
                .voucher-title h2 { margin: 0; font-size: 22px; color: #f59e0b; letter-spacing: 2px; text-transform: uppercase; }
                .voucher-title span { font-size: 14px; font-weight: 800; color: #333; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-top: 8px; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
                .info-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; background: #f8fafc; }
                .info-box h4 { margin: 0 0 12px 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                .info-row span:first-child { color: #64748b; font-weight: 600; }
                .info-row span:last-child { font-weight: 800; color: #1e293b; }
                .item-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
                .item-table th, .item-table td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
                .item-table th { background: #022908; color: white; text-transform: uppercase; font-size: 12px; }
                .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
                .sig-box { width: 45%; border-top: 2px solid #022908; padding-top: 10px; text-align: center; font-size: 13px; font-weight: 700; color: #333; }
                .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 50px; border-top: 1px dashed #e2e8f0; padding-top: 15px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="http://127.0.0.1:5500/frontend/assets/makdc-logo.jpg" class="logo" onerror="this.style.display='none'">
                    <div class="company-info">
                        <h1>MAK DC INVESTMENT</h1>
                        <p>Procurement & Store Department</p>
                        <p>www.makdc.co.tz | info@makdc.co.tz</p>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px; color:#64748b; font-weight:600;">DATE</div>
                    <div style="font-size:14px; font-weight:800;">${new Date(m.created_at || Date.now()).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</div>
                </div>
            </div>

            <div class="voucher-title">
                <h2>Stock Issue Voucher</h2>
                <span>${m.reference || 'N/A'}</span>
            </div>

            <div class="details-grid">
                <div class="info-box">
                    <h4>Issue Details</h4>
                    <div class="info-row"><span>Issued To:</span> <span>${m.issued_to || '—'}</span></div>
                    <div class="info-row"><span>Department:</span> <span>${m.department || '—'}</span></div>
                    <div class="info-row"><span>Issued By:</span> <span>${m.performed_by || '—'}</span></div>
                </div>
                <div class="info-box">
                    <h4>Reference</h4>
                    <div class="info-row"><span>Movement #:</span> <span>${m.movement_number || '—'}</span></div>
                    <div class="info-row"><span>Status:</span> <span style="color:#16a34a;">ISSUED</span></div>
                    <div class="info-row"><span>Time:</span> <span>${new Date(m.created_at || Date.now()).toLocaleTimeString()}</span></div>
                </div>
            </div>

            <table class="item-table">
                <thead>
                    <tr>
                        <th>Item Description</th>
                        <th style="text-align:center;">Quantity</th>
                        <th style="text-align:center;">Unit</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>${m.item_name}</strong></td>
                        <td style="text-align:center; font-weight:800; font-size:16px;">${m.quantity}</td>
                        <td style="text-align:center;">${m.item_unit || 'pcs'}</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-bottom: 20px;">
                <div style="font-size:12px; color:#64748b; font-weight:600; text-transform:uppercase; margin-bottom:5px;">Notes / Purpose</div>
                <div style="font-size:14px; color:#1e293b; background:#f8fafc; padding:15px; border-radius:8px; border:1px solid #e2e8f0;">
                    ${m.reason || 'No additional notes.'}
                </div>
            </div>

            <div class="signatures">
                <div class="sig-box">
                    <br><br><br>
                    Store Officer Signature
                </div>
                <div class="sig-box">
                    <br><br><br>
                    Receiver Signature
                </div>
            </div>

            <div class="footer">
                This is a computer-generated document. No signature is required if printed directly from the system.<br>
                Generated by MAK DC Procurement & Store System
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
}
async function loadPendingReceives() {
    const tbody = document.getElementById('receiveTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;">⏳ Loading...</td></tr>`;

    try {
        const data = await API.getPendingReceives();
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;">✅ No pending stock to receive.</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(m => `
            <tr>
                <td>${new Date(m.created_at).toLocaleDateString()}</td>
                <td><strong>${m.reference}</strong></td>
                <td>${m.item_name}</td>
                <td>${m.quantity} ${m.item_unit}</td>
                <td>${m.performed_by}</td>
                <td><span class="status-badge pending">Pending Receive</span></td>
                <td><button class="action-btn green" onclick="confirmReceiveItem(${m.id})">✅ Confirm Receive</button></td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">❌ ${err.message}</td></tr>`;
    }
}
// ================================================================
// ASSETS MODULE
// ================================================================
let assetSearchTimeout = null;
let currentAssets = [];

async function loadAssets() {
    const tbody = document.getElementById('assetsTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">⏳ Loading data...</td></tr>`;

    const category = document.getElementById('assetFilterCategory')?.value || '';
    const status = document.getElementById('assetFilterStatus')?.value || '';
    const search = document.getElementById('assetSearchInput')?.value || '';

    try {
        // Tunachukua assets na stats kwa mpigo
        const [assets, stats] = await Promise.all([
            API.getAssets({ category, status, search }),
            API.getAssetStats().catch(() => null)
        ]);

        currentAssets = Array.isArray(assets) ? assets : [];
        
        // Sasisha namba ya badge
        const countBadge = document.getElementById('assetsCount');
        if (countBadge) countBadge.textContent = currentAssets.length;

        // Render Stats Cards
        if (stats) {
            document.getElementById('assetStatsGrid').innerHTML = `
                <div class="stat-card"><div class="stat-icon">🏷️</div><div class="stat-number">${stats.total ?? 0}</div><div class="stat-label">Total Assets</div></div>
                <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-number">${stats.active ?? 0}</div><div class="stat-label">Active</div></div>
                <div class="stat-card"><div class="stat-icon">🔧</div><div class="stat-number">${stats.inMaintenance ?? 0}</div><div class="stat-label">In Maintenance</div></div>
                <div class="stat-card"><div class="stat-icon">💰</div><div class="stat-number">TSh ${Number(stats.totalCurrentValue ?? 0).toLocaleString()}</div><div class="stat-label">Total Value</div></div>
            `;
        }

        if (currentAssets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No assets found.</td></tr>`;
            return;
        }

        // Render Table Rows
        tbody.innerHTML = currentAssets.map(a => {
            let badge = '<span style="background:rgba(34,197,94,0.1);color:#16a34a;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">✅ Active</span>';
            if (a.status === 'In Maintenance') {
                badge = '<span style="background:rgba(245,158,11,0.1);color:#d97706;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">🔧 Maintenance</span>';
            } else if (a.status === 'Retired' || a.status === 'Disposed') {
                badge = '<span style="background:rgba(239,68,68,0.1);color:#dc2626;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">❌ ' + a.status + '</span>';
            }
            return `
                <tr style="border-bottom:1px solid var(--gray-100);">
                    <td style="padding:14px;">
                        <div style="font-weight:800; color:var(--primary); font-size:14px;">${esc(a.name)}</div>
                        <div style="font-size:11px; color:var(--gray-500); font-family:monospace;">${esc(a.asset_tag)} • ${esc(a.serial_number || 'No Serial')}</div>
                    </td>
                    <td style="padding:14px; font-size:12px; font-weight:600; color:var(--gray-700);">${esc(a.category)}</td>
                    <td style="padding:14px;">
                        <div style="font-size:12px; font-weight:700; color:var(--gray-700);">${esc(a.custodian_name || 'Unassigned')}</div>
                        <div style="font-size:11px; color:var(--gray-500);">${esc(a.location || '—')}</div>
                    </td>
                    <td style="padding:14px; text-align:right; font-weight:800; font-size:13px; color:var(--primary);">
                        TSh ${Number(a.current_value || 0).toLocaleString()}
                    </td>
                    <td style="padding:14px; text-align:center;">${badge}</td>
                    <td style="padding:14px; text-align:center;">
                        <div class="action-dropdown" id="dropdown-asset-${a.id}">
                            <button class="action-dropdown-btn" onclick="toggleActionDropdown(event, 'asset-${a.id}')">⋯</button>
                            <div class="action-dropdown-content">
                                <button onclick="viewAssetDetail(${a.id})">👁️ View Details</button>
                                <button onclick="openAssetHistory(${a.id}, '${esc(a.name).replace(/'/g, "\\'")}')">📊 View Maintenance Cost</button>
                                <button onclick="openAssetModal(${a.id})">🖊️ Edit Asset</button>
                                <button onclick="openMaintenanceModal(${a.id}, '${esc(a.name).replace(/'/g, "\\'")}')">🔧 Add Maintenance</button>
                                <button class="text-red" onclick="retireAssetPrompt(${a.id})">🗑️ Retire Asset</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('loadAssets error:', err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--red);">❌ ${esc(err.message)}</td></tr>`;
    }
}
function debounceLoadAssets() {
    clearTimeout(assetSearchTimeout);
    assetSearchTimeout = setTimeout(loadAssets, 400);
}
async function viewAssetDetail(id) {
    try {
        const asset = await API.getAsset(id);
        
        document.getElementById('va_title').textContent = asset.name;
        document.getElementById('va_tag').textContent = asset.asset_tag;
        
        // QR Code
        const qrImg = document.getElementById('va_qr');
        if (asset.qr_code) {
            qrImg.src = asset.qr_code;
        } else {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${asset.asset_tag}`;
        }

        // Status Badge
        const statusEl = document.getElementById('va_status');
        statusEl.textContent = asset.status;
        if (asset.status === 'Active') {
            statusEl.style.background = '#dcfce7'; statusEl.style.color = '#166534';
        } else if (asset.status === 'In Maintenance') {
            statusEl.style.background = '#fef3c7'; statusEl.style.color = '#92400e';
        } else {
            statusEl.style.background = '#fee2e2'; statusEl.style.color = '#991b1b';
        }

        // Details
        document.getElementById('va_category').textContent = asset.category || '—';
        document.getElementById('va_serial').textContent = asset.serial_number || '—';
        document.getElementById('va_location').textContent = asset.location || '—';
        document.getElementById('va_custodian').textContent = asset.custodian_name || '—';
        
        document.getElementById('va_current_value').textContent = `TSh ${Number(asset.current_value || 0).toLocaleString()}`;
        document.getElementById('va_purchase_value').textContent = `TSh ${Number(asset.purchase_value || 0).toLocaleString()}`;
        
        document.getElementById('va_description').textContent = asset.description || asset.notes || 'No description provided.';

        showModal('viewAssetModal');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
function printAssetDetails() {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    const tag = document.getElementById('va_tag').textContent;
    const name = document.getElementById('va_title').textContent;
    const qr = document.getElementById('va_qr').src;
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Asset Label - ${tag}</title>
            <style>
                body { font-family: Arial; text-align: center; padding: 20px; }
                .label { border: 2px dashed #333; padding: 20px; width: 300px; margin: 0 auto; border-radius: 10px; }
                .qr { width: 150px; height: 150px; margin-bottom: 10px; }
                h2 { margin: 0; font-size: 18px; }
                h3 { margin: 5px 0; font-size: 14px; color: #555; }
                p { margin: 5px 0; font-size: 12px; font-weight: bold; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="label">
                <img src="${qr}" class="qr">
                <h2>${name}</h2>
                <h3>${tag}</h3>
                <p>MAK DC INVESTMENT CO. LTD</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}// ================================================================
// ASSET MODAL: ADD / EDIT
// ================================================================
function openAssetModal(id = null) {
    // Safisha fomu
    document.getElementById('asset_id').value = id || '';
    document.getElementById('asset_name').value = '';
    document.getElementById('asset_category').value = 'Equipment';
    document.getElementById('asset_serial').value = '';
    document.getElementById('asset_pdate').value = new Date().toISOString().split('T')[0];
    document.getElementById('asset_value').value = '';
    document.getElementById('asset_life').value = '5';
    document.getElementById('asset_location').value = '';
    document.getElementById('asset_custodian').value = '';
    document.getElementById('asset_notes').value = '';
    document.getElementById('asset_error').style.display = 'none';

    if (id) {
        // Kama ni Edit, tafuta asset kwenye `currentAssets` (tuliipatia data kwenye loadAssets)
        document.getElementById('assetModalTitle').textContent = '🖊️ Edit Asset';
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
        document.getElementById('assetModalTitle').textContent = '📝 Add New Asset';
    }

    showModal('assetModal');
}
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
            showToast('✅ Asset created with QR Code!', 'success');
        }
        closeModal('assetModal');
        loadAssets(); // Refresh table
    } catch (err) {
        errDiv.textContent = '❌ ' + err.message;
        errDiv.style.display = 'block';
    } finally {
        btn.innerHTML = '💾 Save Asset';
        btn.disabled = false;
    }
}
// ================================================================
// MAINTENANCE & RETIRE LOGIC
// ================================================================

// 1. Open Maintenance Modal
function openMaintenanceModal(assetId, assetName) {
    document.getElementById('mt_assetId').value = assetId;
    document.getElementById('mt_assetName').textContent = assetName || '—';
    document.getElementById('mt_type').value = 'routine';
    document.getElementById('mt_status').value = 'pending';
    document.getElementById('mt_desc').value = '';
    document.getElementById('mt_cost').value = '';
    document.getElementById('mt_performedBy').value = '';
    document.getElementById('mt_error').style.display = 'none';
    showModal('maintenanceModal');
}

// 2. Submit Maintenance
async function submitMaintenance() {
    const id = document.getElementById('mt_assetId').value;
    const desc = document.getElementById('mt_desc').value.trim();
    const errDiv = document.getElementById('mt_error');

    if (!desc) {
        errDiv.textContent = '⚠️ Description ni lazima!';
        errDiv.style.display = 'block';
        return;
    }

    const data = {
        type: document.getElementById('mt_type').value,
        status: document.getElementById('mt_status').value,
        description: desc,
        cost: parseFloat(document.getElementById('mt_cost').value) || 0,
        performedBy: document.getElementById('mt_performedBy').value.trim()
    };

    const btn = document.querySelector('#maintenanceModal button[onclick="submitMaintenance()"]');
    btn.innerHTML = '⏳ Saving...';
    btn.disabled = true;

    try {
        await API.createAssetMaintenance(id, data);
        showToast('✅ Maintenance imerekodiwa!', 'success');
        closeModal('maintenanceModal');
        loadAssets(); // Refresh table ya Assets
        loadMaintenanceLog(); // Refresh table ya Maintenance
    } catch (err) {
        errDiv.textContent = '❌ ' + err.message;
        errDiv.style.display = 'block';
    } finally {
        btn.innerHTML = '💾 Save Maintenance';
        btn.disabled = false;
    }
}

// 3. Retire Asset
async function retireAssetPrompt(id) {
    const res = await modernConfirm({
        title: '🗑️ Retire Asset?',
        message: 'Una uhakika unataka kustaafisha asset hii? Haitaonekana kwenye orodha ya assets zinazotumika.',
        type: 'danger',
        okText: '🗑️ Retire',
        needsReason: true,
        reasonLabel: 'Sababu ya kustaafisha'
    });
    if (!res.confirmed) return;

    try {
        await API.retireAsset(id, { reason: res.reason });
        showToast('✅ Asset imestaafishwa!', 'success');
        loadAssets();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// 4. Load Maintenance Log
async function loadMaintenanceLog() {
    const tbody = document.getElementById('maintenanceTableBody');
    const statsGrid = document.getElementById('maintenanceStatsGrid');
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;">⏳ Loading...</td></tr>`;
    
    try {
        // 1. Pata Ripoti ya Jumla (Summary)
        const summary = await API.getMaintenanceSummary();
        
        statsGrid.innerHTML = `
            <div class="stat-card" style="border-left:4px solid var(--red);">
                <div class="stat-icon">💰</div>
                <div class="stat-number" style="color:var(--red);">TSh ${Number(summary.totalCost).toLocaleString()}</div>
                <div class="stat-label">Total Repair Costs</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--blue);">
                <div class="stat-icon">🛠️</div>
                <div class="stat-number" style="color:var(--blue);">${summary.topAssets.reduce((sum, a) => sum + Number(a.repair_count), 0)}</div>
                <div class="stat-label">Total Repairs Done</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--orange);">
                <div class="stat-icon">🏷️</div>
                <div class="stat-number" style="color:var(--orange); font-size:16px;">${summary.topAssets[0] ? summary.topAssets[0].name : '—'}</div>
                <div class="stat-label">Most Expensive Asset</div>
            </div>
        `;

        // 2. Pata orodha yote ya matengenezo
        const logs = await API.getAllMaintenance();
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">📭 No maintenance logs.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            let badge = '<span style="background:rgba(245,158,11,0.1);color:#d97706;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">⏳ Pending</span>';
            if (l.status === 'in-progress') badge = '<span style="background:rgba(59,130,246,0.1);color:#2563eb;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">⚙️ In Progress</span>';
            if (l.status === 'completed') badge = '<span style="background:rgba(34,197,94,0.1);color:#16a34a;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">✅ Completed</span>';

            return `
                <tr style="border-bottom:1px solid var(--gray-100); cursor:pointer;" onclick="openAssetHistory(${l.asset_id}, '${esc(l.asset_name).replace(/'/g, "\\'")}')">
                    <td style="padding:14px; font-size:11px;">${new Date(l.created_at).toLocaleDateString()}</td>
                    <td style="padding:14px;">
                        <div style="font-weight:800; color:var(--primary); font-size:13px;">${esc(l.asset_name)}</div>
                        <div style="font-size:10px; color:var(--gray-500);">${esc(l.asset_tag)}</div>
                    </td>
                    <td style="padding:14px; font-size:12px; text-transform:capitalize;">${esc(l.type)}</td>
                    <td style="padding:14px; font-size:12px;">${esc(l.description)}</td>
                    <td style="padding:14px; font-weight:800; color:var(--red);">TSh ${Number(l.cost || 0).toLocaleString()}</td>
                    <td style="padding:14px;">${badge}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--red);">❌ ${esc(err.message)}</td></tr>`;
    }
}
async function openAssetHistory(assetId, assetName) {
    document.getElementById('ah_assetName').textContent = assetName;
    document.getElementById('ah_totalCost').textContent = 'TSh 0';
    document.getElementById('ah_totalRepairs').textContent = '0';
    document.getElementById('ah_historyList').innerHTML = '<p style="text-align:center;padding:20px;">⏳ Loading...</p>';
    
    showModal('assetHistoryModal');

    try {
        const data = await API.getAssetMaintenanceHistory(assetId);
        
        // Update Summary
        document.getElementById('ah_totalCost').textContent = `TSh ${Number(data.summary.totalCost).toLocaleString()}`;
        document.getElementById('ah_totalRepairs').textContent = data.summary.totalRepairs;

        // Render History List
        const list = document.getElementById('ah_historyList');
        if (data.history.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--gray-500);">No maintenance history for this asset.</p>';
            return;
        }

        list.innerHTML = data.history.map(h => `
            <div style="border:1px solid var(--gray-200); border-radius:10px; padding:12px; background:white;">
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <strong style="font-size:13px; text-transform:capitalize;">${esc(h.type)}</strong>
                    <span style="font-size:11px; font-weight:800; color:var(--red);">TSh ${Number(h.cost || 0).toLocaleString()}</span>
                </div>
                <div style="font-size:12px; color:var(--gray-600); margin-bottom:8px;">${esc(h.description)}</div>
                <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--gray-400);">
                    <span>Performed by: ${esc(h.performed_by || 'N/A')}</span>
                    <span>${new Date(h.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');

    } catch (err) {
        document.getElementById('ah_historyList').innerHTML = `<p style="color:red;">❌ ${err.message}</p>`;
    }
}
// ================================================================
// 🆕 PRINT MAINTENANCE REPORTS TO PDF
// ================================================================

// 1. Print Ripoti ya Jumla (Maintenance Log)
async function printMaintenanceReport() {
    try {
        const logs = await API.getAllMaintenance();
        if (!logs || logs.length === 0) {
            showToast('Hakuna kumbukumbu za matengenezo.', 'warning');
            return;
        }

        // Tengeneza HTML ya Ripoti
        let html = `
            <html>
            <head>
                <title>Maintenance Report - MAK DC</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                    .header { text-align: center; border-bottom: 3px solid #022908; padding-bottom: 15px; margin-bottom: 25px; }
                    .header h1 { margin: 0; font-size: 22px; color: #022908; }
                    .header p { margin: 5px 0; font-size: 13px; color: #666; }
                    .meta { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 20px; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                    th { background: #f1f5f9; color: #022908; text-transform: uppercase; font-size: 11px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
                    .total-box { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>MAK DC INVESTMENT COMPANY LTD</h1>
                    <p>Procurement & Store Department</p>
                    <h2 style="margin-top:15px; color:#022908;">MAINTENANCE REPORT</h2>
                </div>

                <div class="meta">
                    <div><strong>Date Generated:</strong> ${new Date().toLocaleString()}</div>
                    <div><strong>Generated By:</strong> ${Auth.getUser().fullName}</div>
                </div>

                <div class="total-box">
                    <div style="font-size: 12px; color: #666;">Total Maintenance Records</div>
                    <div style="font-size: 20px; font-weight: bold; color: #022908;">${logs.length} Records</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Asset Name</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th class="text-right">Cost (TSh)</th>
                            <th class="text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        logs.forEach(l => {
            html += `
                <tr>
                    <td>${new Date(l.created_at).toLocaleDateString()}</td>
                    <td>
                        <strong>${esc(l.asset_name)}</strong><br>
                        <span style="font-size:10px;color:#888;">${esc(l.asset_tag)}</span>
                    </td>
                    <td>${esc(l.type)}</td>
                    <td>${esc(l.description)}</td>
                    <td class="text-right">${Number(l.cost || 0).toLocaleString()}</td>
                    <td class="text-center">${(l.status || '').toUpperCase()}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div class="footer">
                    This is a computer-generated document. No signature required.<br>
                    MAK DC Investment Company LTD &copy; ${new Date().getFullYear()}
                </div>
            </body>
            </html>
        `;

        // Fungua dirisha la Print
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);

    } catch (err) {
        showToast('Imeshindikana kupata ripoti: ' + err.message, 'error');
    }
}

// 2. Print Historia ya Asset Moja
async function printAssetHistory() {
    const assetName = document.getElementById('ah_assetName').textContent;
    const totalCost = document.getElementById('ah_totalCost').textContent;
    const totalRepairs = document.getElementById('ah_totalRepairs').textContent;
    const historyList = document.getElementById('ah_historyList').innerHTML;

    if (totalRepairs === '0') {
        showToast('Hakuna historia ya matengenezo kwa asset hii.', 'warning');
        return;
    }

    // Tunachukua HTML iliyopo kwenye Modal na kuipamba vizuri kwa Print
    const html = `
        <html>
        <head>
            <title>Asset History - ${assetName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                .header { text-align: center; border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; font-size: 22px; color: #1e40af; }
                .header p { margin: 5px 0; font-size: 13px; color: #666; }
                .summary { display: flex; gap: 20px; margin-bottom: 25px; }
                .box { flex: 1; padding: 15px; border-radius: 8px; text-align: center; }
                .box-red { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
                .box-green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
                .box h3 { margin: 0 0 5px 0; font-size: 11px; text-transform: uppercase; }
                .box p { margin: 0; font-size: 20px; font-weight: bold; }
                .history-item { border: 1px solid #ddd; padding: 12px; border-radius: 8px; margin-bottom: 10px; page-break-inside: avoid; }
                .history-item strong { text-transform: uppercase; font-size: 12px; }
                .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>MAK DC INVESTMENT COMPANY LTD</h1>
                <p>Asset Maintenance History</p>
            </div>
            
            <h2 style="text-align:center; font-size:18px; color:#333;">${assetName}</h2>
            
            <div class="summary">
                <div class="box box-red">
                    <h3>Total Repair Cost</h3>
                    <p>${totalCost}</p>
                </div>
                <div class="box box-green">
                    <h3>Total Repairs</h3>
                    <p>${totalRepairs}</p>
                </div>
            </div>

            <div>
                ${historyList}
            </div>

            <div class="footer">
                This is a computer-generated document. No signature required.<br>
                MAK DC Investment Company LTD &copy; ${new Date().getFullYear()}
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=700');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}
// ================================================================
// TENDER MODULE
// ================================================================
let tenderSearchTimeout = null;
let currentTenders = [];

// 1. Load Tenders
async function loadTenders() {
    const tbody = document.getElementById('tendersTableBody');
    if (!tbody) return;
    
    const status = document.getElementById('tenderFilterStatus')?.value || '';
    const search = document.getElementById('tenderSearchInput')?.value || '';

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;">⏳ Loading...</td></tr>`;

    try {
        const [tenders, stats] = await Promise.all([
            API.getTenders({ status, search }),
            // Hapa unaweza kuongeza API call nyingine ya stats ikiwa una
            Promise.resolve(null) 
        ]);

        currentTenders = tenders;
        document.getElementById('tendersCount').textContent = tenders.length;

        // (Ikiwa una stats API, jenga kadi hapa)
        document.getElementById('tenderStatsGrid').innerHTML = `
            <div class="stat-card"><div class="stat-icon">📄</div><div class="stat-number">${tenders.length}</div><div class="stat-label">Total Tenders</div></div>
        `;

        if (tenders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--gray-400);">📭 Hakuna tender zilizopatikana.</td></tr>`;
            return;
        }

        tbody.innerHTML = tenders.map(t => {
            let badge = '<span style="background:rgba(59,130,246,0.1);color:#2563eb;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">📥 Incoming</span>';
            if (t.status === 'won') badge = '<span style="background:rgba(34,197,94,0.1);color:#16a34a;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">🏆 Won</span>';
            else if (t.status === 'lost') badge = '<span style="background:rgba(239,68,68,0.1);color:#dc2626;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">❌ Lost</span>';
            else if (t.status === 'submitted') badge = '<span style="background:rgba(245,158,11,0.1);color:#d97706;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;">📤 Submitted</span>';

            return `
                <tr style="border-bottom:1px solid var(--gray-100);">
                    <td style="padding:14px;">
                        <div style="font-weight:800; color:var(--primary); font-size:14px;">${esc(t.title)}</div>
                        <div style="font-size:11px; color:var(--gray-500); font-family:monospace;">${esc(t.tender_number)} • ${esc(t.category || 'N/A')}</div>
                    </td>
                    <td style="padding:14px; font-size:12px;">${esc(t.client_name || '—')}</td>
                    <td style="padding:14px; text-align:right; font-weight:800; font-size:13px; color:var(--primary);">TSh ${Number(t.estimated_budget || 0).toLocaleString()}</td>
                    <td style="padding:14px; text-align:center; font-size:11px;">${t.submission_date ? new Date(t.submission_date).toLocaleDateString() : '—'}</td>
                    <td style="padding:14px; text-align:center;">${badge}</td>
                    <td style="padding:14px; text-align:center;">
                        <div class="action-dropdown" id="dropdown-tender-${t.id}">
                            <button class="action-dropdown-btn" onclick="toggleActionDropdown(event, 'tender-${t.id}')">⋯</button>
                            <div class="action-dropdown-content">
                                <button onclick="openTenderModal(${t.id})">✏️ Edit Tender</button>
                                ${t.status === 'won' ? `<button onclick="linkTenderToProcurement(${t.id})">🔗 Link to Procurement</button>` : ''}
                                <button class="text-red" onclick="deleteTenderPrompt(${t.id})">🗑️ Delete</button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--red);">❌ ${err.message}</td></tr>`;
    }
}

// 2. Open Modal (Add / Edit)
function openTenderModal(id = null) {
    document.getElementById('tender_id').value = id || '';
    document.getElementById('tender_title').value = '';
    document.getElementById('tender_client').value = '';
    document.getElementById('tender_category').value = 'Construction';
    document.getElementById('tender_deadline').value = '';
    document.getElementById('tender_budget').value = '';
    document.getElementById('tender_status').value = 'incoming';
    document.getElementById('tender_desc').value = '';
    document.getElementById('tender_error').style.display = 'none';

    if (id) {
        document.getElementById('tenderModalTitle').textContent = '✏️ Edit Tender';
        const tender = currentTenders.find(t => t.id == id);
        if (tender) {
            document.getElementById('tender_title').value = tender.title || '';
            document.getElementById('tender_client').value = tender.client_name || '';
            document.getElementById('tender_category').value = tender.category || 'Construction';
            document.getElementById('tender_deadline').value = tender.submission_date ? tender.submission_date.split('T')[0] : '';
            document.getElementById('tender_budget').value = tender.estimated_budget || '';
            document.getElementById('tender_status').value = tender.status || 'incoming';
            document.getElementById('tender_desc').value = tender.description || '';
        }
    } else {
        document.getElementById('tenderModalTitle').textContent = '📝 Add New Tender';
    }
    showModal('tenderModal');
}

// 3. Submit Tender
async function submitTender() {
    const id = document.getElementById('tender_id').value;
    const title = document.getElementById('tender_title').value.trim();
    const errDiv = document.getElementById('tender_error');

    if (!title) {
        errDiv.textContent = '⚠ Jina la tender ni lazima.';
        errDiv.style.display = 'block';
        return;
    }

    const data = {
        title,
        clientName: document.getElementById('tender_client').value.trim(),
        category: document.getElementById('tender_category').value,
        submissionDate: document.getElementById('tender_deadline').value || null,
        estimatedBudget: parseFloat(document.getElementById('tender_budget').value) || 0,
        status: document.getElementById('tender_status').value,
        description: document.getElementById('tender_desc').value.trim()
    };

    try {
        if (id) {
            await API.updateTender(id, data);
            showToast('✅ Tender imebadilishwa!', 'success');
        } else {
            await API.createTender(data);
            showToast('✅ Tender imeongezwa!', 'success');
        }
        closeModal('tenderModal');
        loadTenders();
    } catch (err) {
        errDiv.textContent = '❌ ' + err.message;
        errDiv.style.display = 'block';
    }
}

// 4. Link Tender to Procurement
async function linkTenderToProcurement(id) {
    const res = await modernConfirm({
        title: '🔗 Link to Procurement?',
        message: 'Mfumo utatengeneza Procurement Request kiotomatiki kwa ajili ya tenda hii. Una uhakika?',
        type: 'success',
        okText: '🔗 Link & Create Request'
    });
    if (!res.confirmed) return;

    try {
        const result = await API.linkTenderToProcurement(id);
        showToast(
            `✅ Request ${result.procurement.number} imeundwa!`, 
            'success'
        );
        
        // Refresh list
        loadTenders();
        
        // Kama unaona ni vyema, mpeleke kwenye Procurement
        setTimeout(() => {
            switchSidebarTab('sub-all-requests');
        }, 2000);
        
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}
let procurementChartInstance = null;
let assetChartInstance = null;

function toggleCustomDateRange() {
    const type = document.getElementById('masterPeriodType').value;
    const customDiv = document.getElementById('customDateRange');
    if (type === 'custom') {
        customDiv.style.display = 'flex';
    } else {
        customDiv.style.display = 'none';
    }
}

async function loadMasterReport() {
    const narrative = document.getElementById('masterNarrativeText');
    const grid = document.getElementById('masterKPIGrid');
    const periodType = document.getElementById('masterPeriodType').value;

    let params = {};
    if (periodType === 'custom') {
        const from = document.getElementById('masterDateFrom').value;
        const to = document.getElementById('masterDateTo').value;
        if (!from || !to) {
            showToast('Chagua tarehe za mwanzo na mwisho.', 'warning');
            return;
        }
        params = { from, to };
    } else {
        params = { period: periodType };
    }

    narrative.textContent = '⏳ Loading report...';
    grid.innerHTML = '';

    try {
        const data = await API.getMasterReport(params);
        currentMasterReport = data;

        narrative.textContent = data.narrative;

        // KPI Cards
        grid.innerHTML = `
            <div class="stat-card" style="border-left:4px solid var(--blue);">
                <div class="stat-icon">📋</div>
                <div class="stat-number">${data.procurement.total_requests || 0}</div>
                <div class="stat-label">Procurement Requests</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">TSh ${Number(data.procurement.total_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--green);">
                <div class="stat-icon">📦</div>
                <div class="stat-number">${data.stock.total_items || 0}</div>
                <div class="stat-label">Stock Items</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Value: TSh ${Number(data.stock.total_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--orange);">
                <div class="stat-icon">🏷️</div>
                <div class="stat-number">${data.assets.total_assets || 0}</div>
                <div class="stat-label">Fixed Assets</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Value: TSh ${Number(data.assets.total_current_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--purple);">
                <div class="stat-icon">📄</div>
                <div class="stat-number">${data.tenders.total_tenders || 0}</div>
                <div class="stat-label">Tenders Registered</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Won: ${data.tenders.won || 0} (TSh ${Number(data.tenders.won_value || 0).toLocaleString()})</div>
            </div>
        `;

        // Charts
        renderProcurementChart(data.procurement);
        renderAssetChart(data.assets);

    } catch (err) {
        narrative.textContent = '❌ Failed to load report: ' + err.message;
        narrative.style.color = 'red';
    }
}
let storeChartInstance = null;
let procurementTrendInstance = null;
let procurementStatusInstance = null;

async function loadMasterReport() {
    const narrative = document.getElementById('masterNarrativeText');
    const grid = document.getElementById('masterKPIGrid');
    const periodType = document.getElementById('masterPeriodType').value;

    let params = {};
    if (periodType === 'custom') {
        const from = document.getElementById('masterDateFrom').value;
        const to = document.getElementById('masterDateTo').value;
        if (!from || !to) {
            showToast('Chagua tarehe za mwanzo na mwisho.', 'warning');
            return;
        }
        params = { from, to };
    } else {
        params = { period: periodType };
    }

    narrative.textContent = '⏳ Loading report...';
    grid.innerHTML = '';

    try {
        const data = await API.getMasterReport(params);
        currentMasterReport = data;

        narrative.textContent = data.narrative;

        // KPI Cards
        grid.innerHTML = `
            <div class="stat-card" style="border-left:4px solid var(--blue);">
                <div class="stat-icon">📋</div>
                <div class="stat-number">${data.procurement.total_requests || 0}</div>
                <div class="stat-label">Procurement Requests</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">TSh ${Number(data.procurement.total_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--green);">
                <div class="stat-icon">📦</div>
                <div class="stat-number">${data.stock.total_items || 0}</div>
                <div class="stat-label">Stock Items</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Value: TSh ${Number(data.stock.total_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--orange);">
                <div class="stat-icon">🏷️</div>
                <div class="stat-number">${data.assets.total_assets || 0}</div>
                <div class="stat-label">Fixed Assets</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Value: TSh ${Number(data.assets.total_current_value || 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-left:4px solid var(--purple);">
                <div class="stat-icon">📄</div>
                <div class="stat-number">${data.tenders.total_tenders || 0}</div>
                <div class="stat-label">Tenders Registered</div>
                <div style="font-size:11px;color:var(--gray-500);margin-top:4px;">Won: ${data.tenders.won || 0}</div>
            </div>
        `;
        await loadProcurementTrendChart();
        renderProcurementStatusChart(data.procurement);
        renderStoreChart(data.stock);
        renderAssetChart(data.assets);

    } catch (err) {
        narrative.textContent = '❌ Failed to load report: ' + err.message;
        narrative.style.color = 'red';
    }
}
let currentTrendPeriod = '7d';

function changeTrendPeriod(period) {
    currentTrendPeriod = period;
    document.querySelectorAll('.trend-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.trend-btn[data-period="${period}"]`).classList.add('active');
    loadProcurementTrendChart();
}

async function loadProcurementTrendChart() {
    try {
        const days = currentTrendPeriod === '7d' ? 7 : currentTrendPeriod === '30d' ? 30 : 90;
        const now = new Date();
        const from = new Date(now);
        from.setDate(now.getDate() - days);
        
        const data = await API.getProcurementTrend({
            from: from.toISOString().split('T')[0],
            to: now.toISOString().split('T')[0]
        });

        renderProcurementTrendChart(data.trend || []);
    } catch (err) {
        console.error('Trend error:', err);
    }
}
function renderProcurementTrendChart(trendData) {
    const ctx = document.getElementById('procurementTrendChart');
    if (!ctx) return;
    if (procurementTrendInstance) procurementTrendInstance.destroy();

    // Kama hakuna data, onyesha ujumbe
    if (!trendData || trendData.length === 0) {
        procurementTrendInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: ['No Data'], datasets: [{ data: [0], borderColor: '#cbd5e1' }] },
            options: { plugins: { legend: { display: false } } }
        });
        return;
    }

    const labels = trendData.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    });
    const paidData = trendData.map(d => Number(d.paid_value));
    const pendingData = trendData.map(d => Number(d.pending_value));

    procurementTrendInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Paid (TSh)',
                    data: paidData,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34,197,94,0.1)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#22c55e',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Pending (TSh)',
                    data: pendingData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,0.1)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#f59e0b',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, font: { size: 11, weight: 'bold' } } },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `${ctx.dataset.label}: TSh ${Number(ctx.raw).toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { 
                        callback: v => 'TSh ' + (v >= 1000000 ? (v/1000000).toFixed(1) + 'M' : (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)),
                        font: { size: 10 }
                    },
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 10 } }
                }
            }
        }
    });
}
function renderProcurementStatusChart(procurement) {
    const ctx = document.getElementById('procurementStatusChart');
    if (!ctx) return;

    if (procurementStatusInstance) procurementStatusInstance.destroy();

    // Hapa tunachukua idadi halisi ya maombi, sio values za fedha
    const managerPending = Number(procurement.pending_manager || 0);
    const ceoPending = Number(procurement.pending_ceo || 0);
    const paidCount = Number(procurement.paid_count || 0); // Kama una hii kwenye backend

    procurementStatusInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Manager', 'CEO', 'Paid'],
            datasets: [{
                label: 'Number of Requests',
                data: [managerPending, ceoPending, paidCount],
                backgroundColor: ['#f59e0b', '#8b5cf6', '#22c55e'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `${ctx.raw} requests`;
                        }
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    ticks: { stepSize: 1 } // Kuruhusu namba kamili tu
                } 
            }
        }
    });
}
// ================================================================
// CHART 3: STORE (Small Doughnut)
// ================================================================
function renderStoreChart(stock) {
    const ctx = document.getElementById('storeChart');
    if (!ctx) return;

    if (storeChartInstance) storeChartInstance.destroy();

    const totalValue = Number(stock.total_value || 0);
    const totalItems = Number(stock.total_items || 0);

    storeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Stock Value (TSh)', 'Items'],
            datasets: [{
                data: [totalValue, totalItems],
                backgroundColor: ['#22c55e', '#3b82f6'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 11 } } }
            }
        }
    });
}

// ================================================================
// CHART 4: ASSETS (Bar Chart)
// ================================================================
function renderAssetChart(assetData) {
    const ctx = document.getElementById('assetChart');
    if (!ctx) return;

    if (assetChartInstance) assetChartInstance.destroy();

    const active = Number(assetData.active || 0);
    const maintenance = Number(assetData.maintenance || 0);
    const total = Number(assetData.total_assets || 0);
    const retired = Math.max(0, total - active - maintenance);

    assetChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Active', 'Maintenance', 'Retired'],
            datasets: [{
                label: 'Assets',
                data: [active, maintenance, retired],
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function printMasterReport() {
    if (!currentMasterReport) {
        showToast('Bonyeza "Generate Report" kwanza.', 'warning');
        return;
    }

    const d = currentMasterReport;
    const html = `
        <html>
        <head>
            <title>Executive Summary - MAK DC</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                .header { text-align: center; border-bottom: 3px solid #022908; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { margin: 0; font-size: 22px; color: #022908; }
                .header p { margin: 5px 0; font-size: 13px; color: #666; }
                .narrative { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin-bottom: 25px; font-size: 14px; line-height: 1.8; }
                .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
                .card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
                .card-label { font-size: 11px; color: #666; text-transform: uppercase; }
                .card-value { font-size: 20px; font-weight: 900; color: #022908; }
                .footer { text-align: center; font-size: 11px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>MAK DC INVESTMENT COMPANY LTD</h1>
                <p>Executive Summary Report</p>
                <p>Generated on ${new Date().toLocaleString()} by ${Auth.getUser().fullName}</p>
            </div>
            <div class="narrative">${d.narrative}</div>
            <div class="stats">
                <div class="card"><div class="card-label">Procurement Requests</div><div class="card-value">${d.procurement.total_requests || 0} (TSh ${Number(d.procurement.total_value || 0).toLocaleString()})</div></div>
                <div class="card"><div class="card-label">Stock Value</div><div class="card-value">TSh ${Number(d.stock.total_value || 0).toLocaleString()}</div></div>
                <div class="card"><div class="card-label">Assets Value</div><div class="card-value">TSh ${Number(d.assets.total_current_value || 0).toLocaleString()}</div></div>
                <div class="card"><div class="card-label">Tenders Won</div><div class="card-value">${d.tenders.won || 0} (TSh ${Number(d.tenders.won_value || 0).toLocaleString()})</div></div>
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

// 5. Delete Tender
async function deleteTenderPrompt(id) {
    const res = await modernConfirm({
        title: '🗑️ Delete Tender?',
        message: 'Una uhakika unataka kufuta tender hii?',
        type: 'danger',
        okText: '🗑️ Delete'
    });
    if (!res.confirmed) return;

    try {
        await API.deleteTender(id);
        showToast('✅ Tender imefutwa!', 'success');
        loadTenders();
    } catch (err) {
        showToast('❌ ' + err.message, 'error');
    }
}

function debounceLoadTenders() {
    clearTimeout(tenderSearchTimeout);
    tenderSearchTimeout = setTimeout(loadTenders, 400);
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