import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchListHealth,
  fetchImportActivity,
  fetchReviewQueueStats,
  fetchPriorityScores,
  fetchPriorityMatrix,
} from '../api/client';
import type { ListHealth, ReviewQueueStats, PriorityScoreItem, PriorityMatrixPoint } from '../types';
import type { ImportBatch } from '../types';
import { SkeletonPage } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Users, CheckCircle, TrendingUp, Target, Activity } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIER_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  tier_1: { label: 'Tier 1', color: '#0D9488', order: 1 },
  tier_2: { label: 'Tier 2', color: '#3B82F6', order: 2 },
  tier_3: { label: 'Tier 3', color: '#F59E0B', order: 3 },
  untiered: { label: 'Untiered', color: '#CBD5E1', order: 4 },
};

const RANK_BADGE: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  2: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300' },
  3: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
};

const DEFAULT_BADGE = { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'Just now';
}

function tierColor(tier: string | null): string {
  return TIER_CONFIG[tier || 'untiered']?.color ?? '#94A3B8';
}

function tierLabel(tier: string | null): string {
  return TIER_CONFIG[tier || 'untiered']?.label ?? tier ?? 'Untiered';
}

/* ------------------------------------------------------------------ */
/*  Custom Scatter Tooltip                                             */
/* ------------------------------------------------------------------ */

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PriorityMatrixPoint }>;
}

