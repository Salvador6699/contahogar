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

/**
 * Parsea un monto numérico admitiendo tanto coma (',') como punto ('.') decimal.
 * Soporta formatos:
 * - '12.50' -> 12.5
 * - '12,50' -> 12.5
 * - '0,50' -> 0.5
 * - ',50' -> 0.5
 * - '.50' -> 0.5
 * - '1.250,50' -> 1250.5
 * - '1,250.50' -> 1250.5
 */
export function parseAmount(val: string | number | undefined | null): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = val.toString().trim();
  if (!str) return 0;

  // Limpiar posibles duplicaciones consecutivas (ej: 12,,50 o 12..50)
  str = str.replace(/,{2,}/g, ',').replace(/\.{2,}/g, '.');

  // Si contiene tanto punto como coma, determinar cuál es el separador decimal
  if (str.includes('.') && str.includes(',')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // Estilo europeo: 1.250,50 -> eliminar puntos de miles y cambiar coma por punto
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Estilo anglosajón: 1,250.50 -> eliminar comas de miles
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Solo contiene coma(s)
    const parts = str.split(',');
    if (parts.length > 2) {
      if (parts[parts.length - 1].length <= 2) {
        str = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      } else {
        str = parts.join('');
      }
    } else {
      str = str.replace(',', '.');
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Determina si una categoría corresponde a una transferencia
 */
export function isTransfer(category?: string | null): boolean {
  if (!category) return false;
  return (
    category
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') === 'transferencia'
  );
}
