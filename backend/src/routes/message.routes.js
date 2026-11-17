const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

// ================================================================
// HELPERS
// ================================================================

async function getUsersByIds(ids = []) {
    if (!ids || ids.length === 0) return [];
    const users = await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, fullName: true, role: true }
    });
    return users;
}

// Rekodi attendance (audit trail)
async function recordAttendance(messageId, user, action, comment = null, assignedTo = null) {
    let assignedNames = null;
    if (assignedTo && assignedTo.length > 0) {
        const users = await getUsersByIds(assignedTo);
        assignedNames = users.map(u => u.fullName);
    }

    return prisma.internalMessageAttendance.create({
        data: {
            messageId,
            userId: user.userId,
            userName: user.fullName,
            userRole: user.role,
            action,
            comment,
            assignedTo: assignedTo || undefined,
            assignedNames: assignedNames || undefined
        }
    });
}

// ================================================================
// ROUTES
// ================================================================

// 0. UNREAD COUNT (Imerekebishwa: array_contains -> has)
router.get('/unread-count', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;

        const [inbox, pending, drafts, minutes] = await Promise.all([
            prisma.internalMessage.count({
                where: { receiverId: userId, status: 'unread', isDeleted: false, isArchived: false }
            }),
            prisma.internalMessage.count({
                where: {
                    status: { in: ['unread', 'read', 'in-progress'] },
                    isDeleted: false,
                    OR: [
                        { receiverId: userId },
                        { assignedTo: { has: userId } } // ✅ Badilishwa
                    ]
                }
            }),
            prisma.internalMessage.count({
                where: { senderId: userId, status: 'draft', isDeleted: false }
            }),
            prisma.internalMessage.count({
                where: {
                    isMinute: true, isDeleted: false,
                    status: { in: ['unread', 'read', 'in-progress'] },
                    OR: [
                        { receiverId: userId },
                        { assignedTo: { has: userId } } // ✅ Badilishwa
                    ]
                }
            })
        ]);

        res.json({ inbox, pending, drafts, minutes });
    } catch (error) {
        console.error('Unread count error:', error);
        res.status(500).json({ error: 'Failed to get counts: ' + error.message });
    }
});

// 1. TUMA UJUMBE MPYA
router.post('/', authenticate, async (req, res) => {
    try {
        const { receivers, cc, subject, body, type, priority, attachments, isMinute, assignedTo } = req.body;
        const sender = req.user; 

        if (!receivers || receivers.length === 0) {
            return res.status(400).json({ error: 'At least one receiver is required' });
        }
        if (!subject || !subject.trim()) {
            return res.status(400).json({ error: 'Subject is required' });
        }
        if (!body || !body.trim()) {
            return res.status(400).json({ error: 'Message body is required' });
        }
        if (isMinute && (!assignedTo || assignedTo.length === 0)) {
            return res.status(400).json({ error: 'Minutes require at least one assignee' });
        }

        const createdMessages = [];

        const ccUsers = await getUsersByIds(cc || []);
        const ccNames = ccUsers.map(u => u.fullName);

        const assigneeIds = isMinute ? assignedTo : receivers;
        const assigneeUsers = await getUsersByIds(assigneeIds);
        const assigneeNames = assigneeUsers.map(u => u.fullName);

        for (const receiverId of receivers) {
            const receiverUser = await prisma.user.findUnique({ where: { id: receiverId } });
            if (!receiverUser) continue;

            const newMessage = await prisma.internalMessage.create({
                data: {
                    senderId: sender.userId,
                    senderName: sender.fullName,
                    senderRole: sender.role,
                    receiverId: receiverId,
                    receiverName: receiverUser.fullName,
                    ccIds: cc || [],
                    ccNames: ccNames,
                    subject: subject.trim(),
                    body: body.trim(),
                    type: isMinute ? 'minute' : (type || 'information'),
                    priority: priority || 'normal',
                    attachments: attachments || [],
                    hasAttachments: (attachments || []).length > 0,
                    isMinute: !!isMinute,
                    assignedTo: assigneeIds,
                    assignedToNames: assigneeNames,
                    assignedBy: sender.fullName,
                    assignedAt: new Date(),
                    status: 'unread'
                }
            });

            await recordAttendance(
                newMessage.id,
                sender,
                'created',
                isMinute ? `Minute created and assigned to ${assigneeNames.join(', ')}` : 'Message sent',
                assigneeIds
            );

            createdMessages.push(newMessage);
        }

        res.status(201).json({ success: true, count: createdMessages.length, messages: createdMessages });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Failed to send message: ' + error.message });
    }
});

