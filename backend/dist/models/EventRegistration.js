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
exports.EventRegistration = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TeamMemberSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'Member' }
}, { _id: false });
const EventRegistrationSchema = new mongoose_1.Schema({
    eventId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
        type: String,
        enum: ['registered', 'waitlisted', 'cancelled', 'attended'],
        default: 'registered',
        index: true
    },
    registeredAt: { type: Date, default: Date.now },
    teamName: { type: String, default: '' },
    teamMembers: { type: [TeamMemberSchema], default: [] },
    seatsAllocated: { type: Number, default: 1, min: 1 },
    attendanceMarked: { type: Boolean, default: false },
    attendedAt: { type: Date },
    ticketCode: { type: String, required: true },
    waitlistPosition: { type: Number },
    cancelledAt: { type: Date },
    cancelledReason: { type: String, default: '' }
}, { timestamps: true });
// Retain cancelled records for idempotent retries while allowing a user to re-register.
EventRegistrationSchema.index({ eventId: 1, userId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['registered', 'waitlisted', 'attended'] } } });
EventRegistrationSchema.index({ eventId: 1, status: 1 });
EventRegistrationSchema.index({ ticketCode: 1 }, { unique: true });
exports.EventRegistration = mongoose_1.default.model('EventRegistration', EventRegistrationSchema);
