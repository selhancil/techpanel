import { NavLink } from 'react-router-dom';
import { Home, Settings, Folder, ChevronRight, ChevronDown, GripVertical, Power } from 'lucide-react';
import { useMarkets, useReorderGroups } from '../../hooks/useMarkets';
import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
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
import type { GroupOut } from '../../types';

function SortableGroup({ group }: { group: GroupOut }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group/item">
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover/item:opacity-100 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing pl-6 pr-0.5 flex-shrink-0"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <NavLink
        to={`/watchlist/group/${group.id}`}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors group cursor-pointer text-[13px] flex-1 ${isActive
            ? 'bg-slate-800/40 text-emerald-400'
            : 'text-slate-400 hover:bg-slate-800/30 hover:text-emerald-400'
          }`
        }
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700/80 group-hover:bg-emerald-400 transition-colors mr-1"></span>
        <span className="flex-1">{group.name}</span>
        <span className="text-[10px] text-slate-500 font-normal">{group.symbol_count}</span>
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const { data: markets } = useMarkets();
  const reorderMutation = useReorderGroups();
  const [expandedMarkets, setExpandedMarkets] = useState<Record<number, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const toggleMarket = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMarkets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragEnd = (marketId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const market = markets?.find(m => m.id === marketId);
    if (!market) return;

    const oldIndex = market.groups.findIndex(g => g.id === active.id);
    const newIndex = market.groups.findIndex(g => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(market.groups, oldIndex, newIndex);
    reorderMutation.mutate(newOrder.map(g => g.id));
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
      ? 'bg-slate-800/60 text-white border-l-2 border-emerald-500 -ml-[2px]'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
    }`;

  const watchlistItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors group cursor-pointer ${isActive
      ? 'bg-slate-800/60 text-emerald-400'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-emerald-400'
    }`;

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-60 bg-slate-950 border-r border-slate-800/60 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-transparent">
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          TechPanel
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Analysis Dashboard</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          <NavLink to="/" end className={linkClass}>
            <Home className="h-4 w-4" />
            Home
          </NavLink>
        </div>

        {/* Watchlist Section */}
        <div className="px-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
              Watchlist
            </h2>
          </div>

          <div className="space-y-0.5">

            {markets?.map(m => {
              const isExpanded = expandedMarkets[m.id] ?? true;
              return (
                <div key={m.id} className="space-y-0.5">
                  <div className="relative group/market flex items-stretch">
                    <button
                      onClick={(e) => toggleMarket(e, m.id)}
                      className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-center items-center z-10 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                    <NavLink
                      to={`/watchlist/market/${m.id}`}
                      className={({ isActive }) =>
                        `${watchlistItemClass({ isActive })} pl-6 flex-1`
                      }
                    >
                      <Folder className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100" fill="currentColor" fillOpacity={0.1} />
                      <span className="flex-1">{m.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">{m.symbol_count}</span>
                    </NavLink>
                  </div>

                  {isExpanded && m.groups?.length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(m.id)}
                    >
                      <SortableContext
                        items={m.groups.map(g => g.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-0.5 mt-0.5">
                          {m.groups.map(g => (
                            <SortableGroup key={g.id} group={g} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom: Manage Assets */}
      <div className="px-3 pb-4 mt-auto border-t border-slate-800/40 pt-3">
        <NavLink to="/assets" className={linkClass}>
          <Settings className="h-4 w-4" />
          Manage Assets
        </NavLink>
        <button
          onClick={() => {
            if (window.confirm('Sunucuyu kapatmak istediğinize emin misiniz?')) {
              fetch('/api/v1/shutdown', { method: 'POST' }).catch(() => {});
            }
          }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full mt-1"
        >
          <Power className="h-4 w-4" />
          Shut Down
        </button>
        <p className="text-center text-[10px] text-slate-600 mt-3">v2.0.0</p>
      </div>
    </aside>
  );
}
