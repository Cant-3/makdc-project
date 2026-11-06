// ================================================================
// MAK DC INVESTMENT — PRODUCT CONTROLLER (FIXED)
// ================================================================

const { prisma } = require('../config/database');


async function listProducts(req, res) {
    try {
        const products = await prisma.product.findMany({
            where: { 
                isActive: true 
                // TUMEONDOA availableForSale: true HAPA
                // Ili bidhaa zote zilizo active zionekane kwenye website
            },
            orderBy: [
                { order: 'asc' },
                { name: 'asc' }
            ]
        });

        res.json(products);

    } catch (err) {
        console.error('❌ List products error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
}

// ... (Functions nyingine zibaki vilevile: listProductsAdmin, getProduct, createProduct, updateProduct, deleteProduct)
async function listProductsAdmin(req, res) {
    try {
        const products = await prisma.product.findMany({
            orderBy: [
                { order: 'asc' },
                { name: 'asc' }
            ]
        });

        res.json(products);

    } catch (err) {
        console.error('❌ List products admin error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
}
// ================================================================
// GET SINGLE PRODUCT
// GET /api/products/:id
// ================================================================
async function getProduct(req, res) {
    try {
        const { id } = req.params;

        const product = await prisma.product.findUnique({
            where: { id: parseInt(id) }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.json(product);

    } catch (err) {
        console.error('❌ Get product error:', err);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
}

// ================================================================
// CREATE PRODUCT (Sales + SuperAdmin)
// POST /api/products
// ================================================================
async function createProduct(req, res) {
    try {
        const {
            name, description, price, unit, category, tag, image, stock, order, isActive
        } = req.body;

        // Check if name exists
        const existing = await prisma.product.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ error: 'Product name already exists.' });
        }

        const product = await prisma.product.create({
            data: {
                name,
                description: description || null,
                price: parseFloat(price),
                unit: unit || 'per piece',
                category: category || null,
                tag: tag || null,
                image: image || null,
                stock: parseInt(stock) || 0,
                order: parseInt(order) || 0,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'create_product',
                entityType: 'product',
                entityId: String(product.id),
                details: { name, price },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.status(201).json({
            message: 'Product created successfully!',
            product
        });

    } catch (err) {
        console.error('❌ Create product error:', err);
        res.status(500).json({ error: 'Failed to create product.' });
    }
}

// ================================================================
// UPDATE PRODUCT (Sales + SuperAdmin)
// PUT /api/products/:id
// ================================================================
async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const {
            name, description, price, unit, category, tag, image, stock, order, isActive
        } = req.body;

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(unit !== undefined && { unit }),
                ...(category !== undefined && { category }),
                ...(tag !== undefined && { tag }),
                ...(image !== undefined && { image }),
                ...(stock !== undefined && { stock: parseInt(stock) }),
                ...(order !== undefined && { order: parseInt(order) }),
                ...(isActive !== undefined && { isActive })
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'update_product',
                entityType: 'product',
                entityId: String(id),
                details: { name },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({
            message: 'Product updated successfully!',
            product
        });

    } catch (err) {
        console.error('❌ Update product error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.status(500).json({ error: 'Failed to update product.' });
    }
}

// ================================================================
// DELETE PRODUCT (Sales + SuperAdmin)
// DELETE /api/products/:id
// ================================================================
async function deleteProduct(req, res) {
    try {
        const { id } = req.params;

        const product = await prisma.product.delete({
            where: { id: parseInt(id) }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: req.user.userId,
                action: 'delete_product',
                entityType: 'product',
                entityId: String(id),
                details: { name: product.name },
                ipAddress: req.ip || 'unknown'
            }
        });

        res.json({ message: 'Product deleted successfully!' });

    } catch (err) {
        console.error('❌ Delete product error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.status(500).json({ error: 'Failed to delete product.' });
    }
}

module.exports = {
    listProducts,
    listProductsAdmin,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
};