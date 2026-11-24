import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ALLERGENS_META,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  DIETS_META,
  DISLIKED_FOODS_META,
  GOALS_META,
  MEAL_SLOT_LABELS,
} from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type {
  AllergenId,
  ApplianceId,
  CuisinePreference,
  DietType,
  GoalId,
  MealSlotType,
  UserPreferences,
} from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { hapticLight, hapticMedium, hapticSuccess, scrollToTopInstant } from '../utils/native';
import { computeMinimumWeeklyBudget } from '../utils/planner';
import { BudgetDial } from './BudgetDial';
import { AndroidApkDownloadCard } from './AndroidApkDownloadCard';
import { PWAInstallCard } from './PWAInstallCard';
import { CuisineRatioControl } from './CuisineRatioControl';
import { InteractiveKitchen2D } from './InteractiveKitchen2D';
import {
  DietStyleIcon,
  Icon3D,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconClose,
  IconMinus,
  IconPlus,
  IngredientIcon3D,
  MEAL_SLOT_THEMES,
  MealSlotIcon,
  SofrehLogoMark,
} from './icons/SofrehIcons';

const TOTAL_FORM_STEPS = 9; // Steps 1..9

const STEP_BACKDROPS = [
  '/assets/backgrounds/ob_table.jpg',
  '/assets/backgrounds/ob_spices.jpg',
  '/assets/backgrounds/ob_prep.jpg',
];

const BUILD_STAGES = [
  { pct: 22, label: 'بررسی ذائقه و مواد ناخواسته' },
  { pct: 52, label: 'تنظیم وعده‌ها با بودجهٔ هفته' },
  { pct: 80, label: 'همپوشانی مواد برای کاهش دورریز' },
  { pct: 96, label: 'چیدمان نهایی برنامه و لیست خرید' },
];

function ratioToCuisinePref(ratio: number): CuisinePreference {
  if (ratio >= 68) return 'mostly_persian';
  if (ratio <= 35) return 'global_explorer';
  return 'balanced';
}

