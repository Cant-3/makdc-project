// ================================================================
// MAK DC INVESTMENT — ORDER CONTROLLER (WITH WORKFLOW EMAILS)
// ================================================================
// Handles: Full Order Flow (Customer → Sales → Finance → Manager → CEO → Delivery)
// ================================================================

const { prisma } = require('../config/database');
const marketingController = require('./marketing.controller');

// Ingiza functions zote za email kutoka email.service.js
const { 
    sendSalesNewOrder, 
    sendFinanceNewOrder, 
    sendManagerApproval, 
    sendCEOApproval, 
    sendOrderApprovedForDelivery,
    sendCustomerReceipt 
} = require('../services/email.service');

// ================================================================
// HELPER: Generate Order ID
// ================================================================
function generateOrderId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    return `MAK-${year}-${random}`;
}

// ================================================================
// HELPER: Generate Receipt Number
// Format: RCPT-MAKDC-YYYYMM-XXXX
// ================================================================
async function generateReceiptNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `RCPT-MAKDC-${year}${month}-`;

    const lastOrder = await prisma.order.findFirst({
        where: {
            receiptNumber: {
                startsWith: prefix
            }
        },
        orderBy: {
            receiptNumber: 'desc'
        }
    });

    let nextNumber = 1;
    if (lastOrder && lastOrder.receiptNumber) {
        const lastNum = parseInt(lastOrder.receiptNumber.split('-').pop());
        nextNumber = lastNum + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

// ================================================================
// CREATE ORDER — Customer/Sales anaunda
// POST /api/orders
// ================================================================
async function createOrder(req, res) {
    try {
        const {
            customerName, phone, email, region, district,
            deliveryAddress, deliveryType, expectedDate, timeSlot,
            notes, items, source, marketingPlanId
        } = req.body;

        // 1. Validation ya Msingi
        if (!customerName || !phone || !items || items.length === 0) {
            return res.status(400).json({ error: 'Name, phone, and items are required.' });
        }

        // 2. Tafuta bidhaa zote zilizotajwa kwenye order
        const productNames = items.map(item => item.productName || item.product);
        
        const products = await prisma.product.findMany({
            where: { 
                name: { in: productNames },
                isActive: true
            }
        });

        // 3. Unda map ya product kwa jina kwa ajili ya ukaguzi wa haraka
        const productMap = {};
        products.forEach(p => { productMap[p.name] = p; });

        // 4. Kagua kila item (Stock & Existence)
        const stockErrors = [];
        for (const item of items) {
            const productName = item.productName || item.product;
            const product = productMap[productName];
            
            if (!product) {
                stockErrors.push(`❌ "${productName}" haipo kwenye mfumo.`);
                continue;
            }
            
            if (product.stock < item.quantity) {
                stockErrors.push(
                    `❌ "${productName}" haitoshi. Iliyopo: ${product.stock}, inahitajika: ${item.quantity}`
                );
            }
        }

        if (stockErrors.length > 0) {
            return res.status(400).json({ 
                error: stockErrors.join(' | '),
                stockErrors 
            });
        }

        // 5. Calculate totals
        const totalItems = items.length;
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalAmount = items.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0);

        // 6. Generate order ID
        const orderId = generateOrderId();

        // 7. TRANSACTION: CREATE ORDER + DEDUCT STOCK
        const order = await prisma.$transaction(async (tx) => {
            // 7a. Unda order
            const newOrder = await tx.order.create({
                data: {
                    orderId,
                    customerName,
                    phone,
                    email,
                    region,
                    district,
                    deliveryAddress,
                    deliveryType,
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    timeSlot,
                    notes,
                    totalAmount,
                    totalItems,
                    totalQuantity,
                    status: 'pending',
                    source: source || 'Customer Portal',
                    marketingPlanId: marketingPlanId ? parseInt(marketingPlanId) : null,
                    createdBy: req.user?.userId || null,
                    items: {
                        create: items.map(item => ({
                            productName: item.productName || item.product,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity,
                            subtotal: item.unitPrice * item.quantity
                        }))
                    }
                },
                include: {
                    items: true
                }
            });
            for (const item of items) {
                const productName = item.productName || item.product;
                const product = productMap[productName];
                
                if (product) {
                    await tx.product.update({
                        where: { id: product.id },
                        data: { stock: { decrement: item.quantity } }
                    });
                    console.log(`📦 Stock reduced: ${productName} -${item.quantity} (remaining: ${product.stock - item.quantity})`);
                }
            }

            return newOrder;
        }, {
            timeout: 15000
        });
        if (req.user?.userId) {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.userId,
                    action: 'create_order',
                    entityType: 'order',
                    entityId: orderId,
                    details: { customerName, totalAmount },
                    ipAddress: req.ip || 'unknown'
                }
            });
        }
        if (marketingPlanId) {
            try {
                await marketingController.recalculateKpiFromOrders(marketingPlanId);
                console.log(`✅ Marketing plan #${marketingPlanId} KPI recalculated`);
            } catch (err) {
                console.error('⚠️ Failed to recalculate marketing KPI:', err.message);
            }
        }
        if (order.email) {
            sendCustomerReceipt(order).catch(err => console.error('Email Error (Customer):', err));
        }
        sendSalesNewOrder(order).catch(err => console.error('Email Error (Sales):', err));
        sendAdminOrderAlert(order).catch(err => console.error('Email Error (CEO Alert):', err));
        res.status(201).json({
            message: 'Order created successfully! Stock has been reduced.',
            order
        });

    } catch (err) {
        console.error('❌ Create order error:', err);
        res.status(500).json({ error: 'Failed to create order.' });
    }
}
async function listOrders(req, res) {
    try {
        const { status, source } = req.query;

        const where = {};
        if (status) where.status = status;
        if (source) where.source = source;

        const orders = await prisma.order.findMany({
            where,
            include: {
                items: true,
                payments: true,
                creator: { select: { id: true, fullName: true, email: true, role: true } },
                salesReviewer: { select: { id: true, fullName: true } },
                paymentVerifier: { select: { id: true, fullName: true } },
                deliverer: { select: { id: true, fullName: true } },
                receiptIssuer: { select: { id: true, fullName: true } },
                paymentAccount: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(orders);

    } catch (err) {
        console.error('❌ List orders error:', err);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
}
async function getOrder(req, res) {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.findUnique({
            where: { orderId },
            include: {
                items: true,
                salesReviewer: { select: { id: true, fullName: true } },
                paymentVerifier: { select: { id: true, fullName: true } },
                deliverer: { select: { id: true, fullName: true } }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        let paymentAccount = null;
        if (order.paymentAccountId) {
            paymentAccount = await prisma.companyAccount.findUnique({
                where: { id: order.paymentAccountId },
                select: { id: true, name: true, type: true, accountNumber: true, accountName: true }
            });
        }

        res.json({
            ...order,
            paymentAccount
        });

    } catch (err) {
        console.error('❌ Get order error:', err);
        res.status(500).json({ error: 'Failed to fetch order.' });
    }
}
async function trackOrder(req, res) {
    try {
        const { orderId } = req.params;
        const { phone } = req.query;

        const order = await prisma.order.findUnique({
            where: { orderId },
            include: {
                items: true,
                paymentAccount: {
                    select: { name: true, type: true, accountNumber: true, accountName: true, branch: true, instructions: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (phone) {
            const normalizePhone = (p) => (p || '').replace(/\s+/g, '').replace(/^\+?255/, '0');
            if (normalizePhone(order.phone) !== normalizePhone(phone)) {
                return res.status(403).json({ error: 'Phone number does not match.' });
            }
        }

        res.json(order);

    } catch (err) {
        console.error('❌ Track order error:', err);
        res.status(500).json({ error: 'Failed to track order.' });
    }
}
async function sendToFinance(req, res) {
    try {
        const { orderId } = req.params;
        const { salesReviewNotes } = req.body;

        const order = await prisma.order.update({
            where: { orderId },
            data: {
                status: 'ready-for-finance',
                reviewedBySales: req.user.userId,
                reviewedAtSales: new Date(),
                salesReviewNotes: salesReviewNotes || null
            },
            include: { items: true } 
        });
        sendFinanceNewOrder(order).catch(err => console.error('Email Error (Finance):', err));

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'send_order_to_finance',
                entityType: 'order',
                entityId: orderId,
                details: { notes: salesReviewNotes },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Order sent to Finance successfully!',
            order
        });

    } catch (err) {
        console.error('❌ Send to finance error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to send order.' });
    }
}
async function setupPayment(req, res) {
    try {
        const { orderId } = req.params;
        const { paymentType, paymentAccountId, paymentInstructions, paymentDeadline } = req.body;

        if (!paymentType || !['prepaid', 'postpaid'].includes(paymentType)) {
            return res.status(400).json({ error: 'Payment type must be "prepaid" or "postpaid".' });
        }

        if (paymentType === 'prepaid' && !paymentAccountId) {
            return res.status(400).json({ error: 'Payment account is required for prepaid orders.' });
        }

        const order = await prisma.order.update({
            where: { orderId },
            data: {
                paymentType,
                paymentAccountId: paymentAccountId || null,
                paymentInstructions: paymentInstructions || null,
                paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : null,
                status: paymentType === 'prepaid' ? 'awaiting-payment' : 'postpaid-approved'
            },
            include: { items: true }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'setup_payment',
                entityType: 'order',
                entityId: orderId,
                details: { paymentType, paymentAccountId },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: `Payment setup complete (${paymentType})!`,
            order
        });

    } catch (err) {
        console.error('❌ Setup payment error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to setup payment.' });
    }
}
async function verifyPayment(req, res) {
    try {
        const { orderId } = req.params;
        const { paymentReference } = req.body;

        const existingOrder = await prisma.order.findUnique({
            where: { orderId }
        });

        if (!existingOrder) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (existingOrder.paymentAccountId) {
            const account = await prisma.companyAccount.findUnique({
                where: { id: existingOrder.paymentAccountId }
            });

            if (!account) {
                return res.status(400).json({ error: 'Payment account not found.' });
            }

            if (account.purpose !== 'collections') {
                return res.status(400).json({ error: 'Payment must be received into a Collections account.' });
            }

            const newBalance = Number(account.balance || 0) + Number(existingOrder.totalAmount || 0);
            
            await prisma.companyAccount.update({
                where: { id: account.id },
                data: { balance: newBalance }
            });

            const resource = await prisma.financialResource.findUnique({
                where: { accountId: account.id }
            });

            if (resource) {
                const newResourceBalance = Number(resource.amount || 0) + Number(existingOrder.totalAmount || 0);
                await prisma.financialResource.update({
                    where: { id: resource.id },
                    data: { amount: newResourceBalance }
                });
            }
            console.log(`💰 Collection account "${account.name}" updated: +${existingOrder.totalAmount}`);
        }

        const receiptNumber = await generateReceiptNumber();

        const order = await prisma.order.update({
            where: { orderId },
            data: {
                status: 'paid',
                paymentVerifiedBy: req.user.userId,
                paymentVerifiedAt: new Date(),
                paymentReference: paymentReference || null,
                receiptNumber,
                receiptIssuedBy: req.user.userId,
                receiptIssuedAt: new Date()
            },
            include: { items: true } 
        });
        sendManagerApproval(order).catch(err => console.error('Email Error (Manager):', err));

        await prisma.payment.create({
            data: {
                orderId,
                amount: order.totalAmount,
                paymentType: order.paymentType || 'prepaid',
                paymentMethod: order.paymentAccountId ? 'Bank/Mobile' : 'Cash',
                paymentReference: paymentReference || null,
                status: 'paid',
                verifiedBy: req.user.userId,
                verifiedAt: new Date(),
                receiptNumber,
                notes: `Receipt issued automatically`
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'verify_payment',
                entityType: 'order',
                entityId: orderId,
                details: { receiptNumber, paymentReference },
                ipAddress: req.ip || 'unknown'
            }
        });
        // Ledger INFLOW
        try {
            const { recordTransaction } = require('../services/ledger.service');
            const resource = order.paymentAccountId ? await prisma.financialResource.findUnique({
                where: { accountId: order.paymentAccountId }
            }) : null;

            if (resource) {
                await recordTransaction({
                    resourceId: resource.id,
                    type: 'INFLOW',
                    amount: order.totalAmount,
                    source: 'SALES',
                    sourceId: order.orderId,
                    sourceModel: 'Order',
                    reference: receiptNumber,
                    description: `Payment received from ${order.customerName || 'Customer'} (${order.phone || '—'})`,
                    createdBy: req.user.fullName || 'Finance Officer'
                });
                console.log(`💰 Ledger: Sales INFLOW recorded — TSh ${Number(order.totalAmount).toLocaleString()}`);
            }
        } catch (ledgerErr) {
            console.error('⚠️ Ledger error (order still verified):', ledgerErr.message);
        }

        res.json({
            message: 'Payment verified successfully! Sent to Manager for approval.',
            receiptNumber,
            order
        });

    } catch (err) {
        console.error('❌ Verify payment error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to verify payment.' });
    }
}
async function managerApprove(req, res) {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.update({
            where: { orderId },
            data: { status: 'manager-approved' },
            include: { items: true }
        });
        sendCEOApproval(order).catch(err => console.error('Email Error (CEO):', err));

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'manager_approve_order',
                entityType: 'order',
                entityId: orderId,
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({ message: 'Order approved by Manager! Sent to CEO.', order });
    } catch (err) {
        console.error('❌ Manager approval error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to approve order.' });
    }
}
async function ceoApprove(req, res) {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.update({
            where: { orderId },
            data: { status: 'ceo-approved' },
            include: { items: true }
        });
        sendOrderApprovedForDelivery(order).catch(err => console.error('Email Error (Delivery):', err));

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'ceo_approve_order',
                entityType: 'order',
                entityId: orderId,
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({ message: 'Order fully approved by CEO! Ready for delivery.', order });
    } catch (err) {
        console.error('❌ CEO approval error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to approve order.' });
    }
}
async function setDelivery(req, res) {
    try {
        const { orderId } = req.params;
        const { deliveryInfo, deliveryDate } = req.body;

        const order = await prisma.order.update({
            where: { orderId },
            data: {
                deliveryInfo: deliveryInfo || null,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : null
            }
        });

        res.json({
            message: 'Delivery info updated!',
            order
        });

    } catch (err) {
        console.error('❌ Set delivery error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to update delivery.' });
    }
}

// ================================================================
// SALES MARK DELIVERED
// PUT /api/orders/:orderId/mark-delivered
// ================================================================
async function markDelivered(req, res) {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.update({
            where: { orderId },
            data: {
                status: 'delivered',
                deliveredBy: req.user.userId,
                deliveredAt: new Date()
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'mark_delivered',
                entityType: 'order',
                entityId: orderId,
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Order marked as delivered!',
            order
        });

    } catch (err) {
        console.error('❌ Mark delivered error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to mark delivered.' });
    }
}

