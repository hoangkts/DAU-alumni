import React from 'react';

/**
 * Biểu tượng Logo khối vuông kiến trúc của Trường Đại học Kiến trúc Đà Nẵng (DAU)
 * Tông màu Đỏ Đô chủ đạo (#9E1B20 / #B81D24) và Trắng (#FFFFFF)
 */
export const DauLogoMark: React.FC<{ className?: string; alt?: string }> = ({
  className = 'w-8 h-8',
  alt = 'Logo Đại học Kiến trúc Đà Nẵng - ALUMNI KTD',
}) => {
  const [hasError, setHasError] = React.useState(false);

  if (!hasError) {
    return (
      <img
        src="/logo-dau.png"
        alt={alt}
        onError={() => setHasError(true)}
        className={`object-contain rounded-lg shrink-0 bg-white/95 p-0.5 ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Logo Trường Đại học Kiến trúc Đà Nẵng - DAU"
    >
      <defs>
        <linearGradient id="dau-crimson-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B81D24" />
          <stop offset="100%" stopColor="#8A1318" />
        </linearGradient>
      </defs>
      {/* Khối vuông nền tảng kiến trúc DAU màu Đỏ Đô */}
      <rect width="64" height="64" rx="10" fill="url(#dau-crimson-grad)" />
      {/* Đường viền khung bản vẽ kỹ thuật trắng tinh khiết */}
      <rect
        x="4.5"
        y="4.5"
        width="55"
        height="55"
        rx="7"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      {/* Nét chữ A (Architecture / Kiến trúc) dạng com-pa hình học màu trắng */}
      <path
        d="M32 11 L14 51 L22.5 51 L32 29 L41.5 51 L50 51 Z"
        fill="#FFFFFF"
      />
      {/* Nét cắt ngang chữ K / thước chữ T kiến trúc màu trắng tinh tế */}
      <path
        d="M20 38 L44 38 L47 43 L17 43 Z"
        fill="#FFFFFF"
      />
      {/* Điểm tâm kim com-pa đỉnh tháp */}
      <circle cx="32" cy="11.5" r="2.5" fill="#FFFFFF" />
    </svg>
  );
};

interface AvatarIllustrationProps {
  avatarKey: string;
  name: string;
  className?: string;
}

const PALETTES: Record<
  string,
  { bg: string; accent: string; blazer: string; skin: string; hair: string; badge: string }
> = {
  president: {
    bg: '#9E1B20',
    accent: '#821418',
    blazer: '#0F172A',
    skin: '#F3D2B8',
    hair: '#0F172A',
    badge: 'CT',
  },
  vp_interior: {
    bg: '#0F172A',
    accent: '#9E1B20',
    blazer: '#1E293B',
    skin: '#F6DAC4',
    hair: '#1E1B18',
    badge: 'PCT',
  },
  vp_construction: {
    bg: '#821418',
    accent: '#9E1B20',
    blazer: '#0F172A',
    skin: '#EBC3A4',
    hair: '#111827',
    badge: 'PCT',
  },
  secretary: {
    bg: '#9E1B20',
    accent: '#B81D24',
    blazer: '#1E293B',
    skin: '#F5D6BE',
    hair: '#1C1917',
    badge: 'TTK',
  },
  tech_lead: {
    bg: '#0F172A',
    accent: '#9E1B20',
    blazer: '#1E293B',
    skin: '#ECC8AE',
    hair: '#0F172A',
    badge: 'CNTT',
  },
  events_lead: {
    bg: '#9E1B20',
    accent: '#821418',
    blazer: '#0F172A',
    skin: '#EFCAB0',
    hair: '#18181B',
    badge: 'SK',
  },
};

export const AvatarIllustration: React.FC<AvatarIllustrationProps> = ({
  avatarKey,
  name,
  className = 'w-16 h-16',
}) => {
  const palette = PALETTES[avatarKey] || PALETTES.president;
  const isFemale = avatarKey === 'vp_interior' || avatarKey === 'secretary';

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-2 border-white shadow-sm bg-[#0F172A] shrink-0 ring-1 ring-slate-200 ${className}`}
      aria-label={`Chân dung ${name}`}
    >
      <svg
        viewBox="0 0 120 120"
        className="w-full h-full"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`bg-${avatarKey}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.bg} />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>
        <rect width="120" height="120" fill={`url(#bg-${avatarKey})`} />
        {/* Architectural grid lines */}
        <line x1="0" y1="28" x2="120" y2="28" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1" />
        <line x1="92" y1="0" x2="92" y2="120" stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1" />
        <rect x="84" y="14" width="22" height="22" rx="4" fill={palette.accent} fillOpacity="0.45" />

        {/* Shoulders & Blazer */}
        <path
          d="M16 122 C16 90, 40 82, 60 82 C80 82, 104 90, 104 122 Z"
          fill={palette.blazer}
        />
        {/* Shirt collar V in pure white */}
        <polygon points="48,82 72,82 60,108" fill="#FFFFFF" />
        {/* Tie / inner lapel in DAU red */}
        <polygon points="56,92 64,92 60,116" fill="#9E1B20" />

        {/* Neck */}
        <rect x="52" y="66" width="16" height="18" rx="6" fill={palette.skin} />

        {/* Hair back for female */}
        {isFemale && (
          <path
            d="M34 48 C34 26, 86 26, 86 48 L88 78 C88 82, 78 84, 76 78 L44 78 C42 84, 32 82, 32 78 Z"
            fill={palette.hair}
          />
        )}

        {/* Head */}
        <ellipse cx="60" cy="50" rx="20" ry="23" fill={palette.skin} />

        {/* Hair top */}
        {isFemale ? (
          <path
            d="M39 46 C40 26, 80 26, 80 46 C74 36, 56 34, 39 46 Z"
            fill={palette.hair}
          />
        ) : (
          <path
            d="M39 45 C39 25, 81 25, 81 45 C76 34, 46 34, 39 45 Z"
            fill={palette.hair}
          />
        )}

        {/* Facial features */}
        <circle cx="52" cy="49" r="2" fill="#0F172A" />
        <circle cx="68" cy="49" r="2" fill="#0F172A" />
        <path
          d="M54 60 Q60 64 66 60"
          stroke="#9E1B20"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
