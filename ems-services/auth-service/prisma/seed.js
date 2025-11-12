"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../generated/prisma");
const bcrypt = __importStar(require("bcryptjs"));
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
        name: 'Ashwin Athappan',
        email: 'ashwinathappank@yahoo.com',
        password: 'Speaker123!',
        role: prisma_1.Role.SPEAKER,
        emailVerified: new Date(),
        isActive: true
    },
    {
        name: 'User 1',
        email: '085.ashwin@gmail.com',
        password: 'User123!',
        role: prisma_1.Role.USER,
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
