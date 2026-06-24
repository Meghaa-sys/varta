import { Camera, Languages, LogOut, Sparkles, X } from "lucide-react";
import { languages } from "../constants/languages";
import { apiErrorMessage } from "../lib/api";
import { useAuth } from "../state/AuthContext";
import type { LanguageCode } from "../types";
import { Avatar } from "./Avatar";

export const SettingsPanel = ({ onClose }: { onClose?: () => void }) => {
  const { user, logout, updatePreferences, uploadAvatar } = useAuth();

  if (!user) return null;

  const onAvatarChange = async (file?: File) => {
    if (!file) return;
    try {
      await uploadAvatar(file);
    } catch (error) {
      window.alert(apiErrorMessage(error));
    }
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-line bg-[#f8fafc]">
      <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-ink">Settings</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-slate-600 shadow-sm transition hover:border-brand hover:text-brand"
            aria-label="Close settings"
            title="Close settings"
          >
            <X size={17} />
          </button>
        ) : null}
      </div>

      <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-4 rounded-md border border-line bg-white p-4 shadow-sm">
          <Avatar user={user} size="lg" />
          <div>
            <p className="font-semibold text-ink">{user.username}</p>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-brand hover:text-brand">
              <Camera size={16} />
              Avatar
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => onAvatarChange(event.target.files?.[0])}
              />
            </label>
          </div>
        </div>

        <section className="rounded-md border border-line bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Languages size={17} />
            Language
          </div>
          <select
            value={user.preferredLanguage}
            onChange={(event) =>
              updatePreferences({
                preferredLanguage: event.target.value as LanguageCode,
              }).catch((error) => window.alert(apiErrorMessage(error)))
            }
            className="mt-3 w-full rounded-md border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-md border border-line bg-white px-4 py-3 shadow-sm transition hover:border-brand/40">
            <span>
              <span className="block text-sm font-semibold text-ink">
                Auto translate messages
              </span>
              <span className="block text-xs text-slate-500">
                Incoming text is translated into your language.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={user.autoTranslateEnabled}
              onClick={() =>
                updatePreferences({
                  autoTranslateEnabled: !user.autoTranslateEnabled,
                }).catch((error) => window.alert(apiErrorMessage(error)))
              }
              className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                user.autoTranslateEnabled
                  ? "border-brand bg-brand"
                  : "border-slate-300 bg-white"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  user.autoTranslateEnabled ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md border border-line bg-white px-4 py-3 shadow-sm transition hover:border-brand/40">
            <span>
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles size={16} />
                Regional slang mode
              </span>
              <span className="block text-xs text-slate-500">
                Gemini uses more natural local phrasing.
              </span>
            </span>
            <input
              type="checkbox"
              checked={user.regionalSlangMode}
              onChange={(event) =>
                updatePreferences({
                  regionalSlangMode: event.target.checked,
                }).catch((error) => window.alert(apiErrorMessage(error)))
              }
              className="h-5 w-5 accent-brand"
            />
          </label>
        </section>
      </div>

      <div className="border-t border-line bg-white p-4">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
};
