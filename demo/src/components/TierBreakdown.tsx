import { useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { fetchTierBreakdown, recomputeSingleTier } from '../api/client';
import type { TierBreakdownResponse } from '../types';
import { RefreshCw } from 'lucide-react';

const DIMENSION_LABELS: Record<string, string> = {
  scientific_impact: 'Scientific Impact',
  clinical_authority: 'Clinical Authority',
  peer_influence: 'Peer Influence',
  congress_presence: 'Congress Presence',
  trial_leadership: 'Trial Leadership',
  guideline_editorial_authority: 'Guideline/Editorial',
  digital_advocacy: 'Digital Advocacy',
  industry_recognition: 'Industry Recognition',
};

const TIER_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  global_national: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Global / National' },
  regional_institutional: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Regional / Institutional' },
  local_community: { bg: 'bg-green-100', text: 'text-green-800', label: 'Local / Community' },
  rising_star: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Rising Star' },
  emerging: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Emerging' },
};

export default function TierBreakdown({ physicianId }: { physicianId: string }) {
  const [data, setData] = useState<TierBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    try {
      const res = await fetchTierBreakdown(physicianId);
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [physicianId]);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await recomputeSingleTier(physicianId);
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

  if (!data || data.dimensions.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-400 italic">No tier scores computed yet.</p>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[#1e3a5f] text-white hover:bg-[#16304f] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Computing...' : 'Compute Tier'}
        </button>
      </div>
    );
  }

  const chartData = data.dimensions
    .filter((d: any) => d.has_data !== false)
    .map((d) => ({
      dimension: DIMENSION_LABELS[d.dimension] || d.dimension,
      raw: d.raw_score,
      fullMark: 100,
    }));

  const scoredCount = (data as any).dimensions_scored ?? data.dimensions.filter((d: any) => d.has_data !== false).length;
  const totalDims = data.dimensions.length;

  const tierInfo = TIER_COLORS[data.tier || ''] || TIER_COLORS.emerging;

  return (
    <div className="space-y-4">
      {/* Tier badge + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${tierInfo.bg} ${tierInfo.text}`}>
            {tierInfo.label}
          </span>
          {data.tier_score != null && (
            <span className="text-sm text-gray-600">
              Score: <span className="font-semibold text-gray-800">{data.tier_score.toFixed(1)}</span>/100
              <span className="ml-2 text-xs text-gray-400">({scoredCount}/{totalDims} dimensions)</span>
            </span>
          )}
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

      {/* Radar Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{ fontSize: 10, fill: '#6b7280' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
            />
            <Radar
              name="Score"
              dataKey="raw"
              stroke="#1e3a5f"
              fill="#1e3a5f"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}`, 'Raw Score']}
              contentStyle={{ fontSize: 12 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Dimension detail table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
              <th className="pb-2 pr-4">Dimension</th>
              <th className="pb-2 pr-4 text-right">Raw Score</th>
              <th className="pb-2 text-right">Weighted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.dimensions.map((d: any) => (
              <tr key={d.dimension} className={d.has_data === false ? 'text-gray-300' : 'text-gray-700'}>
                <td className="py-1.5 pr-4 font-medium">
                  {DIMENSION_LABELS[d.dimension] || d.dimension}
                  {d.has_data === false && <span className="ml-1 text-[10px] text-gray-300">(no data)</span>}
                </td>
                <td className="py-1.5 pr-4 text-right">{d.has_data === false ? '-' : d.raw_score.toFixed(1)}</td>
                <td className="py-1.5 text-right">{d.has_data === false ? '-' : d.weighted_score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