// 2. HIFADHI DRAFT
router.post('/draft', authenticate, async (req, res) => {
    try {
        const { receivers, cc, subject, body, type, priority, attachments, isMinute, assignedTo } = req.body;
        const sender = req.user;

        const firstReceiver = receivers && receivers.length > 0 ? receivers[0] : sender.userId;
        const receiverUser = await prisma.user.findUnique({ where: { id: firstReceiver } });

        const ccUsers = await getUsersByIds(cc || []);
        const ccNames = ccUsers.map(u => u.fullName);

        const assigneeIds = isMinute ? (assignedTo || []) : (receivers || []);
        const assigneeUsers = await getUsersByIds(assigneeIds);
        const assigneeNames = assigneeUsers.map(u => u.fullName);

        const draft = await prisma.internalMessage.create({
            data: {
                senderId: sender.userId,
                senderName: sender.fullName,
                senderRole: sender.role,
                receiverId: firstReceiver,
                receiverName: receiverUser?.fullName || 'Draft',
                ccIds: cc || [],
                ccNames: ccNames,
                subject: subject || '(No Subject)',
                body: body || '',
                type: isMinute ? 'minute' : (type || 'information'),
                priority: priority || 'normal',
                attachments: attachments || [],
                hasAttachments: (attachments || []).length > 0,
                isMinute: !!isMinute,
                assignedTo: assigneeIds,
                assignedToNames: assigneeNames,
                status: 'draft'
            }
        });

        res.status(201).json({ success: true, draft });
    } catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({ error: 'Failed to save draft: ' + error.message });
    }
});

// 3. VUTA ORODHA YA UJUMBE (Imerekebishwa: array_contains -> has)
router.get('/list', authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type } = req.query;

        let whereClause = { isDeleted: false };

        if (type === 'inbox') {
            whereClause = { ...whereClause, receiverId: userId, isArchived: false, status: { not: 'draft' } };
        } else if (type === 'sent') {
            whereClause = { ...whereClause, senderId: userId, status: { not: 'draft' } };
        } else if (type === 'pending') {
            whereClause = {
                ...whereClause,
                status: { in: ['unread', 'read', 'in-progress'] },
                OR: [
                    { receiverId: userId },
                    { assignedTo: { has: userId } } // ✅ Badilishwa
                ]
            };
        } else if (type === 'drafts') {
            whereClause = { ...whereClause, senderId: userId, status: 'draft' };
        } else if (type === 'documents') {
            whereClause = { ...whereClause, hasAttachments: true, OR: [{ receiverId: userId }, { senderId: userId }] };
        } else if (type === 'minutes') {
            whereClause = { ...whereClause, isMinute: true, OR: [{ senderId: userId }, { receiverId: userId }] };
        } else if (type === 'starred') {
            whereClause = { ...whereClause, isStarred: true, OR: [{ receiverId: userId }, { senderId: userId }] };
        } else if (type === 'archived') {
            whereClause = { ...whereClause, isArchived: true, OR: [{ receiverId: userId }, { senderId: userId }] };
        }

        const messages = await prisma.internalMessage.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                senderId: true,
                senderName: true,
                senderRole: true,
                receiverId: true,
                receiverName: true,
                subject: true,
                body: true,
                type: true,
                priority: true,
                status: true,
                isStarred: true,
                isArchived: true,
                isMinute: true,
                hasAttachments: true,
                createdAt: true
            }
        });

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Failed to fetch messages: ' + error.message });
    }
});

// ================================================================
// 🆕 ROUTE MPYA IMEWEKWA HAPA JUU ILI ISIGONGANE NA /:id
// ================================================================
// 4b. VUTA ATTACHMENTS PEKEE
router.get('/:id/attachments', authenticate, async (req, res) => {
    try {
        const message = await prisma.internalMessage.findUnique({
            where: { id: parseInt(req.params.id) },
            select: { attachments: true, hasAttachments: true }
        });

        if (!message) return res.status(404).json({ error: 'Message not found' });

        const safeAttachments = Array.isArray(message.attachments) ? message.attachments : [];
        
        res.json({ attachments: safeAttachments });
    } catch (error) {
        console.error('Attachments error:', error);
        res.status(500).json({ error: 'Failed to fetch attachments: ' + error.message });
    }
});

