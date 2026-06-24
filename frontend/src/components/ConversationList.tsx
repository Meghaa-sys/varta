import {
  Bell,
  CheckCheck,
  Copy,
  Link2,
  MessageCircle,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createGroupConversation,
  createPrivateConversation,
  markAllNotificationsRead,
} from "../api/chat";
import { searchUsers } from "../api/auth";
import {
  acceptContact as acceptContactRequest,
  fetchContacts,
  removeContact as removeContactRequest,
  requestContact as sendContactRequest,
} from "../api/contacts";
import { appName } from "../constants/brand";
import { apiErrorMessage } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { Contact, Conversation, Notification, PublicUser } from "../types";
import { Avatar } from "./Avatar";
import { IconButton } from "./IconButton";

type Props = {
  conversations: Conversation[];
  selectedConversationId?: string | null;
  notifications: Notification[];
  onSelect: (conversation: Conversation) => void;
  onConversationCreated: (conversation: Conversation) => void;
  onRefreshNotifications: () => void;
};

const formatConversationTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const conversationPreview = (conversation: Conversation) => {
  const lastMessage = conversation.lastMessage;
  if (!lastMessage) return "No messages yet";
  if (lastMessage.content) return lastMessage.content;

  const attachment = lastMessage.attachments[0];
  if (!attachment) return "Attachment";
  if (
    attachment.mimeType.startsWith("audio/") ||
    attachment.mimeType === "video/webm"
  )
    return "Voice message";
  if (attachment.type === "IMAGE") return "Photo";
  return "Attachment";
};
const upsertContact = (contacts: Contact[], contact: Contact) => {
  const exists = contacts.some((item) => item.id === contact.id);
  return exists
    ? contacts.map((item) => (item.id === contact.id ? contact : item))
    : [contact, ...contacts];
};

