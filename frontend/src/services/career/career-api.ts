import { apiRequest } from '../api';

export interface CareerPerson {
  _id: string;
  name: string;
  role?: string;
  avatar?: string;
  headline?: string;
  institution?: string;
  department?: string;
  skills?: string[];
  alumniProfile?: {
    company?: string;
    designation?: string;
    industry?: string;
    yearsExperience?: number;
    mentorshipInterests?: string[];
  };
}
export interface AlumniProfileInput {
  company?: string;
  designation?: string;
  industry?: string;
  yearsExperience?: number;
  mentorshipInterests?: string[];
  skills?: string[];
}
export interface CareerAnswer {
  _id?: string;
  responder: string | CareerPerson;
  content: string;
  createdAt?: string;
  isVerifiedFaculty?: boolean;
  isEndorsed?: boolean;
}
export interface CareerFollowUp {
  _id?: string;
  author: string | CareerPerson;
  content: string;
  createdAt: string;
}
export interface CareerQuestion {
  _id: string;
  title: string;
  body: string;
  author: string | CareerPerson;
  assignedMentor?: string | CareerPerson;
  visibility: 'public' | 'private_to_mentor';
  tags: string[];
  targetDepartments: string[];
  institution: string;
  answers: CareerAnswer[];
  followUps?: CareerFollowUp[];
  isClosed: boolean;
  createdAt: string;
  updatedAt?: string;
}
export interface CareerConnection {
  _id: string;
  requester: string | CareerPerson;
  recipient: string | CareerPerson;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  actionBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface MentorshipRequest {
  _id: string;
  student: string | CareerPerson;
  mentor: string | CareerPerson;
  subject: string;
  message: string;
  goals?: string[];
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  responseNote?: string;
  responseMessage?: string;
  createdAt?: string;
  respondedAt?: string;
}
export interface ConversationPerson extends CareerPerson {
  lastSeenAt?: string;
}
export interface CareerMessage {
  _id: string;
  conversationId: string;
  sender: string | CareerPerson;
  content: string;
  attachments?: string[];
  readBy?: { userId: string | CareerPerson; readAt: string }[];
  deliveredTo?: (string | CareerPerson)[];
  createdAt: string;
  isSystemNotice?: boolean;
}
export interface CareerConversation {
  _id: string;
  isGroup: boolean;
  name?: string;
  participants: ConversationPerson[];
  lastMessage?: CareerMessage;
  lastMessageAt?: string;
  institution?: string;
}

export interface CareerOpportunity {
  _id: string;
  title: string;
  organization: string;
  type: string;
  location?: string;
  description: string;
  deadline?: string;
  applyUrl?: string;
}

export async function getCareerOpportunities(institution: string) {
  return apiRequest<{ opportunities: CareerOpportunity[] }>('opportunities', {
    query: { institution },
  });
}

export async function getAlumni(
  token: string,
  filters: {
    industry?: string;
    company?: string;
    designation?: string;
    skill?: string;
    limit?: number;
  } = {},
) {
  return apiRequest<{ alumni: CareerPerson[] }>('career/alumni', { token, query: { ...filters } });
}
export async function updateMyAlumniProfile(token: string, input: AlumniProfileInput) {
  return apiRequest<{ profile: CareerPerson }>('career/alumni/profile', {
    method: 'PUT',
    token,
    body: input,
  });
}
export async function getCareerQuestions(token: string) {
  return apiRequest<{ questions: CareerQuestion[] }>('career/questions', { token });
}
export async function getCareerQuestion(token: string, id: string) {
  return apiRequest<{
    question: CareerQuestion;
    attachments: Array<{ _id: string; originalFileName: string; fileUrl: string }>;
  }>(`career/questions/${encodeURIComponent(id)}`, { token });
}
export async function createCareerQuestion(
  token: string,
  input: {
    title: string;
    body: string;
    visibility?: 'public' | 'private_to_mentor';
    assignedMentor?: string;
    tags?: string[];
    targetDepartments?: string[];
  },
) {
  return apiRequest<{ question: CareerQuestion }>('career/questions', {
    method: 'POST',
    token,
    body: input,
  });
}
export async function answerCareerQuestion(token: string, id: string, content: string) {
  return apiRequest<{ answer: CareerAnswer }>(
    `career/questions/${encodeURIComponent(id)}/answers`,
    { method: 'POST', token, body: { content } },
  );
}
export async function followUpCareerQuestion(token: string, id: string, content: string) {
  return apiRequest<{ followUps: CareerFollowUp[] }>(
    `career/questions/${encodeURIComponent(id)}/followups`,
    { method: 'POST', token, body: { content } },
  );
}
export async function getCareerConnections(token: string) {
  return apiRequest<{ connections: CareerConnection[] }>('career/connections', { token });
}
export async function requestCareerConnection(token: string, userId: string) {
  return apiRequest<{ connection: CareerConnection; idempotentReplay?: boolean }>(
    `career/connections/${encodeURIComponent(userId)}`,
    { method: 'POST', token, body: {} },
  );
}
export async function updateCareerConnection(
  token: string,
  id: string,
  status: 'accepted' | 'declined',
) {
  return apiRequest<{ connection: CareerConnection }>(
    `career/connections/${encodeURIComponent(id)}`,
    { method: 'PUT', token, body: { status } },
  );
}
export async function removeCareerConnection(token: string, id: string) {
  return apiRequest<{ removed: boolean }>(`career/connections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  });
}
export async function getMentorshipRequests(token: string) {
  return apiRequest<{ requests: MentorshipRequest[] }>('career/mentorship/requests', { token });
}
export async function createMentorshipRequest(
  token: string,
  input: { mentorId: string; subject: string; message: string; goals?: string[] },
) {
  return apiRequest<{ request: MentorshipRequest; idempotentReplay?: boolean }>(
    'career/mentorship/requests',
    { method: 'POST', token, body: input },
  );
}
export async function updateMentorshipRequest(
  token: string,
  id: string,
  input: {
    status: 'accepted' | 'declined' | 'cancelled';
    responseNote?: string;
    responseMessage?: string;
  },
) {
  return apiRequest<{ request: MentorshipRequest }>(
    `career/mentorship/requests/${encodeURIComponent(id)}`,
    { method: 'PUT', token, body: input },
  );
}
export async function getConversations(token: string) {
  return apiRequest<{ conversations: CareerConversation[] }>('messages/conversations', { token });
}
export async function openDirectConversation(token: string, userId: string) {
  return apiRequest<{ conversation: CareerConversation }>('messages/conversations/direct', {
    method: 'POST',
    token,
    body: { userId },
  });
}
export async function getConversationMessages(token: string, id: string, before?: string) {
  return apiRequest<{ messages: CareerMessage[]; nextBefore: string | null }>(
    `messages/conversations/${encodeURIComponent(id)}/messages`,
    { token, query: { limit: 50, before } },
  );
}
export async function sendConversationMessage(
  token: string,
  id: string,
  content: string,
  clientMessageId: string,
) {
  return apiRequest<{ message: CareerMessage; idempotentReplay?: boolean }>(
    `messages/conversations/${encodeURIComponent(id)}/messages`,
    { method: 'POST', token, body: { content, clientMessageId } },
  );
}
export async function markCareerMessageRead(token: string, id: string) {
  return apiRequest<{ read: boolean }>(`messages/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    token,
    body: {},
  });
}
