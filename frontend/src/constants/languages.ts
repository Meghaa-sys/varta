import type { LanguageCode } from "../types";

export const languages: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ml", label: "Malayalam" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" }
];

export const languageLabel = (code?: string | null) =>
  languages.find((language) => language.code === code)?.label ?? "Auto-detected";
