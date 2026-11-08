import { L } from '../prefs.js';

// Illustrated placeholder (Kakheti hills, snowy Caucasus, vineyard, a guesthouse)
// shown when a hotel has no photos yet. The seed picks one of several palettes.
const PALETTES = [
  { sky: ['#f7dcc0', '#f1b28f'], sun: '#fff4dc', far: '#b7a1c4', mid: '#88a56f', near: '#4f7d4b', roof: '#b5523b' },
  { sky: ['#d3e6f3', '#f3e8d8'], sun: '#fffbea', far: '#9fb3c8', mid: '#8fae74', near: '#5b8551', roof: '#a8483a' },
  { sky: ['#f5cdb9', '#d98f8f'], sun: '#ffe3c6', far: '#a4879d', mid: '#94735f', near: '#6e5044', roof: '#7a1f3d' },
  { sky: ['#e0ecd8', '#f7efd9'], sun: '#fffdf1', far: '#abc0ad', mid: '#80a16f', near: '#3f6c44', roof: '#c65a3e' },
];

export default function HotelArt({ seed = 0, label, className }) {
  const n = Math.abs(Number(seed) || 0);
  const p = PALETTES[n % PALETTES.length];
  const gid = `sky-${n}`;
  const sunX = 70 + ((n * 83) % 250);
  const houseX = 120 + ((n * 47) % 150);
  return (
    <svg
      viewBox="0 0 400 240"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={label || L('სასტუმროს ილუსტრაცია', 'Guesthouse illustration')}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} />
          <stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${gid})`} />
      <circle cx={sunX} cy="64" r="24" fill={p.sun} opacity="0.95" />
      <path d="M0 150 L60 95 L95 120 L150 70 L190 105 L240 60 L290 110 L330 85 L400 130 L400 240 L0 240 Z" fill={p.far} />
      <path
        d="M150 70 L136 82.7 L143 80 L150 85 L157 80 L164 82.2 Z M240 60 L226 72.6 L233 70 L240 75 L247 71 L254 74 Z"
        fill="#fff"
        opacity="0.9"
      />
      <path d="M0 176 Q100 140 200 165 T400 160 L400 240 L0 240 Z" fill={p.mid} />
      <path d="M0 206 Q120 180 240 200 T400 195 L400 240 L0 240 Z" fill={p.near} />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d={`M${-30 + i * 62} 244 Q ${30 + i * 58} 214 ${100 + i * 52} 204`}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="3"
          fill="none"
        />
      ))}
      <g transform={`translate(${houseX} 157)`}>
        <rect x="0" y="14" width="46" height="30" rx="1.5" fill="#f6eee4" />
        <path d="M-5 16 L23 -3 L51 16 Z" fill={p.roof} />
        <rect x="18" y="28" width="10" height="16" fill="#7a4b3a" />
        <rect x="5" y="22" width="8" height="7" fill="#a9cbdc" />
        <rect x="33" y="22" width="8" height="7" fill="#a9cbdc" />
      </g>
    </svg>
  );
}
