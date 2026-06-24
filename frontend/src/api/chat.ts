import { api } from "../lib/api";
import type { Conversation, LanguageCode, Message, Notification, Translation } from "../types";

export const fetchConversations = () =>
  api.get<{ conversations: Conversation[] }>("/conversations").then((res) => res.data.conversations);

export const createPrivateConversation = (recipientId: string) =>
  api
    .post<{ conversation: Conversation }>("/conversations/private", { recipientId })
    .then((res) => res.data.conversation);

export const createGroupConversation = (payload: { name: string; memberIds: string[] }) =>
  api.post<{ conversation: Conversation }>("/conversations/groups", payload).then((res) => res.data.conversation);

export const updateGroup = (conversationId: string, payload: { name?: string }) =>
  api.patch<{ conversation: Conversation }>(`/conversations/${conversationId}`, payload).then((res) => res.data.conversation);

export const uploadGroupAvatar = (conversationId: string, file: File) => {
  const form = new FormData();
  form.append("avatar", file);
  return api
    .post<{ conversation: Conversation }>(`/conversations/${conversationId}/avatar`, form)
    .then((res) => res.data.conversation);
};

export const addMembers = (conversationId: string, memberIds: string[]) =>
  api
    .post<{ conversation: Conversation }>(`/conversations/${conversationId}/members`, { memberIds })
    .then((res) => res.data.conversation);

export const removeMember = (conversationId: string, memberId: string) =>
  api
    .delete<{ conversation: Conversation }>(`/conversations/${conversationId}/members/${memberId}`)
    .then((res) => res.data.conversation);

export const fetchMessages = (conversationId: string) =>
  api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`).then((res) => res.data.messages);

export const sendMessageWithFiles = (conversationId: string, payload: { content: string; replyToId?: string | null; files: File[] }) => {
  const form = new FormData();
  form.append("content", payload.content);
  if (payload.replyToId) form.append("replyToId", payload.replyToId);
  payload.files.forEach((file) => form.append("files", file));

  return api
    .post<{ message: Message }>(`/conversations/${conversationId}/messages`, form)
    .then((res) => res.data.message);
};

export const markConversationRead = (conversationId: string) =>
  api.post<{ messageIds: string[] }>(`/conversations/${conversationId}/read`).then((res) => res.data.messageIds);

export const addReaction = (messageId: string, emoji: string) =>
  api.post<{ message: Message }>(`/messages/${messageId}/reactions`, { emoji }).then((res) => res.data.message);

export const removeReaction = (messageId: string, emoji: string) =>
  api.delete<{ message: Message }>(`/messages/${messageId}/reactions`, { data: { emoji } }).then((res) => res.data.message);

export const translateMessage = (messageId: string, payload: { targetLanguage?: LanguageCode; slangMode?: boolean }) =>
  api.post<{ translation: Translation }>(`/messages/${messageId}/translate`, payload).then((res) => res.data.translation);

export const fetchNotifications = () =>
  api.get<{ notifications: Notification[] }>("/notifications").then((res) => res.data.notifications);

export const markAllNotificationsRead = () => api.patch<{ updated: number }>("/notifications/read-all").then((res) => res.data.updated);
