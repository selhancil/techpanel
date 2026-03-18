import { ArrowUpRight, BarChart3, TrendingUp, Layers, Activity } from 'lucide-react';
import { useMetrics } from '../../hooks/useDashboardData';

export function KpiCards() {
  const { data: metrics, isLoading } = useMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse h-28" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  const sentimentColor =
    metrics.market_sentiment.label === 'Bullish'
      ? 'text-emerald-400'
      : metrics.market_sentiment.label === 'Bearish'
        ? 'text-rose-400'
        : 'text-slate-400';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      {/* Buy Signals */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Buy Signals
          </span>
          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-emerald-400">{metrics.daily_new_buy_signals}</p>
        <p className="text-xs text-slate-500 mt-1">Today</p>
      </div>

      {/* Top Gainer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Top Gainer
          </span>
          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
        {metrics.top_gainer ? (
          <>
            <p className="text-3xl font-bold text-slate-100">{metrics.top_gainer.ticker}</p>
            <p className={`text-sm font-semibold tabular-nums mt-1 ${metrics.top_gainer.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {metrics.top_gainer.change_pct >= 0 ? '+' : ''}
              {metrics.top_gainer.change_pct}%
            </p>
          </>
        ) : (
          <p className="text-xl text-slate-500">—</p>
        )}
      </div>

      {/* Market Sentiment */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Market Sentiment
          </span>
          <div className="p-1.5 bg-slate-500/10 rounded-lg">
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </div>
        </div>
        <p className={`text-3xl font-bold ${sentimentColor}`}>
          {metrics.market_sentiment.label}
        </p>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Bullish {metrics.market_sentiment.bullish_pct}%</span>
            <span>Bearish {metrics.market_sentiment.bearish_pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="bg-emerald-500 rounded-full transition-all"
              style={{ width: `${metrics.market_sentiment.bullish_pct}%` }}
            />
            <div
              className="bg-rose-500 rounded-full transition-all"
              style={{ width: `${metrics.market_sentiment.bearish_pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Total Assets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Assets
          </span>
          <div className="p-1.5 bg-blue-500/10 rounded-lg">
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-blue-400">{metrics.total_assets}</p>
        <p className="text-xs text-slate-500 mt-1">Tracked</p>
      </div>

      {/* Recent Changes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Recent Changes
          </span>
          <div className="p-1.5 bg-amber-500/10 rounded-lg">
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
        </div>
        <p className="text-3xl font-bold text-amber-400">{metrics.recent_changes}</p>
        <p className="text-xs text-slate-500 mt-1">Last 5 days</p>
      </div>
    </div>
  );
}
