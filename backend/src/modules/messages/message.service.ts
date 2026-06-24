import type { AttachmentType, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { uploadBufferToCloudinary } from "../../config/cloudinary";
import { ApiError } from "../../utils/api-error";
import { publicUserSelect } from "../users/user.select";
import { detectLanguageForContent } from "../translation/translation.service";

const messageInclude = {
  sender: { select: publicUserSelect },
  attachments: true,
  translations: true,
  reactions: {
    include: {
      user: { select: publicUserSelect },
    },
  },
  readReceipts: true,
  replyTo: {
    include: {
      sender: { select: publicUserSelect },
    },
  },
} satisfies Prisma.MessageInclude;

export const assertConversationMember = async (
  conversationId: string,
  userId: string,
) => {
  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new ApiError(403, "You are not a member of this conversation");
  }

  return membership;
};

const classifyAttachment = (mimeType: string): AttachmentType => {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType === "application/pdf") return "PDF";
  if (
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("powerpoint") ||
    mimeType === "text/plain" ||
    mimeType === "text/csv"
  ) {
    return "DOCUMENT";
  }
  return "OTHER";
};

const uploadAttachments = async (
  files: Express.Multer.File[],
  conversationId: string,
) =>
  Promise.all(
    files.map(async (file) => {
      const uploaded = await uploadBufferToCloudinary(
        file,
        `ai-chat/conversations/${conversationId}`,
      );

      return {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type: classifyAttachment(file.mimetype),
      };
    }),
  );

export const formatMessage = (
  message: Prisma.MessageGetPayload<{ include: typeof messageInclude }>,
) => ({
  id: message.id,
  conversationId: message.conversationId,
  senderId: message.senderId,
  sender: message.sender,
  content: message.content,
  originalLanguage: message.originalLanguage,
  replyToId: message.replyToId,
  replyTo: message.replyTo
    ? {
        id: message.replyTo.id,
        content: message.replyTo.content,
        sender: message.replyTo.sender,
      }
    : null,
  attachments: message.attachments,
  translations: message.translations,
  reactions: message.reactions.map((reaction) => ({
    id: reaction.id,
    emoji: reaction.emoji,
    userId: reaction.userId,
    user: reaction.user,
    createdAt: reaction.createdAt,
  })),
  readBy: message.readReceipts.map((receipt) => ({
    userId: receipt.userId,
    readAt: receipt.readAt,
  })),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  deletedAt: message.deletedAt,
});

export const getMessageById = async (messageId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  return formatMessage(message);
};

export const listMessages = async (
  conversationId: string,
  userId: string,
  options: { cursor?: string; limit?: number },
) => {
  await assertConversationMember(conversationId, userId);

  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null,
    },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: Math.min(options.limit ?? 40, 100),
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });

  return messages.reverse().map(formatMessage);
};

export const createMessage = async (input: {
  conversationId: string;
  senderId: string;
  content?: string;
  replyToId?: string | null;
  files?: Express.Multer.File[];
}) => {
  const content = input.content?.trim() ?? "";
  const files = input.files ?? [];

  if (!content && files.length === 0) {
    throw new ApiError(
      400,
      "Message content or at least one attachment is required",
    );
  }

  await assertConversationMember(input.conversationId, input.senderId);

  if (input.replyToId) {
    const replyTo = await prisma.message.findFirst({
      where: {
        id: input.replyToId,
        conversationId: input.conversationId,
      },
      select: { id: true },
    });

    if (!replyTo) {
      throw new ApiError(400, "Reply target is not in this conversation");
    }
  }

  const [attachments, originalLanguage] = await Promise.all([
    uploadAttachments(files, input.conversationId),
    content
      ? detectLanguageForContent(content).catch(() => null)
      : Promise.resolve(null),
  ]);

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      senderId: input.senderId,
      content,
      originalLanguage,
      replyToId: input.replyToId || undefined,
      attachments: {
        create: attachments,
      },
    },
    include: messageInclude,
  });

  await prisma.$transaction([
    prisma.conversation.update({
      where: { id: input.conversationId },
      data: { updatedAt: new Date() },
    }),
    prisma.conversationMember.updateMany({
      where: {
        conversationId: input.conversationId,
        userId: { not: input.senderId },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    }),
  ]);

  const recipients = await prisma.conversationMember.findMany({
    where: {
      conversationId: input.conversationId,
      userId: { not: input.senderId },
      muted: false,
    },
    select: { userId: true },
  });

  if (recipients.length) {
    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.userId,
        title: "New message",
        content: content || "Sent an attachment",
        type: "NEW_MESSAGE",
        conversationId: input.conversationId,
        messageId: message.id,
      })),
    });
  }

  return formatMessage(message);
};

export const addReaction = async (
  messageId: string,
  userId: string,
  emoji: string,
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  await assertConversationMember(message.conversationId, userId);

  await prisma.reaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId,
        emoji,
      },
    },
    update: {},
    create: {
      messageId,
      userId,
      emoji,
    },
  });

  return getMessageById(messageId);
};

export const removeReaction = async (
  messageId: string,
  userId: string,
  emoji: string,
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  await assertConversationMember(message.conversationId, userId);

  await prisma.reaction.deleteMany({
    where: {
      messageId,
      userId,
      emoji,
    },
  });

  return getMessageById(messageId);
};

export const markConversationRead = async (
  conversationId: string,
  userId: string,
) => {
  await assertConversationMember(conversationId, userId);

  const unreadMessages = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: { not: userId },
      readReceipts: {
        none: { userId },
      },
    },
    select: { id: true },
  });

  if (unreadMessages.length) {
    await prisma.messageReadReceipt.createMany({
      data: unreadMessages.map((message) => ({
        messageId: message.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.conversationMember.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    data: { unreadCount: 0 },
  });

  return unreadMessages.map((message) => message.id);
};
