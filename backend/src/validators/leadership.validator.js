// ================================================================
// MAK DC INVESTMENT — LEADERSHIP VALIDATORS
// ================================================================

const { z } = require('zod');

// ================================================================
// CREATE LEADERSHIP
// ================================================================
const createLeadershipSchema = z.object({
    fullName: z.string().min(1, 'Full name inahitajika').max(100),
    role: z.string().min(1, 'Role inahitajika').max(100),
    bio: z.string().max(1000).optional().or(z.literal('')),
    photo: z.string().optional().or(z.literal('')),
    email: z.string().email('Email si sahihi').optional().or(z.literal('')),
    phone: z.string().max(30).optional().or(z.literal('')),
    linkedin: z.string().max(200).optional().or(z.literal('')),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
});

// ================================================================
// UPDATE LEADERSHIP
// ================================================================
const updateLeadershipSchema = z.object({
    fullName: z.string().min(1).max(100).optional(),
    role: z.string().min(1).max(100).optional(),
    bio: z.string().max(1000).optional().or(z.literal('')),
    photo: z.string().optional().or(z.literal('')),
    email: z.string().email('Email si sahihi').optional().or(z.literal('')),
    phone: z.string().max(30).optional().or(z.literal('')),
    linkedin: z.string().max(200).optional().or(z.literal('')),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
});

// ================================================================
// VALIDATE MIDDLEWARE
// ================================================================
function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err.errors && err.errors.length > 0) {
                return res.status(400).json({
                    error: err.errors[0].message,
                    field: err.errors[0].path[0]
                });
            }
            return res.status(400).json({ error: 'Input si sahihi.' });
        }
    };
}

module.exports = {
    createLeadershipSchema,
    updateLeadershipSchema,
    validate
};