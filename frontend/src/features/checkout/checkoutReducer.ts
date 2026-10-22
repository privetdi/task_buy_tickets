// Чистая машина состояний сценария оформления: без DOM, сети и таймеров.
// Шаги: form → review → submitting → success | seats_error | error (и возвраты назад).
import { NotEnoughSeatsError, ServerError, ValidationError } from "../../api/client";
import type { Order, Rules } from "../../api/types";
import {
  type CheckoutForm,
  type FormErrors,
  type ParticipantForm,
  emptyParticipant,
  formErrorsFromServer,
  hasErrors,
  validateForm,
} from "../../domain/validation";

export type Step = "form" | "review" | "submitting" | "success" | "seats_error" | "error";

export interface CheckoutState {
  rules: Rules;
  step: Step;
  form: CheckoutForm;
  /** Показывать ли ошибки полей: включается после первой попытки перейти к проверке. */
  showErrors: boolean;
  /** Ошибки, которые вернул сервер; сбрасываются при любой правке формы. */
  serverErrors: FormErrors | null;
  /** Число неудачных попыток перейти к проверке — по нему интерфейс ставит фокус на ошибку. */
  attempts: number;
  seatsAvailable: number;
  /** Последний отказ был из-за нехватки мест: форма подсказывает, сколько осталось. */
  seatsConflict: boolean;
  order: Order | null;
  failure: "network" | "server" | null;
}

export type CheckoutAction =
  | { type: "edit_email"; value: string }
  | { type: "edit_participant"; index: number; field: keyof ParticipantForm; value: string }
  | { type: "add_participant" }
  | { type: "remove_participant"; index: number }
  | { type: "continue" }
  | { type: "back_to_form" }
  | { type: "submit_started" }
  | { type: "submit_succeeded"; order: Order }
  | { type: "submit_failed"; error: unknown }
  | { type: "seats_refreshed"; seatsAvailable: number }
  | { type: "new_order" };

function emptyForm(): CheckoutForm {
  return { email: "", participants: [emptyParticipant()] };
}

export function createInitialState(rules: Rules, seatsAvailable: number): CheckoutState {
  return {
    rules,
    step: "form",
    form: emptyForm(),
    showErrors: false,
    serverErrors: null,
    attempts: 0,
    seatsAvailable,
    seatsConflict: false,
    order: null,
    failure: null,
  };
}

/** Ошибки, которые нужно показать сейчас. */
export function visibleErrors(state: CheckoutState): FormErrors {
  if (state.serverErrors) return state.serverErrors;
  const live = validateForm(state.form, state.rules);
  if (state.showErrors) return live;
  // До первой попытки продолжить подсвечиваем только ошибку группы: она не про «нетронутое» поле
  return { participants: live.participants.map(() => ({})), group: live.group };
}

/** Правка формы допустима только на шаге формы и сбрасывает ошибки сервера. */
function withForm(state: CheckoutState, form: CheckoutForm): CheckoutState {
  return { ...state, form, serverErrors: null };
}

export function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "edit_email":
      if (state.step !== "form") return state;
      return withForm(state, { ...state.form, email: action.value });

    case "edit_participant": {
      if (state.step !== "form") return state;
      const participants = state.form.participants.map((participant, index) =>
        index === action.index ? { ...participant, [action.field]: action.value } : participant,
      );
      return withForm(state, { ...state.form, participants });
    }

    case "add_participant":
      if (state.step !== "form") return state;
      if (state.form.participants.length >= state.rules.max_participants) return state;
      return withForm(state, {
        ...state.form,
        participants: [...state.form.participants, emptyParticipant()],
      });

    case "remove_participant":
      if (state.step !== "form") return state;
      if (state.form.participants.length <= state.rules.min_participants) return state;
      return withForm(state, {
        ...state.form,
        participants: state.form.participants.filter((_, index) => index !== action.index),
      });

    case "continue": {
      if (state.step !== "form") return state;
      if (hasErrors(validateForm(state.form, state.rules))) {
        return { ...state, showErrors: true, attempts: state.attempts + 1 };
      }
      return { ...state, step: "review", showErrors: false };
    }

    case "back_to_form":
      if (state.step !== "review" && state.step !== "seats_error" && state.step !== "error") {
        return state;
      }
      return { ...state, step: "form", failure: null };

    case "submit_started":
      // Отправка возможна с экрана проверки и повтором после сбоя; из других шагов — игнор
      if (state.step !== "review" && state.step !== "error") return state;
      return { ...state, step: "submitting", failure: null };

    case "submit_succeeded":
      if (state.step !== "submitting") return state;
      return {
        ...state,
        step: "success",
        order: action.order,
        seatsConflict: false,
        seatsAvailable: Math.max(0, state.seatsAvailable - action.order.participants.length),
      };

    case "submit_failed": {
      if (state.step !== "submitting") return state;
      const { error } = action;

      if (error instanceof NotEnoughSeatsError) {
        return {
          ...state,
          step: "seats_error",
          seatsAvailable: error.seatsAvailable,
          seatsConflict: true,
        };
      }
      if (error instanceof ValidationError) {
        return {
          ...state,
          step: "form",
          showErrors: true,
          attempts: state.attempts + 1,
          serverErrors: formErrorsFromServer(error, state.form.participants.length, state.rules),
        };
      }
      return {
        ...state,
        step: "error",
        failure: error instanceof ServerError ? "server" : "network",
      };
    }

    case "seats_refreshed": {
      const next = { ...state, seatsAvailable: action.seatsAvailable };
      // Места снова появились (например, сброс демо) — возвращаемся к правке с теми же данными
      if (state.step === "seats_error" && action.seatsAvailable > 0) {
        return { ...next, step: "form" };
      }
      return next;
    }

    case "new_order":
      return createInitialState(state.rules, state.seatsAvailable);
  }
}
