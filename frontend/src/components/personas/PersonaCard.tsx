import type { PersonaOutput } from '../../types'
import { getTierLabel, getTierColor } from '../../utils/tierUtils'
import { getScoreBgColor, getStageColor, formatBarrierType } from '../../utils/sentimentUtils'
import { formatDate, formatEngagementType, formatPracticeType } from '../../utils/formatters'
import SentimentBadge from './SentimentBadge'
import BarrierTags from './BarrierTags'
import EngagementTimeline from './EngagementTimeline'
import PrescribingSnapshot from './PrescribingSnapshot'

interface Props {
  persona: PersonaOutput
}

export default function PersonaCard({ persona }: Props) {
  const { identity, prescribing, research, influence, competitive, sentiment, engagement, recommended_actions } = persona

  return (
    <div className="space-y-6">
      {/* Identity */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Identity & Background</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-gray-500">NPI:</span> <span className="font-medium">{identity.npi}</span></div>
          <div><span className="text-gray-500">Specialty:</span> <span className="font-medium">{identity.specialty || '—'}</span></div>
          <div><span className="text-gray-500">Subspecialty:</span> <span className="font-medium">{identity.subspecialty || '—'}</span></div>
          <div><span className="text-gray-500">Institution:</span> <span className="font-medium">{identity.institution_name || '—'}</span></div>
          <div><span className="text-gray-500">Practice Type:</span> <span className="font-medium">{formatPracticeType(identity.practice_type)}</span></div>
          <div><span className="text-gray-500">Location:</span> <span className="font-medium">{identity.city && identity.state ? `${identity.city}, ${identity.state}` : '—'}</span></div>
          <div><span className="text-gray-500">Years in Practice:</span> <span className="font-medium">{identity.years_in_practice ?? '—'}</span></div>
          <div><span className="text-gray-500">Role:</span> <span className="font-medium">{identity.institutional_role || '—'}</span></div>
          <div>
            <span className="text-gray-500">Tier:</span>{' '}
            {identity.tier ? (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getTierColor(identity.tier)}`}>
                {getTierLabel(identity.tier)}
              </span>
            ) : (
              <span className="text-gray-400">Unclassified</span>
            )}
          </div>
        </div>
      </section>

      {/* Sentiment */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Sentiment</h2>
        {sentiment.current_scores ? (
          <div>
            <div className="flex gap-4 mb-4">
              <SentimentBadge label="Disease Belief" score={sentiment.current_scores.disease_belief as number} />
              <SentimentBadge label="Product Perception" score={sentiment.current_scores.product_perception as number} />
              <SentimentBadge label="Behavioral Readiness" score={sentiment.current_scores.behavioral_readiness as number} />
              <SentimentBadge label="Composite" score={sentiment.current_scores.composite as number} isComposite />
            </div>
            {sentiment.conversion_stage && (
              <div className="mb-3">
                <span className="text-sm text-gray-500 mr-2">Stage:</span>
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${getStageColor(sentiment.conversion_stage)}`}>
                  {sentiment.conversion_stage}
                </span>
              </div>
            )}
            <BarrierTags barriers={sentiment.barriers} />
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No sentiment data recorded yet</p>
        )}
      </section>

      {/* Prescribing */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Prescribing Behavior</h2>
        <PrescribingSnapshot prescribing={prescribing} />
      </section>

      {/* Research */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Research & Publications</h2>
        {research.total_publications > 0 ? (
          <div>
            <p className="text-sm text-gray-600 mb-3">{research.total_publications} publication(s)</p>
            <div className="space-y-2">
              {research.publications.slice(0, 5).map((pub, i) => (
                <div key={i} className="text-sm border-l-2 border-teal-300 pl-3">
                  <p className="font-medium">{pub.title as string}</p>
                  <p className="text-gray-500">{pub.journal as string} {pub.date ? `(${pub.date})` : ''}</p>
                </div>
              ))}
            </div>
            {research.congress_presentations.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Congress Activity</h3>
                {research.congress_presentations.slice(0, 3).map((c, i) => (
                  <div key={i} className="text-sm text-gray-600">
                    {c.congress as string} — {c.type as string}: {c.title as string}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No publications found</p>
        )}
      </section>

      {/* Influence */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Influence & Network</h2>
        <div className="text-sm">
          <p className="text-gray-600 mb-2">{influence.referral_connections} referral connection(s)</p>
          {influence.trial_participation.length > 0 && (
            <div className="mt-2">
              <h3 className="text-sm font-medium text-gray-600 mb-1">Clinical Trial Participation</h3>
              {influence.trial_participation.map((t, i) => (
                <div key={i} className="text-gray-500 text-sm">
                  {t.trial as string} — {t.role as string} (Phase {t.phase as string})
                </div>
              ))}
            </div>
          )}
          {influence.referral_connections === 0 && influence.trial_participation.length === 0 && (
            <p className="text-gray-400">No network data available</p>
          )}
        </div>
      </section>

      {/* Competitive */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Competitive Landscape</h2>
        {competitive.affiliations.length > 0 ? (
          <div className="space-y-1 text-sm">
            {competitive.affiliations.map((a, i) => (
              <div key={i} className="text-gray-600">
                <span className="font-medium">{a.company as string}</span> — {a.type as string}
                {a.product && ` (${a.product as string})`}
                {a.year && `, ${a.year}`}
              </div>
            ))}
            {competitive.total_payments && (
              <p className="text-gray-500 mt-2">Total payments: ${competitive.total_payments.toLocaleString()}</p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No competitive affiliation data</p>
        )}
      </section>

      {/* Engagements */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Engagement History</h2>
        <EngagementTimeline engagement={engagement} />
      </section>

      {/* Recommendations */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-navy mb-4">Recommended Actions</h2>
        {recommended_actions.length > 0 ? (
          <div className="space-y-3">
            {recommended_actions.map((rec, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium h-fit ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {rec.priority}
                </span>
                <div>
                  <p className="font-medium text-gray-700">{rec.action}</p>
                  <p className="text-gray-500">{rec.rationale}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No recommendations at this time</p>
        )}
      </section>
    </div>
  )
}
