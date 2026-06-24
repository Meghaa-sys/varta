export type LanguageCode = "en" | "ml" | "hi" | "ta" | "te" | "kn";

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  preferredLanguage: LanguageCode;
  autoTranslateEnabled: boolean;
  regionalSlangMode: boolean;
  isOnline: boolean;
  lastSeen?: string | null;
  createdAt: string;
};

export type ConversationMember = {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  unreadCount: number;
  muted: boolean;
  joinedAt: string;
  user: PublicUser;
};

export type Attachment = {
  id: string;
  url: string;
  publicId?: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  type: "IMAGE" | "PDF" | "DOCUMENT" | "OTHER";
  createdAt: string;
};

export type Translation = {
  id: string;
  messageId: string;
  languageCode: LanguageCode;
  sourceLanguage?: LanguageCode | null;
  translatedText: string;
  translatedByAI: boolean;
  slangMode: boolean;
  createdAt: string;
};

export type Reaction = {
  id: string;
  emoji: string;
  userId: string;
  user: PublicUser;
  createdAt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  sender: PublicUser;
  content: string;
  originalLanguage?: LanguageCode | null;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    sender: PublicUser;
  } | null;
  attachments: Attachment[];
  translations: Translation[];
  reactions: Reaction[];
  readBy: { userId: string; readAt: string }[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type Conversation = {
  id: string;
  type: "PRIVATE" | "GROUP";
  name: string;
  avatar?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  myRole: "OWNER" | "ADMIN" | "MEMBER";
  members: ConversationMember[];
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    sender: PublicUser;
    createdAt: string;
    attachments: Attachment[];
  } | null;
};

export type Contact = {
  id: string;
  status: "PENDING" | "ACCEPTED";
  direction: "incoming" | "outgoing";
  contactUser: PublicUser;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  title: string;
  content: string;
  type: "NEW_MESSAGE" | "GROUP_INVITE" | "CONTACT_REQUEST" | "SYSTEM";
  isRead: boolean;
  conversationId?: string | null;
  messageId?: string | null;
  createdAt: string;
};

