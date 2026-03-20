import { useState, useRef } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, AlertTriangle } from 'lucide-react';
import { loadData, saveData, migrateData } from '@/lib/storage';
import { FinanceData } from '@/types/finance';
import { toast } from 'sonner';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: () => void;
}

const DataManagementModal = ({ isOpen, onClose, onDataImported }: DataManagementModalProps) => {
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
      a.download = `mis-finanzas-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Datos exportados correctamente');
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
        throw new Error('Formato inválido. Tipos: acc:' + !!Array.isArray(importedData.accounts) + ' tx:' + !!Array.isArray(importedData.transactions) + ' cat:' + !!Array.isArray(importedData.categories) + ' bdg:' + !!Array.isArray(importedData.budgets));
      }

      // Validate transactions after migration
      for (const t of importedData.transactions) {
        if (!t.id || !t.date || typeof t.amount !== 'number' || !t.type || !t.category) {
          throw new Error('Transacción inválida en el archivo');
        }
        // Ensure isPending is correctly typed
        if (typeof t.isPending !== 'boolean') {
          t.isPending = false;
        }
      }

      saveData(importedData);
      onDataImported();
      toast.success('Datos importados correctamente');
      onClose();
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error(error instanceof Error ? error.message : 'Error al importar los datos');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[400px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Gestionar Datos</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <div className="py-4 space-y-4">
          {/* Export Section */}
          <div className="p-4 border border-border rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar Datos
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Descarga una copia de seguridad de todos tus datos en formato JSON.
            </p>
            <Button onClick={handleExport} className="w-full">
              Descargar Backup
            </Button>
          </div>

          {/* Import Section */}
          <div className="p-4 border border-border rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importar Datos
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Restaura tus datos desde un archivo de backup.
            </p>
            <div className="p-3 bg-destructive/10 rounded-md mb-3">
              <p className="text-xs text-destructive flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Importar reemplazará todos los datos actuales. Esta acción no se puede deshacer.</span>
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
              variant="outline" 
              className="w-full"
              disabled={importing}
            >
              {importing ? 'Importando...' : 'Seleccionar Archivo'}
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};

export default DataManagementModal;
