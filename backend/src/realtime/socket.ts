import jwt from "jsonwebtoken";
import type { Server, Socket } from "socket.io";
import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { createMessage, addReaction, removeReaction, markConversationRead } from "../modules/messages/message.service";
import { ApiError } from "../utils/api-error";

type SocketUser = {
  id: string;
  username: string;
};

type JwtPayload = {
  userId: string;
};

let ioRef: Server | null = null;
const activeSockets = new Map<string, Set<string>>();

const userRoom = (userId: string) => `user:${userId}`;
const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;

const addActiveSocket = (userId: string, socketId: string) => {
  const sockets = activeSockets.get(userId) ?? new Set<string>();
  sockets.add(socketId);
  activeSockets.set(userId, sockets);
  return sockets.size;
};

const removeActiveSocket = (userId: string, socketId: string) => {
  const sockets = activeSockets.get(userId);
  if (!sockets) return 0;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    activeSockets.delete(userId);
  }

  return sockets.size;
};

const wrapSocketHandler =
  (socket: Socket, handler: (...args: any[]) => Promise<void>) =>
  (...args: any[]) => {
    handler(...args).catch((error) => {
      const message = error instanceof ApiError ? error.message : "Realtime action failed";
      socket.emit("error:message", { message });
    });
  };

const authenticateSocket = async (socket: Socket, next: (error?: Error) => void) => {
  const token =
    socket.handshake.auth?.token ??
    socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    next(new Error("Socket authentication token is required"));
    return;
  }

  try {
    const payload = jwt.verify(String(token), env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true }
    });

    if (!user) {
      next(new Error("Socket user not found"));
      return;
    }

    socket.data.user = user satisfies SocketUser;
    next();
  } catch {
    next(new Error("Invalid socket token"));
  }
};

export const registerSocketServer = (io: Server) => {
  ioRef = io;
  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const user = socket.data.user as SocketUser;
    const connectionCount = addActiveSocket(user.id, socket.id);

    socket.join(userRoom(user.id));

    const memberships = await prisma.conversationMember.findMany({
      where: { userId: user.id },
      select: { conversationId: true }
    });

    memberships.forEach((membership) => {
      socket.join(conversationRoom(membership.conversationId));
    });

    if (connectionCount === 1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: null }
      });
      io.emit("presence:update", { userId: user.id, isOnline: true, lastSeen: null });
    }

    socket.on(
      "conversation:join",
      wrapSocketHandler(socket, async (conversationId: string) => {
        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId: user.id
            }
          }
        });

        if (!membership) throw new ApiError(403, "You are not a member of this conversation");
        socket.join(conversationRoom(conversationId));
      })
    );

    socket.on(
      "message:send",
      wrapSocketHandler(socket, async (payload, ack?: (response: unknown) => void) => {
        const message = await createMessage({
          conversationId: payload.conversationId,
          senderId: user.id,
          content: payload.content,
          replyToId: payload.replyToId
        });

        emitMessageCreated(payload.conversationId, message);
        ack?.({ ok: true, message });
      })
    );

    socket.on(
      "message:typing:start",
      wrapSocketHandler(socket, async (payload) => {
        socket.to(conversationRoom(payload.conversationId)).emit("message:typing", {
          conversationId: payload.conversationId,
          userId: user.id,
          username: user.username,
          isTyping: true
        });
      })
    );

    socket.on(
      "message:typing:stop",
      wrapSocketHandler(socket, async (payload) => {
        socket.to(conversationRoom(payload.conversationId)).emit("message:typing", {
          conversationId: payload.conversationId,
          userId: user.id,
          username: user.username,
          isTyping: false
        });
      })
    );

    socket.on(
      "message:read",
      wrapSocketHandler(socket, async (payload) => {
        const messageIds = await markConversationRead(payload.conversationId, user.id);
        emitReadReceipt(payload.conversationId, {
          userId: user.id,
          messageIds,
          readAt: new Date().toISOString()
        });
      })
    );

    socket.on(
      "message:reaction:add",
      wrapSocketHandler(socket, async (payload) => {
        const message = await addReaction(payload.messageId, user.id, payload.emoji);
        emitMessageUpdated(message.conversationId, message);
      })
    );

    socket.on(
      "message:reaction:remove",
      wrapSocketHandler(socket, async (payload) => {
        const message = await removeReaction(payload.messageId, user.id, payload.emoji);
        emitMessageUpdated(message.conversationId, message);
      })
    );

    socket.on("disconnect", async () => {
      const remaining = removeActiveSocket(user.id, socket.id);
      if (remaining === 0) {
        const lastSeen = new Date();
        await prisma.user.update({
          where: { id: user.id },
          data: { isOnline: false, lastSeen }
        });
        io.emit("presence:update", { userId: user.id, isOnline: false, lastSeen });
      }
    });
  });
};

export const emitMessageCreated = (conversationId: string, message: unknown) => {
  ioRef?.to(conversationRoom(conversationId)).emit("message:new", message);
};

export const emitMessageUpdated = (conversationId: string, message: unknown) => {
  ioRef?.to(conversationRoom(conversationId)).emit("message:update", message);
};

export const emitReadReceipt = (conversationId: string, payload: unknown) => {
  ioRef?.to(conversationRoom(conversationId)).emit("message:read", payload);
};

export const emitConversationUpdated = (conversationId: string) => {
  ioRef?.to(conversationRoom(conversationId)).emit("conversation:update", { conversationId });
};

export const onlineUserIds = () => Array.from(activeSockets.keys());
