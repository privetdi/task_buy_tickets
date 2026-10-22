import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { participantsWord, seatsWord } from "../../lib/format";
import { useFocusOnMount } from "../../lib/useFocusOnMount";

interface SeatsErrorViewProps {
  seatsAvailable: number;
  /** Сколько участников в заказе. */
  requested: number;
  onEdit: () => void;
  onRefresh: () => void;
}

/** Перед подтверждением места разобрали: данные сохранены, дальше — правка заказа или ожидание. */
export function SeatsErrorView({
  seatsAvailable,
  requested,
  onEdit,
  onRefresh,
}: SeatsErrorViewProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const soldOut = seatsAvailable === 0;

  return (
    <section aria-labelledby="seats-title" className="space-y-4">
      <Alert tone={soldOut ? "error" : "warning"}>
        <h2
          id="seats-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold focus:outline-none"
        >
          {soldOut ? "Места закончились" : "Не хватает мест"}
        </h2>
        {soldOut ? (
          <p className="mt-1">
            Пока вы оформляли заказ, свободных мест не осталось. Ваши данные сохранены: если места
            появятся, заказ можно будет подтвердить.
          </p>
        ) : (
          <p className="mt-1">
            Пока вы оформляли заказ, часть мест разобрали. Осталось {seatsAvailable}{" "}
            {seatsWord(seatsAvailable)}, а в заказе {requested} {participantsWord(requested)}.
            Уменьшите число участников и подтвердите заказ ещё раз.
          </p>
        )}
      </Alert>

      {soldOut ? (
        <Button onClick={onRefresh}>Проверить наличие мест</Button>
      ) : (
        <Button onClick={onEdit}>Изменить заказ</Button>
      )}
    </section>
  );
}
