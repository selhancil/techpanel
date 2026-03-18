import { useState } from 'react';
import { Search } from 'lucide-react';
import { useChanges } from '../../hooks/useDashboardData';
import { Badge, getSignalVariant } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface Props {
  interval: string;
}

export function RecentlyChangedTable({ interval }: Props) {
  const { data: rows, isLoading } = useChanges(interval);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filtered = (rows ?? []).filter(r =>
    r.ticker.toLowerCase().includes(filter.toLowerCase()) ||
    r.change_short.toLowerCase().includes(filter.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
        <h2 className="text-base font-semibold text-slate-100">
          Recently Changed
          <span className="ml-2 text-xs font-normal text-slate-500">Last 5 Days</span>
        </h2>
        <div className="relative w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(0); }}
            className="w-full bg-slate-800 border border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner className="h-6 w-6" />
        </div>
      ) : paged.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No indicator changes in the last 5 days.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Ticker', 'When', 'Change', 'Signal', 'Value'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 ${i === 4 ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((row, idx) => {
                  const isBuy = row.signal === 'BUY';
                  const isSell = row.signal === 'SELL';
                  const rowBg = isBuy
                    ? 'bg-emerald-500/[0.04]'
                    : isSell
                      ? 'bg-rose-500/[0.04]'
                      : '';

                  return (
                    <tr
                      key={`${row.ticker}-${idx}`}
                      className={`border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors ${rowBg}`}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-slate-100">
                        {row.ticker}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {row.when}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={getSignalVariant(row.change_short)}>
                          {row.change_short}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {row.signal !== '—' ? (
                          <Badge variant={row.signal === 'BUY' ? 'buy' : 'sell'}>
                            {row.signal}
                          </Badge>
                        ) : (
                          <span className="text-sm text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right tabular-nums font-mono text-slate-300">
                        {row.value}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800/60">
              <span className="text-xs text-slate-500">
                {filtered.length} results
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs rounded bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-3 py-1 text-xs text-slate-500">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-xs rounded bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
