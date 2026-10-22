import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

export type User = ReturnType<typeof userEvent.setup>;

/** Заполняет форму: email и участники «Анна 35» и «Маша 8» (итог 3 000 ₽). */
export async function fillValidForm(user: User) {
  await user.type(screen.getByLabelText("Контактный email"), "buyer@mail.ru");
  await user.click(screen.getByRole("button", { name: "Добавить участника" }));
  await user.type(screen.getByLabelText("Имя участника 1"), "Анна");
  await user.type(screen.getByLabelText("Возраст участника 1"), "35");
  await user.type(screen.getByLabelText("Имя участника 2"), "Маша");
  await user.type(screen.getByLabelText("Возраст участника 2"), "8");
}

/** Заполняет форму и доходит до экрана проверки. */
export async function goToReview(user: User) {
  await fillValidForm(user);
  await user.click(screen.getByRole("button", { name: "Продолжить" }));
}