// 4. VUTA UJUMBE MMOJA (BILA attachments — kwa haraka)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const message = await prisma.internalMessage.findUnique({
            where: { id: parseInt(req.params.id) },
            select: {
                id: true,
                senderId: true,
                senderName: true,
                senderRole: true,
                receiverId: true,
                receiverName: true,
                ccIds: true,
                ccNames: true,
                subject: true,
                body: true,
                type: true,
                priority: true,
                isMinute: true,
                isStarred: true,
                isArchived: true,
                hasAttachments: true,
                status: true,
                replyToId: true,
                assignedTo: true,
                assignedToNames: true,
                assignedBy: true,
                assignedAt: true,
                attendedAt: true,
                attendedBy: true,
                closedAt: true,
                closedBy: true,
                readAt: true,
                createdAt: true,
                attendance: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!message) return res.status(404).json({ error: 'Message not found' });

        const ccIds = message.ccIds || [];
        const assignedToIds = message.assignedTo || [];
        const isAllowed = message.receiverId === req.user.userId || message.senderId === req.user.userId || ccIds.includes(req.user.userId) || assignedToIds.includes(req.user.userId);

        if (!isAllowed) return res.status(403).json({ error: 'Unauthorized' });

        res.json(message);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch message: ' + error.message });
    }
});

// 5. MARK AS READ
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        await prisma.internalMessage.update({
            where: { id: parseInt(req.params.id) },
            data: { status: 'read', readAt: new Date() }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark as read: ' + error.message });
    }
});

// 6. ATTEND
router.put('/:id/attend', authenticate, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const { comment, assignTo, attachments } = req.body; // 🆕 Ongeza attachments hapa

        const message = await prisma.internalMessage.findUnique({ where: { id: messageId } });
        if (!message) return res.status(404).json({ error: 'Message not found' });

        const assignedToIds = message.assignedTo || [];
        if (!assignedToIds.includes(req.user.userId) && message.receiverId !== req.user.userId) {
            return res.status(403).json({ error: 'Only assignees can attend this message' });
        }
        if (message.status === 'closed') return res.status(400).json({ error: 'Message is already closed' });

        const updateData = {
            status: 'in-progress',
            attendedAt: new Date(),
            attendedBy: req.user.fullName
        };

        if (assignTo && assignTo.length > 0) {
            const assignees = await getUsersByIds(assignTo);
            updateData.assignedTo = assignTo;
            updateData.assignedToNames = assignees.map(u => u.fullName);
            updateData.assignedBy = req.user.fullName;
            updateData.assignedAt = new Date();
        }

        // 🆕 Kama kuna attachments mpya, ongeza kwenye array ya zamani
        if (attachments && attachments.length > 0) {
            const oldAttachments = message.attachments || [];
            updateData.attachments = [...oldAttachments, ...attachments];
            updateData.hasAttachments = true;
        }

        const updated = await prisma.internalMessage.update({
            where: { id: messageId },
            data: updateData
        });

        const action = (assignTo && assignTo.length > 0) ? 'assigned' : 'attended';
        await recordAttendance(messageId, req.user, action, comment || 'Attended', assignTo || null);

        res.json({ success: true, message: updated });
    } catch (error) {
        console.error('Attend error:', error);
        res.status(500).json({ error: 'Failed to attend: ' + error.message });
    }
});
// 7. CLOSE
router.put('/:id/close', authenticate, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        // 🆕 Ongeza assignTo na attachments hapa
        const { comment, assignTo, attachments } = req.body; 

        const message = await prisma.internalMessage.findUnique({ where: { id: messageId } });
        if (!message) return res.status(404).json({ error: 'Message not found' });

        const assignedToIds = message.assignedTo || [];
        const canClose = assignedToIds.includes(req.user.userId) || message.receiverId === req.user.userId || message.senderId === req.user.userId;
        if (!canClose) return res.status(403).json({ error: 'Only assignees or creator can close' });

        const updateData = {
            status: 'closed',
            closedAt: new Date(),
            closedBy: req.user.fullName
        };

        // 🆕 Kama kuna mtu ana-assigniwa wakati wa kufunga
        if (assignTo && assignTo.length > 0) {
            const assignees = await getUsersByIds(assignTo);
            updateData.assignedTo = assignTo;
            updateData.assignedToNames = assignees.map(u => u.fullName);
            updateData.assignedBy = req.user.fullName;
            updateData.assignedAt = new Date();
        }

        // 🆕 Kama kuna attachments mpya
        if (attachments && attachments.length > 0) {
            const oldAttachments = message.attachments || [];
            updateData.attachments = [...oldAttachments, ...attachments];
            updateData.hasAttachments = true;
        }

        await prisma.internalMessage.update({
            where: { id: messageId },
            data: updateData
        });

        // Rekodi kwenye attendance
        await recordAttendance(messageId, req.user, 'closed', comment || 'Closed', assignTo || null);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Close error:', error);
        res.status(500).json({ error: 'Failed to close: ' + error.message });
    }
});

