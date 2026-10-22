import type { Rules } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { ticketPrice, ticketTypeFor } from "../../domain/pricing";
import { type ParticipantErrors, type ParticipantForm, validAge } from "../../domain/validation";
import { formatMoney } from "../../lib/format";
import { TICKET_LABELS } from "./labels";

interface ParticipantRowProps {
  /** Номер участника, начиная с 1 (для заголовка и доступных имён полей). */
  number: number;
  value: ParticipantForm;
  errors: ParticipantErrors;
  rules: Rules;
  removable: boolean;
  onChange: (field: keyof ParticipantForm, value: string) => void;
  onRemove: () => void;
}

export function ParticipantRow({
  number,
  value,
  errors,
  rules,
  removable,
  onChange,
  onRemove,
}: ParticipantRowProps) {
  const age = validAge(value.age, rules);
  const ticketType = age === null ? null : ticketTypeFor(age, rules);

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">Участник {number}</h3>
        {removable && (
          <Button variant="danger" onClick={onRemove} aria-label={`Удалить участника ${number}`}>
            Удалить
          </Button>
        )}
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <Field
          label={
            <>
              Имя<span className="sr-only"> участника {number}</span>
            </>
          }
          value={value.name}
          error={errors.name}
          autoComplete="off"
          onChange={(event) => onChange("name", event.target.value)}
        />
        <Field
          label={
            <>
              Возраст<span className="sr-only"> участника {number}</span>
            </>
          }
          value={value.age}
          error={errors.age}
          inputMode="numeric"
          autoComplete="off"
          onChange={(event) => onChange("age", event.target.value)}
        />
      </div>

      <div className="mt-3 min-h-8">
        {ticketType ? (
          <Badge tone={ticketType === "child" ? "amber" : "indigo"}>
            {TICKET_LABELS[ticketType]} — {formatMoney(ticketPrice(ticketType, rules))}
          </Badge>
        ) : (
          <p className="text-sm text-slate-500">Тип билета определится по возрасту</p>
        )}
      </div>
    </li>
  );
}
