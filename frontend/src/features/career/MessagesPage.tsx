import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, CheckCheck, MessageCircle, Search, Send } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Avatar, Button, Input, Textarea } from '../../components/ui';
import { useAuth } from '../../app/providers/useAuth';
import { ApiError } from '../../services/api';
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
  const [error, setError] = useState('');
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
  const loadMessages = useCallback(async () => {
    const token = session?.token;
    if (!token || !conversationId) return;
    setMessagesLoading(true);
    setError('');
    try {
      const r = await getConversationMessages(token, conversationId);
      setMessages(r.messages);
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
      const result = await sendConversationMessage(
        session.token,
        conversationId,
        content,
        globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      );
      setMessages((current) => [...current, result.message]);
      setDraft('');
      void loadConversations();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }
  async function loadOlder() {
    if (!session?.token || !conversationId || !older) return;
    setMessagesLoading(true);
    try {
      const r = await getConversationMessages(session.token, conversationId, older);
      setMessages((current) => [...r.messages, ...current]);
      setOlder(r.nextBefore);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Earlier messages could not be loaded.');
    } finally {
      setMessagesLoading(false);
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
                Choose a conversation to view its messages. Start from an alumni profile to open an
                authorized conversation.
              </p>
              <Link to={careerPaths.alumni} className="button button-secondary">
                Browse alumni
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
                  <small>{selected?.isGroup ? 'Group conversation' : 'Private conversation'}</small>
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
                  onChange={(e) => setDraft(e.target.value)}
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
