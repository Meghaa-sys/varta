import { z } from "zod";
import { supportedLanguageCodes } from "../../constants/languages";

const languageCode = z.enum(
  supportedLanguageCodes as [string, string, string, string, string, string]
);

export const reactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16)
});

export const translateSchema = z.object({
  targetLanguage: languageCode.optional(),
  slangMode: z.boolean().optional()
});