// 8. REPLY
router.post('/:id/reply', authenticate, async (req, res) => {
    try {
        const originalId = parseInt(req.params.id);
        const { body, attachments } = req.body;

        if (!body || !body.trim()) return res.status(400).json({ error: 'Reply body required' });

        const original = await prisma.internalMessage.findUnique({ where: { id: originalId } });
        if (!original) return res.status(404).json({ error: 'Original message not found' });

        const replyReceivers = new Set([original.senderId]);
        (original.assignedTo || []).forEach(id => replyReceivers.add(id));
        (original.ccIds || []).forEach(id => replyReceivers.add(id));
        replyReceivers.delete(req.user.userId);

        const receiverIds = Array.from(replyReceivers);
        if (receiverIds.length === 0) return res.status(400).json({ error: 'No recipients for reply' });

        const receiverUser = await prisma.user.findUnique({ where: { id: receiverIds[0] } });

        const reply = await prisma.internalMessage.create({
            data: {
                senderId: req.user.userId,
                senderName: req.user.fullName,
                senderRole: req.user.role,
                receiverId: receiverIds[0],
                receiverName: receiverUser?.fullName || 'Group',
                ccIds: receiverIds.slice(1),
                subject: original.subject.startsWith('Re:') ? original.subject : `Re: ${original.subject}`,
                body: body.trim(),
                type: original.type,
                priority: original.priority,
                attachments: attachments || [],
                hasAttachments: (attachments || []).length > 0,
                isMinute: false,
                replyToId: originalId,
                status: 'unread',
                assignedTo: original.assignedTo || [],
                assignedToNames: original.assignedToNames || []
            }
        });

        await recordAttendance(originalId, req.user, 'replied', `Replied: ${body.substring(0, 100)}`);
        await recordAttendance(reply.id, req.user, 'created', `Reply to message #${originalId}`);

        res.status(201).json({ success: true, reply });
    } catch (error) {
        console.error('Reply error:', error);
        res.status(500).json({ error: 'Failed to reply: ' + error.message });
    }
});

// 9. STAR
router.put('/:id/star', authenticate, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const message = await prisma.internalMessage.findUnique({ where: { id: messageId } });
        if (!message) return res.status(404).json({ error: 'Message not found' });

        await prisma.internalMessage.update({
            where: { id: messageId },
            data: { isStarred: !message.isStarred }
        });
        res.json({ success: true, isStarred: !message.isStarred });
    } catch (error) {
        res.status(500).json({ error: 'Failed to star: ' + error.message });
    }
});

// 10. ARCHIVE
router.put('/:id/archive', authenticate, async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        const message = await prisma.internalMessage.findUnique({ where: { id: messageId } });
        if (!message) return res.status(404).json({ error: 'Message not found' });

        await prisma.internalMessage.update({
            where: { id: messageId },
            data: { isArchived: !message.isArchived }
        });
        res.json({ success: true, isArchived: !message.isArchived });
    } catch (error) {
        res.status(500).json({ error: 'Failed to archive: ' + error.message });
    }
});

// 11. DELETE
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await prisma.internalMessage.update({
            where: { id: parseInt(req.params.id) },
            data: { isDeleted: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete: ' + error.message });
    }
});

module.exports = router;