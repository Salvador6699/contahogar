import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  addMonths,
  format,
  getDay,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import { useFeatureFlags } from '@/hooks/useFeatureFlags'
import { formatCurrency } from '@/lib/calculations'
import {
  buildCashflowSimulation,
  SimulatedEvent,
} from '@/lib/cashflowSimulation'
import { cn, parseAmount } from '@/lib/utils'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function CashflowSimulatorPage() {
  const navigate = useNavigate()
  const { flags, toggleFlag } = useFeatureFlags()
  const { accounts, isLoading: accLoading } = useAccounts()
  const { transactions, isLoading: txLoading } = useTransactions()

  const [activeTab, setActiveTab] = useState<'calendar' | 'simulator'>('calendar')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('total')
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [selectedDayStr, setSelectedDayStr] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  )
  const [horizonMonths, setHorizonMonths] = useState<1 | 3 | 6>(3)

  // In-memory hypothetical events (never written to Supabase)
  const [simEvents, setSimEvents] = useState<SimulatedEvent[]>([])
  const [evName, setEvName] = useState('')
  const [evType, setEvType] = useState<'expense' | 'income'>('expense')
  const [evAmount, setEvAmount] = useState('')
  const [evDate, setEvDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [evKind, setEvKind] = useState<'one-time' | 'monthly'>('one-time')
  const [evMonths, setEvMonths] = useState('6')

  const calendarMonthKey = format(calendarMonth, 'yyyy-MM')

  const calendarSimulation = useMemo(
    () =>
      buildCashflowSimulation({
        accounts,
        transactions,
        selectedAccountId,
        startMonthDate: calendarMonth,
        horizonMonths: 1,
        simulatedEvents: simEvents,
      }),
    [accounts, transactions, selectedAccountId, calendarMonth, simEvents]
  )

  const horizonSimulation = useMemo(
    () =>
      buildCashflowSimulation({
        accounts,
        transactions,
        selectedAccountId,
        startMonthDate: startOfMonth(new Date()),
        horizonMonths,
        simulatedEvents: simEvents,
      }),
    [accounts, transactions, selectedAccountId, horizonMonths, simEvents]
  )

  const leadingEmptyDays = useMemo(() => {
    // getDay: 0 = Sunday, 1 = Monday ... 6 = Saturday -> Monday-first offset
    const day = getDay(startOfMonth(calendarMonth))
    return day === 0 ? 6 : day - 1
  }, [calendarMonth])

  const selectedDayPoint = useMemo(
    () =>
      calendarSimulation.days.find((d) => d.date === selectedDayStr) ||
      calendarSimulation.days[0] ||
      null,
    [calendarSimulation.days, selectedDayStr]
  )

  const handleAddSimEvent = () => {
    const amount = parseAmount(evAmount)
    if (!evName.trim() || amount <= 0 || !evDate) return
    const next: SimulatedEvent = {
      id: crypto.randomUUID(),
      name: evName.trim(),
      type: evType,
      amount,
      date: evDate,
      kind: evKind,
      monthsCount: evKind === 'monthly' ? Math.max(1, parseInt(evMonths, 10) || 1) : 1,
    }
    setSimEvents((prev) => [...prev, next])
    setEvName('')
    setEvAmount('')
  }

  if (!flags.exp_cashflow_lab) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              Experimento desactivado
            </CardTitle>
            <CardDescription>
              El Calendario de flujo de caja y Simulador "¿Qué pasa si...?" está apagado en Laboratorio.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => toggleFlag('exp_cashflow_lab', true)}>
              Activar ahora
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/' } as any)}>
              Volver a Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accLoading || txLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const selectedDayNet = selectedDayPoint
    ? simEvents.length > 0
      ? selectedDayPoint.simulatedNet
      : selectedDayPoint.baseNet
    : 0

  return (
    <div className="w-full tabular-nums">
      <div className="w-full max-w-6xl mx-auto px-4 lg:px-12 py-4 sm:py-6 pb-28 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight">Flujo de Caja y Simulador</h1>
              <Badge variant="outline" className="text-[10px] font-bold">
                Solo lectura en memoria
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Explora tu saldo día a día y simula gastos o cuotas sin alterar tu base de datos.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-[190px] rounded-xl bg-background">
                <SelectValue placeholder="Cuenta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Todas (principales)</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl max-w-md">
          <Button
            type="button"
            variant={activeTab === 'calendar' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('calendar')}
            className="rounded-xl gap-2 font-bold text-xs sm:text-sm"
          >
            <CalendarDays className="w-4 h-4" />
            Calendario Diario
          </Button>
          <Button
            type="button"
            variant={activeTab === 'simulator' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('simulator')}
            className="rounded-xl gap-2 font-bold text-xs sm:text-sm"
          >
            <Sparkles className="w-4 h-4" />
            Simulador ({simEvents.length})
          </Button>
        </div>

        {/* TAB 1: CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg capitalize">
                    {format(calendarMonth, 'MMMM yyyy', { locale: es })}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Saldo proyectado al cierre de cada día{simEvents.length > 0 ? ' (incluyendo simulación)' : ''}.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold rounded-lg"
                    onClick={() => {
                      setCalendarMonth(startOfMonth(new Date()))
                      setSelectedDayStr(todayStr)
                    }}
                  >
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground pb-1">
                  {WEEKDAYS.map((wd) => (
                    <div key={wd}>{wd}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {Array.from({ length: leadingEmptyDays }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="min-h-[64px] sm:min-h-[76px]" />
                  ))}

                  {calendarSimulation.days.map((day) => {
                    const hasSimActive = simEvents.length > 0
                    const bal = hasSimActive ? day.simulatedBalance : day.baseBalance
                    const net = hasSimActive ? day.simulatedNet : day.baseNet
                    const hasVariation = Math.abs(net) > 0.005
                    const isPositiveVar = net > 0.005
                    const isNegativeVar = net < -0.005
                    const isDeficit = bal < -0.005
                    const isLow = !isDeficit && bal < 150
                    const isSelected = selectedDayPoint?.date === day.date
                    const isToday = day.date === todayStr
                    const dayNum = parseInt(day.date.split('-')[2], 10)
                    const hasSimItem = day.items.some((i) => i.isSimulated)
                    const hasMovements = day.items.length > 0

                    return (
                      <button
                        key={day.date}
                        type="button"
                        onClick={() => setSelectedDayStr(day.date)}
                        title={
                          hasMovements
                            ? `${hasVariation ? `Varía el saldo (${net > 0 ? '+' : ''}${formatCurrency(net)}) · ` : ''}${day.items.length} movimiento${day.items.length > 1 ? 's' : ''} — Pulsa para ver por qué`
                            : 'Sin movimientos este día'
                        }
                        className={cn(
                          'min-h-[64px] sm:min-h-[76px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all',
                          isSelected
                            ? 'border-primary ring-2 ring-primary/25 bg-primary/5'
                            : isDeficit
                              ? 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/15'
                              : isLow
                                ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
                                : 'border-border/50 bg-background/60 hover:bg-muted/50'
                        )}
                      >
                        <div className="flex items-center justify-between w-full gap-0.5">
                          <span
                            className={cn(
                              'text-[11px] font-bold leading-none shrink-0',
                              isToday &&
                                'px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground'
                            )}
                          >
                            {dayNum}
                          </span>
                          {hasMovements && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[9px] font-extrabold leading-none shrink-0',
                                isPositiveVar
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : isNegativeVar
                                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                                    : 'bg-muted text-muted-foreground'
                              )}
                            >
                              {hasSimItem && (
                                <Sparkles className="w-2.5 h-2.5 text-primary shrink-0" />
                              )}
                              {isPositiveVar ? (
                                <ArrowUpRight className="w-3 h-3 shrink-0" />
                              ) : isNegativeVar ? (
                                <ArrowDownRight className="w-3 h-3 shrink-0" />
                              ) : (
                                <ArrowLeftRight className="w-2.5 h-2.5 shrink-0" />
                              )}
                              <span>{day.items.length}</span>
                            </span>
                          )}
                        </div>

                        <span
                          className={cn(
                            'text-[10px] sm:text-[11px] font-black truncate w-full',
                            isDeficit
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLow
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-foreground'
                          )}
                        >
                          {Math.round(bal).toLocaleString('es-ES')}€
                        </span>
                      </button>
                    )
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-flex items-center px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                    Sube saldo
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-flex items-center px-1 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300">
                      <ArrowDownRight className="w-3 h-3" />
                    </span>
                    Baja saldo
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-flex items-center px-1 py-0.5 rounded bg-muted text-muted-foreground">
                      <ArrowLeftRight className="w-2.5 h-2.5" />
                    </span>
                    Sin variación neta
                  </span>
                  <span className="ml-auto text-[10px] font-medium">
                    Pulsa un día para ver el porqué
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Day Inspector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedDayPoint
                    ? format(parseISO(selectedDayPoint.date), "EEEE d 'de' MMMM", { locale: es })
                    : 'Detalle del día'}
                </CardTitle>
                {selectedDayPoint && (
                  <CardDescription className="text-xs space-y-1">
                    <span className="block">
                      Variación del día:{' '}
                      <strong
                        className={cn(
                          selectedDayNet > 0.005
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : selectedDayNet < -0.005
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-muted-foreground'
                        )}
                      >
                        {`${selectedDayNet > 0 ? '+' : ''}${formatCurrency(selectedDayNet)}`}
                      </strong>
                    </span>
                    <span className="block">
                      Cierre real/previsto:{' '}
                      <strong
                        className={cn(
                          selectedDayPoint.baseBalance < 0 ? 'text-rose-600' : 'text-foreground'
                        )}
                      >
                        {formatCurrency(selectedDayPoint.baseBalance)}
                      </strong>
                    </span>
                    {simEvents.length > 0 && (
                      <span className="block text-primary">
                        Con simulación:{' '}
                        <strong>{formatCurrency(selectedDayPoint.simulatedBalance)}</strong>
                      </span>
                    )}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {!selectedDayPoint || selectedDayPoint.items.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-center text-muted-foreground">
                    Sin movimientos registrados ni previstos para este día en {calendarMonthKey}.
                  </div>
                ) : (
                  selectedDayPoint.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-2.5 rounded-xl border flex items-center justify-between gap-2',
                        item.isSimulated
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-muted/30 border-border/50'
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {item.isSimulated
                            ? 'Simulado'
                            : item.isPending
                              ? 'Pendiente'
                              : 'Confirmado'}
                          {item.accountName ? ` · ${item.accountName}` : ''}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'font-black shrink-0',
                          item.type === 'income' ? 'text-income' : 'text-expense'
                        )}
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Mínimo sin cambios ({horizonMonths}m)
                  </p>
                  <p
                    className={cn(
                      'text-xl font-black mt-1',
                      horizonSimulation.minBaseBalance < 0 ? 'text-rose-600' : 'text-foreground'
                    )}
                  >
                    {formatCurrency(horizonSimulation.minBaseBalance)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    El {format(parseISO(horizonSimulation.minBaseDate), 'd MMM yyyy', { locale: es })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Mínimo con simulación
                  </p>
                  <p
                    className={cn(
                      'text-xl font-black mt-1',
                      horizonSimulation.minSimBalance < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {formatCurrency(horizonSimulation.minSimBalance)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    El {format(parseISO(horizonSimulation.minSimDate), 'd MMM yyyy', { locale: es })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cierre a {horizonMonths} {horizonMonths === 1 ? 'mes' : 'meses'}
                  </p>
                  <p className="text-xl font-black mt-1 text-primary">
                    {formatCurrency(horizonSimulation.endSimBalance)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Sin simulación: {formatCurrency(horizonSimulation.endBaseBalance)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {horizonSimulation.firstSimDeficitDate && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs sm:text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <div>
                  <p className="font-extrabold text-rose-700 dark:text-rose-400">
                    La simulación provoca descubierto el{' '}
                    {format(parseISO(horizonSimulation.firstSimDeficitDate), "d 'de' MMMM yyyy", {
                      locale: es,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Mínimo alcanzado: {formatCurrency(horizonSimulation.minSimBalance)}.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Builder Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Añadir supuesto</CardTitle>
                  <CardDescription className="text-xs">
                    Simula un gasto puntual o una cuota mensual.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={evType === 'expense' ? 'default' : 'outline'}
                      onClick={() => setEvType('expense')}
                      className="rounded-xl font-bold"
                    >
                      Gasto / Cuota
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={evType === 'income' ? 'default' : 'outline'}
                      onClick={() => setEvType('income')}
                      className="rounded-xl font-bold"
                    >
                      Ingreso extra
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="sim-name">Concepto</Label>
                    <Input
                      id="sim-name"
                      value={evName}
                      onChange={(e) => setEvName(e.target.value)}
                      placeholder="Ej: Cuota coche / Viaje"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="sim-amount">Importe (€)</Label>
                      <Input
                        id="sim-amount"
                        inputMode="decimal"
                        value={evAmount}
                        onChange={(e) => setEvAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sim-date">Fecha</Label>
                      <Input
                        id="sim-date"
                        type="date"
                        value={evDate}
                        onChange={(e) => setEvDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Frecuencia</Label>
                      <Select
                        value={evKind}
                        onValueChange={(v) => setEvKind(v as 'one-time' | 'monthly')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-time">Puntual</SelectItem>
                          <SelectItem value="monthly">Mensual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {evKind === 'monthly' && (
                      <div className="space-y-1">
                        <Label htmlFor="sim-months">Meses</Label>
                        <Input
                          id="sim-months"
                          type="number"
                          min={1}
                          max={36}
                          value={evMonths}
                          onChange={(e) => setEvMonths(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddSimEvent}
                    disabled={!evName.trim() || parseAmount(evAmount) <= 0}
                    className="w-full gap-1.5 rounded-xl font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    Añadir a la simulación
                  </Button>

                  {simEvents.length > 0 && (
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase text-[10px] text-muted-foreground">
                          Supuestos activos
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSimEvents([])}
                          className="h-6 px-2 text-[11px] text-muted-foreground gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Limpiar
                        </Button>
                      </div>
                      {simEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-2 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="font-bold truncate">{ev.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {ev.kind === 'monthly' ? `${ev.monthsCount} meses` : 'Puntual'} ·{' '}
                              {format(parseISO(ev.date), 'd MMM yy', { locale: es })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={cn(
                                'font-black',
                                ev.type === 'income' ? 'text-income' : 'text-expense'
                              )}
                            >
                              {ev.type === 'income' ? '+' : '-'}
                              {formatCurrency(ev.amount)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                setSimEvents((prev) => prev.filter((item) => item.id !== ev.id))
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comparative Chart */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base">Proyección de saldo diario</CardTitle>
                    <CardDescription className="text-xs">
                      Línea base real/prevista frente al escenario simulado.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                    {([1, 3, 6] as const).map((m) => (
                      <Button
                        key={m}
                        type="button"
                        size="sm"
                        variant={horizonMonths === m ? 'default' : 'ghost'}
                        onClick={() => setHorizonMonths(m)}
                        className="h-7 px-2.5 text-xs font-bold rounded-lg"
                      >
                        {m}M
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={horizonSimulation.days}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          minTickGap={24}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${Math.round(v)}€`}
                          width={58}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === 'baseBalance' ? 'Sin simulación' : 'Con simulación',
                          ]}
                          labelFormatter={(label) => `Día ${label}`}
                        />
                        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                        <Area
                          type="monotone"
                          dataKey="baseBalance"
                          stroke="#64748b"
                          fill="#64748b"
                          fillOpacity={0.08}
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                        <Area
                          type="monotone"
                          dataKey="simulatedBalance"
                          stroke="#2563eb"
                          fill="#2563eb"
                          fillOpacity={0.16}
                          strokeWidth={2.5}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
