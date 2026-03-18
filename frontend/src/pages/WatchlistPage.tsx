import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, MoreHorizontal } from 'lucide-react';
import { FilterBar } from '../components/dashboard/FilterBar';
import { CurrentStatusTable } from '../components/dashboard/CurrentStatusTable';
import { useMarkets } from '../hooks/useMarkets';

export function WatchlistPage() {
    const { type, id } = useParams<{ type: string; id: string }>();
    const [interval, setInterval] = useState('1d');
    const [assetCount, setAssetCount] = useState<number>(0);
    const { data: markets } = useMarkets();

    const numericId = parseInt(id || '0', 10);

    const displayName = useMemo(() => {
        if (type === 'all') return 'All Assets';
        if (type === 'unassigned') return 'Unassigned';
        if (!markets) return 'Loading...';

        if (type === 'market') {
            const market = markets.find(m => m.id === numericId);
            return market ? market.name : 'Unknown Market';
        }

        if (type === 'group') {
            for (const m of markets) {
                const group = m.groups.find(g => g.id === numericId);
                if (group) return `${m.name} > ${group.name}`;
            }
            return 'Unknown Group';
        }

        return 'Watchlist';
    }, [type, numericId, markets]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-100">
                        Watchlist: {displayName}
                    </h1>
                    <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-xs font-semibold text-slate-300 border border-slate-700/50">
                        {assetCount} {assetCount === 1 ? 'Asset' : 'Assets'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50 hover:border-slate-600">
                        <MoreHorizontal className="h-4 w-4" />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20">
                        <Plus className="h-4 w-4" />
                        Add Ticker
                    </button>
                </div>
            </div>

            {/* Filter Bar (reusing existing) */}
            <FilterBar interval={interval} onIntervalChange={setInterval} />

            {/* Current Status Table inside a flex column to fill available height */}
            <div className="flex-1 min-h-0 mt-4 overflow-auto">
                <CurrentStatusTable
                    interval={interval}
                    filterType={type}
                    filterId={numericId}
                    onCountChange={setAssetCount}
                />
            </div>
        </div>
    );
}
