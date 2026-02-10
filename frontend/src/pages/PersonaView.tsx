import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchPersona, createSentimentScore, createEngagement } from '../api/client';
import type { Persona, SentimentScore } from '../types';
import { formatDate, formatDateTime } from '../utils/formatters';
import { StatusBadge, TierBadge } from '../components/ui/StatusBadge';
import { SkeletonPage } from '../components/ui/Skeleton';
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
  ChevronDown,
  ChevronRight,
  Clock,
  Activity,
} from 'lucide-react';
import TierBreakdown from '../components/TierBreakdown';
import PriorityBreakdown from '../components/PriorityBreakdown';

/* ------------------------------------------------------------------ */
/*  Conversion stage styles for the dark gradient banner                */
/* ------------------------------------------------------------------ */
const CONVERSION_BANNER_STYLES: Record<string, string> = {
  unaware: 'bg-white/10 text-white/70 border-white/20',
  aware: 'bg-blue-400/20 text-blue-200 border-blue-400/40',
  interested: 'bg-cyan-400/20 text-cyan-200 border-cyan-400/40',
  evaluating: 'bg-yellow-400/20 text-yellow-200 border-yellow-400/40',
  trialing: 'bg-orange-400/20 text-orange-200 border-orange-400/40',
  adopting: 'bg-green-400/20 text-green-200 border-green-400/40',
  advocating: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40',
};

