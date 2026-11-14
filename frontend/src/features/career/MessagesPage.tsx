import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, CheckCheck, MessageCircle, Search, Send } from 'lucide-react';
import { io, type Socket } from 'socket.io-client';
import { Link, useParams } from 'react-router-dom';
import { Avatar, Button, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError, API_BASE_URL } from '../../services/api';
import {
  getConversationMessages,
  getConversations,
  markCareerMessageRead,
  sendConversationMessage,
  type CareerConversation,
  type CareerMessage,
  type ConversationPerson,
} from '../../services/career/career-api';
import { CareerError, CareerHeading, CareerLoading, CareerNav } from './career-components';
import { careerPaths } from './career-paths';
import './career.css';

interface ChatAck {
  ok: boolean;
  error?: string;
  message?: CareerMessage;
}

interface ChatServerEvents {
  'message:new': (message: CareerMessage) => void;
  'message:read-receipt': (receipt: { messageId: string; userId: string; readAt: string }) => void;
  'message:delivered-receipt': (receipt: { messageId: string; userId: string }) => void;
  'conversation:added': (conversation: CareerConversation) => void;
  typing: (event: { conversationId: string; userId: string; isTyping: boolean }) => void;
}

interface ChatClientEvents {
  'conversation:join': (
    data: { conversationId: string },
    ack?: (response: ChatAck) => void,
  ) => void;
  'conversation:leave': (
    data: { conversationId: string },
    ack?: (response: ChatAck) => void,
  ) => void;
  'message:send': (
    data: { conversationId: string; content: string; clientMessageId: string },
    ack: (response: ChatAck) => void,
  ) => void;
  'message:delivered': (
    data: { messageId: string },
    ack?: (response: { ok: boolean }) => void,
  ) => void;
  typing: (event: { conversationId: string; isTyping: boolean }) => void;
}

type ChatSocket = Socket<ChatServerEvents, ChatClientEvents>;

function entityId(value: string | ConversationPerson): string {
  return typeof value === 'string' ? value : value._id;
}

