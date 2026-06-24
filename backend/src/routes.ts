import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes";
import { conversationRouter } from "./modules/conversations/conversation.routes";
import { contactRouter } from "./modules/contacts/contact.routes";
import { messageRouter } from "./modules/messages/message.routes";
import { notificationRouter } from "./modules/notifications/notification.routes";
import { SUPPORTED_LANGUAGES } from "./constants/languages";

export const apiRouter = Router();

apiRouter.get("/meta/languages", (_req, res) => {
  res.json({ languages: SUPPORTED_LANGUAGES });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/contacts", contactRouter);
apiRouter.use("/conversations", conversationRouter);
apiRouter.use("/messages", messageRouter);
apiRouter.use("/notifications", notificationRouter);

