import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPersona, createSentimentScore, createEngagement } from '../api/client';
import type { Persona, SentimentScore } from '../types';
import { formatDate } from '../utils/formatters';
import { STATUS_COLORS } from '../utils/statusUtils';
import {
  ArrowLeft,
  User,
  Stethoscope,
  BookOpen,
  Award,
  Shield,
  Heart,
  MessageSquare,
  Plus,
  X,
  Target,
} from 'lucide-react';
import TierBreakdown from '../components/TierBreakdown';
import PriorityBreakdown from '../components/PriorityBreakdown';

/* ------------------------------------------------------------------ */
/*  Tier badge helper                                                  */
/* ------------------------------------------------------------------ */
const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  platinum: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  gold: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  silver: { bg: 'bg-gray-200', text: 'text-gray-700' },
  bronze: { bg: 'bg-orange-100', text: 'text-orange-800' },
};

function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const style = TIER_STYLES[tier.toLowerCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style.bg} ${style.text}`}>
      {tier}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */
function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.imported;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {status.replace('_', ' ')}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable domain card wrapper                                       */
/* ------------------------------------------------------------------ */
function DomainCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <Icon className="h-5 w-5 text-[#1e3a5f]" />
        <h3 className="text-base font-semibold text-[#1e3a5f]">{title}</h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sentiment gauge (1-5)                                              */
/* ------------------------------------------------------------------ */
function SentimentGauge({ label, value }: { label: string; value: number | null }) {
  const safeVal = value ?? 0;
  const pct = (safeVal / 5) * 100;
  const color =
    safeVal >= 4 ? 'bg-green-500' : safeVal >= 3 ? 'bg-yellow-500' : safeVal >= 1 ? 'bg-red-500' : 'bg-gray-300';
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-800">{safeVal > 0 ? safeVal.toFixed(1) : '-'}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Conversion stage badge                                             */
/* ------------------------------------------------------------------ */
function ConversionBadge({ stage }: { stage: string | null }) {
  if (!stage) return null;
  const map: Record<string, string> = {
    unaware: 'bg-gray-100 text-gray-700',
    aware: 'bg-blue-100 text-blue-700',
    interested: 'bg-cyan-100 text-cyan-700',
    evaluating: 'bg-yellow-100 text-yellow-700',
    trialing: 'bg-orange-100 text-orange-700',
    adopting: 'bg-green-100 text-green-700',
    advocating: 'bg-emerald-100 text-emerald-700',
  };
  const cls = map[stage.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {stage}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
function Empty({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 italic">{message}</p>;
}

/* ================================================================== */
/*  PersonaView component                                              */
/* ================================================================== */
export default function PersonaView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Sentiment modal state */
  const [sentimentOpen, setSentimentOpen] = useState(false);
  const [sentimentForm, setSentimentForm] = useState({
    disease_belief_score: 3,
    product_perception_score: 3,
    behavioral_readiness_score: 3,
    scored_by: '',
    notes: '',
  });
  const [sentimentSubmitting, setSentimentSubmitting] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Fetch persona                                                    */
  /* ---------------------------------------------------------------- */
  const loadPersona = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPersona(id);
      setPersona(res.data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('Physician not found.');
      } else {
        setError('Failed to load persona.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPersona();
  }, [loadPersona]);

  /* ---------------------------------------------------------------- */
  /*  Sentiment submit                                                 */
  /* ---------------------------------------------------------------- */
  const handleSentimentSubmit = async () => {
    if (!id) return;
    setSentimentSubmitting(true);
    try {
      await createSentimentScore({
        physician_id: id,
        assessment_date: new Date().toISOString().split('T')[0],
        disease_belief_score: sentimentForm.disease_belief_score,
        product_perception_score: sentimentForm.product_perception_score,
        behavioral_readiness_score: sentimentForm.behavioral_readiness_score,
        scored_by: sentimentForm.scored_by || 'anonymous',
        notes: sentimentForm.notes || null,
      });
      setSentimentOpen(false);
      setSentimentForm({
        disease_belief_score: 3,
        product_perception_score: 3,
        behavioral_readiness_score: 3,
        scored_by: '',
        notes: '',
      });
      await loadPersona();
    } catch {
      alert('Failed to record sentiment score.');
    } finally {
      setSentimentSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Loading / Error states                                           */
  /* ---------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a5f]" />
          <p className="text-sm text-gray-500">Loading persona...</p>
        </div>
      </div>
    );
  }

  if (error || !persona) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-red-600 font-medium">{error ?? 'Physician not found.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-[#1e3a5f] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Derived data                                                     */
  /* ---------------------------------------------------------------- */
  const phy = persona.identity;
  const fullName = `${phy.first_name} ${phy.last_name}`;
  const latestSentiment: SentimentScore | null =
    persona.sentiment.length > 0 ? persona.sentiment[0] : null;

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ------ Back button ------ */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* ========================================================== */}
      {/*  Header card                                                */}
      {/* ========================================================== */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Left: name, credentials, location */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {fullName}
              {phy.credentials && (
                <span className="ml-2 text-lg font-normal text-gray-500">{phy.credentials}</span>
              )}
            </h1>
            {phy.institution_name && (
              <p className="text-sm text-gray-600">{phy.institution_name}</p>
            )}
            {(phy.city || phy.state) && (
              <p className="text-sm text-gray-500">
                {[phy.city, phy.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          {/* Right: badges */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={phy.record_status} />
            <TierBadge tier={phy.tier} />
          </div>
        </div>

        {/* Completeness bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Profile completeness</span>
            <span className="text-xs font-semibold text-gray-700">{Math.round(phy.completeness_score)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-[#1e3a5f] transition-all"
              style={{ width: `${phy.completeness_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================== */}
      {/*  Domain cards grid                                          */}
      {/* ========================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* -------------------------------------------------------- */}
        {/*  1. Identity                                              */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={User} title="Identity">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {([
              ['NPI', phy.npi],
              ['Specialty', phy.specialty],
              ['Subspecialty', phy.subspecialty],
              ['Practice Type', phy.practice_type],
              ['Institution', phy.institution_name],
              ['Institution Type', phy.institution_type],
              ['City / State', [phy.city, phy.state].filter(Boolean).join(', ') || null],
              ['Region', phy.region],
              ['Country', phy.country],
              ['Years in Practice', phy.years_in_practice?.toString() ?? null],
              ['Fellowship Training', phy.fellowship_training],
              ['Institutional Role', phy.institutional_role],
            ] as [string, string | null][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-400 text-xs font-medium uppercase tracking-wide">{label}</dt>
                <dd className="mt-0.5 text-gray-800 font-medium">{value || <span className="text-gray-300">-</span>}</dd>
              </div>
            ))}
          </dl>
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  1b. Tier Breakdown                                       */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={Target} title="Tier Breakdown">
          {id ? <TierBreakdown physicianId={id} /> : <p className="text-sm text-gray-400">No physician selected</p>}
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  1c. Priority Breakdown                                   */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={Target} title="Priority Breakdown">
          {id ? <PriorityBreakdown physicianId={id} /> : <p className="text-sm text-gray-400">No physician selected</p>}
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  2. Prescribing                                           */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={Stethoscope} title="Prescribing">
          {persona.prescribing.length === 0 ? (
            <Empty message="No prescribing data yet" />
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Period</th>
                    <th className="pb-2 pr-4">Patients</th>
                    <th className="pb-2 pr-4">New Starts</th>
                    <th className="pb-2">Formulation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {persona.prescribing.map((rx: any, i: number) => (
                    <tr key={i} className="text-gray-700">
                      <td className="py-2 pr-4 font-medium">{rx.period ?? '-'}</td>
                      <td className="py-2 pr-4">{rx.patients ?? '-'}</td>
                      <td className="py-2 pr-4">{rx.new_starts ?? '-'}</td>
                      <td className="py-2">{rx.formulation ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  3. Research & Publications                                */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={BookOpen} title="Research & Publications">
          {persona.publications.length === 0 ? (
            <Empty message="No publications yet" />
          ) : (
            <ul className="space-y-4">
              {persona.publications.map((pub: any, i: number) => (
                <li key={i} className="border-l-2 border-[#1e3a5f]/20 pl-4">
                  <p className="text-sm font-medium text-gray-800">{pub.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pub.journal && <span>{pub.journal}</span>}
                    {pub.date && <span> &middot; {formatDate(pub.date)}</span>}
                    {pub.impact_factor != null && (
                      <span> &middot; IF {pub.impact_factor}</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  4. Influence & Congress                                   */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={Award} title="Influence & Congress">
          {persona.congress.length === 0 && persona.trials.length === 0 ? (
            <Empty message="No congress activity yet" />
          ) : (
            <div className="space-y-5">
              {persona.congress.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Congress Activity</h4>
                  <ul className="space-y-3">
                    {persona.congress.map((c: any, i: number) => (
                      <li key={i} className="text-sm text-gray-700">
                        <p className="font-medium">{c.congress_name ?? c.name ?? 'Congress'}</p>
                        <p className="text-xs text-gray-500">
                          {c.role && <span>{c.role}</span>}
                          {c.year && <span> &middot; {c.year}</span>}
                          {c.presentation_type && <span> &middot; {c.presentation_type}</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {persona.trials.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Clinical Trials</h4>
                  <ul className="space-y-3">
                    {persona.trials.map((t: any, i: number) => (
                      <li key={i} className="text-sm text-gray-700">
                        <p className="font-medium">{t.trial_name ?? t.name ?? 'Trial'}</p>
                        <p className="text-xs text-gray-500">
                          {t.role && <span>{t.role}</span>}
                          {t.phase && <span> &middot; Phase {t.phase}</span>}
                          {t.status && <span> &middot; {t.status}</span>}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  5. Competitive Intelligence                               */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={Shield} title="Competitive Intelligence">
          {persona.competitive.length === 0 ? (
            <Empty message="No competitive data yet" />
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <th className="pb-2 pr-4">Company</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Product</th>
                    <th className="pb-2 pr-4">Year</th>
                    <th className="pb-2">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {persona.competitive.map((c: any, i: number) => (
                    <tr key={i} className="text-gray-700">
                      <td className="py-2 pr-4 font-medium">{c.company ?? '-'}</td>
                      <td className="py-2 pr-4">{c.type ?? c.affiliation_type ?? '-'}</td>
                      <td className="py-2 pr-4">{c.product ?? '-'}</td>
                      <td className="py-2 pr-4">{c.year ?? '-'}</td>
                      <td className="py-2">{c.payment != null ? `$${Number(c.payment).toLocaleString()}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  6. Sentiment                                              */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={Heart} title="Sentiment">
          <div className="space-y-5">
            {/* Latest score gauges */}
            {latestSentiment ? (
              <>
                <div className="flex flex-wrap gap-4">
                  <SentimentGauge label="Disease Belief" value={latestSentiment.disease_belief_score} />
                  <SentimentGauge label="Product Perception" value={latestSentiment.product_perception_score} />
                  <SentimentGauge label="Behavioral Readiness" value={latestSentiment.behavioral_readiness_score} />
                </div>
                <div className="flex items-center gap-3">
                  {latestSentiment.composite_score != null && (
                    <span className="text-sm text-gray-600">
                      Composite: <span className="font-semibold text-gray-800">{latestSentiment.composite_score.toFixed(1)}</span>
                    </span>
                  )}
                  <ConversionBadge stage={latestSentiment.conversion_stage} />
                </div>
              </>
            ) : (
              <Empty message="No sentiment scores yet" />
            )}

            {/* Record sentiment button */}
            <button
              onClick={() => setSentimentOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-[#1e3a5f] text-white hover:bg-[#16304f] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Record Sentiment
            </button>

            {/* Sentiment history */}
            {persona.sentiment.length > 1 && (
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">History</h4>
                <ul className="space-y-2">
                  {persona.sentiment.slice(1).map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm text-gray-600">
                      <span>{formatDate(s.assessment_date)}</span>
                      <span className="flex items-center gap-2">
                        <span title="Disease Belief">DB {s.disease_belief_score ?? '-'}</span>
                        <span className="text-gray-300">|</span>
                        <span title="Product Perception">PP {s.product_perception_score ?? '-'}</span>
                        <span className="text-gray-300">|</span>
                        <span title="Behavioral Readiness">BR {s.behavioral_readiness_score ?? '-'}</span>
                        {s.composite_score != null && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="font-medium text-gray-700">{s.composite_score.toFixed(1)}</span>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DomainCard>

        {/* -------------------------------------------------------- */}
        {/*  7. Engagements                                            */}
        {/* -------------------------------------------------------- */}
        <DomainCard icon={MessageSquare} title="Engagements">
          {persona.engagements.length === 0 ? (
            <Empty message="No engagements yet" />
          ) : (
            <ul className="space-y-3">
              {persona.engagements.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex-shrink-0 h-2 w-2 rounded-full bg-[#1e3a5f]/40" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 capitalize">{e.engagement_type.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(e.engagement_date)}
                      {e.channel && <span> &middot; {e.channel}</span>}
                      {e.topic && <span> &middot; {e.topic}</span>}
                      {e.duration_minutes != null && <span> &middot; {e.duration_minutes} min</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DomainCard>
      </div>

      {/* ========================================================== */}
      {/*  Sentiment Modal                                             */}
      {/* ========================================================== */}
      {sentimentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSentimentOpen(false)}
          />

          {/* modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            {/* header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1e3a5f]">Record Sentiment</h3>
              <button
                onClick={() => setSentimentOpen(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Disease Belief slider */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Disease Belief</span>
                <span className="font-semibold text-[#1e3a5f]">{sentimentForm.disease_belief_score}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={sentimentForm.disease_belief_score}
                onChange={(e) =>
                  setSentimentForm((f) => ({ ...f, disease_belief_score: Number(e.target.value) }))
                }
                className="w-full accent-[#1e3a5f]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            {/* Product Perception slider */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Product Perception</span>
                <span className="font-semibold text-[#1e3a5f]">{sentimentForm.product_perception_score}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={sentimentForm.product_perception_score}
                onChange={(e) =>
                  setSentimentForm((f) => ({ ...f, product_perception_score: Number(e.target.value) }))
                }
                className="w-full accent-[#1e3a5f]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            {/* Behavioral Readiness slider */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Behavioral Readiness</span>
                <span className="font-semibold text-[#1e3a5f]">{sentimentForm.behavioral_readiness_score}</span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={sentimentForm.behavioral_readiness_score}
                onChange={(e) =>
                  setSentimentForm((f) => ({ ...f, behavioral_readiness_score: Number(e.target.value) }))
                }
                className="w-full accent-[#1e3a5f]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            {/* Scored by */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scored By</label>
              <input
                type="text"
                value={sentimentForm.scored_by}
                onChange={(e) => setSentimentForm((f) => ({ ...f, scored_by: e.target.value }))}
                placeholder="Your name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={sentimentForm.notes}
                onChange={(e) => setSentimentForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional observations..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/40 focus:border-[#1e3a5f] resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSentimentOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSentimentSubmit}
                disabled={sentimentSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-[#1e3a5f] text-white hover:bg-[#16304f] disabled:opacity-50 transition-colors"
              >
                {sentimentSubmitting ? 'Saving...' : 'Submit Score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
