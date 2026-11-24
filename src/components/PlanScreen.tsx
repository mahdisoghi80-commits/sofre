import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  APPLIANCE_SHORT_LABELS,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  MEAL_SLOT_LABELS,
} from '../data/catalog';
import { getIngredientIconPath } from '../data/database/ingredientIcons';
import { useAppState } from '../context/AppStateContext';
import type { PlannedMeal } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import {
  buildWeeklyPrepInsights,
  getRecipeConsumptionCostForServings,
  getSwapCandidates,
} from '../utils/planner';
import { hapticLight } from '../utils/native';
import { ContextActionMenu, useLongPress, type ContextMenuAction } from './ContextActionMenu';
import { MacroRing } from './MacroRing';
import { PlanInsightSheets, type PlanInsightSheetType } from './PlanInsightSheets';
import { PrepAlertModal, type PrepAlertItem } from './PrepAlertModal';
import {
  ApplianceIcon,
  getCuisineFlag,
  Icon3D,
  IconBellRinging,
  IconBookmark,
  IconCaretLeft,
  IconCheck,
  IconClock,
  IconClose,
  IconCookingPot,
  IconCrown,
  IconFlame,
  IconMacroCarbs,
  IconMacroFat,
  IconMacroProtein,
  IconMoon,
  IconPiggyBank,
  IconPlus,
  IconSwap,
  IconTrash,
  IconWallet,
  IngredientIcon3D,
  MEAL_SLOT_THEMES,
  SofrehLogoMark,
} from './icons/SofrehIcons';

