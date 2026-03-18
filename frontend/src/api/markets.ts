import { api } from './client';
import type { MarketOut, MessageResponse } from '../types';

export async function getMarkets(): Promise<MarketOut[]> {
  const { data } = await api.get('/markets');
  return data;
}

export async function createMarket(name: string): Promise<MessageResponse> {
  const { data } = await api.post('/markets', null, { params: { name } });
  return data;
}

export async function deleteMarket(marketId: number): Promise<MessageResponse> {
  const { data } = await api.delete(`/markets/${marketId}`);
  return data;
}

export async function createGroup(marketId: number, name: string): Promise<MessageResponse> {
  const { data } = await api.post('/groups', null, { params: { market_id: marketId, name } });
  return data;
}

export async function deleteGroup(groupId: number): Promise<MessageResponse> {
  const { data } = await api.delete(`/groups/${groupId}`);
  return data;
}

export async function reorderGroups(groupIds: number[]): Promise<MessageResponse> {
  const { data } = await api.patch('/groups/reorder', { group_ids: groupIds });
  return data;
}

export async function triggerSync(): Promise<MessageResponse> {
  const { data } = await api.post('/sync');
  return data;
}
