"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = require("../middleware/auth.js");
const Conversation_js_1 = require("../models/Conversation.js");
const Message_js_1 = require("../models/Message.js");
const User_js_1 = require("../models/User.js");
const permissions_js_1 = require("../utils/permissions.js");
const router = (0, express_1.Router)();
const populatedParticipants = 'name avatar role institution isActive privacySettings';
router.get('/conversations', auth_js_1.authenticate, async (req, res) => {
    const rows = await Conversation_js_1.Conversation.find({ participants: req.user._id })
        .populate('participants', populatedParticipants)
        .populate('lastMessage')
        .sort({ lastMessageAt: -1 });
    const conversations = rows.filter((conversation) => (0, permissions_js_1.canParticipateInConversation)(req.user._id.toString(), conversation.participants));
    res.json({ conversations });
});
router.post('/conversations/direct', auth_js_1.authenticate, async (req, res) => {
    const otherId = String(req.body.userId || '');
    if (!otherId || otherId === req.user._id.toString()) {
        return res.status(400).json({ message: 'A different userId is required.' });
    }
    const other = await User_js_1.User.findById(otherId);
    if (!other || !(0, permissions_js_1.canMessageUsers)(req.user, other)) {
        return res.status(403).json({ message: 'Direct conversation is not permitted.' });
    }
    const pair = (0, Conversation_js_1.getCanonicalDirectPair)(req.user._id, other._id);
    let conversation = await Conversation_js_1.Conversation.findOne({ canonicalDirectPair: pair });
    if (!conversation) {
        try {
            conversation = await Conversation_js_1.Conversation.create({
                isGroup: false,
                canonicalDirectPair: pair,
                participants: [req.user._id, other._id],
                institution: req.user.institution,
            });
        }
        catch (error) {
            if (error.code !== 11000)
                throw error;
            conversation = await Conversation_js_1.Conversation.findOne({ canonicalDirectPair: pair });
        }
    }
    res.status(200).json({ conversation });
});
router.post('/conversations/group', auth_js_1.authenticate, async (req, res) => {
    const ids = [
        ...new Set([
            req.user._id.toString(),
            ...(Array.isArray(req.body.participantIds) ? req.body.participantIds.map(String) : []),
        ]),
    ];
    if (ids.length < 3 || ids.length > 100) {
        return res.status(400).json({ message: 'Group requires 3 to 100 participants.' });
    }
    const users = await User_js_1.User.find({
        _id: { $in: ids },
        institution: req.user.institution,
        isActive: true,
    }).select('_id role institution isActive privacySettings');
    if (users.length !== ids.length) {
        return res.status(403).json({ message: 'All participants must belong to your institution.' });
    }
    for (let first = 0; first < users.length; first += 1) {
        for (let second = first + 1; second < users.length; second += 1) {
            if (!(0, permissions_js_1.canMessageUsers)(users[first], users[second]) ||
                !(0, permissions_js_1.canMessageUsers)(users[second], users[first])) {
                return res.status(403).json({ message: 'Group conversation is not permitted.' });
            }
        }
    }
    const conversation = await Conversation_js_1.Conversation.create({
        isGroup: true,
        name: String(req.body.name || 'Group').slice(0, 100),
        participants: ids,
        admins: [req.user._id],
        institution: req.user.institution,
    });
    res.status(201).json({ conversation });
});
router.get('/conversations/:id/messages', auth_js_1.authenticate, async (req, res) => {
    const conversation = await Conversation_js_1.Conversation.findById(req.params.id)
        .populate('participants', populatedParticipants);
    if (!conversation ||
        !(0, permissions_js_1.canParticipateInConversation)(req.user._id.toString(), conversation.participants)) {
        return res.status(404).json({ message: 'Conversation not found.' });
    }
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const before = req.query.before ? new Date(String(req.query.before)) : undefined;
    const filter = { conversationId: req.params.id };
    if (before && !Number.isNaN(before.getTime()))
        filter.createdAt = { $lt: before };
    const messages = await Message_js_1.Message.find(filter)
        .populate('sender', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(limit);
    res.json({
        messages: messages.reverse(),
        nextBefore: messages.length ? messages[0].createdAt : null,
    });
});
router.post('/conversations/:id/messages', auth_js_1.authenticate, async (req, res) => {
    const conversation = await Conversation_js_1.Conversation.findById(req.params.id)
        .populate('participants', populatedParticipants);
    if (!conversation ||
        !(0, permissions_js_1.canParticipateInConversation)(req.user._id.toString(), conversation.participants)) {
        return res.status(404).json({ message: 'Conversation not found.' });
    }
    const content = String(req.body.content || '').trim();
    if (!content || content.length > 10000) {
        return res.status(400).json({ message: 'Message must contain 1 to 10000 characters.' });
    }
    if (req.body.clientMessageId) {
        const duplicate = await Message_js_1.Message.findOne({
            sender: req.user._id,
            clientMessageId: String(req.body.clientMessageId),
        });
        if (duplicate)
            return res.json({ message: duplicate, idempotentReplay: true });
    }
    const attachments = Array.isArray(req.body.attachments) ? req.body.attachments : [];
    if (attachments.length > 10 ||
        (attachments.length &&
            (await (await import('../models/UploadedFile.js')).UploadedFile.countDocuments({
                _id: { $in: attachments },
                associatedEntityType: 'chat_message',
                accessPolicy: 'private',
                $or: [
                    { uploaderId: req.user._id },
                    { associatedEntityId: conversation._id, allowedUserIds: req.user._id },
                ],
            })) !==
                attachments.length)) {
        return res.status(400).json({ message: 'Invalid message attachments.' });
    }
    const message = await Message_js_1.Message.create({
        conversationId: conversation._id,
        sender: req.user._id,
        content,
        clientMessageId: req.body.clientMessageId
            ? String(req.body.clientMessageId).slice(0, 100)
            : undefined,
        attachments,
        readBy: [{ userId: req.user._id, readAt: new Date() }],
        deliveredTo: [req.user._id],
    });
    if (attachments.length) {
        await (await import('../models/UploadedFile.js')).UploadedFile.updateMany({ _id: { $in: attachments } }, {
            $set: { associatedEntityId: message._id },
            $addToSet: {
                allowedUserIds: { $each: (0, permissions_js_1.getConversationParticipantIds)(conversation.participants) },
            },
        });
    }
    await Conversation_js_1.Conversation.updateOne({ _id: conversation._id }, { $set: { lastMessage: message._id, lastMessageAt: message.createdAt } });
    (await import('../services/realtime.service.js')).emitConversationEvent(conversation._id.toString(), (0, permissions_js_1.getConversationParticipantIds)(conversation.participants), 'message:new', message);
    res.status(201).json({ message });
});
router.post('/:id/read', auth_js_1.authenticate, async (req, res) => {
    const message = await Message_js_1.Message.findById(req.params.id);
    if (!message)
        return res.status(404).json({ message: 'Message not found.' });
    const conversation = await Conversation_js_1.Conversation.findById(message.conversationId)
        .populate('participants', populatedParticipants);
    if (!conversation ||
        !(0, permissions_js_1.canParticipateInConversation)(req.user._id.toString(), conversation.participants)) {
        return res.status(404).json({ message: 'Message not found.' });
    }
    await Message_js_1.Message.updateOne({ _id: message._id }, { $addToSet: { deliveredTo: req.user._id } });
    await Message_js_1.Message.updateOne({ _id: message._id, 'readBy.userId': { $ne: req.user._id } }, { $push: { readBy: { userId: req.user._id, readAt: new Date() } } });
    (await import('../services/realtime.service.js')).emitConversationEvent(message.conversationId.toString(), (0, permissions_js_1.getConversationParticipantIds)(conversation.participants), 'message:read-receipt', {
        messageId: message._id,
        userId: req.user._id,
        readAt: new Date(),
    });
    res.json({ read: true });
});
exports.default = router;
