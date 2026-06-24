import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import {
  isSupportedLanguage,
  languageName,
  supportedLanguageCodes,
  type SupportedLanguageCode
} from "../../constants/languages";
import { ApiError } from "../../utils/api-error";

let gemini: GoogleGenerativeAI | null = null;

const getGeminiClient = () => {
  if (!env.GEMINI_API_KEY) {
    throw new ApiError(503, "Gemini API key is not configured");
  }

  gemini ??= new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return gemini;
};

const modelCandidates = () =>
  Array.from(
    new Set(
      [env.GEMINI_MODEL, "gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-flash-lite"]
        .map((model) => model?.trim())
        .filter(Boolean) as string[]
    )
  );

const geminiErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : typeof error === "string" ? error : "Gemini request failed";

const shouldTryNextModel = (message: string) =>
  /404|not found|503|service unavailable|high demand|429|rate limit|quota/i.test(message);

const generateGeminiText = async (prompt: string) => {
  const client = getGeminiClient();
  const errors: string[] = [];

  for (const modelName of modelCandidates()) {
    try {
      const result = await client.getGenerativeModel({ model: modelName }).generateContent(prompt);
      return result.response.text();
    } catch (error) {
      const message = geminiErrorMessage(error);
      errors.push(`${modelName}: ${message}`);

      if (!shouldTryNextModel(message)) {
        throw new ApiError(502, "Translation service rejected the request", message);
      }
    }
  }

  throw new ApiError(
    503,
    "Translation service is temporarily busy. Please try again in a moment.",
    errors.join(" | ")
  );
};

const stripJsonFences = (value: string) =>
  value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const parseGeminiJson = (text: string) => {
  try {
    return JSON.parse(stripJsonFences(text));
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new ApiError(502, "Gemini returned an invalid translation response");
    return JSON.parse(match[0]);
  }
};

export const detectLanguageForContent = async (content: string): Promise<string | null> => {
  if (!env.GEMINI_API_KEY || !content.trim()) {
    return null;
  }

  const prompt = [
    "Detect the language of this chat message.",
    `Supported output codes: ${supportedLanguageCodes.join(", ")}.`,
    'Return only JSON like {"sourceLanguageCode":"en"}.',
    "If uncertain, choose the closest supported language.",
    "",
    content
  ].join("\n");

  const text = await generateGeminiText(prompt);
  const parsed = parseGeminiJson(text);
  const code = String(parsed.sourceLanguageCode ?? "").toLowerCase();

  return isSupportedLanguage(code) ? code : null;
};

export const translateMessageForUser = async (
  messageId: string,
  userId: string,
  targetLanguage: SupportedLanguageCode,
  slangMode: boolean
) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        select: {
          members: {
            where: { userId },
            select: { id: true }
          }
        }
      },
      translations: {
        where: {
          languageCode: targetLanguage,
          slangMode
        }
      }
    }
  });

  if (!message || message.conversation.members.length === 0) {
    throw new ApiError(404, "Message not found");
  }

  const existing = message.translations[0];
  if (existing) {
    return existing;
  }

  if (!message.content.trim()) {
    throw new ApiError(400, "Only text messages can be translated");
  }

  const targetName = languageName(targetLanguage);
  const prompt = [
    "You are a production chat translation engine for WhatsApp/Discord-style messages.",
    "Translate the message into the requested target language.",
    "Detect the source language automatically.",
    "Preserve emojis, mentions, URLs, markdown-like formatting, line breaks, times, numbers, and names.",
    "Do not add explanations.",
    slangMode
      ? "Use natural regional expressions and conversational local phrasing where appropriate."
      : "Use clear, natural standard phrasing.",
    `Supported language codes: ${supportedLanguageCodes.join(", ")}.`,
    `Target language: ${targetName} (${targetLanguage}).`,
    'Return only minified JSON: {"sourceLanguageCode":"en","translatedText":"..."}',
    "",
    "Message:",
    message.content
  ].join("\n");

  const text = await generateGeminiText(prompt);
  const parsed = parseGeminiJson(text);
  const sourceLanguage = String(parsed.sourceLanguageCode ?? message.originalLanguage ?? "auto").toLowerCase();
  const translatedText = String(parsed.translatedText ?? "").trim();

  if (!translatedText) {
    throw new ApiError(502, "Gemini returned an empty translation");
  }

  if (!message.originalLanguage && isSupportedLanguage(sourceLanguage)) {
    await prisma.message.update({
      where: { id: messageId },
      data: { originalLanguage: sourceLanguage }
    });
  }

  return prisma.translation.upsert({
    where: {
      messageId_languageCode_slangMode: {
        messageId,
        languageCode: targetLanguage,
        slangMode
      }
    },
    update: {},
    create: {
      messageId,
      languageCode: targetLanguage,
      sourceLanguage: isSupportedLanguage(sourceLanguage) ? sourceLanguage : message.originalLanguage,
      translatedText,
      translatedByAI: true,
      slangMode
    }
  });
};
