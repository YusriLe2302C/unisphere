import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { User } from '../models/User.js';
import { Conversation, getCanonicalDirectPair } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { UploadedFile } from '../models/UploadedFile.js';
import { getJwtSecret } from '../middleware/auth.js';
import {
  canMessageUsers,
  canParticipateInConversation,
  getConversationParticipantIds,
} from '../utils/permissions.js';

let io: Server | undefined;
const userSockets = new Map<string, Set<string>>();
const presence = new Map<string, Date>();
const uid = (s: Socket) => String((s.data as any).userId);
const emitUser = (id: string, event: string, data: any) => { for (const sid of userSockets.get(id) || []) io?.to(sid).emit(event, data); };

export function emitNotification(userId: string, notification: any) { emitUser(userId, 'notification:new', notification); }

export function emitConversationEvent(
  conversationId: string,
  participantIds: string[],
  event: string,
  data: unknown,
) {
  const rooms = [
    `conversation:${conversationId}`,
    ...participantIds.map((participantId) => `user:${participantId}`),
  ];
  io?.to(rooms).emit(event, data);
}

const populatedParticipants = 'name avatar role institution isActive privacySettings';

async function getAccessibleConversation(conversationId: string, userId: string) {
  const conversation = await Conversation.findById(conversationId)
    .populate('participants', populatedParticipants);
  if (
    !conversation ||
    !canParticipateInConversation(userId, conversation.participants)
  ) {
    return undefined;
  }
  return conversation;
}