function mergeMessages(current: CareerMessage[], incoming: CareerMessage[]): CareerMessage[] {
  const messages = new Map(current.map((message) => [message._id, message]));
  for (const message of incoming) {
    const previous = messages.get(message._id);
    if (!previous) {
      messages.set(message._id, message);
      continue;
    }

    const readBy = new Map(
      [...(previous.readBy || []), ...(message.readBy || [])].map((receipt) => [
        entityId(receipt.userId),
        receipt,
      ]),
    );
    const deliveredTo = new Map(
      [...(previous.deliveredTo || []), ...(message.deliveredTo || [])].map((id) => [
        entityId(id),
        id,
      ]),
    );
    messages.set(message._id, {
      ...previous,
      ...message,
      readBy: [...readBy.values()],
      deliveredTo: [...deliveredTo.values()],
    });
  }
  return [...messages.values()].sort(
    (first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime(),
  );
}

function person(value: string | ConversationPerson | undefined): ConversationPerson | undefined {
  return value && typeof value !== 'string' ? value : undefined;
}
function conversationTitle(
  conversation: CareerConversation | undefined,
  userId: string | undefined,
) {
  if (!conversation) return 'Conversation';
  if (conversation.isGroup) return conversation.name || 'Group conversation';
  return (
    conversation.participants
      .filter((p) => p._id !== userId)
      .map((p) => p.name)
      .join(', ') || 'Conversation'
  );
}
function messageTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function MessagesPage() {
  const { conversationId } = useParams();
  const { session, user } = useAuth();
  const [conversations, setConversations] = useState<CareerConversation[]>([]);
  const [messages, setMessages] = useState<CareerMessage[]>([]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [older, setOlder] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef<ChatSocket | null>(null);
  const currentConversationRef = useRef(conversationId);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  currentConversationRef.current = conversationId;
  const selected = conversations.find((c) => c._id === conversationId);
  const loadConversations = useCallback(async () => {
    if (!session?.token) return;
    try {
      const r = await getConversations(session.token);
      setConversations(r.conversations);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Conversations could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [session?.token]);
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);
  useEffect(() => {
    if (!session?.token || !user?._id) return;
    const socket = io(
      API_BASE_URL.replace(/\/api$/, ''),
      { auth: { token: session.token } },
    ) as ChatSocket;
    socketRef.current = socket;
    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));
    socket.on('message:new', (message) => {
      if (currentConversationRef.current === message.conversationId) {
        setMessages((current) => mergeMessages(current, [message]));
      }
      setConversations((current) => {
        const updated = current.map((conversation) =>
          conversation._id === message.conversationId
            ? {
                ...conversation,
                lastMessage: message,
                lastMessageAt: message.createdAt,
              }
            : conversation,
        );
        return updated.sort(
          (first, second) =>
            new Date(second.lastMessageAt || 0).getTime() -
            new Date(first.lastMessageAt || 0).getTime(),
        );
      });
      void loadConversations();

      const senderId =
        typeof message.sender === 'string' ? message.sender : message.sender._id;
      if (senderId !== user._id) {
        socket.emit('message:delivered', { messageId: message._id });
        if (currentConversationRef.current === message.conversationId) {
          void markCareerMessageRead(session.token, message._id).catch((cause: unknown) => {
            setError(
              cause instanceof ApiError
                ? cause.message
                : 'An incoming message could not be marked as read.',
            );
          });
        }
      }
    });
    socket.on('message:read-receipt', ({ messageId, userId, readAt }) => {
      setMessages((current) =>
        current.map((message) =>
          message._id !== messageId
            ? message
            : {
                ...message,
                readBy: [
                  ...(message.readBy || []).filter(
                    (receipt) => entityId(receipt.userId) !== userId,
                  ),
                  { userId, readAt },
                ],
              },
        ),
      );
    });
    socket.on('message:delivered-receipt', ({ messageId, userId }) => {
      setMessages((current) =>
        current.map((message) =>
          message._id !== messageId ||
          (message.deliveredTo || []).some((id) => entityId(id) === userId)
            ? message
            : { ...message, deliveredTo: [...(message.deliveredTo || []), userId] },
        ),
      );
    });
    socket.on('conversation:added', () => {
      void loadConversations();
    });
    socket.on('typing', (event) => {
      if (event.conversationId === currentConversationRef.current && event.userId !== user._id) {
        setTyping(event.isTyping);
      }
    });
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
      setSocketConnected(false);
    };
  }, [session?.token, user?._id, loadConversations]);
  useEffect(() => {
    const socket = socketRef.current;
    if (!socketConnected || !socket || !conversationId) return;
    socket.emit('conversation:join', { conversationId }, (response) => {
      if (!response.ok) setError(response.error || 'This conversation could not be joined.');
    });
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      socket.emit('typing', { conversationId, isTyping: false });
      socket.emit('conversation:leave', { conversationId });
      setTyping(false);
    };
  }, [conversationId, socketConnected]);
  useEffect(() => {
    setTyping(false);
  }, [conversationId]);
  const loadMessages = useCallback(async () => {
    const token = session?.token;
    if (!token || !conversationId) return;
    setMessagesLoading(true);
    setError('');
    try {
      const r = await getConversationMessages(token, conversationId);
      setMessages((current) => mergeMessages(current, r.messages));
      setOlder(r.nextBefore);
      const unreadMessages = r.messages.filter((message) => {
        const senderId = typeof message.sender === 'string' ? message.sender : message.sender._id;
        const alreadyRead = message.readBy?.some(
          (receipt) =>
            (typeof receipt.userId === 'string' ? receipt.userId : receipt.userId._id) ===
            user?._id,
        );
        return senderId !== user?._id && !alreadyRead;
      });
      const readResults = await Promise.allSettled(
        unreadMessages.map((message) => markCareerMessageRead(token, message._id)),
      );
      const failedRead = readResults.find((result) => result.status === 'rejected');
      if (failedRead?.status === 'rejected') {
        setError(
          failedRead.reason instanceof ApiError
            ? failedRead.reason.message
            : 'Some incoming messages could not be marked as read.',
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Message history could not be loaded.');
    } finally {
      setMessagesLoading(false);
    }
  }, [session?.token, conversationId, user?._id]);
  useEffect(() => {
    setMessages([]);
    if (conversationId) void loadMessages();
  }, [conversationId, loadMessages]);
  const visibleConversations = useMemo(
    () =>
      conversations.filter((c) =>
        `${conversationTitle(c, user?._id)} ${c.lastMessage?.content || ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [conversations, query, user?._id],
  );
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!session?.token || !conversationId || !draft.trim()) return;
    setSending(true);
    setError('');
    const content = draft.trim();
    try {
      const clientMessageId =
        globalThis.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const socket = socketRef.current;
      let message: CareerMessage | undefined;
      if (socket?.connected) {
        const response = await new Promise<ChatAck | undefined>((resolve) => {
          socket.timeout(10000).emit(
            'message:send',
            { conversationId, content, clientMessageId },
            (timeoutError, ack) => resolve(timeoutError ? undefined : ack),
          );
        });
        if (response && !response.ok) {
          throw new Error(response.error || 'Message could not be sent.');
        }
        message = response?.message;
      }
      if (!message) {
        const result = await sendConversationMessage(
          session.token,
          conversationId,
          content,
          clientMessageId,
        );
        message = result.message;
      }
      setMessages((current) => mergeMessages(current, [message]));
      setDraft('');
      void loadConversations();
    } catch (e) {
      setError(
        e instanceof ApiError || e instanceof Error ? e.message : 'Message could not be sent.',
      );
    } finally {
      setSending(false);
    }
  }
  async function loadOlder() {
    if (!session?.token || !conversationId || !older) return;
    setMessagesLoading(true);
    try {
      const r = await getConversationMessages(session.token, conversationId, older);
      setMessages((current) => mergeMessages(current, r.messages));
      setOlder(r.nextBefore);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Earlier messages could not be loaded.');
    } finally {
      setMessagesLoading(false);
    }
  }
  function updateDraft(value: string) {
    setDraft(value);
    const socket = socketRef.current;
    if (!socket?.connected || !conversationId) return;
    socket.emit('typing', { conversationId, isTyping: Boolean(value.trim()) });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (value.trim()) {
      typingTimerRef.current = setTimeout(() => {
        socket.emit('typing', { conversationId, isTyping: false });
        typingTimerRef.current = null;
      }, 800);
    }
  }
  const mobileMessages = Boolean(conversationId);
  return (
    <div className="career-page career-messages-page">
      <CareerNav active="conversations" />
      <CareerHeading
        title="Conversations"
        description="Private messages from your institution network."
      />
      {error && <CareerError message={error} />}
      <div className={`career-messenger ${mobileMessages ? 'is-chat-open' : ''}`}>
        <aside className="career-conversation-sidebar">
          <div className="career-inbox-heading">
            <div>
              <span className="eyebrow">INBOX</span>
              <h2>Messages</h2>
            </div>
          </div>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leadingIcon={<Search size={15} />}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
          {loading ? (
            <CareerLoading />
          ) : visibleConversations.length ? (
            <div className="career-conversation-list">
              {visibleConversations.map((c) => {
                const other = c.participants.find((p) => p._id !== user?._id);
                return (
                  <Link
                    to={`${careerPaths.conversations}/${c._id}`}
                    key={c._id}
                    className={`career-conversation-item ${c._id === conversationId ? 'active' : ''}`}
                  >
                    <Avatar name={conversationTitle(c, user?._id)} src={other?.avatar} size="md" />
                    <div className="career-conversation-preview">
                      <strong>{conversationTitle(c, user?._id)}</strong>
                      <span>{c.lastMessage?.content || 'No messages yet'}</span>
                    </div>
                    <small>
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString() : ''}
                    </small>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="career-inbox-empty">
              <MessageCircle size={24} />
              <strong>No conversations</strong>
              <span>
                Direct conversations appear when you open a message from an available profile.
              </span>
            </div>
          )}
        </aside>
        <section className="career-chat-window" aria-label="Conversation messages">
          {!conversationId ? (
            <div className="career-chat-placeholder">
              <MessageCircle size={30} />
              <h2>Your conversations</h2>
              <p>
                Choose a conversation to view its messages. Search for people you’re allowed to
                contact to start a conversation.
              </p>
              <Link to="/app/search" className="button button-secondary">
                Find people to message
              </Link>
            </div>
          ) : (
            <>
              <header className="career-chat-header">
                <Link
                  to={careerPaths.conversations}
                  className="career-chat-back"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft size={18} />
                </Link>
                <Avatar
                  name={conversationTitle(selected, user?._id)}
                  src={selected?.participants.find((p) => p._id !== user?._id)?.avatar}
                  size="sm"
                />
                <div>
                  <strong>{conversationTitle(selected, user?._id)}</strong>
                  <small aria-live="polite">
                    {selected?.isGroup ? 'Group conversation' : 'Private conversation'}
                    {' · '}
                    {socketConnected ? 'Live' : 'Reconnecting'}
                    {typing ? ' · Typing…' : ''}
                  </small>
                </div>
              </header>
              <div className="career-message-history" aria-live="polite">
                {older && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={messagesLoading}
                    onClick={() => void loadOlder()}
                  >
                    Load earlier messages
                  </Button>
                )}
                {messagesLoading && messages.length === 0 ? (
                  <CareerLoading />
                ) : messages.length ? (
                  messages.map((m) => {
                    const sender = person(m.sender);
                    const own =
                      (typeof m.sender === 'string' ? m.sender : sender?._id) === user?._id;
                    const read = m.readBy?.some(
                      (r) => (typeof r.userId === 'string' ? r.userId : r.userId._id) !== user?._id,
                    );
                    const delivered = (m.deliveredTo || []).length > 1;
                    return (
                      <article key={m._id} className={`career-message ${own ? 'own' : ''}`}>
                        <div className="career-message-bubble">
                          <p>{m.content}</p>
                          <footer>
                            <time dateTime={m.createdAt}>{messageTime(m.createdAt)}</time>
                            {own && (
                              <span
                                aria-label={read ? 'Read' : delivered ? 'Delivered' : 'Sent'}
                                title={read ? 'Read' : delivered ? 'Delivered' : 'Sent'}
                              >
                                {read ? (
                                  <CheckCheck size={13} />
                                ) : delivered ? (
                                  <CheckCheck size={13} />
                                ) : (
                                  <Check size={13} />
                                )}
                              </span>
                            )}
                          </footer>
                        </div>
                        {!own && (
                          <small className="career-message-sender">
                            {sender?.name || 'Conversation participant'}
                          </small>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <div className="career-chat-placeholder">
                    <MessageCircle size={26} />
                    <strong>No messages yet</strong>
                    <span>Send a message to start this conversation.</span>
                  </div>
                )}
              </div>
              <form className="career-message-composer" onSubmit={send}>
                <Textarea
                  value={draft}
                  onChange={(e) => updateDraft(e.target.value)}
                  rows={2}
                  maxLength={10000}
                  aria-label="Message"
                  placeholder="Write a message…"
                  required
                />
                <Button
                  type="submit"
                  loading={sending}
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  leadingIcon={<Send size={16} />}
                >
                  Send
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
