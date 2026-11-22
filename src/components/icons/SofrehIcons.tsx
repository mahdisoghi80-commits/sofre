import React, { useId } from 'react';
import type { CuisineType, DietType } from '../../types/sofreh';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  filled?: boolean;
}

const baseProps = (size: number, className?: string): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className,
  'aria-hidden': true,
});

/** Bespoke Sofreh Logo Placeholder / Emblem (warm saffron bowl + steam curve) */
export const SofrehLogoMark: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => {
  const uid = useId().replace(/:/g, '');
  const gradId = `sofrehLogoGrad-${uid}`;
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-label="لوگوی سفره">
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B5B" />
          <stop offset="1" stopColor="#DF3326" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="20" fill={`url(#${gradId})`} />
      <path
        d="M11 22.5C11 27.6 15 31 20 31C25 31 29 27.6 29 22.5H11Z"
        fill="#FFFBF7"
      />
      <path
        d="M9.5 22.5H30.5"
        stroke="#FFFBF7"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M16 17.8C16 15.8 17.5 15.2 17.5 13.4"
        stroke="#FFFBF7"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M20.2 16.8C20.2 14.4 22 13.6 22 11.4"
        stroke="#FFFBF7"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M24.2 18C24.2 16.2 25.5 15.6 25.5 14"
        stroke="#FFFBF7"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Unified Edge-to-Edge 3D Icon Frame
 * Clips every studio 3D .jpg cleanly with subtle zoom so no outer white/cream border bleed ever appears.
 */
export const Icon3D: React.FC<{
  src: string;
  alt: string;
  sizeClass?: string;
  roundedClass?: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}> = ({
  src,
  alt,
  sizeClass = 'w-14 h-14',
  roundedClass = 'rounded-[18px]',
  className = '',
  loading = 'eager',
}) => (
  <div
    className={`relative overflow-hidden shrink-0 bg-[#F3EAE0] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.7),0_4px_12px_rgba(92,52,28,0.08)] ${sizeClass} ${roundedClass} ${className}`}
  >
    <img
      src={src}
      alt={alt}
      loading={loading}
      className="w-full h-full object-cover scale-[1.12] select-none pointer-events-none"
    />
  </div>
);

/** Cuisine country / regional flag helper */
const CUISINE_FLAG_MAP: Record<CuisineType, { flag: string; label: string }> = {
  ایرانی: { flag: '🇮🇷', label: 'ایرانی' },
  ایتالیایی: { flag: '🇮🇹', label: 'ایتالیایی' },
  مدیترانه‌ای: { flag: '🇬🇷', label: 'مدیترانه‌ای' },
  آسیایی: { flag: '🇯🇵', label: 'آسیایی' },
  مکزیکی: { flag: '🇲🇽', label: 'مکزیکی' },
  خاورمیانه: { flag: '🇱🇧', label: 'خاورمیانه' },
  بین‌المللی: { flag: '🌍', label: 'جهانی' },
};

export function getCuisineFlag(cuisine: CuisineType): string {
  return CUISINE_FLAG_MAP[cuisine]?.flag ?? '🌍';
}

/* ======================== NAVIGATION & CORE ICONS ======================== */

/** Weekly Calendar Plate */
export const IconSofrehPlan: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect
      x="3.5"
      y="5"
      width="17"
      height="15.5"
      rx="5"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.14 : 0}
    />
    <path d="M8 3.2V6.2M16 3.2V6.2" />
    <path d="M3.8 10H20.2" />
    <circle cx="9" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

/** Woven Market Basket */
export const IconMarketBasket: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path
      d="M5.2 10.5H18.8L17.4 18.2C17.1 19.6 15.9 20.5 14.5 20.5H9.5C8.1 20.5 6.9 19.6 6.6 18.2L5.2 10.5Z"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.14 : 0}
    />
    <path d="M8.5 10.5L11 5.2M15.5 10.5L13 5.2" />
    <path d="M10.2 14.2V16.8M13.8 14.2V16.8" />
  </svg>
);

/** Fridge Aperture Camera */
export const IconFridgeLens: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect
      x="3.5"
      y="6.2"
      width="17"
      height="13.8"
      rx="4.5"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.14 : 0}
    />
    <path d="M8.5 6.2L9.8 4.2H14.2L15.5 6.2" />
    <circle cx="12" cy="13.2" r="3.4" />
    <circle cx="17.2" cy="9.6" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

