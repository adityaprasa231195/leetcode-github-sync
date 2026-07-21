/** Minimal animated spinner used throughout the popup. */

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      className="animate-spin"
      aria-label="Loading"
    >
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}
