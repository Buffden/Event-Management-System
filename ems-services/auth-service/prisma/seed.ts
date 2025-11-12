import {PrismaClient, Role} from '../generated/prisma';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const adminUsers = [
    {
        name: 'System Administrator',
        email: 'admin@eventmanagement.com',
        password: 'Admin123!',
        role: Role.ADMIN,
        emailVerified: new Date(),
        isActive: true
    },
    {
        name: 'Ashwin Athappan',
        email: 'ashwinathappank@yahoo.com',
        password: 'Speaker123!',
        role: Role.SPEAKER,
        emailVerified: new Date(),
        isActive: true
    },
    {
        name: 'User 1',
        email: '085.ashwin@gmail.com',
        password: 'User123!',
        role: Role.USER,
        emailVerified: new Date(),
        isActive: true
    }
];

async function main() {
    console.log('🌱 Starting admin user seeding...');

    try {
        // Check if admin users already exist
        const existingAdmins = await prisma.user.count({
            where: {role: Role.ADMIN}
        });

        if (existingAdmins > 0) {
            console.log(`📊 Found ${existingAdmins} existing admin users. Skipping seeding to avoid duplicates.`);
            return;
        }

        // Hash passwords and create admin users
        for (const userData of adminUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, 12);

            const createdUser = await prisma.user.create({
                data: {
                    name: userData.name,
                    email: userData.email,
                    password: hashedPassword,
                    role: userData.role,
                    emailVerified: userData.emailVerified,
                    isActive: userData.isActive
                }
            });

            console.log(`✅ Created admin user: ${createdUser.name} (${createdUser.email}) - ID: ${createdUser.id}`);
        }

        console.log(`🎉 Successfully seeded ${adminUsers.length} admin users!`);
        console.log('📝 Admin credentials:');
        adminUsers.forEach(user => {
            console.log(`   Email: ${user.email} | Password: ${user.password}`);
        });
    } catch (error) {
        console.error('❌ Error seeding admin users:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('💥 Seeding failed:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('🔌 Database connection closed.');
    });
