import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchTierConfig, updateTierConfig, recomputeAllTiers } from '../api/client';
import type { TierWeight } from '../types';
import { Sliders, RefreshCw, Save, CheckCircle, RotateCcw } from 'lucide-react';
import { SkeletonPage } from '../components/ui/Skeleton';

const DIMENSION_LABELS: Record<string, string> = {
  scientific_impact: 'Scientific Impact',
  clinical_authority: 'Clinical Authority',
  peer_influence: 'Peer Influence',
  congress_presence: 'Congress Presence',
  trial_leadership: 'Trial Leadership',
  guideline_editorial_authority: 'Guideline/Editorial Authority',
  digital_advocacy: 'Digital Advocacy',
  industry_recognition: 'Industry Recognition',
};

const DIMENSION_DESCRIPTIONS: Record<string, string> = {
  scientific_impact: 'H-index, citations, first/last author ratio, citations per paper',
  clinical_authority: 'Years in practice, fellowship director, UpToDate author, CME faculty',
  peer_influence: 'Society leadership roles, editorial boards, named lectures',
  congress_presence: 'Congress presentations, keynotes, symposium participation',
  trial_leadership: 'Clinical trial investigator roles (PI, site investigator)',
  guideline_editorial_authority: 'Guideline committee memberships, editorial board seats',
  digital_advocacy: 'Social media presence, digital engagement score',
  industry_recognition: 'Named lectures/awards, patient advocacy roles',
};

const DIMENSION_COLORS: Record<string, string> = {
  scientific_impact: '#6366F1',
  clinical_authority: '#3B82F6',
  peer_influence: '#0D9488',
  congress_presence: '#F59E0B',
  trial_leadership: '#EF4444',
  guideline_editorial_authority: '#8B5CF6',
  digital_advocacy: '#EC4899',
  industry_recognition: '#22C55E',
};

const DEFAULT_WEIGHTS: Record<string, number> = {
  scientific_impact: 15,
  clinical_authority: 15,
  peer_influence: 15,
  congress_presence: 12,
  trial_leadership: 12,
  guideline_editorial_authority: 11,
  digital_advocacy: 10,
  industry_recognition: 10,
};

const TIER_THRESHOLDS = [
  { name: 'Global / National', score: '75+', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { name: 'Regional / Institutional', score: '55-74', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  { name: 'Local / Community', score: '30-54', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  { name: 'Rising Star', score: '30+ & ≤15 yrs', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  { name: 'Emerging', score: '<30', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
];

export default function TierConfig() {
  const [weights, setWeights] = useState<TierWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<{
    total_computed: number;
    tier_distribution: Record<string, number>;
  } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetchTierConfig();
      setWeights(res.data.weights);
    } catch {
      toast.error('Failed to load tier configuration');
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const isBalanced = Math.abs(totalWeight - 100) < 0.5;

  const handleWeightChange = (dimension: string, value: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.dimension === dimension ? { ...w, weight: value } : w))
    );
    setSaved(false);
    setRecomputeResult(null);
  };

  const handleResetDefaults = () => {
    setWeights((prev) =>
      prev.map((w) => ({
        ...w,
        weight: DEFAULT_WEIGHTS[w.dimension] ?? w.weight,
      }))
    );
    setSaved(false);
    setRecomputeResult(null);
    toast.success('Weights reset to defaults');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTierConfig({
        disease_id: null,
        weights: weights.map((w) => ({ dimension: w.dimension, weight: w.weight })),
      });
      setSaved(true);
      toast.success('Weights saved successfully');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Failed to save weights');
    } finally {
      setSaving(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    setRecomputeResult(null);
    try {
      const res = await recomputeAllTiers();
      setRecomputeResult({
        total_computed: res.data.total_computed,
        tier_distribution: res.data.tier_distribution,
      });
      toast.success('Tiers recomputed successfully');
    } catch {
      toast.error('Failed to recompute tiers');
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return <SkeletonPage />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <Sliders className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tier Configuration</h1>
            <p className="text-xs text-gray-500">Configure dimension weights for the 8-dimension tier classification model</p>
          </div>
        </div>

        {/* Balance indicator */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
          isBalanced
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-semibold">
            {totalWeight.toFixed(0)}%
          </span>
          {!isBalanced && <span className="text-xs">(should be 100%)</span>}
        </div>
      </div>

      {/* Weight Distribution Preview */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Weight Distribution</h2>
        <div className="flex h-8 rounded-lg overflow-hidden">
          {weights.map((w) => {
            const pct = totalWeight > 0 ? (w.weight / totalWeight) * 100 : 0;
            if (pct < 1) return null;
            return (
              <div
                key={w.dimension}
                className="transition-all duration-300 flex items-center justify-center"
                style={{
                  width: `${pct}%`,
                  backgroundColor: DIMENSION_COLORS[w.dimension] ?? '#94A3B8',
                }}
                title={`${DIMENSION_LABELS[w.dimension]}: ${w.weight.toFixed(0)}%`}
              >
                {pct > 8 && (
                  <span className="text-[10px] font-bold text-white truncate px-1">
                    {w.weight.toFixed(0)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {weights.map((w) => (
            <div key={w.dimension} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: DIMENSION_COLORS[w.dimension] ?? '#94A3B8' }}
              />
              {DIMENSION_LABELS[w.dimension]}
            </div>
          ))}
        </div>
      </div>

      {/* Weight sliders */}
      <div className="bg-white rounded-lg shadow-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Dimension Weights</h2>
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Defaults
          </button>
        </div>

        {weights.map((w) => (
          <div key={w.dimension} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {DIMENSION_LABELS[w.dimension] || w.dimension}
                </span>
                <p className="text-xs text-gray-400">
                  {DIMENSION_DESCRIPTIONS[w.dimension] || ''}
                </p>
              </div>
              <span
                className="text-sm font-bold min-w-[3rem] text-right"
                style={{ color: DIMENSION_COLORS[w.dimension] ?? '#64748B' }}
              >
                {w.weight.toFixed(0)}%
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={w.weight}
                onChange={(e) => handleWeightChange(w.dimension, Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${DIMENSION_COLORS[w.dimension] ?? '#94A3B8'} ${(w.weight / 50) * 100}%, #E2E8F0 ${(w.weight / 50) * 100}%)`,
                  accentColor: DIMENSION_COLORS[w.dimension] ?? '#94A3B8',
                }}
              />
            </div>
          </div>
        ))}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving || !isBalanced}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4" /> Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Weights'}
              </>
            )}
          </button>

          <button
            onClick={handleRecompute}
            disabled={recomputing}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
            {recomputing ? 'Recomputing...' : 'Recompute All Tiers'}
          </button>
        </div>
      </div>

      {/* Recompute results */}
      {recomputeResult && (
        <div className="bg-white rounded-lg shadow-card p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recompute Results</h3>
          <p className="text-sm text-gray-600 mb-4">
            Recomputed <span className="font-semibold text-brand-600">{recomputeResult.total_computed}</span> validated physicians.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(recomputeResult.tier_distribution).map(([tier, count]) => (
              <div key={tier} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500 capitalize">{tier.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier thresholds info */}
      <div className="bg-white rounded-lg shadow-card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Tier Thresholds</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {TIER_THRESHOLDS.map((tier) => (
            <div key={tier.name} className={`rounded-lg p-3 border ${tier.bg} ${tier.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${tier.dot}`} />
                <span className={`text-xs font-semibold ${tier.text}`}>{tier.name}</span>
              </div>
              <p className={`text-sm font-bold ${tier.text}`}>{tier.score}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
