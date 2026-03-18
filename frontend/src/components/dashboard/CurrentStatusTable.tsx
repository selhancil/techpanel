import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, GripVertical, ChevronDown } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStatus, useChanges } from '../../hooks/useDashboardData';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge, getSignalVariant } from '../ui/Badge';

interface Props {
  interval: string;
  filterType?: string;
  filterId?: number;
  onCountChange?: (count: number) => void;
}

function shortenSma(text: string): string {
  if (text.includes('SMA20 Above')) return 'Above';
  if (text.includes('SMA20 Below')) return 'Below';
  return text;
}

function shortenEma(text: string): string {
  if (text.includes('EMA9 Above')) return 'Above';
  if (text.includes('EMA9 Below')) return 'Below';
  return text;
}

function shortenSma200(text: string): string {
  if (text === 'Above SMA200') return 'Above';
  if (text === 'Below SMA200') return 'Below';
  return text;
}

function shortenCloud(text: string): string {
  if (text === 'Above Cloud') return 'Above';
  if (text === 'Below Cloud') return 'Below';
  if (text === 'Inside Cloud') return 'Inside';
  if (text === 'Neutral') return 'Neutral';
  return text;
}

function DetailPanel({ row, changes }: { row: any; changes: any[] }) {
  const indicators = [
    { label: 'RSI (14)', value: row.rsi, zone: row.rsi_zone },
    { label: 'Supertrend', value: row.supertrend, zone: row.supertrend },
    { label: 'SMA 20/50', value: row.sma_cross, zone: row.sma_cross },
    { label: 'EMA 9/21', value: row.ema_cross, zone: row.ema_cross },
    { label: 'Price/SMA200', value: row.price_sma200, zone: row.price_sma200 },
    { label: 'Ichimoku', value: row.ichimoku_cloud, zone: row.ichimoku_cloud },
  ];

  return (
    <tr>
      <td colSpan={10} className="bg-slate-800/60 border-t border-slate-700/50">
        <div className="px-6 py-4 space-y-4">
          {/* Indicator Grid */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Indicators</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {indicators.map(ind => (
                <div key={ind.label} className="bg-slate-900/80 rounded-lg px-3 py-2.5 border border-slate-700/50">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{ind.label}</p>
                  <Badge variant={getSignalVariant(ind.zone)}>{ind.value}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Changes for this ticker */}
          {changes.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Recent Changes (5d)</h4>
              <div className="space-y-1">
                {changes.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1.5 px-3 bg-slate-900/50 rounded-lg">
                    <span className="text-slate-500 tabular-nums w-20 shrink-0">{c.when}</span>
                    <Badge variant={c.signal === 'BUY' ? 'buy' : c.signal === 'SELL' ? 'sell' : 'neutral'}>
                      {c.signal}
                    </Badge>
                    <span className="text-slate-300">{c.change}</span>
                    <span className="text-slate-500 ml-auto tabular-nums">{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info row */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Close: <span className="text-slate-300 font-mono">{row.close}</span></span>
            <span>Updated: <span className="text-slate-300">{row.updated}</span></span>
            {row.market && <span>Market: <span className="text-slate-300">{row.market}</span></span>}
            {row.group && <span>Group: <span className="text-slate-300">{row.group}</span></span>}
          </div>
        </div>
      </td>
    </tr>
  );
}

function SortableRow({ row, changed, isExpanded, onToggle, changes }: {
  row: any;
  changed: Set<string> | undefined;
  isExpanded: boolean;
  onToggle: (ticker: string) => void;
  changes: any[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.ticker });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rowClass = `hover:bg-slate-800/40 transition-colors group cursor-pointer ${isDragging ? 'bg-slate-700 shadow-2xl relative z-50 opacity-100' : ''
    } ${isExpanded ? 'bg-slate-800/30' : ''}`;

  return (
    <>
      <tr ref={setNodeRef} style={style} className={rowClass} onClick={() => onToggle(row.ticker)}>
        <td className="w-8 pl-3 pr-1 py-[10px] sticky left-0 z-20 bg-[url()] bg-slate-900 group-hover:bg-slate-800/40 transition-colors">
          <div {...attributes} {...listeners} className="cursor-grab text-slate-700 opacity-30 group-hover:opacity-100 group-hover:text-slate-400 flex items-center justify-center p-1 rounded hover:bg-slate-700/50 transition-all" onClick={e => e.stopPropagation()}>
            <GripVertical className="h-4 w-4" />
          </div>
        </td>
        <td className="px-3 py-[10px] text-sm font-bold text-white sticky left-8 z-20 bg-[url()] bg-slate-900 group-hover:bg-slate-800/40 transition-colors shadow-[1px_0_0_0_rgba(30,41,59,0.8)]">
          <span className="flex items-center gap-1.5">
            <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
            {row.ticker}
            {changed && changed.size > 0 && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </span>
        </td>
        <td className="px-3 py-[10px] text-sm font-mono text-slate-100 font-medium text-right">
          {row.close}
        </td>
        <td className="px-3 py-[10px] text-center">
          <span className="inline-flex items-center gap-1">
            <Badge variant={getSignalVariant(row.rsi_zone)}>{row.rsi}</Badge>
            {changed?.has('rsi') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </span>
        </td>
        <td className="px-3 py-[10px] text-center">
          <span className="inline-flex items-center gap-1">
            <Badge variant={getSignalVariant(row.supertrend)}>{row.supertrend}</Badge>
            {changed?.has('supertrend') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </span>
        </td>
        <td className="px-3 py-[10px] text-center">
          <span className="inline-flex items-center gap-1">
            <Badge variant={getSignalVariant(row.sma_cross)}>{shortenSma(row.sma_cross)}</Badge>
            {changed?.has('sma_cross') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </span>
        </td>
        <td className="px-3 py-[10px] text-center">
          <span className="inline-flex items-center gap-1">
            <Badge variant={getSignalVariant(row.ema_cross)}>{shortenEma(row.ema_cross)}</Badge>
            {changed?.has('ema_cross') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </span>
        </td>
        <td className="px-3 py-[10px] text-center">
          <span className="inline-flex items-center gap-1">
            <Badge variant={getSignalVariant(row.price_sma200)}>{shortenSma200(row.price_sma200)}</Badge>
            {changed?.has('price_sma200') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </span>
        </td>
        <td className="px-3 py-[10px] text-center">
          <span className="inline-flex items-center gap-1">
            <Badge variant={getSignalVariant(row.ichimoku_cloud)}>{shortenCloud(row.ichimoku_cloud)}</Badge>
            {changed?.has('ichimoku') && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
          </span>
        </td>
        <td className="px-4 py-[10px] text-xs text-slate-500 tabular-nums text-right">
          {row.updated.split(' ')[0]}
        </td>
      </tr>
      {isExpanded && <DetailPanel row={row} changes={changes} />}
    </>
  );
}

interface SubgroupData {
  subgroupName: string;
  rows: any[];
}

interface MarketGroupData {
  marketName: string;
  subgroups: SubgroupData[];
  totalCount: number;
}

function SortableGroup({ groupName, rows, changedIndicators, expandedTicker, onToggle, changeRows }: {
  groupName: string;
  rows: any[];
  changedIndicators: Map<string, Set<string>>;
  expandedTicker: string | null;
  onToggle: (ticker: string) => void;
  changeRows: any[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `group-${groupName}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const groupClass = isDragging ? 'opacity-50' : '';

  return (
    <tbody ref={setNodeRef} style={style} className={`divide-y divide-slate-800/40 ${groupClass} bg-slate-900`}>
      <tr className="bg-slate-800/50 relative z-30 group cursor-grab hover:bg-slate-700/50 transition-colors" {...attributes} {...listeners}>
        <td colSpan={10} className="px-4 py-2 border-y border-slate-700/50 sticky left-0 shadow-[1px_0_0_0_rgba(30,41,59,0.8)]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">{groupName}</span>
            <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full font-medium">{rows.length}</span>
          </div>
        </td>
      </tr>
      <SortableContext items={rows.map(r => r.ticker)} strategy={verticalListSortingStrategy}>
        {rows.map(row => (
          <SortableRow
            key={row.ticker}
            row={row}
            changed={changedIndicators.get(row.ticker)}
            isExpanded={expandedTicker === row.ticker}
            onToggle={onToggle}
            changes={changeRows.filter(c => c.ticker === row.ticker)}
          />
        ))}
      </SortableContext>
    </tbody>
  );
}

function MarketSection({ market, changedIndicators, expandedTicker, onToggle, changeRows }: {
  market: MarketGroupData;
  changedIndicators: Map<string, Set<string>>;
  expandedTicker: string | null;
  onToggle: (ticker: string) => void;
  changeRows: any[];
}) {
  return (
    <>
      {/* Market header */}
      <tbody>
        <tr className="bg-slate-800/80 border-y border-slate-600/50">
          <td colSpan={10} className="px-4 py-2.5 sticky left-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100 uppercase tracking-wide">{market.marketName}</span>
              <span className="text-[10px] text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full font-medium">{market.totalCount}</span>
            </div>
          </td>
        </tr>
      </tbody>
      {/* Subgroups within this market */}
      {market.subgroups.map(sg => (
        <SortableGroup
          key={`${market.marketName}-${sg.subgroupName}`}
          groupName={sg.subgroupName}
          rows={sg.rows}
          changedIndicators={changedIndicators}
          expandedTicker={expandedTicker}
          onToggle={onToggle}
          changeRows={changeRows}
        />
      ))}
    </>
  );
}

export function CurrentStatusTable({ interval, filterType, filterId, onCountChange }: Props) {
  const { data: rows, isLoading } = useStatus(interval, filterType, filterId);
  const { data: changeRows } = useChanges(interval, 5, filterType, filterId);
  const changedIndicators = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of changeRows ?? []) {
      if (!map.has(r.ticker)) map.set(r.ticker, new Set());
      const s = r.change_short;
      if (s.startsWith('RSI')) map.get(r.ticker)!.add('rsi');
      else if (s.includes('Cross')) map.get(r.ticker)!.add('sma_cross');
      else if (s.startsWith('EMA')) map.get(r.ticker)!.add('ema_cross');
      else if (s.startsWith('Supertrend')) map.get(r.ticker)!.add('supertrend');
      else if (s.includes('SMA200')) map.get(r.ticker)!.add('price_sma200');
      else if (s.includes('Cloud')) map.get(r.ticker)!.add('ichimoku');
    }
    return map;
  }, [changeRows]);
  const [filter, setFilter] = useState('');
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const toggleExpand = useCallback((ticker: string) => {
    setExpandedTicker(prev => prev === ticker ? null : ticker);
  }, []);

  // States for retaining drag-and-drop user preferences locally
  const [manualGroupOrder, setManualGroupOrder] = useState<string[]>([]);
  const [manualItemOrder, setManualItemOrder] = useState<string[]>([]);

  const filtered = (rows ?? []).filter(r => {
    if (!r.ticker.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const marketGroups = useMemo((): MarketGroupData[] => {
    // 1. Apply item-level manual sorting
    let sortedItems = [...filtered];
    if (manualItemOrder.length > 0) {
      sortedItems.sort((a, b) => {
        const idxA = manualItemOrder.indexOf(a.ticker);
        const idxB = manualItemOrder.indexOf(b.ticker);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    // 2. Two-level grouping: market → subgroup
    //    A symbol with multiple groups (comma-separated) appears in each group
    const markets: Record<string, Record<string, any[]>> = {};
    sortedItems.forEach(row => {
      const m = row.market || 'Unassigned';
      const groupStr = row.group || 'Unassigned';
      const groupNames = groupStr.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (groupNames.length === 0) groupNames.push('Unassigned');
      for (const g of groupNames) {
        if (!markets[m]) markets[m] = {};
        if (!markets[m][g]) markets[m][g] = [];
        markets[m][g].push(row);
      }
    });

    // 3. Sort market keys
    let marketKeys = Object.keys(markets);
    if (manualGroupOrder.length === 0) {
      marketKeys.sort((a, b) => a.localeCompare(b));
    } else {
      marketKeys.sort((a, b) => {
        const idxA = manualGroupOrder.indexOf(a);
        const idxB = manualGroupOrder.indexOf(b);
        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    // 4. Build result with sorted subgroups
    return marketKeys.map(mKey => {
      const subgroupMap = markets[mKey];
      const subgroupKeys = Object.keys(subgroupMap).sort((a, b) => a.localeCompare(b));
      const subgroups = subgroupKeys.map(sgKey => ({
        subgroupName: sgKey,
        rows: subgroupMap[sgKey],
      }));
      const totalCount = subgroups.reduce((sum, sg) => sum + sg.rows.length, 0);
      return { marketName: mKey, subgroups, totalCount };
    });
  }, [filtered, manualItemOrder, manualGroupOrder]);

  useEffect(() => {
    if (onCountChange) {
      onCountChange(filtered.length);
    }
  }, [filtered.length, onCountChange]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // If dragging a subgroup header
    if (activeIdStr.startsWith('group-') && overIdStr.startsWith('group-')) {
      const g1 = activeIdStr.replace('group-', '');
      const g2 = overIdStr.replace('group-', '');
      const allSubgroups = marketGroups.flatMap((m: MarketGroupData) =>
        m.subgroups.map((sg: SubgroupData) => sg.subgroupName)
      );

      const oldIndex = allSubgroups.indexOf(g1);
      const newIndex = allSubgroups.indexOf(g2);

      const newOrder = arrayMove(allSubgroups, oldIndex, newIndex);
      setManualGroupOrder(newOrder);
      return;
    }

    // If dragging a Ticker row
    if (!activeIdStr.startsWith('group-') && !overIdStr.startsWith('group-')) {
      const t1 = activeIdStr;
      const t2 = overIdStr;

      const oldItems = [...filtered].sort((a, b) => {
        const idxA = manualItemOrder.indexOf(a.ticker);
        const idxB = manualItemOrder.indexOf(b.ticker);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      }).map(r => r.ticker);

      const oldIndex = oldItems.indexOf(t1);
      const newIndex = oldItems.indexOf(t2);

      const newOrder = arrayMove(oldItems, oldIndex, newIndex);
      setManualItemOrder(newOrder);
    }
  };

  return (
    <div className="flex flex-col h-full mb-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60 shrink-0">
        <h2 className="text-base font-semibold text-slate-100 hidden sm:block">
          {filtered.length} Assets
        </h2>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by ticker..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex justify-center items-center py-12">
          <LoadingSpinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto min-h-0 bg-slate-900 border-b border-slate-800">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <table className="w-full text-left whitespace-nowrap min-w-max border-collapse">
              <thead className="sticky top-0 z-30 bg-slate-900 shadow-[0_1px_0_rgba(30,41,59,0.8)]">
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="w-8 pl-3 pr-1 py-3 sticky left-0 z-40 bg-slate-900 border-b border-slate-800/80"></th>
                  <th className="px-3 py-3 sticky left-8 z-40 bg-[url()] bg-slate-900 shadow-[1px_0_0_0_rgba(30,41,59,0.8)] border-b border-slate-800/80">Ticker</th>
                  <th className="px-3 py-3 text-right border-b border-slate-800/80">Close</th>
                  <th className="px-3 py-3 text-center border-b border-slate-800/80">RSI (14)</th>
                  <th className="px-3 py-3 text-center border-b border-slate-800/80">Supertrend</th>
                  <th className="px-3 py-3 text-center border-b border-slate-800/80">SMA 20/50</th>
                  <th className="px-3 py-3 text-center border-b border-slate-800/80">EMA 9/21</th>
                  <th className="px-3 py-3 text-center border-b border-slate-800/80">Price/SMA200</th>
                  <th className="px-3 py-3 text-center border-b border-slate-800/80">Ichimoku</th>
                  <th className="px-4 py-3 text-right border-b border-slate-800/80">Updated</th>
                </tr>
              </thead>
              {marketGroups.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-500 text-sm">
                      {filterType ? 'No assets found for this watchlist.' : 'No data available'}
                    </td>
                  </tr>
                </tbody>
              ) : (
                <SortableContext
                  items={marketGroups.flatMap((m: MarketGroupData) =>
                    m.subgroups.map((sg: SubgroupData) => `group-${sg.subgroupName}`)
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {marketGroups.map((market: MarketGroupData) => (
                    <MarketSection
                      key={market.marketName}
                      market={market}
                      changedIndicators={changedIndicators}
                      expandedTicker={expandedTicker}
                      onToggle={toggleExpand}
                      changeRows={changeRows ?? []}
                    />
                  ))}
                </SortableContext>
              )}
            </table>
          </DndContext>
        </div>
      )}
    </div>
  );
}
