import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Conversation, getCanonicalDirectPair } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import {
  canMessageUsers,
  canParticipateInConversation,
  getConversationParticipantIds,
} from '../utils/permissions.js';

const router = Router();
const populatedParticipants = 'name avatar role institution isActive privacySettings';

router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await Conversation.find({ participants: req.user!._id })
    .populate('participants', populatedParticipants)
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });
  const conversations = rows.filter((conversation) =>
    canParticipateInConversation(req.user!._id.toString(), conversation.participants),
  );
  res.json({ conversations });
});

router.post('/conversations/direct', authenticate, async (req: AuthRequest, res: Response) => {
  const otherId = String(req.body.userId || '');
  if (!otherId || otherId === req.user!._id.toString()) {
    return res.status(400).json({ message: 'A different userId is required.' });
  }

  const other = await User.findById(otherId);
  if (!other || !canMessageUsers(req.user!, other)) {
    return res.status(403).json({ message: 'Direct conversation is not permitted.' });
  }

  const pair = getCanonicalDirectPair(req.user!._id, other._id);
  let conversation = await Conversation.findOne({ canonicalDirectPair: pair });
  if (!conversation) {
    try {
      conversation = await Conversation.create({
        isGroup: false,
        canonicalDirectPair: pair,
        participants: [req.user!._id, other._id],
        institution: req.user!.institution,
      });
    } catch (error: any) {
      if (error.code !== 11000) throw error;
      conversation = await Conversation.findOne({ canonicalDirectPair: pair });
    }
  }
  res.status(200).json({ conversation });
});

router.post('/conversations/group', authenticate, async (req: AuthRequest, res: Response) => {
  const ids = [
    ...new Set([
      req.user!._id.toString(),
      ...(Array.isArray(req.body.participantIds) ? req.body.participantIds.map(String) : []),
    ]),
  ];
  if (ids.length < 3 || ids.length > 100) {
    return res.status(400).json({ message: 'Group requires 3 to 100 participants.' });
  }

  const users = await User.find({
    _id: { $in: ids },
    institution: req.user!.institution,
    isActive: true,
  }).select('_id role institution isActive privacySettings');
  if (users.length !== ids.length) {
    return res.status(403).json({ message: 'All participants must belong to your institution.' });
  }
  for (let first = 0; first < users.length; first += 1) {
    for (let second = first + 1; second < users.length; second += 1) {
      if (
        !canMessageUsers(users[first], users[second]) ||
        !canMessageUsers(users[second], users[first])
      ) {
        return res.status(403).json({ message: 'Group conversation is not permitted.' });
      }
    }
  }

  const conversation = await Conversation.create({
    isGroup: true,
    name: String(req.body.name || 'Group').slice(0, 100),
    participants: ids,
    admins: [req.user!._id],
    institution: req.user!.institution,
  });
  res.status(201).json({ conversation });
});

router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('participants', populatedParticipants);
  if (
    !conversation ||
    !canParticipateInConversation(req.user!._id.toString(), conversation.participants)
  ) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const before = req.query.before ? new Date(String(req.query.before)) : undefined;
  const filter: any = { conversationId: req.params.id };
  if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
  const messages = await Message.find(filter)
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({
    messages: messages.reverse(),
    nextBefore: messages.length ? messages[0].createdAt : null,
  });
});

router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  const conversation = await Conversation.findById(req.params.id)
    .populate('participants', populatedParticipants);
  if (
    !conversation ||
    !canParticipateInConversation(req.user!._id.toString(), conversation.participants)
  ) {
    return res.status(404).json({ message: 'Conversation not found.' });
  }

  const content = String(req.body.content || '').trim();
  if (!content || content.length > 10000) {
    return res.status(400).json({ message: 'Message must contain 1 to 10000 characters.' });
  }
  if (req.body.clientMessageId) {
    const duplicate = await Message.findOne({
      sender: req.user!._id,
      clientMessageId: String(req.body.clientMessageId),
    });
    if (duplicate) return res.json({ message: duplicate, idempotentReplay: true });
  }

  const attachments: string[] = Array.isArray(req.body.attachments) ? req.body.attachments : [];
  if (
    attachments.length > 10 ||
    (attachments.length &&
      (await (await import('../models/UploadedFile.js')).UploadedFile.countDocuments({
        _id: { $in: attachments },
        associatedEntityType: 'chat_message',
        accessPolicy: 'private',
        $or: [
          { uploaderId: req.user!._id },
          { associatedEntityId: conversation._id, allowedUserIds: req.user!._id },
        ],
      })) !==
        attachments.length)
  ) {
    return res.status(400).json({ message: 'Invalid message attachments.' });
  }

  const message = await Message.create({
    conversationId: conversation._id,
    sender: req.user!._id,
    content,
    clientMessageId: req.body.clientMessageId
      ? String(req.body.clientMessageId).slice(0, 100)
      : undefined,
    attachments,
    readBy: [{ userId: req.user!._id, readAt: new Date() }],
    deliveredTo: [req.user!._id],
  });
  if (attachments.length) {
    await (await import('../models/UploadedFile.js')).UploadedFile.updateMany(
      { _id: { $in: attachments } },
      {
        $set: { associatedEntityId: message._id },
        $addToSet: {
          allowedUserIds: { $each: getConversationParticipantIds(conversation.participants) },
        },
      },
    );
  }
  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessage: message._id, lastMessageAt: message.createdAt } },
  );
  (await import('../services/realtime.service.js')).emitConversationEvent(
    conversation._id.toString(),
    getConversationParticipantIds(conversation.participants),
    'message:new',
    message,
  );
  res.status(201).json({ message });
});

router.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  const conversation = await Conversation.findById(message.conversationId)
    .populate('participants', populatedParticipants);
  if (
    !conversation ||
    !canParticipateInConversation(req.user!._id.toString(), conversation.participants)
  ) {
    return res.status(404).json({ message: 'Message not found.' });
  }

  await Message.updateOne({ _id: message._id }, { $addToSet: { deliveredTo: req.user!._id } });
  await Message.updateOne(
    { _id: message._id, 'readBy.userId': { $ne: req.user!._id } },
    { $push: { readBy: { userId: req.user!._id, readAt: new Date() } } },
  );
  (await import('../services/realtime.service.js')).emitConversationEvent(
    message.conversationId.toString(),
    getConversationParticipantIds(conversation.participants),
    'message:read-receipt',
    {
      messageId: message._id,
      userId: req.user!._id,
      readAt: new Date(),
    },
  );
  res.json({ read: true });
});

export default router;
