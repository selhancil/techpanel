import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMarkets, createMarket, deleteMarket, createGroup, deleteGroup, reorderGroups, triggerSync } from '../api/markets';

export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: getMarkets,
  });
}

export function useCreateMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMarket,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markets'] }),
  });
}

export function useDeleteMarket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMarket,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['markets'] });
      qc.invalidateQueries({ queryKey: ['symbols'] });
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ marketId, name }: { marketId: number; name: string }) => createGroup(marketId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markets'] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['markets'] });
      qc.invalidateQueries({ queryKey: ['symbols'] });
    },
  });
}

export function useReorderGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderGroups,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['markets'] }),
  });
}

export function useSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['dashboard'] });
        qc.invalidateQueries({ queryKey: ['symbols'] });
      }, 5000);
    },
  });
}
