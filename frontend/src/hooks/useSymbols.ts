import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSymbols, addSymbol, removeSymbol, toggleSymbol, assignSymbol } from '../api/symbols';

export function useSymbols() {
  return useQuery({
    queryKey: ['symbols'],
    queryFn: getSymbols,
  });
}

export function useAddSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addSymbol,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['symbols'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRemoveSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeSymbol,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['symbols'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useToggleSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: toggleSymbol,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['symbols'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAssignSymbol() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticker, marketId, groupIds }: { ticker: string; marketId: number | null; groupIds: number[] }) =>
      assignSymbol(ticker, marketId, groupIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['symbols'] });
      qc.invalidateQueries({ queryKey: ['markets'] });
    },
  });
}
