const LABELS = ["Данные", "Проверка", "Готово"] as const;

/** Индикатор шагов; названия неактивных шагов на узком экране скрыты визуально, но доступны. */
export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="Шаги оформления" className="flex items-center gap-3 text-sm">
      {LABELS.map((label, index) => {
        const number = index + 1;
        const active = number === current;
        const done = number < current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-2 ${active ? "font-semibold text-slate-900" : "text-slate-500"}`}
          >
            <span
              className={
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold " +
                (active || done ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600")
              }
            >
              {number}
            </span>
            <span className={active ? "" : "sr-only sm:not-sr-only"}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
