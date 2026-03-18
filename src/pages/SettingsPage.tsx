import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from "next-themes"
import { Settings, Download, Upload, AlertTriangle, ShieldCheck, FileJson, Sun, Moon, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { loadData, saveData } from '@/lib/storage';
import { FinanceData } from '@/types/finance';
import { toast } from 'sonner';
import MobileNav from '@/components/MobileNav';
import { AccountManager } from '@/components/AccountManager';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { setTheme } = useTheme()
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        try {
            const data = loadData();
            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `contahogar-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('Copia de seguridad descargada correctamente');
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error('Error al exportar los datos');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImporting(true);
        const toastId = toast.loading('Importando datos...');

        try {
            const text = await file.text();
            const importedData: FinanceData = JSON.parse(text);

            // Validate structure
            const hasNewFormat = 'initialBankBalance' in importedData;
            const hasOldFormat = 'initialBalance' in importedData;

            if (
                (!hasNewFormat && !hasOldFormat) ||
                !Array.isArray(importedData.transactions) ||
                !Array.isArray(importedData.categories)
            ) {
                throw new Error('El archivo no tiene el formato correcto de ContaHogar');
            }

            // Migrate old format if needed
            if (hasOldFormat && !hasNewFormat) {
                (importedData as any).initialBankBalance = (importedData as any).initialBalance;
                (importedData as any).initialCashBalance = 0;
                delete (importedData as any).initialBalance;
            }

            saveData(importedData);
            toast.success('Datos restaurados correctamente', { id: toastId });
            setTimeout(() => navigate('/'), 1000);
        } catch (error) {
            console.error('Error importing data:', error);
            toast.error(error instanceof Error ? error.message : 'Error crítico al importar', { id: toastId });
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen app-gradient-bg pb-20 lg:pl-20">
            <div className="container max-w-2xl mx-auto px-4 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary rounded-lg">
                                <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Ajustes</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <AccountManager />

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sun className="w-5 h-5 text-income" />
                                Apariencia
                            </CardTitle>
                            <CardDescription>
                                Elige cómo se ve la aplicación en tu dispositivo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                            <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setTheme("light")}>
                                <Sun className="w-5 h-5" />
                                Claro
                            </Button>
                            <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setTheme("dark")}>
                                <Moon className="w-5 h-5" />
                                Oscuro
                            </Button>
                            <Button variant="outline" className="h-16 flex-col gap-2" onClick={() => setTheme("system")}>
                                <Laptop className="w-5 h-5" />
                                Sistema
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-income" />
                                Seguridad y Backups
                            </CardTitle>
                            <CardDescription>
                                Tus datos se guardan localmente en este navegador. Te recomendamos exportarlos regularmente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Export Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                                        <Download className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Exportar</h3>
                                        <p className="text-xs text-muted-foreground">Descarga un archivo JSON con toda tu información.</p>
                                    </div>
                                </div>
                                <Button onClick={handleExport} className="w-full h-12 gap-2" variant="outline">
                                    <FileJson className="w-4 h-4" />
                                    Descargar Copia de Seguridad
                                </Button>
                            </div>

                            <Separator />

                            {/* Import Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-expense/5 rounded-lg shrink-0">
                                        <Upload className="w-5 h-5 text-expense" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Importar</h3>
                                        <p className="text-xs text-muted-foreground">Restaura una copia de seguridad anterior.</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/10 flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                    <p className="text-xs text-destructive/80 leading-relaxed font-medium">
                                        <span className="font-bold underline">ATENCIÓN:</span> Al importar, se sobreescribirán todos los datos actuales por los del archivo. Esta acción es definitiva.
                                    </p>
                                </div>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <Button
                                    onClick={handleImportClick}
                                    className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-bold"
                                    disabled={importing}
                                >
                                    {importing ? 'Importando...' : 'Seleccionar Archivo y Restaurar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="text-center py-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
                            ContaHogar v2.0 • Local Storage Only
                        </p>
                    </div>
                </div>
            </div>
            <MobileNav />
        </div>
    );
};

export default SettingsPage;
