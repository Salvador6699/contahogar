// src/components/AccountManager.tsx
import { useState, useEffect } from 'react';
import { Account } from '@/types/finance';
import { loadData, addAccount, updateAccount, deleteAccount } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculations';

export const AccountManager = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accountName, setAccountName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');

    useEffect(() => {
        setAccounts(loadData().accounts);
    }, []);

    const refreshAccounts = () => {
        setAccounts(loadData().accounts);
    };

    const handleOpenDialog = (account: Account | null = null) => {
        setEditingAccount(account);
        setAccountName(account ? account.name : '');
        setInitialBalance(account ? String(account.initialBalance) : '');
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!accountName.trim() || !initialBalance) {
            toast.error('El nombre y el saldo inicial son obligatorios.');
            return;
        }
        
        const balance = parseFloat(initialBalance);

        if (editingAccount) {
            updateAccount({ ...editingAccount, name: accountName.trim(), initialBalance: balance });
            toast.success('Cuenta actualizada correctamente.');
        } else {
            addAccount(accountName.trim(), balance);
            toast.success('Cuenta añadida correctamente.');
        }

        refreshAccounts();
        setIsDialogOpen(false);
    };

    const handleDelete = (accountId: string) => {
        const result = deleteAccount(accountId);
        if (result.success) {
            toast.success('Cuenta eliminada correctamente.');
            refreshAccounts();
        } else {
            toast.error(result.message);
        }
    };

    return (
        <>
            <Card className="border-none shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-income" />
                        Gestionar Cuentas
                    </CardTitle>
                    <CardDescription>
                        Añade, edita o elimina tus cuentas de dinero (banco, efectivo, etc.).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        {accounts.map(account => (
                            <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div>
                                    <p className="font-semibold">{account.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Saldo inicial: {formatCurrency(account.initialBalance)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(account)}>
                                        <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(account.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button onClick={() => handleOpenDialog()} className="w-full gap-2">
                        <Plus className="w-4 h-4" />
                        Añadir Nueva Cuenta
                    </Button>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAccount ? 'Editar Cuenta' : 'Añadir Nueva Cuenta'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="account-name">Nombre de la Cuenta</Label>
                            <Input
                                id="account-name"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="Ej: Banco Santander"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="initial-balance">Saldo Inicial</Label>
                            <Input
                                id="initial-balance"
                                type="number"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleSave}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