export const PlanScreen: React.FC<{
  onOpenAddMeal: (dayIndex: number) => void;
  onOpenSubscription: () => void;
}> = ({ onOpenAddMeal, onOpenSubscription }) => {
  const {
    prefs,
    recipes,
    plan,
    pantry,
    cookbooks,
    recipeFeedback,
    selectedDay,
    costSummary,
    setSelectedDay,
    openRecipe,
    startCookMode,
    swapMeal,
    markRecipeCooked,
    removeMealFromPlan,
    toggleRecipeInCookbook,
    registerBackHandler,
  } = useAppState();

  const [swappingMeal, setSwappingMeal] = useState<PlannedMeal | null>(null);
  const [contextMeal, setContextMeal] = useState<PlannedMeal | null>(null);
  const [activeInsightSheet, setActiveInsightSheet] = useState<PlanInsightSheetType>(null);
  const [swipeDir, setSwipeDir] = useState<number>(0);
  const [activePrepPopup, setActivePrepPopup] = useState<PrepAlertItem | null>(null);
  const [donePrepIds, setDonePrepIds] = useState<Record<string, boolean>>({});
  const autoShownPrepRef = useRef<Set<string>>(new Set());
  const userSwitchedDayRef = useRef(false);

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!swappingMeal && !activeInsightSheet && !contextMeal) return;
    return registerBackHandler('plan-modals-sheet', () => {
      if (contextMeal) {
        setContextMeal(null);
        return true;
      }
      if (swappingMeal) {
        setSwappingMeal(null);
        return true;
      }
      if (activeInsightSheet) {
        setActiveInsightSheet(null);
        return true;
      }
      return false;
    });
  }, [swappingMeal, activeInsightSheet, contextMeal, registerBackHandler]);

  const recipeMap = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);

  const dayMeals = useMemo(() => {
    const slotOrder = { breakfast: 0, lunch: 1, dinner: 2 };
    return plan
      .filter((m) => m.dayIndex === selectedDay)
      .sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot]);
  }, [plan, selectedDay]);

  const dayMacros = useMemo(() => {
    let cal = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const m of dayMeals) {
      const r = recipeMap.get(m.recipeId);
      if (!r) continue;
      cal += r.caloriesPerServing;
      protein += r.proteinG;
      carbs += r.carbsG;
      fat += r.fatG;
    }
    return { cal, protein, carbs, fat };
  }, [dayMeals, recipeMap]);

  const weeklyInsights = useMemo(
    () => buildWeeklyPrepInsights(plan, recipes),
    [plan, recipes]
  );

  const swapCandidates = useMemo(() => {
    if (!swappingMeal) return [];
    return getSwapCandidates(
      swappingMeal,
      plan,
      recipes,
      prefs,
      pantry,
      recipeFeedback
    );
  }, [swappingMeal, plan, recipes, prefs, pantry, recipeFeedback]);

  const tomorrowIdx = (selectedDay + 1) % 7;
  const tomorrowSoaking = useMemo(
    () => weeklyInsights.soakingAlerts.find((a) => a.dayIndex === tomorrowIdx) ?? null,
    [weeklyInsights.soakingAlerts, tomorrowIdx]
  );

  // Trigger visual prep popup cleanly when user navigates to a day whose tomorrow needs soaking
  useEffect(() => {
    if (!userSwitchedDayRef.current) return;
    if (!tomorrowSoaking) return;
    if (donePrepIds[tomorrowSoaking.recipeId]) return;
    if (autoShownPrepRef.current.has(tomorrowSoaking.recipeId)) return;
    autoShownPrepRef.current.add(tomorrowSoaking.recipeId);
    const timer = window.setTimeout(() => {
      setActivePrepPopup(tomorrowSoaking);
    }, 320);
    return () => window.clearTimeout(timer);
  }, [tomorrowSoaking, donePrepIds]);

  const switchDay = (nextIdx: number, dir: number) => {
    const wrapped = ((nextIdx % 7) + 7) % 7;
    if (wrapped === selectedDay) return;
    userSwitchedDayRef.current = true;
    hapticLight();
    setSwipeDir(dir);
    setSelectedDay(wrapped);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || e.changedTouches.length === 0) return;

    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const elapsed = Date.now() - start.time;

    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.35 && elapsed < 750) {
      if (dx > 0) {
        switchDay(selectedDay + 1, 1);
      } else {
        switchDay(selectedDay - 1, -1);
      }
    }
  };

  // Consistent Apple Fitness macro targets
  const targetCarbs = Math.max(120, Math.round((prefs.dailyCalorieTarget * 0.45) / 4));
  const targetFat = Math.max(45, Math.round((prefs.dailyCalorieTarget * 0.28) / 9));

  // Clear weekly daily spend data for mini 7-day budget chart
  const dailySpend = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayIdx) => {
      let total = 0;
      for (const m of plan) {
        if (m.dayIndex !== dayIdx) continue;
        const r = recipeMap.get(m.recipeId);
        if (!r) continue;
        total += getRecipeConsumptionCostForServings(r, m.servings);
      }
      return total;
    });
  }, [plan, recipeMap]);

  const cookingDaysCount = Math.max(1, prefs.cookingDays?.length ?? 7);
  const dailyBudgetGuide = Math.round(costSummary.weeklyBudgetToman / cookingDaysCount);
  const maxDailySpend = Math.max(dailyBudgetGuide * 1.15, ...dailySpend, 1);

  const budgetDiff = costSummary.weeklyBudgetToman - costSummary.consumptionCostToman;
  const isOverBudget = budgetDiff < 0;

  return (
    <div className="space-y-4">
      {/* APPLE-CLEAN HEADER: Brand + Single Buy Subscription CTA */}
      <header
        data-testid="plan-sticky-header"
        className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/90 dark:bg-[#161714]/90 backdrop-blur-md border-b border-white/60 dark:border-white/10 safe-top"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SofrehLogoMark variant="mark" className="w-10 h-10 shrink-0" />
            <h1 className="font-display font-black text-2xl text-[#292B25] dark:text-[#F5EFE8] tracking-tight">
              سفره
            </h1>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              hapticLight();
              onOpenSubscription();
            }}
            data-testid="plan-buy-subscription-btn"
            className={`h-9 px-3.5 rounded-full flex items-center gap-1.5 text-xs font-extrabold whitespace-nowrap shrink-0 transition shadow-sm ${
              prefs.isPro
                ? 'bg-[#EEF2E6] dark:bg-[#232D1F] text-[#4C6E35] dark:text-[#98C87A] border border-[#5E8B42]/20 dark:border-[#8EC06E]/30'
                : 'bg-[#292B25] dark:bg-[#F5EFE8] text-white dark:text-[#161714] hover:bg-black dark:hover:bg-white'
            }`}
          >
            <IconCrown
              size={15}
              className={prefs.isPro ? 'text-[#5E8B42] dark:text-[#98C87A]' : 'text-[#F8C146] dark:text-[#D98A1C]'}
            />
            <span>{prefs.isPro ? 'سفره پلاس' : 'خرید اشتراک'}</span>
          </motion.button>
        </div>
      </header>

      {/* JALALI 7-DAY LIQUID GLASS STRIP */}
      <div className="liquid-glass rounded-full p-1.5 grid grid-cols-7 gap-1">
        {DAY_NAMES_SHORT.map((shortName, idx) => {
          const active = selectedDay === idx;
          const count = plan.filter((m) => m.dayIndex === idx).length;
          return (
            <button
              key={shortName}
              type="button"
              data-testid={`day-pill-${idx}`}
              onClick={() => switchDay(idx, idx > selectedDay ? 1 : -1)}
              className="relative py-2 rounded-full flex flex-col items-center justify-center gap-1 transition-all"
            >
              {active && (
                <motion.span
                  layoutId="activeDayPill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 rounded-full coral-glass-pill"
                />
              )}
              <span
                className={`relative z-10 font-display font-black text-sm ${
                  active ? 'text-white' : 'text-[#292B25] dark:text-[#F5EFE8]'
                }`}
              >
                {shortName}
              </span>
              <span
                className={`relative z-10 w-1.5 h-1.5 rounded-full ${
                  count > 0
                    ? active
                      ? 'bg-white'
                      : 'bg-[#F04438]'
                    : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* MAIN GRID: MEALS + ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          data-testid="plan-swipe-area"
          className="lg:col-span-7 space-y-3 touch-pan-y"
        >
          {/* Clean Day Title + Add Meal Button (Zero pointless swipe hint text) */}
          <div className="flex items-center justify-between">
            <h2
              data-testid="plan-active-day-title"
              className="font-display font-black text-lg text-[#292B25] dark:text-[#F5EFE8]"
            >
              {DAY_NAMES_FULL[selectedDay]}
            </h2>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onOpenAddMeal(selectedDay)}
              aria-label="افزودن وعده"
              className="w-9 h-9 rounded-full liquid-glass text-[#F04438] flex items-center justify-center"
            >
              <IconPlus size={18} />
            </motion.button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selectedDay}
              initial={{ opacity: 0, x: swipeDir === 0 ? 0 : swipeDir * -26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: swipeDir === 0 ? 0 : swipeDir * 26 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="space-y-3"
            >
              {dayMeals.length === 0 ? (
                <div className="liquid-glass-card rounded-[28px] p-7 text-center space-y-3">
                  <button
                    type="button"
                    onClick={() => onOpenAddMeal(selectedDay)}
                    className="px-5 py-2.5 rounded-full coral-glass-pill text-white text-xs font-extrabold inline-flex items-center gap-1.5"
                  >
                    <IconPlus size={15} />
                    <span>افزودن غذا</span>
                  </button>
                </div>
              ) : (
                dayMeals.map((meal, idx) => {
                  const recipe = recipeMap.get(meal.recipeId);
                  if (!recipe) return null;
                  return (
                    <PlanMealCard
                      key={`${meal.id}-${meal.recipeId}`}
                      meal={meal}
                      recipe={recipe}
                      idx={idx}
                      onOpen={() => openRecipe(recipe.id, meal.servings)}
                      onSwap={() => setSwappingMeal(meal)}
                      onLongPress={() => setContextMeal(meal)}
                    />
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>

          {/* VISUAL DAY-BEFORE PREP CARD (Opens Interactive Popup + Push Notification) */}
          {tomorrowSoaking && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                hapticLight();
                setActivePrepPopup(tomorrowSoaking);
              }}
              data-testid="plan-prep-alert-card"
              className={`w-full rounded-[26px] p-3.5 flex items-center justify-between gap-3 text-right transition border ${
                donePrepIds[tomorrowSoaking.recipeId]
                  ? 'bg-[#EEF2E6]/70 dark:bg-[#232D1F] border-[#5E8B42]/25 dark:border-[#8EC06E]/30'
                  : 'bg-[#292B25] dark:bg-[#252721] text-white border-[#292B25] dark:border-white/12 shadow-[0_10px_24px_rgba(41,43,37,0.16)]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-12 h-12 rounded-[16px] bg-white/12 flex items-center justify-center shrink-0">
                  <IngredientIcon3D
                    src={getIngredientIconPath(
                      tomorrowSoaking.legumeCodes[0],
                      tomorrowSoaking.legumes[0]
                    )}
                    alt={tomorrowSoaking.legumes[0] ?? 'حبوبات'}
                    sizeClass="w-9 h-9"
                  />
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F8C146] text-[#292B25] flex items-center justify-center">
                    <IconMoon size={11} />
                  </span>
                </div>
                <div className="min-w-0">
                  <div
                    className={`text-[10px] font-extrabold ${
                      donePrepIds[tomorrowSoaking.recipeId]
                        ? 'text-[#5E8B42] dark:text-[#98C87A]'
                        : 'text-[#FFD66B]'
                    }`}
                  >
                    {donePrepIds[tomorrowSoaking.recipeId] ? 'انجام شد' : 'خیساندن امشب'}
                  </div>
                  <div
                    className={`font-display font-black text-sm truncate ${
                      donePrepIds[tomorrowSoaking.recipeId] ? 'text-[#292B25] dark:text-[#F5EFE8]' : 'text-white'
                    }`}
                  >
                    {tomorrowSoaking.legumes.join(' · ')}
                  </div>
                  <div
                    className={`text-[11px] font-bold truncate ${
                      donePrepIds[tomorrowSoaking.recipeId] ? 'text-[#75746E] dark:text-[#ADA89F]' : 'text-white/65'
                    }`}
                  >
                    {DAY_NAMES_FULL[tomorrowSoaking.dayIndex]} · {tomorrowSoaking.recipeTitle}
                  </div>
                </div>
              </div>

              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  donePrepIds[tomorrowSoaking.recipeId]
                    ? 'bg-[#5E8B42] text-white'
                    : 'bg-white/14 text-white'
                }`}
              >
                {donePrepIds[tomorrowSoaking.recipeId] ? (
                  <IconCheck size={17} />
                ) : (
                  <IconBellRinging size={17} />
                )}
              </span>
            </motion.button>
          )}

          {/* CLICKABLE VISUAL WASTE-SAVINGS STAT WIDGET (Opens Savings Sheet) */}
          {weeklyInsights.sharedPerishableCount > 0 && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveInsightSheet('savings')}
              data-testid="plan-savings-widget"
              className="w-full liquid-glass-card rounded-[26px] px-4 py-3.5 flex items-center justify-between gap-3 text-right hover:border-[#5E8B42]/40 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-[16px] bg-[#EEF2E6] dark:bg-[#253020] text-[#5E8B42] dark:text-[#8EC06E] flex items-center justify-center shrink-0">
                  <IconPiggyBank size={22} />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F]">صرفه‌جویی هفته</div>
                  <div className="font-display font-black text-lg text-[#4C6E35] dark:text-[#98C87A] tabular-nums-fa leading-tight">
                    {formatToman(weeklyInsights.estimatedWasteSavedToman)}
                  </div>
                </div>
              </div>

              {/* Overlapping 3D Ingredient Avatar Cluster + Click Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center -space-x-2 space-x-reverse">
                  {weeklyInsights.sharedPerishables.slice(0, 4).map((ing) => (
                    <span
                      key={ing.code}
                      title={ing.name}
                      className="w-9 h-9 rounded-full bg-[#FBF5EF] dark:bg-[#2A2D26] border-2 border-white dark:border-[#20221D] shadow-sm flex items-center justify-center"
                    >
                      <IngredientIcon3D
                        src={getIngredientIconPath(ing.code, ing.name)}
                        alt={ing.name}
                        sizeClass="w-7 h-7"
                      />
                    </span>
                  ))}
                </div>
                <IconCaretLeft size={16} className="text-[#9B958C] dark:text-[#8E8A82]" />
              </div>
            </motion.button>
          )}
        </div>

        {/* ANALYTICS COLUMN — CLICKABLE MACROS + CREATIVE 7-DAY BUDGET CARD */}
        <div className="lg:col-span-5 space-y-4">
          {/* CLICKABLE APPLE-FITNESS MACRO & PROTEIN CARD */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={() => setActiveInsightSheet('macros')}
            data-testid="plan-macro-card"
            className="w-full text-right liquid-glass-card rounded-[28px] p-5 space-y-3 hover:border-[#5E8B42]/35 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#75746E] dark:text-[#ADA89F]">
                ارزش غذایی {DAY_NAMES_FULL[selectedDay]}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-[#5E8B42] dark:text-[#8EC06E]">
                <span>نمودار هفته</span>
                <IconCaretLeft size={14} />
              </span>
            </div>

            <div className="flex items-center gap-5">
              <MacroRing
                calories={dayMacros.cal}
                targetCalories={prefs.dailyCalorieTarget}
                size={102}
                strokeWidth={9.5}
              />

              <div className="flex-1 min-w-0 space-y-3">
                {[
                  {
                    label: 'پروتئین',
                    val: dayMacros.protein,
                    target: prefs.dailyProteinTarget,
                    color: '#5E8B42',
                    track: 'bg-[#E9EFE1] dark:bg-[#2A2E26]',
                    icon: <IconMacroProtein size={14} className="text-[#5E8B42] dark:text-[#8EC06E]" />,
                  },
                  {
                    label: 'کربوهیدرات',
                    val: dayMacros.carbs,
                    target: targetCarbs,
                    color: '#E59326',
                    track: 'bg-[#F8EFE2] dark:bg-[#2E2A22]',
                    icon: <IconMacroCarbs size={14} className="text-[#E59326] dark:text-[#F3B955]" />,
                  },
                  {
                    label: 'چربی',
                    val: dayMacros.fat,
                    target: targetFat,
                    color: '#3B82F6',
                    track: 'bg-[#E9F0FC] dark:bg-[#232A36]',
                    icon: <IconMacroFat size={14} className="text-[#3B82F6] dark:text-[#60A5FA]" />,
                  },
                ].map((m) => {
                  const pct = Math.min(100, Math.round((m.val / Math.max(1, m.target)) * 100));
                  return (
                    <div key={m.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-extrabold text-[#292B25] dark:text-[#F5EFE8]">
                          {m.icon}
                          <span>{m.label}</span>
                        </span>
                        <span className="font-extrabold text-[#292B25] dark:text-[#F5EFE8] tabular-nums-fa">
                          {toFaDigits(m.val)}
                          <span className="text-[#8A847C] dark:text-[#9A958C] font-bold text-[10px]">
                            {' '}از {toFaDigits(m.target)} گرم
                          </span>
                        </span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${m.track}`}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: m.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.button>

          {/* CRYSTAL-CLEAR, CLICKABLE 7-DAY BUDGET CARD (One Headline Number + Mini Daily Spend Bars) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={() => setActiveInsightSheet('budget')}
            data-testid="plan-budget-card"
            className="w-full text-right liquid-glass-card rounded-[28px] p-5 space-y-4 hover:border-[#F04438]/35 transition"
          >
            {/* Single Crystal-Clear Headline + Status Chip */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-[16px] bg-[#FFF0ED] dark:bg-[#3A2220] text-[#F04438] dark:text-[#FF7E75] flex items-center justify-center shrink-0">
                  <IconWallet size={21} />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F]">هزینهٔ غذای هفته</div>
                  <div className="font-display font-black text-[22px] leading-tight text-[#292B25] dark:text-[#F5EFE8] tabular-nums-fa">
                    {formatToman(costSummary.consumptionCostToman)}
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold tabular-nums-fa shrink-0 ${
                  isOverBudget
                    ? 'bg-[#FFF0ED] dark:bg-[#3A2220] text-[#C42F26] dark:text-[#FF857B]'
                    : 'bg-[#EEF5E9] dark:bg-[#232D1F] text-[#4C6E35] dark:text-[#98C87A]'
                }`}
              >
                {isOverBudget
                  ? `${toFaDigits(Math.round(Math.abs(budgetDiff) / 1000))} هزار بیشتر`
                  : `${toFaDigits(Math.round(budgetDiff / 1000))} هزار زیر بودجه`}
              </span>
            </div>

            {/* Visual 7-Day Daily Spend Mini Bar Chart */}
            <div className="relative h-20 pt-2 px-1 flex items-end justify-between gap-2">
              <div
                className="absolute inset-x-1 border-t border-dashed border-[#C87955]/45 dark:border-[#C87955]/55 pointer-events-none"
                style={{
                  bottom: `${Math.min(86, Math.max(22, Math.round((dailyBudgetGuide / maxDailySpend) * 100)))}%`,
                }}
              />
              {dailySpend.map((amt, idx) => {
                const pct = amt > 0 ? Math.max(14, Math.round((amt / maxDailySpend) * 100)) : 8;
                const isSelected = idx === selectedDay;
                return (
                  <div key={idx} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
                    <div className="w-full max-w-[22px] flex-1 flex items-end">
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          isSelected
                            ? 'bg-gradient-to-t from-[#F04438] to-[#FF7666] shadow-[0_3px_10px_rgba(240,68,56,0.3)]'
                            : amt > 0
                              ? 'bg-[#E5D7C8] dark:bg-[#3A3D34]'
                              : 'bg-[#F0E6DA] dark:bg-[#2A2D26]'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-black leading-none ${
                        isSelected ? 'text-[#F04438] dark:text-[#FF7E75]' : 'text-[#8C867E] dark:text-[#9A958C]'
                      }`}
                    >
                      {DAY_NAMES_SHORT[idx]}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Clean Footer Affordance */}
            <div className="pt-2.5 border-t border-[#EFE4D8] dark:border-white/10 flex items-center justify-between text-xs">
              <span className="font-bold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa">
                سقف بودجه: <strong className="text-[#292B25] dark:text-[#F5EFE8]">{formatToman(costSummary.weeklyBudgetToman)}</strong>
              </span>
              <span className="inline-flex items-center gap-0.5 font-extrabold text-[#F04438] dark:text-[#FF7E75]">
                <span>جزئیات و تنظیم</span>
                <IconCaretLeft size={14} />
              </span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* CLICKABLE INSIGHT SHEETS (Budget, Macros/Protein, Waste Savings) */}
      <PlanInsightSheets
        activeSheet={activeInsightSheet}
        onClose={() => setActiveInsightSheet(null)}
        weeklyInsights={weeklyInsights}
      />

      {/* VISUAL PREP POPUP + PUSH NOTIFICATION MODAL */}
      <PrepAlertModal
        alert={activePrepPopup}
        done={Boolean(activePrepPopup && donePrepIds[activePrepPopup.recipeId])}
        onMarkDone={(recipeId) =>
          setDonePrepIds((prev) => ({ ...prev, [recipeId]: true }))
        }
        onClose={() => setActivePrepPopup(null)}
      />

      {/* SWAP SHEET */}
      <AnimatePresence>
        {swappingMeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSwappingMeal(null)}
            className="fixed inset-0 z-50 bg-[#292B25]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg max-h-[80dvh] bg-[#FBF5EF] dark:bg-[#1E201B] rounded-t-[32px] sm:rounded-[32px] p-5 flex flex-col shadow-2xl border border-white dark:border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-black text-xl text-[#292B25] dark:text-[#F5EFE8]">
                  جایگزین {MEAL_SLOT_LABELS[swappingMeal.slot]}
                </h3>
                <button
                  type="button"
                  onClick={() => setSwappingMeal(null)}
                  aria-label="بستن"
                  className="w-9 h-9 rounded-full bg-white dark:bg-[#2A2C25] text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shadow-sm"
                >
                  <IconClose size={17} />
                </button>
              </div>

              <div className="overflow-y-auto space-y-2.5 flex-1">
                {swapCandidates.map((cand) => (
                  <button
                    key={cand.recipe.id}
                    type="button"
                    onClick={() => {
                      swapMeal(swappingMeal.id, cand.recipe.id, cand.matchReasons);
                      setSwappingMeal(null);
                    }}
                    className="w-full bg-white dark:bg-[#262822] rounded-2xl p-3 flex items-center gap-3 text-right hover:border-[#F04438] border border-transparent dark:border-white/8 shadow-sm transition"
                  >
                    <Icon3D
                      src={cand.recipe.icon}
                      alt={cand.recipe.title}
                      sizeClass="w-13 h-13"
                      roundedClass="rounded-[15px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center">
                          {getCuisineFlag(cand.recipe.cuisine)}
                        </span>
                        <span className="font-extrabold text-sm text-[#292B25] dark:text-[#F5EFE8] truncate">
                          {cand.recipe.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa">
                        <span>{toFaDigits(cand.recipe.prepMinutes + cand.recipe.cookMinutes)}د</span>
                        <span>{toFaDigits(cand.recipe.caloriesPerServing)} کالری</span>
                        {cand.recipe.requiredAppliances.slice(0, 2).map((app) => (
                          <ApplianceIcon key={app} appliance={app} size={13} />
                        ))}
                      </div>
                    </div>
                    <div
                      className={`text-xs font-extrabold tabular-nums-fa shrink-0 ${
                        cand.deltaConsumptionCostToman <= 0
                          ? 'text-[#5E8B42] dark:text-[#98C87A]'
                          : 'text-[#C87955] dark:text-[#E59B78]'
                      }`}
                    >
                      {cand.deltaConsumptionCostToman <= 0 ? '−' : '+'}
                      {formatToman(Math.abs(cand.deltaConsumptionCostToman))}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* LONG-PRESS CONTEXT MENU FOR PLANNED MEALS */}
      <ContextActionMenu
        open={Boolean(contextMeal)}
        preview={(() => {
          if (!contextMeal) return null;
          const r = recipeMap.get(contextMeal.recipeId);
          if (!r) return null;
          return {
            title: r.title,
            subtitle: `${MEAL_SLOT_LABELS[contextMeal.slot]} ${DAY_NAMES_FULL[contextMeal.dayIndex]} · ${formatToman(getRecipeConsumptionCostForServings(r, contextMeal.servings))}`,
            iconSrc: r.icon,
            iconKind: 'food3d',
          };
        })()}
        actions={(() => {
          if (!contextMeal) return [];
          const r = recipeMap.get(contextMeal.recipeId);
          if (!r) return [];
          const targetBook = cookbooks[0]?.id ?? 'fav';
          const isSaved = cookbooks.some((cb) => cb.recipeIds.includes(r.id));
          const list: ContextMenuAction[] = [
            {
              id: 'cook-now',
              label: 'شروع پخت مرحله‌به‌مرحله',
              icon: <IconCookingPot size={18} />,
              tone: 'accent',
              onSelect: () => startCookMode(r.id, contextMeal.servings),
            },
            {
              id: 'swap-meal',
              label: 'تعویض با غذای جایگزین',
              icon: <IconSwap size={18} />,
              onSelect: () => setSwappingMeal(contextMeal),
            },
            ...(contextMeal.cooked
              ? []
              : [
                  {
                    id: 'mark-cooked',
                    label: 'علامت به عنوان پخته‌شده',
                    icon: <IconCheck size={18} />,
                    tone: 'positive' as const,
                    onSelect: () => markRecipeCooked(r.id),
                  },
                ]),
            {
              id: 'toggle-save',
              label: isSaved ? 'حذف از ذخیره‌ها' : 'ذخیره در دفترچه',
              icon: <IconBookmark size={18} filled={isSaved} />,
              onSelect: () => toggleRecipeInCookbook(targetBook, r.id),
            },
            {
              id: 'remove-meal',
              label: 'حذف از برنامهٔ امروز',
              icon: <IconTrash size={18} />,
              tone: 'danger',
              onSelect: () => removeMealFromPlan(contextMeal.id),
            },
          ];
          return list;
        })()}
        onClose={() => setContextMeal(null)}
      />
    </div>
  );
};

/**
 * Borderless Color-Filled Meal Card with Scroll-Safe Long-Press Support
 */
const PlanMealCard: React.FC<{
  meal: PlannedMeal;
  recipe: import('../types/sofreh').Recipe;
  idx: number;
  onOpen: () => void;
  onSwap: () => void;
  onLongPress: () => void;
}> = ({ meal, recipe, idx, onOpen, onSwap, onLongPress }) => {
  const cost = getRecipeConsumptionCostForServings(recipe, meal.servings);
  const totalMin = recipe.prepMinutes + recipe.cookMinutes;
  const slotTheme = MEAL_SLOT_THEMES[meal.slot];
  const { handlers, consumeLongPress } = useLongPress(onLongPress);

  const handleTapOpen = () => {
    if (consumeLongPress()) return;
    onOpen();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03, duration: 0.18, ease: 'easeOut' }}
      className="space-y-1.5"
    >
      <div
        data-testid={`meal-slot-label-${meal.slot}`}
        className={`px-1.5 text-xs font-extrabold ${slotTheme.badgeText}`}
      >
        {MEAL_SLOT_LABELS[meal.slot]}
      </div>

      <article
        data-testid={`meal-article-${meal.slot}`}
        {...handlers}
        className={`relative overflow-hidden rounded-[28px] p-3.5 select-none ${slotTheme.cardBg}`}
      >
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={handleTapOpen}
            data-testid={`meal-card-${meal.slot}`}
            className="shrink-0 active:scale-95 transition-transform"
          >
            <Icon3D
              src={recipe.icon}
              alt={recipe.title}
              sizeClass="w-[74px] h-[74px]"
              roundedClass="rounded-[20px]"
              loading="eager"
            />
          </button>

          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Top Metadata Row: Flag + Quiet Kitchenware Icons + Price */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="inline-flex items-center shrink-0"
                  title={recipe.cuisine}
                  aria-label={recipe.cuisine}
                >
                  {getCuisineFlag(recipe.cuisine)}
                </span>

                {recipe.requiredAppliances.length > 0 && (
                  <div
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/75 dark:bg-black/35 text-[#6E6A63] dark:text-[#C8C3BA] shrink-0"
                    data-testid={`meal-appliances-${meal.slot}`}
                  >
                    {recipe.requiredAppliances.slice(0, 2).map((app) => (
                      <span
                        key={app}
                        title={APPLIANCE_SHORT_LABELS[app]}
                        aria-label={APPLIANCE_SHORT_LABELS[app]}
                        className="inline-flex items-center justify-center"
                      >
                        <ApplianceIcon appliance={app} size={12} />
                      </span>
                    ))}
                  </div>
                )}

                {meal.cooked && (
                  <span className="w-4.5 h-4.5 rounded-full bg-[#5E8B42] text-white flex items-center justify-center shrink-0">
                    <IconCheck size={10} />
                  </span>
                )}
              </div>

              <span className="text-xs font-extrabold text-[#292B25] dark:text-[#F5EFE8] tabular-nums-fa shrink-0">
                {formatToman(cost)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTapOpen}
              data-testid="meal-card"
              className="font-display font-black text-[17px] leading-snug text-[#292B25] dark:text-[#F5EFE8] hover:text-[#F04438] text-right block line-clamp-1 w-full transition-colors"
            >
              {recipe.title}
            </button>

            {/* Clean, Spacious Bottom Row: Time + Calories on Right, Swap + Cook on Left */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-3 text-xs font-bold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa">
                <span className="inline-flex items-center gap-1">
                  <IconClock size={14} className={slotTheme.iconText} />
                  {toFaDigits(totalMin)}د
                </span>
                <span className="inline-flex items-center gap-1">
                  <IconFlame size={14} className="text-[#F04438] dark:text-[#FF7E75]" />
                  {toFaDigits(recipe.caloriesPerServing)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwap();
                  }}
                  aria-label="تعویض غذا"
                  className="w-9 h-9 rounded-full bg-white/85 dark:bg-[#2F322B] hover:bg-white dark:hover:bg-[#3A3D35] text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shadow-xs"
                >
                  <IconSwap size={15} />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                  className="h-9 px-3.5 rounded-full coral-glass-pill text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  <IconCookingPot size={15} />
                  <span>پخت</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </motion.div>
  );
};
