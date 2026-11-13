"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const auth_js_1 = require("../middleware/auth.js");
const upload_js_1 = require("../middleware/upload.js");
const index_js_1 = require("../services/storage/index.js");
const UploadedFile_js_1 = require("../models/UploadedFile.js");
const Event_js_1 = require("../models/Event.js");
const ResearchPaper_js_1 = require("../models/ResearchPaper.js");
const Opportunity_js_1 = require("../models/Opportunity.js");
const Post_js_1 = require("../models/Post.js");
const CareerQuestion_js_1 = require("../models/CareerQuestion.js");
const Message_js_1 = require("../models/Message.js");
const Application_js_1 = require("../models/Application.js");
const router = (0, express_1.Router)();
const types = ['post', 'research_paper', 'opportunity', 'application', 'avatar', 'chat_message', 'academic_notice', 'event', 'community_resource', 'profile_image', 'placement_document', 'research_dataset', 'project_document', 'career_question'];
const clean = (name) => path_1.default.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file';
const isAuthority = (u) => ['admin', 'superadmin', 'dean', 'principal'].includes(u.role);
router.post('/', auth_js_1.authenticate, (req, res, next) => (0, upload_js_1.uploadSingle)(req, res, (err) => err ? res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: err.message }) : next()), async (req, res) => {
    let key = '';
    try {
        const file = req.file;
        const u = req.user;
        if (!file)
            return res.status(400).json({ message: 'A valid file is required.' });
        if (!(0, upload_js_1.verifySignature)(file.mimetype, file.buffer))
            return res.status(415).json({ message: 'File signature does not match the declared MIME type.' });
        const entityType = String(req.body.associatedEntityType || '');
        if (!types.includes(entityType))
            return res.status(400).json({ message: 'Unsupported associatedEntityType.' });
        const accessPolicy = String(req.body.accessPolicy || 'private');
        if (!['public', 'institutional', 'restricted', 'private'].includes(accessPolicy))
            return res.status(400).json({ message: 'Invalid accessPolicy.' });
        const entityId = req.body.associatedEntityId || undefined;
        if (entityType === 'placement_document' && accessPolicy !== 'private')
            return res.status(400).json({ message: 'Placement documents and resumes must remain private.' });
        if (entityType === 'application' && accessPolicy !== 'private')
            return res.status(400).json({ message: 'Application documents must remain private.' });
        if (entityType === 'chat_message' && accessPolicy !== 'private')
            return res.status(400).json({ message: 'Chat attachments must remain private.' });
        if (entityType === 'career_question' && accessPolicy !== 'private')
            return res.status(400).json({ message: 'Career question attachments must use private access.' });
        if (entityId) {
            let allowed = false;
            if (entityType === 'event') {
                const e = await Event_js_1.Event.findById(entityId);
                allowed = Boolean(e && (e.organizer.toString() === u._id.toString() || isAuthority(u) && (u.role === 'admin' || u.institution === e.institution)));
            }
            if (entityType === 'research_paper' || entityType === 'research_dataset' || entityType === 'project_document') {
                const p = await ResearchPaper_js_1.ResearchPaper.findById(entityId);
                allowed = Boolean(p && (p.submittedBy.toString() === u._id.toString() || isAuthority(u) && (u.role === 'admin' || u.institution === p.institution)));
            }
            if (entityType === 'opportunity' || entityType === 'placement_document') {
                const o = await Opportunity_js_1.Opportunity.findById(entityId);
                allowed = Boolean(o && (o.postedBy.toString() === u._id.toString() || isAuthority(u) && (u.role === 'admin' || u.institution === o.institution)));
            }
            if (entityType === 'application')
                allowed = Boolean(req.body.accessPolicy === 'private' && u.role === 'student');
            if (entityType === 'post' || entityType === 'community_resource') {
                const p = await Post_js_1.Post.findById(entityId);
                allowed = Boolean(p && p.author.toString() === u._id.toString());
            }
            if (entityType === 'career_question') {
                const q = await CareerQuestion_js_1.CareerQuestion.findById(entityId).select('+attachmentIds');
                allowed = Boolean(q && (q.author.toString() === u._id.toString() || q.assignedMentor?.toString() === u._id.toString()));
            }
            if (entityType === 'chat_message') {
                const m = await Message_js_1.Message.findById(entityId);
                allowed = Boolean(m && m.sender.toString() === u._id.toString());
            }
            if (!allowed)
                return res.status(403).json({ message: 'Not authorized to attach a file to this entity.' });
        }
        if (entityType === 'avatar' || entityType === 'profile_image') {
            if (accessPolicy !== 'private' && accessPolicy !== 'public')
                return res.status(400).json({ message: 'Profile images must be private or public.' });
            if (entityId && entityId !== u._id.toString())
                return res.status(403).json({ message: 'A user may upload a profile image only for their own account.' });
        }
        const ext = (0, upload_js_1.safeExtension)(file.originalname);
        const objectKey = (0, upload_js_1.storageKey)(ext);
        key = objectKey;
        const saved = await index_js_1.storage.put(objectKey, file.buffer, file.mimetype);
        const record = await UploadedFile_js_1.UploadedFile.create({ uploaderId: u._id, originalFileName: clean(file.originalname), storedFileName: objectKey, mimeType: file.mimetype, fileSizeBytes: saved.size, storageProvider: 'local', filePath: objectKey, sha256Hash: saved.sha256, associatedEntityType: entityType, associatedEntityId: entityId, accessPolicy, institution: u.institution, allowedUserIds: accessPolicy === 'private' ? [u._id] : [], isQuarantined: false, virusScanClean: true });
        res.status(201).json({ file: { _id: record._id, originalFileName: record.originalFileName, mimeType: record.mimeType, fileSizeBytes: record.fileSizeBytes, associatedEntityType: record.associatedEntityType, accessPolicy: record.accessPolicy } });
    }
    catch (e) {
        if (key)
            await index_js_1.storage.delete(key).catch(() => undefined);
        res.status(500).json({ message: e.message || 'File upload failed.' });
    }
});
async function canRead(file, u) {
    if (u.role === 'superadmin' || u.role === 'admin' && (!file.institution || u.institution === file.institution))
        return true;
    if (file.accessPolicy === 'public' && !['placement_document', 'application', 'chat_message', 'career_question'].includes(file.associatedEntityType))
        return true;
    if (file.accessPolicy === 'institutional' && !['placement_document', 'application', 'chat_message', 'career_question'].includes(file.associatedEntityType))
        return file.institution === u.institution;
    if (file.uploaderId.toString() === u._id.toString() || file.allowedUserIds.some((x) => x.toString() === u._id.toString()))
        return true;
    if (!file.associatedEntityId)
        return false;
    if (file.associatedEntityType === 'event') {
        const e = await Event_js_1.Event.findById(file.associatedEntityId);
        return Boolean(e && e.institution === u.institution && (e.status === 'published' || e.status === 'ongoing' || e.organizer.toString() === u._id.toString()));
    }
    if (['research_paper', 'research_dataset', 'project_document'].includes(file.associatedEntityType)) {
        const p = await ResearchPaper_js_1.ResearchPaper.findById(file.associatedEntityId);
        return Boolean(p && p.institution === u.institution && (p.lifecycleStatus === 'published' || p.submittedBy.toString() === u._id.toString() || p.assignedProctorId?.toString() === u._id.toString() || (p.assignedProjectGuideIds || []).some(x => x.toString() === u._id.toString())));
    }
    if (file.associatedEntityType === 'career_question') {
        const q = await CareerQuestion_js_1.CareerQuestion.findById(file.associatedEntityId);
        return Boolean(q && q.institution === u.institution && (q.visibility === 'public' || q.author.toString() === u._id.toString() || q.assignedMentor?.toString() === u._id.toString() || q.answers.some((a) => a.responder.toString() === u._id.toString()) || q.followUps.some((f) => f.author.toString() === u._id.toString())));
    }
    if (file.associatedEntityType === 'application') {
        const application = await Application_js_1.Application.findById(file.associatedEntityId).populate('opportunity', 'postedBy institution isPlacementDrive');
        const opportunity = application?.opportunity;
        return Boolean(application && (application.applicant.toString() === u._id.toString() || opportunity?.postedBy?.toString() === u._id.toString() || opportunity?.institution === u.institution && (isAuthority(u) || u.responsibilities?.includes('placement_coordinator'))));
    }
    if (file.associatedEntityType === 'chat_message') {
        const message = await Message_js_1.Message.findById(file.associatedEntityId);
        return Boolean(message && await (await import('../models/Conversation.js')).Conversation.exists({ _id: message.conversationId, participants: u._id }));
    }
    if (file.associatedEntityType === 'opportunity' || file.associatedEntityType === 'placement_document') {
        const o = await Opportunity_js_1.Opportunity.findById(file.associatedEntityId);
        return Boolean(o && o.institution === u.institution && (!o.isPlacementDrive || u.role === 'student' && u.isPlacementEligible === true || isAuthority(u) || u.responsibilities?.includes('placement_coordinator')));
    }
    return false;
}
router.get('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const file = await UploadedFile_js_1.UploadedFile.findById(req.params.id);
        if (!file || file.isQuarantined || !file.virusScanClean)
            return res.status(404).json({ message: 'File not found.' });
        if (!await canRead(file, req.user))
            return res.status(403).json({ message: 'Not authorized to access this file.' });
        const data = await index_js_1.storage.get(file.storedFileName);
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Length', String(data.length));
        res.setHeader('Content-Disposition', `inline; filename="${clean(file.originalFileName)}"`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.send(data);
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'File download failed.' });
    }
});
router.put('/:id/replace', auth_js_1.authenticate, (req, res, next) => (0, upload_js_1.uploadSingle)(req, res, (err) => err ? res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: err.message }) : next()), async (req, res) => {
    let newKey = '';
    try {
        const old = await UploadedFile_js_1.UploadedFile.findById(req.params.id);
        if (!old)
            return res.status(404).json({ message: 'File not found.' });
        const u = req.user;
        if (old.uploaderId.toString() !== u._id.toString() && !(isAuthority(u) && (u.role === 'admin' || old.institution === u.institution)))
            return res.status(403).json({ message: 'Only the uploader or authorized institution authority may replace this file.' });
        if (!req.file || !(0, upload_js_1.verifySignature)(req.file.mimetype, req.file.buffer))
            return res.status(415).json({ message: 'Replacement file has an invalid signature.' });
        newKey = (0, upload_js_1.storageKey)((0, upload_js_1.safeExtension)(req.file.originalname));
        const saved = await index_js_1.storage.put(newKey, req.file.buffer, req.file.mimetype);
        const oldKey = old.storedFileName;
        old.storedFileName = newKey;
        old.filePath = newKey;
        old.originalFileName = clean(req.file.originalname);
        old.mimeType = req.file.mimetype;
        old.fileSizeBytes = saved.size;
        old.sha256Hash = saved.sha256;
        await old.save();
        await index_js_1.storage.delete(oldKey);
        res.json({ file: { _id: old._id, originalFileName: old.originalFileName, mimeType: old.mimeType, fileSizeBytes: old.fileSizeBytes } });
    }
    catch (e) {
        if (newKey)
            await index_js_1.storage.delete(newKey).catch(() => undefined);
        res.status(500).json({ message: e.message || 'File replacement failed.' });
    }
});
router.delete('/:id', auth_js_1.authenticate, async (req, res) => {
    try {
        const file = await UploadedFile_js_1.UploadedFile.findById(req.params.id);
        if (!file)
            return res.status(404).json({ message: 'File not found.' });
        const u = req.user;
        if (file.uploaderId.toString() !== u._id.toString() && !(isAuthority(u) && (u.role === 'admin' || file.institution === u.institution)))
            return res.status(403).json({ message: 'Only the uploader or authorized institution authority may delete this file.' });
        await index_js_1.storage.delete(file.storedFileName);
        await file.deleteOne();
        res.json({ deleted: true });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'File deletion failed.' });
    }
});
// Safe orphan cleanup: objects with no metadata are removed after an explicit cleanup request.
router.post('/maintenance/orphans', auth_js_1.authenticate, async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role))
            return res.status(403).json({ message: 'Platform administrator required for global orphan cleanup.' });
        const files = await UploadedFile_js_1.UploadedFile.find(req.user.role === 'admin' || req.user.role === 'superadmin' ? {} : { institution: req.user.institution }).select('+filePath');
        const missingMetadataIds = [];
        for (const f of files) {
            try {
                await index_js_1.storage.get(f.storedFileName);
            }
            catch {
                missingMetadataIds.push(f._id.toString());
            }
        }
        const storedKeys = await index_js_1.storage.list?.();
        const known = new Set((await UploadedFile_js_1.UploadedFile.find(req.user.role === 'admin' || req.user.role === 'superadmin' ? {} : { institution: req.user.institution }).select('storedFileName')).map(f => f.storedFileName));
        const orphanKeys = (storedKeys || []).filter(k => !known.has(k));
        if (req.body.cleanup === true) {
            if (!index_js_1.storage.list)
                return res.status(501).json({ message: 'This storage adapter does not support object listing.' });
            await Promise.all(orphanKeys.map(k => index_js_1.storage.delete(k)));
        }
        res.json({ missingMetadataIds, orphanKeys: req.body.cleanup === true ? orphanKeys.length : orphanKeys, dryRun: req.body.cleanup !== true });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
