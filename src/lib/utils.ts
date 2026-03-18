import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let lastActionTime = 0;

/**
 * Envuelve una acción con el cierre explícito del teclado móvil.
 * Además, contiene un sistema anti-rebote (debounce) de 400ms.
 * De esta forma podemos usar la función tanto en onPointerDown como en onClick
 * al mismo tiempo. onPointerDown se dispara antes de que el teclado cierre y la
 * pantalla se redibuje (evitando que el click se pierda), y el anti-rebote evita
 * que el evento click que le sigue ejecute la acción por segunda vez.
 */
export function withKeyboardClose(action: () => void) {
  const now = Date.now();
  if (now - lastActionTime < 400) return;
  lastActionTime = now;

  const activeElement = document.activeElement;
  const isInputFocused =
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable);

  if (isInputFocused && activeElement instanceof HTMLElement) {
    // Forzamos el cierre del teclado
    activeElement.blur();
    // CRÍTICO: Esperamos 150ms antes de ejecutar la acción (ej. navegar o guardar).
    // Si desmontamos la página inmediatamente (que es lo que hace navigate en React),
    // iOS y Android no logran ejecutar la animación del teclado porque el input "desaparece" de repente del DOM, 
    // dejando el teclado atascado e invisible o trabado en la pantalla.
    setTimeout(() => action(), 150);
  } else {
    // Si no había ningún input enfocado (teclado cerrado), la acción es instantánea.
    action();
  }
}
