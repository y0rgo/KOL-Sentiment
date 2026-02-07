export function getScoreColor(score: number | null): string {
  if (score === null) return 'text-gray-400';
  if (score <= 2) return 'text-red-500';
  if (score === 3) return 'text-yellow-500';
  return 'text-green-500';
}

export function getScoreBgColor(score: number | null): string {
  if (score === null) return 'bg-gray-100 text-gray-500';
  if (score <= 2) return 'bg-red-100 text-red-700';
  if (score === 3) return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

export function getCompositeColor(composite: number | null): string {
  if (composite === null) return 'bg-gray-100 text-gray-500';
  if (composite <= 6) return 'bg-red-100 text-red-700';
  if (composite <= 9) return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

export function getStageColor(stage: string | null): string {
  switch (stage) {
    case 'unaware': return 'bg-gray-200 text-gray-700';
    case 'skeptical': return 'bg-red-100 text-red-700';
    case 'trialing': return 'bg-yellow-100 text-yellow-700';
    case 'adopting': return 'bg-blue-100 text-blue-700';
    case 'advocating': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-500';
  }
}

export function deriveStage(composite: number): string {
  if (composite <= 4) return 'unaware';
  if (composite <= 6) return 'skeptical';
  if (composite <= 9) return 'trialing';
  if (composite <= 12) return 'adopting';
  return 'advocating';
}

export function formatBarrierType(barrier: string): string {
  return barrier
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