/** Recipe Book with Bookmark */
export const IconCookbook: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path
      d="M5 4.5C5 3.7 5.7 3 6.5 3H18.5V19.5H6.5C5.7 19.5 5 18.8 5 18V4.5Z"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.14 : 0}
    />
    <path d="M5 17.2C5 16.3 5.8 15.8 6.8 15.8H18.5" />
    <path d="M12.5 3V9.5L14.3 8.1L16.1 9.5V3" />
  </svg>
);

/** Warm Chef Profile */
export const IconProfile: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <circle
      cx="12"
      cy="8.2"
      r="3.8"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.16 : 0}
    />
    <path d="M5.2 19.8C6.3 16.4 8.9 14.8 12 14.8C15.1 14.8 17.7 16.4 18.8 19.8" />
  </svg>
);

/** Pantry / Home Shelf Box */
export const IconPantryShelf: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M4 11.5H20" />
    <path d="M8.5 7.8H10.5M14 7.8H16" />
    <path d="M9 15.6H15" />
  </svg>
);

/** Cooking Pot (Steam & Handles) */
export const IconCookingPot: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M5.5 10.5H18.5V16C18.5 18.2 16.7 20 14.5 20H9.5C7.3 20 5.5 18.2 5.5 16V10.5Z" />
    <path d="M3.5 10.5H20.5" />
    <path d="M9.5 7.2C9.5 6 10.4 5.5 10.4 4.3M14 7.2C14 6 14.9 5.5 14.9 4.3" />
  </svg>
);

/* ======================== ARROWS & CONTROLS ======================== */

export const IconArrowRight: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M5 12H19" />
    <path d="M13.2 6.5L19 12L13.2 17.5" />
  </svg>
);

export const IconArrowLeft: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M19 12H5" />
    <path d="M10.8 6.5L5 12L10.8 17.5" />
  </svg>
);

export const IconPlus: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M12 5.2V18.8M5.2 12H18.8" />
  </svg>
);

export const IconMinus: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M5.5 12H18.5" />
  </svg>
);

export const IconClose: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5" />
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M5.2 12.6L9.8 17.2L19 7.5" strokeWidth={2.3} />
  </svg>
);

export const IconLock: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect x="5" y="10.5" width="14" height="10" rx="3.5" />
    <path d="M8.2 10.5V7.8C8.2 5.7 9.9 4 12 4C14.1 4 15.8 5.7 15.8 7.8V10.5" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconUnlock: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect x="5" y="10.5" width="14" height="10" rx="3.5" />
    <path d="M8.2 10.5V7.6C8.2 5.5 9.9 4 12 4C13.6 4 15 5 15.5 6.4" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconShuffle: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M19.5 11.5C19.2 7.5 16 4.5 12 4.5C9.2 4.5 6.8 6 5.5 8.2" />
    <path d="M5.5 4.8V8.4H9.1" />
    <path d="M4.5 12.5C4.8 16.5 8 19.5 12 19.5C14.8 19.5 17.2 18 18.5 15.8" />
    <path d="M18.5 19.2V15.6H14.9" />
  </svg>
);

export const IconSwap: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M16.5 4.8L19.8 8.1L16.5 11.4" />
    <path d="M19.5 8.1H6.5" />
    <path d="M7.5 19.2L4.2 15.9L7.5 12.6" />
    <path d="M4.5 15.9H17.5" />
  </svg>
);

export const IconFilter: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M4.5 7H19.5M4.5 12H19.5M4.5 17H19.5" />
    <circle cx="9" cy="7" r="2" fill="#FBF5EF" />
    <circle cx="15.5" cy="12" r="2" fill="#FBF5EF" />
    <circle cx="10.5" cy="17" r="2" fill="#FBF5EF" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16L20 20" />
  </svg>
);

/* ======================== FOOD METRICS & INTERACTION ======================== */

export const IconClock: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <circle cx="12" cy="12" r="8.2" />
    <path d="M12 7.5V12.2L15.2 14" />
  </svg>
);

export const IconTimer: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M9.5 3H14.5M12 3V5.5" />
    <circle cx="12" cy="13.2" r="7.2" />
    <path d="M12 13.2L15 10.2" />
  </svg>
);

export const IconFlame: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M12.4 3.4C14.8 6.5 18 8.7 18 13.1C18 16.8 15.3 19.8 12 19.8C8.7 19.8 6 16.8 6 13.1C6 11.2 6.8 9.6 7.8 8.3C8 10.2 9.2 11 9.8 11C9.5 8.5 10.8 5.4 12.4 3.4Z" />
  </svg>
);

