import { MessageCircle, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { createPrivateConversation } from "../api/chat";
import { requestContact } from "../api/contacts";
import { getUserByUsername } from "../api/auth";
import { Avatar } from "../components/Avatar";
import { apiErrorMessage } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { PublicUser } from "../types";

export const ProfileLinkPage = () => {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const normalizedUsername = useMemo(() => username.replace(/^@+/, ""), [username]);

  useEffect(() => {
    setError("");
    getUserByUsername(normalizedUsername)
      .then(setProfileUser)
      .catch((requestError) => setError(apiErrorMessage(requestError)));
  }, [normalizedUsername]);

  if (currentUser?.username.toLowerCase() === normalizedUsername.toLowerCase()) {
    return <Navigate to="/app" replace />;
  }

  const messageUser = async () => {
    if (!profileUser) return;
    setIsWorking(true);
    try {
      const conversation = await createPrivateConversation(profileUser.id);
      navigate(`/app?conversation=${conversation.id}`);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setIsWorking(false);
    }
  };

  const addUser = async () => {
    if (!profileUser) return;
    setIsWorking(true);
    try {
      await requestContact(profileUser.id);
      setError("Contact request sent.");
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-panel px-4 py-10 text-ink">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-soft">
        {profileUser ? (
          <>
            <div className="flex items-center gap-4">
              <Avatar user={profileUser} size="lg" showStatus />
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{profileUser.username}</p>
                <p className="truncate text-sm text-slate-500">@{profileUser.username}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={addUser}
                disabled={isWorking}
                className="flex items-center justify-center gap-2 rounded-md border border-line px-4 py-3 text-sm font-semibold text-ink hover:border-brand hover:text-brand disabled:opacity-50"
              >
                <UserPlus size={17} />
                Add
              </button>
              <button
                type="button"
                onClick={messageUser}
                disabled={isWorking}
                className="flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <MessageCircle size={17} />
                Message
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">Loading profile...</p>
        )}

        {error ? <p className="mt-4 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">{error}</p> : null}
      </section>
    </main>
  );
};
