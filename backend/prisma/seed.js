// ================================================================
// MAK DC INVESTMENT — SEED DATA
// ================================================================
// File hii inaunda Super Admin na data ya kuanzia
// ================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('');
    console.log('════════════════════════════════════════════════');
    console.log('  🌱 MAK DC INVESTMENT — SEEDING DATABASE');
    console.log('════════════════════════════════════════════════');
    console.log('');

    // ============================================================
    // 1. UNDA SUPER ADMIN (Mother Account)
    // ============================================================
    const superAdminPassword = 'SuperAdmin@2026';
    const superAdminHash = await bcrypt.hash(superAdminPassword, 10);

    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@makdc.co.tz' },
        update: {},
        create: {
            email: 'superadmin@makdc.co.tz',
            passwordHash: superAdminHash,
            fullName: 'Super Administrator',
            role: 'SuperAdmin',
            department: 'IT',
            phone: '+255 754 123 456',
            employeeId: 'EMP-000',
            status: 'Active'
        }
    });
    console.log('✅ Super Admin ameundwa!');
    console.log(`   📧 Email:    ${superAdmin.email}`);
    console.log(`   🔑 Password: ${superAdminPassword}`);
    console.log('');

    // ============================================================
    // 2. UNDA CEO
    // ============================================================
    const ceoPassword = 'Admin@2026';
    const ceoHash = await bcrypt.hash(ceoPassword, 10);

    const ceo = await prisma.user.upsert({
        where: { email: 'ceo@makdc.co.tz' },
        update: {},
        create: {
            email: 'ceo@makdc.co.tz',
            passwordHash: ceoHash,
            fullName: 'CEO',
            role: 'CEO',
            department: 'Management',
            phone: '+255 754 123 456',
            employeeId: 'EMP-001',
            status: 'Active'
        }
    });
    console.log('✅ CEO ameundwa!');
    console.log(`   📧 Email:    ${ceo.email}`);
    console.log(`   🔑 Password: ${ceoPassword}`);
    console.log('');

    // ============================================================
    // 3. UNDA MANAGER
    // ============================================================
    const managerPassword = 'Manager@2026';
    const managerHash = await bcrypt.hash(managerPassword, 10);

    const manager = await prisma.user.upsert({
        where: { email: 'manager@makdc.co.tz' },
        update: {},
        create: {
            email: 'manager@makdc.co.tz',
            passwordHash: managerHash,
            fullName: 'Operations Manager',
            role: 'Manager',
            department: 'Operations',
            phone: '+255 754 123 456',
            employeeId: 'EMP-002',
            status: 'Active'
        }
    });
    console.log('✅ Manager ameundwa!');
    console.log(`   📧 Email:    ${manager.email}`);
    console.log(`   🔑 Password: ${managerPassword}`);
    console.log('');

    // ============================================================
    // 4. UNDA FINANCE
    // ============================================================
    const financePassword = 'Finance@2026';
    const financeHash = await bcrypt.hash(financePassword, 10);

    const finance = await prisma.user.upsert({
        where: { email: 'finance@makdc.co.tz' },
        update: {},
        create: {
            email: 'finance@makdc.co.tz',
            passwordHash: financeHash,
            fullName: 'Finance Officer',
            role: 'Finance',
            department: 'Finance',
            phone: '+255 754 123 456',
            employeeId: 'EMP-003',
            status: 'Active'
        }
    });
    console.log('✅ Finance Officer ameundwa!');
    console.log(`   📧 Email:    ${finance.email}`);
    console.log(`   🔑 Password: ${financePassword}`);
    console.log('');

    // ============================================================
    // 5. UNDA SALES
    // ============================================================
    const salesPassword = 'Sales@2026';
    const salesHash = await bcrypt.hash(salesPassword, 10);

    const sales = await prisma.user.upsert({
        where: { email: 'sales@makdc.co.tz' },
        update: {},
        create: {
            email: 'sales@makdc.co.tz',
            passwordHash: salesHash,
            fullName: 'Sales Manager',
            role: 'Sales',
            department: 'Sales',
            phone: '+255 754 123 456',
            employeeId: 'EMP-004',
            status: 'Active'
        }
    });
    console.log('✅ Sales Manager ameundwa!');
    console.log(`   📧 Email:    ${sales.email}`);
    console.log(`   🔑 Password: ${salesPassword}`);
    console.log('');

    // ============================================================
    // 6. UNDA SITE CONTENT (kwa Super Admin kubadili)
    // ============================================================
    const siteContentDefaults = [
        { key: 'hero_title', value: 'Quality Service is Our Priority', category: 'hero' },
        { key: 'hero_subtitle', value: 'A trusted partner in quality concrete blocks, building materials, and services that support Tanzania\'s sustainable growth.', category: 'hero' },
        { key: 'about_text', value: 'MAK DC Investment Company Limited is a construction materials company focused on quality concrete blocks, reliable building materials, and services that support Tanzania\'s growing communities.', category: 'about' },
        { key: 'hero_side_text', value: 'A trusted supplier of quality construction materials across Tanzania — helping builders and contractors operate efficiently since 2006.', category: 'hero' },
        { key: 'company_motto', value: 'Quality service is our priority.', category: 'global' },
        { key: 'contact_email', value: 'info@makdc.co.tz', category: 'contact' },
        { key: 'contact_phone', value: '+255 754 123 456', category: 'contact' },
        { key: 'contact_address', value: 'Makete District Council SPV, Makete, Njombe, Tanzania', category: 'contact' }
    ];

    for (const content of siteContentDefaults) {
        await prisma.siteContent.upsert({
            where: { key: content.key },
            update: {},
            create: content
        });
    }
    console.log(`✅ Site Content imeundwa (${siteContentDefaults.length} entries)!`);
    console.log('');

    console.log('════════════════════════════════════════════════');
    console.log('  🎉 SEEDING IMEKAMILIKA!');
    console.log('════════════════════════════════════════════════');
    console.log('');
    console.log('📋 ACCOUNTS ZILIZOUNDWA:');
    console.log('');
    console.log('  🦸 Super Admin:  superadmin@makdc.co.tz / SuperAdmin@2026');
    console.log('  👔 CEO:          ceo@makdc.co.tz / Admin@2026');
    console.log('  📋 Manager:      manager@makdc.co.tz / Manager@2026');
    console.log('  💰 Finance:      finance@makdc.co.tz / Finance@2026');
    console.log('  📈 Sales:        sales@makdc.co.tz / Sales@2026');
    console.log('');
    console.log('⚠️  BADILISHA PASSWORD BAADA YA LOGIN YA KWANZA!');
    console.log('');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });