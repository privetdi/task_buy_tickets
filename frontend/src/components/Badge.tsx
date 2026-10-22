import type { ReactNode } from "react";

type Tone = "indigo" | "amber" | "green" | "red" | "slate";

const tones: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
