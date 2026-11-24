import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { KITCHEN_SCENE_3D } from '../data/catalog';
import type { ApplianceId } from '../types/sofreh';
import { toFaDigits } from '../utils/format';
import { hapticLight } from '../utils/native';
import {
  ApplianceIcon,
  IconArrowLeft,
  IconArrowRight,
  IconCaretLeft,
  IconCaretRight,
  IconCheck,
  IconClose,
  IconPlus,
} from './icons/SofrehIcons';

interface InteractiveKitchen2DProps {
  selectedAppliances: ApplianceId[];
  onToggleAppliance: (id: ApplianceId) => void;
  onBack: () => void;
  onConfirm: () => void;
  mode: 'onboarding' | 'modal';
}

/**
 * Full-screen interactive 2D panoramic kitchen with live side scroll edge indicators,
 * tactile nudge chevrons, and a minimal bottom panoramic scroll track.
 */
export const InteractiveKitchen2D: React.FC<InteractiveKitchen2DProps> = ({
  selectedAppliances,
  onToggleAppliance,
  onBack,
  onConfirm,
  mode,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0.5);
  const [isScrollable, setIsScrollable] = useState(false);

  const syncScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    setIsScrollable(maxScroll > 16);
    if (maxScroll <= 16) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setScrollProgress(0.5);
      return;
    }
    const left = el.scrollLeft;
    setCanScrollLeft(left > 12);
    setCanScrollRight(left < maxScroll - 12);
    setScrollProgress(Math.max(0, Math.min(1, left / maxScroll)));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll > 0) {
        el.scrollLeft = Math.round(maxScroll / 2);
      }
      syncScrollIndicators();
    });

    const onResize = () => syncScrollIndicators();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, [syncScrollIndicators]);

  const nudgeHorizontal = (delta: number) => {
    const el = scrollRef.current;
    if (!el) return;
    hapticLight();
    el.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#1B1917] overflow-hidden select-none"
      data-testid="kitchen-fullscreen-stage"
    >
      {/* Full-Height 4:3 Panoramic 2D Kitchen Stage */}
      <div
        ref={scrollRef}
        dir="ltr"
        onScroll={syncScrollIndicators}
        className="absolute inset-0 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center"
      >
        <div className="relative h-dvh aspect-[4/3] min-w-full shrink-0">
          <img
            src={KITCHEN_SCENE_3D.image}
            alt="آشپزخانه تعاملی"
            className="w-full h-full object-cover"
            onLoad={syncScrollIndicators}
          />

          {/* Interactive Appliance Hotspots */}
          {KITCHEN_SCENE_3D.hotspots.map((spot) => {
            const active = selectedAppliances.includes(spot.id);
            return (
              <motion.button
                key={spot.id}
                type="button"
                dir="rtl"
                whileTap={{ scale: 0.9 }}
                onClick={() => onToggleAppliance(spot.id)}
                style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
                data-testid={`kitchen-hotspot-${spot.id}`}
                aria-pressed={active}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full transition-all shadow-xl ${
                  active
                    ? 'coral-glass-pill text-white ring-2 ring-white/95'
                    : 'bg-white/92 text-[#292B25] border border-white hover:bg-white'
                } ${!active ? 'hotspot-pulse' : ''}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    active ? 'bg-white text-[#F04438]' : 'bg-[#F04438]/12 text-[#F04438]'
                  }`}
                >
                  {active ? <IconCheck size={13} /> : <IconPlus size={13} />}
                </span>
                <ApplianceIcon
                  appliance={spot.id}
                  size={15}
                  className={active ? 'text-white/90' : 'text-[#75746E]'}
                />
                <span className="text-xs font-extrabold whitespace-nowrap">
                  {spot.shortPinFa}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Top & bottom subtle gradient scrims */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none z-20"
        style={{
          background:
            'linear-gradient(to bottom, rgba(20,18,16,0.52) 0%, rgba(20,18,16,0) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-36 pointer-events-none z-20"
        style={{
          background:
            'linear-gradient(to top, rgba(20,18,16,0.72) 0%, rgba(20,18,16,0) 100%)',
        }}
      />

      {/* LEFT SIDE SCROLL INDICATOR & NUDGE BUTTON */}
      {canScrollLeft && (
        <>
          <div
            className="absolute inset-y-0 left-0 w-14 pointer-events-none z-20"
            style={{
              background:
                'linear-gradient(to right, rgba(20,18,16,0.52) 0%, rgba(20,18,16,0) 100%)',
            }}
          />
          <motion.button
            type="button"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -3, 0] }}
            transition={{
              opacity: { duration: 0.2 },
              x: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => nudgeHorizontal(-240)}
            aria-label="حرکت به چپ آشپزخانه"
            data-testid="kitchen-scroll-left"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/48 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg"
          >
            <IconCaretLeft size={22} />
          </motion.button>
        </>
      )}

      {/* RIGHT SIDE SCROLL INDICATOR & NUDGE BUTTON */}
      {canScrollRight && (
        <>
          <div
            className="absolute inset-y-0 right-0 w-14 pointer-events-none z-20"
            style={{
              background:
                'linear-gradient(to left, rgba(20,18,16,0.52) 0%, rgba(20,18,16,0) 100%)',
            }}
          />
          <motion.button
            type="button"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: [0, 3, 0] }}
            transition={{
              opacity: { duration: 0.2 },
              x: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => nudgeHorizontal(240)}
            aria-label="حرکت به راست آشپزخانه"
            data-testid="kitchen-scroll-right"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/48 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg"
          >
            <IconCaretRight size={22} />
          </motion.button>
        </>
      )}

      {/* Minimal Floating Top Bar */}
      <header className="absolute top-0 inset-x-0 z-30 px-4 pt-3 safe-top flex items-center justify-between gap-3 pointer-events-none">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          aria-label={mode === 'onboarding' ? 'مرحله قبل' : 'بستن'}
          className="pointer-events-auto w-11 h-11 rounded-full liquid-glass text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shadow-lg"
        >
          {mode === 'onboarding' ? <IconArrowRight size={20} /> : <IconClose size={20} />}
        </motion.button>

        <div className="liquid-glass-dark text-white px-4 py-2 rounded-full flex items-center gap-2">
          <span className="font-display font-black text-sm">وسایل آشپزخانه</span>
          <span className="text-xs font-extrabold text-[#FF9B91] tabular-nums-fa">
            {toFaDigits(selectedAppliances.length)}
          </span>
        </div>

        <span className="w-11 shrink-0" />
      </header>

      {/* Bottom Panoramic Track + Primary CTA */}
      <footer className="absolute bottom-0 inset-x-0 z-30 px-4 pb-5 safe-bottom pointer-events-none">
        <div className="max-w-md mx-auto space-y-3 pointer-events-auto">
          {/* Apple-style Minimal Panoramic Scroll Indicator Bar */}
          {isScrollable && (
            <div className="flex items-center justify-center gap-2" dir="ltr" aria-hidden="true">
              <span
                className={`text-white/75 transition-opacity ${
                  canScrollLeft ? 'opacity-90' : 'opacity-25'
                }`}
              >
                <IconCaretLeft size={13} />
              </span>
              <div className="w-24 h-1.5 rounded-full bg-white/25 backdrop-blur-md relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 w-9 rounded-full bg-white shadow-sm transition-[left] duration-100"
                  style={{ left: `${scrollProgress * (100 - 37.5)}%` }}
                />
              </div>
              <span
                className={`text-white/75 transition-opacity ${
                  canScrollRight ? 'opacity-90' : 'opacity-25'
                }`}
              >
                <IconCaretRight size={13} />
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {mode === 'onboarding' && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onBack}
                aria-label="قبلی"
                className="w-14 h-14 rounded-full liquid-glass text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shrink-0"
              >
                <IconArrowRight size={22} />
              </motion.button>
            )}

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              data-testid={mode === 'onboarding' ? 'onboarding-next-btn' : 'kitchen-save-btn'}
              className="flex-1 h-14 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2"
            >
              <span>{mode === 'onboarding' ? 'ادامه' : 'ذخیره'}</span>
              {mode === 'onboarding' && <IconArrowLeft size={20} />}
            </motion.button>
          </div>
        </div>
      </footer>
    </motion.div>
  );
};
