import { useEffect } from 'react';
import { useSnapshots } from '@/hooks/useSnapshots';
import { differenceInDays, parseISO } from 'date-fns';

export const AutoBackupManager = () => {
  const { snapshots, createSnapshot, isLoading } = useSnapshots();

  useEffect(() => {
    if (isLoading) return;

    const performAutoBackup = async () => {
      try {
        if (snapshots.length === 0) {
          // Si no hay copias, hacemos la primera
          console.log('[AutoBackup] Creando la primera copia de seguridad automática...');
          await createSnapshot();
          return;
        }

        const latestSnapshot = snapshots[0]; // están ordenadas descendentemente
        const daysSinceLastBackup = differenceInDays(new Date(), parseISO(latestSnapshot.created_at));

        if (daysSinceLastBackup >= 1) {
          console.log(`[AutoBackup] Han pasado ${daysSinceLastBackup} días desde la última copia. Creando nueva copia...`);
          await createSnapshot();
        }
      } catch (error) {
        console.error('[AutoBackup] Error al realizar la copia automática:', error);
      }
    };

    performAutoBackup();
  }, [snapshots, isLoading, createSnapshot]);

  return null; // Componente invisible
};
