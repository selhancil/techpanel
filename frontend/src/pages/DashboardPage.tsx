import { useState } from 'react';
import { KpiCards } from '../components/dashboard/KpiCards';
import { FilterBar } from '../components/dashboard/FilterBar';
import { RecentlyChangedTable } from '../components/dashboard/RecentlyChangedTable';

export function DashboardPage() {
  const [interval, setInterval] = useState('1d');

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Home</h1>
      <KpiCards />
      <FilterBar interval={interval} onIntervalChange={setInterval} />
      <RecentlyChangedTable interval={interval} />
    </div>
  );
}
