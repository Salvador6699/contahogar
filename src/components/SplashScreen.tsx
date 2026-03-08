import { useEffect, useState } from 'react';

/* ─── Consejos económicos ───────────────────────────────────────── */
const TIPS = [
    '💡 Apunta cada gasto por pequeño que sea: los céntimos son los que escapan.',
    '📊 La regla 50/30/20: 50 % necesidades, 30 % deseos, 20 % ahorro.',
    '🛒 Haz la lista de la compra antes de salir y cíñete a ella.',
    '🔄 Revisa tus suscripciones cada trimestre y cancela las que no usas.',
    '🏦 Automatiza una transferencia al ahorro el mismo día que cobres.',
    '☕ Preparar el café en casa en vez de comprarlo puede ahorrarte +500 € al año.',
    '📅 Usa ContaHogar para comparar mes a mes y detectar gastos que crecen.',
    '🎯 Fíjate un objetivo de ahorro concreto: saber el "para qué" motiva más.',
    '💳 Evita pagar a plazos salvo que sea 0 % de interés: el crédito tiene un coste invisible.',
    '🧾 Los presupuestos por categoría te avisan antes de pasarte, no después.',
];

/* ─── Duración total del splash ─────────────────────────────────── */
const SPLASH_DURATION_MS = 10_000;
const TIP_INTERVAL_MS = 3_000;

interface Props {
    onFinish: () => void;
}

const SplashScreen = ({ onFinish }: Props) => {
    const [tipIndex, setTipIndex] = useState(0);
    const [tipVisible, setTipVisible] = useState(true);
    const [progress, setProgress] = useState(0);
    const [leaving, setLeaving] = useState(false);

    /* ── Rotación de consejos con fade ── */
    useEffect(() => {
        const interval = setInterval(() => {
            setTipVisible(false);
            setTimeout(() => {
                setTipIndex(i => (i + 1) % TIPS.length);
                setTipVisible(true);
            }, 400);
        }, TIP_INTERVAL_MS);
        return () => clearInterval(interval);
    }, []);

    /* ── Progreso de la barra ── */
    useEffect(() => {
        const start = Date.now();
        const tick = setInterval(() => {
            const elapsed = Date.now() - start;
            setProgress(Math.min((elapsed / SPLASH_DURATION_MS) * 100, 100));
        }, 50);
        return () => clearInterval(tick);
    }, []);

    /* ── Temporizador de cierre ── */
    useEffect(() => {
        const t = setTimeout(() => {
            setLeaving(true);
            setTimeout(onFinish, 600); // espera a que termine la animación de salida
        }, SPLASH_DURATION_MS);
        return () => clearTimeout(t);
    }, [onFinish]);

    return (
        <div
            className="splash-screen"
            style={{
                opacity: leaving ? 0 : 1,
                transition: 'opacity 0.6s ease',
            }}
        >
            {/* Logo / imagen */}
            <div className="splash-logo-wrapper">
                <img
                    src="/bienvenida.png"
                    alt="ContaHogar – Gestión fácil y feliz de tu dinero"
                    className="splash-logo"
                />
            </div>

            {/* Consejo del momento */}
            <div className="splash-tip-area">
                <p
                    className="splash-tip-text"
                    style={{
                        opacity: tipVisible ? 1 : 0,
                        transform: tipVisible ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'opacity 0.4s ease, transform 0.4s ease',
                    }}
                >
                    {TIPS[tipIndex]}
                </p>
            </div>

            {/* Loader + texto + barra de progreso */}
            <div className="splash-loader-area">
                <div className="splash-spinner" aria-label="Cargando" />
                <p className="splash-loading-text">Cargando tus datos…</p>
                <div className="splash-progress-track">
                    <div
                        className="splash-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
