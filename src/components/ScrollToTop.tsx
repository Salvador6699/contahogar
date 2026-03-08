import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resetea el scroll a la parte superior de la página cada vez que cambia la ruta.
 */
const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [pathname]);

    return null;
};

export default ScrollToTop;
