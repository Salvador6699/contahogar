export type FeatureFlagKey =
  | 'exp_compact_home'
  | 'exp_smart_reconcile'
  | 'exp_daily_budget'
  | 'exp_voice_preview'
  | 'exp_cashflow_lab'
  | 'exp_nav_v2';

export interface FeatureFlagDefinition {
  key: FeatureFlagKey;
  label: string;
  description: string;
  defaultValue: boolean;
  risk: 'Cero (solo UI)' | 'Cero (solo lectura)' | 'Bajo' | 'Alto';
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  {
    key: 'exp_daily_budget',
    label: '1. "¿Cuánto puedo gastar hoy?"',
    description:
      'Calcula tu presupuesto diario libre hasta fin de mes sin tocar tus provisiones ni el próximo mes.',
    defaultValue: false,
    risk: 'Cero (solo lectura)',
  },
  {
    key: 'exp_compact_home',
    label: '2. Inicio compacto + tabular-nums',
    description:
      'Unifica las alertas y diagnósticos (Intrames, Presupuestos, Cobertura y Ritmo) en una sola tarjeta desplegable con alineación numérica tabular.',
    defaultValue: false,
    risk: 'Cero (solo UI)',
  },
  {
    key: 'exp_voice_preview',
    label: '3. Previsualización editable en Voz',
    description:
      'Muestra la transcripción en vivo mientras hablas y abre una tarjeta editable para revisar o corregir antes de guardar.',
    defaultValue: false,
    risk: 'Bajo',
  },
  {
    key: 'exp_smart_reconcile',
    label: '4. Conciliación inteligente en "Cuadrar"',
    description:
      'Sugiere movimientos pendientes (o combinaciones exactas) y plantillas recientes que explican el descuadre para confirmar o pre-rellenar ajustes en un clic.',
    defaultValue: false,
    risk: 'Bajo',
  },
  {
    key: 'exp_cashflow_lab',
    label: '5. Calendario de flujo + Simulador "¿Qué pasa si...?"',
    description:
      'Activa la ruta aislada /simulador con calendario diario de saldos proyectados y simulador hipotético en memoria.',
    defaultValue: false,
    risk: 'Cero (solo lectura)',
  },
  {
    key: 'exp_nav_v2',
    label: '6. Navegación en 4 pilares',
    description:
      'Agrupa el menú en Inicio · Planificar · Analizar · Gestión con accesos directos entre secciones hermanas.',
    defaultValue: false,
    risk: 'Cero (solo UI)',
  },
];

export type FeatureFlagsState = Record<FeatureFlagKey, boolean>;

const STORAGE_KEY = 'contahogar_feature_flags';
export const FEATURE_FLAGS_CHANGED_EVENT = 'contahogar:feature-flags-changed';

export const getDefaultFeatureFlags = (): FeatureFlagsState => ({
  exp_compact_home: false,
  exp_smart_reconcile: false,
  exp_daily_budget: false,
  exp_voice_preview: false,
  exp_cashflow_lab: false,
  exp_nav_v2: false,
});

export const readFeatureFlags = (): FeatureFlagsState => {
  const defaults = getDefaultFeatureFlags();
  if (typeof window === 'undefined') return defaults;

  let stored: Partial<FeatureFlagsState> = {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        stored = parsed;
      }
    }
  } catch {
    stored = {};
  }

  const next: FeatureFlagsState = { ...defaults };
  for (const def of FEATURE_FLAG_DEFINITIONS) {
    if (typeof stored[def.key] === 'boolean') {
      next[def.key] = stored[def.key] as boolean;
    }
  }

  // Optional URL query override for quick testing (?exp_compact_home=1 or 0)
  try {
    const params = new URLSearchParams(window.location.search);
    for (const def of FEATURE_FLAG_DEFINITIONS) {
      const param = params.get(def.key);
      if (param === '1' || param === 'true') next[def.key] = true;
      if (param === '0' || param === 'false') next[def.key] = false;
    }
  } catch {
    // ignore malformed URL
  }

  return next;
};

export const setFeatureFlag = (key: FeatureFlagKey, value: boolean): FeatureFlagsState => {
  const current = readFeatureFlags();
  const updated: FeatureFlagsState = { ...current, [key]: value };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(FEATURE_FLAGS_CHANGED_EVENT, { detail: updated }));
  }
  return updated;
};

export const resetFeatureFlags = (): FeatureFlagsState => {
  const defaults = getDefaultFeatureFlags();
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(FEATURE_FLAGS_CHANGED_EVENT, { detail: defaults }));
  }
  return defaults;
};
