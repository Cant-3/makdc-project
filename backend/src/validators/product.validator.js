// ================================================================
// MAK DC INVESTMENT — PRODUCT VALIDATORS
// ================================================================

const { z } = require('zod');

const createProductSchema = z.object({
    name: z.string().min(1, 'Product name inahitajika').max(150),
    description: z.string().max(1000).optional().or(z.literal('')),
    price: z.number().positive('Price lazima iwe zaidi ya 0'),
    unit: z.string().max(50).optional().or(z.literal('')),
    category: z.string().max(50).optional().or(z.literal('')),
    tag: z.string().max(50).optional().or(z.literal('')),
    image: z.string().optional().or(z.literal('')),
    stock: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
});

const updateProductSchema = z.object({
    name: z.string().min(1).max(150).optional(),
    description: z.string().max(1000).optional().or(z.literal('')),
    price: z.number().positive().optional(),
    unit: z.string().max(50).optional().or(z.literal('')),
    category: z.string().max(50).optional().or(z.literal('')),
    tag: z.string().max(50).optional().or(z.literal('')),
    image: z.string().optional().or(z.literal('')),
    stock: z.number().int().min(0).optional(),
    order: z.number().int().min(0).optional(),
    isActive: z.boolean().optional()
});

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
    createProductSchema,
    updateProductSchema,
    validate
};