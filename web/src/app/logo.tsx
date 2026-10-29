export function Logo({ className }: { className: string }) {
  return (
    <svg
      className={className}
      width="34"
      height="34"
      viewBox="0 0 34 34"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="32" height="48" rx="16" ry="16" fill="#1f4b96" />
      <rect x="5" y="5" width="24" height="48" rx="12" ry="12" fill="#f2ede3" />
      <rect x="8" y="8" width="18" height="48" rx="9" ry="9" fill="#9a7529" />
      <rect x="12" y="12" width="10" height="48" rx="5" ry="5" fill="#b23a1f" />
    </svg>
  );
}
