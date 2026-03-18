import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAddSymbol } from '../../hooks/useSymbols';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function AddTickerForm() {
  const [ticker, setTicker] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);
  const mutation = useAddSymbol();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setFeedback(null);
    try {
      const res = await mutation.mutateAsync(ticker.trim().toUpperCase());
      setFeedback({ msg: res.message, ok: res.success });
      if (res.success) setTicker('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error adding ticker';
      setFeedback({ msg, ok: false });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Add Ticker</h3>
      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={ticker}
          onChange={e => setTicker(e.target.value)}
          placeholder="e.g. AAPL, BTC-USD"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
        >
          {mutation.isPending ? <LoadingSpinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          Add
        </button>
      </form>
      {feedback && (
        <p className={`mt-2 text-xs ${feedback.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
