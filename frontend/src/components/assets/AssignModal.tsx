import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useMarkets } from '../../hooks/useMarkets';
import { useAssignSymbol } from '../../hooks/useSymbols';

interface Props {
  ticker: string;
  currentMarketId: number | null;
  currentGroupIds: number[];
  onClose: () => void;
}

export function AssignModal({ ticker, currentMarketId, currentGroupIds, onClose }: Props) {
  const { data: markets } = useMarkets();
  const assignMutation = useAssignSymbol();
  const [marketId, setMarketId] = useState<number | null>(currentMarketId);
  const [groupIds, setGroupIds] = useState<number[]>(currentGroupIds);

  const selectedMarket = markets?.find(m => m.id === marketId);
  const groups = selectedMarket?.groups ?? [];

  useEffect(() => {
    if (marketId !== currentMarketId) {
      setGroupIds([]);
    }
  }, [marketId, currentMarketId]);

  const toggleGroup = (gid: number) => {
    setGroupIds(prev =>
      prev.includes(gid) ? prev.filter(id => id !== gid) : [...prev, gid]
    );
  };

  const handleSave = async () => {
    await assignMutation.mutateAsync({ ticker, marketId, groupIds });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-96 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">
            Assign <span className="text-emerald-400">{ticker}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Market</label>
            <select
              value={marketId ?? ''}
              onChange={e => setMarketId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 cursor-pointer"
            >
              <option value="">None</option>
              {markets?.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Groups {groupIds.length > 0 && <span className="text-emerald-400">({groupIds.length})</span>}
            </label>
            {!marketId ? (
              <p className="text-xs text-slate-500">Select a market first</p>
            ) : groups.length === 0 ? (
              <p className="text-xs text-slate-500">No groups in this market</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {groups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => toggleGroup(g.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      groupIds.includes(g.id)
                        ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                      groupIds.includes(g.id) ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}>
                      {groupIds.includes(g.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={assignMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