export const ConversationList = ({
  conversations,
  selectedConversationId,
  notifications,
  onSelect,
  onConversationCreated,
  onRefreshNotifications,
}: Props) => {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<PublicUser[]>([]);
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);

  const unreadNotifications = notifications.filter(
    (notification) => !notification.isRead,
  ).length;
  const acceptedContacts = contacts.filter(
    (contact) => contact.status === "ACCEPTED",
  );
  const incomingRequests = contacts.filter(
    (contact) =>
      contact.status === "PENDING" && contact.direction === "incoming",
  );
  const outgoingRequests = contacts.filter(
    (contact) =>
      contact.status === "PENDING" && contact.direction === "outgoing",
  );

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [conversations, query],
  );

  const loadContacts = useCallback(() => {
    fetchContacts()
      .then(setContacts)
      .catch(() => setContacts([]));
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setUsers([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      searchUsers(trimmed)
        .then(setUsers)
        .catch(() => setUsers([]));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const startDirectMessage = async (user: PublicUser) => {
    try {
      const conversation = await createPrivateConversation(user.id);
      onConversationCreated(conversation);
      onSelect(conversation);
      setQuery("");
      setUsers([]);
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  const addContact = async (user: PublicUser) => {
    try {
      const contact = await sendContactRequest(user.id);
      setContacts((current) => upsertContact(current, contact));
      onRefreshNotifications();
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  const acceptContact = async (contact: Contact) => {
    try {
      const accepted = await acceptContactRequest(contact.id);
      setContacts((current) => upsertContact(current, accepted));
      onRefreshNotifications();
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  const removeContact = async (contact: Contact) => {
    try {
      await removeContactRequest(contact.id);
      setContacts((current) =>
        current.filter((item) => item.id !== contact.id),
      );
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  const toggleGroupUser = (user: PublicUser) => {
    setSelectedUsers((current) =>
      current.some((selected) => selected.id === user.id)
        ? current.filter((selected) => selected.id !== user.id)
        : [...current, user],
    );
  };

  const createGroup = async () => {
    try {
      const conversation = await createGroupConversation({
        name: groupName,
        memberIds: selectedUsers.map((user) => user.id),
      });
      onConversationCreated(conversation);
      onSelect(conversation);
      setGroupName("");
      setSelectedUsers([]);
      setGroupMode(false);
      setQuery("");
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  const knownContactForUser = (userId: string) =>
    contacts.find((contact) => contact.contactUser.id === userId);

  const profileLink = currentUser
    ? `${window.location.origin}/u/${currentUser.username}`
    : "";

  const copyProfileLink = async () => {
    if (!profileLink) return;
    await navigator.clipboard.writeText(profileLink);
    setProfileLinkCopied(true);
    window.setTimeout(() => setProfileLinkCopied(false), 1600);
  };

  const renderUserSearch = () => {
    if (!users.length) return null;

    return (
      <div className="border-b border-line px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
          {groupMode
            ? "Add members"
            : contactsOpen
              ? "Find contacts"
              : "People"}
        </p>
        <div className="space-y-1">
          {users.map((searchUser) => {
            const knownContact = knownContactForUser(searchUser.id);

            if (groupMode) {
              return (
                <button
                  key={searchUser.id}
                  type="button"
                  onClick={() => toggleGroupUser(searchUser)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-panel"
                >
                  <Avatar user={searchUser} showStatus size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {searchUser.username}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {searchUser.email}
                    </span>
                  </span>
                  {selectedUsers.some(
                    (selected) => selected.id === searchUser.id,
                  ) ? (
                    <CheckCheck size={17} className="text-mint" />
                  ) : (
                    <Plus size={17} className="text-slate-400" />
                  )}
                </button>
              );
            }

            return (
              <div
                key={searchUser.id}
                className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-panel"
              >
                <Avatar user={searchUser} showStatus size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {searchUser.username}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {searchUser.email}
                  </span>
                </span>
                {contactsOpen ? (
                  knownContact?.status === "ACCEPTED" ? (
                    <button
                      type="button"
                      onClick={() => startDirectMessage(searchUser)}
                      className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white"
                    >
                      Message
                    </button>
                  ) : knownContact?.direction === "incoming" ? (
                    <button
                      type="button"
                      onClick={() => acceptContact(knownContact)}
                      className="rounded-md bg-mint px-2 py-1 text-xs font-semibold text-white"
                    >
                      Accept
                    </button>
                  ) : knownContact ? (
                    <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-slate-500">
                      Pending
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addContact(searchUser)}
                      className="rounded-md bg-ink px-2 py-1 text-xs font-semibold text-white"
                    >
                      Add
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => startDirectMessage(searchUser)}
                    className="text-slate-400"
                  >
                    <MessageCircle size={17} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContactRow = (
    contact: Contact,
    action: "message" | "accept" | "pending",
  ) => (
    <div
      key={contact.id}
      className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-panel"
    >
      <Avatar user={contact.contactUser} showStatus size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {contact.contactUser.username}
        </span>
        <span className="block truncate text-xs text-slate-500">
          {contact.contactUser.email}
        </span>
      </span>
      {action === "message" ? (
        <button
          type="button"
          onClick={() => startDirectMessage(contact.contactUser)}
          className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white"
        >
          Message
        </button>
      ) : action === "accept" ? (
        <button
          type="button"
          onClick={() => acceptContact(contact)}
          className="rounded-md bg-mint px-2 py-1 text-xs font-semibold text-white"
        >
          Accept
        </button>
      ) : (
        <span className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-slate-500">
          Pending
        </span>
      )}
      <IconButton
        label="Remove contact"
        className="h-8 w-8"
        onClick={() => removeContact(contact)}
      >
        <X size={14} />
      </IconButton>
    </div>
  );

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-line bg-[#f7f9fc]">
      <div className="border-b border-line bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-base font-black text-white shadow-sm">
              V
            </span>
            <div className="min-w-0">
              <p className="hidden truncate text-lg font-black tracking-normal text-ink sm:block">
                {appName}
              </p>
              {currentUser ? (
                <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
                  @{currentUser.username}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <IconButton
              label="Contacts"
              className={contactsOpen ? "border-brand text-brand" : undefined}
              onClick={() => {
                setContactsOpen((value) => !value);
                setGroupMode(false);
              }}
            >
              <UserPlus size={18} />
            </IconButton>
            <IconButton
              label="Create group"
              className={groupMode ? "border-brand text-brand" : undefined}
              onClick={() => {
                setGroupMode((value) => !value);
                setContactsOpen(false);
              }}
            >
              <Users size={18} />
            </IconButton>
            <IconButton
              label="Mark notifications read"
              onClick={() =>
                markAllNotificationsRead()
                  .then(onRefreshNotifications)
                  .catch((error) => window.alert(apiErrorMessage(error)))
              }
            >
              <span className="relative">
                <Bell size={18} />
                {unreadNotifications ? (
                  <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-white">
                    {unreadNotifications}
                  </span>
                ) : null}
              </span>
            </IconButton>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-[#f8fafc] px-3 py-2.5 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
          <Search size={16} className="text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              contactsOpen
                ? "Search @username or profile link"
                : groupMode
                  ? "Search people"
                  : "Search chats or people"
            }
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {groupMode ? (
        <div className="border-b border-line bg-panel px-4 py-4">
          <input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Group name"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedUsers.map((selectedUser) => (
              <button
                key={selectedUser.id}
                type="button"
                onClick={() => toggleGroupUser(selectedUser)}
                className="rounded-md bg-brand px-2 py-1 text-xs font-semibold text-white"
              >
                {selectedUser.username}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={createGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus size={16} />
            Create group
          </button>
        </div>
      ) : null}

      {renderUserSearch()}

      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        {contactsOpen ? (
          <div className="space-y-5 p-1">
            {currentUser ? (
              <section className="rounded-md border border-line bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500">
                  <Link2 size={14} />
                  Your contact identity
                </div>
                <p className="mt-2 text-sm font-bold text-ink">
                  @{currentUser.username}
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-white px-2 py-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                    {profileLink}
                  </span>
                  <button
                    type="button"
                    onClick={copyProfileLink}
                    className="inline-grid h-7 w-7 place-items-center rounded border border-line text-slate-600 hover:border-brand hover:text-brand"
                    aria-label="Copy profile link"
                    title="Copy profile link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                {profileLinkCopied ? (
                  <p className="mt-2 text-xs font-semibold text-mint">
                    Profile link copied
                  </p>
                ) : null}
              </section>
            ) : null}

            <section>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Incoming requests
              </p>
              {incomingRequests.length ? (
                <div className="space-y-1">
                  {incomingRequests.map((contact) =>
                    renderContactRow(contact, "accept"),
                  )}
                </div>
              ) : (
                <p className="px-2 text-sm text-slate-500">
                  No pending requests.
                </p>
              )}
            </section>

            <section>
              <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                Contacts
              </p>
              {acceptedContacts.length ? (
                <div className="space-y-1">
                  {acceptedContacts.map((contact) =>
                    renderContactRow(contact, "message"),
                  )}
                </div>
              ) : (
                <p className="px-2 text-sm text-slate-500">
                  Search for people above and add them.
                </p>
              )}
            </section>

            {outgoingRequests.length ? (
              <section>
                <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                  Sent requests
                </p>
                <div className="space-y-1">
                  {outgoingRequests.map((contact) =>
                    renderContactRow(contact, "pending"),
                  )}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <>
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation)}
                className={`mb-1 flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-brand/20 ${
                  conversation.id === selectedConversationId
                    ? "border-brand/25 bg-white shadow-app ring-1 ring-brand/10"
                    : "border-transparent bg-transparent hover:border-line hover:bg-white hover:shadow-sm"
                }`}
              >
                <Avatar src={conversation.avatar} name={conversation.name} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">
                        {conversation.name}
                      </span>
                      <span className="mt-1 block truncate text-xs font-medium text-slate-500">
                        {conversationPreview(conversation)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[11px] font-medium text-slate-400">
                        {formatConversationTime(conversation.updatedAt)}
                      </span>
                      {conversation.unreadCount ? (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-bold text-white shadow-sm">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </span>
              </button>
            ))}

            {!filteredConversations.length ? (
              <div className="rounded-md border border-dashed border-line bg-white px-4 py-8 text-center text-sm text-slate-500">
                No conversations found.
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
};
