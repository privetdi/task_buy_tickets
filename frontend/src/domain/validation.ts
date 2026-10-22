// Проверка формы на клиенте. Сервер проверяет те же правила и остаётся главным:
// его ответ об ошибках переводится в те же `FormErrors` (см. formErrorsFromServer).
import type { OrderRequest, Rules } from "../api/types";
import type { ValidationError } from "../api/client";
import { ageWord } from "../lib/format";
import { escortRuleViolated } from "./pricing";

export interface ParticipantForm {
  name: string;
  age: string;
}

export interface CheckoutForm {
  email: string;
  participants: ParticipantForm[];
}

export interface ParticipantErrors {
  name?: string;
  age?: string;
}

export interface FormErrors {
  email?: string;
  participants: ParticipantErrors[];
  /** Ошибка уровня группы, например правило сопровождения. */
  group?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emptyParticipant = (): ParticipantForm => ({ name: "", age: "" });

/** Возраст как целое число из строки ввода; `null`, если это не целое неотрицательное число. */
export function parseAge(raw: string): number | null {
  const value = raw.trim();
  return /^\d{1,3}$/.test(value) ? Number(value) : null;
}

/** Корректный возраст в допустимых границах либо `null`. */
export function validAge(raw: string, rules: Rules): number | null {
  const age = parseAge(raw);
  return age !== null && age >= rules.min_age && age <= rules.max_age ? age : null;
}

export function escortMessage(rules: Rules): string {
  const below = rules.escort_required_below_age;
  const adult = rules.adult_min_age;
  return `Дети младше ${below} ${ageWord(below)} допускаются только вместе с участником от ${adult} ${ageWord(adult)}`;
}

function validateName(raw: string, rules: Rules): string | undefined {
  const name = raw.trim();
  if (name === "") return "Укажите имя";
  if (name.length > rules.max_name_length) {
    return `Не длиннее ${rules.max_name_length} символов`;
  }
  return undefined;
}

function validateAgeField(raw: string, rules: Rules): string | undefined {
  if (raw.trim() === "") return "Укажите возраст";
  if (validAge(raw, rules) === null) {
    return `Возраст — целое число от ${rules.min_age} до ${rules.max_age}`;
  }
  return undefined;
}

export function validateForm(form: CheckoutForm, rules: Rules): FormErrors {
  const errors: FormErrors = {
    participants: form.participants.map((participant) => {
      const result: ParticipantErrors = {};
      const nameError = validateName(participant.name, rules);
      const ageError = validateAgeField(participant.age, rules);
      if (nameError) result.name = nameError;
      if (ageError) result.age = ageError;
      return result;
    }),
  };

  const email = form.email.trim();
  if (email === "") errors.email = "Укажите email";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Проверьте адрес: например, name@mail.ru";

  // Правило сопровождения проверяем, только когда возрасты всех участников известны:
  // иначе сообщение появилось бы раньше, чем покупатель заполнил остальных
  const ages = form.participants.map((participant) => validAge(participant.age, rules));
  if (ages.every((age) => age !== null) && escortRuleViolated(ages as number[], rules)) {
    errors.group = escortMessage(rules);
  }

  return errors;
}

export function hasErrors(errors: FormErrors): boolean {
  return Boolean(
    errors.email ||
      errors.group ||
      errors.participants.some((participant) => participant.name || participant.age),
  );
}

/** Данные формы → тело запроса. Вызывать только после успешной валидации. */
export function toOrderRequest(form: CheckoutForm): OrderRequest {
  return {
    email: form.email.trim(),
    participants: form.participants.map((participant) => {
      const age = parseAge(participant.age);
      if (age === null) throw new Error("Возраст не прошёл валидацию");
      return { name: participant.name.trim(), age };
    }),
  };
}

/** Ответ сервера об ошибках → ошибки формы, чтобы подсветить нужные поля. */
export function formErrorsFromServer(
  error: ValidationError,
  participantCount: number,
  rules: Rules,
): FormErrors {
  const errors: FormErrors = {
    participants: Array.from({ length: participantCount }, () => ({})),
  };

  if (error.code === "child_requires_adult") {
    errors.group = escortMessage(rules);
    return errors;
  }

  for (const { field } of error.fields) {
    const match = /^participants\.(\d+)\.(name|age)$/.exec(field);
    const participant = match ? errors.participants[Number(match[1])] : undefined;
    if (field === "email") {
      errors.email = "Проверьте email";
    } else if (participant && match?.[2] === "name") {
      participant.name = "Проверьте имя";
    } else if (participant && match?.[2] === "age") {
      participant.age = "Проверьте возраст";
    } else {
      errors.group = "Проверьте состав заказа";
    }
  }
  return errors;
}
