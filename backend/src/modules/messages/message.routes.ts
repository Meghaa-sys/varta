import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { isSupportedLanguage, type SupportedLanguageCode } from "../../constants/languages";
import { addReaction, removeReaction } from "./message.service";
import { reactionSchema, translateSchema } from "./message.schemas";
import { translateMessageForUser } from "../translation/translation.service";
import { emitMessageUpdated } from "../../realtime/socket";

export const messageRouter = Router();

messageRouter.use(requireAuth);

messageRouter.post(
  "/:messageId/reactions",
  validateBody(reactionSchema),
  asyncHandler(async (req, res) => {
    const message = await addReaction(req.params.messageId, req.user!.id, req.body.emoji);
    emitMessageUpdated(message.conversationId, message);
    res.status(201).json({ message });
  })
);

messageRouter.delete(
  "/:messageId/reactions",
  validateBody(reactionSchema),
  asyncHandler(async (req, res) => {
    const message = await removeReaction(req.params.messageId, req.user!.id, req.body.emoji);
    emitMessageUpdated(message.conversationId, message);
    res.json({ message });
  })
);

messageRouter.post(
  "/:messageId/translate",
  validateBody(translateSchema),
  asyncHandler(async (req, res) => {
    const targetLanguage = (req.body.targetLanguage ?? req.user!.preferredLanguage) as string;
    const slangMode = Boolean(req.body.slangMode ?? req.user!.regionalSlangMode);

    if (!isSupportedLanguage(targetLanguage)) {
      return res.status(400).json({ message: "Unsupported target language" });
    }

    const translation = await translateMessageForUser(
      req.params.messageId,
      req.user!.id,
      targetLanguage as SupportedLanguageCode,
      slangMode
    );

    res.json({ translation });
  })
);
