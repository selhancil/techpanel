import { RefreshCw } from 'lucide-react';
import { useSync } from '../../hooks/useMarkets';

const TIMEFRAMES = [
  { label: '1 Day', value: '1d' },
  { label: '1 Hour', value: '1h' },
  { label: '15 Min', value: '15m' },
];

interface FilterBarProps {
  interval: string;
  onIntervalChange: (interval: string) => void;
}

export function FilterBar({ interval, onIntervalChange }: FilterBarProps) {
  const syncMutation = useSync();

  return (
    <div className="flex items-center gap-3 mb-5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Timeframe
      </label>
      <select
        value={interval}
        onChange={e => onIntervalChange(e.target.value)}
        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-slate-500 cursor-pointer"
      >
        {TIMEFRAMES.map(tf => (
          <option key={tf.value} value={tf.value}>{tf.label}</option>
        ))}
      </select>
      <button
        onClick={() => syncMutation.mutate()}
        disabled={syncMutation.isPending}
        className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
        {syncMutation.isPending ? 'Syncing...' : 'Refresh'}
      </button>
    </div>
  );
}
