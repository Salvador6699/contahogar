import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, AlertTriangle, ShieldCheck, FileJson, FileSpreadsheet, Database, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { loadData, saveData, migrateData } from '@/lib/storage';
import { exportTransactionsToCSV } from '@/lib/exportUtils';
import { FinanceData } from '@/types/finance';
import { toast } from 'sonner';
import BackupVault from '@/components/BackupVault';
import { cn } from '@/lib/utils';

const BackupPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'vault' | 'files'>('vault');
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

    const handleExportCSV = () => {
        try {
            const data = loadData();
            exportTransactionsToCSV(data.transactions, data.accounts);
            toast.success('Excel (CSV) exportado correctamente');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            toast.error('Error al generar el Excel');
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
            const rawData = JSON.parse(text);
            const importedData: FinanceData = migrateData(rawData);

            // Validate the newly migrated data structure minimally
            if (
                !Array.isArray(importedData.accounts) ||
                !Array.isArray(importedData.transactions) ||
                !Array.isArray(importedData.categories) ||
                !Array.isArray(importedData.budgets)
            ) {
                throw new Error('El archivo no tiene el formato correcto de ContaHogar');
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
        <div className="min-h-screen app-gradient-bg pb-20 lg:pl-20 pt-24">
            <div className="container max-w-2xl mx-auto px-4 py-4 sm:py-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-1 mb-2">
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                            <ShieldCheck className="w-7 h-7 text-primary" />
                            Seguridad y Datos
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium">Gestiona cómo se guardan y transfieren tus finanzas.</p>
                    </div>

                    {/* Tab Selector */}
                    <div className="flex p-1.5 bg-muted/50 rounded-2xl gap-1">
                        <button 
                            onClick={() => setActiveTab('vault')}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2",
                                activeTab === 'vault' ? "bg-white dark:bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-white/50 dark:hover:bg-card/50"
                            )}
                        >
                            <Database className="w-4 h-4" />
                            Bóveda Interna
                        </button>
                        <button 
                            onClick={() => setActiveTab('files')}
                            className={cn(
                                "flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2",
                                activeTab === 'files' ? "bg-white dark:bg-card shadow-sm text-primary" : "text-muted-foreground hover:bg-white/50 dark:hover:bg-card/50"
                            )}
                        >
                            <HardDrive className="w-4 h-4" />
                            Archivos (Manual)
                        </button>
                    </div>

                    {activeTab === 'vault' ? (
                        <BackupVault />
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             <Card className="border-none shadow-sm">
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-1">
                                        <HardDrive className="w-5 h-5 text-primary" />
                                        <CardTitle className="text-base font-black uppercase tracking-wider">Gestión de Archivos</CardTitle>
                                    </div>
                                    <CardDescription className="text-xs font-medium">
                                        Exporta tus datos a archivos locales para transferirlos manualmente o abrirlos en otras aplicaciones.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Export CSV Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/5 rounded-lg shrink-0">
                                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Análisis en Excel</h3>
                                                <p className="text-[11px] text-muted-foreground leading-tight">Ideal para auditoría personal o reportes externos.</p>
                                            </div>
                                        </div>
                                        <Button onClick={handleExportCSV} className="w-full h-12 gap-2 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all rounded-xl" variant="outline">
                                            <FileSpreadsheet className="w-4 h-4" />
                                            Exportar a Excel (CSV)
                                        </Button>
                                    </div>

                                    <Separator />

                                    {/* Export Section */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/5 rounded-lg shrink-0">
                                                <FileJson className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Copia Completa</h3>
                                                <p className="text-[11px] text-muted-foreground leading-tight">Archivo .json técnico con toda la configuración y transacciones.</p>
                                            </div>
                                        </div>
                                        <Button onClick={handleExport} className="w-full h-12 gap-2 rounded-xl" variant="outline">
                                            <Download className="w-4 h-4" />
                                            Descargar Backup (JSON)
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
                                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Importar Datos</h3>
                                                <p className="text-[11px] text-muted-foreground leading-tight">Carga un archivo previamente descargado.</p>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-destructive/5 rounded-xl border border-destructive/10 flex gap-3">
                                            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-destructive/80 leading-relaxed font-bold">
                                                ATENCIÓN: Se sobreescribirán todos los datos actuales. Acción definitiva.
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
                                            className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-black rounded-xl"
                                            disabled={importing}
                                        >
                                            {importing ? 'Importando...' : 'Seleccionar JSON y Restaurar'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="text-center py-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">
                            ContaHogar v2.0 • Data Vault System
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupPage;
