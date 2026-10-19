import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from '@/hooks/useSearchParams';
import { Budget } from '@/types/finance';
import { formatCurrency, calculateTotalBalance, calculatePendingImpact, isTransfer } from '@/lib/calculations';
import { format, parseISO, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PiggyBank, PlusCircle, Trash2, Search, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sparkles, Pencil, Tag, Eye, EyeOff, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { appToast as toast, swalConfirm } from "@/lib/swal";
import { cn, parseAmount } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMonthFilter } from "@/hooks/useMonthFilter";

import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { usePlanning } from '@/hooks/usePlanning';
import { useRecurringRules } from '@/hooks/useRecurringRules';
import { calculateSavingsProvisions } from '@/lib/savingsCalculations';
import { BudgetAssignmentModal } from '@/components/BudgetAssignmentModal';

const normalizeCatKey = (name: string) => name.trim().toLowerCase();

const BudgetPage = () => {
    const { accounts, isLoading: isAccLoading } = useAccounts();
    const { transactions, isLoading: isTxLoading } = useTransactions();
    const { categories, isLoading: isCatLoading } = useCategories();
    const { budgets, goals, saveBudgets, isBudgetsLoading: isBudLoading } = usePlanning();
    const { rules: recurringRules, isLoading: isRulesLoading } = useRecurringRules();

    const [searchParams] = useSearchParams();
    const [selectedMonth, setSelectedMonth] = useState<string | null>(searchParams.get("month"));
    
    const {
      isCurrentMonth,
      selectedMonthLabel,
      currentMonthKey,
    } = useMonthFilter(transactions, selectedMonth);

    const activeMonth = selectedMonth || currentMonthKey;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryAmount, setNewCategoryAmount] = useState('');
    const [isSavingBudgets, setIsSavingBudgets] = useState(false);
    const [isNextMonthExpanded, setIsNextMonthExpanded] = useState(false);
    
    // Category currently open in the BudgetAssignmentModal
    const [editingCategory, setEditingCategory] = useState<string | null>(null);

    // Local state of assignments for the active month
    const [localAssignments, setLocalAssignments] = useState<Record<string, { amount: number, isAuto: boolean }>>({});
    
    // Search query for categories
    const [searchQuery, setSearchQuery] = useState(searchParams.get('category') || '');

    // Keep URL searchParams synchronized if navigated from CategoryBreakdown
    useEffect(() => {
        const paramMonth = searchParams.get('month');
        const paramCat = searchParams.get('category');
        if (paramMonth) setSelectedMonth(paramMonth);
        if (paramCat !== null) setSearchQuery(paramCat);
    }, [searchParams]);

    // Resolve canonical category name (matching existing keys or catalog case-insensitively)
    const resolveCanonicalCategory = useCallback(
        (rawName: string, existingMap?: Record<string, unknown>): string => {
            const trimmed = rawName.trim();
            const targetKey = normalizeCatKey(trimmed);

            if (existingMap) {
                const matchInMap = Object.keys(existingMap).find(
                    (k) => normalizeCatKey(k) === targetKey
                );
                if (matchInMap) return matchInMap;
            }

            const matchInCatalog = categories.find(
                (c) => normalizeCatKey(c.name) === targetKey
            );
            if (matchInCatalog) return matchInCatalog.name.trim();

            return trimmed;
        },
        [categories]
    );

    // Shared savings timeframe selector (synchronized with Ahorros y Provisiones)
    const [savingsTimeframe, setSavingsTimeframe] = useState(() => {
        return localStorage.getItem('savingsTimeframe') || '13';
    });

    // IDs de gastos previstos del próximo mes ocultos exclusivamente en la tarjeta "Reservado para..."
    // (independiente de t.isIgnored para no alterar lo que se ve en el Inicio del mes siguiente)
    const [excludedNextMonthIds, setExcludedNextMonthIds] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('excludedNextMonthProvisionIds');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        const handleStorageChange = () => {
            const current = localStorage.getItem('savingsTimeframe') || '13';
            setSavingsTimeframe(current);
            try {
                const raw = localStorage.getItem('excludedNextMonthProvisionIds');
                setExcludedNextMonthIds(raw ? JSON.parse(raw) : []);
            } catch {
                // ignore parse errors
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleSavingsTimeframeChange = (val: string) => {
        setSavingsTimeframe(val);
        localStorage.setItem('savingsTimeframe', val);
        window.dispatchEvent(new Event('storage'));
    };

    const handleToggleNextMonthExpense = (txId: string) => {
        setExcludedNextMonthIds((prev) => {
            const exists = prev.includes(txId);
            const next = exists ? prev.filter((id) => id !== txId) : [...prev, txId];
            localStorage.setItem('excludedNextMonthProvisionIds', JSON.stringify(next));
            window.dispatchEvent(new Event('storage'));
            return next;
        });
    };

    const savingsCalculation = useMemo(() => {
        return calculateSavingsProvisions(
            accounts,
            transactions,
            goals || [],
            recurringRules || [],
            savingsTimeframe
        );
    }, [accounts, transactions, goals, recurringRules, savingsTimeframe]);

    const savingsProvisionsAmount = useMemo(() => {
        if (!isCurrentMonth || savingsTimeframe === 'none') return 0;
        return savingsCalculation.totalSuggestedMonthly;
    }, [isCurrentMonth, savingsTimeframe, savingsCalculation.totalSuggestedMonthly]);

    // Sincronizar asignaciones locales con los presupuestos guardados en la BD para el mes activo
    useEffect(() => {
        const assignments: Record<string, { amount: number, isAuto: boolean }> = {};
        
        const monthBudgets = budgets.filter(
            b => b.month === activeMonth && !isTransfer(b.category) && b.amount > 0
        );
        monthBudgets.forEach(b => {
            const canonicalKey = resolveCanonicalCategory(b.category, assignments);
            const existing = assignments[canonicalKey];
            if (!existing || (existing.isAuto && !b.isAuto)) {
                assignments[canonicalKey] = {
                    amount: Number(b.amount.toFixed(2)),
                    isAuto: false,
                };
            }
        });

        setLocalAssignments(assignments);
    }, [budgets, activeMonth, resolveCanonicalCategory]);

    // ¿El mes activo tiene ya presupuestos creados?
    const hasBudgetsForMonth = useMemo(() => {
        return Object.values(localAssignments).some(v => v.amount > 0);
    }, [localAssignments]);

    // Guardar asignaciones directamente en Supabase (con deduplicación e ID determinista)
    const saveAssignmentsToDb = async (assignments: Record<string, { amount: number, isAuto: boolean }>) => {
        setIsSavingBudgets(true);
        try {
            const dedupMap = new Map<string, Budget>();
            Object.entries(assignments).forEach(([category, { amount }]) => {
                const cleanAmount = Number(amount.toFixed(2));
                if (cleanAmount > 0 && !isTransfer(category)) {
                    const canonicalCat = resolveCanonicalCategory(category);
                    const normKey = normalizeCatKey(canonicalCat);
                    if (!dedupMap.has(normKey)) {
                        dedupMap.set(normKey, {
                            id: `b_${activeMonth}_${normKey.replace(/\s+/g, '_')}`,
                            category: canonicalCat,
                            amount: cleanAmount,
                            month: activeMonth,
                            isAuto: false,
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            });
            await saveBudgets({ month: activeMonth, budgets: Array.from(dedupMap.values()) });
        } finally {
            setIsSavingBudgets(false);
        }
    };

    // Callback when saving a category budget from the Bottom Sheet
    const handleSaveCategoryBudget = async (categoryName: string, amount: number) => {
        const canonicalName = resolveCanonicalCategory(categoryName, localAssignments);
        const next = { ...localAssignments };
        if (amount <= 0) {
            delete next[canonicalName];
        } else {
            next[canonicalName] = { amount: Number(amount.toFixed(2)), isAuto: false };
        }
        setLocalAssignments(next);
        await saveAssignmentsToDb(next);
        toast.success(amount <= 0 ? `Sobre ${canonicalName} eliminado` : `Presupuesto de ${canonicalName} guardado`);
    };

    // Callback when removing a category budget from the Bottom Sheet
    const handleRemoveCategoryBudget = async (categoryName: string) => {
        const canonicalName = resolveCanonicalCategory(categoryName, localAssignments);
        const next = { ...localAssignments };
        delete next[canonicalName];
        setLocalAssignments(next);
        await saveAssignmentsToDb(next);
        toast.success(`Sobre ${canonicalName} eliminado`);
    };

    // Botón único "Presupuestos": solo accesible cuando el mes no tiene presupuestos aún
    const handleGenerateBudgets = async () => {
        if (isSavingBudgets || hasBudgetsForMonth) return;

        const current = parseISO(activeMonth + "-01");
        const prevMonthDate = subMonths(current, 1);
        const prevMonthStr = format(prevMonthDate, "yyyy-MM");
        const isPrevMonthPast = prevMonthStr < currentMonthKey;

        const next: Record<string, { amount: number, isAuto: boolean }> = {};

        // 1. Mirar los gastos reales del mes pasado por categorías y crear presupuesto redondeando al euro superior
        const prevSpentByCat: Record<string, number> = {};
        transactions.forEach(t => {
            if (t.type !== 'expense' || isTransfer(t.category) || t.isIgnored) return;
            if (!t.date.startsWith(prevMonthStr)) return;
            if (isPrevMonthPast && t.isPending) return;

            const canonicalCat = resolveCanonicalCategory(t.category, next);
            prevSpentByCat[canonicalCat] = (prevSpentByCat[canonicalCat] || 0) + t.amount;
        });

        Object.entries(prevSpentByCat).forEach(([canonicalCat, totalSpent]) => {
            const roundedUpAmount = Math.ceil(Number(totalSpent.toFixed(2)));
            if (roundedUpAmount > 0) {
                next[canonicalCat] = { amount: roundedUpAmount, isAuto: false };
            }
        });

        // 2. Comprobar gastos del mes actual: si hay gastos pendientes de la misma categoría (o nuevas con gasto este mes),
        // sustituir por el total previsto/comprometido del mes actual (gastado real + pendiente)
        const curRealByCat: Record<string, number> = {};
        const curPendingByCat: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.type !== 'expense' || isTransfer(t.category) || t.isIgnored) return;
            if (!t.date.startsWith(activeMonth)) return;

            const canonicalCat = resolveCanonicalCategory(t.category, next);
            if (t.isPending) {
                curPendingByCat[canonicalCat] = (curPendingByCat[canonicalCat] || 0) + t.amount;
            } else {
                curRealByCat[canonicalCat] = (curRealByCat[canonicalCat] || 0) + t.amount;
            }
        });

        const currentMonthCats = new Set([
            ...Object.keys(curRealByCat),
            ...Object.keys(curPendingByCat)
        ]);

        currentMonthCats.forEach(canonicalCat => {
            const realAmt = curRealByCat[canonicalCat] || 0;
            const pendingAmt = curPendingByCat[canonicalCat] || 0;
            const totalCurrentMonth = Number((realAmt + pendingAmt).toFixed(2));
            if (totalCurrentMonth <= 0) return;

            if (pendingAmt > 0) {
                // Tiene gastos pendientes este mes: sustituir por el total previsto de este mes
                next[canonicalCat] = { amount: totalCurrentMonth, isAuto: false };
            } else if (!next[canonicalCat] || totalCurrentMonth > next[canonicalCat].amount) {
                // Categoría sin sobre del mes pasado o cuyo gasto real este mes ya supera al del mes pasado
                next[canonicalCat] = { amount: totalCurrentMonth, isAuto: false };
            }
        });

        const createdCount = Object.keys(next).length;
        if (createdCount > 0) {
            setLocalAssignments(next);
            await saveAssignmentsToDb(next);
            toast.success(`${createdCount} ${createdCount === 1 ? 'sobre presupuestado' : 'sobres presupuestados'} automáticamente`);
        } else {
            toast.info("No hay gastos en el mes anterior ni previstos este mes. Añade tu primer sobre manualmente.");
            setIsAddModalOpen(true);
        }
    };

    const handleClearAll = async () => {
        if (isSavingBudgets) return;
        const confirmed = await swalConfirm(
            '¿Limpiar presupuestos?',
            '¿Estás seguro de que quieres limpiar todos los presupuestos de este mes?',
            'Sí, limpiar'
        );

        if (confirmed) {
            setLocalAssignments({});
            await saveAssignmentsToDb({});
            toast.success('Todos los presupuestos del mes han sido limpiados');
        }
    };

    const handleConfirmAddCategory = async () => {
        if (!newCategoryName) {
            toast.error("Por favor, selecciona una categoría.");
            return;
        }
        
        const numValue = newCategoryAmount === '' ? 0 : parseAmount(newCategoryAmount);
        if (isNaN(numValue) || numValue <= 0) {
            toast.error("Introduce un importe mayor que 0 €.");
            return;
        }

        const canonicalCat = resolveCanonicalCategory(newCategoryName, localAssignments);
        const next = {
            ...localAssignments,
            [canonicalCat]: { amount: Number(numValue.toFixed(2)), isAuto: false }
        };
        setLocalAssignments(next);
        await saveAssignmentsToDb(next);
        
        setIsAddModalOpen(false);
        setNewCategoryName('');
        setNewCategoryAmount('');
        toast.success(`Sobre ${canonicalCat} añadido`);
    };

    const incomeOnlyCategories = useMemo(() => {
        const incomeCats = new Set<string>();
        const expenseCats = new Set<string>();
        transactions.forEach(t => {
            if (t.type === 'income') incomeCats.add(normalizeCatKey(t.category));
            if (t.type === 'expense') expenseCats.add(normalizeCatKey(t.category));
        });
        if (!expenseCats.has('sueldo')) incomeCats.add('sueldo');
        if (!expenseCats.has('nómina')) incomeCats.add('nómina');
        if (!expenseCats.has('nomina')) incomeCats.add('nomina');
        
        return new Set([...incomeCats].filter(c => !expenseCats.has(c)));
    }, [transactions]);

    const availableCategoriesToAdd = useMemo(() => {
        return categories.filter(c => {
            const norm = normalizeCatKey(c.name);
            const existingKey = Object.keys(localAssignments).find(k => normalizeCatKey(k) === norm);
            const isAvailable = existingKey === undefined || localAssignments[existingKey].amount === 0;
            return isAvailable && !isTransfer(c.name) && !incomeOnlyCategories.has(norm);
        });
    }, [categories, localAssignments, incomeOnlyCategories]);

    const capitalDisponible = useMemo(() => {
        const balanceActual = calculateTotalBalance(accounts, transactions, false, activeMonth);
        let pendingImpact = 0;
        accounts.forEach(acc => {
            if (!acc.excludeFromTotals) {
                pendingImpact += calculatePendingImpact(transactions, activeMonth, acc.id);
            }
        });
        return Number((balanceActual + pendingImpact).toFixed(2));
    }, [accounts, transactions, activeMonth]);

    const ingresosDelMes = useMemo(() => {
        return Number(transactions
            .filter(t => t.type === 'income' && !isTransfer(t.category) && t.date.startsWith(activeMonth) && !t.isIgnored)
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
    }, [transactions, activeMonth]);

    // Mapas precalculados (insensibles a mayúsculas/espacios) de gasto real, pendiente y del mes anterior por categoría
    const { realSpentByCat, pendingSpentByCat, prevMonthSpentByCat, activeMonthExpenseCategories } = useMemo(() => {
        const realMap: Record<string, number> = {};
        const pendingMap: Record<string, number> = {};
        const prevMap: Record<string, number> = {};
        const activeExpenseDisplayNames: Record<string, string> = {};

        const prevMonthStr = format(subMonths(parseISO(activeMonth + "-01"), 1), "yyyy-MM");
        const isPrevMonthPast = prevMonthStr < currentMonthKey;

        transactions.forEach(t => {
            if (t.type !== 'expense' || isTransfer(t.category) || t.isIgnored) {
                return;
            }
            const key = normalizeCatKey(t.category);
            if (t.date.startsWith(activeMonth)) {
                if (!activeExpenseDisplayNames[key]) {
                    activeExpenseDisplayNames[key] = resolveCanonicalCategory(t.category);
                }
                if (t.isPending) {
                    pendingMap[key] = Number(((pendingMap[key] || 0) + t.amount).toFixed(2));
                } else {
                    realMap[key] = Number(((realMap[key] || 0) + t.amount).toFixed(2));
                }
            } else if (t.date.startsWith(prevMonthStr)) {
                if (!isPrevMonthPast || !t.isPending) {
                    prevMap[key] = Number(((prevMap[key] || 0) + t.amount).toFixed(2));
                }
            }
        });

        return {
            realSpentByCat: realMap,
            pendingSpentByCat: pendingMap,
            prevMonthSpentByCat: prevMap,
            activeMonthExpenseCategories: Object.values(activeExpenseDisplayNames),
        };
    }, [transactions, activeMonth, currentMonthKey, resolveCanonicalCategory]);

    const getGastado = useCallback((catName: string) => {
        return realSpentByCat[normalizeCatKey(catName)] || 0;
    }, [realSpentByCat]);

    const getPendiente = useCallback((catName: string) => {
        return pendingSpentByCat[normalizeCatKey(catName)] || 0;
    }, [pendingSpentByCat]);

    // Total comprometido en la categoría este mes (gasto ejecutado + gasto previsto)
    const getTotalGastado = useCallback((catName: string) => {
        const norm = normalizeCatKey(catName);
        return Number(((realSpentByCat[norm] || 0) + (pendingSpentByCat[norm] || 0)).toFixed(2));
    }, [realSpentByCat, pendingSpentByCat]);

    const getGastoMesAnterior = useCallback((catName: string) => {
        return prevMonthSpentByCat[normalizeCatKey(catName)] || 0;
    }, [prevMonthSpentByCat]);

    const getBudgetAmount = useCallback((catName: string) => {
        const direct = localAssignments[catName];
        if (direct) return Number(direct.amount.toFixed(2));
        const norm = normalizeCatKey(catName);
        const matchKey = Object.keys(localAssignments).find(k => normalizeCatKey(k) === norm);
        return matchKey ? Number(localAssignments[matchKey].amount.toFixed(2)) : 0;
    }, [localAssignments]);

    // Si la categoría ya tiene presupuesto (amount > 0), el previsto YA es el presupuesto,
    // por lo que el gasto del sobre es solo el gasto ejecutado (real).
    // Si la categoría NO está presupuestada (amount === 0), cualquier gasto (previsto o ejecutado) genera el sobre sobrepasado.
    const getEffectiveSpent = useCallback((catName: string) => {
        const amount = getBudgetAmount(catName);
        if (amount > 0) {
            return Number(getGastado(catName).toFixed(2));
        }
        return getTotalGastado(catName);
    }, [getBudgetAmount, getGastado, getTotalGastado]);

    const getRestoForSort = (catName: string) => {
        const amount = getBudgetAmount(catName);
        const spent = getEffectiveSpent(catName);
        return Number((amount - spent).toFixed(2));
    };

    const sortBudgets = (a: string, b: string) => {
        const restoA = getRestoForSort(a);
        const restoB = getRestoForSort(b);

        const groupA = restoA < 0 ? 0 : restoA > 0 ? 1 : 2;
        const groupB = restoB < 0 ? 0 : restoB > 0 ? 1 : 2;

        if (groupA !== groupB) {
            return groupA - groupB;
        }

        if (groupA === 0) {
            return restoA - restoB; 
        }
        
        if (groupA === 1) {
            return restoB - restoA;
        }

        return a.localeCompare(b);
    };

    const getSortPercentage = (cat: string) => {
        const amount = getBudgetAmount(cat);
        const spent = getEffectiveSpent(cat);
        const resto = Number((amount - spent).toFixed(2));
        
        if (amount === 0 && spent === 0) return 0;
        if (resto < 0) return 200; // Excedido (incluye categorías no presupuestadas con gasto previsto o ejecutado)
        if (resto === 0 && amount > 0) return 100; // Cumplido al 100%
        
        return amount > 0 ? (spent / amount) * 100 : 0;
    };

    // Si el mes ya tiene presupuestos, cualquier gasto previsto o ejecutado de una categoría no presupuestada
    // aparece automáticamente como sobre con gasto sobrepasado (amount = 0, resto < 0)
    const allDisplayedCategories = useMemo(() => {
        if (!hasBudgetsForMonth) return [];

        const map = new Map<string, string>();
        Object.keys(localAssignments).forEach(cat => {
            if (localAssignments[cat].amount > 0) {
                map.set(normalizeCatKey(cat), cat);
            }
        });

        activeMonthExpenseCategories.forEach(cat => {
            const norm = normalizeCatKey(cat);
            if (!map.has(norm) && getTotalGastado(cat) > 0) {
                map.set(norm, cat);
            }
        });

        return Array.from(map.values());
    }, [hasBudgetsForMonth, localAssignments, activeMonthExpenseCategories, getTotalGastado]);

    const saludables = allDisplayedCategories.filter(cat => getSortPercentage(cat) < 80).sort(sortBudgets);
    const vacios = allDisplayedCategories.filter(cat => getSortPercentage(cat) === 100).sort(sortBudgets);
    const enPeligro = allDisplayedCategories.filter(cat => {
        const perc = getSortPercentage(cat);
        return perc >= 80 && perc !== 100;
    }).sort(sortBudgets);

    const nextMonthStr = useMemo(() => format(addMonths(parseISO(activeMonth + "-01"), 1), "yyyy-MM"), [activeMonth]);

    // Todos los gastos previstos del mes siguiente (independiente de t.isIgnored en Inicio)
    const nextMonthPlannedExpenses = useMemo(() => {
        return transactions
            .filter(t => 
                t.type === 'expense' && 
                t.date.startsWith(nextMonthStr) &&
                !isTransfer(t.category) &&
                t.amount > 0
            )
            .sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
    }, [transactions, nextMonthStr]);

    const nextMonthBudgetsTotal = useMemo(() => {
        const excludedSet = new Set(excludedNextMonthIds);
        const sum = nextMonthPlannedExpenses
            .filter(t => !excludedSet.has(t.id))
            .reduce((acc, t) => acc + t.amount, 0);
        return Number(sum.toFixed(2));
    }, [nextMonthPlannedExpenses, excludedNextMonthIds]);

    const handleToggleAllNextMonthExpenses = () => {
        const allIds = nextMonthPlannedExpenses.map(t => t.id);
        const allVisible = allIds.every(id => !excludedNextMonthIds.includes(id));
        const next = allVisible
            ? Array.from(new Set([...excludedNextMonthIds, ...allIds]))
            : excludedNextMonthIds.filter(id => !allIds.includes(id));
        setExcludedNextMonthIds(next);
        localStorage.setItem('excludedNextMonthProvisionIds', JSON.stringify(next));
        window.dispatchEvent(new Event('storage'));
    };

    const sumTotalBudgets = Number(
        Object.values(localAssignments).reduce((sum, item) => sum + item.amount, 0).toFixed(2)
    );
    
    const disponibleParaAsignar = useMemo(() => {
        // Caso 1: Consultando un mes pasado (histórico cerrado)
        if (activeMonth < currentMonthKey) {
            const pastExpenses = Number(transactions
                .filter(t => t.type === 'expense' && !isTransfer(t.category) && t.date.startsWith(activeMonth) && !t.isIgnored)
                .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
            return Number((capitalDisponible + pastExpenses - sumTotalBudgets).toFixed(2));
        }

        // Caso 2: Mes actual o meses futuros proyectados
        const realBalance = calculateTotalBalance(accounts, transactions, false, currentMonthKey);
        let currentMonthPendingImpact = 0;
        accounts.forEach(acc => {
            if (!acc.excludeFromTotals) {
                currentMonthPendingImpact += calculatePendingImpact(transactions, currentMonthKey, acc.id);
            }
        });
        const baseCapital = realBalance + currentMonthPendingImpact;
        const baseGastos = Number(transactions
            .filter(t => t.type === 'expense' && !isTransfer(t.category) && t.date.startsWith(currentMonthKey) && !t.isIgnored)
            .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
        const baseBudgets = currentMonthKey === activeMonth
            ? sumTotalBudgets
            : Number(budgets
                .filter(b => b.month === currentMonthKey && !isTransfer(b.category))
                .reduce((sum, b) => sum + b.amount, 0).toFixed(2));
        
        let noAsignada = baseCapital + baseGastos - baseBudgets;

        let m = addMonths(parseISO(currentMonthKey + "-01"), 1);
        const end = parseISO(activeMonth + "-01");

        while (m <= end) {
            const mStr = format(m, 'yyyy-MM');
            const monthIngresos = Number(transactions
                .filter(t => t.type === 'income' && !isTransfer(t.category) && t.date.startsWith(mStr) && !t.isIgnored)
                .reduce((sum, t) => sum + t.amount, 0).toFixed(2));
            
            let monthBudgets = 0;
            if (mStr === activeMonth) {
                monthBudgets = sumTotalBudgets;
            } else {
                monthBudgets = Number(budgets
                    .filter(b => b.month === mStr && !isTransfer(b.category))
                    .reduce((sum, b) => sum + b.amount, 0).toFixed(2));
            }

            noAsignada = noAsignada + monthIngresos - monthBudgets;
            m = addMonths(m, 1);
        }

        noAsignada -= nextMonthBudgetsTotal;
        noAsignada -= savingsProvisionsAmount;

        return Number(noAsignada.toFixed(2));
    }, [activeMonth, currentMonthKey, capitalDisponible, sumTotalBudgets, accounts, transactions, budgets, nextMonthBudgetsTotal, savingsProvisionsAmount]);

    const filteredEnPeligro = enPeligro.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredSaludables = saludables.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredVacios = vacios.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));

    const handlePrevMonth = () => {
        const current = parseISO(activeMonth + "-01");
        const prevMonth = subMonths(current, 1);
        setSelectedMonth(format(prevMonth, "yyyy-MM"));
    };

    const handleNextMonth = () => {
        const current = parseISO(activeMonth + "-01");
        const nextMonth = addMonths(current, 1);
        setSelectedMonth(format(nextMonth, "yyyy-MM"));
    };

    const handleBackToCurrentMonth = () => {
        setSelectedMonth(null);
    };

    if (isAccLoading || isTxLoading || isCatLoading || isBudLoading || isRulesLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Cargando datos...</div>;
    }

    const renderCategoryBadgeIcon = (catName: string) => {
        const catObj = categories.find(c => normalizeCatKey(c.name) === normalizeCatKey(catName));
        if (catObj?.customIcon) {
            return (
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-border/30 shrink-0 bg-muted">
                    <img src={catObj.customIcon} alt={catName} className="w-full h-full object-cover" />
                </div>
            );
        }
        const IconComp = (catObj?.icon && (Icons as any)[catObj.icon]) || Tag;
        return (
            <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: catObj?.color || '#64748b' }}
            >
                <IconComp className="w-4 h-4" />
            </div>
        );
    };

    const renderRow = (cat: string, type: 'peligro' | 'saludable' | 'vacio') => {
        const amount = getBudgetAmount(cat);
        const gastado = getEffectiveSpent(cat);
        const resto = Number((amount - gastado).toFixed(2));
        const percentage = amount > 0
            ? (gastado / amount) * 100
            : gastado > 0 ? 100 : 0;
        
        let colorClass = "bg-muted-foreground";
        if (type === 'peligro') colorClass = "bg-destructive";
        else if (type === 'saludable') colorClass = "bg-income";
        else if (type === 'vacio') colorClass = "bg-muted-foreground/60";

        const canCoverOrClose = gastado > 0 && resto !== 0;
        const canRemoveDirectly = amount > 0 && gastado === 0;

        return (
            <div 
                key={cat} 
                id={`row-${cat}`} 
                onClick={() => setEditingCategory(cat)}
                className={cn(
                    "bg-card rounded-2xl sm:rounded-3xl border border-border/50 shadow-sm p-4 transition-all duration-200 select-none group",
                    "cursor-pointer hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                )}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {renderCategoryBadgeIcon(cat)}
                        <h3 className="font-bold text-base capitalize truncate text-foreground/90 group-hover:text-primary transition-colors">
                            {cat}
                        </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                            "font-black text-lg mr-1",
                            resto < 0 ? "text-destructive" :
                            resto > 0 ? "text-income" : "text-foreground"
                        )}>
                            {formatCurrency(resto)}
                        </span>

                        {/* Acción rápida 1: Igualar presupuesto al gasto exacto (cubrir exceso o cerrar céntimos/sobrante) */}
                        {canCoverOrClose && (
                            <button
                                type="button"
                                disabled={isSavingBudgets}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveCategoryBudget(cat, gastado);
                                }}
                                title={
                                    resto < 0
                                        ? `Cubrir gasto exacto (${formatCurrency(gastado)})`
                                        : `Ajustar al gasto ya pagado (${formatCurrency(gastado)}) y liberar ${formatCurrency(resto)}`
                                }
                                className={cn(
                                    "h-7 px-2 rounded-xl flex items-center gap-1 text-[11px] font-bold transition-all border",
                                    resto < 0
                                        ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-white"
                                        : "bg-income/10 text-income border-income/20 hover:bg-income hover:text-white"
                                )}
                            >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span className="hidden sm:inline">{resto < 0 ? 'Cubrir' : 'Ajustar'}</span>
                            </button>
                        )}

                        {/* Acción rápida 2: Eliminar sobre directamente si no hay gasto este mes */}
                        {canRemoveDirectly && (
                            <button
                                type="button"
                                disabled={isSavingBudgets}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCategoryBudget(cat);
                                }}
                                title={`Eliminar sobre de ${cat}`}
                                className="w-7 h-7 rounded-xl bg-destructive/10 text-destructive/80 hover:bg-destructive hover:text-white border border-destructive/20 flex items-center justify-center transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}

                        <div
                            title="Editar importe manualmente"
                            className="w-7 h-7 rounded-xl bg-muted/40 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center text-muted-foreground transition-colors"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>

                {/* Thin Progress Bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-2.5">
                    <div 
                        className={cn("h-full rounded-full transition-all duration-500", colorClass)} 
                        style={{ width: `${Math.min(percentage, 100)}%` }} 
                    />
                </div>

                {/* Sub-metrics */}
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium flex-wrap gap-2">
                    <span>Presupuesto: <span className="text-foreground font-bold">{formatCurrency(amount)}</span></span>
                    <span>Gastado: <span className="text-foreground font-bold">{formatCurrency(gastado)}</span></span>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="w-full max-w-5xl mx-auto px-4 lg:px-8 pt-4 sm:pt-8 pb-32">
                
                {/* MONTH SELECTOR BAR */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-card rounded-2xl shadow-sm border border-border/50 mb-6 overflow-hidden">
                    <div className="flex items-center gap-2 mx-auto">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={handlePrevMonth}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <div className="flex flex-col items-center min-w-[120px] px-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                                Periodo
                            </span>
                            <span className="text-base font-extrabold text-primary capitalize leading-tight">
                                {selectedMonthLabel}
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                            onClick={handleNextMonth}
                        >
                            <ChevronRight className="w-4 h-4 text-primary" />
                        </Button>
                        {!isCurrentMonth && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToCurrentMonth}
                                className="text-xs h-8"
                            >
                                Hoy
                            </Button>
                        )}
                    </div>
                </div>

                {/* TITLE & GLOBAL ACTIONS */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <h1 className="text-3xl font-black text-foreground flex items-center gap-2 mt-2 sm:mt-0">
                        <PiggyBank className="w-8 h-8 text-primary" />
                        Presupuestos
                    </h1>

                    <div className="flex flex-row w-full sm:w-auto items-center justify-end gap-2 mt-2 sm:mt-0 z-10">
                        {!hasBudgetsForMonth ? (
                            <Button 
                                onClick={handleGenerateBudgets}
                                disabled={isSavingBudgets}
                                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-black shadow-md shadow-primary/20 transition-all text-xs sm:text-sm h-10 px-5 rounded-2xl"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Presupuestos
                            </Button>
                        ) : (
                            <>
                                <Button 
                                    onClick={() => setIsAddModalOpen(true)}
                                    disabled={isSavingBudgets}
                                    variant="outline"
                                    className="flex-1 sm:flex-initial font-bold border-2 text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 rounded-xl"
                                >
                                    <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                                    Añadir
                                </Button>
                                <Button 
                                    onClick={handleClearAll}
                                    disabled={isSavingBudgets}
                                    variant="destructive"
                                    className="flex-1 sm:flex-initial bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-bold shadow-sm transition-all text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 rounded-xl"
                                >
                                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
                                    Limpiar
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* DISPONIBLE PARA ASIGNAR & SEARCH CARD (NON-STICKY, NATURAL SCROLL) */}
                <div className="bg-card/50 backdrop-blur-sm rounded-3xl border border-border/50 p-5 sm:p-6 mb-8 shadow-sm">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                            Disponible para Asignar
                        </div>
                        <div className={cn(
                            "font-black text-4xl sm:text-5xl transition-colors tracking-tight",
                            disponibleParaAsignar > 0 ? "text-primary" : 
                            disponibleParaAsignar < 0 ? "text-destructive" : 
                            "text-foreground"
                        )}>
                            {formatCurrency(disponibleParaAsignar)}
                        </div>
                        
                        {/* Indicadores secundarios pequeños */}
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 text-[10px] sm:text-xs font-bold text-muted-foreground/80 uppercase tracking-wider bg-muted/30 px-4 py-2 rounded-full border border-border/40">
                            <span>Ingresos: <span className="text-income/90">{formatCurrency(ingresosDelMes)}</span></span>
                            <span className="opacity-40">•</span>
                            <span>Saldo Previsto: <span className="text-foreground/80">{formatCurrency(capitalDisponible)}</span></span>
                            {isCurrentMonth && savingsProvisionsAmount > 0 && (
                                <>
                                    <span className="opacity-40">•</span>
                                    <span>Prov. Ahorros: <span className="text-amber-500 font-bold">{formatCurrency(savingsProvisionsAmount)}</span></span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="mt-6 max-w-md mx-auto">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar sobre..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-11 h-12 bg-background/80 border-border/50 font-medium text-base rounded-2xl shadow-inner focus-visible:ring-primary/20 transition-all"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                    title="Borrar búsqueda"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* LISTS BLOCK */}
                <div className="pb-10">
                    {/* Provisión Próximo Mes */}
                    {isCurrentMonth && nextMonthPlannedExpenses.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-3 px-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <h2 className="text-lg font-bold text-foreground">Provisión Próximo Mes</h2>
                                </div>
                                {isNextMonthExpanded && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleToggleAllNextMonthExpenses}
                                        className="h-7 px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-xl gap-1.5"
                                    >
                                        {nextMonthPlannedExpenses.every(t => !excludedNextMonthIds.includes(t.id)) ? (
                                            <>
                                                <EyeOff className="w-3.5 h-3.5" />
                                                Ocultar todos
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="w-3.5 h-3.5" />
                                                Mostrar todos
                                            </>
                                        )}
                                    </Button>
                                )}
                            </div>
                            <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-blue-500/20 shadow-sm overflow-hidden transition-all">
                                <div
                                    onClick={() => setIsNextMonthExpanded(prev => !prev)}
                                    className="p-5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-blue-500/5 transition-colors"
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="font-bold text-base text-foreground/90 capitalize">
                                            Reservado para {format(parseISO(nextMonthStr + "-01"), "MMMM", { locale: es })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {isNextMonthExpanded
                                                ? "Pulsa en un gasto previsto para incluirlo u ocultarlo (no influye en el Inicio del mes siguiente)"
                                                : `${nextMonthPlannedExpenses.filter(t => !excludedNextMonthIds.includes(t.id)).length} de ${nextMonthPlannedExpenses.length} gastos previstos incluidos • Pulsa para desplegar`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 shrink-0">
                                        <span className={cn(
                                            "font-black text-xl",
                                            nextMonthBudgetsTotal > 0 ? "text-blue-500" : "text-muted-foreground"
                                        )}>
                                            {formatCurrency(nextMonthBudgetsTotal)}
                                        </span>
                                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                            {isNextMonthExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Lista interactiva desplegable de gastos previstos del próximo mes */}
                                {isNextMonthExpanded && (
                                    <div className="px-5 pb-5 pt-3 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {nextMonthPlannedExpenses.map((tx) => {
                                            const isExcluded = excludedNextMonthIds.includes(tx.id);
                                            const label = tx.description?.trim() || tx.category;
                                            const dayFormatted = format(parseISO(tx.date), "d MMM", { locale: es });

                                            return (
                                                <div
                                                    key={tx.id}
                                                    onClick={() => handleToggleNextMonthExpense(tx.id)}
                                                    className={cn(
                                                        "flex items-center justify-between gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer select-none",
                                                        isExcluded
                                                            ? "bg-muted/20 border-border/30 opacity-50 hover:opacity-75"
                                                            : "bg-blue-500/5 dark:bg-blue-950/20 border-blue-500/20 hover:border-blue-500/40 shadow-2xs"
                                                    )}
                                                    title={isExcluded ? "Oculto en la reserva (pulsa para incluir)" : "Incluido en la reserva (pulsa para ocultar)"}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {renderCategoryBadgeIcon(tx.category)}
                                                        <div className="min-w-0">
                                                            <p className={cn(
                                                                "text-xs sm:text-sm font-bold truncate capitalize",
                                                                isExcluded ? "line-through text-muted-foreground" : "text-foreground"
                                                            )}>
                                                                {label}
                                                            </p>
                                                            <p className="text-[10px] font-semibold text-muted-foreground capitalize truncate">
                                                                {dayFormatted} • {tx.category}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={cn(
                                                            "text-xs sm:text-sm font-black",
                                                            isExcluded ? "line-through text-muted-foreground" : "text-blue-600 dark:text-blue-400"
                                                        )}>
                                                            {formatCurrency(tx.amount)}
                                                        </span>
                                                        <div className={cn(
                                                            "w-7 h-7 rounded-xl flex items-center justify-center transition-colors",
                                                            isExcluded
                                                                ? "bg-muted text-muted-foreground"
                                                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                                        )}>
                                                            {isExcluded ? (
                                                                <EyeOff className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <Eye className="w-3.5 h-3.5" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Provisión Ahorros y Provisiones */}
                    {isCurrentMonth && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-3 px-2">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                    <h2 className="text-lg font-bold text-foreground">Provisión Ahorros y Provisiones</h2>
                                </div>
                                <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-xl border border-border/50">
                                    <Select value={savingsTimeframe} onValueChange={handleSavingsTimeframeChange}>
                                        <SelectTrigger className="h-7 border-none bg-transparent font-bold text-xs focus:ring-0 gap-1.5 px-1 text-foreground/90">
                                            <SelectValue placeholder="Horizonte" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin provisión (0 €)</SelectItem>
                                            <SelectItem value="3">Próximos 3 meses</SelectItem>
                                            <SelectItem value="6">Próximos 6 meses</SelectItem>
                                            <SelectItem value="12">Próximos 12 meses</SelectItem>
                                            <SelectItem value="13">Próximos 13 meses</SelectItem>
                                            <SelectItem value="15">Próximos 15 meses</SelectItem>
                                            <SelectItem value="24">Próximos 24 meses</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-amber-500/20 shadow-sm overflow-hidden p-5 flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold text-base text-foreground/90">
                                        Cuota mensual para metas y previsiones
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {savingsTimeframe === 'none' 
                                            ? "Provisión desactivada (no se descuenta dinero para ahorros)"
                                            : `Calculada según el horizonte de ${savingsTimeframe} meses`}
                                    </span>
                                </div>
                                <span className={cn("font-black text-xl", savingsProvisionsAmount > 0 ? "text-amber-500" : "text-muted-foreground")}>
                                    {formatCurrency(savingsProvisionsAmount)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Sobres en Peligro */}
                    {filteredEnPeligro.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                <h2 className="text-lg font-bold text-foreground">Sobres en Peligro</h2>
                                <span className="bg-muted/50 text-muted-foreground text-xs py-0.5 px-2 rounded-full font-bold ml-auto border border-border/50">
                                    {filteredEnPeligro.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {filteredEnPeligro.map(cat => renderRow(cat, 'peligro'))}
                            </div>
                        </div>
                    )}

                    {/* Sobres Saludables */}
                    {filteredSaludables.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-income shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                <h2 className="text-lg font-bold text-foreground">Sobres Saludables</h2>
                                <span className="bg-muted/50 text-muted-foreground text-xs py-0.5 px-2 rounded-full font-bold ml-auto border border-border/50">
                                    {filteredSaludables.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {filteredSaludables.map(cat => renderRow(cat, 'saludable'))}
                            </div>
                        </div>
                    )}

                    {/* Sobres Vacíos (Cumplidos) */}
                    {filteredVacios.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <span className="w-3 h-3 rounded-full bg-muted-foreground/60 shadow-sm" />
                                <h2 className="text-lg font-bold text-foreground">Sobres Cumplidos</h2>
                                <span className="bg-muted/50 text-muted-foreground text-xs py-0.5 px-2 rounded-full font-bold ml-auto border border-border/50">
                                    {filteredVacios.length}
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {filteredVacios.map(cat => renderRow(cat, 'vacio'))}
                            </div>
                        </div>
                    )}

                    {filteredEnPeligro.length === 0 && filteredSaludables.length === 0 && filteredVacios.length === 0 && (
                        <div className="bg-card/50 rounded-3xl border border-dashed border-border/60 p-10 sm:p-12 text-center flex flex-col items-center justify-center mt-8">
                            <PiggyBank className="w-16 h-16 text-muted-foreground/20 mb-3" />
                            <p className="text-muted-foreground text-sm uppercase tracking-wider font-bold mb-4">
                                {searchQuery ? "No se encontraron sobres" : "No hay presupuestos para este mes"}
                            </p>
                            {!searchQuery && !hasBudgetsForMonth && (
                                <div className="flex flex-wrap items-center justify-center gap-2.5">
                                    <Button
                                        onClick={handleGenerateBudgets}
                                        disabled={isSavingBudgets}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl h-11 px-6 text-xs sm:text-sm shadow-md shadow-primary/20"
                                    >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Presupuestos
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* MODAL PARA AÑADIR NUEVA CATEGORÍA A LA PLANIFICACIÓN */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black">Añadir Presupuesto</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Categoría</label>
                                <Select value={newCategoryName} onValueChange={setNewCategoryName}>
                                    <SelectTrigger className="w-full font-bold">
                                        <SelectValue placeholder="Selecciona una categoría..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCategoriesToAdd.map(c => (
                                            <SelectItem key={c.id} value={c.name}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-muted-foreground">Importe del Presupuesto (€)</label>
                                <div className="relative w-full flex items-center justify-end">
                                    <Input 
                                        type="text"
                                        inputMode="decimal"
                                        value={newCategoryAmount}
                                        onChange={(e) => setNewCategoryAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="h-12 text-right font-bold text-lg focus-visible:ring-1 pr-8"
                                        enterKeyHint="done"
                                    />
                                    <span className="absolute right-3 text-muted-foreground font-bold select-none pointer-events-none">€</span>
                                </div>
                            </div>
                            <Button 
                                onClick={handleConfirmAddCategory} 
                                disabled={isSavingBudgets}
                                className="w-full font-black mt-2 h-12"
                            >
                                Añadir a la lista
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* MODAL / BOTTOM SHEET DE ASIGNACIÓN RÁPIDA (PARA CUALQUIER SOBRE) */}
                {editingCategory && (
                    <BudgetAssignmentModal
                        isOpen={!!editingCategory}
                        onClose={() => setEditingCategory(null)}
                        categoryName={editingCategory}
                        currentAmount={getBudgetAmount(editingCategory)}
                        spent={getEffectiveSpent(editingCategory)}
                        prevMonthSpent={getGastoMesAnterior(editingCategory)}
                        disponibleParaAsignar={disponibleParaAsignar}
                        monthLabel={selectedMonthLabel}
                        onSave={handleSaveCategoryBudget}
                        onRemove={getBudgetAmount(editingCategory) > 0 ? handleRemoveCategoryBudget : undefined}
                    />
                )}

            </div>
        </div>
    );
};

export default BudgetPage;
