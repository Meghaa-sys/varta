import { Camera, Crown, Shield, UserMinus, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { addMembers, removeMember, uploadGroupAvatar } from "../api/chat";
import { searchUsers } from "../api/auth";
import { apiErrorMessage } from "../lib/api";
import type { Conversation, PublicUser } from "../types";
import { Avatar } from "./Avatar";
import { IconButton } from "./IconButton";

export const ConversationDetails = ({
  conversation,
  onConversationUpdated,
  onClose,
}: {
  conversation: Conversation;
  onConversationUpdated: (conversation: Conversation) => void;
  onClose?: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUser[]>([]);
  const canManage =
    conversation.type === "GROUP" &&
    ["OWNER", "ADMIN"].includes(conversation.myRole);

  useEffect(() => {
    if (!canManage || query.trim().length < 2) {
      setUsers([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      searchUsers(query)
        .then((results) =>
          setUsers(
            results.filter(
              (user) =>
                !conversation.members.some(
                  (member) => member.user.id === user.id,
                ),
            ),
          ),
        )
        .catch(() => setUsers([]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [canManage, conversation.members, query]);

  const onAvatarChange = async (file?: File) => {
    if (!file) return;
    try {
      onConversationUpdated(await uploadGroupAvatar(conversation.id, file));
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  const addUser = async (user: PublicUser) => {
    try {
      onConversationUpdated(await addMembers(conversation.id, [user.id]));
      setQuery("");
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  const removeUser = async (userId: string) => {
    try {
      onConversationUpdated(await removeMember(conversation.id, userId));
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line bg-[#f8fafc]">
      <div className="relative border-b border-line bg-white px-5 py-6 text-center shadow-sm">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-600 shadow-sm transition hover:border-brand hover:text-brand"
            aria-label="Close conversation details"
            title="Close conversation details"
          >
            <X size={17} />
          </button>
        ) : null}
        <Avatar src={conversation.avatar} name={conversation.name} size="lg" />
        <p className="mt-3 font-bold text-ink">{conversation.name}</p>
        <p className="text-xs text-slate-500">
          {conversation.members.length}{" "}
          {conversation.members.length === 1 ? "member" : "members"}
        </p>
        {canManage ? (
          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-brand hover:text-brand">
            <Camera size={16} />
            Avatar
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onAvatarChange(event.target.files?.[0])}
            />
          </label>
        ) : null}
      </div>

      {canManage ? (
        <div className="border-b border-line bg-white p-4">
          <div className="flex items-center gap-2 rounded-md border border-line bg-[#f8fafc] px-3 py-2.5 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
            <UserPlus size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Add member"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {users.length ? (
            <div className="mt-2 space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => addUser(user)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-panel"
                >
                  <Avatar user={user} size="sm" showStatus />
                  <span className="text-sm font-semibold text-ink">
                    {user.username}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {conversation.members.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-md border border-transparent px-2 py-2 transition hover:border-line hover:bg-white hover:shadow-sm"
          >
            <Avatar user={member.user} size="sm" showStatus />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">
                {member.user.username}
              </p>
              <p className="text-xs text-slate-500">
                {member.user.isOnline ? "Online" : "Offline"}
              </p>
            </div>
            {member.role === "OWNER" ? (
              <Crown size={16} className="text-coral" />
            ) : null}
            {member.role === "ADMIN" ? (
              <Shield size={16} className="text-brand" />
            ) : null}
            {canManage && member.role !== "OWNER" ? (
              <IconButton
                label="Remove member"
                className="h-8 w-8"
                onClick={() => removeUser(member.user.id)}
              >
                <UserMinus size={15} />
              </IconButton>
            ) : null}
          </div>
        ))}
      </div>
    </aside>
  );
};
