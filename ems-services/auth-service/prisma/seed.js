"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_1 = require("../generated/prisma");
var bcrypt = require("bcryptjs");
var prisma = new prisma_1.PrismaClient();
var adminUsers = [
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
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var existingAdmins, _i, adminUsers_1, userData, hashedPassword, createdUser, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Starting admin user seeding...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 8, , 9]);
                    return [4 /*yield*/, prisma.user.count({
                            where: { role: prisma_1.Role.ADMIN }
                        })];
                case 2:
                    existingAdmins = _a.sent();
                    if (existingAdmins > 0) {
                        console.log("\uD83D\uDCCA Found ".concat(existingAdmins, " existing admin users. Skipping seeding to avoid duplicates."));
                        return [2 /*return*/];
                    }
                    _i = 0, adminUsers_1 = adminUsers;
                    _a.label = 3;
                case 3:
                    if (!(_i < adminUsers_1.length)) return [3 /*break*/, 7];
                    userData = adminUsers_1[_i];
                    return [4 /*yield*/, bcrypt.hash(userData.password, 12)];
                case 4:
                    hashedPassword = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                name: userData.name,
                                email: userData.email,
                                password: hashedPassword,
                                role: userData.role,
                                emailVerified: userData.emailVerified,
                                isActive: userData.isActive
                            }
                        })];
                case 5:
                    createdUser = _a.sent();
                    console.log("\u2705 Created admin user: ".concat(createdUser.name, " (").concat(createdUser.email, ") - ID: ").concat(createdUser.id));
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 3];
                case 7:
                    console.log("\uD83C\uDF89 Successfully seeded ".concat(adminUsers.length, " admin users!"));
                    console.log('📝 Admin credentials:');
                    adminUsers.forEach(function (user) {
                        console.log("   Email: ".concat(user.email, " | Password: ").concat(user.password));
                    });
                    return [3 /*break*/, 9];
                case 8:
                    error_1 = _a.sent();
                    console.error('❌ Error seeding admin users:', error_1);
                    throw error_1;
                case 9: return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error('💥 Seeding failed:', e);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                console.log('🔌 Database connection closed.');
                return [2 /*return*/];
        }
    });
}); });
