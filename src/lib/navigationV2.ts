import {
  ArrowLeftRight,
  CalendarDays,
  History,
  Home,
  Layers,
  BarChart3,
  PiggyBank,
  Repeat,
  Scale,
  Search as SearchIcon,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Wrench,
  Zap,
} from 'lucide-react'

export interface PillarNavItem {
  icon: any
  label: string
  path: string
  description?: string
  exact?: boolean
}

export interface NavPillar {
  id: 'inicio' | 'planificar' | 'analizar' | 'gestion'
  label: string
  icon: any
  path?: string
  items: PillarNavItem[]
}

/**
 * Returns the 4-pillar navigation structure for exp_nav_v2.
 */
export function getNavPillars(includeCashflowLab: boolean): NavPillar[] {
  return [
    {
      id: 'inicio',
      label: 'Inicio',
      icon: Home,
      path: '/',
      items: [
        { icon: Home, label: 'Inicio', path: '/', exact: true },
        { icon: CalendarDays, label: 'Próximos', path: '/proximos' },
      ],
    },
    {
      id: 'planificar',
      label: 'Planificar',
      icon: Layers,
      items: [
        {
          icon: PiggyBank,
          label: 'Presupuestos',
          path: '/presupuestos',
          description: 'Sobres mensuales y provisión',
        },
        {
          icon: Target,
          label: 'Ahorros',
          path: '/ahorros',
          description: 'Metas y fondos reservados',
        },
        {
          icon: Repeat,
          label: 'Gastos Fijos y Préstamos',
          path: '/gastos-fijos',
          description: 'Hipoteca, cuotas, suministros y suscripciones',
        },
      ],
    },
    {
      id: 'analizar',
      label: 'Analizar',
      icon: BarChart3,
      items: [
        {
          icon: TrendingUp,
          label: 'Evolución',
          path: '/evolucion',
          description: 'Tendencias y comparativa mensual',
        },
        {
          icon: Scale,
          label: 'Cuadrar',
          path: '/comparativa',
          description: 'Conciliar saldo real del banco',
        },
        {
          icon: History,
          label: 'Historial',
          path: '/historial',
          description: 'Listado completo de movimientos',
        },
        {
          icon: SearchIcon,
          label: 'Buscar',
          path: '/buscar',
          description: 'Filtros avanzados por importe o fecha',
        },
        ...(includeCashflowLab
          ? [
              {
                icon: CalendarDays,
                label: 'Simulador',
                path: '/simulador',
                description: 'Calendario de flujo y "¿Qué pasa si...?"',
              },
            ]
          : []),
      ],
    },
    {
      id: 'gestion',
      label: 'Gestión',
      icon: Wrench,
      items: [
        {
          icon: ArrowLeftRight,
          label: 'Transferir',
          path: '/transferir',
          description: 'Traspasos entre tus cuentas',
        },
        {
          icon: Zap,
          label: 'Botones Rápidos',
          path: '/favorites',
          description: 'Accesos directos frecuentes',
        },
        {
          icon: Settings,
          label: 'Ajustes',
          path: '/ajustes',
          description: 'Cuentas, categorías y Laboratorio',
        },
        {
          icon: ShieldCheck,
          label: 'Seguridad',
          path: '/backup',
          description: 'Copias de seguridad y CSV',
        },
      ],
    },
  ]
}

export function findActivePillar(pathname: string, pillars: NavPillar[]): NavPillar | undefined {
  const effectivePath = pathname.startsWith('/prestamos') ? '/gastos-fijos' : pathname
  return pillars.find((p) =>
    p.items.some((item) =>
      item.exact ? effectivePath === item.path : effectivePath.startsWith(item.path)
    )
  )
}