export function initializeRealtime(server: HttpServer) {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',').map(x => x.trim()).filter(Boolean);
  io = new Server(server, { cors: { origin: (origin, callback) => { if (!origin || allowedOrigins.includes(origin)) callback(null, true); else callback(new Error('Origin is not allowed by CORS')); }, credentials: true } });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, getJwtSecret()) as any;
      const user = await User.findById(payload.id);
      if (!user || !user.isActive || user.disciplinaryStatus === 'suspended' || payload.ver !== user.tokenVersion) return next(new Error('Invalid account or token'));
      socket.data.userId = user._id.toString(); socket.data.institution = user.institution;
      next();
    } catch { next(new Error('Invalid or expired token')); }
  });
  io.on('connection', async socket => {
    const userId = uid(socket); const set = userSockets.get(userId) || new Set<string>(); const wasOffline = set.size === 0; set.add(socket.id); userSockets.set(userId, set);
    socket.join(`user:${userId}`);
    await User.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } });
    if (wasOffline) { presence.set(userId, new Date()); socket.broadcast.emit('presence:online', { userId }); }

    socket.on('conversation:join', async (data: any, ack?: Function) => {
      const conversationId = String(data?.conversationId || '');
      if (!(await getAccessibleConversation(conversationId, userId))) { ack?.({ ok: false, error: 'Not a conversation participant' }); return; }
      socket.join(`conversation:${conversationId}`); ack?.({ ok: true });
    });
    socket.on('conversation:leave', async (data: any, ack?: Function) => {
      const conversationId = String(data?.conversationId || '');
      if (!(await getAccessibleConversation(conversationId, userId))) { ack?.({ ok: false, error: 'Not a conversation participant' }); return; }
      await socket.leave(`conversation:${conversationId}`);
      ack?.({ ok: true });
    });
    socket.on('conversation:direct', async (data: any, ack?: Function) => {
      try {
        const otherId = String(data?.userId || ''); if (otherId === userId) return ack?.({ ok: false, error: 'Cannot message yourself' });
        const other = await User.findOne({ _id: otherId, isActive: true });
        const me = await User.findById(userId);
        if (!other || !me || !canMessageUsers(me, other)) return ack?.({ ok: false, error: 'Direct conversation is not permitted' });
        const pair = getCanonicalDirectPair(userId, otherId);
        let conversation = await Conversation.findOne({ canonicalDirectPair: pair });
        if (!conversation) { try { conversation = await Conversation.create({ isGroup: false, canonicalDirectPair: pair, participants: [userId, otherId], institution: me.institution }); } catch (e: any) { if (e.code !== 11000) throw e; conversation = await Conversation.findOne({ canonicalDirectPair: pair }); } }
        socket.join(`conversation:${conversation!._id}`); ack?.({ ok: true, conversation });
      } catch { ack?.({ ok: false, error: 'Could not open direct conversation' }); }
    });
    socket.on('conversation:create-group', async (data: any, ack?: Function) => {
      const me: any = await User.findById(userId); const ids = [...new Set([userId, ...(Array.isArray(data?.participantIds) ? data.participantIds.map(String) : [])])];
      if (!me || ids.length < 3 || ids.length > 100) return ack?.({ ok: false, error: 'Group conversations require 3 to 100 participants' });
      const users = await User.find({ _id: { $in: ids }, institution: me.institution, isActive: true }).select('_id role institution isActive privacySettings');
      if (users.length !== ids.length) return ack?.({ ok: false, error: 'All participants must be active members of your institution' });
      for (let first = 0; first < users.length; first += 1) {
        for (let second = first + 1; second < users.length; second += 1) {
          if (!canMessageUsers(users[first], users[second]) || !canMessageUsers(users[second], users[first])) {
            return ack?.({ ok: false, error: 'Group conversation is not permitted' });
          }
        }
      }
      const conversation = await Conversation.create({ isGroup: true, name: String(data?.name || 'Group').slice(0, 100), participants: ids, admins: [userId], institution: me.institution });
      for (const id of ids) emitUser(id, 'conversation:added', conversation);
      ack?.({ ok: true, conversation });
    });
    socket.on('message:send', async (data: any, ack?: Function) => {
      try {
        const conversationId = String(data?.conversationId || ''); const content = String(data?.content || '').trim();
        if (!content || content.length > 10000) return ack?.({ ok: false, error: 'Invalid message or conversation access denied' });
        const conversation = await getAccessibleConversation(conversationId, userId);
        if (!conversation) return ack?.({ ok: false, error: 'Invalid message or conversation access denied' });
        const existing = data.clientMessageId ? await Message.findOne({ sender: userId, clientMessageId: String(data.clientMessageId) }) : null;
        if (existing) return ack?.({ ok: true, message: existing, idempotentReplay: true });
        if (conversation.isGroup) await socket.join(`conversation:${conversationId}`);
        const attachments = Array.isArray(data.attachments) ? data.attachments : [];
        if (attachments.length > 10) return ack?.({ ok: false, error: 'At most 10 attachments are allowed' });
        if (attachments.length) {
          const valid = await UploadedFile.countDocuments({ _id: { $in: attachments }, associatedEntityType: 'chat_message', accessPolicy: 'private', $or: [{ uploaderId: userId }, { associatedEntityId: conversation._id, allowedUserIds: userId }] });
          if (valid !== attachments.length) return ack?.({ ok: false, error: 'Invalid attachment access' });
        }
        const message = await Message.create({ conversationId, sender: userId, content, clientMessageId: data.clientMessageId ? String(data.clientMessageId).slice(0, 100) : undefined, attachments, deliveredTo: [userId], readBy: [{ userId, readAt: new Date() }] });
        if (attachments.length) await UploadedFile.updateMany({ _id: { $in: attachments } }, { $set: { associatedEntityId: message._id }, $addToSet: { allowedUserIds: { $each: getConversationParticipantIds(conversation.participants) } } });
        await Conversation.updateOne({ _id: conversationId }, { $set: { lastMessage: message._id, lastMessageAt: message.createdAt } });
        emitConversationEvent(
          conversationId,
          getConversationParticipantIds(conversation.participants),
          'message:new',
          message,
        );
        const others = getConversationParticipantIds(conversation.participants).filter(x => x !== userId);
        if (others.length) {
          const notices = await Promise.all(others.map(recipient => import('../models/Notification.js').then(({ Notification }) => Notification.create({ recipient, sender: userId, type: 'system', entityId: conversationId, message: 'You received a new message.', deliveryStatus: 'delivered' }))));
          others.forEach((id, i) => emitNotification(id, notices[i]));
        }
        ack?.({ ok: true, message });
      } catch { ack?.({ ok: false, error: 'Could not persist message' }); }
    });
    socket.on('message:delivered', async (data: any, ack?: Function) => {
      const message = await Message.findById(data?.messageId);
      const conversation = message
        ? await getAccessibleConversation(message.conversationId.toString(), userId)
        : undefined;
      if (!message || !conversation) return ack?.({ ok: false });
      await Message.updateOne({ _id: message._id }, { $addToSet: { deliveredTo: userId } });
      emitConversationEvent(
        message.conversationId.toString(),
        getConversationParticipantIds(conversation.participants),
        'message:delivered-receipt',
        { messageId: message._id, userId },
      );
      ack?.({ ok: true });
    });
    socket.on('message:read', async (data: any, ack?: Function) => {
      const message = await Message.findById(data?.messageId);
      const conversation = message
        ? await getAccessibleConversation(message.conversationId.toString(), userId)
        : undefined;
      if (!message || !conversation) return ack?.({ ok: false });
      await Message.updateOne({ _id: message._id }, { $addToSet: { deliveredTo: userId } });
      await Message.updateOne({ _id: message._id, 'readBy.userId': { $ne: userId } }, { $push: { readBy: { userId, readAt: new Date() } } });
      emitConversationEvent(
        message.conversationId.toString(),
        getConversationParticipantIds(conversation.participants),
        'message:read-receipt',
        { messageId: message._id, userId, readAt: new Date() },
      );
      ack?.({ ok: true });
    });
    socket.on('typing', async (data: any) => { const cid = String(data?.conversationId || ''); if (await getAccessibleConversation(cid, userId)) socket.to(`conversation:${cid}`).emit('typing', { conversationId: cid, userId, isTyping: Boolean(data.isTyping) }); });
    socket.on('disconnect', async () => {
      const active = userSockets.get(userId); active?.delete(socket.id);
      if (!active?.size) { userSockets.delete(userId); const lastSeen = new Date(); presence.set(userId, lastSeen); await User.updateOne({ _id: userId }, { $set: { lastSeenAt: lastSeen } }); io?.emit('presence:offline', { userId, lastSeen }); }
    });
  });
  return io;
}

export function getRealtimeServer() { return io; }
