import type { Prisma } from "@prisma/client";

export const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  avatar: true,
  preferredLanguage: true,
  autoTranslateEnabled: true,
  regionalSlangMode: true,
  isOnline: true,
  lastSeen: true,
  createdAt: true
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
