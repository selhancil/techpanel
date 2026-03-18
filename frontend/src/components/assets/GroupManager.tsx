import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useMarkets, useCreateGroup, useDeleteGroup } from '../../hooks/useMarkets';

export function GroupManager() {
  const { data: markets } = useMarkets();
  const createMutation = useCreateGroup();
  const deleteMutation = useDeleteGroup();
  const [marketId, setMarketId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  const allGroups = markets?.flatMap(m => m.groups.map(g => ({ ...g, marketName: m.name }))) ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketId || !name.trim()) return;
    const res = await createMutation.mutateAsync({ marketId: Number(marketId), name: name.trim() });
    setFeedback({ msg: res.message, ok: res.success });
    if (res.success) setName('');
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await deleteMutation.mutateAsync(Number(deleteId));
    setFeedback({ msg: res.message, ok: res.success });
    if (res.success) setDeleteId('');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Group Management</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form onSubmit={handleCreate} className="space-y-2">
          <select
            value={marketId}
            onChange={e => setMarketId(e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 cursor-pointer"
          >
            <option value="">Select market</option>
            {markets?.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="New group name"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
            />
            <button type="submit" disabled={!marketId} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg disabled:opacity-40 cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </form>
        <div className="flex gap-2 items-start">
          <select
            value={deleteId}
            onChange={e => setDeleteId(e.target.value ? Number(e.target.value) : '')}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 cursor-pointer"
          >
            <option value="">Select to delete</option>
            {allGroups.map(g => (
              <option key={g.id} value={g.id}>{g.marketName} / {g.name}</option>
            ))}
          </select>
          <button onClick={handleDelete} disabled={!deleteId} className="flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm rounded-lg disabled:opacity-40 cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
      {feedback && (
        <p className={`mt-2 text-xs ${feedback.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{feedback.msg}</p>
      )}
    </div>
  );
}
