/** Compact gradient-pipe glyph. The previous logo, kept for fallback / reuse. */
export function StaticLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="cp-grad-static" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4DA2FF" />
          <stop offset="0.6" stopColor="#a8d5ff" />
          <stop offset="1" stopColor="#FE8BC2" />
        </linearGradient>
      </defs>
      <rect x="3"  y="6"  width="3.6" height="20" rx="1.8" fill="url(#cp-grad-static)" />
      <rect x="9"  y="3"  width="3.6" height="26" rx="1.8" fill="url(#cp-grad-static)" opacity="0.85" />
      <rect x="15" y="9"  width="3.6" height="20" rx="1.8" fill="url(#cp-grad-static)" opacity="0.7" />
      <rect x="21" y="6"  width="3.6" height="22" rx="1.8" fill="url(#cp-grad-static)" opacity="0.55" />
      <circle cx="4.8" cy="6.5" r="2" fill="#FE8BC2" opacity="0.9" />
    </svg>
  );
}
