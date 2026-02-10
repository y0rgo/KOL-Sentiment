import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
import { SkeletonPage } from '../components/ui/Skeleton';
import { TierBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';

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

const QUADRANT_NAMES = [
  { label: 'Strategic Targets', x: 77.5, y: 80, color: '#0D9488' },
  { label: 'Rising Opportunities', x: 27.5, y: 80, color: '#F59E0B' },
  { label: 'Maintain & Nurture', x: 77.5, y: 25, color: '#3B82F6' },
  { label: 'Monitor', x: 27.5, y: 25, color: '#9CA3AF' },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function MatrixTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-100 p-3 text-sm max-w-[240px]">
      <p className="font-semibold text-gray-900">{d.name}</p>
      {d.institution && <p className="text-xs text-gray-500 mt-0.5">{d.institution}</p>}
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-gray-500">Tier Score</span>
        <span className="font-medium text-right">{d.tier_score?.toFixed(1)}</span>
        <span className="text-gray-500">Priority</span>
        <span className="font-medium text-right">{d.priority_score?.toFixed(1)}</span>
        {d.tier && (
          <>
            <span className="text-gray-500">Tier</span>
            <span className="font-medium text-right">{TIER_LABELS[d.tier] || d.tier}</span>
          </>
        )}
        {d.priority_rank && (
          <>
            <span className="text-gray-500">Rank</span>
            <span className="font-medium text-right">#{d.priority_rank}</span>
          </>
        )}
      </div>
    </div>
  );
}

function MiniBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 min-w-[2rem] text-right">{value.toFixed(0)}</span>
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
    } catch {
      toast.error('Failed to load priority data');
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
      toast.success('Priorities recomputed successfully');
    } catch {
      toast.error('Failed to recompute priorities');
    } finally {
      setRecomputing(false);
    }
  };

  const filteredPoints = matrix?.points.filter(p => !tierFilter || p.tier === tierFilter) || [];
  const filteredScores = scores.filter(s => !tierFilter || s.tier === tierFilter);

  if (loading) return <SkeletonPage />;

  const summary = matrix?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <Target className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Priority Matrix</h1>
            <p className="text-xs text-gray-500">Tier classification vs engagement priority</p>
          </div>
        </div>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? 'Recomputing...' : 'Recompute All'}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Strategic Targets', count: summary.high_priority_high_tier, desc: 'High tier + High priority', color: 'brand', bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-700' },
            { label: 'Rising Opportunities', count: summary.high_priority_low_tier, desc: 'Low tier + High priority', color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
            { label: 'Maintain & Nurture', count: summary.low_priority_high_tier, desc: 'High tier + Low priority', color: 'blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
            { label: 'Monitor', count: summary.low_priority_low_tier, desc: 'Low tier + Low priority', color: 'gray', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
          ].map((card) => (
            <div key={card.label} className={`${card.bg} rounded-lg p-4 border ${card.border}`}>
              <p className={`text-[10px] font-semibold ${card.text} uppercase tracking-wider`}>{card.label}</p>
              <p className={`text-2xl font-bold ${card.text} mt-1`}>{card.count}</p>
              <p className={`text-[11px] ${card.text} opacity-70 mt-0.5`}>{card.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scatter Chart */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Tier Score vs Priority Score</h2>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          >
            <option value="">All Tiers</option>
            {Object.entries(TIER_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="relative h-[480px]">
          {/* Quadrant background labels */}
          <div className="absolute inset-0 pointer-events-none z-0">
            <div className="absolute right-[10%] top-[8%] text-brand-500/10 text-lg font-bold">Strategic Targets</div>
            <div className="absolute left-[5%] top-[8%] text-amber-500/10 text-lg font-bold">Rising Opportunities</div>
            <div className="absolute right-[10%] bottom-[12%] text-blue-500/10 text-lg font-bold">Maintain & Nurture</div>
            <div className="absolute left-[5%] bottom-[12%] text-gray-400/10 text-lg font-bold">Monitor</div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                dataKey="tier_score"
                name="Tier Score"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                label={{ value: 'Tier Score', position: 'bottom', offset: 10, style: { fontSize: 12, fill: '#64748b', fontWeight: 500 } }}
              />
              <YAxis
                type="number"
                dataKey="priority_score"
                name="Priority Score"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                label={{ value: 'Priority Score', angle: -90, position: 'insideLeft', offset: 5, style: { fontSize: 12, fill: '#64748b', fontWeight: 500 } }}
              />
              <ReferenceLine x={55} stroke="#cbd5e1" strokeDasharray="8 4" strokeWidth={1} />
              <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="8 4" strokeWidth={1} />
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
                    r={7}
                    opacity={0.85}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 pt-3 border-t border-gray-100">
          {Object.entries(TIER_COLORS).map(([tier, color]) => (
            <div key={tier} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {TIER_LABELS[tier] || tier}
            </div>
          ))}
        </div>
      </div>

      {/* Ranked Table */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Priority Rankings</h2>
        {filteredScores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Rank', 'Physician', 'Institution', 'Tier', 'Tier Score', 'Priority', 'Rx Opp.', 'Influence', 'Sent. Gap', 'Eng. Deficit', 'Comp. Urg.', 'Compl. Gap'].map((h, i) => (
                    <th key={h} className={`py-2.5 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider ${i >= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredScores.map((item, idx) => (
                  <tr
                    key={item.physician_id}
                    className={`table-row-hover cursor-pointer transition-colors border-b border-gray-50 ${idx % 2 === 0 ? 'bg-gray-50/30' : ''}`}
                    onClick={() => navigate(`/persona/${item.physician_id}`)}
                  >
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-50 text-brand-700 text-xs font-bold">
                        {item.priority_rank ?? '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{item.name}</td>
                    <td className="py-2.5 px-3 text-gray-500 truncate max-w-[160px]">{item.institution || '-'}</td>
                    <td className="py-2.5 px-3"><TierBadge tier={item.tier} /></td>
                    <td className="py-2.5 px-3 text-right text-gray-600">{item.tier_score?.toFixed(1) ?? '-'}</td>
                    <td className="py-2.5 px-3 text-right">
                      <MiniBar value={item.composite_score} />
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{item.prescribing_opportunity.toFixed(0)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{item.influence_leverage.toFixed(0)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{item.sentiment_gap.toFixed(0)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{item.engagement_deficit.toFixed(0)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{item.competitive_urgency.toFixed(0)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{item.completeness_gap.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="No priority scores yet"
            description="Click Recompute All to calculate priority scores for all validated physicians."
            actionLabel="Recompute All"
            onAction={handleRecompute}
          />
        )}
      </div>
    </div>
  );
}
