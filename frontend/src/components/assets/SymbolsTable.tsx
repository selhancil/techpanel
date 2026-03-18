import { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { useSymbols, useToggleSymbol, useRemoveSymbol } from '../../hooks/useSymbols';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AssignModal } from './AssignModal';

export function SymbolsTable() {
  const { data: symbols, isLoading } = useSymbols();
  const toggleMutation = useToggleSymbol();
  const removeMutation = useRemoveSymbol();
  const [filter, setFilter] = useState('');
  const [assignTicker, setAssignTicker] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = (symbols ?? []).filter(s =>
    s.ticker.toLowerCase().includes(filter.toLowerCase()) ||
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const assigningSymbol = symbols?.find(s => s.ticker === assignTicker);

  return (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
          <h2 className="text-base font-semibold text-slate-100">Symbols</h2>
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Filter..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Ticker', 'Name', 'Exchange', 'Market', 'Group', 'Status', 'Added', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(sym => (
                  <tr key={sym.ticker} className="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-100">{sym.ticker}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{sym.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{sym.exchange}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setAssignTicker(sym.ticker)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        {sym.market}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setAssignTicker(sym.ticker)}
                        className="text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        {sym.group}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleMutation.mutate(sym.ticker)}
                        className="cursor-pointer"
                      >
                        <Badge variant={sym.active ? 'bullish' : 'bearish'}>
                          {sym.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">{sym.added}</td>
                    <td className="px-4 py-3">
                      {confirmDelete === sym.ticker ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { removeMutation.mutate(sym.ticker); setConfirmDelete(null); }}
                            className="text-xs px-2 py-1 bg-rose-600 text-white rounded cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(sym.ticker)}
                          className="text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assignTicker && assigningSymbol && (
        <AssignModal
          ticker={assignTicker}
          currentMarketId={assigningSymbol.market_id}
          currentGroupIds={assigningSymbol.group_ids}
          onClose={() => setAssignTicker(null)}
        />
      )}
    </>
  );
}
