import type { ReactNode } from "react";

import type { Rules } from "../../api/types";
import { type OrderSummary, ticketPrice } from "../../domain/pricing";
import { formatMoney } from "../../lib/format";
import { TICKET_LABELS } from "./labels";

interface SummaryPanelProps {
  rules: Rules;
  summary: OrderSummary;
  /** Возраст указан не у всех участников — итог пока неполный. */
  incomplete: boolean;
  /** Главная кнопка шага («Продолжить» / «Подтвердить заказ»). */
  action: ReactNode;
}

/**
 * Итог заказа и главная кнопка. На телефоне прилипает к низу экрана и показывает только
 * сумму и кнопку; на широком экране — липкая карточка справа с разбивкой по билетам.
 */
export function SummaryPanel({ rules, summary, incomplete, action }: SummaryPanelProps) {
  const ticketTypes = (["full", "child"] as const).filter((type) => summary.counts[type] > 0);

  return (
    <aside
      aria-label="Итог заказа"
      className={
        "fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white p-3 " +
        "shadow-[0_-4px_12px_rgba(15,23,42,0.08)] " +
        "lg:sticky lg:top-6 lg:rounded-2xl lg:border lg:p-5 lg:shadow-sm"
      }
    >
      <div className="hidden lg:block">
        <h2 className="text-lg font-semibold">Ваш заказ</h2>
        {ticketTypes.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {ticketTypes.map((type) => (
              <li key={type} className="flex justify-between gap-3">
                <span>
                  {TICKET_LABELS[type]} × {summary.counts[type]}
                </span>
                <span>{formatMoney(ticketPrice(type, rules) * summary.counts[type])}</span>
              </li>
            ))}
          </ul>
        )}
        {incomplete && (
          <p className="mt-2 text-sm text-slate-500">
            Итог уточнится, когда у всех участников будет указан возраст
          </p>
        )}
        <hr className="my-4 border-slate-200" />
      </div>

      <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:gap-4">
        <p className="flex items-baseline gap-2 lg:justify-between">
          <span className="text-sm text-slate-600">Итого</span>
          <strong data-testid="order-total" className="text-xl font-semibold text-slate-900">
            {formatMoney(summary.total)}
          </strong>
        </p>
        {action}
      </div>
    </aside>
  );
}