export const OnboardingFlow: React.FC = () => {
  const { prefs, recipes, completeOnboarding, registerBackHandler } = useAppState();
  const [step, setStep] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [draft, setDraft] = useState<UserPreferences>({
    ...prefs,
    cookingDays:
      prefs.cookingDays && prefs.cookingDays.length > 0
        ? prefs.cookingDays
        : [0, 1, 2, 3, 4, 5, 6],
    persianRatio: typeof prefs.persianRatio === 'number' ? prefs.persianRatio : 65,
    dislikedIngredients: prefs.dislikedIngredients ?? [],
  });
  const [buildStageIdx, setBuildStageIdx] = useState<number>(0);

  const draftMinBudget = useMemo(
    () => computeMinimumWeeklyBudget(recipes, draft),
    [recipes, draft]
  );

  useEffect(() => {
    if (draft.weeklyBudgetToman < draftMinBudget) {
      setDraft((d) => ({
        ...d,
        weeklyBudgetToman: Math.ceil(draftMinBudget / 200_000) * 200_000,
      }));
    }
  }, [draft.weeklyBudgetToman, draftMinBudget]);

  const go = (next: number) => {
    hapticLight();
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  useLayoutEffect(() => {
    scrollToTopInstant();
  }, [step]);

  useEffect(() => {
    return registerBackHandler('onboarding-step-back', () => {
      if (step > 0 && step <= TOTAL_FORM_STEPS) {
        hapticLight();
        setDirection(-1);
        setStep((s) => Math.max(0, s - 1));
        return true;
      }
      if (step === 11) {
        hapticLight();
        setDirection(-1);
        setStep(TOTAL_FORM_STEPS);
        return true;
      }
      return false;
    });
  }, [step, registerBackHandler]);

  // Step 10: Longer, Purposeful 4-Stage Apple-Style Builder (~4.6s)
  useEffect(() => {
    if (step !== 10) return;
    setBuildStageIdx(0);
    const t1 = window.setTimeout(() => setBuildStageIdx(1), 1150);
    const t2 = window.setTimeout(() => setBuildStageIdx(2), 2350);
    const t3 = window.setTimeout(() => setBuildStageIdx(3), 3550);
    const t4 = window.setTimeout(() => {
      hapticSuccess();
      setStep(11);
    }, 4650);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [step]);

  const toggleGoal = (id: GoalId) => {
    hapticLight();
    setDraft((d) => {
      const exists = d.goals.includes(id);
      const next = exists ? d.goals.filter((g) => g !== id) : [...d.goals, id];
      return { ...d, goals: next.length > 0 ? next : [id] };
    });
  };

  const toggleMealSlot = (slot: MealSlotType) => {
    hapticLight();
    setDraft((d) => {
      const exists = d.activeMealSlots.includes(slot);
      const next = exists
        ? d.activeMealSlots.filter((s) => s !== slot)
        : [...d.activeMealSlots, slot];
      return { ...d, activeMealSlots: next.length > 0 ? next : [slot] };
    });
  };

  const toggleCookingDay = (dayIdx: number) => {
    hapticLight();
    setDraft((d) => {
      const current = d.cookingDays ?? [0, 1, 2, 3, 4, 5, 6];
      const exists = current.includes(dayIdx);
      const next = exists
        ? current.filter((x) => x !== dayIdx)
        : [...current, dayIdx].sort((a, b) => a - b);
      const safe = next.length > 0 ? next : [dayIdx];
      return {
        ...d,
        cookingDays: safe,
        cookingDaysPerWeek: safe.length,
      };
    });
  };

  const toggleAllergen = (id: AllergenId) => {
    hapticLight();
    setDraft((d) => ({
      ...d,
      allergens: d.allergens.includes(id)
        ? d.allergens.filter((a) => a !== id)
        : [...d.allergens, id],
    }));
  };

  const toggleDislikedGroup = (codes: string[]) => {
    hapticLight();
    setDraft((d) => {
      const current = new Set(d.dislikedIngredients ?? []);
      const isSelected = codes.every((c) => current.has(c));
      if (isSelected) {
        codes.forEach((c) => current.delete(c));
      } else {
        codes.forEach((c) => current.add(c));
      }
      return { ...d, dislikedIngredients: Array.from(current) };
    });
  };

  const toggleAppliance = (id: ApplianceId) => {
    hapticMedium();
    setDraft((d) => {
      const exists = d.appliances.includes(id);
      const next = exists
        ? d.appliances.filter((a) => a !== id)
        : [...d.appliances, id];
      return { ...d, appliances: next.length > 0 ? next : ['stovetop'] };
    });
  };

  const selectedDays = draft.cookingDays ?? [0, 1, 2, 3, 4, 5, 6];
  const persianRatio = draft.persianRatio ?? 65;
  const dislikedSet = new Set(draft.dislikedIngredients ?? []);

  /* ======================== STEP 0: REAL-PHOTO SPLASH ======================== */
  if (step === 0) {
    return (
      <div className="min-h-dvh w-full bg-[#FBF5EF] dark:bg-[#161714] flex flex-col justify-between relative overflow-hidden">
        <div className="relative w-full h-[56dvh] min-h-[340px] max-h-[540px] overflow-hidden">
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 px-2.5 sm:px-6 -mt-6 h-[112%] max-w-2xl mx-auto">
            <div className="splash-col-up flex flex-col gap-2.5 sm:gap-3.5">
              <img
                src="/assets/dishes/zereshk_polo.jpg"
                alt="زرشک پلو با مرغ"
                decoding="async"
                className="w-full h-[64%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/dishes/kuku_sabzi.jpg"
                alt="کوکو سبزی"
                decoding="async"
                className="w-full h-[36%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>

            <div className="splash-col-down flex flex-col gap-2.5 sm:gap-3.5 mt-11">
              <img
                src="/assets/dishes/tahchin.jpg"
                alt="ته‌چین زعفرانی"
                decoding="async"
                className="w-full h-[60%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/dishes/fesenjan.jpg"
                alt="خورشت فسنجان"
                decoding="async"
                className="w-full h-[40%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>

            <div className="splash-col-up flex flex-col gap-2.5 sm:gap-3.5 mt-3">
              <img
                src="/assets/dishes/joojeh_kabab.jpg"
                alt="جوجه کباب زعفرانی"
                decoding="async"
                className="w-full h-[64%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/dishes/ash_reshteh.jpg"
                alt="آش رشته"
                decoding="async"
                className="w-full h-[36%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>

            <div className="splash-col-down flex flex-col gap-2.5 sm:gap-3.5 mt-14">
              <img
                src="/assets/dishes/gheimeh.jpg"
                alt="خورشت قیمه"
                decoding="async"
                className="w-full h-[60%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/dishes/mirza_ghasemi.jpg"
                alt="میرزا قاسمی"
                decoding="async"
                className="w-full h-[40%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>
          </div>

          <div
            className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#FBF5EF]/5 via-[#FBF5EF]/60 to-[#FBF5EF] dark:from-[#161714]/15 dark:via-[#161714]/70 dark:to-[#161714]"
          />
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-8 safe-bottom -mt-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="w-20 h-20 rounded-[22px] overflow-hidden mb-4 shadow-[0_14px_32px_rgba(96,52,28,0.18)] ring-1 ring-black/5 dark:ring-white/12"
          >
            <SofrehLogoMark variant="hero" className="w-full h-full" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display font-black text-[32px] sm:text-[36px] leading-[1.2] text-[#292B25] dark:text-[#F5EFE8] tracking-tight mb-7"
          >
            سفرهٔ هفته‌ات رو با بودجه‌ات ببند
          </motion.h1>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => go(1)}
            data-testid="onboarding-start-btn"
            className="w-full h-15 rounded-full btn-shimmer text-white font-display font-black text-lg flex items-center justify-center gap-2.5"
          >
            <span>شروع کنیم</span>
            <IconArrowLeft size={20} />
          </motion.button>

          <AndroidApkDownloadCard variant="compact" />
          <PWAInstallCard variant="compact" />
        </div>
      </div>
    );
  }

  /* ======================== STEP 7: FULL-SCREEN 2D INTERACTIVE KITCHEN ======================== */
  if (step === 7) {
    return (
      <InteractiveKitchen2D
        selectedAppliances={draft.appliances}
        onToggleAppliance={toggleAppliance}
        onBack={() => go(6)}
        onConfirm={() => go(8)}
        mode="onboarding"
      />
    );
  }

  /* ======================== STEPS 1..9 & 10..11 ======================== */
  const progressRatio = step >= 1 && step <= TOTAL_FORM_STEPS ? (step / TOTAL_FORM_STEPS) * 100 : 100;
  const stepBackdropSrc = STEP_BACKDROPS[(Math.max(1, step) - 1) % STEP_BACKDROPS.length];

  return (
    <div className="min-h-dvh w-full bg-[#FBF5EF] dark:bg-[#161714] flex flex-col relative overflow-x-clip">
      {/* Photorealistic Subtle Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <img
          src={stepBackdropSrc}
          alt=""
          decoding="async"
          className="w-full h-full object-cover opacity-[0.14] dark:opacity-[0.08] scale-105 transition-opacity duration-500"
        />
        <div
          className="absolute inset-0 bg-[#FBF5EF]/80 dark:bg-[#161714]/88"
        />
      </div>

      {/* Minimal Sticky Top Progress Bar */}
      {step >= 1 && step <= TOTAL_FORM_STEPS && (
        <header className="sticky top-0 z-30 px-4 pt-3 pb-2.5 bg-[#FBF5EF]/80 dark:bg-[#161714]/85 backdrop-blur-md safe-top">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => go(step - 1)}
              aria-label="مرحله قبل"
              className="w-10 h-10 rounded-full liquid-glass text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shrink-0"
            >
              <IconArrowRight size={19} />
            </motion.button>

            <div className="flex-1 h-1.5 bg-[#EAE0D5] dark:bg-[#2A2D26] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
                animate={{ width: `${progressRatio}%` }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              />
            </div>

            <span className="text-xs font-extrabold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa w-9 text-left">
              {toFaDigits(step)}/{toFaDigits(TOTAL_FORM_STEPS)}
            </span>
          </div>
        </header>
      )}

      {/* Main Centered Step Stage */}
      <div className="relative z-10 flex-1 w-full max-w-lg mx-auto px-5 py-4 pb-28 flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1: GOALS */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-6"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] dark:text-[#F5EFE8] text-center">
                هدفت از سفره چیه؟
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {GOALS_META.map((goal) => {
                  const active = draft.goals.includes(goal.id);
                  return (
                    <motion.button
                      key={goal.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggleGoal(goal.id)}
                      className={`relative rounded-[26px] p-4 flex flex-col items-center justify-center gap-3 text-center transition-all ${
                        active
                          ? 'bg-white dark:bg-[#262822] border-2 border-[#F04438] shadow-[0_12px_28px_rgba(240,68,56,0.16)]'
                          : 'liquid-glass-card border border-white/90 dark:border-white/10'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-3 left-3 w-6 h-6 rounded-full coral-glass-pill text-white flex items-center justify-center">
                          <IconCheck size={13} />
                        </span>
                      )}
                      <Icon3D
                        src={goal.icon}
                        alt={goal.title}
                        sizeClass="w-16 h-16"
                        roundedClass="rounded-[20px]"
                      />
                      <span className="font-display font-black text-[15px] text-[#292B25] dark:text-[#F5EFE8]">
                        {goal.title}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: HOUSEHOLD SIZE + MEAL SLOTS WITH ICONS */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-7"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] dark:text-[#F5EFE8] text-center">
                سرِ سفره چند نفرید؟
              </h2>

              <div className="liquid-glass-card rounded-[32px] p-7 flex items-center justify-between">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    hapticLight();
                    setDraft((d) => ({ ...d, servings: Math.max(1, d.servings - 1) }));
                  }}
                  aria-label="کاهش نفر"
                  className="w-14 h-14 rounded-full bg-[#F3E9DE] dark:bg-[#2A2D26] text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center"
                >
                  <IconMinus size={22} />
                </motion.button>

                <div className="text-center">
                  <motion.div
                    key={draft.servings}
                    initial={{ scale: 0.8, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="font-display font-black text-6xl text-[#F04438] leading-none tabular-nums-fa"
                  >
                    {toFaDigits(draft.servings)}
                  </motion.div>
                  <div className="text-sm font-extrabold text-[#75746E] dark:text-[#ADA89F] mt-2">نفر</div>
                </div>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    hapticLight();
                    setDraft((d) => ({ ...d, servings: Math.min(10, d.servings + 1) }));
                  }}
                  aria-label="افزایش نفر"
                  className="w-14 h-14 rounded-full coral-glass-pill text-white flex items-center justify-center"
                >
                  <IconPlus size={22} />
                </motion.button>
              </div>

              {/* Meal Slots with Crisp Apple-Style Icons & Distinct Warm Color Shades */}
              <div className="grid grid-cols-3 gap-2.5" data-testid="onboarding-meal-slots">
                {(['breakfast', 'lunch', 'dinner'] as MealSlotType[]).map((slot) => {
                  const active = draft.activeMealSlots.includes(slot);
                  const theme = MEAL_SLOT_THEMES[slot];
                  return (
                    <motion.button
                      key={slot}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleMealSlot(slot)}
                      data-testid={`meal-slot-btn-${slot}`}
                      className={`rounded-[24px] py-4 px-2 flex flex-col items-center justify-center gap-2 transition-all border ${
                        active
                          ? `${theme.activePill} border-transparent`
                          : `liquid-glass-card text-[#292B25] dark:text-[#F5EFE8] ${theme.cardBorder}`
                      }`}
                    >
                      <span
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          active ? 'bg-white/22 text-white' : theme.inactiveIconBg
                        }`}
                      >
                        <MealSlotIcon slot={slot} size={22} filled={active} />
                      </span>
                      <span className="font-display font-black text-sm">
                        {MEAL_SLOT_LABELS[slot]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3: WEEKLY COOKING DAYS CALENDAR (Zero pointless bottom selected-days chip list!) */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-6"
              data-testid="onboarding-calendar-step"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] dark:text-[#F5EFE8] text-center">
                کدام روزها می‌پزی؟
              </h2>

              <div className="liquid-glass-card rounded-[30px] p-5">
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_NAMES_FULL.map((fullDay, idx) => {
                    const active = selectedDays.includes(idx);
                    return (
                      <motion.button
                        key={fullDay}
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleCookingDay(idx)}
                        data-testid={`calendar-day-${idx}`}
                        aria-label={fullDay}
                        aria-pressed={active}
                        className={`py-4 rounded-[22px] flex flex-col items-center justify-center gap-2 transition-all ${
                          active
                            ? 'coral-glass-pill text-white'
                            : 'bg-[#F3E9DE]/80 dark:bg-[#2A2D26] text-[#6F6B64] dark:text-[#ADA89F]'
                        }`}
                      >
                        <span className="font-display font-black text-base">
                          {DAY_NAMES_SHORT[idx]}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            active ? 'bg-white/25 text-white' : 'bg-white/60 dark:bg-white/10 text-transparent'
                          }`}
                        >
                          <IconCheck size={11} />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2">
                {[
                  { label: 'همهٔ هفته', days: [0, 1, 2, 3, 4, 5, 6] },
                  { label: 'شنبه تا چهارشنبه', days: [0, 1, 2, 3, 4] },
                  { label: 'یک روز در میان', days: [0, 2, 4, 6] },
                ].map((preset) => {
                  const isMatch = preset.days.join(',') === selectedDays.join(',');
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setDraft((d) => ({
                          ...d,
                          cookingDays: preset.days,
                          cookingDaysPerWeek: preset.days.length,
                        }));
                      }}
                      className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition ${
                        isMatch
                          ? 'bg-[#292B25] dark:bg-[#F5EFE8] text-white dark:text-[#161714]'
                          : 'liquid-glass text-[#5C5952] dark:text-[#C8C3BA]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 4: APPLE-STYLE IRAN VS WORLD BALANCE CONTROL */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-6"
              data-testid="onboarding-cuisine-slider-step"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] dark:text-[#F5EFE8] text-center">
                چقدر ایرانی، چقدر جهانی؟
              </h2>

              <CuisineRatioControl
                persianRatio={persianRatio}
                onChange={(val) =>
                  setDraft((d) => ({
                    ...d,
                    persianRatio: val,
                    cuisinePreference: ratioToCuisinePref(val),
                  }))
                }
              />
            </motion.div>
          )}

          {/* STEP 5: ALLERGIES */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-6"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] dark:text-[#F5EFE8] text-center">
                حساسیت غذایی داری؟
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {ALLERGENS_META.map((item) => {
                  const active = draft.allergens.includes(item.id);
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggleAllergen(item.id)}
                      className={`relative rounded-[26px] p-4 flex flex-col items-center justify-center gap-3 text-center transition-all ${
                        active
                          ? 'bg-white dark:bg-[#262822] border-2 border-[#F04438] shadow-[0_12px_28px_rgba(240,68,56,0.16)]'
                          : 'liquid-glass-card border border-white/90 dark:border-white/10'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-3 left-3 w-6 h-6 rounded-full coral-glass-pill text-white flex items-center justify-center">
                          <IconCheck size={13} />
                        </span>
                      )}
                      <Icon3D
                        src={item.icon}
                        alt={item.label}
                        sizeClass="w-16 h-16"
                        roundedClass="rounded-[20px]"
                      />
                      <span className="font-display font-black text-[15px] text-[#292B25] dark:text-[#F5EFE8]">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 6: DIET STYLE — UNIFORM 2×3 GRID (محدودیتی ندارم = Regular Button Like The Rest) */}
          {step === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-6"
              data-testid="onboarding-diet-step"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] dark:text-[#F5EFE8] text-center">
                رژیم خاصی داری؟
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {DIETS_META.map((item) => {
                  const active = draft.diet === item.id;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        hapticLight();
                        setDraft((d) => ({ ...d, diet: item.id as DietType }));
                      }}
                      data-testid={`diet-btn-${item.id}`}
                      className={`relative rounded-[26px] p-4 flex flex-col items-center justify-center gap-3 text-center transition-all ${
                        active
                          ? 'bg-white dark:bg-[#262822] border-2 border-[#F04438] shadow-[0_12px_28px_rgba(240,68,56,0.16)]'
                          : 'liquid-glass-card border border-white/90 dark:border-white/10'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-3 left-3 w-6 h-6 rounded-full coral-glass-pill text-white flex items-center justify-center">
                          <IconCheck size={13} />
                        </span>
                      )}
                      <span
                        className={`w-13 h-13 rounded-full flex items-center justify-center ${
                          active
                            ? 'coral-glass-pill text-white'
                            : 'bg-[#F3E9DE] dark:bg-[#2A2D26] text-[#C42F26] dark:text-[#FF7E75]'
                        }`}
                      >
                        <DietStyleIcon diet={item.id} size={24} />
                      </span>
                      <span className="font-display font-black text-[15px] text-[#292B25] dark:text-[#F5EFE8]">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 8: BUDGET DIAL */}
          {step === 8 && (
            <motion.div
              key="step-8"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-4"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] dark:text-[#F5EFE8] text-center">
                بودجهٔ هفته‌ات چقدره؟
              </h2>

              <BudgetDial
                value={draft.weeklyBudgetToman}
                min={draftMinBudget}
                servings={draft.servings}
                mealsPerWeek={selectedDays.length * draft.activeMealSlots.length}
                onChange={(nextBudget) =>
                  setDraft((d) => ({ ...d, weeklyBudgetToman: nextBudget }))
                }
              />
            </motion.div>
          )}

          {/* STEP 9: 24 DISLIKED FOODS WITH 3D ICONS */}
          {step === 9 && (
            <motion.div
              key="step-9"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-4"
              data-testid="onboarding-disliked-step"
            >
              <div className="text-center space-y-1">
                <h2 className="font-display font-black text-[26px] text-[#292B25] dark:text-[#F5EFE8]">
                  کدوم‌ها رو دوست نداری؟
                </h2>
                {dislikedSet.size > 0 && (
                  <div className="inline-flex items-center px-3 py-0.5 rounded-full bg-[#FFF0ED] dark:bg-[#3A2220] text-[#C42F26] dark:text-[#FF857B] text-xs font-extrabold tabular-nums-fa">
                    {toFaDigits(
                      DISLIKED_FOODS_META.filter((item) =>
                        item.codes.every((c) => dislikedSet.has(c))
                      ).length
                    )}{' '}
                    مورد حذف می‌شود
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[58dvh] overflow-y-auto px-0.5 py-1">
                {DISLIKED_FOODS_META.map((item) => {
                  const active = item.codes.every((c) => dislikedSet.has(c));
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => toggleDislikedGroup(item.codes)}
                      data-testid={`disliked-food-${item.id}`}
                      aria-pressed={active}
                      className={`relative rounded-[20px] p-2.5 flex flex-col items-center justify-center gap-1.5 text-center transition-all border ${
                        active
                          ? 'bg-[#FFF0ED] dark:bg-[#3A2220] border-2 border-[#F04438] shadow-[0_6px_16px_rgba(240,68,56,0.14)]'
                          : 'liquid-glass-card border-white/90 dark:border-white/10'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-1.5 left-1.5 w-4.5 h-4.5 rounded-full bg-[#F04438] text-white flex items-center justify-center">
                          <IconClose size={10} />
                        </span>
                      )}
                      <IngredientIcon3D
                        src={item.icon}
                        alt={item.label}
                        sizeClass="w-11 h-11"
                        className={active ? 'opacity-65 grayscale-[25%]' : ''}
                      />
                      <span
                        className={`font-display font-black text-[11px] leading-tight line-clamp-1 ${
                          active ? 'text-[#C42F26] dark:text-[#FF857B] line-through' : 'text-[#292B25] dark:text-[#F5EFE8]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 10: LONGER, PURPOSEFUL MULTI-STAGE PLAN BUILDER (~4.6s) */}
          {step === 10 && (
            <motion.div
              key="step-10"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-8"
              data-testid="onboarding-loading-step"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                className="w-22 h-22 mx-auto rounded-full coral-glass-pill p-4 flex items-center justify-center shadow-xl"
              >
                <SofrehLogoMark variant="on-coral" className="w-full h-full" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="font-display font-black text-2xl text-[#292B25] dark:text-[#F5EFE8]">
                  در حال چیدن سفرهٔ تو
                </h2>
                <div className="font-display font-black text-lg text-[#F04438] tabular-nums-fa">
                  {toFaDigits(BUILD_STAGES[buildStageIdx]?.pct ?? 100)}٪
                </div>
              </div>

              <div className="max-w-xs mx-auto h-2.5 bg-[#EAE0D5] dark:bg-[#2A2D26] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
                  initial={{ width: '8%' }}
                  animate={{ width: `${BUILD_STAGES[buildStageIdx]?.pct ?? 100}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>

              {/* Purposeful Live Build Steps Checklist */}
              <div className="max-w-xs mx-auto liquid-glass-card rounded-[24px] p-4 space-y-2.5 text-right">
                {BUILD_STAGES.map((st, idx) => {
                  const done = idx < buildStageIdx;
                  const current = idx === buildStageIdx;
                  return (
                    <div
                      key={st.label}
                      className={`flex items-center gap-2.5 text-xs font-extrabold transition-opacity ${
                        done || current ? 'opacity-100' : 'opacity-35'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          done
                            ? 'bg-[#5E8B42] text-white'
                            : current
                              ? 'bg-[#F04438] text-white'
                              : 'bg-[#E8DDD0] dark:bg-[#2A2D26] text-transparent'
                        }`}
                      >
                        <IconCheck size={11} />
                      </span>
                      <span className={done ? 'text-[#5E8B42] dark:text-[#98C87A]' : 'text-[#292B25] dark:text-[#F5EFE8]'}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 11: REVEAL */}
          {step === 11 && (
            <motion.div
              key="step-11"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-6"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-[#5E8B42] text-white flex items-center justify-center shadow-xl">
                <IconCheck size={36} />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display font-black text-3xl text-[#292B25] dark:text-[#F5EFE8]">
                  سفرهٔ هفته‌ات آماده شد
                </h2>
                <p className="text-sm font-bold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa">
                  {toFaDigits(selectedDays.length)} روز · {toFaDigits(draft.servings)} نفر ·{' '}
                  {formatToman(draft.weeklyBudgetToman)}
                </p>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => completeOnboarding(draft)}
                data-testid="onboarding-finish-btn"
                className="w-full h-15 rounded-full btn-shimmer text-white font-display font-black text-lg"
              >
                دیدن برنامهٔ هفته
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LOCKED BOTTOM NAVIGATION */}
      {step >= 1 && step <= TOTAL_FORM_STEPS && (
        <footer className="fixed bottom-4 inset-x-4 z-30 safe-bottom pointer-events-none">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3 pointer-events-auto">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => go(step - 1)}
              aria-label="قبلی"
              className="w-14 h-14 rounded-full liquid-glass text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shrink-0"
            >
              <IconArrowRight size={22} />
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => (step === TOTAL_FORM_STEPS ? go(10) : go(step + 1))}
              data-testid="onboarding-next-btn"
              className="flex-1 h-14 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2"
            >
              <span>{step === TOTAL_FORM_STEPS ? 'ساخت برنامه' : 'بعدی'}</span>
              <IconArrowLeft size={20} />
            </motion.button>
          </div>
        </footer>
      )}
    </div>
  );
};
