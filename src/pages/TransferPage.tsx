import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowRight, Trash2, Pencil, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Transaction } from '@/types/finance';
import { loadData, addTransaction, deleteTransaction } from '@/lib/storage';
import { formatCurrency, calculateAccountBalance } from '@/lib/calculations';
import { toast } from 'sonner';
import MobileNav from '@/components/MobileNav';
import { useScrollOnFocus } from '@/hooks/useScrollOnFocus';
import { withKeyboardClose } from '@/lib/utils';

const TransferPage = () => {
    const navigate = useNavigate();
    const scrollOnFocus = useScrollOnFocus(120);
    const [data, setData] = useState(loadData());
    const [amount, setAmount] = useState('');
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [editingTransferId, setEditingTransferId] = useState<string | null>(null);

    useMemo(() => {
        if (data.accounts.length >= 2) {
            if (!fromAccountId) setFromAccountId(data.accounts[0].id);
            if (!toAccountId) setToAccountId(data.accounts[1].id);
        } else if (data.accounts.length === 1) {
            if (!fromAccountId) setFromAccountId(data.accounts[0].id);
            if (!toAccountId) setToAccountId(data.accounts[0].id);
        }
    }, [data.accounts, fromAccountId, toAccountId]);

    const { transferTransactions } = useMemo(() => {
        const transfers = data.transactions.filter(t => t.category === 'Transferencia');
        return { transferTransactions: transfers };
    }, [data]);

    const fromAccount = data.accounts.find(a => a.id === fromAccountId);
    const toAccount = data.accounts.find(a => a.id === toAccountId);
    const maxAmount = fromAccount ? calculateAccountBalance(fromAccount, data.transactions) : 0;

    const handleTransfer = () => {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0 || amountNum > maxAmount || !fromAccountId || !toAccountId) return;

        if (editingTransferId) {
            const expensePart = transferPairs.find(t => t.id === editingTransferId);
            if (expensePart) {
                const incomePart = transferTransactions.find(
                    t => t.type === 'income' &&
                        t.amount === expensePart.amount &&
                        t.date === expensePart.date &&
                        t.id !== expensePart.id
                );

                deleteTransaction(expensePart.id);
                if (incomePart) {
                    deleteTransaction(incomePart.id);
                }
            }
        }

        const today = new Date().toISOString().split('T')[0];

        // Create expense from source account
        const expenseTransaction: Transaction = {
            id: `${Date.now()}-${Math.random()}-transfer-out`,
            date: today,
            amount: amountNum,
            category: 'Transferencia',
            type: 'expense',
            accountId: fromAccountId,
            isPending: false,
        };

        // Create income to destination account
        const incomeTransaction: Transaction = {
            id: `${Date.now()}-${Math.random()}-transfer-in`,
            date: today,
            amount: amountNum,
            category: 'Transferencia',
            type: 'income',
            accountId: toAccountId,
            isPending: false,
        };

        addTransaction(expenseTransaction);
        addTransaction(incomeTransaction);

        setData(loadData());
        setAmount('');
        setEditingTransferId(null);
        toast.success(editingTransferId ? 'Transferencia actualizada' : 'Transferencia realizada con éxito');
    };

    const handleEditTransfer = (transfer: Transaction) => {
        setAmount(transfer.amount.toString());
        setFromAccountId(transfer.accountId);
        setEditingTransferId(transfer.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setAmount('');
        setEditingTransferId(null);
    };

    const handleDeleteTransferPair = (expenseTransfer: Transaction) => {
        const matchingIncome = transferTransactions.find(
            t => t.type === 'income' &&
                t.amount === expenseTransfer.amount &&
                t.date === expenseTransfer.date &&
                t.id !== expenseTransfer.id
        );

        deleteTransaction(expenseTransfer.id);
        if (matchingIncome) {
            deleteTransaction(matchingIncome.id);
        }

        setData(loadData());
        toast.success('Transferencia eliminada');
    };

    const transferPairs = useMemo(() => {
        return transferTransactions
            .filter(t => t.type === 'expense')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transferTransactions]);

    return (
        <div className="min-h-screen app-gradient-bg pb-32 lg:pl-20">
            <div className="container max-w-2xl mx-auto px-4 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary rounded-lg">
                                <ArrowLeftRight className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Transferir</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pb-24">
                    <Card className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg">
                                {editingTransferId ? 'Editar Transferencia' : 'Nueva Transferencia'}
                            </CardTitle>
                            {editingTransferId && (
                                <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-8 gap-1 text-muted-foreground">
                                    <X className="w-4 h-4" />
                                    Cancelar
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* From Account Selector */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Transferir desde</Label>
                                <Select value={fromAccountId} onValueChange={setFromAccountId}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Selecciona cuenta origen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.accounts.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.name} - {formatCurrency(calculateAccountBalance(acc, data.transactions))}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Swap Button */}
                            <div className="flex justify-center">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="rounded-full bg-background shadow-md hover:scale-110 transition-transform"
                                    onClick={() => {
                                        const temp = fromAccountId;
                                        setFromAccountId(toAccountId);
                                        setToAccountId(temp);
                                    }}
                                >
                                    <ArrowRight className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* To Account Selector */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Transferir a</Label>
                                <Select value={toAccountId} onValueChange={setToAccountId}>
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="Selecciona cuenta destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.accounts.map((acc) => (
                                            <SelectItem key={acc.id} value={acc.id}>
                                                {acc.name} - {formatCurrency(calculateAccountBalance(acc, data.transactions))}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Importe */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Importe a transferir</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={maxAmount}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="text-2xl h-16 font-bold text-center pr-10"
                                        onFocus={scrollOnFocus}
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">€</span>
                                </div>
                                {amount && parseFloat(amount) > maxAmount && (
                                    <p className="text-xs text-destructive font-bold text-center">Saldo insuficiente en la cuenta de origen</p>
                                )}
                            </div>

                            <Button
                                className={`w-full h-14 text-lg font-bold shadow-lg ${editingTransferId ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                                onClick={() => withKeyboardClose(() => handleTransfer())}
                                onPointerDown={() => withKeyboardClose(() => handleTransfer())}
                                disabled={!amount || parseFloat(amount) <= 0 || (parseFloat(amount) > maxAmount && !editingTransferId) || !fromAccountId || !toAccountId || fromAccountId === toAccountId}
                            >
                                {editingTransferId ? 'Actualizar Transferencia' : 'Realizar Transferencia'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Historial de transferencias */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                            <History className="w-5 h-5" />
                            Historial Reciente
                        </h2>

                        {transferPairs.length === 0 ? (
                            <p className="text-center py-10 text-muted-foreground italic bg-muted/20 rounded-2xl border border-dashed">
                                No hay transferencias registradas todavía.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {transferPairs.map((transfer) => {
                                    const matchingIncome = transferTransactions.find(
                                        t => t.type === 'income' &&
                                            t.amount === transfer.amount &&
                                            t.date === transfer.date &&
                                            t.id !== transfer.id
                                    );
                                    const fromAccount = data.accounts.find(a => a.id === transfer.accountId);
                                    const toAccount = matchingIncome ? data.accounts.find(a => a.id === matchingIncome.accountId) : null;

                                    return (
                                        <Card key={transfer.id} className="border-none shadow-sm overflow-hidden group">
                                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="p-2 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors">
                                                        <ArrowLeftRight className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm sm:text-base">
                                                            {fromAccount?.name} <span className="text-muted-foreground font-medium">→</span> {toAccount?.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground font-medium">
                                                            {new Date(transfer.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="font-extrabold text-primary text-lg">
                                                        {formatCurrency(transfer.amount)}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-primary hover:bg-primary/5"
                                                            onClick={() => handleEditTransfer(transfer)}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                                                            onClick={() => handleDeleteTransferPair(transfer)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <MobileNav />
        </div>
    );
};

export default TransferPage;
