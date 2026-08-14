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

        // Buscamos el contenedor padre (normalmente un div.space-y-2 que envuelve al Label y al Input)
        // para que sea el Label el que quede pegado arriba y no se corte visualmente.
        const target = input.closest('.space-y-2') || input;

        // Esperamos a que el teclado termine de abrirse para calcular el viewport
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
            
            // Si el header es sticky, podemos ajustar un poco el scroll si hiciera falta,
            // pero block: 'start' es lo más nativo para pegarlo arriba.
        }, 350); // ~350ms: tiempo de animación del teclado
    };

    return handleFocus;
}
