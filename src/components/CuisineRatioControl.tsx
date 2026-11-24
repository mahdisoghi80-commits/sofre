import React, { useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { toFaDigits } from '../utils/format';
import { hapticTick } from '../utils/native';
import { CuisineFlag } from './icons/SofrehIcons';

interface CuisineRatioControlProps {
  /** 0..100 percentage of Persian food */
  persianRatio: number;
  onChange: (nextPersianRatio: number) => void;
  compact?: boolean;
}

/**
 * Interactive Iran vs World balance control.
 * Supports direct pointer dragging on the split track + tapping either card to adjust balance.
 */
export const CuisineRatioControl: React.FC<CuisineRatioControlProps> = ({
  persianRatio,
  onChange,
  compact = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const clamped = Math.max(0, Math.min(100, Math.round(persianRatio / 5) * 5));
  const worldRatio = 100 - clamped;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Distance from RIGHT edge divided by width = Persian percentage
      const distFromRight = rect.right - clientX;
      const rawPct = (distFromRight / Math.max(1, rect.width)) * 100;
      const snapped = Math.max(0, Math.min(100, Math.round(rawPct / 5) * 5));
      if (snapped !== clamped) {
        hapticTick();
        onChange(snapped);
      }
    },
    [clamped, onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className={compact ? 'space-y-3.5' : 'space-y-5'} data-testid="cuisine-ratio-control">
      {/* Dual Balance Cards — consistent with Onboarding & Profile liquid-glass cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            onChange(Math.min(100, clamped + 15));
          }}
          className={`rounded-[26px] ${compact ? 'p-3.5' : 'p-5'} flex flex-col items-center justify-center gap-2 text-center transition-all ${
            clamped >= 50
              ? 'bg-white dark:bg-[#262822] border-2 border-[#F04438] shadow-[0_12px_28px_rgba(240,68,56,0.16)]'
              : 'liquid-glass-card border border-white/90 dark:border-white/10'
          }`}
        >
          <CuisineFlag cuisine="ایرانی" size={compact ? 'md' : 'lg'} />
          <div
            className={`font-display font-black ${
              compact ? 'text-2xl' : 'text-[34px]'
            } leading-none text-[#F04438] dark:text-[#FF7E75] tabular-nums-fa`}
          >
            {toFaDigits(clamped)}٪
          </div>
          <div className="font-display font-black text-[15px] text-[#292B25] dark:text-[#F5EFE8]">ایرانی</div>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            onChange(Math.max(0, clamped - 15));
          }}
          className={`rounded-[26px] ${compact ? 'p-3.5' : 'p-5'} flex flex-col items-center justify-center gap-2 text-center transition-all ${
            worldRatio > 50
              ? 'bg-white dark:bg-[#262822] border-2 border-[#5E8B42] shadow-[0_12px_28px_rgba(94,139,66,0.15)]'
              : 'liquid-glass-card border border-white/90 dark:border-white/10'
          }`}
        >
          <CuisineFlag cuisine="جهانی" size={compact ? 'md' : 'lg'} />
          <div
            className={`font-display font-black ${
              compact ? 'text-2xl' : 'text-[34px]'
            } leading-none text-[#5E8B42] dark:text-[#98C87A] tabular-nums-fa`}
          >
            {toFaDigits(worldRatio)}٪
          </div>
          <div className="font-display font-black text-[15px] text-[#292B25] dark:text-[#F5EFE8]">جهانی</div>
        </motion.button>
      </div>

      {/* Direct-Drag Split Slider */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="نسبت غذای ایرانی به جهانی"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        data-testid="persian-ratio-slider"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onChange(Math.min(100, clamped + 5));
          if (e.key === 'ArrowRight') onChange(Math.max(0, clamped - 5));
        }}
        className="relative h-12 rounded-full liquid-glass-card border border-white/90 dark:border-white/10 p-1.5 touch-none cursor-grab active:cursor-grabbing select-none"
      >
        <div className="relative w-full h-full rounded-full overflow-hidden flex bg-[#EFE4D8] dark:bg-[#2A2D26]">
          {/* Right-anchored Persian fill (first in RTL flex) */}
          <motion.div
            className="h-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
            animate={{ width: `${clamped}%` }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
          {/* Left-anchored World fill (second in RTL flex) */}
          <motion.div
            className="h-full bg-gradient-to-r from-[#5E8B42] to-[#7DA65F]"
            animate={{ width: `${worldRatio}%` }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          />
        </div>

        {/* Crisp White Handle centered right on the split seam */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.22)] ring-1 ring-black/5 flex items-center justify-center pointer-events-none"
          animate={{ right: `calc(${clamped}% - 16px)` }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <span className="flex gap-0.5">
            <span className="w-[2px] h-3 rounded-full bg-[#C4BCB3]" />
            <span className="w-[2px] h-3 rounded-full bg-[#C4BCB3]" />
          </span>
        </motion.div>
      </div>
    </div>
  );
};
