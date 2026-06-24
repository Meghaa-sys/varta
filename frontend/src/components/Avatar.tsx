import clsx from "clsx";
import type { PublicUser } from "../types";

export const Avatar = ({
  user,
  src,
  name,
  size = "md",
  showStatus = false,
}: {
  user?: PublicUser;
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}) => {
  const label = name ?? user?.username ?? "Chat";
  const image = src ?? user?.avatar;

  return (
    <span
      className={clsx(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand via-sky-500 to-mint font-semibold text-white shadow-sm ring-1 ring-white/70",
        size === "sm" && "h-8 w-8 text-xs",
        size === "md" && "h-10 w-10 text-sm",
        size === "lg" && "h-14 w-14 text-lg",
      )}
    >
      {image ? (
        <img src={image} alt={label} className="h-full w-full object-cover" />
      ) : (
        label.charAt(0).toUpperCase()
      )}
      {showStatus && user ? (
        <span
          className={clsx(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white shadow-sm",
            user.isOnline ? "bg-mint" : "bg-slate-400",
          )}
        />
      ) : null}
    </span>
  );
};
