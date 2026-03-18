import { RefreshCw } from 'lucide-react';
import { useSync } from '../hooks/useMarkets';
import { AddTickerForm } from '../components/assets/AddTickerForm';
import { MarketManager } from '../components/assets/MarketManager';
import { GroupManager } from '../components/assets/GroupManager';
import { SymbolsTable } from '../components/assets/SymbolsTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function AssetsPage() {
  const syncMutation = useSync();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Manage Assets</h1>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {syncMutation.isPending ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync All Data
        </button>
      </div>

      {syncMutation.isSuccess && (
        <div className="mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
          {syncMutation.data?.message}
        </div>
      )}

      <AddTickerForm />
      <MarketManager />
      <GroupManager />
      <SymbolsTable />
    </div>
  );
}
