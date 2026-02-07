export function getTierLabel(tier: string | null): string {
  switch (tier) {
    case 'global_national': return 'Global/National';
    case 'regional_institutional': return 'Regional/Institutional';
    case 'local_community': return 'Local/Community';
    case 'rising_star': return 'Rising Star';
    case 'monitor': return 'Monitor';
    default: return 'Unclassified';
  }
}

export function getTierColor(tier: string | null): string {
  switch (tier) {
    case 'global_national': return 'bg-purple-100 text-purple-700';
    case 'regional_institutional': return 'bg-blue-100 text-blue-700';
    case 'local_community': return 'bg-teal-100 text-teal-700';
    case 'rising_star': return 'bg-amber-100 text-amber-700';
    case 'monitor': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-500';
  }
}

export const TIER_CHART_COLORS: Record<string, string> = {
  global_national: '#7C3AED',
  regional_institutional: '#2563EB',
  local_community: '#2A9D8F',
  rising_star: '#F59E0B',
  monitor: '#6B7280',
};
