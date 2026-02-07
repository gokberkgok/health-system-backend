// Database seed script - Create initial data for development
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create plans
    const basicPlan = await prisma.plan.upsert({
        where: { key: 'BASIC' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000010',
            key: 'BASIC',
            name: 'Standart',
            isActive: true,
        },
    });
    console.log('✓ BASIC plan created:', basicPlan.name);

    const premiumPlan = await prisma.plan.upsert({
        where: { key: 'PREMIUM' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000011',
            key: 'PREMIUM',
            name: 'Premium',
            isActive: true,
        },
    });
    console.log('✓ PREMIUM plan created:', premiumPlan.name);

    // Create demo company with PREMIUM plan
    const company = await prisma.company.upsert({
        where: { id: '00000000-0000-0000-0000-000000000001' },
        update: {},
        create: {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Healthy Living Center - İstanbul',
            planId: premiumPlan.id,
        },
    });
    console.log('✓ Company created:', company.name);

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin123!', 12);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            companyId: company.id,
            email: 'admin@example.com',
            passwordHash: adminPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
        },
    });
    console.log('✓ Admin user created:', admin.email);

    // Create staff user
    const staffPassword = await bcrypt.hash('Staff123!', 12);
    const staff = await prisma.user.upsert({
        where: { email: 'staff@example.com' },
        update: {},
        create: {
            companyId: company.id,
            email: 'staff@example.com',
            passwordHash: staffPassword,
            firstName: 'Staff',
            lastName: 'Member',
            role: 'STAFF',
        },
    });
    console.log('✓ Staff user created:', staff.email);

    // Create default devices
    const devices = ['VacuActiv', 'RollShape', 'EmFit'];
    for (const deviceName of devices) {
        await prisma.device.upsert({
            where: {
                companyId_name: {
                    companyId: company.id,
                    name: deviceName,
                },
            },
            update: {},
            create: {
                companyId: company.id,
                name: deviceName,
                deviceCount: 1,
            },
        });
    }
    console.log('✓ Devices created:', devices.join(', '));

    // Create sample customers
    const customers = [
        {
            fullName: 'Ayşe Yılmaz',
            tcIdentity: '12345678901',
            birthDate: new Date('1985-03-15'),
            gender: 'female',
            heightCm: 165,
            phone: '05321234567'
        },
        {
            fullName: 'Mehmet Kaya',
            tcIdentity: '98765432109',
            birthDate: new Date('1978-07-22'),
            gender: 'male',
            heightCm: 180,
            phone: '05329876543'
        },
        {
            fullName: 'Fatma Demir',
            tcIdentity: '45678912345',
            birthDate: new Date('1990-11-08'),
            gender: 'female',
            heightCm: 158,
            phone: '05334567891'
        },
    ];

    for (const customerData of customers) {
        // Use unique tcIdentity for upsert instead of ID
        await prisma.customer.upsert({
            where: {
                companyId_tcIdentity: {
                    companyId: company.id,
                    tcIdentity: customerData.tcIdentity,
                },
            },
            update: {},
            create: {
                companyId: company.id,
                ...customerData,
            },
        });
    }
    console.log('✓ Sample customers created:', customers.length);

    console.log('\n🎉 Seeding completed!');
    console.log('\n📝 Login credentials:');
    console.log('   Admin: admin@example.com / Admin123!');
    console.log('   Staff: staff@example.com / Staff123!');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