function MatrixTooltip({ active, payload }: ScatterTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs">
      <p className="font-semibold text-gray-900">{d.name}</p>
      <p className="text-gray-500">{d.institution || 'No institution'}</p>
      <div className="flex gap-3 mt-1">
        <span className="text-gray-600">
          Tier: <strong className="text-gray-900">{d.tier_score.toFixed(1)}</strong>
        </span>
        <span className="text-gray-600">
          Priority: <strong className="text-gray-900">{d.priority_score.toFixed(1)}</strong>
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const navigate = useNavigate();

  const [listHealth, setListHealth] = useState<ListHealth | null>(null);
  const [importActivity, setImportActivity] = useState<ImportBatch[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewQueueStats | null>(null);
  const [topPriority, setTopPriority] = useState<PriorityScoreItem[]>([]);
  const [matrixPoints, setMatrixPoints] = useState<PriorityMatrixPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthRes, activityRes, reviewRes, priorityRes, matrixRes] =
          await Promise.all([
            fetchListHealth(),
            fetchImportActivity(),
            fetchReviewQueueStats(),
            fetchPriorityScores({ page: 1, page_size: 5 }).catch(() => ({
              data: { items: [] },
            })),
            fetchPriorityMatrix().catch(() => ({
              data: { points: [] },
            })),
          ]);

        setListHealth(healthRes.data);
        setImportActivity(
          Array.isArray(activityRes.data) ? activityRes.data.slice(0, 5) : [],
        );
        setReviewStats(reviewRes.data);
        setTopPriority(priorityRes.data.items ?? []);
        setMatrixPoints(matrixRes.data.points ?? []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        toast.error('Unable to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */

  const totalPhysicians = listHealth?.total_physicians ?? 0;
  const validatedCount = listHealth?.count_by_status?.validated ?? 0;
  const validatedPct =
    totalPhysicians > 0 ? (validatedCount / totalPhysicians) * 100 : 0;

  const avgPriorityScore =
    matrixPoints.length > 0
      ? matrixPoints.reduce((sum, p) => sum + p.priority_score, 0) /
        matrixPoints.length
      : null;

  const activeEngagements = listHealth
    ? Object.entries(listHealth.count_by_status)
        .filter(([s]) => !['declined', 'archived'].includes(s))
        .reduce((sum, [, c]) => sum + c, 0)
    : 0;

  /* Tier distribution for stacked bar */
  const tierCounts: Record<string, number> = {};
  matrixPoints.forEach((p) => {
    const key = p.tier || 'untiered';
    tierCounts[key] = (tierCounts[key] || 0) + 1;
  });
  const tierKeys = Object.keys(tierCounts).sort(
    (a, b) => (TIER_CONFIG[a]?.order ?? 99) - (TIER_CONFIG[b]?.order ?? 99),
  );
  const tierBarData =
    tierKeys.length > 0
      ? [
          tierKeys.reduce<Record<string, string | number>>(
            (acc, key) => {
              acc[key] = tierCounts[key];
              return acc;
            },
            { name: 'KOL Distribution' },
          ),
        ]
      : [];

  /* Geographic top 10 */
  const stateData = listHealth
    ? Object.entries(listHealth.count_by_state)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    : [];

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return <SkeletonPage />;
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* ---- Page header ---- */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Executive Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Real-time KOL intelligence overview and pipeline metrics
        </p>
      </div>

      {/* ========================================================== */}
      {/*  ROW 1 — KPI Cards                                         */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total KOLs — navy card */}
        <div className="rounded-lg shadow-card p-6 bg-[#1e293b] text-white flex items-center gap-4">
          <div className="flex-shrink-0 p-3 rounded-full bg-white/10">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/60 uppercase tracking-wider">
              Total KOLs
            </p>
            <p className="text-3xl font-bold tracking-tight mt-0.5">
              {totalPhysicians.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Validated % — green left border */}
        <div className="bg-white rounded-lg shadow-card p-6 flex items-center gap-4 border-l-4 border-emerald-500">
          <div className="flex-shrink-0 p-3 rounded-full bg-emerald-50">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Validated</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight mt-0.5">
              {validatedPct.toFixed(1)}
              <span className="text-lg font-semibold text-gray-400 ml-0.5">
                %
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {validatedCount.toLocaleString()} physicians
            </p>
          </div>
        </div>

        {/* Avg Priority Score — brand/teal left border */}
        <div className="bg-white rounded-lg shadow-card p-6 flex items-center gap-4 border-l-4 border-brand-500">
          <div className="flex-shrink-0 p-3 rounded-full bg-brand-50">
            <TrendingUp className="h-6 w-6 text-brand-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Priority Score</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight mt-0.5">
              {avgPriorityScore !== null ? avgPriorityScore.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {matrixPoints.length.toLocaleString()} scored
            </p>
          </div>
        </div>

        {/* Active Engagements — blue left border */}
        <div className="bg-white rounded-lg shadow-card p-6 flex items-center gap-4 border-l-4 border-blue-500">
          <div className="flex-shrink-0 p-3 rounded-full bg-blue-50">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Active Engagements</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight mt-0.5">
              {activeEngagements.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(reviewStats?.total_pending ?? 0).toLocaleString()} pending review
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/*  ROW 2 — Tier Distribution & Priority Matrix Preview        */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tier Distribution — Horizontal Stacked Bar */}
        <div className="bg-white rounded-lg shadow-card p-6">
          <h2 className="text-base font-semibold text-gray-900">
            Tier Distribution
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 mb-5">
            {matrixPoints.length.toLocaleString()} physicians classified
          </p>

          {tierBarData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={64}>
                <BarChart
                  data={tierBarData}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      TIER_CONFIG[name]?.label || name,
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      fontSize: '13px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                  {tierKeys.map((key, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === tierKeys.length - 1;
                    const isOnly = tierKeys.length === 1;
                    let radius: [number, number, number, number] = [0, 0, 0, 0];
                    if (isOnly) radius = [6, 6, 6, 6];
                    else if (isFirst) radius = [6, 0, 0, 6];
                    else if (isLast) radius = [0, 6, 6, 0];

                    return (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="tiers"
                        fill={TIER_CONFIG[key]?.color ?? '#94A3B8'}
                        name={key}
                        radius={radius}
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>

              {/* Legend row */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5">
                {tierKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: TIER_CONFIG[key]?.color ?? '#94A3B8',
                      }}
                    />
                    <span className="text-gray-600">
                      {TIER_CONFIG[key]?.label || key}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {tierCounts[key].toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              No tier data available — run priority scoring to populate
            </div>
          )}
        </div>

        {/* Priority Matrix Preview — Scatter (clickable) */}
        <div
          className="bg-white rounded-lg shadow-card p-6 cursor-pointer group hover:shadow-card-hover transition-shadow"
          onClick={() => navigate('/priority-matrix')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/priority-matrix');
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Priority Matrix
            </h2>
            <span className="text-xs font-medium text-brand-600 group-hover:text-brand-700 transition-colors">
              View Full Matrix &rarr;
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 mb-3">
            Tier score vs. priority score
          </p>

          {matrixPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <ScatterChart
                margin={{ top: 10, right: 10, bottom: 25, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  dataKey="tier_score"
                  name="Tier Score"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  label={{
                    value: 'Tier Score',
                    position: 'insideBottom',
                    offset: -12,
                    style: { fontSize: 10, fill: '#94A3B8' },
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="priority_score"
                  name="Priority Score"
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  label={{
                    value: 'Priority',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 5,
                    style: { fontSize: 10, fill: '#94A3B8' },
                  }}
                />
                <ReferenceLine x={50} stroke="#E2E8F0" strokeDasharray="4 4" />
                <ReferenceLine y={50} stroke="#E2E8F0" strokeDasharray="4 4" />
                <Tooltip content={<MatrixTooltip />} />
                <Scatter data={matrixPoints} shape="circle">
                  {matrixPoints.map((point, idx) => (
                    <Cell
                      key={idx}
                      fill={tierColor(point.tier)}
                      fillOpacity={0.75}
                      r={4}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[230px] text-sm text-gray-400">
              No matrix data available
            </div>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/*  ROW 3 — Top Priority Physicians & Recent Activity          */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Priority Physicians — spans 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-500" />
              <h2 className="text-base font-semibold text-gray-900">
                Top Priority Physicians
              </h2>
            </div>
            <button
              onClick={() => navigate('/priority-matrix')}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              View All &rarr;
            </button>
          </div>

          {topPriority.length > 0 ? (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Physician
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Institution
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider w-24">
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topPriority.map((item, idx) => {
                    const rank = item.priority_rank ?? idx + 1;
                    const badge = RANK_BADGE[rank] || DEFAULT_BADGE;
                    return (
                      <tr
                        key={item.physician_id}
                        className="table-row-hover cursor-pointer border-b border-gray-50 transition-colors"
                        onClick={() => navigate(`/persona/${item.physician_id}`)}
                      >
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-gray-500 truncate max-w-[200px]">
                          {item.institution || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: `${tierColor(item.tier)}15`,
                              color: tierColor(item.tier),
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: tierColor(item.tier),
                              }}
                            />
                            {tierLabel(item.tier)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="text-base font-bold text-gray-900">
                            {item.composite_score.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              No priority scores computed yet
            </div>
          )}
        </div>

        {/* Recent Activity Feed — spans 1 col */}
        <div className="bg-white rounded-lg shadow-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="h-4 w-4 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>

          {importActivity.length > 0 ? (
            <div className="space-y-0">
              {importActivity.map((batch, idx) => (
                <div key={batch.id} className="flex gap-3">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: '#0D9488' }}
                    />
                    {idx < importActivity.length - 1 && (
                      <div className="w-px flex-1 bg-gray-100 mt-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-5 min-w-0">
                    <p
                      className="text-sm font-medium text-gray-900 truncate"
                      title={batch.filename}
                    >
                      {batch.filename}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <span className="font-medium text-brand-700">
                        {batch.new_records.toLocaleString()}
                      </span>{' '}
                      new records &middot;{' '}
                      {batch.total_rows.toLocaleString()} total rows
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                      <span>{batch.uploaded_by}</span>
                      <span>&middot;</span>
                      <span>{batch.team}</span>
                      <span>&middot;</span>
                      <span>{formatRelativeTime(batch.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              No recent import activity
            </div>
          )}
        </div>
      </div>

      {/* ========================================================== */}
      {/*  ROW 4 — Geographic Coverage                                */}
      {/* ========================================================== */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-base font-semibold text-gray-900">
          Geographic Coverage
        </h2>
        <p className="text-xs text-gray-400 mt-0.5 mb-5">
          Top 10 states by physician count
        </p>

        {stateData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stateData}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#F1F5F9"
              />
              <XAxis
                dataKey="state"
                tick={{ fontSize: 12, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [
                  value.toLocaleString(),
                  'Physicians',
                ]}
                contentStyle={{
                  borderRadius: '8px',
                  fontSize: '13px',
                  border: '1px solid #E2E8F0',
                }}
                cursor={{ fill: '#F0FDFA' }}
              />
              <Bar
                dataKey="count"
                name="Physicians"
                fill="#0D9488"
                radius={[4, 4, 0, 0]}
              >
                {stateData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={idx === 0 ? '#0D9488' : idx < 3 ? '#14B8A6' : '#5EEAD4'}
                    fillOpacity={idx === 0 ? 1 : idx < 3 ? 0.85 : 0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
            No geographic data available
          </div>
        )}
      </div>
    </div>
  );
}
