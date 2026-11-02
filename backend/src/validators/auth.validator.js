// ================================================================
// MAK DC INVESTMENT — AUTH VALIDATORS
// ================================================================
// Inathibitisha input za mtumiaji kwa kutumia Zod
// ================================================================

const { z } = require('zod');

// ================================================================
// LOGIN VALIDATOR
// ================================================================
const loginSchema = z.object({
    email: z.string()
        .min(1, 'Email inahitajika')
        .email('Email si sahihi'),
    password: z.string()
        .min(6, 'Password iwe angalau 6 characters')
});

// ================================================================
// CHANGE PASSWORD VALIDATOR
// ================================================================
const changePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, 'Password ya sasa inahitajika'),
    newPassword: z.string()
        .min(6, 'Password mpya iwe angalau 6 characters')
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
    loginSchema,
    changePasswordSchema,
    validate
};