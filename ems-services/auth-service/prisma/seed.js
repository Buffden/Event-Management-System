"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../generated/prisma");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new prisma_1.PrismaClient();
const adminUsers = [
    {
        name: 'System Administrator',
        email: 'admin@eventmanagement.com',
        password: 'Admin123!',
        role: prisma_1.Role.ADMIN,
        emailVerified: new Date(),
        isActive: true
    },
    {
        name: 'Event Manager',
        email: 'manager@eventmanagement.com',
        password: 'Manager123!',
        role: prisma_1.Role.ADMIN,
        emailVerified: new Date(),
        isActive: true
    },
    {
        name: 'Super Admin',
        email: 'superadmin@eventmanagement.com',
        password: 'SuperAdmin123!',
        role: prisma_1.Role.ADMIN,
        emailVerified: new Date(),
        isActive: true
    }
];
async function main() {
    console.log('🌱 Starting admin user seeding...');
    try {
        // Check if admin users already exist
        const existingAdmins = await prisma.user.count({
            where: { role: prisma_1.Role.ADMIN }
        });
        if (existingAdmins > 0) {
            console.log(`📊 Found ${existingAdmins} existing admin users. Skipping seeding to avoid duplicates.`);
            return;
        }
        // Hash passwords and create admin users
        for (const userData of adminUsers) {
            const hashedPassword = await bcryptjs_1.default.hash(userData.password, 12);
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
    }
    catch (error) {
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
