export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ml", label: "Malayalam" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" }
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const supportedLanguageCodes = SUPPORTED_LANGUAGES.map((language) => language.code);

export const isSupportedLanguage = (code: string): code is SupportedLanguageCode =>
  supportedLanguageCodes.includes(code as SupportedLanguageCode);

export const languageName = (code?: string | null) =>
  SUPPORTED_LANGUAGES.find((language) => language.code === code)?.label ?? "Auto-detected";
