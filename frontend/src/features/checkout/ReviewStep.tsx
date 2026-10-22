import type { Dispatch } from "react";

import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ticketPrice, ticketTypeFor } from "../../domain/pricing";
import { toOrderRequest } from "../../domain/validation";
import { ageWord, formatMoney } from "../../lib/format";
import type { CheckoutAction, CheckoutState } from "./checkoutReducer";
import { TICKET_LABELS } from "./labels";

interface ReviewStepProps {
  state: CheckoutState;
  dispatch: Dispatch<CheckoutAction>;
}

/** Состав заказа перед подтверждением. Места на этом шаге ещё не зарезервированы. */
export function ReviewStep({ state, dispatch }: ReviewStepProps) {
  const { rules, step } = state;
  // На этом шаге форма уже прошла проверку: имена обрезаны, возрасты — числа
  const order = toOrderRequest(state.form);

  return (
    <section aria-labelledby="review-title" className="space-y-4">
      <h2 id="review-title" className="text-lg font-semibold">
        Проверьте заказ
      </h2>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <dl className="text-sm">
          <dt className="text-slate-500">Контактный email</dt>
          <dd className="mt-0.5 break-all text-base font-medium">{order.email}</dd>
        </dl>

        <h3 className="mt-5 text-sm text-slate-500">Участники</h3>
        <ol className="mt-2 divide-y divide-slate-100">
          {order.participants.map((participant, index) => {
            const type = ticketTypeFor(participant.age, rules);
            return (
              <li key={index} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{participant.name}</p>
                  <p className="text-sm text-slate-600">
                    {participant.age} {ageWord(participant.age)} · {TICKET_LABELS[type]}
                  </p>
                </div>
                <p className="shrink-0 font-medium">{formatMoney(ticketPrice(type, rules))}</p>
              </li>
            );
          })}
        </ol>
      </div>

      <Alert tone="info">
        Места закрепляются за вами после подтверждения заказа. Пока вы можете изменить данные.
      </Alert>

      <Button
        variant="secondary"
        disabled={step === "submitting"}
        onClick={() => dispatch({ type: "back_to_form" })}
      >
        Изменить
      </Button>
    </section>
  );
}
