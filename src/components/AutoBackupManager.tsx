import { useEffect, useRef } from 'react';
import { useSnapshots } from '@/hooks/useSnapshots';
import { differenceInCalendarDays, parseISO } from 'date-fns';

export const AutoBackupManager = () => {
  const { snapshots, createSnapshot, isLoading } = useSnapshots();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (isLoading || hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const performAutoBackup = async () => {
      try {
        if (snapshots.length === 0) {
          console.log('[AutoBackup] Creando la primera copia de seguridad automática...');
          await createSnapshot();
          return;
        }

        const latestSnapshot = snapshots[0]; // están ordenadas descendentemente
        const daysSinceLastBackup = differenceInCalendarDays(new Date(), parseISO(latestSnapshot.created_at));

        if (daysSinceLastBackup >= 1) {
          console.log(`[AutoBackup] Han pasado ${daysSinceLastBackup} días desde la última copia. Comprobando cambios...`);
          const result = await createSnapshot();
          if (result?.skipped) {
            console.log('[AutoBackup] Sin cambios respecto a la última copia. No se duplica.');
          }
        }
      } catch (error) {
        console.error('[AutoBackup] Error al realizar la copia automática:', error);
      }
    };

    performAutoBackup();
  }, [snapshots, isLoading, createSnapshot]);

  return null; // Componente invisible
};
