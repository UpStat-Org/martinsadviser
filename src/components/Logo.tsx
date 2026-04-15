interface LogoProps {
  className?: string;
  title?: string;
}

export function Logo({ className = "w-10 h-10", title = "MartinsAdviser" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id="ma-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B7BFF" />
          <stop offset="55%" stopColor="#3D5AF1" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
        <linearGradient id="ma-accent" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="ma-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="12" fill="url(#ma-bg)" />
      <rect width="48" height="24" rx="12" fill="url(#ma-shine)" />

      {/* Motion / speed lines */}
      <path d="M4 18h5" stroke="white" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3 23h7" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 28h4" stroke="white" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" />

      {/* Trailer */}
      <rect x="12" y="17" width="16" height="14" rx="1.8" fill="white" />
      {/* Cab */}
      <path d="M28 22h5.5l4.5 4.5V31H28z" fill="white" />
      {/* Windshield */}
      <path d="M29.5 23.2h4l2.3 2.3h-6.3z" fill="#3D5AF1" fillOpacity="0.85" />

      {/* Amber side stripe */}
      <rect x="12" y="25.6" width="16" height="1.6" fill="url(#ma-accent)" />
      {/* M monogram on trailer */}
      <path
        d="M15.5 20.6l1.7 3 1.7-3 1.7 3 1.7-3"
        stroke="url(#ma-accent)"
        strokeWidth="1.35"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Wheels */}
      <circle cx="17" cy="32" r="2.9" fill="#0B0D2E" />
      <circle cx="17" cy="32" r="1.15" fill="url(#ma-accent)" />
      <circle cx="33" cy="32" r="2.9" fill="#0B0D2E" />
      <circle cx="33" cy="32" r="1.15" fill="url(#ma-accent)" />
    </svg>
  );
}

export default Logo;
