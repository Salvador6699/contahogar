// src/components/AccountManager.tsx
import { useState, useEffect } from 'react';
import { Account } from '@/types/finance';
import { loadData, addAccount, updateAccount, deleteAccount } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/calculations';

const BANK_LOGOS = [
  { name: 'CaixaBank', url: 'https://icon.horse/icon/caixabank.es' },
  { name: 'Santander', url: 'https://icon.horse/icon/bancosantander.es' },
  { name: 'BBVA', url: 'https://icon.horse/icon/bbva.es' },
  { name: 'Sabadell', url: 'https://icon.horse/icon/bancsabadell.com' },
  { name: 'ING', url: 'https://icon.horse/icon/ing.es' },
  { name: 'Bankinter', url: 'https://icon.horse/icon/bankinter.com' },
  { name: 'Abanca', url: 'https://icon.horse/icon/abanca.com' },
  { name: 'Unicaja', url: 'https://icon.horse/icon/unicajabanco.es' },
  { name: 'Kutxabank', url: 'https://icon.horse/icon/kutxabank.es' },
  { name: 'Ibercaja', url: 'https://icon.horse/icon/ibercaja.es' },
  { name: 'Openbank', url: 'https://icon.horse/icon/openbank.es' },
  { name: 'Evo Banco', url: 'https://icon.horse/icon/evobanco.com' },
  { name: 'N26', url: 'https://icon.horse/icon/n26.com' },
  { name: 'Revolut', url: 'https://icon.horse/icon/revolut.com' },
  { name: 'PayPal', url: 'https://icon.horse/icon/paypal.com' },
];

export const AccountManager = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [accountName, setAccountName] = useState('');
    const [initialBalance, setInitialBalance] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState<string>('none');
    const [logo, setLogo] = useState('');
    const [isCustomLogo, setIsCustomLogo] = useState(false);

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
        setLinkedAccountId(account && account.linkedAccountId ? account.linkedAccountId : 'none');
        setLogo(account?.logo || '');
        setIsCustomLogo(account?.logo ? !BANK_LOGOS.some(b => b.url === account.logo) : false);
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!accountName.trim() || !initialBalance) {
            toast.error('El nombre y el saldo inicial son obligatorios.');
            return;
        }
        
        const balance = parseFloat(initialBalance);
        const finalLinkedId = linkedAccountId === 'none' ? undefined : linkedAccountId;
        const finalLogo = logo.trim() || undefined;

        if (editingAccount) {
            updateAccount({ ...editingAccount, name: accountName.trim(), initialBalance: balance, linkedAccountId: finalLinkedId, logo: finalLogo });
            toast.success('Cuenta actualizada correctamente.');
        } else {
            addAccount(accountName.trim(), balance, finalLinkedId, finalLogo);
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
                                <div className="flex items-center gap-3">
                                    {account.logo ? (
                                        <div className="w-10 h-10 rounded-full border border-border/20 overflow-hidden bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <img src={account.logo} alt={account.name} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                            <Wallet className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold">{account.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            Saldo inicial: {formatCurrency(account.initialBalance)}
                                        </p>
                                    </div>
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

                        <div className="space-y-2">
                            <Label>Logotipo de la Cuenta</Label>
                            <Select 
                                value={isCustomLogo ? 'custom' : (logo || 'none')} 
                                onValueChange={(val) => {
                                    if (val === 'custom') {
                                        setIsCustomLogo(true);
                                        setLogo('');
                                    } else if (val === 'none') {
                                        setIsCustomLogo(false);
                                        setLogo('');
                                    } else {
                                        setIsCustomLogo(false);
                                        setLogo(val);
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Sin logotipo" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                    <SelectItem value="none">Sin logotipo</SelectItem>
                                    {BANK_LOGOS.map(b => (
                                        <SelectItem key={b.url} value={b.url}>
                                            <div className="flex items-center gap-2">
                                                <img src={b.url} alt={b.name} className="w-4 h-4 rounded-full object-cover" />
                                                {b.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="custom">Personalizado (URL)...</SelectItem>
                                </SelectContent>
                            </Select>
                            {isCustomLogo && (
                                <Input
                                    value={logo}
                                    onChange={(e) => setLogo(e.target.value)}
                                    placeholder="https://ejemplo.com/logo.png"
                                    className="mt-2"
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Cuenta Vinculada (Cobro de pagos futuros)</Label>
                            <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Ninguna" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Ninguna (Cuenta independiente)</SelectItem>
                                    {accounts.filter(a => !editingAccount || a.id !== editingAccount.id).map(a => (
                                        <SelectItem key={a.id} value={a.id}>
                                            Transfiere a: {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancelar</Button>
                        </DialogClose>
                        <Button 
                            onClick={handleSave}
                            onPointerDown={(e) => {
                                e.preventDefault();
                                e.currentTarget.click();
                            }}
                        >
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
