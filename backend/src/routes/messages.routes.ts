import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Conversation, getCanonicalDirectPair } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { emitNotification } from '../services/realtime.service.js';

const router = Router();
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  const rows = await Conversation.find({ participants: req.user!._id }).populate('participants', 'name avatar role institution lastSeenAt').populate('lastMessage').sort({ lastMessageAt: -1 }); res.json({ conversations: rows });
});
router.post('/conversations/direct', authenticate, async (req: AuthRequest, res: Response) => {
  const otherId = String(req.body.userId || ''); if (!otherId || otherId === req.user!._id.toString()) return res.status(400).json({ message: 'A different userId is required.' });
  const other: any = await User.findById(otherId); if (!other || !other.isActive || other.institution !== req.user!.institution || other.privacySettings?.allowDirectMessages === false) return res.status(403).json({ message: 'Direct conversation is not permitted.' });
  const pair = getCanonicalDirectPair(req.user!._id, other._id); let conversation = await Conversation.findOne({ canonicalDirectPair: pair });
  if (!conversation) { try { conversation = await Conversation.create({ isGroup: false, canonicalDirectPair: pair, participants: [req.user!._id, other._id], institution: req.user!.institution }); } catch (e: any) { if (e.code !== 11000) throw e; conversation = await Conversation.findOne({ canonicalDirectPair: pair }); } }
  res.status(200).json({ conversation });
});
router.post('/conversations/group', authenticate, async (req: AuthRequest, res: Response) => {
  const ids = [...new Set([req.user!._id.toString(), ...(Array.isArray(req.body.participantIds) ? req.body.participantIds.map(String) : [])])];
  if (ids.length < 3 || ids.length > 100) return res.status(400).json({ message: 'Group requires 3 to 100 participants.' });
  const users = await User.find({ _id: { $in: ids }, institution: req.user!.institution, isActive: true }).select('_id'); if (users.length !== ids.length) return res.status(403).json({ message: 'All participants must belong to your institution.' });
  const conversation = await Conversation.create({ isGroup: true, name: String(req.body.name || 'Group').slice(0, 100), participants: ids, admins: [req.user!._id], institution: req.user!.institution }); res.status(201).json({ conversation });
});
router.get('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  const isMember = await Conversation.exists({ _id: req.params.id, participants: req.user!._id }); if (!isMember) return res.status(404).json({ message: 'Conversation not found.' });
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50)); const before = req.query.before ? new Date(String(req.query.before)) : undefined;
  const filter: any = { conversationId: req.params.id }; if (before && !Number.isNaN(before.getTime())) filter.createdAt = { $lt: before };
  const messages = await Message.find(filter).populate('sender', 'name avatar').sort({ createdAt: -1 }).limit(limit); res.json({ messages: messages.reverse(), nextBefore: messages.length ? messages[0].createdAt : null });
});
router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  const conversation = await Conversation.findOne({ _id: req.params.id, participants: req.user!._id }); if (!conversation) return res.status(404).json({ message: 'Conversation not found.' });
  const content = String(req.body.content || '').trim(); if (!content || content.length > 10000) return res.status(400).json({ message: 'Message must contain 1 to 10000 characters.' });
  if (req.body.clientMessageId) { const duplicate = await Message.findOne({ sender: req.user!._id, clientMessageId: String(req.body.clientMessageId) }); if (duplicate) return res.json({ message: duplicate, idempotentReplay: true }); }
  const attachments: string[] = Array.isArray(req.body.attachments) ? req.body.attachments : [];
  if (attachments.length > 10 || attachments.length && await (await import('../models/UploadedFile.js')).UploadedFile.countDocuments({ _id: { $in: attachments }, associatedEntityType: 'chat_message', accessPolicy: 'private', $or: [{ uploaderId: req.user!._id }, { associatedEntityId: conversation._id, allowedUserIds: req.user!._id }] }) !== attachments.length) return res.status(400).json({ message: 'Invalid message attachments.' });
  const message = await Message.create({ conversationId: conversation._id, sender: req.user!._id, content, clientMessageId: req.body.clientMessageId ? String(req.body.clientMessageId).slice(0,100) : undefined, attachments, readBy: [{ userId: req.user!._id, readAt: new Date() }], deliveredTo: [req.user!._id] });
  if (attachments.length) await (await import('../models/UploadedFile.js')).UploadedFile.updateMany({ _id: { $in: attachments } }, { $set: { associatedEntityId: message._id }, $addToSet: { allowedUserIds: { $each: conversation.participants } } });
  await Conversation.updateOne({ _id: conversation._id }, { $set: { lastMessage: message._id, lastMessageAt: message.createdAt } });
  const io = (await import('../services/realtime.service.js')).getRealtimeServer(); io?.to(`conversation:${conversation._id}`).emit('message:new', message);
  res.status(201).json({ message });
});
router.post('/messages/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  const message = await Message.findById(req.params.id); if (!message || !await Conversation.exists({ _id: message.conversationId, participants: req.user!._id })) return res.status(404).json({ message: 'Message not found.' });
  await Message.updateOne({ _id: message._id, 'readBy.userId': { $ne: req.user!._id } }, { $push: { readBy: { userId: req.user!._id, readAt: new Date() } } });
  (await import('../services/realtime.service.js')).getRealtimeServer()?.to(`conversation:${message.conversationId}`).emit('message:read-receipt', { messageId: message._id, userId: req.user!._id, readAt: new Date() }); res.json({ read: true });
});
export default router;
