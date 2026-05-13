import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  RotateCcw, 
  Trash2, 
  Clock, 
  Save, 
  Cloud, 
  CloudOff,
  ChevronRight,
  Info
} from 'lucide-react';
import { getLocalSnapshots, saveLocalSnapshot, deleteLocalSnapshot, DataSnapshot, saveData, loadData } from '@/lib/storage';
import { formatCurrency } from '@/lib/calculations';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const BackupVault = () => {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<DataSnapshot[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSnapshots(getLocalSnapshots());
  }, []);

  const handleCreateSnapshot = () => {
    setIsSaving(true);
    try {
      const currentData = loadData();
      const updated = saveLocalSnapshot(currentData, `Punto de restauración`);
      setSnapshots(updated);
      toast.success('Instantánea creada correctamente en la bóveda');
    } catch (e) {
      toast.error('Error al crear la instantánea');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = (snapshot: DataSnapshot) => {
    if (window.confirm(`¿Estás seguro de restaurar la copia del ${format(parseISO(snapshot.date), "d 'de' MMMM, HH:mm", { locale: es })}? Se perderán los datos actuales.`)) {
      saveData(snapshot.data);
      toast.success('Datos restaurados correctamente');
      setTimeout(() => navigate('/'), 1000);
    }
  };

  const handleDelete = (id: string) => {
    const updated = deleteLocalSnapshot(id);
    setSnapshots(updated);
    toast.success('Histórico eliminado');
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-primary/5 dark:bg-primary/10 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
          <Database className="w-20 h-20" />
        </div>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Bóveda de Seguridad
          </CardTitle>
          <CardDescription className="text-xs font-medium">
            Gestiona puntos de restauración internos y sincronización con la nube.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCreateSnapshot} 
            disabled={isSaving}
            className="w-full h-14 rounded-2xl gap-3 font-black text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Save className="w-6 h-6 animate-pulse" />
            {isSaving ? 'Guardando...' : 'Crear Punto de Restauración'}
          </Button>

          <div className="mt-4 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10 flex gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-relaxed font-bold">
                Las instantáneas se guardan localmente. Si borras los datos del navegador, las perderás. Úsalas para volver atrás rápidamente tras un error.
              </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Historial Reciente
            </h3>
            <Badge variant="secondary" className="font-black text-[10px] rounded-full">
                {snapshots.length} / 10
            </Badge>
        </div>

        {snapshots.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-muted rounded-3xl">
            <p className="text-sm text-muted-foreground font-medium">No hay copias en la bóveda todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.map((s) => (
              <Card key={s.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-foreground capitalize truncate">
                          {format(parseISO(s.date), "MMMM d, HH:mm", { locale: es })}
                        </span>
                        <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-tighter">
                          Local
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold">
                        <span className="flex items-center gap-1">
                          {s.summary.totalTransactions} trans.
                        </span>
                        <Separator orientation="vertical" className="h-2" />
                        <span className="text-green-600 dark:text-green-500 font-black">
                          {formatCurrency(s.summary.totalBalance)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-xl hover:bg-primary/5 text-primary"
                        onClick={() => handleRestore(s)}
                        title="Restaurar esta copia"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-9 w-9 rounded-xl hover:bg-destructive/5 text-destructive"
                        onClick={() => handleDelete(s.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator className="my-6 opacity-50" />

      {/* Cloud Sync Placeholder */}
      <Card className="border-2 border-dashed border-muted bg-transparent opacity-80 overflow-hidden relative">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-black flex items-center gap-2 opacity-50">
            <Cloud className="w-5 h-5" />
            Sincronización en la Nube
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col items-center py-6 text-center space-y-4">
                <div className="p-4 bg-muted rounded-full">
                    <CloudOff className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-bold">¿Quieres conectar con el hosting?</p>
                    <p className="text-xs text-muted-foreground px-4">
                        Esto permitirá que tus copias de seguridad aparezcan automáticamente en otros dispositivos.
                    </p>
                </div>
                <Button variant="outline" className="gap-2 border-primary/20 text-primary font-bold rounded-xl h-10 px-6">
                    Configurar Hosting (Supabase/Firebase)
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </CardContent>
      </Card>
      
      <div className="h-10" />
    </div>
  );
};

export default BackupVault;
