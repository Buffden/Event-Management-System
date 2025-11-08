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
var prisma = new prisma_1.PrismaClient();
var venueData = [
    {
        name: 'Grand Conference Center',
        address: '123 Main Street, Downtown District, City Center, 10001',
        capacity: 800,
        openingTime: '06:00',
        closingTime: '22:00'
    },
    {
        name: 'Tech Innovation Hub',
        address: '456 Innovation Drive, Tech Quarter, Silicon Valley, 94000',
        capacity: 350,
        openingTime: '06:00',
        closingTime: '21:00'
    },
    {
        name: 'Community Hall',
        address: '789 Community Lane, Residential Area, Suburbia, 20002',
        capacity: 150,
        openingTime: '06:00',
        closingTime: '23:00'
    },
    {
        name: 'University Auditorium',
        address: '321 Campus Boulevard, University District, College Town, 30003',
        capacity: 600,
        openingTime: '06:00',
        closingTime: '24:00'
    },
    {
        name: 'Business Center',
        address: '654 Corporate Plaza, Financial District, Metro City, 40004',
        capacity: 300,
        openingTime: '06:00',
        closingTime: '20:30'
    },
    {
        name: 'Cultural Arts Center',
        address: '987 Arts Avenue, Cultural Quarter, Heritage City, 50005',
        capacity: 250,
        openingTime: '06:00',
        closingTime: '22:00'
    },
    {
        name: 'Sports Complex',
        address: '147 Athletic Way, Sports District, Fitness City, 60006',
        capacity: 200,
        openingTime: '06:00',
        closingTime: '23:00'
    },
    {
        name: 'Hotel Conference Room',
        address: '258 Hospitality Street, Hotel District, Tourist City, 70007',
        capacity: 100,
        openingTime: '06:00',
        closingTime: '22:00'
    },
    {
        name: 'Exhibition Center',
        address: '741 Trade Fair Boulevard, Exhibition District, Commerce City, 90009',
        capacity: 500,
        openingTime: '06:00',
        closingTime: '18:00'
    }
];
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var existingVenues, _i, venueData_1, venue, createdVenue, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Starting venue seeding...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, prisma.venue.count()];
                case 2:
                    existingVenues = _a.sent();
                    if (existingVenues > 0) {
                        console.log("\uD83D\uDCCA Found ".concat(existingVenues, " existing venues. Skipping seeding to avoid duplicates."));
                        return [2 /*return*/];
                    }
                    _i = 0, venueData_1 = venueData;
                    _a.label = 3;
                case 3:
                    if (!(_i < venueData_1.length)) return [3 /*break*/, 6];
                    venue = venueData_1[_i];
                    return [4 /*yield*/, prisma.venue.create({
                            data: venue
                        })];
                case 4:
                    createdVenue = _a.sent();
                    console.log("\u2705 Created venue: ".concat(createdVenue.name, " (ID: ").concat(createdVenue.id, ")"));
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    console.log("\uD83C\uDF89 Successfully seeded ".concat(venueData.length, " venues!"));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _a.sent();
                    console.error('❌ Error seeding venues:', error_1);
                    throw error_1;
                case 8: return [2 /*return*/];
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
