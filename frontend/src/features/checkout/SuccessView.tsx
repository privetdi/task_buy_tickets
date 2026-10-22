import type { Order } from "../../api/types";
import { Button } from "../../components/Button";
import { ageWord, formatMoney } from "../../lib/format";
import { useFocusOnMount } from "../../lib/useFocusOnMount";
import { TICKET_LABELS } from "./labels";

interface SuccessViewProps {
  order: Order;
  onNewOrder: () => void;
}

/** Заказ принят сервером: показываем то, что сохранено (а не то, что вводили). */
export function SuccessView({ order, onNewOrder }: SuccessViewProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <section aria-labelledby="success-title" className="space-y-4">
      <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-slate-200 sm:p-6">
        <div
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700"
        >
          ✓
        </div>
        <h2
          id="success-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 text-2xl font-semibold focus:outline-none"
        >
          Заказ оформлен
        </h2>
        <p className="mt-1 text-slate-600">Номер заказа: № {order.id}</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <dl className="text-sm">
          <dt className="text-slate-500">Контактный email</dt>
          <dd className="mt-0.5 break-all text-base font-medium">{order.email}</dd>
        </dl>

        <ol className="mt-4 divide-y divide-slate-100">
          {order.participants.map((participant, index) => (
            <li key={index} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="break-words font-medium">{participant.name}</p>
                <p className="text-sm text-slate-600">
                  {participant.age} {ageWord(participant.age)} · {TICKET_LABELS[participant.ticket_type]}
                </p>
              </div>
              <p className="shrink-0 font-medium">{formatMoney(participant.price)}</p>
            </li>
          ))}
        </ol>

        <p className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-4">
          <span className="text-slate-600">Итого</span>
          <strong data-testid="order-total" className="text-xl font-semibold">
            {formatMoney(order.total)}
          </strong>
        </p>
      </div>

      <Button onClick={onNewOrder}>Оформить новый заказ</Button>
    </section>
  );
}
