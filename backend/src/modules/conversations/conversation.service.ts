import type { ConversationRole, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../utils/api-error";
import { publicUserSelect } from "../users/user.select";

const conversationInclude = {
  members: {
    include: {
      user: { select: publicUserSelect }
    }
  },
  messages: {
    orderBy: { createdAt: "desc" },
    take: 1,
    include: {
      sender: { select: publicUserSelect },
      attachments: true,
      translations: true,
      reactions: {
        include: {
          user: { select: publicUserSelect }
        }
      },
      readReceipts: true,
      replyTo: {
        include: {
          sender: { select: publicUserSelect }
        }
      }
    }
  }
} satisfies Prisma.ConversationInclude;

type ConversationWithInclude = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

const shapeConversation = (conversation: ConversationWithInclude, viewerId: string) => {
  const myMembership = conversation.members.find((member) => member.userId === viewerId);
  const otherMember = conversation.members.find((member) => member.userId !== viewerId);
  const lastMessage = conversation.messages[0];

  return {
    id: conversation.id,
    type: conversation.type,
    name: conversation.type === "PRIVATE" ? otherMember?.user.username ?? "Direct Message" : conversation.name,
    avatar: conversation.type === "PRIVATE" ? otherMember?.user.avatar ?? null : conversation.avatar,
    createdById: conversation.createdById,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    unreadCount: myMembership?.unreadCount ?? 0,
    myRole: myMembership?.role ?? "MEMBER",
    members: conversation.members.map((member) => ({
      id: member.id,
      role: member.role,
      unreadCount: member.unreadCount,
      muted: member.muted,
      joinedAt: member.joinedAt,
      user: member.user
    })),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          content: lastMessage.content,
          senderId: lastMessage.senderId,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt,
          attachments: lastMessage.attachments
        }
      : null
  };
};

const getConversation = async (conversationId: string) =>
  prisma.conversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude
  });

const requireAdmin = async (conversationId: string, userId: string) => {
  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    },
    include: { conversation: true }
  });

  if (!membership || membership.conversation.type !== "GROUP") {
    throw new ApiError(404, "Group conversation not found");
  }

  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new ApiError(403, "Only group admins can do that");
  }

  return membership;
};

export const listConversations = async (userId: string) => {
  const conversations = await prisma.conversation.findMany({
    where: {
      members: {
        some: { userId }
      }
    },
    include: conversationInclude,
    orderBy: { updatedAt: "desc" }
  });

  return conversations.map((conversation) => shapeConversation(conversation, userId));
};

export const getConversationForUser = async (conversationId: string, userId: string) => {
  const conversation = await getConversation(conversationId);

  if (!conversation || !conversation.members.some((member) => member.userId === userId)) {
    throw new ApiError(404, "Conversation not found");
  }

  return shapeConversation(conversation, userId);
};

export const createPrivateConversation = async (userId: string, recipientId: string) => {
  if (userId === recipientId) {
    throw new ApiError(400, "Cannot create a private conversation with yourself");
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) {
    throw new ApiError(404, "Recipient not found");
  }

  const possibleMatches = await prisma.conversation.findMany({
    where: {
      type: "PRIVATE",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: recipientId } } }
      ]
    },
    include: conversationInclude
  });

  const existing = possibleMatches.find((conversation) => conversation.members.length === 2);
  if (existing) {
    return shapeConversation(existing, userId);
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "PRIVATE",
      createdById: userId,
      members: {
        create: [{ userId, role: "MEMBER" }, { userId: recipientId, role: "MEMBER" }]
      }
    },
    include: conversationInclude
  });

  return shapeConversation(conversation, userId);
};

export const createGroupConversation = async (
  userId: string,
  input: { name: string; memberIds: string[] }
) => {
  const memberIds = Array.from(new Set([userId, ...input.memberIds]));

  if (memberIds.length < 2) {
    throw new ApiError(400, "A group needs at least two members");
  }

  const users = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true }
  });

  if (users.length !== memberIds.length) {
    throw new ApiError(400, "One or more members do not exist");
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: input.name,
      createdById: userId,
      members: {
        create: memberIds.map((memberId) => ({
          userId: memberId,
          role: memberId === userId ? "OWNER" : "MEMBER"
        }))
      }
    },
    include: conversationInclude
  });

  await prisma.notification.createMany({
    data: memberIds
      .filter((memberId) => memberId !== userId)
      .map((memberId) => ({
        userId: memberId,
        title: "Added to group",
        content: `You were added to ${input.name}`,
        type: "GROUP_INVITE",
        conversationId: conversation.id
      }))
  });

  return shapeConversation(conversation, userId);
};

export const updateGroup = async (
  conversationId: string,
  userId: string,
  input: { name?: string; avatar?: string | null }
) => {
  await requireAdmin(conversationId, userId);

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: input,
    include: conversationInclude
  });

  return shapeConversation(conversation, userId);
};

export const addGroupMembers = async (conversationId: string, requesterId: string, memberIds: string[]) => {
  const membership = await requireAdmin(conversationId, requesterId);
  const uniqueMemberIds = Array.from(new Set(memberIds)).filter((memberId) => memberId !== requesterId);

  if (!uniqueMemberIds.length) {
    throw new ApiError(400, "No new members were supplied");
  }

  await prisma.conversationMember.createMany({
    data: uniqueMemberIds.map((memberId) => ({
      conversationId,
      userId: memberId,
      role: "MEMBER" as ConversationRole
    })),
    skipDuplicates: true
  });

  await prisma.groupInvitation.createMany({
    data: uniqueMemberIds.map((memberId) => ({
      conversationId,
      inviterId: requesterId,
      inviteeId: memberId,
      status: "ACCEPTED"
    })),
    skipDuplicates: true
  });

  await prisma.notification.createMany({
    data: uniqueMemberIds.map((memberId) => ({
      userId: memberId,
      title: "Group invitation",
      content: `You were added to ${membership.conversation.name ?? "a group"}`,
      type: "GROUP_INVITE",
      conversationId
    }))
  });

  return getConversationForUser(conversationId, requesterId);
};

export const removeGroupMember = async (
  conversationId: string,
  requesterId: string,
  memberId: string
) => {
  const requester = await requireAdmin(conversationId, requesterId);

  if (requester.role !== "OWNER") {
    const target = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: memberId
        }
      }
    });

    if (target?.role === "OWNER" || target?.role === "ADMIN") {
      throw new ApiError(403, "Only the owner can remove admins");
    }
  }

  await prisma.conversationMember.delete({
    where: {
      conversationId_userId: {
        conversationId,
        userId: memberId
      }
    }
  });

  return getConversationForUser(conversationId, requesterId);
};
