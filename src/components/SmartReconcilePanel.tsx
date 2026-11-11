import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CheckCircle2,
  Clock,
  History,
  PlusCircle,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction } from '@/types/finance'
import { formatCurrency } from '@/lib/calculations'
import {
  findReconcileSuggestions,
  HistoryTemplateSuggestion,
} from '@/lib/smartReconcile'
import { cn } from '@/lib/utils'

interface SmartReconcilePanelProps {
  transactions: Transaction[]
  accountId: string
  realBalanceEntered: boolean
  difference: number
  hasDifference: boolean
  stagedPending: Transaction[]
  onStagePending: (txs: Transaction[]) => void
  onUnstagePending: (txId: string) => void
  onAddTemplateAdjustment: (tpl: HistoryTemplateSuggestion) => void
  onPrefillRemainingAmount: (amount: number) => void
}

/**
 * Experimental smart reconciliation assistant for ComparisonPage ("Cuadrar").
 * Suggests pending transactions or historical templates matching the remaining gap.
 */
export function SmartReconcilePanel({
  transactions,
  accountId,
  realBalanceEntered,
  difference,
  hasDifference,
  stagedPending,
  onStagePending,
  onUnstagePending,
  onAddTemplateAdjustment,
  onPrefillRemainingAmount,
}: SmartReconcilePanelProps) {
  const stagedIds = useMemo(
    () => new Set(stagedPending.map((t) => t.id)),
    [stagedPending]
  )

  const suggestions = useMemo(() => {
    if (!realBalanceEntered || !hasDifference) {
      return { exactMatches: [], partialPending: [], historyTemplates: [] }
    }
    return findReconcileSuggestions({
      transactions,
      accountId,
      difference,
      stagedPendingIds: stagedIds,
    })
  }, [transactions, accountId, realBalanceEntered, hasDifference, difference, stagedIds])

  const formatShortDate = (isoDate: string) => {
    try {
      return format(parseISO(isoDate), 'd MMM', { locale: es })
    } catch {
      return isoDate
    }
  }

  const hasAnythingToShow =
    stagedPending.length > 0 ||
    (realBalanceEntered && hasDifference)

  if (!hasAnythingToShow) return null

  return (
    <Card className="border-primary/25 bg-primary/[0.03] shadow-sm tabular-nums">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Conciliación Inteligente</span>
            <Badge variant="outline" className="text-[10px] font-bold">
              Laboratorio
            </Badge>
          </CardTitle>

          {realBalanceEntered && hasDifference && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPrefillRemainingAmount(Math.abs(difference))}
              className="h-8 text-xs font-bold gap-1.5 rounded-lg"
            >
              <Wand2 className="w-3.5 h-3.5 text-primary" />
              Rellenar {formatCurrency(Math.abs(difference))}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-xs">
        {/* Staged pending transactions waiting for save */}
        {stagedPending.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Pendientes que se confirmarán al guardar ({stagedPending.length})
            </p>
            <div className="space-y-1.5">
              {stagedPending.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {tx.description?.trim() || tx.category}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tx.category} · {formatShortDate(tx.date)} · Pasará a confirmado
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        'font-black',
                        tx.type === 'income' ? 'text-income' : 'text-expense'
                      )}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onUnstagePending(tx.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label="Quitar confirmación"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exact matches */}
        {suggestions.exactMatches.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {suggestions.exactMatches[0].kind === 'exact-single'
                ? 'Coincidencia exacta con movimiento pendiente'
                : 'Combinación de pendientes que cuadra el saldo'}
            </p>
            <div className="space-y-2">
              {suggestions.exactMatches.map((group) => (
                <div
                  key={group.id}
                  className="p-3 rounded-xl bg-background border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div className="space-y-1 min-w-0">
                    {group.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-2 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-foreground truncate">
                          {tx.description?.trim() || tx.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ({formatShortDate(tx.date)})
                        </span>
                        <span
                          className={cn(
                            'font-bold shrink-0 ml-auto sm:ml-0',
                            tx.type === 'income' ? 'text-income' : 'text-expense'
                          )}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onStagePending(group.transactions)}
                    className="h-8 text-xs font-bold shrink-0 gap-1.5 rounded-lg"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {group.transactions.length > 1
                      ? `Confirmar ${group.transactions.length} al guardar`
                      : 'Confirmar al guardar'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Partial pending candidates */}
        {suggestions.partialPending.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Otros pendientes que reducen el descuadre
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.partialPending.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onStagePending([tx])}
                  className="p-2.5 rounded-xl bg-background/85 border border-border/60 hover:border-primary/50 text-left flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {tx.description?.trim() || tx.category}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tx.category} · {formatShortDate(tx.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        'font-black block',
                        tx.type === 'income' ? 'text-income' : 'text-expense'
                      )}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="text-[9px] font-bold text-primary">Confirmar</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Historical matching templates */}
        {suggestions.historyTemplates.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-primary" />
              Movimientos recientes de {formatCurrency(Math.abs(difference))}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {suggestions.historyTemplates.map((tpl) => (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => onAddTemplateAdjustment(tpl)}
                  className="p-2.5 rounded-xl bg-background/85 border border-border/60 hover:border-primary/50 text-left flex items-center justify-between gap-2 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate capitalize">
                      {tpl.description || tpl.category}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tpl.category} · {tpl.occurrences}x (últ. {formatShortDate(tpl.lastDate)})
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary shrink-0">
                    <PlusCircle className="w-3.5 h-3.5" />
                    Añadir
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty hint when no pending or template matches */}
        {realBalanceEntered &&
          hasDifference &&
          suggestions.exactMatches.length === 0 &&
          suggestions.partialPending.length === 0 &&
          suggestions.historyTemplates.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              No hay movimientos pendientes ni recientes en {''}
              esta cuenta que coincidan con {formatCurrency(Math.abs(difference))}. Puedes usar{' '}
              <strong>Rellenar</strong> para cargar el importe abajo y elegir su categoría.
            </p>
          )}
      </CardContent>
    </Card>
  )
}
