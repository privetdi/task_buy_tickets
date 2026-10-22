import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: ReactNode;
  error?: string | undefined;
  hint?: string;
}

/** Поле ввода с подписью; ошибка и подсказка связаны с полем для скринридеров. */
export function Field({ label, error, hint, className = "", ...input }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  // Подсказка скрывается, пока показана ошибка, поэтому на неё ссылаемся только без ошибки
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {/* text-base (16 px): на iOS поля с меньшим шрифтом вызывают нежелательный зум */}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={
          "min-h-11 w-full rounded-xl border px-3 text-base text-slate-900 placeholder:text-slate-400 " +
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 " +
          (error ? "border-red-500 bg-red-50" : "border-slate-300 bg-white")
        }
        {...input}
      />
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="mt-1 text-sm text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
