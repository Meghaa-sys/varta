import clsx from "clsx";
import {
  Copy,
  Download,
  FileAudio,
  Languages,
  MessageSquareReply,
  SmilePlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { addReaction, translateMessage } from "../api/chat";
import { languageLabel, languages } from "../constants/languages";
import { apiErrorMessage } from "../lib/api";
import type { LanguageCode, Message, PublicUser, Translation } from "../types";
import { Avatar } from "./Avatar";
import { IconButton } from "./IconButton";

const quickReactions = [
  "\u{1F44D}",
  "\u{2764}\u{FE0F}",
  "\u{1F602}",
  "\u{1F525}",
  "\u{1F64F}",
];

const formatBytes = (value: number) => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const isVoiceAttachment = (attachment: Message["attachments"][number]) =>
  attachment.mimeType.startsWith("audio/") ||
  attachment.mimeType === "video/webm";

const AttachmentPreview = ({
  attachment,
  isMine,
}: {
  attachment: Message["attachments"][number];
  isMine: boolean;
}) => {
  if (attachment.type === "IMAGE") {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block overflow-hidden rounded-md"
      >
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="max-h-64 w-full object-cover"
        />
      </a>
    );
  }

  if (isVoiceAttachment(attachment)) {
    return (
      <div
        className={clsx(
          "mt-2 rounded-md border px-3 py-2",
          isMine ? "border-white/30 bg-white/10" : "border-line bg-white/80",
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold">
          <span className="flex min-w-0 items-center gap-2">
            <FileAudio size={15} />
            <span className="truncate">Voice message</span>
          </span>
          <span className={clsx(isMine ? "text-blue-100" : "text-slate-500")}>
            {formatBytes(attachment.size)}
          </span>
        </div>
        <audio
          controls
          src={attachment.url}
          className="h-10 w-72 max-w-full"
          preload="metadata"
        >
          <a href={attachment.url}>Download</a>
        </audio>
      </div>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "mt-2 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
        isMine
          ? "border-white/30 bg-white/10 text-white"
          : "border-line bg-white/80 text-ink",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold">
          {attachment.fileName}
        </span>
        <span
          className={clsx(
            "text-xs",
            isMine ? "text-blue-100" : "text-slate-500",
          )}
        >
          {attachment.type} - {formatBytes(attachment.size)}
        </span>
      </span>
      <Download size={17} />
    </a>
  );
};

export const MessageBubble = ({
  message,
  currentUser,
  onReply,
  onMessageUpdated,
}: {
  message: Message;
  currentUser: PublicUser;
  onReply: (message: Message) => void;
  onMessageUpdated: (message: Message) => void;
}) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [localTranslation, setLocalTranslation] = useState<Translation | null>(
    null,
  );
  const [translationError, setTranslationError] = useState("");
  const [showOriginalOnly, setShowOriginalOnly] = useState(false);
  const [translateMenuOpen, setTranslateMenuOpen] = useState(false);
  const isMine = message.senderId === currentUser.id;

  const preferredTranslation = useMemo(() => {
    if (localTranslation) return localTranslation;
    return (
      message.translations.find(
        (translation) =>
          translation.languageCode === currentUser.preferredLanguage &&
          translation.slangMode === currentUser.regionalSlangMode,
      ) ?? null
    );
  }, [
    currentUser.preferredLanguage,
    currentUser.regionalSlangMode,
    localTranslation,
    message.translations,
  ]);

  const displayTranslation =
    preferredTranslation && !showOriginalOnly ? preferredTranslation : null;
  const groupedReactions = quickReactions
    .map((emoji) => ({
      emoji,
      count: message.reactions.filter((reaction) => reaction.emoji === emoji)
        .length,
    }))
    .filter((reaction) => reaction.count > 0);

  const requestTranslation = async (targetLanguage: LanguageCode) => {
    setIsTranslating(true);
    setTranslationError("");
    setTranslateMenuOpen(false);
    try {
      const translation = await translateMessage(message.id, {
        targetLanguage,
        slangMode: currentUser.regionalSlangMode,
      });
      setLocalTranslation(translation);
      setShowOriginalOnly(false);
    } catch (error) {
      setTranslationError(apiErrorMessage(error));
    } finally {
      setIsTranslating(false);
    }
  };

  const react = async (emoji: string) => {
    try {
      onMessageUpdated(await addReaction(message.id, emoji));
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  return (
    <div
      className={clsx("group flex gap-3 px-5 py-2.5", isMine && "justify-end")}
    >
      {!isMine ? <Avatar user={message.sender} size="sm" showStatus /> : null}

      <div
        className={clsx("max-w-[82%] md:max-w-[68%]", isMine && "items-end")}
      >
        {!isMine ? (
          <p className="mb-1 text-xs font-semibold text-slate-500">
            {message.sender.username}
          </p>
        ) : null}

        <div
          className={clsx(
            "rounded-lg px-3.5 py-2.5 shadow-sm",
            isMine
              ? "bg-brand text-white shadow-[0_8px_18px_rgba(37,99,235,0.18)]"
              : "border border-line bg-white text-ink shadow-sm",
          )}
        >
          {message.replyTo ? (
            <div
              className={clsx(
                "mb-2 rounded border-l-4 px-2 py-1 text-xs",
                isMine
                  ? "border-white/70 bg-white/10"
                  : "border-brand bg-blue-50 text-slate-600",
              )}
            >
              <span className="font-semibold">
                {message.replyTo.sender.username}
              </span>
              <span className="ml-2">{message.replyTo.content}</span>
            </div>
          ) : null}

          {message.content ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {message.content}
            </p>
          ) : null}

          {displayTranslation ? (
            <div
              className={clsx(
                "mt-3 rounded-md border px-3 py-2 text-sm",
                isMine
                  ? "border-white/30 bg-white/10"
                  : "border-emerald-200 bg-emerald-50 text-ink",
              )}
            >
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                <span>
                  {languageLabel(displayTranslation.languageCode)} - translated
                  from{" "}
                  {languageLabel(
                    displayTranslation.sourceLanguage ??
                      message.originalLanguage,
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowOriginalOnly(true)}
                  className="underline"
                >
                  Show original
                </button>
              </div>
              <p className="whitespace-pre-wrap break-words leading-6">
                {displayTranslation.translatedText}
              </p>
            </div>
          ) : null}

          {translationError ? (
            <div
              className={clsx(
                "mt-3 rounded-md border px-3 py-2 text-xs font-semibold",
                isMine
                  ? "border-white/30 bg-white/10 text-blue-50"
                  : "border-amber-200 bg-amber-50 text-amber-800",
              )}
            >
              Translation unavailable: {translationError}
            </div>
          ) : null}

          {message.attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              isMine={isMine}
            />
          ))}

          <div
            className={clsx(
              "mt-2 text-[11px] font-medium",
              isMine ? "text-blue-100" : "text-slate-400",
            )}
          >
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        {groupedReactions.length ? (
          <div
            className={clsx(
              "mt-1 flex flex-wrap gap-1",
              isMine && "justify-end",
            )}
          >
            {groupedReactions.map((reaction) => (
              <span
                key={reaction.emoji}
                className="rounded-full border border-line bg-white px-2 py-0.5 text-xs shadow-sm"
              >
                {reaction.emoji} {reaction.count}
              </span>
            ))}
          </div>
        ) : null}

        <div
          className={clsx(
            "mt-1.5 flex flex-wrap gap-1 opacity-0 transition group-hover:opacity-100",
            isMine && "justify-end",
          )}
        >
          <IconButton
            label="Copy"
            className="h-8 w-8"
            onClick={() => navigator.clipboard.writeText(message.content)}
          >
            <Copy size={15} />
          </IconButton>
          <IconButton
            label="Reply"
            className="h-8 w-8"
            onClick={() => onReply(message)}
          >
            <MessageSquareReply size={15} />
          </IconButton>
          <span className="relative">
            <IconButton
              label="Translate"
              className={clsx(
                "h-8 w-8",
                translateMenuOpen && "border-brand text-brand",
              )}
              onClick={() => setTranslateMenuOpen((open) => !open)}
              disabled={isTranslating || !message.content}
            >
              <Languages size={15} />
            </IconButton>
            {translateMenuOpen ? (
              <div
                className={clsx(
                  "absolute z-20 mt-2 w-52 rounded-md border border-line bg-white p-2 text-left text-ink shadow-soft",
                  isMine ? "right-0" : "left-0",
                )}
              >
                <p className="px-2 pb-2 text-xs font-bold uppercase text-slate-500">
                  Translate to
                </p>
                <div className="grid gap-1">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => requestTranslation(language.code)}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-panel"
                    >
                      <span>{language.label}</span>
                      {language.code === currentUser.preferredLanguage ? (
                        <span className="text-xs font-semibold text-brand">
                          Default
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </span>
          <span className="flex gap-1 rounded-md border border-line bg-white px-1 py-1 shadow-sm">
            <SmilePlus size={15} className="mt-1 text-slate-400" />
            {quickReactions.map((emoji) => (
              <button
                type="button"
                key={emoji}
                onClick={() => react(emoji)}
                className="grid h-6 w-6 place-items-center rounded text-sm hover:bg-blue-50"
              >
                {emoji}
              </button>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
};
