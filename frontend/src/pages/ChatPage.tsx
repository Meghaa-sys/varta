import { Info, Languages, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Socket } from "socket.io-client";
import {
  fetchConversations,
  fetchMessages,
  fetchNotifications,
  markConversationRead,
  sendMessageWithFiles,
  translateMessage,
} from "../api/chat";
import { Avatar } from "../components/Avatar";
import { ConversationDetails } from "../components/ConversationDetails";
import { ConversationList } from "../components/ConversationList";
import { IconButton } from "../components/IconButton";
import { MessageBubble } from "../components/MessageBubble";
import { MessageComposer } from "../components/MessageComposer";
import { SettingsPanel } from "../components/SettingsPanel";
import { apiErrorMessage } from "../lib/api";
import { createSocket } from "../lib/socket";
import { useAuth } from "../state/AuthContext";
import type { Conversation, Message, Notification, PublicUser } from "../types";

const upsertById = <T extends { id: string }>(items: T[], item: T) => {
  const exists = items.some((current) => current.id === item.id);
  return exists
    ? items.map((current) => (current.id === item.id ? item : current))
    : [item, ...items];
};

const updateConversationPresence = (
  conversation: Conversation,
  user: Partial<PublicUser> & { id: string },
) => ({
  ...conversation,
  members: conversation.members.map((member) =>
    member.user.id === user.id
      ? {
          ...member,
          user: {
            ...member.user,
            ...user,
          },
        }
      : member,
  ),
});

