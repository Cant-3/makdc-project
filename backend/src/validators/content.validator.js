// ================================================================
// MAK DC INVESTMENT — CONTENT VALIDATORS
// ================================================================

const { z } = require('zod');

// ================================================================
// UPDATE CONTENT SCHEMA
// ================================================================
const updateContentSchema = z.object({
    value: z.string()
        .min(1, 'Value cannot be empty')
        .max(5000, 'Value is too long')
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
            return res.status(400).json({ error: 'Invalid input.' });
        }
    };
}

module.exports = {
    updateContentSchema,
    validate
};