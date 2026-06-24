import { z } from "zod";
import { supportedLanguageCodes } from "../../constants/languages";

const languageCode = z.enum(
  supportedLanguageCodes as [string, string, string, string, string, string]
);

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, {
    message: "Username can only contain letters, numbers, and underscores"
  }),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(8).max(128),
  preferredLanguage: languageCode.default("en")
});

export const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1)
});

export const preferencesSchema = z.object({
  preferredLanguage: languageCode.optional(),
  autoTranslateEnabled: z.boolean().optional(),
  regionalSlangMode: z.boolean().optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
