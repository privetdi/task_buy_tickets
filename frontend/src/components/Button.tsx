import type { ButtonHTMLAttributes } from "react";

import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  /** Показывает индикатор и блокирует кнопку на время запроса. */
  loading?: boolean;
}

// min-h-11 = 44 px: минимальный комфортный размер для нажатия пальцем
const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-base font-medium " +
  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800",
  secondary: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
  ghost: "text-indigo-700 hover:bg-indigo-50",
  danger: "text-red-700 hover:bg-red-50",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
