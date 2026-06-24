import { Router } from "express";
import { z } from "zod";
import { uploadBufferToCloudinary } from "../../config/cloudinary";
import { requireAuth } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { validateBody, validateQuery } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  addGroupMembers,
  createGroupConversation,
  createPrivateConversation,
  getConversationForUser,
  listConversations,
  removeGroupMember,
  updateGroup
} from "./conversation.service";
import {
  createGroupConversationSchema,
  createMessageSchema,
  createPrivateConversationSchema,
  memberIdsSchema,
  messageQuerySchema,
  updateGroupSchema
} from "./conversation.schemas";
import { createMessage, listMessages, markConversationRead } from "../messages/message.service";
import { emitConversationUpdated, emitMessageCreated, emitReadReceipt } from "../../realtime/socket";

export const conversationRouter = Router();

conversationRouter.use(requireAuth);

conversationRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ conversations: await listConversations(req.user!.id) });
  })
);

conversationRouter.post(
  "/private",
  validateBody(createPrivateConversationSchema),
  asyncHandler(async (req, res) => {
    const conversation = await createPrivateConversation(req.user!.id, req.body.recipientId);
    emitConversationUpdated(conversation.id);
    res.status(201).json({ conversation });
  })
);

conversationRouter.post(
  "/groups",
  validateBody(createGroupConversationSchema),
  asyncHandler(async (req, res) => {
    const conversation = await createGroupConversation(req.user!.id, req.body);
    emitConversationUpdated(conversation.id);
    res.status(201).json({ conversation });
  })
);

conversationRouter.get(
  "/:conversationId",
  asyncHandler(async (req, res) => {
    res.json({
      conversation: await getConversationForUser(req.params.conversationId, req.user!.id)
    });
  })
);

conversationRouter.patch(
  "/:conversationId",
  validateBody(updateGroupSchema),
  asyncHandler(async (req, res) => {
    const conversation = await updateGroup(req.params.conversationId, req.user!.id, req.body);
    emitConversationUpdated(conversation.id);
    res.json({ conversation });
  })
);

conversationRouter.post(
  "/:conversationId/avatar",
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Group avatar file is required" });
    }

    const uploaded = await uploadBufferToCloudinary(
      req.file,
      `ai-chat/group-avatars/${req.params.conversationId}`
    );
    const conversation = await updateGroup(req.params.conversationId, req.user!.id, {
      avatar: uploaded.secure_url
    });
    emitConversationUpdated(conversation.id);
    res.json({ conversation });
  })
);

conversationRouter.post(
  "/:conversationId/members",
  validateBody(memberIdsSchema),
  asyncHandler(async (req, res) => {
    const conversation = await addGroupMembers(
      req.params.conversationId,
      req.user!.id,
      req.body.memberIds
    );
    emitConversationUpdated(conversation.id);
    res.json({ conversation });
  })
);

conversationRouter.delete(
  "/:conversationId/members/:memberId",
  asyncHandler(async (req, res) => {
    const conversation = await removeGroupMember(
      req.params.conversationId,
      req.user!.id,
      z.string().uuid().parse(req.params.memberId)
    );
    emitConversationUpdated(conversation.id);
    res.json({ conversation });
  })
);

conversationRouter.get(
  "/:conversationId/messages",
  validateQuery(messageQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.query as { cursor?: string; limit?: number };
    res.json({
      messages: await listMessages(req.params.conversationId, req.user!.id, query)
    });
  })
);

conversationRouter.post(
  "/:conversationId/messages",
  upload.array("files"),
  asyncHandler(async (req, res) => {
    const body = createMessageSchema.parse(req.body);
    const message = await createMessage({
      conversationId: req.params.conversationId,
      senderId: req.user!.id,
      content: body.content,
      replyToId: body.replyToId,
      files: (req.files as Express.Multer.File[]) ?? []
    });

    emitMessageCreated(req.params.conversationId, message);
    res.status(201).json({ message });
  })
);

conversationRouter.post(
  "/:conversationId/read",
  asyncHandler(async (req, res) => {
    const messageIds = await markConversationRead(req.params.conversationId, req.user!.id);
    emitReadReceipt(req.params.conversationId, {
      userId: req.user!.id,
      messageIds,
      readAt: new Date().toISOString()
    });
    res.json({ messageIds });
  })
);
