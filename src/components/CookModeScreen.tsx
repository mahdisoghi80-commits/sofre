import React, { useEffect, useMemo, useState } from 'react';
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
  const [timerRunning, setTimerRunning] = useState(false);

  const currentStep = recipe?.steps[stepIdx];
  const initialTimerSec = currentStep?.timerSeconds ?? 0;

  useEffect(() => {
    setRemainingSec(initialTimerSec);
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
  const progressPct = ((stepIdx + 1) / recipe.steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      className="fixed inset-0 z-50 ambient-canvas flex flex-col"
    >
      {/* LOCKED TOP HEADER */}
      <header className="shrink-0 px-4 pt-3 pb-3 safe-top liquid-glass border-b border-white/70">
        <div className="max-w-2xl mx-auto space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon3D
                src={recipe.icon}
                alt={recipe.title}
                sizeClass="w-10 h-10"
                roundedClass="rounded-[12px]"
              />
              <div className="min-w-0">
                <div className="font-display font-black text-base text-[#292B25] truncate">
                  {recipe.title}
                </div>
                <div className="text-[11px] font-bold text-[#75746E] tabular-nums-fa">
                  مرحله {toFaDigits(stepIdx + 1)} از {toFaDigits(recipe.steps.length)} •{' '}
                  {toFaDigits(cookModeServings)} نفر
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={closeCookMode}
              aria-label="خروج"
              className="w-10 h-10 rounded-full bg-white/90 text-[#292B25] flex items-center justify-center shadow-sm active:scale-90"
            >
              <IconClose size={19} />
            </button>
          </div>

          <div className="h-2 bg-[#E9DFD4] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            />
          </div>
        </div>
      </header>

      {/* MAIN STEP STAGE */}
      <div className="flex-1 overflow-y-auto px-5 py-8 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIdx}
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="liquid-glass-card rounded-[32px] p-6 sm:p-8 space-y-6"
            >
              <div className="inline-flex items-center px-3.5 py-1.5 rounded-full coral-glass-pill text-white text-xs font-extrabold">
                گام {toFaDigits(stepIdx + 1)}
              </div>

              <p className="font-display font-bold text-2xl sm:text-3xl leading-[1.7] text-[#292B25]">
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

              {initialTimerSec > 0 && (
                <div className="rounded-[26px] bg-[#292B25] text-white p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full coral-glass-pill flex items-center justify-center shrink-0">
                      <IconTimer size={22} className="text-white" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-white/70">تایمر</div>
                      <div className="font-display font-black text-3xl tabular-nums-fa">
                        {formatTimer(remainingSec)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setRemainingSec(initialTimerSec);
                        setTimerRunning(false);
                      }}
                      aria-label="بازنشانی"
                      className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
                    >
                      <IconUndo size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        hapticMedium();
                        if (remainingSec === 0) setRemainingSec(initialTimerSec);
                        setTimerRunning((r) => !r);
                      }}
                      className="h-11 px-5 rounded-full coral-glass-pill text-white font-extrabold text-sm flex items-center gap-1.5"
                    >
                      {timerRunning ? <IconPause size={16} /> : <IconPlay size={16} />}
                      <span>{timerRunning ? 'توقف' : 'شروع'}</span>
                    </button>
                  </div>
                </div>
              )}

              {currentStep.tip && (
                <div className="rounded-2xl bg-[#EEF2E6] border border-[#68734E]/25 p-4 text-sm font-bold text-[#3F4A2B] leading-relaxed">
                  {currentStep.tip}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* LOCKED CIRCULAR NAVIGATION FOOTER */}
      <footer className="shrink-0 p-4 safe-bottom liquid-glass-nav border-t border-white/70">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => {
              hapticLight();
              setStepIdx((i) => Math.max(0, i - 1));
            }}
            aria-label="مرحله قبل"
            className="w-14 h-14 rounded-full bg-white text-[#292B25] flex items-center justify-center disabled:opacity-40 shadow-sm shrink-0"
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
              className="flex-1 h-14 rounded-full bg-[#68734E] text-white font-display font-black text-base flex items-center justify-center gap-2 shadow-lg"
            >
              <IconCheck size={20} />
              <span>پایان پخت</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                hapticMedium();
                setStepIdx((i) => Math.min(recipe.steps.length - 1, i + 1));
              }}
              className="flex-1 h-14 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2"
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
