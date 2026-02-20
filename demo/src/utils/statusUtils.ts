export const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  imported: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  discovered: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  nominated: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  under_review: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500' },
  validated: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  declined: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
};

export const STATUS_LABELS: Record<string, string> = {
  imported: 'Imported',
  discovered: 'Discovered',
  nominated: 'Nominated',
  under_review: 'Under Review',
  validated: 'Validated',
  declined: 'Declined',
  archived: 'Archived',
};

export const VALID_TRANSITIONS: Record<string, string[]> = {
  imported: ['under_review'],
  discovered: ['under_review'],
  nominated: ['under_review'],
  under_review: ['validated', 'declined'],
  validated: ['archived'],
  declined: ['under_review'],
  archived: ['under_review'],
};

export const ALL_STATUSES = ['imported', 'discovered', 'nominated', 'under_review', 'validated', 'declined', 'archived'];

export const SOURCE_LABELS: Record<string, string> = {
  import: 'Import',
  field_nomination: 'Field Nomination',
  discovery_claims: 'Discovery (Claims)',
  discovery_publications: 'Discovery (Publications)',
  discovery_congress: 'Discovery (Congress)',
  discovery_referral: 'Discovery (Referral)',
  discovery_competitive_trials: 'Discovery (Trials)',
};
