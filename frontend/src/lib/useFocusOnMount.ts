import { useEffect, useRef } from "react";

/**
 * Переносит фокус на элемент при появлении экрана: скринридер сразу озвучивает результат,
 * а клавиатурный пользователь не остаётся «позади» исчезнувшей кнопки.
 */
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