export const ChatPage = () => {
  const { user, token, updatePreferences } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [rightPanel, setRightPanel] = useState<"details" | "settings">(
    "details",
  );
  const [slidePanel, setSlidePanel] = useState<"details" | "settings" | null>(
    null,
  );
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const selectedConversationId = selectedConversation?.id;

  const loadConversations = useCallback(async () => {
    const nextConversations = await fetchConversations();
    setConversations(nextConversations);
    setSelectedConversation((current) =>
      requestedConversationId
        ? (nextConversations.find(
            (conversation) => conversation.id === requestedConversationId,
          ) ??
          current ??
          nextConversations[0] ??
          null)
        : current
          ? (nextConversations.find(
              (conversation) => conversation.id === current.id,
            ) ?? current)
          : (nextConversations[0] ?? null),
    );
  }, [requestedConversationId]);

  const loadNotifications = useCallback(() => {
    fetchNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    loadConversations().catch((error) => window.alert(apiErrorMessage(error)));
    loadNotifications();
  }, [loadConversations, loadNotifications]);

  useEffect(() => {
    if (!token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("message:new", (message: Message) => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === message.conversationId
            ? {
                ...conversation,
                updatedAt: message.createdAt,
                unreadCount:
                  selectedConversationId === message.conversationId ||
                  message.senderId === user?.id
                    ? conversation.unreadCount
                    : conversation.unreadCount + 1,
                lastMessage: {
                  id: message.id,
                  content: message.content,
                  senderId: message.senderId,
                  sender: message.sender,
                  createdAt: message.createdAt,
                  attachments: message.attachments,
                },
              }
            : conversation,
        ),
      );

      if (selectedConversationId === message.conversationId) {
        setMessages((current) => [
          ...current.filter((item) => item.id !== message.id),
          message,
        ]);
      }

      loadNotifications();
    });

    socket.on("message:update", (message: Message) => {
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? message : item)),
      );
    });

    socket.on(
      "message:typing",
      (payload: { userId: string; username: string; isTyping: boolean }) => {
        if (payload.userId === user?.id) return;
        setTypingUsers((current) => {
          const next = { ...current };
          if (payload.isTyping) next[payload.userId] = payload.username;
          else delete next[payload.userId];
          return next;
        });
      },
    );

    socket.on("message:read", () => {
      loadConversations().catch(() => undefined);
    });

    socket.on(
      "presence:update",
      (payload: {
        userId: string;
        isOnline: boolean;
        lastSeen: string | null;
      }) => {
        setConversations((current) =>
          current.map((conversation) =>
            updateConversationPresence(conversation, {
              id: payload.userId,
              isOnline: payload.isOnline,
              lastSeen: payload.lastSeen,
            }),
          ),
        );
        setSelectedConversation((current) =>
          current
            ? updateConversationPresence(current, {
                id: payload.userId,
                isOnline: payload.isOnline,
                lastSeen: payload.lastSeen,
              })
            : current,
        );
      },
    );

    socket.on("conversation:update", () => {
      loadConversations().catch(() => undefined);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    loadConversations,
    loadNotifications,
    selectedConversationId,
    token,
    user?.id,
  ]);

  useEffect(() => {
    if (!selectedConversationId) return;

    setIsLoadingMessages(true);
    fetchMessages(selectedConversationId)
      .then(setMessages)
      .catch((error) => window.alert(apiErrorMessage(error)))
      .finally(() => setIsLoadingMessages(false));

    socketRef.current?.emit("conversation:join", selectedConversationId);
    markConversationRead(selectedConversationId)
      .then(() => {
        socketRef.current?.emit("message:read", {
          conversationId: selectedConversationId,
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation,
          ),
        );
      })
      .catch(() => undefined);
  }, [selectedConversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!user?.autoTranslateEnabled) return;

    const missing = messages.filter(
      (message) =>
        message.senderId !== user.id &&
        message.content &&
        !message.translations.some(
          (translation) =>
            translation.languageCode === user.preferredLanguage &&
            translation.slangMode === user.regionalSlangMode,
        ),
    );

    missing.slice(-8).forEach((message) => {
      translateMessage(message.id, {
        targetLanguage: user.preferredLanguage,
        slangMode: user.regionalSlangMode,
      })
        .then((translation) => {
          setMessages((current) =>
            current.map((item) =>
              item.id === message.id
                ? {
                    ...item,
                    translations: upsertById(item.translations, translation),
                  }
                : item,
            ),
          );
        })
        .catch(() => undefined);
    });
  }, [messages, user]);

  const selectedTypingUsers = useMemo(
    () => Object.values(typingUsers),
    [typingUsers],
  );

  const sendMessage = async (payload: {
    content: string;
    files: File[];
    replyToId?: string | null;
  }) => {
    if (!selectedConversation) return;

    if (payload.files.length) {
      const message = await sendMessageWithFiles(
        selectedConversation.id,
        payload,
      );
      setMessages((current) => [
        ...current.filter((item) => item.id !== message.id),
        message,
      ]);
      return;
    }

    socketRef.current?.emit("message:send", {
      conversationId: selectedConversation.id,
      content: payload.content,
      replyToId: payload.replyToId,
    });
  };

  const signalTyping = useCallback(
    (isTyping: boolean) => {
      if (!selectedConversation) return;
      socketRef.current?.emit(
        isTyping ? "message:typing:start" : "message:typing:stop",
        {
          conversationId: selectedConversation.id,
        },
      );
    },
    [selectedConversation],
  );

  const openPanel = (panel: "details" | "settings") => {
    setRightPanel(panel);
    setSlidePanel(panel);
  };

  const toggleAutoTranslate = () => {
    updatePreferences({
      autoTranslateEnabled: !user?.autoTranslateEnabled,
    }).catch((error) => window.alert(apiErrorMessage(error)));
  };
  if (!user) return null;

  return (
    <main className="grid h-screen min-h-[640px] grid-cols-1 overflow-hidden bg-[#e9eef6] text-ink min-[520px]:grid-cols-[260px_minmax(0,1fr)] sm:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_332px]">
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversation?.id}
        notifications={notifications}
        onSelect={setSelectedConversation}
        onConversationCreated={(conversation) =>
          setConversations((current) => upsertById(current, conversation))
        }
        onRefreshNotifications={loadNotifications}
      />

      <section className="flex min-h-0 flex-col border-x border-line/80 bg-[#eef3f8]">
        {selectedConversation ? (
          <>
            <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between gap-3 border-b border-line bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={selectedConversation.avatar}
                  name={selectedConversation.name}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-bold text-ink">
                    {selectedConversation.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {selectedTypingUsers.length
                      ? `${selectedTypingUsers.join(", ")} typing`
                      : `${selectedConversation.members.length} members`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <IconButton
                  label="Settings"
                  onClick={() => openPanel("settings")}
                >
                  <Settings size={18} />
                </IconButton>
                <IconButton
                  label="Conversation details"
                  onClick={() => openPanel("details")}
                >
                  <Info size={18} />
                </IconButton>
              </div>
            </header>

            <div className="chat-canvas scrollbar-thin min-h-0 flex-1 overflow-y-auto px-0 py-5">
              {isLoadingMessages ? (
                <div className="grid h-full place-items-center text-sm font-medium text-slate-500">
                  Loading messages...
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    currentUser={user}
                    onReply={setReplyTo}
                    onMessageUpdated={(updated) =>
                      setMessages((current) =>
                        current.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      )
                    }
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-emerald-100 bg-emerald-50/90 px-4 py-2 text-xs font-semibold text-emerald-700">
              <span className="flex items-center gap-2">
                <Languages size={14} />
                Auto translate
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={user.autoTranslateEnabled}
                onClick={toggleAutoTranslate}
                className={`relative h-6 w-11 rounded-full border transition ${
                  user.autoTranslateEnabled
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-slate-300 bg-white"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                    user.autoTranslateEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
              <span
                className={
                  user.autoTranslateEnabled
                    ? "text-emerald-700"
                    : "text-slate-500"
                }
              >
                {user.autoTranslateEnabled ? "On" : "Off"}
              </span>
            </div>

            <MessageComposer
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onSend={sendMessage}
              onTyping={signalTyping}
            />
          </>
        ) : (
          <div className="chat-canvas grid h-full place-items-center px-6 text-center">
            <div>
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg border border-line bg-white text-brand shadow-app">
                <Languages size={28} />
              </div>
              <p className="mt-4 text-lg font-bold text-ink">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Start a direct message or create a group.
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="hidden min-h-0 bg-white xl:block">
        {rightPanel === "settings" ? (
          <SettingsPanel />
        ) : selectedConversation ? (
          <ConversationDetails
            conversation={selectedConversation}
            onConversationUpdated={(conversation) => {
              setSelectedConversation(conversation);
              setConversations((current) => upsertById(current, conversation));
            }}
          />
        ) : (
          <SettingsPanel />
        )}
      </div>

      {slidePanel ? (
        <div className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm xl:hidden">
          <div className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-line bg-white shadow-2xl">
            {slidePanel === "settings" ? (
              <SettingsPanel onClose={() => setSlidePanel(null)} />
            ) : selectedConversation ? (
              <ConversationDetails
                conversation={selectedConversation}
                onClose={() => setSlidePanel(null)}
                onConversationUpdated={(conversation) => {
                  setSelectedConversation(conversation);
                  setConversations((current) =>
                    upsertById(current, conversation),
                  );
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
};
