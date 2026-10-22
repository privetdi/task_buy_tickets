const NBSP = " ";

/** Деньги в рублях: «2 000 ₽» (разряды и знак отделены неразрывными пробелами). */
export function formatMoney(amount: number): string {
  const grouped = String(Math.abs(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${amount < 0 ? "−" : ""}${grouped}${NBSP}₽`;
}

/** Выбор формы слова по числу: 1 место, 2 места, 5 мест. */
export function plural(n: number, one: string, few: string, many: string): string {
  const lastTwo = Math.abs(n) % 100;
  const last = lastTwo % 10;
  if (lastTwo > 10 && lastTwo < 20) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}

export const seatsWord = (n: number) => plural(n, "место", "места", "мест");

export const ageWord = (n: number) => plural(n, "год", "года", "лет");

export const participantsWord = (n: number) => plural(n, "участник", "участника", "участников");

/** Дата и время мероприятия: «21 ноября 2026 г., 19:00». */
export function formatDateTime(iso: string, timeZone?: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}
