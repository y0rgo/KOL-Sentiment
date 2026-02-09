import { useState, useEffect } from 'react';
import { fetchTierConfig, updateTierConfig, recomputeAllTiers } from '../api/client';
import type { TierWeight } from '../types';
import { Sliders, RefreshCw, Save, CheckCircle } from 'lucide-react';

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
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  const handleWeightChange = (dimension: string, value: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.dimension === dimension ? { ...w, weight: value } : w))
    );
    setSaved(false);
    setRecomputeResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTierConfig({
        disease_id: null,
        weights: weights.map((w) => ({ dimension: w.dimension, weight: w.weight })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Failed to save weights.');
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
    } catch {
      alert('Failed to recompute tiers.');
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2A4A]">Tier Configuration</h1>
        <p className="text-gray-500 mt-1">
          Configure dimension weights for the 8-dimension tier classification model
        </p>
      </div>

      {/* Weight sliders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Sliders className="w-5 h-5 text-teal-600" />
          <h3 className="font-semibold text-[#1B2A4A]">Dimension Weights</h3>
          <span
            className={`ml-auto text-sm font-medium ${
              Math.abs(totalWeight - 100) < 0.5 ? 'text-green-600' : 'text-red-500'
            }`}
          >
            Total: {totalWeight.toFixed(0)}%
            {Math.abs(totalWeight - 100) >= 0.5 && ' (should be 100%)'}
          </span>
        </div>

        {weights.map((w) => (
          <div key={w.dimension} className="space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {DIMENSION_LABELS[w.dimension] || w.dimension}
                </span>
                <p className="text-xs text-gray-400">
                  {DIMENSION_DESCRIPTIONS[w.dimension] || ''}
                </p>
              </div>
              <span className="text-sm font-semibold text-[#1B2A4A] min-w-[3rem] text-right">
                {w.weight.toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={1}
              value={w.weight}
              onChange={(e) => handleWeightChange(w.dimension, Number(e.target.value))}
              className="w-full accent-[#1e3a5f]"
            />
          </div>
        ))}

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving || Math.abs(totalWeight - 100) >= 0.5}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-[#1e3a5f] text-white hover:bg-[#16304f] disabled:opacity-50 transition-colors"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${recomputing ? 'animate-spin' : ''}`} />
            {recomputing ? 'Recomputing...' : 'Recompute All Tiers'}
          </button>
        </div>
      </div>

      {/* Recompute results */}
      {recomputeResult && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-[#1B2A4A] mb-4">Recompute Results</h3>
          <p className="text-sm text-gray-600 mb-4">
            Recomputed <span className="font-semibold">{recomputeResult.total_computed}</span> validated physicians.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Object.entries(recomputeResult.tier_distribution).map(([tier, count]) => (
              <div key={tier} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[#1B2A4A]">{count}</div>
                <div className="text-xs text-gray-500 capitalize">{tier.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier thresholds info */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-[#1B2A4A] mb-4">Tier Thresholds</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="bg-indigo-50 rounded-lg p-3">
            <div className="font-semibold text-indigo-800">Global / National</div>
            <div className="text-indigo-600">Score &ge; 75</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="font-semibold text-blue-800">Regional / Institutional</div>
            <div className="text-blue-600">Score &ge; 55</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="font-semibold text-green-800">Local / Community</div>
            <div className="text-green-600">Score &ge; 30</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="font-semibold text-amber-800">Rising Star</div>
            <div className="text-amber-600">&le; 15 yrs + Score &ge; 30</div>
          </div>
        </div>
      </div>
    </div>
  );
}
