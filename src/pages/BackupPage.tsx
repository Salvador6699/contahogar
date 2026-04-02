import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Upload, AlertTriangle, ShieldCheck, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { loadData, saveData, migrateData } from '@/lib/storage';
import { FinanceData } from '@/types/finance';
import { toast } from 'sonner';
import MobileNav from '@/components/MobileNav';

const BackupPage = () => {
    const navigate = useNavigate();
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
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-primary" />
                                Seguridad y Backups
                            </CardTitle>
                            <CardDescription>
                                Tus datos se guardan localmente en este navegador. Te recomendamos exportarlos regularmente para evitar pérdidas accidentales.
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
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Exportar Datos</h3>
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
                                        <h3 className="text-sm font-bold uppercase tracking-wider">Restaurar Copia</h3>
                                        <p className="text-xs text-muted-foreground">Recupera tus datos desde un archivo backup previo.</p>
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

                    <Card className="border-none shadow-sm bg-primary/5">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold uppercase tracking-wider">¿Por qué exportar?</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                ContaHogar prioriza tu privacidad. Tus datos <span className="font-bold">nunca salen de este dispositivo</span> a menos que tú decidas exportarlos. 
                                Si borras el historial del navegador o cambias de móvil, los datos se perderán a menos que tengas un archivo de respaldo.
                            </p>
                        </CardContent>
                    </Card>

                    <div className="text-center py-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-[0.2em]">
                            ContaHogar v2.0 • Seguridad Local
                        </p>
                    </div>
                </div>
            </div>
            <MobileNav />
        </div>
    );
};

export default BackupPage;
