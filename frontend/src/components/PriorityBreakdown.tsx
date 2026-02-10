import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { fetchPriorityBreakdown, recomputeSinglePriority } from '../api/client';
import type { PriorityBreakdownResponse } from '../types';
import { RefreshCw } from 'lucide-react';

const FACTOR_COLORS: Record<string, string> = {
  prescribing_opportunity: '#6366F1',
  influence_leverage: '#3B82F6',
  sentiment_gap: '#F59E0B',
  engagement_deficit: '#EF4444',
  competitive_urgency: '#8B5CF6',
  completeness_gap: '#14B8A6',
};

export default function PriorityBreakdown({ physicianId }: { physicianId: string }) {
  const [data, setData] = useState<PriorityBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    try {
      const res = await fetchPriorityBreakdown(physicianId);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [physicianId]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await recomputeSinglePriority(physicianId);
      await load();
    } catch {
      // ignore
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a5f]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-400 italic">No priority scores computed yet.</p>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[#1e3a5f] text-white hover:bg-[#16304f] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Computing...' : 'Compute Priority'}
        </button>
      </div>
    );
  }

  const chartData = data.factors.map((f) => ({
    name: f.label,
    score: f.score,
    factor: f.factor,
  }));

  return (
    <div className="space-y-4">
      {/* Score + Rank header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {data.priority_rank && (
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">
              #{data.priority_rank}
            </span>
          )}
          <span className="text-sm text-gray-600">
            Score: <span className="font-semibold text-gray-800">{data.composite_score.toFixed(1)}</span>/100
            <span className="ml-2 text-xs text-gray-400">({data.factors_scored}/6 factors)</span>
          </span>
        </div>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Recomputing...' : 'Recompute'}
        </button>
      </div>

      {/* Horizontal Bar Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              width={95}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}`, 'Score']}
              contentStyle={{ fontSize: 12, borderRadius: '8px' }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={18}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={FACTOR_COLORS[entry.factor] || '#6366F1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Factor detail table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
              <th className="pb-2 pr-4">Factor</th>
              <th className="pb-2 text-right">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.factors.map((f) => (
              <tr key={f.factor} className="text-gray-700">
                <td className="py-1.5 pr-4 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: FACTOR_COLORS[f.factor] || '#6366F1' }}
                    />
                    {f.label}
                  </span>
                </td>
                <td className="py-1.5 text-right">{f.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
