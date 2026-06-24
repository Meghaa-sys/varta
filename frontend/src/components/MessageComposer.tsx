import { FilePlus, Mic, Send, Square, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Message } from "../types";
import { IconButton } from "./IconButton";

const formatRecordingTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
};

const recordingMimeType = () => {
  if (!window.MediaRecorder) return "";
  return (
    [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ].find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
};

const voiceExtension = (mimeType: string) => {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
};

export const MessageComposer = ({
  disabled,
  replyTo,
  onCancelReply,
  onSend,
  onTyping,
}: {
  disabled?: boolean;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSend: (payload: {
    content: string;
    files: File[];
    replyToId?: string | null;
  }) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
}) => {
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");
  const typingTimeout = useRef<number | null>(null);
  const recordingTimer = useRef<number | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordingStream = useRef<MediaStream | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const shouldSaveRecording = useRef(true);

  useEffect(
    () => () => {
      if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
      if (recordingTimer.current) window.clearInterval(recordingTimer.current);
      recordingStream.current?.getTracks().forEach((track) => track.stop());
      onTyping(false);
    },
    [onTyping],
  );

  const signalTyping = () => {
    onTyping(true);
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current);
    typingTimeout.current = window.setTimeout(() => onTyping(false), 1200);
  };

  const stopTimer = () => {
    if (recordingTimer.current) {
      window.clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  };

  const finishRecording = () => {
    const stream = recordingStream.current;
    stream?.getTracks().forEach((track) => track.stop());
    recordingStream.current = null;
    mediaRecorder.current = null;
    recordingChunks.current = [];
    stopTimer();
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const startRecording = async () => {
    setRecordingError("");

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setRecordingError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = recordingMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      recordingChunks.current = [];
      recordingStream.current = stream;
      mediaRecorder.current = recorder;
      shouldSaveRecording.current = true;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunks.current.push(event.data);
      };

      recorder.onstop = () => {
        if (shouldSaveRecording.current && recordingChunks.current.length) {
          const type = recorder.mimeType || "audio/webm";
          const blob = new Blob(recordingChunks.current, { type });
          const file = new File(
            [blob],
            `voice-message-${Date.now()}.${voiceExtension(type)}`,
            { type },
          );
          setFiles((current) => [...current, file]);
        }
        finishRecording();
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimer.current = window.setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      );
    } catch {
      setRecordingError("Microphone access was blocked.");
      finishRecording();
    }
  };

  const stopRecording = (save: boolean) => {
    shouldSaveRecording.current = save;
    const recorder = mediaRecorder.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    finishRecording();
  };

  const submit = async () => {
    if (isRecording || (!content.trim() && files.length === 0)) return;
    await onSend({ content, files, replyToId: replyTo?.id });
    setContent("");
    setFiles([]);
    onCancelReply();
    onTyping(false);
  };

  return (
    <div className="border-t border-line bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.05)]">
      {replyTo ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-line bg-[#f8fafc] px-3 py-2 shadow-sm">
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-ink">
              Replying to {replyTo.sender.username}
            </p>
            <p className="truncate text-slate-500">
              {replyTo.content || "Attachment"}
            </p>
          </div>
          <IconButton
            label="Cancel reply"
            className="h-8 w-8"
            onClick={onCancelReply}
          >
            <X size={15} />
          </IconButton>
        </div>
      ) : null}

      {recordingError ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {recordingError}
        </div>
      ) : null}

      {isRecording ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            {formatRecordingTime(recordingSeconds)}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => stopRecording(false)}
              className="inline-grid h-8 w-8 place-items-center rounded-md border border-red-200 bg-white text-red-600"
              aria-label="Discard voice message"
              title="Discard voice message"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={() => stopRecording(true)}
              className="inline-grid h-8 w-8 place-items-center rounded-md bg-red-600 text-white"
              aria-label="Stop voice message"
              title="Stop voice message"
            >
              <Square size={14} />
            </button>
          </div>
        </div>
      ) : null}

      {files.length ? (
        <div className="mb-3 flex flex-wrap gap-2 rounded-md border border-line bg-[#f8fafc] p-2">
          {files.map((file) => (
            <button
              key={`${file.name}-${file.size}-${file.lastModified}`}
              type="button"
              onClick={() =>
                setFiles((current) => current.filter((item) => item !== file))
              }
              className="rounded-md border border-line bg-panel px-2 py-1 text-xs text-slate-700"
            >
              {file.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-lg border border-line bg-[#f8fafc] p-2 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
        <label className="inline-grid h-10 w-10 cursor-pointer place-items-center rounded-md border border-line bg-white text-slate-600 shadow-sm transition hover:border-brand hover:bg-blue-50 hover:text-brand">
          <FilePlus size={19} />
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              setFiles((current) => [
                ...current,
                ...Array.from(event.target.files ?? []),
              ]);
              event.currentTarget.value = "";
            }}
          />
        </label>

        <button
          type="button"
          disabled={disabled || isRecording}
          onClick={startRecording}
          className="inline-grid h-10 w-10 place-items-center rounded-md border border-line bg-white text-slate-600 shadow-sm transition hover:border-brand hover:bg-blue-50 hover:text-brand disabled:opacity-50"
          aria-label="Record voice message"
          title="Record voice message"
        >
          <Mic size={19} />
        </button>

        <textarea
          value={content}
          disabled={disabled || isRecording}
          onChange={(event) => {
            setContent(event.target.value);
            signalTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Message"
          className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-slate-400"
        />

        <button
          type="button"
          disabled={
            disabled || isRecording || (!content.trim() && files.length === 0)
          }
          onClick={submit}
          className="inline-grid h-10 w-10 place-items-center rounded-md bg-brand text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
          aria-label="Send"
          title="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