export const IconBookmark: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path
      d="M6.5 4.2C6.5 3.6 7 3.2 7.6 3.2H16.4C17 3.2 17.5 3.6 17.5 4.2V20L12 16.4L6.5 20V4.2Z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </svg>
);

export const IconThumbUp: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path
      d="M7.5 11.2V19H4.8C4.3 19 4 18.6 4 18.1V12C4 11.5 4.3 11.2 4.8 11.2H7.5ZM7.5 11.2L10.8 4.8C11.4 3.8 13 4.2 13 5.5V9.5H17.8C19 9.5 19.9 10.6 19.6 11.8L18.4 17.3C18.2 18.3 17.3 19 16.3 19H7.5"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
  </svg>
);

export const IconThumbDown: React.FC<IconProps> = ({ size = 20, filled, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path
      d="M16.5 12.8V5H19.2C19.7 5 20 5.4 20 5.9V12C20 12.5 19.7 12.8 19.2 12.8H16.5ZM16.5 12.8L13.2 19.2C12.6 20.2 11 19.8 11 18.5V14.5H6.2C5 14.5 4.1 13.4 4.4 12.2L5.6 6.7C5.8 5.7 6.7 5 7.7 5H16.5"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
  </svg>
);

export const IconLinkMagic: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M10.2 13.8L13.8 10.2" />
    <path d="M14.2 15.8L12.4 17.6C10.9 19.1 8.4 19.1 6.9 17.6C5.4 16.1 5.4 13.6 6.9 12.1L8.7 10.3" />
    <path d="M9.8 8.2L11.6 6.4C13.1 4.9 15.6 4.9 17.1 6.4C18.6 7.9 18.6 10.4 17.1 11.9L15.3 13.7" />
    <path d="M18.5 3.5V5.5M17.5 4.5H19.5" />
  </svg>
);

export const IconCalendarPlus: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect x="3.5" y="5" width="17" height="15" rx="4.5" />
    <path d="M8 3.2V6M16 3.2V6M4 10H20" />
    <path d="M12 12.8V17.4M9.7 15.1H14.3" />
  </svg>
);

export const IconGallery: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="4" />
    <circle cx="9" cy="9.5" r="1.5" />
    <path d="M5 17.5L10.2 12.8L13.5 15.8L16 13.6L19.5 17.2" />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M4.5 7H19.5" />
    <path d="M9.2 4.2H14.8" />
    <path d="M6.8 7L7.6 18.4C7.7 19.4 8.5 20.2 9.5 20.2H14.5C15.5 20.2 16.3 19.4 16.4 18.4L17.2 7" />
  </svg>
);

export const IconPlay: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M7.5 5.4L18.2 12L7.5 18.6V5.4Z" fill="currentColor" />
  </svg>
);

export const IconPause: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect x="6.5" y="5.5" width="3.8" height="13" rx="1.4" fill="currentColor" />
    <rect x="13.7" y="5.5" width="3.8" height="13" rx="1.4" fill="currentColor" />
  </svg>
);

export const IconUndo: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M6 9H14.5C17.3 9 19.5 11.2 19.5 14C19.5 16.8 17.3 19 14.5 19H9" />
    <path d="M9.2 5.5L5.7 9L9.2 12.5" />
  </svg>
);

export const IconBell: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M6.5 15.8V10.5C6.5 7.4 9 4.8 12 4.8C15 4.8 17.5 7.4 17.5 10.5V15.8L19.2 17.6H4.8L6.5 15.8Z" />
    <path d="M10 19.8C10.5 20.6 11.2 21 12 21C12.8 21 13.5 20.6 14 19.8" />
  </svg>
);

export const IconKitchen: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <rect x="4" y="5" width="16" height="15" rx="3.5" />
    <path d="M4 10H20" />
    <circle cx="8" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="12" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="16" cy="7.5" r="0.9" fill="currentColor" stroke="none" />
    <rect x="7.5" y="12.8" width="9" height="4.4" rx="1.2" />
  </svg>
);

export const IconFolderPlus: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M3.8 7C3.8 5.9 4.7 5 5.8 5H9.6L11.4 7H18.2C19.3 7 20.2 7.9 20.2 9V17C20.2 18.1 19.3 19 18.2 19H5.8C4.7 19 3.8 18.1 3.8 17V7Z" />
    <path d="M12 10.5V15.5M9.5 13H14.5" />
  </svg>
);