// ================================================================
// MARK ORDER AS COMPLETED (Finance)
// PUT /api/orders/:orderId/complete
// ================================================================
async function completeOrder(req, res) {
    try {
        const { orderId } = req.params;

        const order = await prisma.order.update({
            where: { orderId },
            data: { status: 'completed' }
        });

        res.json({
            message: 'Order completed!',
            order
        });

    } catch (err) {
        console.error('❌ Complete order error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to complete order.' });
    }
}

// ================================================================
// REJECT ORDER
// PUT /api/orders/:orderId/reject
// ================================================================
async function rejectOrder(req, res) {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await prisma.order.update({
            where: { orderId },
            data: {
                status: 'rejected',
                notes: reason ? `[REJECTED] ${reason}` : undefined
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'reject_order',
                entityType: 'order',
                entityId: orderId,
                details: { reason },
                ipAddress: req.ip || 'unknown'
            }
        });

        if (order.marketingPlanId) {
            try {
                await marketingController.recalculateKpiFromOrders(order.marketingPlanId);
                console.log(`✅ Marketing plan #${order.marketingPlanId} KPI recalculated after rejection`);
            } catch (err) {
                console.error('⚠️ Failed to recalculate marketing KPI:', err.message);
            }
        }

        res.json({
            message: 'Order rejected.',
            order
        });

    } catch (err) {
        console.error('❌ Reject order error:', err);
        if (err.code === 'P2025') return res.status(404).json({ error: 'Order not found.' });
        res.status(500).json({ error: 'Failed to reject order.' });
    }
}

