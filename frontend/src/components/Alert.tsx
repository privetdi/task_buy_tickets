import type { HTMLAttributes } from "react";

type Tone = "info" | "warning" | "error" | "success";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  title?: string;
}

const tones: Record<Tone, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function Alert({ tone = "info", title, className = "", children, ...props }: AlertProps) {
  // Ошибки и предупреждения озвучиваются сразу, остальное — вежливо, без прерывания
  const role = tone === "error" || tone === "warning" ? "alert" : "status";
  return (
    <div role={role} className={`rounded-xl border p-4 ${tones[tone]} ${className}`} {...props}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1 text-sm" : "text-sm"}>{children}</div>}
    </div>
  );
}
