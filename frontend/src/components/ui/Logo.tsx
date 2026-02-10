export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <rect width="32" height="32" rx="8" fill="#0D9488" />
      {/* Three connected nodes forming a triangle */}
      <circle cx="16" cy="9" r="2.5" fill="white" />
      <circle cx="10" cy="21" r="2.5" fill="white" />
      <circle cx="22" cy="21" r="2.5" fill="white" />
      {/* Connection lines */}
      <line x1="14.5" y1="11" x2="11" y2="19" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="17.5" y1="11" x2="21" y2="19" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="12.5" y1="21" x2="19.5" y2="21" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