// ================================================================
// SALES EDIT ORDER
// PUT /api/orders/:orderId/sales-edit
// ================================================================
async function salesEditOrder(req, res) {
    try {
        const { orderId } = req.params;
        const { items, customerName, phone, email, region, district, deliveryAddress, deliveryType, expectedDate, timeSlot, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one item is required.' });
        }

        const existing = await prisma.order.findUnique({
            where: { orderId },
            include: { items: true }
        });

        if (!existing) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        if (existing.status !== 'pending') {
            return res.status(400).json({
                error: `Cannot edit order with status "${existing.status}". Only pending orders can be edited.`
            });
        }

        const totalItems = items.length;
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalAmount = items.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0);

        const order = await prisma.$transaction(async (prisma) => {
            await prisma.orderItem.deleteMany({
                where: { orderId: existing.id }
            });

            const updated = await prisma.order.update({
                where: { orderId },
                data: {
                    customerName: customerName !== undefined ? customerName : existing.customerName,
                    phone: phone !== undefined ? phone : existing.phone,
                    email: email !== undefined ? email : existing.email,
                    region: region !== undefined ? region : existing.region,
                    district: district !== undefined ? district : existing.district,
                    deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : existing.deliveryAddress,
                    deliveryType: deliveryType !== undefined ? deliveryType : existing.deliveryType,
                    expectedDate: expectedDate !== undefined ? (expectedDate ? new Date(expectedDate) : null) : existing.expectedDate,
                    timeSlot: timeSlot !== undefined ? timeSlot : existing.timeSlot,
                    notes: notes !== undefined ? notes : existing.notes,
                    totalAmount,
                    totalItems,
                    totalQuantity,
                    items: {
                        create: items.map(item => ({
                            productName: item.productName,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity,
                            subtotal: item.unitPrice * item.quantity
                        }))
                    }
                },
                include: { items: true }
            });

            return updated;
        });

        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'sales_edit_order',
                entityType: 'order',
                entityId: orderId,
                details: { totalAmount, totalItems },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Order updated successfully!',
            order
        });

    } catch (err) {
        console.error('❌ Sales edit order error:', err);
        res.status(500).json({ error: 'Failed to update order.' });
    }    
}

