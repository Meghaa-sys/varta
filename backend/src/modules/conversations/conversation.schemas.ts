import { z } from "zod";

export const createPrivateConversationSchema = z.object({
  recipientId: z.string().uuid()
});

export const createGroupConversationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  memberIds: z.array(z.string().uuid()).min(1)
});

export const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(80).optional()
});

export const memberIdsSchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1)
});

export const messageQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const createMessageSchema = z.object({
  content: z.string().optional(),
  replyToId: z.string().uuid().optional()
});
