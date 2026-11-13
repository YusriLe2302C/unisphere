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
exports.TimetableWriteLock = exports.Timetable = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TimetableSlotSchema = new mongoose_1.Schema({
    institution: { type: String, required: true, trim: true, index: true },
    collegeId: { type: String, trim: true, index: true },
    department: { type: String, required: true, trim: true, index: true },
    semester: { type: Number, required: true, min: 1, max: 12 },
    section: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    dayOfWeek: {
        type: Number,
        required: true,
        min: 1,
        max: 7,
        index: true
    },
    startMinutes: {
        type: Number,
        required: true,
        min: 0,
        max: 1440,
        validate: {
            validator: function (val) {
                return this.endMinutes === undefined || val < this.endMinutes;
            },
            message: 'startMinutes must be strictly less than endMinutes'
        }
    },
    endMinutes: {
        type: Number,
        required: true,
        min: 0,
        max: 1440
    },
    courseCode: { type: String, required: true, trim: true, uppercase: true },
    courseName: { type: String, required: true, trim: true },
    facultyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomNumber: { type: String, required: true, trim: true },
    building: { type: String, default: '', trim: true },
    sessionType: { type: String, enum: ['lecture', 'laboratory', 'tutorial', 'exam'], default: 'lecture', index: true },
    effectiveFrom: { type: Date, default: Date.now, index: true },
    effectiveTo: { type: Date },
    revision: { type: Number, default: 1, min: 1 },
    publishedAt: { type: Date },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    sectionId: { type: String, required: true, index: true },
    changeSetId: { type: String, index: true },
    isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });
// Conflict detection indexes for section, faculty, and room schedule queries
TimetableSlotSchema.index({
    institution: 1,
    department: 1,
    semester: 1,
    section: 1,
    dayOfWeek: 1,
    startMinutes: 1,
    endMinutes: 1
});
TimetableSlotSchema.index({ institution: 1, department: 1, academicYear: 1, semester: 1, section: 1, revision: 1, isActive: 1 });
TimetableSlotSchema.index({ facultyId: 1, dayOfWeek: 1, startMinutes: 1, endMinutes: 1 });
TimetableSlotSchema.index({
    roomNumber: 1,
    building: 1,
    dayOfWeek: 1,
    startMinutes: 1,
    endMinutes: 1
});
exports.Timetable = mongoose_1.default.model('Timetable', TimetableSlotSchema);
// A single document per institution/department is atomically incremented before every timetable write.
// This serializes conflict checks even when the database is a standalone MongoDB instance.
const TimetableWriteLockSchema = new mongoose_1.Schema({
    institution: { type: String, required: true },
    department: { type: String, required: true },
    version: { type: Number, default: 0 },
    lockOwner: { type: String },
    lockExpiresAt: { type: Date }
}, { timestamps: true });
TimetableWriteLockSchema.index({ institution: 1, department: 1 }, { unique: true });
exports.TimetableWriteLock = mongoose_1.default.models.TimetableWriteLock || mongoose_1.default.model('TimetableWriteLock', TimetableWriteLockSchema);
