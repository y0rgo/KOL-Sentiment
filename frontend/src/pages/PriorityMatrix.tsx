import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Target, RefreshCw } from 'lucide-react';
import { fetchPriorityMatrix, fetchPriorityScores, recomputeAllPriorities } from '../api/client';
import type { PriorityMatrixResponse, PriorityScoreItem } from '../types';

const TIER_COLORS: Record<string, string> = {
  global_national: '#6366F1',
  regional_institutional: '#3B82F6',
  local_community: '#22C55E',
  rising_star: '#F59E0B',
  emerging: '#9CA3AF',
};

const TIER_LABELS: Record<string, string> = {
  global_national: 'Global / National',
  regional_institutional: 'Regional / Institutional',
  local_community: 'Local / Community',
  rising_star: 'Rising Star',
  emerging: 'Emerging',
};

const QUADRANT_LABELS = [
  { x: 78, y: 85, label: 'Maintain & Grow', color: '#22C55E' },
  { x: 30, y: 85, label: 'Quick Wins', color: '#F59E0B' },
  { x: 78, y: 25, label: 'Monitor', color: '#3B82F6' },
  { x: 30, y: 25, label: 'Deprioritize', color: '#9CA3AF' },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function MatrixTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-gray-900">{d.name}</p>
      {d.institution && <p className="text-xs text-gray-500">{d.institution}</p>}
      <div className="mt-2 space-y-1 text-xs">
        <p>Tier Score: <span className="font-medium">{d.tier_score?.toFixed(1)}</span></p>
        <p>Priority Score: <span className="font-medium">{d.priority_score?.toFixed(1)}</span></p>
        {d.tier && <p>Tier: <span className="font-medium">{TIER_LABELS[d.tier] || d.tier}</span></p>}
        {d.priority_rank && <p>Rank: <span className="font-medium">#{d.priority_rank}</span></p>}
      </div>
    </div>
  );
}

export default function PriorityMatrix() {
  const navigate = useNavigate();
  const [matrix, setMatrix] = useState<PriorityMatrixResponse | null>(null);
  const [scores, setScores] = useState<PriorityScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [tierFilter, setTierFilter] = useState<string>('');

  const load = async () => {
    try {
      const [matrixRes, scoresRes] = await Promise.all([
        fetchPriorityMatrix(),
        fetchPriorityScores({ page_size: 200 }),
      ]);
      setMatrix(matrixRes.data);
      setScores(scoresRes.data.items);
    } catch (err) {
      console.error('Failed to load priority data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await recomputeAllPriorities();
      await load();
    } catch {
      // ignore
    } finally {
      setRecomputing(false);
    }
  };

  const filteredPoints = matrix?.points.filter(p => !tierFilter || p.tier === tierFilter) || [];
  const filteredScores = scores.filter(s => !tierFilter || s.tier === tierFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const summary = matrix?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Priority Matrix</h1>
        </div>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#1e3a5f] text-white hover:bg-[#16304f] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Recomputing...' : 'Recompute All'}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-xs font-medium text-green-600 uppercase">Maintain & Grow</p>
            <p className="text-2xl font-bold text-green-800 mt-1">{summary.high_priority_high_tier}</p>
            <p className="text-xs text-green-600 mt-0.5">High tier + High priority</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <p className="text-xs font-medium text-amber-600 uppercase">Quick Wins</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">{summary.high_priority_low_tier}</p>
            <p className="text-xs text-amber-600 mt-0.5">Low tier + High priority</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-xs font-medium text-blue-600 uppercase">Monitor</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{summary.low_priority_high_tier}</p>
            <p className="text-xs text-blue-600 mt-0.5">High tier + Low priority</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">Deprioritize</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{summary.low_priority_low_tier}</p>
            <p className="text-xs text-gray-500 mt-0.5">Low tier + Low priority</p>
          </div>
        </div>
      )}

      {/* Scatter Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Tier vs Priority</h2>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40"
          >
            <option value="">All Tiers</option>
            {Object.entries(TIER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="h-[450px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number"
                dataKey="tier_score"
                name="Tier Score"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                label={{ value: 'Tier Score', position: 'bottom', offset: 0, style: { fontSize: 12, fill: '#6b7280' } }}
              />
              <YAxis
                type="number"
                dataKey="priority_score"
                name="Priority Score"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                label={{ value: 'Priority Score', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6b7280' } }}
              />
              <ReferenceLine x={55} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1.5} />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={1.5} />
              <Tooltip content={<MatrixTooltip />} />
              <Scatter
                data={filteredPoints}
                onClick={(data: any) => {
                  if (data?.physician_id) navigate(`/persona/${data.physician_id}`);
                }}
                cursor="pointer"
              >
                {filteredPoints.map((point, idx) => (
                  <Cell
                    key={idx}
                    fill={TIER_COLORS[point.tier || ''] || '#9CA3AF'}
                    r={6}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Quadrant labels overlay */}
        <div className="flex justify-center gap-6 mt-2">
          {Object.entries(TIER_COLORS).map(([tier, color]) => (
            <div key={tier} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {TIER_LABELS[tier] || tier}
            </div>
          ))}
        </div>
      </div>

      {/* Ranked Table */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Priority Rankings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Physician</th>
                <th className="py-2 px-3">Institution</th>
                <th className="py-2 px-3">Tier</th>
                <th className="py-2 px-3 text-right">Tier Score</th>
                <th className="py-2 px-3 text-right">Priority</th>
                <th className="py-2 px-3 text-right">Rx Opp.</th>
                <th className="py-2 px-3 text-right">Influence</th>
                <th className="py-2 px-3 text-right">Sent. Gap</th>
                <th className="py-2 px-3 text-right">Eng. Deficit</th>
                <th className="py-2 px-3 text-right">Comp. Urg.</th>
                <th className="py-2 px-3 text-right">Compl. Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredScores.map((item) => (
                <tr
                  key={item.physician_id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/persona/${item.physician_id}`)}
                >
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                      {item.priority_rank ?? '-'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-gray-900">{item.name}</td>
                  <td className="py-2.5 px-3 text-gray-500 truncate max-w-[160px]">{item.institution || '-'}</td>
                  <td className="py-2.5 px-3">
                    {item.tier && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${TIER_COLORS[item.tier] || '#9CA3AF'}20`,
                          color: TIER_COLORS[item.tier] || '#6B7280',
                        }}
                      >
                        {TIER_LABELS[item.tier] || item.tier}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-700">{item.tier_score?.toFixed(1) ?? '-'}</td>
                  <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{item.composite_score.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{item.prescribing_opportunity.toFixed(0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{item.influence_leverage.toFixed(0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{item.sentiment_gap.toFixed(0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{item.engagement_deficit.toFixed(0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{item.competitive_urgency.toFixed(0)}</td>
                  <td className="py-2.5 px-3 text-right text-gray-600">{item.completeness_gap.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredScores.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8 italic">
            No priority scores computed yet. Click "Recompute All" to generate scores.
          </p>
        )}
      </div>
    </div>
  );
}
