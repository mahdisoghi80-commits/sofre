import React from 'react';
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowsDownUp,
  ArrowsLeftRight,
  Bell,
  BellRinging,
  BookOpenText,
  BookmarkSimple,
  CalendarBlank,
  CalendarPlus,
  Camera,
  CaretLeft,
  CaretRight,
  ChartBar,
  Check,
  Clock,
  CookingPot,
  Crown,
  Drop,
  Fan,
  Fire,
  FishSimple,
  Flame,
  FolderPlus,
  FadersHorizontal,
  GlobeHemisphereWest,
  Grains,
  GridFour,
  Images,
  JarLabel,
  Leaf,
  LinkSimple,
  LockSimple,
  LockSimpleOpen,
  MagnifyingGlass,
  Minus,
  Moon,
  MoonStars,
  Oven,
  Pause,
  PiggyBank,
  Plant,
  Play,
  Plus,
  Shuffle,
  Snowflake,
  Sparkle,
  Sun,
  SunHorizon,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Tote,
  Trash,
  TrendUp,
  UserCircle,
  Wallet,
  WarningCircle,
  Waves,
  Wind,
  X,
} from '@phosphor-icons/react';
import type { ApplianceId, CuisineType, DietType, MealSlotType } from '../../types/sofreh';

export interface IconProps {
  size?: number;
  filled?: boolean;
  className?: string;
}

/**
 * Official Sofreh Brand Emblem (folded Persian Termeh cloth extracted from brand guidelines).
 * Automatically adapts between Light and Dark mode without altering the Persian "سفره" logotype.
 */
export const SofrehLogoMark: React.FC<{
  className?: string;
  variant?: 'tile' | 'hero' | 'mark' | 'on-coral';
}> = ({ className = 'w-9 h-9', variant = 'tile' }) => {
  if (variant === 'hero') {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-[22px] ring-1 ring-black/5 dark:ring-white/10 ${className}`}
      >
        <img
          src="/assets/brand/logo-tile-photo.png"
          alt="لوگوی سفره"
          decoding="async"
          className="w-full h-full object-cover scale-[1.06] dark:hidden"
        />
        <img
          src="/assets/brand/logo-tile-dark-cream.png"
          alt="لوگوی سفره"
          decoding="async"
          className="w-full h-full object-cover scale-[1.06] hidden dark:block"
        />
      </span>
    );
  }

  if (variant === 'on-coral') {
    return (
      <img
        src="/assets/brand/logo-mark-cream.png"
        alt="لوگوی سفره"
        decoding="async"
        className={`object-contain shrink-0 select-none ${className}`}
      />
    );
  }

  if (variant === 'mark') {
    return (
      <span className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
        <img
          src="/assets/brand/logo-mark-coral.png"
          alt="لوگوی سفره"
          decoding="async"
          className="w-full h-full object-contain dark:brightness-110"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-[10px] ring-1 ring-black/5 dark:ring-white/12 ${className}`}
    >
      <img
        src="/assets/brand/logo-tile-coral.png"
        alt="لوگوی سفره"
        decoding="async"
        className="w-full h-full object-cover scale-[1.08] dark:hidden"
      />
      <img
        src="/assets/brand/logo-tile-dark-coral.png"
        alt="لوگوی سفره"
        decoding="async"
        className="w-full h-full object-cover scale-[1.08] hidden dark:block"
      />
    </span>
  );
};

/**
 * Unified 3D Food Icon Frame (normalized uncropped rendering + async decoded for 60 FPS scroll)
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
  loading = 'lazy',
}) => (
  <div
    className={`relative overflow-hidden shrink-0 bg-[#F7F1E8] dark:bg-[#292B25] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.85),0_4px_10px_rgba(92,52,28,0.08)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_4px_12px_rgba(0,0,0,0.35)] flex items-center justify-center ${sizeClass} ${roundedClass} ${className}`}
  >
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      className="w-full h-full object-contain select-none pointer-events-none"
    />
  </div>
);

/**
 * Transparent-Background 3D Ingredient Icon (no square box, floats cleanly beside grocery items)
 */
export const IngredientIcon3D: React.FC<{
  src: string;
  alt: string;
  sizeClass?: string;
  className?: string;
}> = ({ src, alt, sizeClass = 'w-10 h-10', className = '' }) => (
  <img
    src={src}
    alt={alt}
    loading="lazy"
    decoding="async"
    className={`shrink-0 object-contain drop-shadow-[0_3px_5px_rgba(72,42,20,0.14)] select-none pointer-events-none ${sizeClass} ${className}`}
  />
);

