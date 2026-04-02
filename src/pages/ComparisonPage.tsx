import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, AlertCircle, CheckCircle, TrendingDown, TrendingUp, Plus, Minus, Trash2, Save, Building2, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Transaction } from '@/types/finance';
import { loadData, saveData, getCategorySuggestions, addTransaction } from '@/lib/storage';
import { formatCurrency, calculateAccountBalance } from '@/lib/calculations';
import { toast } from 'sonner';
import MobileNav from '@/components/MobileNav';
import { useScrollOnFocus } from '@/hooks/useScrollOnFocus';
import { withKeyboardClose } from '@/lib/utils';

interface Adjustment {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
}

const ComparisonPage = () => {
    const navigate = useNavigate();
    const scrollOnFocus = useScrollOnFocus(240);
    const [data, setData] = useState(loadData());
    const [activeAccountId, setActiveAccountId] = useState('');
    const [realBalances, setRealBalances] = useState<Record<string, string>>({});
    const [adjustments, setAdjustments] = useState<Record<string, Adjustment[]>>({});
    const [newAmount, setNewAmount] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Initialize with first account
    useEffect(() => {
        if (data.accounts.length > 0 && !activeAccountId) {
            setActiveAccountId(data.accounts[0].id);
        }
    }, [data.accounts, activeAccountId]);

    // Initialize real balances and adjustments for all accounts
    useEffect(() => {
        const newRealBalances: Record<string, string> = {};
        const newAdjustments: Record<string, Adjustment[]> = {};
        data.accounts.forEach(account => {
            newRealBalances[account.id] = '';
            newAdjustments[account.id] = [];
        });
        setRealBalances(newRealBalances);
        setAdjustments(newAdjustments);
    }, [data.accounts]);

    useEffect(() => {
        if (newCategory) {
            const filtered = getCategorySuggestions(newCategory, data.categories);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0 && newCategory.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [newCategory, data.categories]);

    const currentAccount = data.accounts.find(a => a.id === activeAccountId);
    const currentBalance = currentAccount ? calculateAccountBalance(currentAccount, data.transactions) : 0;
    const realBalance = realBalances[activeAccountId] || '';

    const addAdjustment = (type: 'income' | 'expense') => {
        const amount = parseFloat(newAmount);
        if (amount > 0 && newCategory.trim() && activeAccountId) {
            const adjustment: Adjustment = {
                id: `${Date.now()}-${Math.random()}`,
                type,
                amount,
                category: newCategory.trim(),
            };
            setAdjustments(prev => ({
                ...prev,
                [activeAccountId]: [...(prev[activeAccountId] || []), adjustment],
            }));
            setNewAmount('');
            setNewCategory('');
            setShowSuggestions(false);
        }
    };

    const removeAdjustment = (id: string) => {
        setAdjustments(prev => ({
            ...prev,
            [activeAccountId]: (prev[activeAccountId] || []).filter(a => a.id !== id),
        }));
    };

    const handleSaveAdjustments = () => {
        const today = new Date().toISOString().split('T')[0];
        const allAdjustments: Transaction[] = [];

        Object.entries(adjustments).forEach(([accountId, accts]) => {
            accts.forEach(adj => {
                allAdjustments.push({
                    id: `${Date.now()}-${Math.random()}`,
                    date: today,
                    amount: adj.amount,
                    category: adj.category,
                    type: adj.type as 'income' | 'expense',
                    accountId: accountId,
                    isPending: false,
                });
            });
        });

        if (allAdjustments.length > 0) {
            allAdjustments.forEach(adj => addTransaction(adj));
            toast.success('Ajustes guardados correctamente');
            navigate('/');
        }
    };

    const totalAdjustments = (adjustments[activeAccountId] || []).reduce((sum, adj) => {
        return adj.type === 'income' ? sum + adj.amount : sum - adj.amount;
    }, 0);

    const adjustedBalance = currentBalance + totalAdjustments;
    const realBalanceNum = parseFloat(realBalance) || 0;
    const difference = realBalanceNum - adjustedBalance;
    const hasDifference = Math.abs(difference) > 0.01;

    // Check if all accounts are balanced
    const allAccountBalances = data.accounts.map(account => {
        const adj = (adjustments[account.id] || []).reduce((s, a) => a.type === 'income' ? s + a.amount : s - a.amount, 0);
        const balance = calculateAccountBalance(account, data.transactions);
        const real = parseFloat(realBalances[account.id] || '0') || 0;
        return {
            accountId: account.id,
            isBalanced: realBalances[account.id] !== '' && Math.abs(real - (balance + adj)) < 0.01,
            hasAdjustments: (adjustments[account.id] || []).length > 0,
        };
    });

    const hasAnyAdjustments = Object.values(adjustments).some(adj => adj.length > 0);
    const atLeastOneBalanced = allAccountBalances.some(ab => ab.isBalanced && ab.hasAdjustments);

    return (
        <div className="min-h-screen app-gradient-bg pb-32 lg:pl-20 pt-24">
            <div className="container max-w-2xl mx-auto px-4 py-4 sm:py-6">

                <div className="space-y-6 pb-20">
                    {/* Account tabs */}
                    <div className="flex gap-2 p-1 bg-muted rounded-xl flex-wrap">
                        {data.accounts.map(account => (
                            <Button
                                key={account.id}
                                variant={activeAccountId === account.id ? 'default' : 'ghost'}
                                className="flex-1 flex items-center gap-2 rounded-lg py-6 min-w-[120px]"
                                onClick={() => setActiveAccountId(account.id)}
                            >
                                <span>{account.name}</span>
                            </Button>
                        ))}
                    </div>

                    <Card>
                        <CardContent className="p-6 space-y-6">
                            {/* Current balances */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/50 rounded-xl border border-border">
                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Saldo App</p>
                                    <p className="text-xl font-bold">{formatCurrency(currentBalance)}</p>
                                </div>
                                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                    <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">Saldo Ajustado</p>
                                    <p className="text-xl font-bold text-primary">{formatCurrency(adjustedBalance)}</p>
                                </div>
                            </div>

                            {/* Real balance input */}
                            <div className="space-y-3">
                                <Label htmlFor="realBalance" className="text-base font-semibold">
                                    ¿Cuál es tu saldo real en {currentAccount?.name}?
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="realBalance"
                                        type="number"
                                        step="0.01"
                                        value={realBalance}
                                        onChange={(e) => setRealBalances(prev => ({ ...prev, [activeAccountId]: e.target.value }))}
                                        placeholder="0.00"
                                        className="text-lg py-6 pr-10"
                                        onFocus={scrollOnFocus}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">€</span>
                                </div>
                            </div>

                            {/* Difference indicator */}
                            {realBalance && (
                                <div className={`p-4 rounded-xl border-2 transition-all ${hasDifference
                                    ? 'bg-expense/5 border-expense/20'
                                    : 'bg-income/5 border-income/20'
                                    }`}>
                                    {hasDifference ? (
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${difference > 0 ? 'bg-income/10' : 'bg-expense/10'}`}>
                                                {difference > 0 ? (
                                                    <TrendingUp className="w-6 h-6 text-income" />
                                                ) : (
                                                    <TrendingDown className="w-6 h-6 text-expense" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Hay una diferencia de {formatCurrency(Math.abs(difference))}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {difference > 0 ? 'Debes añadir ingresos para cuadrar.' : 'Debes añadir gastos para cuadrar.'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-income/10 rounded-full">
                                                <CheckCircle className="w-6 h-6 text-income" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-income italic">¡Saldo perfectamente cuadrado!</p>
                                                <p className="text-xs text-muted-foreground">No necesitas más ajustes para esta cuenta.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add adjustments section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Añadir Ajustes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="relative">
                                    <Label className="text-xs font-bold uppercase mb-1 block">Categoría</Label>
                                    <Input
                                        type="text"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        placeholder="Ej: Supermercado"
                                        autoComplete="off"
                                        onFocus={scrollOnFocus}
                                    />
                                    {suggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {suggestions.slice(0, 5).map((suggestion, index) => (
                                                <button
                                                    key={index}
                                                    type="button"
                                                    onClick={() => withKeyboardClose(() => {
                                                        setNewCategory(suggestion);
                                                        setSuggestions([]);
                                                    })}
                                                    onPointerDown={() => withKeyboardClose(() => {
                                                        setNewCategory(suggestion);
                                                        setSuggestions([]);
                                                    })}
                                                    className="text-[10px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-all border border-border font-medium"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs font-bold uppercase mb-1 block">Importe (€)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newAmount}
                                        onChange={(e) => setNewAmount(e.target.value)}
                                        placeholder="0.00"
                                        onFocus={scrollOnFocus}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    className="flex-1 bg-income hover:bg-income/90 gap-2"
                                    onClick={() => withKeyboardClose(() => addAdjustment('income'))}
                                    onPointerDown={() => withKeyboardClose(() => addAdjustment('income'))}
                                    disabled={!newAmount || parseFloat(newAmount) <= 0 || !newCategory.trim()}
                                >
                                    <Plus className="w-4 h-4" /> Ingreso
                                </Button>
                                <Button
                                    className="flex-1 bg-expense hover:bg-expense/90 gap-2"
                                    onClick={() => withKeyboardClose(() => addAdjustment('expense'))}
                                    onPointerDown={() => withKeyboardClose(() => addAdjustment('expense'))}
                                    disabled={!newAmount || parseFloat(newAmount) <= 0 || !newCategory.trim()}
                                >
                                    <Minus className="w-4 h-4" /> Gasto
                                </Button>
                            </div>

                            {/* List of adjustments */}
                            {(adjustments[activeAccountId] || []).length > 0 && (
                                <div className="space-y-2 mt-4">
                                    <p className="text-xs font-bold uppercase text-muted-foreground border-b pb-1">Ajustes Pendientes</p>
                                    {(adjustments[activeAccountId] || []).map((adj) => (
                                        <div key={adj.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-full ${adj.type === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}`}>
                                                    {adj.type === 'income' ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                </div>
                                                <span className="font-medium capitalize">{adj.category}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-bold ${adj.type === 'income' ? 'text-income' : 'text-expense'}`}>
                                                    {adj.type === 'income' ? '+' : '-'}{formatCurrency(adj.amount)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeAdjustment(adj.id)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="fixed bottom-20 left-0 w-full p-4 bg-background/80 backdrop-blur-md border-t sm:relative sm:bottom-auto sm:border-t-0 sm:bg-transparent sm:p-0 flex gap-4 z-40">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/')}
                            className="flex-1 sm:hidden py-6"
                        >
                            Cancelar
                        </Button>
                        <Button
                            className="flex-1 py-6 bg-primary text-primary-foreground font-bold shadow-lg disabled:opacity-50"
                            onClick={() => withKeyboardClose(() => handleSaveAdjustments())}
                            onPointerDown={() => withKeyboardClose(() => handleSaveAdjustments())}
                            disabled={!hasAnyAdjustments || !atLeastOneBalanced}
                        >
                            <Save className="w-5 h-5 mr-2" />
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </div>
            <MobileNav />
        </div>
    );
};

export default ComparisonPage;