/* ------------------------------------------------------------------ */
/*  Sentiment gauge bar (1-5 scale)                                     */
/* ------------------------------------------------------------------ */
function SentimentGauge({ label, value }: { label: string; value: number | null }) {
  const safeVal = value ?? 0;
  const pct = (safeVal / 5) * 100;
  const color =
    safeVal >= 4
      ? 'bg-emerald-500'
      : safeVal >= 3
        ? 'bg-amber-500'
        : safeVal >= 1
          ? 'bg-red-500'
          : 'bg-gray-300';
  return (
    <div className="flex-1 min-w-[140px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-sm font-bold text-gray-800">
          {safeVal > 0 ? safeVal.toFixed(1) : '--'}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Conversion stage badge (card use -- light backgrounds)              */
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
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      {stage}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty-state placeholder                                             */
/* ------------------------------------------------------------------ */
function Empty({ message }: { message: string }) {
  return <p className="text-sm text-gray-400 italic py-4">{message}</p>;
}

/* ------------------------------------------------------------------ */
/*  Collapsible domain section                                          */
/* ------------------------------------------------------------------ */
function CollapsibleSection({
  icon: Icon,
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B2A4A] to-[#0F766E]">
            <Icon className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {count !== undefined && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-100 text-brand-700">
              {count}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400 transition-transform" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 transition-transform" />
        )}
      </button>
      {expanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="pt-5">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PersonaView                                                        */
/* ================================================================== */
export default function PersonaView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Collapsible sections -- all expanded by default */
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    prescribing: true,
    publications: true,
    influence: true,
    competitive: true,
    engagements: true,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

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

  /* Engagement modal state */
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [engagementForm, setEngagementForm] = useState({
    engagement_type: 'meeting',
    engagement_date: new Date().toISOString().split('T')[0],
    channel: '',
    topic: '',
    duration_minutes: 30,
    recorded_by: '',
    field_notes: '',
  });
  const [engagementSubmitting, setEngagementSubmitting] = useState(false);

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
      toast.success('Sentiment score recorded successfully');
      await loadPersona();
    } catch {
      toast.error('Failed to record sentiment score.');
    } finally {
      setSentimentSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Engagement submit                                                */
  /* ---------------------------------------------------------------- */
  const handleEngagementSubmit = async () => {
    if (!id) return;
    setEngagementSubmitting(true);
    try {
      await createEngagement({
        physician_id: id,
        engagement_type: engagementForm.engagement_type,
        engagement_date: engagementForm.engagement_date,
        channel: engagementForm.channel || null,
        topic: engagementForm.topic || null,
        duration_minutes: engagementForm.duration_minutes,
        recorded_by: engagementForm.recorded_by || 'anonymous',
        field_notes: engagementForm.field_notes || null,
      });
      setEngagementOpen(false);
      setEngagementForm({
        engagement_type: 'meeting',
        engagement_date: new Date().toISOString().split('T')[0],
        channel: '',
        topic: '',
        duration_minutes: 30,
        recorded_by: '',
        field_notes: '',
      });
      toast.success('Engagement logged successfully');
      await loadPersona();
    } catch {
      toast.error('Failed to log engagement.');
    } finally {
      setEngagementSubmitting(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Loading state                                                    */
  /* ---------------------------------------------------------------- */
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SkeletonPage />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Error state                                                      */
  /* ---------------------------------------------------------------- */
  if (error || !persona) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-lg text-red-600 font-medium">
          {error ?? 'Physician not found.'}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-[#1B2A4A] hover:underline"
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
      {/* ============================================================ */}
      {/*  Top bar: Back button + Last Updated                         */}
      {/* ============================================================ */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B2A4A] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          <span>Last updated {formatDateTime(phy.updated_at)}</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Header Banner                                                */}
      {/* ============================================================ */}
      <div className="bg-gradient-to-r from-[#1B2A4A] to-[#0F766E] rounded-xl shadow-card overflow-hidden">
        <div className="px-8 py-7">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
            {/* Left: Avatar circle, name, credentials, institution, location */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20 flex-shrink-0">
                  <User className="h-7 w-7 text-white/80" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight">
                    {fullName}
                    {phy.credentials && (
                      <span className="ml-2 text-lg font-normal text-white/60">
                        {phy.credentials}
                      </span>
                    )}
                  </h1>
                  {phy.specialty && (
                    <p className="text-sm text-white/50 mt-0.5">
                      {phy.specialty}
                      {phy.subspecialty ? ` \u2014 ${phy.subspecialty}` : ''}
                    </p>
                  )}
                </div>
              </div>
              {phy.institution_name && (
                <p className="text-sm text-white/70 ml-[72px]">
                  {phy.institution_name}
                </p>
              )}
              {(phy.city || phy.state) && (
                <p className="text-sm text-white/50 ml-[72px]">
                  {[phy.city, phy.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>

            {/* Right: Badges row */}
            <div className="flex flex-wrap items-center gap-2 lg:mt-1">
              <StatusBadge status={phy.record_status} />
              {phy.tier && <TierBadge tier={phy.tier} />}
              {phy.priority_rank != null && (
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 border border-white/25 text-white text-sm font-bold"
                  title={`Priority Rank #${phy.priority_rank}`}
                >
                  #{phy.priority_rank}
                </span>
              )}
              {latestSentiment?.conversion_stage && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize ${
                    CONVERSION_BANNER_STYLES[
                      latestSentiment.conversion_stage.toLowerCase()
                    ] ?? 'bg-white/10 text-white/80 border-white/20'
                  }`}
                >
                  {latestSentiment.conversion_stage}
                </span>
              )}
            </div>
          </div>

          {/* Completeness bar -- white / transparent style */}
          <div className="mt-6 ml-[72px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-white/50">
                Profile completeness
              </span>
              <span className="text-xs font-semibold text-white/80">
                {Math.round(phy.completeness_score)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-white/70 transition-all duration-700"
                style={{ width: `${phy.completeness_score}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  2-Column Grid: Tier/Priority (left) + Sentiment/Actions      */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---------------------------------------------------------- */}
        {/*  LEFT COLUMN                                                */}
        {/* ---------------------------------------------------------- */}
        <div className="space-y-6">
          {/* Tier Breakdown card */}
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B2A4A] to-[#0F766E]">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Tier Breakdown
              </h3>
            </div>
            <div className="p-6">
              {id ? (
                <TierBreakdown physicianId={id} />
              ) : (
                <p className="text-sm text-gray-400">No physician selected</p>
              )}
            </div>
          </div>

          {/* Priority Breakdown card */}
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B2A4A] to-[#0F766E]">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Priority Breakdown
              </h3>
            </div>
            <div className="p-6">
              {id ? (
                <PriorityBreakdown physicianId={id} />
              ) : (
                <p className="text-sm text-gray-400">No physician selected</p>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/*  RIGHT COLUMN                                               */}
        {/* ---------------------------------------------------------- */}
        <div className="space-y-6">
          {/* Sentiment card */}
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B2A4A] to-[#0F766E]">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Sentiment
              </h3>
            </div>
            <div className="p-6 space-y-5">
              {latestSentiment ? (
                <>
                  <div className="flex flex-wrap gap-4">
                    <SentimentGauge
                      label="Disease Belief"
                      value={latestSentiment.disease_belief_score}
                    />
                    <SentimentGauge
                      label="Product Perception"
                      value={latestSentiment.product_perception_score}
                    />
                    <SentimentGauge
                      label="Behavioral Readiness"
                      value={latestSentiment.behavioral_readiness_score}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    {latestSentiment.composite_score != null && (
                      <span className="text-sm text-gray-600">
                        Composite:{' '}
                        <span className="font-semibold text-gray-800">
                          {latestSentiment.composite_score.toFixed(1)}
                        </span>
                      </span>
                    )}
                    <ConversionBadge stage={latestSentiment.conversion_stage} />
                  </div>
                </>
              ) : (
                <Empty message="No sentiment scores yet" />
              )}

              {/* Sentiment history */}
              {persona.sentiment.length > 1 && (
                <div className="pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    History
                  </h4>
                  <ul className="space-y-2">
                    {persona.sentiment.slice(1).map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between text-sm text-gray-600"
                      >
                        <span>{formatDate(s.assessment_date)}</span>
                        <span className="flex items-center gap-2">
                          <span title="Disease Belief">
                            DB {s.disease_belief_score ?? '-'}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span title="Product Perception">
                            PP {s.product_perception_score ?? '-'}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span title="Behavioral Readiness">
                            BR {s.behavioral_readiness_score ?? '-'}
                          </span>
                          {s.composite_score != null && (
                            <>
                              <span className="text-gray-300">|</span>
                              <span className="font-medium text-gray-700">
                                {s.composite_score.toFixed(1)}
                              </span>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions card */}
          <div className="bg-white rounded-lg shadow-card overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B2A4A] to-[#0F766E]">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
            <div className="p-6 flex flex-wrap gap-3">
              <button
                onClick={() => setSentimentOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
              >
                <Heart className="h-4 w-4" />
                Record Sentiment
              </button>
              <button
                onClick={() => setEngagementOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors shadow-sm"
              >
                <MessageSquare className="h-4 w-4" />
                Log Engagement
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  Full-width Collapsible Domain Sections                       */}
      {/* ============================================================ */}

      {/* ------ Profile Details ------ */}
      <CollapsibleSection
        icon={User}
        title="Profile Details"
        expanded={expandedSections.identity}
        onToggle={() => toggleSection('identity')}
      >
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm">
          {(
            [
              ['NPI', phy.npi],
              ['Specialty', phy.specialty],
              ['Subspecialty', phy.subspecialty],
              ['Practice Type', phy.practice_type],
              ['Institution', phy.institution_name],
              ['Institution Type', phy.institution_type],
              [
                'City / State',
                [phy.city, phy.state].filter(Boolean).join(', ') || null,
              ],
              ['Region', phy.region],
              ['Country', phy.country],
              [
                'Years in Practice',
                phy.years_in_practice?.toString() ?? null,
              ],
              ['Fellowship Training', phy.fellowship_training],
              ['Institutional Role', phy.institutional_role],
            ] as [string, string | null][]
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                {label}
              </dt>
              <dd className="mt-1 text-gray-800 font-medium">
                {value || <span className="text-gray-300">--</span>}
              </dd>
            </div>
          ))}
        </dl>
      </CollapsibleSection>

      {/* ------ Prescribing Data ------ */}
      <CollapsibleSection
        icon={Stethoscope}
        title="Prescribing Data"
        count={persona.prescribing.length}
        expanded={expandedSections.prescribing}
        onToggle={() => toggleSection('prescribing')}
      >
        {persona.prescribing.length === 0 ? (
          <Empty message="No prescribing data yet" />
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={i} className="text-gray-700 table-row-hover">
                    <td className="py-2.5 pr-4 font-medium">
                      {rx.period ?? '-'}
                    </td>
                    <td className="py-2.5 pr-4">{rx.patients ?? '-'}</td>
                    <td className="py-2.5 pr-4">{rx.new_starts ?? '-'}</td>
                    <td className="py-2.5">{rx.formulation ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ------ Research & Publications ------ */}
      <CollapsibleSection
        icon={BookOpen}
        title="Research & Publications"
        count={persona.publications.length}
        expanded={expandedSections.publications}
        onToggle={() => toggleSection('publications')}
      >
        {persona.publications.length === 0 ? (
          <Empty message="No publications yet" />
        ) : (
          <ul className="space-y-4">
            {persona.publications.map((pub: any, i: number) => (
              <li key={i} className="border-l-2 border-brand-500/30 pl-4">
                <p className="text-sm font-medium text-gray-800">
                  {pub.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pub.journal && <span>{pub.journal}</span>}
                  {pub.date && (
                    <span> &middot; {formatDate(pub.date)}</span>
                  )}
                  {pub.impact_factor != null && (
                    <span> &middot; IF {pub.impact_factor}</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* ------ Influence & Congress ------ */}
      <CollapsibleSection
        icon={Award}
        title="Influence & Congress"
        count={persona.congress.length + persona.trials.length}
        expanded={expandedSections.influence}
        onToggle={() => toggleSection('influence')}
      >
        {persona.congress.length === 0 && persona.trials.length === 0 ? (
          <Empty message="No congress activity yet" />
        ) : (
          <div className="space-y-6">
            {persona.congress.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Congress Activity
                </h4>
                <ul className="space-y-3">
                  {persona.congress.map((c: any, i: number) => (
                    <li key={i} className="text-sm text-gray-700">
                      <p className="font-medium">
                        {c.congress_name ?? c.name ?? 'Congress'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {c.role && <span>{c.role}</span>}
                        {c.year && <span> &middot; {c.year}</span>}
                        {c.presentation_type && (
                          <span> &middot; {c.presentation_type}</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {persona.trials.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Clinical Trials
                </h4>
                <ul className="space-y-3">
                  {persona.trials.map((t: any, i: number) => (
                    <li key={i} className="text-sm text-gray-700">
                      <p className="font-medium">
                        {t.trial_name ?? t.name ?? 'Trial'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t.role && <span>{t.role}</span>}
                        {t.phase && (
                          <span> &middot; Phase {t.phase}</span>
                        )}
                        {t.status && <span> &middot; {t.status}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* ------ Competitive Intelligence ------ */}
      <CollapsibleSection
        icon={Shield}
        title="Competitive Intelligence"
        count={persona.competitive.length}
        expanded={expandedSections.competitive}
        onToggle={() => toggleSection('competitive')}
      >
        {persona.competitive.length === 0 ? (
          <Empty message="No competitive data yet" />
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={i} className="text-gray-700 table-row-hover">
                    <td className="py-2.5 pr-4 font-medium">
                      {c.company ?? '-'}
                    </td>
                    <td className="py-2.5 pr-4">
                      {c.type ?? c.affiliation_type ?? '-'}
                    </td>
                    <td className="py-2.5 pr-4">{c.product ?? '-'}</td>
                    <td className="py-2.5 pr-4">{c.year ?? '-'}</td>
                    <td className="py-2.5">
                      {c.payment != null
                        ? `$${Number(c.payment).toLocaleString()}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* ------ Engagements ------ */}
      <CollapsibleSection
        icon={MessageSquare}
        title="Engagements"
        count={persona.engagements.length}
        expanded={expandedSections.engagements}
        onToggle={() => toggleSection('engagements')}
      >
        {persona.engagements.length === 0 ? (
          <Empty message="No engagements yet" />
        ) : (
          <ul className="space-y-3">
            {persona.engagements.map((e) => (
              <li key={e.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 flex-shrink-0 h-2 w-2 rounded-full bg-brand-500/50" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 capitalize">
                    {e.engagement_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(e.engagement_date)}
                    {e.channel && <span> &middot; {e.channel}</span>}
                    {e.topic && <span> &middot; {e.topic}</span>}
                    {e.duration_minutes != null && (
                      <span> &middot; {e.duration_minutes} min</span>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      {/* ============================================================ */}
      {/*  Sentiment Modal                                              */}
      {/* ============================================================ */}
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
              <h3 className="text-lg font-semibold text-[#1B2A4A]">
                Record Sentiment
              </h3>
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
                <span className="font-semibold text-[#1B2A4A]">
                  {sentimentForm.disease_belief_score}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={sentimentForm.disease_belief_score}
                onChange={(e) =>
                  setSentimentForm((f) => ({
                    ...f,
                    disease_belief_score: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#1B2A4A]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            {/* Product Perception slider */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Product Perception</span>
                <span className="font-semibold text-[#1B2A4A]">
                  {sentimentForm.product_perception_score}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={sentimentForm.product_perception_score}
                onChange={(e) =>
                  setSentimentForm((f) => ({
                    ...f,
                    product_perception_score: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#1B2A4A]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            {/* Behavioral Readiness slider */}
            <div>
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1">
                <span>Behavioral Readiness</span>
                <span className="font-semibold text-[#1B2A4A]">
                  {sentimentForm.behavioral_readiness_score}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={sentimentForm.behavioral_readiness_score}
                onChange={(e) =>
                  setSentimentForm((f) => ({
                    ...f,
                    behavioral_readiness_score: Number(e.target.value),
                  }))
                }
                className="w-full accent-[#1B2A4A]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            {/* Scored by */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scored By
              </label>
              <input
                type="text"
                value={sentimentForm.scored_by}
                onChange={(e) =>
                  setSentimentForm((f) => ({ ...f, scored_by: e.target.value }))
                }
                placeholder="Your name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={sentimentForm.notes}
                onChange={(e) =>
                  setSentimentForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional observations..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A] resize-none"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-[#1B2A4A] text-white hover:bg-[#16223B] disabled:opacity-50 transition-colors"
              >
                {sentimentSubmitting ? 'Saving...' : 'Submit Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  Engagement Modal                                             */}
      {/* ============================================================ */}
      {engagementOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEngagementOpen(false)}
          />

          {/* modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            {/* header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#1B2A4A]">
                Log Engagement
              </h3>
              <button
                onClick={() => setEngagementOpen(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Engagement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Engagement Type
              </label>
              <select
                value={engagementForm.engagement_type}
                onChange={(e) =>
                  setEngagementForm((f) => ({
                    ...f,
                    engagement_type: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A]"
              >
                <option value="meeting">Meeting</option>
                <option value="phone_call">Phone Call</option>
                <option value="email">Email</option>
                <option value="conference">Conference</option>
                <option value="advisory_board">Advisory Board</option>
                <option value="speaker_program">Speaker Program</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={engagementForm.engagement_date}
                onChange={(e) =>
                  setEngagementForm((f) => ({
                    ...f,
                    engagement_date: e.target.value,
                  }))
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A]"
              />
            </div>

            {/* Channel + Duration row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel
                </label>
                <input
                  type="text"
                  value={engagementForm.channel}
                  onChange={(e) =>
                    setEngagementForm((f) => ({
                      ...f,
                      channel: e.target.value,
                    }))
                  }
                  placeholder="e.g. In-person"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  value={engagementForm.duration_minutes}
                  onChange={(e) =>
                    setEngagementForm((f) => ({
                      ...f,
                      duration_minutes: Number(e.target.value),
                    }))
                  }
                  min={1}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A]"
                />
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                value={engagementForm.topic}
                onChange={(e) =>
                  setEngagementForm((f) => ({ ...f, topic: e.target.value }))
                }
                placeholder="Discussion topic"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A]"
              />
            </div>

            {/* Recorded By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recorded By
              </label>
              <input
                type="text"
                value={engagementForm.recorded_by}
                onChange={(e) =>
                  setEngagementForm((f) => ({
                    ...f,
                    recorded_by: e.target.value,
                  }))
                }
                placeholder="Your name"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={engagementForm.field_notes}
                onChange={(e) =>
                  setEngagementForm((f) => ({
                    ...f,
                    field_notes: e.target.value,
                  }))
                }
                placeholder="Optional field notes..."
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/40 focus:border-[#1B2A4A] resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEngagementOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEngagementSubmit}
                disabled={engagementSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-[#1B2A4A] text-white hover:bg-[#16223B] disabled:opacity-50 transition-colors"
              >
                {engagementSubmitting ? 'Saving...' : 'Log Engagement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
