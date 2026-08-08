import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSnapshots, getSnapshotData, createSnapshotFromCloud, CloudSnapshotSummary } from '@/api/local/snapshots';
import { FinanceData } from '@/types/finance';

export const useSnapshots = () => {
  const queryClient = useQueryClient();

  const { data: snapshots = [], isLoading, error } = useQuery({
    queryKey: ['cloud_snapshots'],
    queryFn: getSnapshots,
  });

  const { mutateAsync: createSnapshot } = useMutation({
    mutationFn: createSnapshotFromCloud,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cloud_snapshots'] });
    },
  });

  return {
    snapshots,
    isLoading,
    error,
    createSnapshot,
    getSnapshotData,
  };
};
