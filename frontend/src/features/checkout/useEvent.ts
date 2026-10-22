import { useCallback, useEffect, useState } from "react";

import { fetchEvent } from "../../api/client";
import type { EventInfo } from "../../api/types";

type EventState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; event: EventInfo };

/** Загружает мероприятие (с правилами и остатком мест) и позволяет повторить при сбое. */
export function useEvent() {
  const [state, setState] = useState<EventState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchEvent().then(
      (event) => {
        if (!cancelled) setState({ status: "ready", event });
      },
      () => {
        if (!cancelled) setState({ status: "error" });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((value) => value + 1);
  }, []);

  return { state, retry };
}
