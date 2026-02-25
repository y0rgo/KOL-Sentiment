import { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Play,
  Key,
  Clock,
  FileText,
  Unlock,
  Lock,
} from 'lucide-react';
import {
  fetchDataSources,
  testDataSource,
  sampleDataSource,
  fetchIngestionRuns,
  fetchAccessReport,
} from '../api/client';
import type { DataSource, IngestionRun, AccessReport } from '../types';
import { SkeletonPage } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  connected: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Connected' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Error' },
  disconnected: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Disconnected' },
  untested: { icon: HelpCircle, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Untested' },
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DataSources() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [runs, setRuns] = useState<IngestionRun[]>([]);
  const [accessReport, setAccessReport] = useState<AccessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingSource, setTestingSource] = useState<string | null>(null);
  const [samplingSource, setSamplingSource] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [srcRes, runRes, arRes] = await Promise.all([
          fetchDataSources(),
          fetchIngestionRuns({ page_size: 10 }),
          fetchAccessReport().catch(() => ({ data: null })),
        ]);
        setSources(srcRes.data);
        setRuns(runRes.data.items || []);
        if (arRes.data) setAccessReport(arRes.data);
      } catch (err) {
        console.error('Failed to load data sources', err);
        toast.error('Failed to load data sources');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleTest = async (name: string) => {
    setTestingSource(name);
    try {
      const res = await testDataSource(name);
      if (res.data.ok) {
        toast.success(`${name}: ${res.data.message}`);
      } else {
        toast.error(`${name}: ${res.data.message}`);
      }
      // Refresh sources
      const srcRes = await fetchDataSources();
      setSources(srcRes.data);
    } catch (err) {
      toast.error(`Failed to test ${name}`);
    } finally {
      setTestingSource(null);
    }
  };

  const handleSample = async (name: string) => {
    setSamplingSource(name);
    try {
      const res = await sampleDataSource(name, 10);
      const run = res.data as IngestionRun;
      toast.success(
        `${name}: fetched ${run.records_fetched}, new ${run.records_new}, updated ${run.records_updated}`
      );
      // Refresh runs
      const runRes = await fetchIngestionRuns({ page_size: 10 });
      setRuns(runRes.data.items || []);
      // Refresh access report in case unpaywall ran
      try {
        const arRes = await fetchAccessReport();
        setAccessReport(arRes.data);
      } catch { /* ignore */ }
    } catch (err) {
      toast.error(`Sample pull failed for ${name}`);
    } finally {
      setSamplingSource(null);
    }
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Data Sources</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect to external APIs for publications, trials, payments, and physician data
        </p>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sources.map((source) => {
          const statusCfg = STATUS_CONFIG[source.status] || STATUS_CONFIG.untested;
          const StatusIcon = statusCfg.icon;
          const isTesting = testingSource === source.name;
          const isSampling = samplingSource === source.name;

          return (
            <div key={source.name} className="bg-white rounded-lg shadow-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Database size={20} className="text-brand-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{source.display_name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{source.name}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                  <StatusIcon size={12} />
                  {statusCfg.label}
                </span>
              </div>

              {/* Info row */}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Tested: {formatRelativeTime(source.last_tested_at)}
                </span>
                {source.api_key_required && (
                  <span className={`flex items-center gap-1 ${source.api_key_configured ? 'text-emerald-600' : 'text-amber-500'}`}>
                    <Key size={12} />
                    {source.api_key_configured ? 'Key configured' : 'Key optional'}
                  </span>
                )}
                {source.rate_limit_info?.requests_per_second && (
                  <span className="text-gray-400">
                    {source.rate_limit_info.requests_per_second} req/s
                  </span>
                )}
              </div>

              {source.last_error_message && (
                <p className="mt-2 text-xs text-red-500 bg-red-50 rounded px-2 py-1 truncate">
                  {source.last_error_message}
                </p>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleTest(source.name)}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={12} className={isTesting ? 'animate-spin' : ''} />
                  {isTesting ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={() => handleSample(source.name)}
                  disabled={isSampling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
                >
                  <Play size={12} className={isSampling ? 'animate-pulse' : ''} />
                  {isSampling ? 'Pulling...' : 'Sample Pull'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Runs */}
      <div className="bg-white rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Ingestion Runs</h2>
        </div>
        {runs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No ingestion runs yet. Test a source and run a sample pull to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3 text-left">Source</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Fetched</th>
                  <th className="px-5 py-3 text-right">New</th>
                  <th className="px-5 py-3 text-right">Updated</th>
                  <th className="px-5 py-3 text-right">Errors</th>
                  <th className="px-5 py-3 text-left">Started</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="table-row-hover border-b border-gray-50">
                    <td className="px-5 py-3 text-gray-900 font-medium">
                      {run.source_name || run.data_source_id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        run.run_type === 'sample' ? 'bg-blue-50 text-blue-700' :
                        run.run_type === 'full' ? 'bg-purple-50 text-purple-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {run.run_type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        run.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        run.status === 'failed' ? 'bg-red-50 text-red-700' :
                        run.status === 'running' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{run.records_fetched}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-medium">{run.records_new}</td>
                    <td className="px-5 py-3 text-right text-blue-600">{run.records_updated}</td>
                    <td className="px-5 py-3 text-right text-red-500">{run.records_errors}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatRelativeTime(run.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Access Report */}
      <div className="bg-white rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Publication Access Report</h2>
          {accessReport && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FileText size={12} />
                {accessReport.summary.total_publications} total
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <Unlock size={12} />
                {accessReport.summary.total_open_access} open access
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <Lock size={12} />
                {accessReport.summary.total_checked - accessReport.summary.total_open_access} paywalled
              </span>
            </div>
          )}
        </div>
        {!accessReport || accessReport.journals.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No access data yet. Run an Unpaywall sample pull after ingesting publications.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-5 py-3 text-left">Journal</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Open Access</th>
                  <th className="px-5 py-3 text-right">OA %</th>
                  <th className="px-5 py-3 text-right">Paywalled</th>
                  <th className="px-5 py-3 text-right">Unchecked</th>
                </tr>
              </thead>
              <tbody>
                {accessReport.journals.map((j) => (
                  <tr key={j.journal} className="table-row-hover border-b border-gray-50">
                    <td className="px-5 py-3 text-gray-900 font-medium max-w-[250px] truncate">
                      {j.journal}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-600">{j.total}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-medium">{j.open_access}</td>
                    <td className="px-5 py-3 text-right">
                      {j.oa_percent !== null ? (
                        <span className={j.oa_percent >= 50 ? 'text-emerald-600' : 'text-amber-600'}>
                          {j.oa_percent}%
                        </span>
                      ) : (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-red-500">{j.paywalled}</td>
                    <td className="px-5 py-3 text-right text-gray-400">{j.unchecked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
