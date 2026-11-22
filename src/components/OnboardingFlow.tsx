import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ALLERGENS_META,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  DIETS_META,
  GOALS_META,
  KITCHEN_SCENE_3D,
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
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/native';
import { BudgetDial } from './BudgetDial';
import {
  DietStyleIcon,
  Icon3D,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconFlame,
  IconMacroProtein,
  IconMinus,
  IconPlus,
  SofrehLogoMark,
} from './icons/SofrehIcons';

const TOTAL_FORM_STEPS = 9; // Steps 1..9

function ratioToCuisinePref(ratio: number): CuisinePreference {
  if (ratio >= 68) return 'mostly_persian';
  if (ratio <= 35) return 'global_explorer';
  return 'balanced';
}

export const OnboardingFlow: React.FC = () => {
  const { prefs, completeOnboarding } = useAppState();
  const [step, setStep] = useState<number>(0);
  const [direction, setDirection] = useState<number>(1);
  const [draft, setDraft] = useState<UserPreferences>({
    ...prefs,
    cookingDays:
      prefs.cookingDays && prefs.cookingDays.length > 0
        ? prefs.cookingDays
        : [0, 1, 2, 3, 4, 5, 6],
    persianRatio: typeof prefs.persianRatio === 'number' ? prefs.persianRatio : 65,
  });
  const [buildProgress, setBuildProgress] = useState<number>(0);
  const kitchenScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step !== 7) return;
    const el = kitchenScrollRef.current;
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      if (maxScroll > 0) {
        // Center horizontally in LTR scroll coordinate space
        el.scrollLeft = Math.round(maxScroll / 2);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const go = (next: number) => {
    hapticLight();
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  // Step 10: Animated Builder → Step 11 Reveal
  useEffect(() => {
    if (step !== 10) return;
    setBuildProgress(14);
    const t1 = window.setTimeout(() => setBuildProgress(46), 340);
    const t2 = window.setTimeout(() => setBuildProgress(78), 720);
    const t3 = window.setTimeout(() => {
      setBuildProgress(100);
      hapticSuccess();
      setStep(11);
    }, 1150);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
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
  const worldRatio = 100 - persianRatio;

  /* ======================== STEP 0: AUTHENTIC REAL-PHOTO SPLASH ======================== */
  if (step === 0) {
    return (
      <div className="min-h-dvh w-full bg-[#FBF5EF] flex flex-col justify-between relative overflow-hidden">
        {/* Authentic Staggered 4-Column Persian Food Photography Collage (matching original V.ob) */}
        <div className="relative w-full h-[56dvh] min-h-[340px] max-h-[540px] overflow-hidden">
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 px-2.5 sm:px-6 -mt-6 h-[112%] max-w-2xl mx-auto">
            <div className="splash-col-up flex flex-col gap-2.5 sm:gap-3.5">
              <img
                src="/assets/extracted/img_5.jpg"
                alt="غذای اصیل ایرانی"
                className="w-full h-[64%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/extracted/img_2.jpg"
                alt="سفره خانگی"
                className="w-full h-[36%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>

            <div className="splash-col-down flex flex-col gap-2.5 sm:gap-3.5 mt-11">
              <img
                src="/assets/extracted/img_4.jpg"
                alt="چلو و خورشت ایرانی"
                className="w-full h-[60%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/extracted/img_1.jpg"
                alt="غذاهای خانگی"
                className="w-full h-[40%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>

            <div className="splash-col-up flex flex-col gap-2.5 sm:gap-3.5 mt-3">
              <img
                src="/assets/extracted/img_1.jpg"
                alt="سفره رنگین"
                className="w-full h-[64%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/extracted/img_5.jpg"
                alt="غذاهای متنوع"
                className="w-full h-[36%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>

            <div className="splash-col-down flex flex-col gap-2.5 sm:gap-3.5 mt-14">
              <img
                src="/assets/extracted/img_2.jpg"
                alt="پخت خانگی"
                className="w-full h-[60%] object-cover rounded-[26px] shadow-[0_14px_30px_rgba(95,52,28,0.16)]"
              />
              <img
                src="/assets/extracted/img_4.jpg"
                alt="سفره گرم"
                className="w-full h-[40%] object-cover rounded-[26px] shadow-[0_12px_24px_rgba(95,52,28,0.12)]"
              />
            </div>
          </div>

          {/* Smooth organic melt into #FBF5EF */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(251,245,239,0.06) 0%, rgba(251,245,239,0) 42%, rgba(251,245,239,0.78) 78%, #FBF5EF 100%)',
            }}
          />
        </div>

        {/* Clean Minimal Bottom Brand & Primary CTA (Zero stat bullets, zero top headers) */}
        <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-8 safe-bottom -mt-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            className="w-16 h-16 rounded-full liquid-glass p-2 flex items-center justify-center mb-4 shadow-lg"
          >
            <SofrehLogoMark className="w-full h-full" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="font-display font-black text-[32px] sm:text-[36px] leading-[1.2] text-[#292B25] tracking-tight"
          >
            سفرهٔ هفته‌ات رو با بودجه‌ات ببند
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="text-sm font-bold text-[#75746E] mt-2.5 mb-7"
          >
            از چی بپزم تا چی بخرم
          </motion.p>

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
        </div>
      </div>
    );
  }

  /* ======================== STEP 7: FULL-SCREEN INTERACTIVE 3D KITCHEN ======================== */
  if (step === 7) {
    return (
      <motion.div
        key="step-7-fullscreen-kitchen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-[#1B1917] overflow-hidden select-none"
        data-testid="kitchen-fullscreen-stage"
      >
        {/* Full-Height 4:3 Panoramic 3D Kitchen Stage so every pin sits pixel-accurately over its appliance */}
        <div
          ref={kitchenScrollRef}
          dir="ltr"
          className="absolute inset-0 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center"
        >
          <div className="relative h-dvh aspect-[4/3] min-w-full shrink-0">
            <img
              src={KITCHEN_SCENE_3D.image}
              alt="آشپزخانه سه‌بعدی تعاملی"
              className="w-full h-full object-cover"
            />

            {/* Interactive Pulsing Appliance Pins anchored strictly to the 4:3 Kitchen coordinates */}
            {KITCHEN_SCENE_3D.hotspots.map((spot) => {
              const active = draft.appliances.includes(spot.id);
              return (
                <motion.button
                  key={spot.id}
                  type="button"
                  dir="rtl"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleAppliance(spot.id)}
                  style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
                  data-testid={`kitchen-hotspot-${spot.id}`}
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
                  <span className="text-xs font-extrabold whitespace-nowrap">
                    {spot.shortPinFa}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Subtle top & bottom gradient scrims for crisp legibility */}
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none z-20"
          style={{
            background:
              'linear-gradient(to bottom, rgba(20,18,16,0.58) 0%, rgba(20,18,16,0) 100%)',
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-36 pointer-events-none z-20"
          style={{
            background:
              'linear-gradient(to top, rgba(20,18,16,0.74) 0%, rgba(20,18,16,0) 100%)',
          }}
        />

        {/* Floating Minimal Top Bar with Circular Back Button */}
        <header className="absolute top-0 inset-x-0 z-30 px-4 pt-3 safe-top flex items-center justify-between gap-3 pointer-events-none">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => go(6)}
            aria-label="مرحله قبل"
            className="pointer-events-auto w-11 h-11 rounded-full liquid-glass text-[#292B25] flex items-center justify-center shadow-lg"
          >
            <IconArrowRight size={20} />
          </motion.button>

          <div className="liquid-glass-dark text-white px-4 py-2 rounded-full text-center">
            <span className="font-display font-black text-sm">
              وسایل آشپزخانه‌ات را لمس کن
            </span>
          </div>

          <div className="w-11 h-11 rounded-full liquid-glass-dark text-white text-xs font-extrabold flex items-center justify-center tabular-nums-fa">
            {toFaDigits(draft.appliances.length)}/{toFaDigits(KITCHEN_SCENE_3D.hotspots.length)}
          </div>
        </header>

        {/* Floating Bottom Compact Controls (Clean — zero overflowing pill strip) */}
        <footer className="absolute bottom-0 inset-x-0 z-30 px-4 pb-5 safe-bottom pointer-events-none">
          <div className="max-w-md mx-auto space-y-2.5 pointer-events-auto">
            <div className="text-center sm:hidden">
              <span className="inline-block px-3 py-1 rounded-full bg-black/45 backdrop-blur-md text-white/85 text-[11px] font-bold">
                برای دیدن کل آشپزخانه به چپ و راست بکشید
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => go(6)}
                aria-label="قبلی"
                className="w-14 h-14 rounded-full liquid-glass text-[#292B25] flex items-center justify-center shrink-0"
              >
                <IconArrowRight size={22} />
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => go(8)}
                data-testid="onboarding-next-btn"
                className="flex-1 h-14 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2"
              >
                <span>ادامه</span>
                <IconArrowLeft size={20} />
              </motion.button>
            </div>
          </div>
        </footer>
      </motion.div>
    );
  }

  /* ======================== STEPS 1..9 & 10..11 ======================== */
  const progressRatio = step >= 1 && step <= TOTAL_FORM_STEPS ? (step / TOTAL_FORM_STEPS) * 100 : 100;

  return (
    <div className="min-h-dvh w-full ambient-canvas flex flex-col">
      {/* Locked Minimal Sticky Top Progress Bar */}
      {step >= 1 && step <= TOTAL_FORM_STEPS && (
        <header className="sticky top-0 z-30 px-4 pt-3 pb-2.5 bg-[#FBF5EF]/80 backdrop-blur-xl safe-top">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => go(step - 1)}
              aria-label="مرحله قبل"
              className="w-10 h-10 rounded-full liquid-glass text-[#292B25] flex items-center justify-center shrink-0"
            >
              <IconArrowRight size={19} />
            </motion.button>

            <div className="flex-1 h-2 bg-[#EAE0D5] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
                animate={{ width: `${progressRatio}%` }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              />
            </div>

            <span className="text-xs font-extrabold text-[#75746E] tabular-nums-fa w-9 text-left">
              {toFaDigits(step)}/{toFaDigits(TOTAL_FORM_STEPS)}
            </span>
          </div>
        </header>
      )}

      {/* Main Centered Step Stage */}
      <div className="flex-1 w-full max-w-lg mx-auto px-5 py-4 pb-28 flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          {/* STEP 1: GOALS — Clean 3D Icon + Short Title ONLY (Zero Explanatory Subtext) */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-6"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] text-center">
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
                          ? 'bg-white border-2 border-[#F04438] shadow-[0_12px_28px_rgba(240,68,56,0.16)]'
                          : 'liquid-glass-card border border-white/90'
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
                      <span className="font-display font-black text-[15px] text-[#292B25]">
                        {goal.title}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 2: HOUSEHOLD SIZE (Own Dedicated Page) */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-7"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] text-center">
                سرِ سفره چند نفرید؟
              </h2>

              {/* Sculptural Servings Stepper */}
              <div className="liquid-glass-card rounded-[32px] p-7 flex items-center justify-between">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    hapticLight();
                    setDraft((d) => ({ ...d, servings: Math.max(1, d.servings - 1) }));
                  }}
                  aria-label="کاهش نفر"
                  className="w-14 h-14 rounded-full bg-[#F3E9DE] text-[#292B25] flex items-center justify-center"
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
                  <div className="text-sm font-extrabold text-[#75746E] mt-2">نفر</div>
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

              {/* Active Meal Slots */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold text-[#75746E] text-center">
                  کدام وعده‌ها را می‌پزی؟
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['breakfast', 'lunch', 'dinner'] as MealSlotType[]).map((slot) => {
                    const active = draft.activeMealSlots.includes(slot);
                    return (
                      <motion.button
                        key={slot}
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleMealSlot(slot)}
                        className={`py-3.5 rounded-full text-sm font-extrabold transition ${
                          active
                            ? 'coral-glass-pill text-white'
                            : 'liquid-glass-card text-[#292B25]'
                        }`}
                      >
                        {MEAL_SLOT_LABELS[slot]}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: WEEKLY COOKING DAYS CALENDAR */}
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
              <h2 className="font-display font-black text-[28px] text-[#292B25] text-center">
                کدام روزهای هفته می‌پزی؟
              </h2>

              {/* Visual Weekly Calendar Board */}
              <div className="liquid-glass-card rounded-[30px] p-5 space-y-5">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#75746E]">
                  <span>تقویم پخت هفته</span>
                  <span className="text-[#F04438] tabular-nums-fa">
                    {toFaDigits(selectedDays.length)} روز انتخاب شده
                  </span>
                </div>

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
                        className={`py-4 rounded-[22px] flex flex-col items-center justify-center gap-2 transition-all ${
                          active
                            ? 'coral-glass-pill text-white'
                            : 'bg-[#F3E9DE]/80 text-[#6F6B64]'
                        }`}
                      >
                        <span className="font-display font-black text-base">
                          {DAY_NAMES_SHORT[idx]}
                        </span>
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            active ? 'bg-white/25 text-white' : 'bg-white/60 text-transparent'
                          }`}
                        >
                          <IconCheck size={11} />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Selected Days Chips */}
                <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                  {selectedDays.map((idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-[#FFF0ED] text-[#C42F26] text-xs font-extrabold"
                    >
                      {DAY_NAMES_FULL[idx]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Calendar Presets */}
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
                          ? 'bg-[#292B25] text-white'
                          : 'liquid-glass text-[#5C5952]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 4: PERSIAN VS INTERNATIONAL RATIO SLIDER */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-7"
              data-testid="onboarding-cuisine-slider-step"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] text-center">
                چقدر ایرانی، چقدر جهانی؟
              </h2>

              <div className="liquid-glass-card rounded-[32px] p-6 space-y-6">
                {/* Dual Flag Split Visual */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[24px] bg-[#FFF2EE] p-4 text-center">
                    <div className="text-3xl mb-1" aria-hidden="true">🇮🇷</div>
                    <div className="font-display font-black text-3xl text-[#F04438] tabular-nums-fa">
                      {toFaDigits(persianRatio)}٪
                    </div>
                    <div className="text-xs font-extrabold text-[#292B25] mt-0.5">
                      غذای ایرانی
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-[#EEF2E6] p-4 text-center">
                    <div className="text-3xl mb-1" aria-hidden="true">🌍</div>
                    <div className="font-display font-black text-3xl text-[#68734E] tabular-nums-fa">
                      {toFaDigits(worldRatio)}٪
                    </div>
                    <div className="text-xs font-extrabold text-[#292B25] mt-0.5">
                      غذای جهانی
                    </div>
                  </div>
                </div>

                {/* Live Visual Ratio Bar */}
                <div className="h-4 rounded-full overflow-hidden flex bg-[#EFE4D8] p-0.5 gap-0.5">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
                    animate={{ width: `${persianRatio}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  />
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#68734E] to-[#8C9B6B]"
                    animate={{ width: `${worldRatio}%` }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                  />
                </div>

                {/* Interactive Range Slider */}
                <div className="space-y-2" dir="ltr">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={persianRatio}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setDraft((d) => ({
                        ...d,
                        persianRatio: val,
                        cuisinePreference: ratioToCuisinePref(val),
                      }));
                    }}
                    aria-label="نسبت غذای ایرانی به جهانی"
                    data-testid="persian-ratio-slider"
                    className="w-full accent-[#F04438] h-2.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-extrabold text-[#75746E]" dir="rtl">
                    <span>۱۰۰٪ ایرانی 🇮🇷</span>
                    <span>۵۰ / ۵۰</span>
                    <span>۱۰۰٪ جهانی 🌍</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: ALLERGIES — Seamless Edge-to-Edge 3D Icons + Title ONLY */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-6"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] text-center">
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
                          ? 'bg-white border-2 border-[#F04438] shadow-[0_12px_28px_rgba(240,68,56,0.16)]'
                          : 'liquid-glass-card border border-white/90'
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
                      <span className="font-display font-black text-[15px] text-[#292B25]">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 6: DIET STYLE — Own Dedicated Page with Quick Skip / No Restriction */}
          {step === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-5"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] text-center">
                رژیم خاصی داری؟
              </h2>

              {/* Prominent Quick Default Option: No Restriction */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  hapticLight();
                  setDraft((d) => ({ ...d, diet: 'omnivore' }));
                  go(7);
                }}
                className={`w-full rounded-[26px] p-4 flex items-center justify-between transition-all ${
                  draft.diet === 'omnivore'
                    ? 'bg-[#292B25] text-white shadow-lg'
                    : 'liquid-glass-card text-[#292B25]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-11 h-11 rounded-full flex items-center justify-center ${
                      draft.diet === 'omnivore'
                        ? 'bg-white/15 text-white'
                        : 'bg-[#F3E9DE] text-[#292B25]'
                    }`}
                  >
                    <DietStyleIcon diet="omnivore" size={22} />
                  </span>
                  <span className="font-display font-black text-base">
                    محدودیتی ندارم
                  </span>
                </div>
                <IconArrowLeft size={18} />
              </motion.button>

              {/* Other Diet Cards */}
              <div className="grid grid-cols-2 gap-3">
                {DIETS_META.filter((d) => d.id !== 'omnivore').map((item) => {
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
                      className={`rounded-[24px] p-4 flex flex-col items-center justify-center gap-2.5 text-center transition-all ${
                        active
                          ? 'coral-glass-pill text-white'
                          : 'liquid-glass-card text-[#292B25]'
                      }`}
                    >
                      <span
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          active ? 'bg-white/20 text-white' : 'bg-[#F3E9DE] text-[#C42F26]'
                        }`}
                      >
                        <DietStyleIcon diet={item.id} size={24} />
                      </span>
                      <span className="font-display font-black text-sm">{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 8: CREATIVE ROTARY BUDGET DIAL (Min 300,000 Toman!) */}
          {step === 8 && (
            <motion.div
              key="step-8"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-4"
            >
              <h2 className="font-display font-black text-[28px] text-[#292B25] text-center">
                بودجهٔ هفته‌ات چقدره؟
              </h2>

              <BudgetDial
                value={draft.weeklyBudgetToman}
                min={300_000}
                max={6_000_000}
                step={100_000}
                servings={draft.servings}
                mealsPerWeek={selectedDays.length * draft.activeMealSlots.length}
                onChange={(nextBudget) =>
                  setDraft((d) => ({ ...d, weeklyBudgetToman: nextBudget }))
                }
              />
            </motion.div>
          )}

          {/* STEP 9: AUTO-CALCULATED CALORIES & PROTEIN */}
          {step === 9 && (
            <motion.div
              key="step-9"
              initial={{ opacity: 0, x: direction * -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * 28 }}
              transition={{ type: 'spring', stiffness: 360, damping: 30 }}
              className="space-y-5"
            >
              <div className="text-center space-y-2">
                <h2 className="font-display font-black text-[28px] text-[#292B25]">
                  کالری و پروتئین روزانه
                </h2>
                <p className="text-xs font-bold text-[#68734E] bg-[#EEF2E6] inline-block px-4 py-1.5 rounded-full">
                  خودکار بر اساس هدفت حساب شده؛ نیازی به تغییر نیست
                </p>
              </div>

              <div className="space-y-3.5">
                {/* Calories Card */}
                <div className="liquid-glass-card rounded-[28px] p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center shrink-0">
                      <IconFlame size={21} />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#75746E]">کالری روزانه</div>
                      <div className="font-display font-black text-2xl text-[#292B25] tabular-nums-fa">
                        {toFaDigits(draft.dailyCalorieTarget)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        hapticLight();
                        setDraft((d) => ({
                          ...d,
                          dailyCalorieTarget: Math.max(1200, d.dailyCalorieTarget - 100),
                        }));
                      }}
                      aria-label="کاهش کالری"
                      className="w-10 h-10 rounded-full bg-[#F3E9DE] text-[#292B25] flex items-center justify-center"
                    >
                      <IconMinus size={18} />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        hapticLight();
                        setDraft((d) => ({
                          ...d,
                          dailyCalorieTarget: Math.min(3600, d.dailyCalorieTarget + 100),
                        }));
                      }}
                      aria-label="افزایش کالری"
                      className="w-10 h-10 rounded-full coral-glass-pill text-white flex items-center justify-center"
                    >
                      <IconPlus size={18} />
                    </motion.button>
                  </div>
                </div>

                {/* Protein Card */}
                <div className="liquid-glass-card rounded-[28px] p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-[#EEF2E6] text-[#68734E] flex items-center justify-center shrink-0">
                      <IconMacroProtein size={21} />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#75746E]">پروتئین روزانه</div>
                      <div className="font-display font-black text-2xl text-[#292B25] tabular-nums-fa">
                        {toFaDigits(draft.dailyProteinTarget)} گرم
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        hapticLight();
                        setDraft((d) => ({
                          ...d,
                          dailyProteinTarget: Math.max(45, d.dailyProteinTarget - 5),
                        }));
                      }}
                      aria-label="کاهش پروتئین"
                      className="w-10 h-10 rounded-full bg-[#F3E9DE] text-[#292B25] flex items-center justify-center"
                    >
                      <IconMinus size={18} />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        hapticLight();
                        setDraft((d) => ({
                          ...d,
                          dailyProteinTarget: Math.min(220, d.dailyProteinTarget + 5),
                        }));
                      }}
                      aria-label="افزایش پروتئین"
                      className="w-10 h-10 rounded-full coral-glass-pill text-white flex items-center justify-center"
                    >
                      <IconPlus size={18} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 10: ANIMATED BUILDER */}
          {step === 10 && (
            <motion.div
              key="step-10"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                className="w-20 h-20 mx-auto rounded-full coral-glass-pill p-4 flex items-center justify-center"
              >
                <SofrehLogoMark className="w-full h-full" />
              </motion.div>
              <h2 className="font-display font-black text-2xl text-[#292B25]">
                داریم سفره‌ات را می‌چینیم…
              </h2>
              <div className="max-w-xs mx-auto h-2.5 bg-[#EAE0D5] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
                  animate={{ width: `${buildProgress}%` }}
                />
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
              <div className="w-20 h-20 mx-auto rounded-full bg-[#68734E] text-white flex items-center justify-center shadow-xl">
                <IconCheck size={36} />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-display font-black text-3xl text-[#292B25]">
                  سفرهٔ هفته‌ات آماده شد
                </h2>
                <p className="text-sm font-bold text-[#75746E]">
                  {toFaDigits(selectedDays.length)} روز پخت • {toFaDigits(draft.servings)} نفر •{' '}
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

      {/* LOCKED BOTTOM NAVIGATION WITH TRUE CIRCULAR BACK & FORWARD BUTTONS */}
      {step >= 1 && step <= TOTAL_FORM_STEPS && (
        <footer className="fixed bottom-4 inset-x-4 z-30 safe-bottom pointer-events-none">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3 pointer-events-auto">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => go(step - 1)}
              aria-label="قبلی"
              className="w-14 h-14 rounded-full liquid-glass text-[#292B25] flex items-center justify-center shrink-0"
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
