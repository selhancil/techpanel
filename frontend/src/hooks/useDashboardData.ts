import { useQuery } from '@tanstack/react-query';
import { getStatus, getChanges, getMetrics } from '../api/dashboard';

export function useStatus(interval: string, filterType = 'all', filterId?: number) {
  return useQuery({
    queryKey: ['dashboard', 'status', interval, filterType, filterId],
    queryFn: () => getStatus(interval, filterType, filterId),
    refetchInterval: 60_000,
  });
}

export function useChanges(interval: string, days = 5, filterType = 'all', filterId?: number) {
  return useQuery({
    queryKey: ['dashboard', 'changes', interval, days, filterType, filterId],
    queryFn: () => getChanges(interval, days, filterType, filterId),
    refetchInterval: 60_000,
  });
}

export function useMetrics(filterType = 'all', filterId?: number) {
  return useQuery({
    queryKey: ['dashboard', 'metrics', filterType, filterId],
    queryFn: () => getMetrics(filterType, filterId),
    refetchInterval: 60_000,
  });
}
