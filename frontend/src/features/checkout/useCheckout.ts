// Обвязка вокруг чистого редьюсера: запросы к API и защита от повторной отправки.
import { useCallback, useReducer, useRef } from "react";

import { createOrder, fetchEvent } from "../../api/client";
import type { EventInfo } from "../../api/types";
import { toOrderRequest } from "../../domain/validation";
import { checkoutReducer, createInitialState } from "./checkoutReducer";

export function useCheckout(event: EventInfo) {
  const [state, dispatch] = useReducer(checkoutReducer, undefined, () =>
    createInitialState(event.rules, event.seats_available),
  );
  // Запрос в полёте: второй вызов до ответа игнорируется (двойной клик, повторное нажатие Enter)
  const inFlight = useRef(false);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    if (state.step !== "review" && state.step !== "error") return;

    inFlight.current = true;
    dispatch({ type: "submit_started" });
    try {
      const order = await createOrder(toOrderRequest(state.form));
      dispatch({ type: "submit_succeeded", order });
    } catch (error) {
      dispatch({ type: "submit_failed", error });
    } finally {
      inFlight.current = false;
    }
  }, [state.step, state.form]);

  /** Запрашивает актуальный остаток мест; при сбое остаток обновится при следующей попытке. */
  const refreshSeats = useCallback(async () => {
    try {
      const fresh = await fetchEvent();
      dispatch({ type: "seats_refreshed", seatsAvailable: fresh.seats_available });
    } catch {
      // не критично: остаток подтвердит сервер при подтверждении заказа
    }
  }, []);

  const startNewOrder = useCallback(() => {
    dispatch({ type: "new_order" });
    void refreshSeats();
  }, [refreshSeats]);

  const setSeats = useCallback((seatsAvailable: number) => {
    dispatch({ type: "seats_refreshed", seatsAvailable });
  }, []);

  return { state, dispatch, submit, refreshSeats, startNewOrder, setSeats };
}
