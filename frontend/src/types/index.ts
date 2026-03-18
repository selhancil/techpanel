export interface StatusRow {
  ticker: string;
  group?: string;
  market?: string;
  close: string;
  rsi: string;
  rsi_zone: string;
  supertrend: string;
  sma_cross: string;
  ema_cross: string;
  price_sma200: string;
  ichimoku_cloud: string;
  updated: string;
}

export interface ChangeRow {
  ticker: string;
  when: string;
  change: string;
  change_short: string;
  signal: string;
  value: string;
}

export interface TopGainer {
  ticker: string;
  change_pct: number;
}

export interface MarketSentiment {
  label: string;
  bullish_pct: number;
  bearish_pct: number;
}

export interface DashboardMetrics {
  daily_new_buy_signals: number;
  top_gainer: TopGainer | null;
  market_sentiment: MarketSentiment;
  total_assets: number;
  recent_changes: number;
}

export interface SymbolRow {
  ticker: string;
  name: string;
  exchange: string;
  market: string;
  market_id: number | null;
  group: string;
  group_ids: number[];
  status: string;
  active: boolean;
  added: string;
}

export interface GroupOut {
  id: number;
  name: string;
  symbol_count: number;
}

export interface MarketOut {
  id: number;
  name: string;
  display_order: number;
  symbol_count: number;
  groups: GroupOut[];
}

export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}
