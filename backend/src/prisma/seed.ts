import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create branches
    const branch1 = await prisma.branch.create({
        data: {
            name: 'Dhanmondi Branch',
            address: 'House 10, Road 15, Dhanmondi, Dhaka',
            contactNumber: '+880-1234-567890',
        },
    });

    const branch2 = await prisma.branch.create({
        data: {
            name: 'Gulshan Branch',
            address: 'House 25, Road 11, Gulshan-1, Dhaka',
            contactNumber: '+880-1234-567891',
        },
    });

    console.log('✅ Created branches');

    // Create Super Admin
    const superAdmin = await prisma.user.create({
        data: {
            name: 'Super Admin',
            email: 'admin@10minuteschool.com',
            role: 'SUPER_ADMIN',
            hashedPassword: await bcrypt.hash('admin123', 10),
        },
    });

    // Create Branch Admins
    const branchAdmin1 = await prisma.user.create({
        data: {
            name: 'Dhanmondi Admin',
            email: 'dhanmondi@10minuteschool.com',
            role: 'BRANCH_ADMIN',
            branchId: branch1.id,
            hashedPassword: await bcrypt.hash('admin123', 10),
        },
    });

    const branchAdmin2 = await prisma.user.create({
        data: {
            name: 'Gulshan Admin',
            email: 'gulshan@10minuteschool.com',
            role: 'BRANCH_ADMIN',
            branchId: branch2.id,
            hashedPassword: await bcrypt.hash('admin123', 10),
        },
    });

    // Create Teachers
    const teacher1 = await prisma.user.create({
        data: {
            name: 'Sarah Ahmed',
            email: 'sarah@10minuteschool.com',
            role: 'TEACHER',
            branchId: branch1.id,
            hashedPassword: await bcrypt.hash('teacher123', 10),
        },
    });

    const teacher2 = await prisma.user.create({
        data: {
            name: 'John Smith',
            email: 'john@10minuteschool.com',
            role: 'TEACHER',
            branchId: branch2.id,
            hashedPassword: await bcrypt.hash('teacher123', 10),
        },
    });

    // Create Sample Students
    const student1 = await prisma.user.create({
        data: {
            name: 'Ahmed Rahman',
            phoneNumber: '+8801712345678',
            role: 'STUDENT',
        },
    });

    const student2 = await prisma.user.create({
        data: {
            name: 'Fatima Khan',
            phoneNumber: '+8801812345678',
            role: 'STUDENT',
        },
    });

    console.log('✅ Created users');

    // Create sample slots for next week
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const slots = [];
    for (let i = 0; i < 5; i++) {
        const slotDate = new Date(nextWeek);
        slotDate.setDate(nextWeek.getDate() + i);

        // Morning slots
        slots.push(
            await prisma.slot.create({
                data: {
                    branchId: branch1.id,
                    teacherId: teacher1.id,
                    date: slotDate,
                    startTime: '09:00',
                    endTime: '09:30',
                    capacity: 1,
                },
            }),
            await prisma.slot.create({
                data: {
                    branchId: branch1.id,
                    teacherId: teacher1.id,
                    date: slotDate,
                    startTime: '10:00',
                    endTime: '10:30',
                    capacity: 1,
                },
            }),
            await prisma.slot.create({
                data: {
                    branchId: branch2.id,
                    teacherId: teacher2.id,
                    date: slotDate,
                    startTime: '11:00',
                    endTime: '11:30',
                    capacity: 1,
                },
            })
        );
    }

    console.log('✅ Created sample slots');

    // Create system settings
    await prisma.systemSetting.createMany({
        data: [
            {
                key: 'BOOKING_CANCELLATION_HOURS',
                value: '24',
                description: 'Minimum hours before slot time to allow cancellation',
                updatedBy: superAdmin.id,
            },
            {
                key: 'MAX_BOOKINGS_PER_MONTH',
                value: '1',
                description: 'Maximum bookings allowed per student per month',
                updatedBy: superAdmin.id,
            },
            {
                key: 'SMS_REMINDER_HOURS',
                value: '24',
                description: 'Hours before slot to send SMS reminder',
                updatedBy: superAdmin.id,
            },
            {
                key: 'IELTS_MIN_SCORE',
                value: '0',
                description: 'Minimum IELTS score allowed',
                updatedBy: superAdmin.id,
            },
            {
                key: 'IELTS_MAX_SCORE',
                value: '9',
                description: 'Maximum IELTS score allowed',
                updatedBy: superAdmin.id,
            },
        ],
    });

    console.log('✅ Created system settings');

    console.log('🎉 Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Super Admin: admin@10minuteschool.com / admin123');
    console.log('Branch Admin (Dhanmondi): dhanmondi@10minuteschool.com / admin123');
    console.log('Branch Admin (Gulshan): gulshan@10minuteschool.com / admin123');
    console.log('Teacher (Sarah): sarah@10minuteschool.com / teacher123');
    console.log('Teacher (John): john@10minuteschool.com / teacher123');
    console.log('Student 1: +8801712345678');
    console.log('Student 2: +8801812345678');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });