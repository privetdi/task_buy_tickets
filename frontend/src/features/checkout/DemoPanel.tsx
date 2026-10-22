import { useState } from "react";

import { resetDemo, takeSeats } from "../../api/client";
import type { SeatsState } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { seatsWord } from "../../lib/format";

interface DemoPanelProps {
  totalSeats: number;
  /** Сообщает странице новый остаток мест после действия. */
  onSeatsChange: (seatsAvailable: number) => void;
}

type Pending = "take" | "reset" | null;

/**
 * Инструменты для демонстрации, не часть пользовательского сценария: позволяют за секунды
 * воспроизвести «места закончились до подтверждения» и вернуть всё в исходное состояние.
 */
export function DemoPanel({ totalSeats, onSeatsChange }: DemoPanelProps) {
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(kind: Exclude<Pending, null>, action: () => Promise<SeatsState>) {
    setPending(kind);
    setFailed(false);
    try {
      const seats = await action();
      onSeatsChange(seats.seats_available);
      setMessage(
        `Свободно ${seats.seats_available} ${seatsWord(seats.seats_available)} из ${seats.total_seats}`,
      );
    } catch {
      setFailed(true);
      setMessage("Не удалось выполнить действие");
    } finally {
      setPending(null);
    }
  }

  return (
    <details className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
      <summary className="flex min-h-11 cursor-pointer items-center gap-3 font-medium text-slate-700">
        <Badge tone="slate">Демо</Badge>
        Демо-инструменты
      </summary>

      <div className="mt-3 space-y-3">
        <p className="text-sm text-slate-600">
          Не входят в сценарий покупки. Позволяют показать, что будет, если другой покупатель
          заберёт места, пока вы оформляете заказ.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            loading={pending === "take"}
            disabled={pending !== null}
            onClick={() => run("take", () => takeSeats(totalSeats))}
          >
            Занять все свободные места
          </Button>
          <Button
            variant="secondary"
            loading={pending === "reset"}
            disabled={pending !== null}
            onClick={() => run("reset", resetDemo)}
          >
            Сбросить
          </Button>
        </div>
        {message && (
          <p role="status" className={`text-sm ${failed ? "text-red-700" : "text-slate-600"}`}>
            {message}
          </p>
        )}
      </div>
    </details>
  );
}
