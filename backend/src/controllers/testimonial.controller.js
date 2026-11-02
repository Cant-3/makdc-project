// ================================================================
// MAK DC INVESTMENT — TESTIMONIAL CONTROLLER
// ================================================================
const { prisma } = require('../config/database');

// ================================================================
// GET ALL (PUBLIC) — Inaonyesha testimonials zote active
// ================================================================
async function listPublic(req, res) {
    try {
        const testimonials = await prisma.testimonial.findMany({
            where: { isActive: true },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(testimonials);
    } catch (err) {
        console.error('❌ List public testimonials error:', err);
        res.status(500).json({ error: 'Failed to fetch testimonials.' });
    }
}

// ================================================================
// GET ALL (ADMIN) — Inaonyesha zote (active + inactive)
// ================================================================
async function listAdmin(req, res) {
    try {
        const testimonials = await prisma.testimonial.findMany({
            orderBy: [
                { order: 'asc' },
                { createdAt: 'desc' }
            ]
        });
        res.json(testimonials);
    } catch (err) {
        console.error('❌ List admin testimonials error:', err);
        res.status(500).json({ error: 'Failed to fetch testimonials.' });
    }
}

// ================================================================
// CREATE
// ================================================================
async function createTestimonial(req, res) {
    try {
        const { customerName, role, message, rating, photo, order, isActive } = req.body;

        if (!customerName || !message) {
            return res.status(400).json({ error: 'Customer name and message are required.' });
        }

        const testimonial = await prisma.testimonial.create({
            data: {
                customerName: customerName.trim(),
                role: role ? role.trim() : null,
                message: message.trim(),
                rating: parseInt(rating) || 5,
                photo: photo || null,
                order: parseInt(order) || 0,
                isActive: isActive !== false
            }
        });

        res.status(201).json({ message: 'Testimonial created!', testimonial });
    } catch (err) {
        console.error('❌ Create testimonial error:', err);
        res.status(500).json({ error: 'Failed to create testimonial.' });
    }
}

// ================================================================
// UPDATE
// ================================================================
async function updateTestimonial(req, res) {
    try {
        const { id } = req.params;
        const { customerName, role, message, rating, photo, order, isActive } = req.body;

        const testimonial = await prisma.testimonial.update({
            where: { id: parseInt(id) },
            data: {
                customerName: customerName?.trim(),
                role: role ? role.trim() : null,
                message: message?.trim(),
                rating: rating ? parseInt(rating) : undefined,
                photo: photo !== undefined ? photo : undefined,
                order: order !== undefined ? parseInt(order) : undefined,
                isActive: isActive !== undefined ? isActive : undefined
            }
        });

        res.json({ message: 'Testimonial updated!', testimonial });
    } catch (err) {
        console.error('❌ Update testimonial error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Testimonial not found.' });
        }
        res.status(500).json({ error: 'Failed to update testimonial.' });
    }
}

// ================================================================
// DELETE
// ================================================================
async function deleteTestimonial(req, res) {
    try {
        const { id } = req.params;
        await prisma.testimonial.delete({ where: { id: parseInt(id) } });
        res.json({ message: 'Testimonial deleted.' });
    } catch (err) {
        console.error('❌ Delete testimonial error:', err);
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Testimonial not found.' });
        }
        res.status(500).json({ error: 'Failed to delete testimonial.' });
    }
}

// ================================================================
// EXPORT
// ================================================================
module.exports = {
    listPublic,
    listAdmin,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial
};