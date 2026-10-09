import { type FocusEvent } from 'react';

/**
 * useScrollOnFocus
 *
 * Al hacer foco en un input en móvil, el teclado virtual reduce el viewport.
 * Este hook hace scroll para que el input quede visible en la parte más
 * alta de la pantalla, dejando máximo espacio abajo.
 */
export function useScrollOnFocus() {
    const handleFocus = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const input = e.currentTarget;

        // Buscamos el contenedor padre (normalmente un div.space-y-2 o space-y-3 que envuelve al Label y al Input)
        const target = input.closest('.space-y-2, .space-y-3, .space-y-4') || input;

        // Esperamos a que el teclado termine de abrirse para posicionarlo centrado en el viewport visible
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }, 300);
    };

    return handleFocus;
}