// ================================================================
// CONFIRM DELIVERY — Customer anathibitisha amepokea mzigo
// PUBLIC — haihitaji token
// ================================================================
async function confirmDelivery(req, res) {
    try {
        const { orderId } = req.params;
        const { confirmedBy, confirmedAt } = req.body || {};

        console.log(`📦 Confirm delivery request for: ${orderId}`);

        const order = await prisma.order.findUnique({
            where: { orderId: orderId }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found', orderId: orderId });
        }

        const allowedStatuses = ['delivered', 'paid', 'completed'];
        if (!allowedStatuses.includes(order.status)) {
            return res.status(400).json({
                error: `Order cannot be confirmed. Current status: ${order.status}. Order must be delivered or paid first.`,
                currentStatus: order.status
            });
        }

        if (order.deliveryConfirmed === true) {
            return res.status(400).json({
                error: 'Delivery already confirmed',
                confirmedAt: order.deliveryConfirmedAt
            });
        }

        const updatedOrder = await prisma.order.update({
            where: { orderId: orderId },
            data: {
                deliveryConfirmed: true,
                deliveryConfirmedAt: confirmedAt ? new Date(confirmedAt) : new Date(),
                deliveryConfirmedBy: confirmedBy || 'Customer',
                status: 'completed',
                completedAt: new Date()
            }
        });

        console.log(`✅ Delivery confirmed for ${orderId}`);

        return res.json({
            success: true,
            message: 'Delivery confirmed successfully. Order is now completed.',
            order: {
                orderId: updatedOrder.orderId,
                status: updatedOrder.status,
                receiptNumber: updatedOrder.receiptNumber,
                deliveryConfirmed: updatedOrder.deliveryConfirmed,
                deliveryConfirmedAt: updatedOrder.deliveryConfirmedAt,
                deliveryConfirmedBy: updatedOrder.deliveryConfirmedBy,
                completedAt: updatedOrder.completedAt
            }
        });

    } catch (err) {
        console.error('❌ Confirm delivery error:', err);
        return res.status(500).json({ error: err.message || 'Server error while confirming delivery' });
    }
}

// ================================================================
// EXPORTS
// ================================================================
module.exports = {
    createOrder,
    listOrders,
    getOrder,
    trackOrder,
    salesEditOrder,
    sendToFinance,
    setupPayment,
    verifyPayment,
    managerApprove,  // Mpya
    ceoApprove,      // Mpya
    setDelivery,
    markDelivered,
    completeOrder,
    rejectOrder,
    confirmDelivery
};