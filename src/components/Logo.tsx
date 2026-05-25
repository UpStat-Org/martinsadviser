interface LogoProps {
  className?: string;
  title?: string;
  /**
   * When set, renders an <img> from the URL instead of the built-in SVG.
   * Used by white-labeled orgs to bring their own logo — either a public URL
   * or an image uploaded to the org-branding bucket (stored as its public
   * URL). Fits the same square box, so callers should pass a className that
   * constrains the size (default w-10 h-10).
   */
  src?: string | null;
}

export function Logo({ className = "w-10 h-10", title = "MartinsAdviser", src }: LogoProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={title}
        className={`${className} object-cover`}
      />
    );
  }
  // Silhueta lateral de semi-truck: trailer (caixa de carga retangular,
  // mais alta) à esquerda + cab com windshield inclinado à direita + duas
  // rodas (rear do trailer + front do cab). Tudo sólido branco sobre
  // charcoal slate-900 — sem gradientes, sem stripe de marca, sem cara de
  // mascote. O 1px de gap entre trailer e cab simula o fifth-wheel
  // coupling, sutil em telas grandes e some no favicon (apenas duas
  // formas + dois dots). Charcoal fixo para que a marca não compita com
  // o primary do tenant.
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <rect width="48" height="48" rx="8" fill="#0F172A" />
      {/* Trailer — cargo box on the left, taller than the cab */}
      <rect x="6" y="15" width="20" height="16" fill="#ffffff" />
      {/* Cab — shorter, with a slanted windshield at the front-right */}
      <path d="M27 31 L27 21 L37 21 L41 25 L41 31 Z" fill="#ffffff" />
      {/* Wheels — rear of trailer + front of cab */}
      <circle cx="12" cy="35" r="3" fill="#ffffff" />
      <circle cx="36" cy="35" r="3" fill="#ffffff" />
    </svg>
  );
}

export default Logo;
