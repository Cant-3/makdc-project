// ================================================================
// MAK DC INVESTMENT — USER VALIDATORS
// ================================================================

const { z } = require('zod');

// ================================================================
// CREATE USER SCHEMA
// ================================================================
const createUserSchema = z.object({
    fullName: z.string()
        .min(2, 'Full name must be at least 2 characters')
        .max(100, 'Full name is too long'),
    email: z.string()
        .min(1, 'Email is required')
        .email('Invalid email format'),
    password: z.string()
        .min(6, 'Password must be at least 6 characters'),
    role: z.enum([
        'SuperAdmin',
        'CEO',
        'Manager',
        'Finance',
        'Sales',
        'Procurement',
        'Lawyer',
        'Engineer'
    ], { errorMap: () => ({ message: 'Invalid role' }) }),
    department: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    employeeId: z.string().optional().or(z.literal('')),
    status: z.enum(['Active', 'Inactive']).optional()
});

// ================================================================
// UPDATE USER SCHEMA
// ================================================================
const updateUserSchema = z.object({
    fullName: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum([
        'SuperAdmin',
        'CEO',
        'Manager',
        'Finance',
        'Sales',
        'Procurement',
        'Lawyer',
        'Engineer'
    ]).optional(),
    department: z.string().optional(),
    phone: z.string().optional(),
    employeeId: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional()
});

// ================================================================
// UPDATE OWN PROFILE SCHEMA
// ================================================================
const updateOwnProfileSchema = z.object({
    phone: z.string()
        .min(9, 'Phone number too short')
        .max(30, 'Phone number too long')
        .optional(),
    profilePic: z.string()
        .max(5000000, 'Profile picture too large (max ~3.5MB)')
        .nullable()
        .optional()
});

// ================================================================
// VALIDATE MIDDLEWARE
// ================================================================
function validate(schema) {
    return (req, res, next) => {
        // ⭐ IMPORTANT: Schema must exist!
        if (!schema) {
            console.error('❌ VALIDATOR: schema is undefined!');
            return res.status(500).json({ error: 'Server configuration error.' });
        }
        
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            console.error('❌ Validation error:', err.errors);
            
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

// ================================================================
// EXPORTS — WOTE MWISHO!
// ================================================================
module.exports = {
    createUserSchema,
    updateUserSchema,
    updateOwnProfileSchema,  // ← ⭐ HAPA!
    validate
};