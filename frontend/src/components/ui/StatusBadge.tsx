import clsx from 'clsx';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  imported: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  discovered: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  nominated: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  under_review: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  validated: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  declined: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
};

export function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.imported;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium capitalize',
        style.bg, style.text,
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      )}
    >
      <span className={clsx('rounded-full', style.dot, size === 'xs' ? 'w-1 h-1' : 'w-1.5 h-1.5')} />
      {status.replace(/_/g, ' ')}
    </span>
  );
}

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  global_national: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  regional_institutional: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  local_community: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  rising_star: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  emerging: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
};

const TIER_LABELS: Record<string, string> = {
  global_national: 'Global / National',
  regional_institutional: 'Regional',
  local_community: 'Local',
  rising_star: 'Rising Star',
  emerging: 'Emerging',
};

export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return <span className="text-xs text-gray-400">--</span>;
  const style = TIER_STYLES[tier] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
      style.bg, style.text, style.border,
    )}>
      {TIER_LABELS[tier] || tier.replace(/_/g, ' ')}
    </span>
  );
}
