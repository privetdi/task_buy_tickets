import type { EventInfo } from "../../api/types";
import { Button } from "../../components/Button";
import { summarize } from "../../domain/pricing";
import { validAge } from "../../domain/validation";
import type { Step } from "./checkoutReducer";
import { DemoPanel } from "./DemoPanel";
import { EventHeader } from "./EventHeader";
import { FailureView } from "./FailureView";
import { CHECKOUT_FORM_ID, ParticipantsStep } from "./ParticipantsStep";
import { ReviewStep } from "./ReviewStep";
import { SeatsErrorView } from "./SeatsErrorView";
import { Steps } from "./Steps";
import { SuccessView } from "./SuccessView";
import { SummaryPanel } from "./SummaryPanel";
import { useCheckout } from "./useCheckout";

const STEP_NUMBER: Record<Step, 1 | 2 | 3> = {
  form: 1,
  review: 2,
  submitting: 2,
  seats_error: 2,
  error: 2,
  success: 3,
};

/** Шаги, на которых показывается панель итога с главной кнопкой. */
const SUMMARY_STEPS: Step[] = ["form", "review", "submitting"];

export function Checkout({ event }: { event: EventInfo }) {
  const { state, dispatch, submit, refreshSeats, startNewOrder, setSeats } = useCheckout(event);
  const { rules, step, form } = state;

  const ages = form.participants.map((participant) => validAge(participant.age, rules));
  const knownAges = ages.filter((age): age is number => age !== null);
  const summary = summarize(knownAges, rules);

  const action =
    step === "form" ? (
      <Button type="submit" form={CHECKOUT_FORM_ID} className="shrink-0">
        Продолжить
      </Button>
    ) : (
      <Button onClick={submit} loading={step === "submitting"} className="shrink-0">
        Подтвердить заказ
      </Button>
    );

  return (
    <div className="space-y-6">
      <EventHeader event={event} seatsAvailable={state.seatsAvailable} />
      <Steps current={STEP_NUMBER[step]} />

      <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 lg:space-y-0">
        <div>
          {step === "form" && <ParticipantsStep state={state} dispatch={dispatch} />}
          {(step === "review" || step === "submitting") && (
            <ReviewStep state={state} dispatch={dispatch} />
          )}
          {step === "success" && state.order && (
            <SuccessView order={state.order} onNewOrder={startNewOrder} />
          )}
          {step === "seats_error" && (
            <SeatsErrorView
              seatsAvailable={state.seatsAvailable}
              requested={form.participants.length}
              onEdit={() => dispatch({ type: "back_to_form" })}
              onRefresh={refreshSeats}
            />
          )}
          {step === "error" && (
            <FailureView
              kind={state.failure ?? "network"}
              onRetry={submit}
              onEdit={() => dispatch({ type: "back_to_form" })}
            />
          )}
        </div>

        {SUMMARY_STEPS.includes(step) && (
          <SummaryPanel
            rules={rules}
            summary={summary}
            incomplete={knownAges.length < ages.length}
            action={action}
          />
        )}
      </div>

      {event.demo_mode && <DemoPanel totalSeats={event.total_seats} onSeatsChange={setSeats} />}
    </div>
  );
}
