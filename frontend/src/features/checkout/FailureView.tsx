import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { useFocusOnMount } from "../../lib/useFocusOnMount";

interface FailureViewProps {
  kind: "network" | "server";
  onRetry: () => void;
  onEdit: () => void;
}

const MESSAGES = {
  network: "Нет связи с сервером. Проверьте соединение и повторите попытку.",
  server: "На сервере произошла ошибка. Повторите попытку чуть позже.",
} as const;

/** Сбой при подтверждении: заказ не создан, введённые данные сохранены, можно повторить. */
export function FailureView({ kind, onRetry, onEdit }: FailureViewProps) {
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <section aria-labelledby="failure-title" className="space-y-4">
      <Alert tone="error">
        <h2
          id="failure-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold focus:outline-none"
        >
          Не удалось оформить заказ
        </h2>
        <p className="mt-1">{MESSAGES[kind]} Введённые данные сохранены.</p>
      </Alert>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onRetry}>Повторить</Button>
        <Button variant="secondary" onClick={onEdit}>
          Изменить заказ
        </Button>
      </div>
    </section>
  );
}
