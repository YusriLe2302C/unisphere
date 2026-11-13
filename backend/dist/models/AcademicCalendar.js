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
exports.AcademicCalendar = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AcademicEventSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: {
        type: String,
        enum: [
            'semester_start',
            'semester_end',
            'exam',
            'internal_assessment',
            'academic_deadline',
            'college_event',
            'holiday',
            'cultural_fest',
            'sports_meet',
            'workshop',
            'registration_deadline',
            'other'
        ],
        default: 'other'
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isHoliday: { type: Boolean, default: false },
    targetDepartments: { type: [String], default: [] },
    targetBatches: { type: [String], default: [] }
}, { _id: true });
const AcademicCalendarSchema = new mongoose_1.Schema({
    institution: { type: String, required: true, trim: true, index: true },
    collegeId: { type: String, trim: true, index: true },
    academicYear: { type: String, required: true, trim: true },
    semesterType: {
        type: String,
        enum: ['odd', 'even', 'annual'],
        required: true
    },
    events: { type: [AcademicEventSchema], default: [] },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false, index: true }
}, { timestamps: true });
AcademicCalendarSchema.index({ institution: 1, academicYear: 1, semesterType: 1 }, { unique: true });
exports.AcademicCalendar = mongoose_1.default.model('AcademicCalendar', AcademicCalendarSchema);
