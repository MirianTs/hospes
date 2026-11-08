// Hospes mark: a house with mountains in its doorway. Colors come from CSS (--logo-green, --logo-window)
// so the mark stays visible in dark mode.
export function LogoMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <path d="M32 3 61 22v38H3V22Z" fill="var(--logo-green)" />
      <path d="M32 14 51 26.5V60H13V26.5Z" fill="var(--logo-window)" />
      <path d="M8 60 22 37l6 8.5L39 28 54 60Z" fill="var(--logo-green)" />
    </svg>
  );
}
