import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const IconButton = ({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={clsx(
      "inline-grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line bg-white text-slate-600 shadow-sm transition hover:border-brand hover:bg-blue-50 hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
