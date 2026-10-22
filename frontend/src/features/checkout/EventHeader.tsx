import type { EventInfo } from "../../api/types";
import { Badge } from "../../components/Badge";
import { formatDateTime } from "../../lib/format";

interface EventHeaderProps {
  event: EventInfo;
  seatsAvailable: number;
}

function SeatsBadge({ available, total }: { available: number; total: number }) {
  if (available === 0) return <Badge tone="red">Места закончились</Badge>;
  const tone = available <= 3 ? "amber" : "green";
  return (
    <Badge tone={tone}>
      Свободно мест: {available} из {total}
    </Badge>
  );
}

export function EventHeader({ event, seatsAvailable }: EventHeaderProps) {
  return (
    <header className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <p className="text-sm font-medium text-indigo-700">Билеты на мероприятие</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {event.title}
      </h1>
      <p className="mt-2 text-slate-600">
        {formatDateTime(event.starts_at)} · {event.venue}
      </p>
      <div className="mt-4">
        <SeatsBadge available={seatsAvailable} total={event.total_seats} />
      </div>
    </header>
  );
}
