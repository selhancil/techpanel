import { api } from './client';
import type { StatusRow, ChangeRow, DashboardMetrics } from '../types';

export async function getStatus(interval = '1d', filterType = 'all', filterId?: number): Promise<StatusRow[]> {
  const { data } = await api.get('/dashboard/status', {
    params: { interval, filter_type: filterType, filter_id: filterId },
  });
  return data;
}

export async function getChanges(interval = '1d', days = 5, filterType = 'all', filterId?: number): Promise<ChangeRow[]> {
  const { data } = await api.get('/dashboard/changes', {
    params: { interval, days, filter_type: filterType, filter_id: filterId },
  });
  return data;
}

export async function getMetrics(filterType = 'all', filterId?: number): Promise<DashboardMetrics> {
  const { data } = await api.get('/dashboard/metrics', {
    params: { filter_type: filterType, filter_id: filterId },
  });
  return data;
}

export async function shutdownServer(): Promise<void> {
  await api.post('/shutdown');
}