/**
 * Flat Crisp Rectangular Country / Cuisine Flags (No waving emoji flags!)
 */
export const CuisineFlag: React.FC<{
  cuisine: CuisineType | 'جهانی';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ cuisine, size = 'sm', className = '' }) => {
  const dims =
    size === 'xs'
      ? 'w-4 h-[11px]'
      : size === 'md'
        ? 'w-6 h-4'
        : size === 'lg'
          ? 'w-9 h-6'
          : 'w-5 h-[14px]';

  const wrapperClass = `inline-block shrink-0 rounded-[3px] overflow-hidden ring-1 ring-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.1)] align-middle ${dims} ${className}`;

  switch (cuisine) {
    case 'ایرانی':
      return (
        <svg viewBox="0 0 24 16" className={wrapperClass} aria-label="پرچم ایران">
          <rect width="24" height="5.33" y="0" fill="#239F40" />
          <rect width="24" height="5.34" y="5.33" fill="#FFFFFF" />
          <rect width="24" height="5.33" y="10.67" fill="#DA0000" />
          <circle cx="12" cy="8" r="1.45" fill="#DA0000" />
        </svg>
      );
    case 'ایتالیایی':
      return (
        <svg viewBox="0 0 24 16" className={wrapperClass} aria-label="پرچم ایتالیا">
          <rect width="8" height="16" x="0" fill="#009246" />
          <rect width="8" height="16" x="8" fill="#FFFFFF" />
          <rect width="8" height="16" x="16" fill="#CE2B37" />
        </svg>
      );
    case 'مدیترانه‌ای':
      return (
        <svg viewBox="0 0 24 16" className={wrapperClass} aria-label="پرچم مدیترانه‌ای">
          <rect width="24" height="16" fill="#0D5EAF" />
          <rect width="24" height="1.8" y="2" fill="#FFFFFF" />
          <rect width="24" height="1.8" y="5.6" fill="#FFFFFF" />
          <rect width="24" height="1.8" y="9.2" fill="#FFFFFF" />
          <rect width="24" height="1.8" y="12.8" fill="#FFFFFF" />
          <rect width="9" height="8.8" fill="#0D5EAF" />
          <rect width="9" height="1.8" y="3.5" fill="#FFFFFF" />
          <rect width="1.8" height="8.8" x="3.6" fill="#FFFFFF" />
        </svg>
      );
    case 'آسیایی':
      return (
        <svg viewBox="0 0 24 16" className={wrapperClass} aria-label="پرچم آسیایی">
          <rect width="24" height="16" fill="#FFFFFF" />
          <circle cx="12" cy="8" r="4.2" fill="#BC002D" />
        </svg>
      );
    case 'مکزیکی':
      return (
        <svg viewBox="0 0 24 16" className={wrapperClass} aria-label="پرچم مکزیک">
          <rect width="8" height="16" x="0" fill="#006847" />
          <rect width="8" height="16" x="8" fill="#FFFFFF" />
          <rect width="8" height="16" x="16" fill="#CE1126" />
          <circle cx="12" cy="8" r="1.5" fill="#8C5A2B" />
        </svg>
      );
    case 'خاورمیانه':
      return (
        <svg viewBox="0 0 24 16" className={wrapperClass} aria-label="پرچم خاورمیانه">
          <rect width="24" height="4.2" y="0" fill="#EE161F" />
          <rect width="24" height="7.6" y="4.2" fill="#FFFFFF" />
          <rect width="24" height="4.2" y="11.8" fill="#EE161F" />
          <polygon points="12,5 9.2,10.8 14.8,10.8" fill="#00A651" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 16" className={wrapperClass} aria-label="آشپزی جهانی">
          <rect width="24" height="16" fill="#1F5E8C" />
          <circle cx="12" cy="8" r="5" fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
          <ellipse cx="12" cy="8" rx="2.3" ry="5" fill="none" stroke="#FFFFFF" strokeWidth="1" />
          <line x1="7" y1="8" x2="17" y2="8" stroke="#FFFFFF" strokeWidth="1" />
        </svg>
      );
  }
};

/** Helper returning flat rectangular flag element (drop-in replacement everywhere) */
export function getCuisineFlag(cuisine: CuisineType): React.ReactNode {
  return <CuisineFlag cuisine={cuisine} size="sm" />;
}

/* ======================== AUTHENTIC PHOSPHOR DESIGNER ICONS ======================== */

