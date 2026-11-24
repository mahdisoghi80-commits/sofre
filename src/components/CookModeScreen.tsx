import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppState } from '../context/AppStateContext';
import { formatTimer, toFaDigits } from '../utils/format';
import { formatScaledStepSegments } from '../utils/planner';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/native';
import {
  Icon3D,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconPause,
  IconPlay,
  IconPlus,
  IconTimer,
  IconUndo,
} from './icons/SofrehIcons';

export const CookModeScreen: React.FC = () => {
  const {
    cookModeRecipeId,
    cookModeServings,
    recipes,
    closeCookMode,
    markRecipeCooked,
  } = useAppState();

  const recipe = useMemo(
    () => recipes.find((r) => r.id === cookModeRecipeId) ?? null,
    [recipes, cookModeRecipeId]
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [totalTimerSec, setTotalTimerSec] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const stageScrollRef = useRef<HTMLDivElement | null>(null);

  const currentStep = recipe?.steps[stepIdx];
  const initialTimerSec = currentStep?.timerSeconds ?? 0;

  useLayoutEffect(() => {
    if (stageScrollRef.current) {
      stageScrollRef.current.scrollTop = 0;
    }
  }, [stepIdx, cookModeRecipeId]);

  useEffect(() => {
    setRemainingSec(initialTimerSec);
    setTotalTimerSec(initialTimerSec);
    setTimerRunning(false);
  }, [stepIdx, initialTimerSec]);

  useEffect(() => {
    if (!timerRunning || remainingSec <= 0) return;
    const id = window.setInterval(() => {
      setRemainingSec((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          hapticSuccess();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, remainingSec]);

  if (!recipe || !currentStep) return null;

  const segments = formatScaledStepSegments(recipe, stepIdx, cookModeServings);
  const isLast = stepIdx === recipe.steps.length - 1;
  const timerProgress =
    totalTimerSec > 0 ? Math.max(0, Math.min(1, remainingSec / totalTimerSec)) : 0;
  const ringRadius = 32;
  const ringCirc = 2 * Math.PI * ringRadius;
  const ringOffset = ringCirc * (1 - timerProgress);
  const timerDone = initialTimerSec > 0 && remainingSec === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      data-testid="cook-mode-screen"
      className="fixed inset-0 z-50 bg-[#FBF5EF] dark:bg-[#161714] flex flex-col overflow-hidden"
    >
      {/* LOCKED COMPACT TOP HEADER */}
      <header className="shrink-0 px-4 pt-3 pb-3 safe-top bg-[#FBF5EF]/95 dark:bg-[#161714]/95 border-b border-[#EFE4D8] dark:border-white/10">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <Icon3D
                src={recipe.icon}
                alt={recipe.title}
                sizeClass="w-10 h-10"
                roundedClass="rounded-[12px]"
                loading="eager"
              />
              <div className="min-w-0 flex-1">
                <div className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8] truncate leading-tight">
                  {recipe.title}
                </div>
                <div className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa mt-0.5 flex items-center gap-1.5">
                  <span>
                    مرحله {toFaDigits(stepIdx + 1)} از {toFaDigits(recipe.steps.length)}
                  </span>
                  <span className="opacity-45" aria-hidden="true">•</span>
                  <span>{toFaDigits(cookModeServings)} نفر</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeCookMode}
              aria-label="خروج از حالت پخت"
              data-testid="cook-mode-close-btn"
              className="w-10 h-10 rounded-full bg-white dark:bg-[#252721] text-[#292B25] dark:text-[#F5EFE8] border border-[#EAE0D5] dark:border-white/10 flex items-center justify-center shrink-0 active:scale-90 transition"
            >
              <IconClose size={18} />
            </button>
          </div>

          {/* Clickable Segmented Step Progress Bar */}
          <div className="flex items-center gap-1.5">
            {recipe.steps.map((_, idx) => {
              const passed = idx <= stepIdx;
              const isCurrent = idx === stepIdx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setStepIdx(idx);
                  }}
                  aria-label={`رفتن به مرحله ${toFaDigits(idx + 1)}`}
                  className="flex-1 py-1 group"
                >
                  <span
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      isCurrent
                        ? 'bg-gradient-to-l from-[#FF6A5C] to-[#F04438]'
                        : passed
                          ? 'bg-[#68734E] dark:bg-[#82A663]'
                          : 'bg-[#E9DFD4] dark:bg-[#2A2D26]'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* MAIN SCROLLABLE STAGE — Safe centering via my-auto (ZERO top clipping on mobile!) */}
      <div
        ref={stageScrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 flex flex-col"
      >
        <div className="max-w-xl w-full mx-auto my-auto space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 18 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* STEP INSTRUCTION CARD */}
              <div className="liquid-glass-card rounded-[28px] p-5 sm:p-7 space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full coral-glass-pill text-white text-xs font-extrabold">
                    <span>گام {toFaDigits(stepIdx + 1)}</span>
                  </span>
                  {initialTimerSec > 0 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F3E9DE] dark:bg-[#2A2D26] text-[#5C5952] dark:text-[#C8C3BA] text-[11px] font-extrabold tabular-nums-fa">
                      <IconTimer size={14} className="text-[#F04438] dark:text-[#FF7E75]" />
                      <span>{toFaDigits(Math.max(1, Math.round(initialTimerSec / 60)))} دقیقه</span>
                    </span>
                  )}
                </div>

                <p className="font-display font-bold text-[20px] sm:text-[24px] leading-[1.9] text-[#292B25] dark:text-[#F5EFE8] break-words">
                  {segments.map((seg, i) =>
                    seg.isHighlight ? (
                      <span key={i} className="cook-qty-pill">
                        {toFaDigits(seg.text)}
                      </span>
                    ) : (
                      <React.Fragment key={i}>{toFaDigits(seg.text)}</React.Fragment>
                    )
                  )}
                </p>

                {currentStep.tip && (
                  <div className="rounded-2xl bg-[#EEF2E6] dark:bg-[#232D1F] border border-[#68734E]/20 dark:border-[#8EC06E]/25 px-4 py-3 text-[13px] font-bold text-[#3F4A2B] dark:text-[#A4D187] leading-relaxed">
                    {currentStep.tip}
                  </div>
                )}
              </div>

              {/* SELF-CONTAINED CIRCULAR COUNTDOWN TIMER CARD (ZERO overflow on 360px-390px) */}
              {initialTimerSec > 0 && (
                <div
                  data-testid="cook-mode-timer-card"
                  className="rounded-[28px] bg-[#232520] dark:bg-[#20221D] dark:border dark:border-white/10 text-white p-5 shadow-[0_14px_30px_rgba(35,37,32,0.22)] space-y-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Circular SVG Progress Ring */}
                      <div className="relative w-[76px] h-[76px] shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
                          <circle
                            cx="38"
                            cy="38"
                            r={ringRadius}
                            fill="none"
                            stroke="rgba(255,255,255,0.14)"
                            strokeWidth="6"
                          />
                          <circle
                            cx="38"
                            cy="38"
                            r={ringRadius}
                            fill="none"
                            stroke={timerDone ? '#82A663' : '#FF6A5C'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={ringCirc}
                            strokeDashoffset={ringOffset}
                            style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                          />
                        </svg>
                        <IconTimer
                          size={22}
                          className={`absolute ${timerDone ? 'text-[#9CD173]' : 'text-[#FF7A6D]'}`}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white/65">
                          {timerDone
                            ? 'زمان تمام شد!'
                            : timerRunning
                              ? 'تایمر در حال شمارش'
                              : 'تایمر این مرحله'}
                        </div>
                        <div
                          dir="ltr"
                          className="font-display font-black text-3xl sm:text-4xl tracking-tight tabular-nums-fa text-right mt-0.5"
                        >
                          {formatTimer(remainingSec)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setRemainingSec((s) => s + 60);
                        setTotalTimerSec((t) => Math.max(t, remainingSec + 60));
                      }}
                      className="h-9 px-3 rounded-full bg-white/12 hover:bg-white/20 text-white text-xs font-extrabold inline-flex items-center gap-1 shrink-0 active:scale-95 transition"
                    >
                      <IconPlus size={13} />
                      <span>۱ دقیقه</span>
                    </button>
                  </div>

                  {/* Properly Contained Action Row */}
                  <div className="grid grid-cols-12 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        hapticMedium();
                        if (remainingSec === 0) {
                          setRemainingSec(initialTimerSec);
                          setTotalTimerSec(initialTimerSec);
                        }
                        setTimerRunning((r) => !r);
                      }}
                      className={`col-span-9 h-12 rounded-full font-display font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition ${
                        timerRunning
                          ? 'bg-white text-[#232520]'
                          : 'coral-glass-pill text-white'
                      }`}
                    >
                      {timerRunning ? <IconPause size={17} /> : <IconPlay size={17} />}
                      <span>
                        {timerRunning
                          ? 'توقف تایمر'
                          : timerDone
                            ? 'شروع مجدد'
                            : 'شروع تایمر'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setRemainingSec(initialTimerSec);
                        setTotalTimerSec(initialTimerSec);
                        setTimerRunning(false);
                      }}
                      aria-label="بازنشانی تایمر"
                      className="col-span-3 h-12 rounded-full bg-white/14 hover:bg-white/22 text-white flex items-center justify-center active:scale-95 transition"
                    >
                      <IconUndo size={19} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* LOCKED CIRCULAR NAVIGATION FOOTER */}
      <footer className="shrink-0 px-4 py-3.5 safe-bottom bg-[#FBF5EF]/95 dark:bg-[#161714]/95 border-t border-[#EFE4D8] dark:border-white/10">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => {
              hapticLight();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            aria-label="مرحله قبل"
            className="w-14 h-14 rounded-full bg-white dark:bg-[#252721] border border-[#E6DACD] dark:border-white/10 text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center disabled:opacity-35 shrink-0 active:scale-90 transition"
          >
            <IconArrowRight size={22} />
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={() => {
                markRecipeCooked(recipe.id);
                closeCookMode();
              }}
              className="flex-1 h-14 rounded-full bg-[#68734E] text-white font-display font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
            >
              <IconCheck size={20} />
              <span>پایان پخت و ثبت</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                hapticMedium();
                setStepIdx((i) => Math.min(recipe.steps.length - 1, i + 1));
              }}
              className="flex-1 h-14 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <span>مرحله بعد</span>
              <IconArrowLeft size={20} />
            </button>
          )}
        </div>
      </footer>
    </motion.div>
  );
};
