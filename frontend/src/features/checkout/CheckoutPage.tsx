import type { ReactNode } from "react";

import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { Spinner } from "../../components/Spinner";
import { Checkout } from "./Checkout";
import { useEvent } from "./useEvent";

function PageShell({ children }: { children: ReactNode }) {
  // pb-32: на телефоне внизу закреплена панель с итогом, контент не должен уходить под неё
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-5xl px-4 py-6 pb-32 sm:py-10 lg:pb-10">{children}</main>
    </div>
  );
}

export default function CheckoutPage() {
  const { state, retry } = useEvent();

  if (state.status === "loading") {
    return (
      <PageShell>
        <div role="status" className="flex items-center justify-center gap-3 py-20 text-slate-600">
          <Spinner />
          Загружаем мероприятие…
        </div>
      </PageShell>
    );
  }

  if (state.status === "error") {
    return (
      <PageShell>
        <Alert tone="error" title="Не удалось загрузить данные мероприятия">
          <p>Проверьте соединение и попробуйте ещё раз.</p>
          <Button className="mt-3" onClick={retry}>
            Повторить
          </Button>
        </Alert>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Checkout event={state.event} />
    </PageShell>
  );
}
