import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resetea el scroll a la parte superior de la página y cierra el teclado virtual
 * cada vez que cambia la ruta.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

        // Al cambiar de página, provocamos la pérdida de foco global
        // Esto asegura que el teclado del móvil se cierre siempre
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, [pathname]);

    return null;
};

export default ScrollToTop;