export const IconAlert: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8.2V12.8" />
    <circle cx="12" cy="15.8" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSparkle: React.FC<IconProps> = ({ size = 20, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M12 3.5L13.8 9.2L19.5 11L13.8 12.8L12 18.5L10.2 12.8L4.5 11L10.2 9.2L12 3.5Z" />
  </svg>
);

/* ======================== ILLUSTRATIVE MACRO & DIET ICONS ======================== */

/** Illustrative Protein Emblem (layered strength/muscle grain icon) */
export const IconMacroProtein: React.FC<IconProps> = ({ size = 22, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path
      d="M7.5 15.8C5.2 14.3 4.8 10.6 7.4 7.8C10 5 14.4 4.8 16.8 7.1C19.2 9.4 18.8 13.8 16.2 16.3C13.6 18.8 9.8 17.3 7.5 15.8Z"
      fill="currentColor"
      fillOpacity="0.16"
    />
    <path d="M9.5 14.5C11.2 13 13.2 11 14.6 9.3" />
    <circle cx="14.2" cy="9.6" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

/** Illustrative Carbs Emblem (golden wheat stalk) */
export const IconMacroCarbs: React.FC<IconProps> = ({ size = 22, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path d="M12 20V5" />
    <path d="M12 14C9.2 14 7.5 12.2 7.5 9.8C10 9.8 12 11.4 12 14Z" fill="currentColor" fillOpacity="0.18" />
    <path d="M12 11C14.8 11 16.5 9.2 16.5 6.8C14 6.8 12 8.4 12 11Z" fill="currentColor" fillOpacity="0.18" />
    <path d="M12 17C14.6 17 16.2 15.4 16.2 13.2C13.8 13.2 12 14.6 12 17Z" fill="currentColor" fillOpacity="0.18" />
  </svg>
);

/** Illustrative Healthy Fat Emblem (olive oil drop) */
export const IconMacroFat: React.FC<IconProps> = ({ size = 22, className, ...rest }) => (
  <svg {...baseProps(size, className)} {...rest}>
    <path
      d="M12 3.8C12 3.8 6.2 10.3 6.2 14.4C6.2 17.6 8.8 20.2 12 20.2C15.2 20.2 17.8 17.6 17.8 14.4C17.8 10.3 12 3.8 12 3.8Z"
      fill="currentColor"
      fillOpacity="0.18"
    />
    <path d="M9.6 14.8C9.6 16.2 10.6 17.2 12 17.2" />
  </svg>
);

/** Bespoke Diet Style Icons */
export const DietStyleIcon: React.FC<{ diet: DietType; size?: number; className?: string }> = ({
  diet,
  size = 24,
  className = '',
}) => {
  switch (diet) {
    case 'omnivore':
      return (
        <svg {...baseProps(size, className)}>
          <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity="0.12" />
          <path d="M8.5 12.5L11 15L15.8 9.5" strokeWidth={2.2} />
        </svg>
      );
    case 'high_protein':
      return <IconMacroProtein size={size} className={className} />;
    case 'vegetarian':
      return (
        <svg {...baseProps(size, className)}>
          <path
            d="M19 5C12 5 6.5 9.2 6.5 16.5C13.8 16.5 19 12 19 5Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path d="M6.5 16.5L13 10.5M5 19L7.5 16.5" />
        </svg>
      );
    case 'vegan':
      return (
        <svg {...baseProps(size, className)}>
          <path d="M12 19.5V10.5" />
          <path
            d="M12 12C8 12 5.5 9.5 5.5 6C9.2 6 12 8.2 12 12Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
          <path
            d="M12 14C16 14 18.5 11.5 18.5 8C14.8 8 12 10.2 12 14Z"
            fill="currentColor"
            fillOpacity="0.16"
          />
        </svg>
      );
    case 'low_carb':
      return (
        <svg {...baseProps(size, className)}>
          <path
            d="M12 4.2C8.4 4.2 6 8.2 6 12.4C6 16.4 8.7 19.5 12 19.5C15.3 19.5 18 16.4 18 12.4C18 8.2 15.6 4.2 12 4.2Z"
            fill="currentColor"
            fillOpacity="0.14"
          />
          <circle cx="12" cy="13.5" r="2.6" />
        </svg>
      );
    case 'mediterranean':
      return (
        <svg {...baseProps(size, className)}>
          <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.18" />
          <path d="M12 3.5V5.8M12 18.2V20.5M3.5 12H5.8M18.2 12H20.5M6 6L7.6 7.6M16.4 16.4L18 18M18 6L16.4 7.6M7.6 16.4L6 18" />
        </svg>
      );
  }
};
