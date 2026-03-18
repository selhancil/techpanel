import { api } from './client';
import type { SymbolRow, SearchResult, MessageResponse } from '../types';

export async function getSymbols(): Promise<SymbolRow[]> {
  const { data } = await api.get('/symbols');
  return data;
}

export async function searchSymbols(q: string): Promise<SearchResult[]> {
  const { data } = await api.get('/symbols/search', { params: { q } });
  return data;
}

export async function addSymbol(ticker: string): Promise<MessageResponse> {
  const { data } = await api.post('/symbols', null, { params: { ticker } });
  return data;
}

export async function removeSymbol(ticker: string): Promise<MessageResponse> {
  const { data } = await api.delete(`/symbols/${ticker}`);
  return data;
}

export async function toggleSymbol(ticker: string): Promise<MessageResponse> {
  const { data } = await api.patch(`/symbols/${ticker}/toggle`);
  return data;
}

export async function assignSymbol(ticker: string, marketId: number | null, groupIds: number[]): Promise<MessageResponse> {
  const { data } = await api.patch(`/symbols/${ticker}/assign`, null, {
    params: { market_id: marketId, group_ids: groupIds },
    paramsSerializer: { indexes: null },
  });
  return data;
}
