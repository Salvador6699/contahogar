import { useState, useMemo, useRef } from 'react';
import { Download, ShieldCheck, FileSpreadsheet, HardDrive, RotateCcw, Calendar as CalendarIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { loadData, migrateData } from '@/lib/storage';
import { exportTransactionsToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { swalSuccess, swalError, swalConfirm, swalLoading, swalClose } from '@/lib/swal';
import { restoreToSupabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { useSnapshots } from '@/hooks/useSnapshots';
import { format, subDays, parseISO, isSameDay, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CloudSnapshotSummary } from '@/api/local/snapshots';
import { useTeam } from '@/contexts/TeamContext';

const BackupPage = () => {
    const queryClient = useQueryClient();
    const { snapshots, isLoading, getSnapshotData, createSnapshot } = useSnapshots();
    const { activeRole } = useTeam();
    const [selectedSnapshot, setSelectedSnapshot] = useState<CloudSnapshotSummary | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    
    // Emergency Restore state
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const pastDays = useMemo(() => {
        const days = [];
        const today = startOfToday();
        for (let i = 0; i < 30; i++) {
            days.push(subDays(today, i));
        }
        return days;
    }, []);

    const handleRestore = async () => {
        if (!selectedSnapshot) return;

        const confirmed = await swalConfirm(
            '¿Restaurar datos?',
            `Vas a volver al ${format(parseISO(selectedSnapshot.created_at), "d 'de' MMMM 'a las' HH:mm", { locale: es })}. Esto sobrescribirá tus datos actuales en la nube.`
        );
        if (!confirmed) return;

        setIsRestoring(true);
        swalLoading('Restaurando Máquina del Tiempo...');

        try {
            const rawData = await getSnapshotData(selectedSnapshot.id);

            if (!rawData || !rawData.accounts || !rawData.transactions) {
                throw new Error('El backup está corrupto o vacío.');
            }

            await restoreToSupabase(rawData);
            queryClient.invalidateQueries();
            setSelectedSnapshot(null);
            await swalSuccess('¡Restauración completada!', `Tus datos han vuelto al ${format(parseISO(selectedSnapshot.created_at), "d 'de' MMMM", { locale: es })}.`);
        } catch (error) {
            console.error('Error restoring data:', error);
            swalClose();
            await swalError('Error al restaurar', error instanceof Error ? error.message : 'Error crítico al restaurar');
        } finally {
            setIsRestoring(false);
        }
    };

    const handleManualBackup = async () => {
        setIsCreatingBackup(true);
        swalLoading('Forzando copia de seguridad en la nube...');
        try {
            await createSnapshot();
            await swalSuccess('¡Copia creada!', 'La copia de hoy ha sido actualizada con el estado actual de tus datos.');
        } catch (error) {
            console.error('Error creating manual backup:', error);
            swalClose();
            await swalError('Error en la copia', 'No se pudo crear la copia de seguridad.');
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const confirmed = await swalConfirm(
            '¿Restauración de emergencia?',
            `Se importará el archivo "${file.name}" y se sobrescribirán todos los datos actuales de Supabase.`
        );
        if (!confirmed) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setImporting(true);
        swalLoading('Rescatando datos a la nube...');

        try {
            const text = await file.text();
            const rawData = JSON.parse(text);

            if (!rawData) throw new Error('El archivo está vacío o corrupto.');

            const migratedData = migrateData(rawData);

            if (!migratedData.accounts || !migratedData.transactions) {
                throw new Error('El archivo no tiene el formato correcto.');
            }

            await restoreToSupabase(migratedData);
            queryClient.invalidateQueries();
            await swalSuccess('¡Restauración completada!', 'Todos los datos han sido importados desde el archivo JSON.');
        } catch (error) {
            console.error('Error importing data:', error);
            swalClose();
            await swalError('Error al importar', error instanceof Error ? error.message : 'Error crítico al importar');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
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

    return (
        <div className="w-full pb-24">
            <div className="w-full max-w-4xl mx-auto px-4 lg:px-12 py-4 sm:py-6">
                <div className="space-y-6">
                    <div className="flex flex-col gap-1 mb-2">
                        <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                            <ShieldCheck className="w-7 h-7 text-primary" />
                            Seguridad y Time Machine
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium">Restauración automática en la nube y exportación manual.</p>
                    </div>

                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Cloud Time Machine */}
                        <Card className="border-none shadow-sm bg-primary/5 dark:bg-primary/10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <RotateCcw className="w-24 h-24" />
                            </div>
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-1">
                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                    <CardTitle className="text-base font-black uppercase tracking-wider">Máquina del Tiempo (Nube)</CardTitle>
                                </div>
                                <CardDescription className="text-xs font-medium max-w-[80%]">
                                    Tus datos se guardan automáticamente cada día que abres la app. 
                                    Selecciona un día en verde para volver en el tiempo.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 relative z-10">
                                {isLoading ? (
                                    <div className="h-24 flex items-center justify-center text-muted-foreground animate-pulse font-bold text-sm">
                                        Cargando calendario...
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex overflow-x-auto pb-4 pt-2 gap-2 custom-scrollbar snap-x">
                                            {pastDays.map(date => {
                                                const snapshot = snapshots.find(s => isSameDay(parseISO(s.created_at), date));
                                                const isAvailable = !!snapshot;
                                                const isSelected = selectedSnapshot?.id === snapshot?.id;

                                                return (
                                                    <button
                                                        key={date.toISOString()}
                                                        disabled={!isAvailable}
                                                        onClick={() => isAvailable && setSelectedSnapshot(snapshot)}
                                                        className={cn(
                                                            "shrink-0 snap-center flex flex-col items-center justify-center w-14 h-16 rounded-xl border-2 transition-all",
                                                            isAvailable 
                                                                ? isSelected 
                                                                    ? "border-emerald-600 bg-emerald-600 text-white shadow-md scale-110" 
                                                                    : "border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:border-emerald-600 cursor-pointer shadow-sm" 
                                                                : "border-muted bg-muted/30 text-muted-foreground/30 cursor-not-allowed opacity-50"
                                                        )}
                                                    >
                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                                            {format(date, 'E', { locale: es }).substring(0, 2)} {format(date, 'd')}
                                                        </span>
                                                        <span className="text-[11px] font-black leading-none mt-1 uppercase">
                                                            {format(date, 'MMM', { locale: es })}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                            <Button 
                                                onClick={handleRestore}
                                                disabled={!selectedSnapshot || isRestoring}
                                                className={cn(
                                                    "flex-1 h-12 rounded-xl font-black text-white shadow-xl transition-all",
                                                    selectedSnapshot ? "bg-primary hover:bg-primary/90" : "bg-muted text-muted-foreground shadow-none"
                                                )}
                                            >
                                                {isRestoring ? 'Restaurando...' : selectedSnapshot ? `Iniciar Restauración: ${format(parseISO(selectedSnapshot.created_at), "d MMM", { locale: es })}` : 'Selecciona un día verde'}
                                            </Button>
                                            
                                            <Button
                                                onClick={handleManualBackup}
                                                disabled={isCreatingBackup || isLoading}
                                                variant="outline"
                                                className="h-12 px-6 rounded-xl font-black border-primary text-primary hover:bg-primary/10 transition-all shrink-0"
                                            >
                                                {isCreatingBackup ? 'Forzando...' : 'Forzar Copia Ahora'}
                                            </Button>
                                        </div>
                                        
                                        <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/20 flex gap-3 mt-2">
                                            <Info className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-destructive/90 leading-relaxed font-bold">
                                                ATENCIÓN: Restaurar borrará por completo todos los datos actuales y los reemplazará exactamente por los de la copia de seguridad. Cualquier transacción o cuenta creada después de esa fecha se eliminará permanentemente.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Export CSV Section */}
                        <Card className="border-none shadow-sm">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-1">
                                    <HardDrive className="w-5 h-5 text-emerald-600" />
                                    <CardTitle className="text-base font-black uppercase tracking-wider">Exportación Manual</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/5 rounded-lg shrink-0">
                                            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Análisis en Excel</h3>
                                            <p className="text-[11px] text-muted-foreground leading-tight">Exporta todos tus datos actuales a Excel (CSV) para tu propia contabilidad externa.</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleExportCSV} className="w-full h-12 gap-2 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-all rounded-xl" variant="outline">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        Exportar a Excel (CSV)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Emergency Restore Section - Solo Admin */}
                        {activeRole === 'admin' && (
                            <Card className="border-destructive shadow-sm">
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-1">
                                        <HardDrive className="w-5 h-5 text-destructive" />
                                        <CardTitle className="text-base font-black uppercase tracking-wider text-destructive">Rescate de Emergencia</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <p className="text-[11px] text-destructive/80 leading-tight font-bold">Si tienes un archivo .json antiguo en tu ordenador, súbelo aquí para recuperar tu base de datos de Supabase. Elimina esta sección cuando ya no la necesites.</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".json"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                        <Button onClick={handleImportClick} disabled={importing} className="w-full h-12 gap-2 bg-destructive hover:bg-destructive/90 text-white font-black transition-all rounded-xl">
                                            {importing ? 'Restaurando...' : 'Subir Backup Manual (.json)'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}


                    </div>

                    <div className="text-center py-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em]">
                            ContaHogar v2.0 • Cloud Time Machine
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackupPage;
