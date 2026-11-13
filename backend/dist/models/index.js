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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventRegistration = void 0;
// Existing 10 Models
__exportStar(require("./Announcement.js"), exports);
__exportStar(require("./User.js"), exports);
__exportStar(require("./Post.js"), exports);
__exportStar(require("./Community.js"), exports);
__exportStar(require("./Opportunity.js"), exports);
__exportStar(require("./Application.js"), exports);
__exportStar(require("./ResearchPaper.js"), exports);
__exportStar(require("./ResearchCollaboration.js"), exports);
__exportStar(require("./Subscription.js"), exports);
__exportStar(require("./Notification.js"), exports);
__exportStar(require("./Report.js"), exports);
// New 11 Domain Models
__exportStar(require("./ResearchReview.js"), exports);
__exportStar(require("./MentorshipBinding.js"), exports);
__exportStar(require("./AcademicCalendar.js"), exports);
__exportStar(require("./Timetable.js"), exports);
__exportStar(require("./UploadedFile.js"), exports);
__exportStar(require("./Connection.js"), exports);
__exportStar(require("./MentorshipRequest.js"), exports);
__exportStar(require("./CareerQuestion.js"), exports);
__exportStar(require("./Conversation.js"), exports);
__exportStar(require("./Message.js"), exports);
__exportStar(require("./AuditLog.js"), exports);
__exportStar(require("./Event.js"), exports);
var EventRegistration_js_1 = require("./EventRegistration.js");
Object.defineProperty(exports, "EventRegistration", { enumerable: true, get: function () { return EventRegistration_js_1.EventRegistration; } });
