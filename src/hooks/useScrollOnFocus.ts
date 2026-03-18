import { type FocusEvent } from 'react';

/**
 * useScrollOnFocus
 *
 * Al hacer foco en un input en móvil, el teclado virtual reduce el viewport.
 * Este hook hace scroll para que el input quede visible con suficiente
 * espacio debajo (para sugerencias / chips que aparecen bajo el input).
 *
 * Uso:
 *   const handleFocus = useScrollOnFocus();
 *   <input onFocus={handleFocus} ... />
 *
 * @param extraPaddingPx  espacio adicional (px) a dejar por debajo del input.
 *                        Por defecto 240, suficiente para ver las sugerencias.
 */
export function useScrollOnFocus(extraPaddingPx = 240) {
    const handleFocus = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const input = e.currentTarget;

        // Primer intento: scrollIntoView nativo (funciona bien en Android Chrome)
        // Usamos 'center' para que quede bien centrado visualmente
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Segundo intento tras el retraso del teclado: cálculo manual con visualViewport
        // (necesario en iOS Safari donde el teclado no reposiciona el scroll)
        setTimeout(() => {
            if (typeof window === 'undefined') return;

            const rect = input.getBoundingClientRect();

            // Altura real visible excluyendo el teclado (visualViewport la informa en iOS 13+)
            const visibleHeight = window.visualViewport?.height ?? window.innerHeight;

            // Queremos que el input esté en la mitad superior del área visible
            // con suficiente espacio debajo para las sugerencias
            const inputBottomWithPadding = rect.bottom + extraPaddingPx;

            if (inputBottomWithPadding > visibleHeight) {
                const overflow = inputBottomWithPadding - visibleHeight + 16;
                // Scroll del documento
                window.scrollBy({ top: overflow, behavior: 'smooth' });
            }
        }, 350); // ~300-400ms: tiempo de apertura del teclado en iOS y Android
    };

    return handleFocus;
}
