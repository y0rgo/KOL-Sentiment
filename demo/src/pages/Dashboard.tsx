import { useState, useEffect } from 'react';
import { fetchListHealth, fetchImportActivity, fetchReviewQueueStats } from '../api/client';
import type { ListHealth, ReviewQueueStats } from '../types';
import type { ImportBatch } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Users, CheckCircle, Clock, BarChart3, TrendingUp } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  imported: '#3B82F6',
  discovered: '#8B5CF6',
  nominated: '#F59E0B',
  under_review: '#F97316',
  validated: '#22C55E',
  declined: '#EF4444',
  archived: '#6B7280',
};

const COLORS = Object.values(STATUS_COLORS);

const STATUS_LABELS: Record<string, string> = {
  imported: 'Imported',
  discovered: 'Discovered',
  nominated: 'Nominated',
  under_review: 'Under Review',
  validated: 'Validated',
  declined: 'Declined',
  archived: 'Archived',
};

const COMPLETENESS_BUCKETS = [
  { label: '0\u201325%', key: '0-25' },
  { label: '25\u201350%', key: '25-50' },
  { label: '50\u201375%', key: '50-75' },
  { label: '75\u2013100%', key: '75-100' },
];

const BUCKET_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#22C55E'];

/* ------------------------------------------------------------------ */
/*  Custom Pie label renderer                                          */
/* ------------------------------------------------------------------ */

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: PieLabelProps) => {
  if (percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs"
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [listHealth, setListHealth] = useState<ListHealth | null>(null);
  const [importActivity, setImportActivity] = useState<ImportBatch[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewQueueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [healthRes, activityRes, reviewRes] = await Promise.all([
          fetchListHealth(),
          fetchImportActivity(),
          fetchReviewQueueStats(),
        ]);
        setListHealth(healthRes.data);
        setImportActivity(Array.isArray(activityRes.data) ? activityRes.data.slice(0, 5) : []);
        setReviewStats(reviewRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ---- Derived data ---- */

  const statusData = listHealth
    ? Object.entries(listHealth.count_by_status).map(([status, value]) => ({
        name: STATUS_LABELS[status] || status,
        value,
        color: STATUS_COLORS[status] || '#9CA3AF',
      }))
    : [];

  const sourceData = listHealth
    ? Object.entries(listHealth.count_by_source)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    : [];

  const completenessData = listHealth
    ? COMPLETENESS_BUCKETS.map((bucket, idx) => ({
        name: bucket.label,
        count: listHealth.completeness_distribution[bucket.key] ?? 0,
        fill: BUCKET_COLORS[idx],
      }))
    : [];

  const stateData = listHealth
    ? Object.entries(listHealth.count_by_state)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    : [];

  const validatedCount = listHealth?.count_by_status?.validated ?? 0;
  const pendingReview = reviewStats?.total_pending ?? 0;

  /* ---- Loading state ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  /* ---- Render ---- */

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* ROW 1 - Big Number Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg shadow-sm p-6 bg-[#1e293b] text-white flex items-center gap-4">
          <div className="flex-shrink-0 p-3 rounded-full bg-white/10">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70">Total Physicians</p>
            <p className="text-3xl font-bold">{listHealth?.total_physicians?.toLocaleString() ?? '\u2014'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-4 border-l-4 border-green-500">
          <div className="flex-shrink-0 p-3 rounded-full bg-green-50">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Validated</p>
            <p className="text-3xl font-bold text-gray-900">{validatedCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-4 border-l-4 border-orange-500">
          <div className="flex-shrink-0 p-3 rounded-full bg-orange-50">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Review</p>
            <p className="text-3xl font-bold text-gray-900">{pendingReview.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center gap-4 border-l-4 border-teal-500">
          <div className="flex-shrink-0 p-3 rounded-full bg-teal-50">
            <TrendingUp className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Avg Completeness</p>
            <p className="text-3xl font-bold text-gray-900">
              {listHealth ? `${Math.round(listHealth.average_completeness)}%` : '\u2014'}
            </p>
          </div>
        </div>
      </div>

      {/* ROW 2 - Status Distribution & Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h2>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={renderCustomLabel}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-16">No status data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Source Breakdown</h2>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={sourceData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                />
                <Bar dataKey="value" name="Physicians" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-16">No source data available</p>
          )}
        </div>
      </div>

      {/* ROW 3 - Completeness Distribution & State Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Completeness Distribution</h2>
          {completenessData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={completenessData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString()}
                  contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
                />
                <Bar dataKey="count" name="Physicians" radius={[4, 4, 0, 0]}>
                  {completenessData.map((entry, index) => (
                    <Cell key={`comp-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-16">No completeness data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">State Coverage (Top 15)</h2>
          {stateData.length > 0 ? (
            <div className="overflow-y-auto max-h-[300px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">#</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600">State</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Count</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-600">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {stateData.map((row, idx) => {
                    const total = listHealth?.total_physicians ?? 1;
                    const pct = ((row.count / total) * 100).toFixed(1);
                    return (
                      <tr
                        key={row.state}
                        className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{row.state}</td>
                        <td className="py-2 px-3 text-right text-gray-700">
                          {row.count.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-500">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-16">No state data available</p>
          )}
        </div>
      </div>

      {/* ROW 4 - Recent Import Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Import Activity</h2>
        {importActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Filename</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Team</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Uploaded By</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">New Records</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-600">Total Rows</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {importActivity.map((batch, idx) => (
                  <tr
                    key={batch.id}
                    className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className="py-2 px-3 text-gray-900 font-medium truncate max-w-[200px]">
                      {batch.filename}
                    </td>
                    <td className="py-2 px-3 text-gray-700">{batch.team}</td>
                    <td className="py-2 px-3 text-gray-700">{batch.uploaded_by}</td>
                    <td className="py-2 px-3 text-right text-gray-700">
                      {batch.new_records.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700">
                      {batch.total_rows.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(batch.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No import batches recorded yet</p>
        )}
      </div>
    </div>
  );
}