export const IconSofrehPlan: React.FC<IconProps> = ({ size = 21, filled, className }) => (
  <CalendarBlank size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconMarketBasket: React.FC<IconProps> = ({ size = 21, filled, className }) => (
  <Tote size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconFridgeLens: React.FC<IconProps> = ({ size = 21, filled, className }) => (
  <Camera size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconPantryShelf: React.FC<IconProps> = ({ size = 21, filled, className }) => (
  <JarLabel size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconCookbook: React.FC<IconProps> = ({ size = 21, filled, className }) => (
  <BookOpenText size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconProfile: React.FC<IconProps> = ({ size = 21, filled, className }) => (
  <UserCircle size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconCookingPot: React.FC<IconProps> = ({ size = 20, filled, className }) => (
  <CookingPot size={size} weight={filled ? 'fill' : 'duotone'} className={className} />
);

/* ======================== ARROWS & CONTROLS ======================== */

export const IconArrowRight: React.FC<IconProps> = ({ size = 20, className }) => (
  <ArrowRight size={size} weight="bold" className={className} />
);

export const IconArrowLeft: React.FC<IconProps> = ({ size = 20, className }) => (
  <ArrowLeft size={size} weight="bold" className={className} />
);

export const IconPlus: React.FC<IconProps> = ({ size = 20, className }) => (
  <Plus size={size} weight="bold" className={className} />
);

export const IconMinus: React.FC<IconProps> = ({ size = 20, className }) => (
  <Minus size={size} weight="bold" className={className} />
);

export const IconClose: React.FC<IconProps> = ({ size = 20, className }) => (
  <X size={size} weight="bold" className={className} />
);

export const IconCheck: React.FC<IconProps> = ({ size = 20, className }) => (
  <Check size={size} weight="bold" className={className} />
);

export const IconLock: React.FC<IconProps> = ({ size = 20, className }) => (
  <LockSimple size={size} weight="bold" className={className} />
);

export const IconUnlock: React.FC<IconProps> = ({ size = 20, className }) => (
  <LockSimpleOpen size={size} weight="bold" className={className} />
);

export const IconShuffle: React.FC<IconProps> = ({ size = 20, className }) => (
  <Shuffle size={size} weight="bold" className={className} />
);

export const IconSwap: React.FC<IconProps> = ({ size = 20, className }) => (
  <ArrowsLeftRight size={size} weight="bold" className={className} />
);

export const IconFilter: React.FC<IconProps> = ({ size = 20, className }) => (
  <FadersHorizontal size={size} weight="bold" className={className} />
);

export const IconSort: React.FC<IconProps> = ({ size = 20, className }) => (
  <ArrowsDownUp size={size} weight="bold" className={className} />
);

export const IconSearch: React.FC<IconProps> = ({ size = 20, className }) => (
  <MagnifyingGlass size={size} weight="bold" className={className} />
);

/* ======================== FOOD METRICS & INTERACTION ======================== */

export const IconClock: React.FC<IconProps> = ({ size = 18, className }) => (
  <Clock size={size} weight="duotone" className={className} />
);

export const IconTimer: React.FC<IconProps> = ({ size = 20, className }) => (
  <Timer size={size} weight="duotone" className={className} />
);

export const IconFlame: React.FC<IconProps> = ({ size = 18, className }) => (
  <Fire size={size} weight="duotone" className={className} />
);

export const IconBookmark: React.FC<IconProps> = ({ size = 20, filled, className }) => (
  <BookmarkSimple size={size} weight={filled ? 'fill' : 'bold'} className={className} />
);

export const IconThumbUp: React.FC<IconProps> = ({ size = 20, filled, className }) => (
  <ThumbsUp size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconThumbDown: React.FC<IconProps> = ({ size = 20, filled, className }) => (
  <ThumbsDown size={size} weight={filled ? 'fill' : 'regular'} className={className} />
);

export const IconLinkMagic: React.FC<IconProps> = ({ size = 20, className }) => (
  <LinkSimple size={size} weight="bold" className={className} />
);

export const IconCalendarPlus: React.FC<IconProps> = ({ size = 20, className }) => (
  <CalendarPlus size={size} weight="duotone" className={className} />
);

export const IconGallery: React.FC<IconProps> = ({ size = 20, className }) => (
  <Images size={size} weight="duotone" className={className} />
);

export const IconTrash: React.FC<IconProps> = ({ size = 20, className }) => (
  <Trash size={size} weight="bold" className={className} />
);

export const IconPlay: React.FC<IconProps> = ({ size = 20, className }) => (
  <Play size={size} weight="fill" className={className} />
);

export const IconPause: React.FC<IconProps> = ({ size = 20, className }) => (
  <Pause size={size} weight="fill" className={className} />
);

export const IconUndo: React.FC<IconProps> = ({ size = 20, className }) => (
  <ArrowCounterClockwise size={size} weight="bold" className={className} />
);

export const IconBell: React.FC<IconProps> = ({ size = 20, className }) => (
  <Bell size={size} weight="duotone" className={className} />
);

export const IconKitchen: React.FC<IconProps> = ({ size = 20, className }) => (
  <Oven size={size} weight="duotone" className={className} />
);

export const IconFolderPlus: React.FC<IconProps> = ({ size = 20, className }) => (
  <FolderPlus size={size} weight="duotone" className={className} />
);

export const IconAlert: React.FC<IconProps> = ({ size = 20, className }) => (
  <WarningCircle size={size} weight="duotone" className={className} />
);

export const IconSparkle: React.FC<IconProps> = ({ size = 20, className }) => (
  <Sparkle size={size} weight="fill" className={className} />
);

export const IconGlobe: React.FC<IconProps> = ({ size = 20, className }) => (
  <GlobeHemisphereWest size={size} weight="duotone" className={className} />
);

/* ======================== ILLUSTRATIVE MACRO & DIET ICONS ======================== */

export const IconMacroProtein: React.FC<IconProps> = ({ size = 20, className }) => (
  <FishSimple size={size} weight="duotone" className={className} />
);

export const IconMacroCarbs: React.FC<IconProps> = ({ size = 20, className }) => (
  <Grains size={size} weight="duotone" className={className} />
);

export const IconMacroFat: React.FC<IconProps> = ({ size = 20, className }) => (
  <Drop size={size} weight="duotone" className={className} />
);

export const DietStyleIcon: React.FC<{ diet: DietType; size?: number; className?: string }> = ({
  diet,
  size = 24,
  className = '',
}) => {
  switch (diet) {
    case 'omnivore':
      return <Sparkle size={size} weight="duotone" className={className} />;
    case 'high_protein':
      return <FishSimple size={size} weight="duotone" className={className} />;
    case 'vegetarian':
      return <Leaf size={size} weight="duotone" className={className} />;
    case 'vegan':
      return <Plant size={size} weight="duotone" className={className} />;
    case 'low_carb':
      return <Drop size={size} weight="duotone" className={className} />;
    case 'mediterranean':
      return <SunHorizon size={size} weight="duotone" className={className} />;
  }
};

export interface MealSlotTheme {
  accentHex: string;
  cardBg: string;
  cardBorder: string;
  accentStrip: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconText: string;
  activePill: string;
  inactiveIconBg: string;
}

/**
 * Refined, distinct warm shades for Breakfast (Golden Apricot), Lunch (Saffron-Coral),
 * and Dinner (Twilight Indigo) — harmonizing seamlessly with Sofreh's warm parchment canvas.
 */
export const MEAL_SLOT_THEMES: Record<MealSlotType, MealSlotTheme> = {
  breakfast: {
    accentHex: '#D98A1C',
    cardBg: 'bg-[#FBF0DA] dark:bg-[#2B251B] dark:border dark:border-[#E39A27]/15',
    cardBorder: 'border-transparent',
    accentStrip: 'bg-[#E39A27]',
    badgeBg: 'bg-[#FDEFD5] dark:bg-[#342B1E]',
    badgeText: 'text-[#A66308] dark:text-[#F3B955]',
    iconBg: 'bg-[#FBE7C2] dark:bg-[#3A3020]',
    iconText: 'text-[#C6790E] dark:text-[#F3B955]',
    activePill:
      'bg-gradient-to-br from-[#EEAD3B] to-[#D48315] text-white shadow-[0_8px_20px_rgba(212,131,21,0.28)]',
    inactiveIconBg: 'bg-[#FBF0DA] dark:bg-[#2B251B] text-[#C6790E] dark:text-[#F3B955]',
  },
  lunch: {
    accentHex: '#E84A3C',
    cardBg: 'bg-[#FCEBE6] dark:bg-[#2C211F] dark:border dark:border-[#F04438]/15',
    cardBorder: 'border-transparent',
    accentStrip: 'bg-[#F04438]',
    badgeBg: 'bg-[#FDE2DC] dark:bg-[#372523]',
    badgeText: 'text-[#C23024] dark:text-[#FF857B]',
    iconBg: 'bg-[#FBDAD3] dark:bg-[#3D2725]',
    iconText: 'text-[#E03D31] dark:text-[#FF857B]',
    activePill:
      'bg-gradient-to-br from-[#FF6556] to-[#E63B2E] text-white shadow-[0_8px_20px_rgba(230,59,46,0.28)]',
    inactiveIconBg: 'bg-[#FCE6E1] dark:bg-[#2C211F] text-[#E03D31] dark:text-[#FF857B]',
  },
  dinner: {
    accentHex: '#545B8C',
    cardBg: 'bg-[#ECEEF8] dark:bg-[#21232E] dark:border dark:border-[#7B84BD]/18',
    cardBorder: 'border-transparent',
    accentStrip: 'bg-[#5A6298]',
    badgeBg: 'bg-[#E4E7F5] dark:bg-[#2A2D3B]',
    badgeText: 'text-[#3F4674] dark:text-[#A9B2E8]',
    iconBg: 'bg-[#DDE1F3] dark:bg-[#2E3242]',
    iconText: 'text-[#4C5488] dark:text-[#A9B2E8]',
    activePill:
      'bg-gradient-to-br from-[#6871AB] to-[#4A5284] text-white shadow-[0_8px_20px_rgba(74,82,132,0.28)]',
    inactiveIconBg: 'bg-[#E9ECF7] dark:bg-[#21232E] text-[#4C5488] dark:text-[#A9B2E8]',
  },
};

export const MealSlotIcon: React.FC<{
  slot: MealSlotType;
  size?: number;
  filled?: boolean;
  className?: string;
}> = ({ slot, size = 20, filled = false, className = '' }) => {
  const weight = filled ? 'fill' : 'duotone';
  switch (slot) {
    case 'breakfast':
      return <SunHorizon size={size} weight={weight} className={className} />;
    case 'lunch':
      return <Sun size={size} weight={weight} className={className} />;
    case 'dinner':
      return <MoonStars size={size} weight={weight} className={className} />;
  }
};

export const ApplianceIcon: React.FC<{
  appliance: ApplianceId;
  size?: number;
  className?: string;
}> = ({ appliance, size = 15, className = '' }) => {
  switch (appliance) {
    case 'stovetop':
      return <Flame size={size} weight="duotone" className={className} />;
    case 'oven':
      return <Oven size={size} weight="duotone" className={className} />;
    case 'pressure_cooker':
      return <CookingPot size={size} weight="duotone" className={className} />;
    case 'airfryer':
      return <Wind size={size} weight="duotone" className={className} />;
    case 'microwave':
      return <Waves size={size} weight="duotone" className={className} />;
    case 'blender':
      return <Fan size={size} weight="duotone" className={className} />;
    case 'grill':
      return <GridFour size={size} weight="duotone" className={className} />;
  }
};

export const IconCrown: React.FC<IconProps> = ({ size = 18, filled = true, className }) => (
  <Crown size={size} weight={filled ? 'fill' : 'duotone'} className={className} />
);

export const IconPiggyBank: React.FC<IconProps> = ({ size = 18, className }) => (
  <PiggyBank size={size} weight="duotone" className={className} />
);

export const IconWallet: React.FC<IconProps> = ({ size = 18, className }) => (
  <Wallet size={size} weight="duotone" className={className} />
);

export const IconSnowflake: React.FC<IconProps> = ({ size = 18, className }) => (
  <Snowflake size={size} weight="duotone" className={className} />
);

export const IconCaretLeft: React.FC<IconProps> = ({ size = 20, className }) => (
  <CaretLeft size={size} weight="bold" className={className} />
);

export const IconCaretRight: React.FC<IconProps> = ({ size = 20, className }) => (
  <CaretRight size={size} weight="bold" className={className} />
);

export const IconMoon: React.FC<IconProps> = ({ size = 18, className }) => (
  <Moon size={size} weight="duotone" className={className} />
);

export const IconBellRinging: React.FC<IconProps> = ({ size = 18, className }) => (
  <BellRinging size={size} weight="duotone" className={className} />
);

export const IconChartBar: React.FC<IconProps> = ({ size = 18, className }) => (
  <ChartBar size={size} weight="duotone" className={className} />
);

export const IconTrendUp: React.FC<IconProps> = ({ size = 18, className }) => (
  <TrendUp size={size} weight="duotone" className={className} />
);
