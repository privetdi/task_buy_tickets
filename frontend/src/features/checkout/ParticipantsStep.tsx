import { type Dispatch, useEffect, useRef } from "react";

import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { seatsWord } from "../../lib/format";
import { type CheckoutAction, type CheckoutState, visibleErrors } from "./checkoutReducer";
import { ParticipantRow } from "./ParticipantRow";

/** Идентификатор формы: главная кнопка «Продолжить» находится в панели итога, вне `<form>`. */
export const CHECKOUT_FORM_ID = "checkout-form";

interface ParticipantsStepProps {
  state: CheckoutState;
  dispatch: Dispatch<CheckoutAction>;
}

export function ParticipantsStep({ state, dispatch }: ParticipantsStepProps) {
  const { form, rules, attempts, seatsAvailable, seatsConflict } = state;
  const errors = visibleErrors(state);
  const formRef = useRef<HTMLFormElement>(null);

  // После неудачной попытки перейти дальше фокус уходит на первое некорректное поле
  // (или на сообщение о составе группы, если проблема только в нём)
  useEffect(() => {
    if (attempts === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"], [data-group-error]')
      ?.focus();
  }, [attempts]);

  const canAdd = form.participants.length < rules.max_participants;
  const canRemove = form.participants.length > rules.min_participants;
  const tooManyForSeats = seatsConflict && form.participants.length > seatsAvailable;

  return (
    <form
      id={CHECKOUT_FORM_ID}
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "continue" });
      }}
      className="space-y-6"
    >
      {tooManyForSeats && (
        <Alert tone="warning" title="Мест стало меньше">
          Свободно мест: {seatsAvailable}, а в заказе {form.participants.length}{" "}
          {seatsWord(form.participants.length)}. Уменьшите число участников.
        </Alert>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <h2 className="text-lg font-semibold">Контакт</h2>
        <Field
          className="mt-3"
          label="Контактный email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="name@mail.ru"
          hint="Один адрес на весь заказ"
          value={form.email}
          error={errors.email}
          onChange={(event) => dispatch({ type: "edit_email", value: event.target.value })}
        />
      </section>

      <section aria-labelledby="participants-title">
        <h2 id="participants-title" className="text-lg font-semibold">
          Участники
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          В заказе от {rules.min_participants} до {rules.max_participants} участников
        </p>

        <ol className="mt-3 space-y-4">
          {form.participants.map((participant, index) => (
            <ParticipantRow
              // Список только добавляется в конец и удаляется по индексу, поэтому индекс — стабильный ключ
              key={index}
              number={index + 1}
              value={participant}
              errors={errors.participants[index] ?? {}}
              rules={rules}
              removable={canRemove}
              onChange={(field, value) =>
                dispatch({ type: "edit_participant", index, field, value })
              }
              onRemove={() => dispatch({ type: "remove_participant", index })}
            />
          ))}
        </ol>

        {errors.group && (
          <Alert tone="error" className="mt-4" tabIndex={-1} data-group-error>
            {errors.group}
          </Alert>
        )}

        <Button
          variant="secondary"
          className="mt-4"
          disabled={!canAdd}
          onClick={() => dispatch({ type: "add_participant" })}
        >
          Добавить участника
        </Button>
      </section>
    </form>
  );
}
