import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DAY_NAMES_FULL, DAY_NAMES_SHORT, MEAL_SLOT_LABELS } from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type { PlannedMeal } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { getRecipeConsumptionCostForServings, getSwapCandidates } from '../utils/planner';
import { MacroRing } from './MacroRing';
import {
  getCuisineFlag,
  Icon3D,
  IconCheck,
  IconClock,
  IconClose,
  IconCookingPot,
  IconFlame,
  IconLock,
  IconPlus,
  IconShuffle,
  IconSwap,
  IconUnlock,
  SofrehLogoMark,
} from './icons/SofrehIcons';

export const PlanScreen: React.FC<{
  onOpenAddMeal: (dayIndex: number) => void;
}> = ({ onOpenAddMeal }) => {
  const {
    prefs,
    recipes,
    plan,
    planLocked,
    pantry,
    recipeFeedback,
    selectedDay,
    costSummary,
    setSelectedDay,
    openRecipe,
    togglePlanLock,
    regeneratePlan,
    swapMeal,
    setActiveTab,
  } = useAppState();

  const [swappingMeal, setSwappingMeal] = useState<PlannedMeal | null>(null);

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

  const totalTicks = 14;
  const filledTicks = Math.min(
    totalTicks,
    Math.round((dayMacros.protein / Math.max(1, prefs.dailyProteinTarget)) * totalTicks)
  );

  return (
    <div className="space-y-4">
      {/* MINIMAL LOCKED HEADER: Logo placeholder + App Name + Compact Circular Lock & Shuffle */}
      <header
        data-testid="plan-sticky-header"
        className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/82 backdrop-blur-xl border-b border-white/60 safe-top"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <SofrehLogoMark className="w-9 h-9 shrink-0 shadow-sm" />
            <h1 className="font-display font-black text-2xl text-[#292B25] tracking-tight">
              سفره
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={togglePlanLock}
              aria-label={planLocked ? 'باز کردن قفل برنامه' : 'قفل کردن برنامه'}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                planLocked
                  ? 'bg-[#292B25] text-white shadow-md'
                  : 'liquid-glass text-[#292B25]'
              }`}
            >
              {planLocked ? <IconLock size={16} /> : <IconUnlock size={16} />}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9, rotate: -90 }}
              onClick={() => regeneratePlan(false)}
              aria-label="چیدمان مجدد هفته"
              className="w-9 h-9 rounded-full liquid-glass text-[#F04438] flex items-center justify-center"
            >
              <IconShuffle size={16} />
            </motion.button>
          </div>
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
              onClick={() => setSelectedDay(idx)}
              className="relative py-2 rounded-full flex flex-col items-center justify-center gap-1 transition-all"
            >
              {active && (
                <motion.span
                  layoutId="activeDayPill"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="absolute inset-0 rounded-full coral-glass-pill"
                />
              )}
              <span
                className={`relative z-10 font-display font-black text-sm ${
                  active ? 'text-white' : 'text-[#292B25]'
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
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-lg text-[#292B25]">
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

          <AnimatePresence mode="popLayout">
            {dayMeals.length === 0 ? (
              <div className="liquid-glass-card rounded-[28px] p-7 text-center space-y-3">
                <p className="text-sm font-bold text-[#75746E]">
                  برای {DAY_NAMES_FULL[selectedDay]} غذایی تنظیم نشده
                </p>
                <button
                  type="button"
                  onClick={() => onOpenAddMeal(selectedDay)}
                  className="px-5 py-2.5 rounded-full coral-glass-pill text-white text-xs font-extrabold"
                >
                  افزودن غذا
                </button>
              </div>
            ) : (
              dayMeals.map((meal, idx) => {
                const recipe = recipeMap.get(meal.recipeId);
                if (!recipe) return null;
                const cost = getRecipeConsumptionCostForServings(recipe, meal.servings);
                const totalMin = recipe.prepMinutes + recipe.cookMinutes;

                return (
                  <motion.article
                    key={`${meal.id}-${meal.recipeId}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: idx * 0.04, type: 'spring', stiffness: 360, damping: 28 }}
                    className="liquid-glass-card rounded-[28px] p-3.5 space-y-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => openRecipe(recipe.id, meal.servings)}
                        data-testid={`meal-card-${meal.slot}`}
                        className="shrink-0 active:scale-95 transition-transform"
                      >
                        <Icon3D
                          src={recipe.icon}
                          alt={recipe.title}
                          sizeClass="w-[74px] h-[74px]"
                          roundedClass="rounded-[20px]"
                        />
                      </button>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-[#F3E9DE] text-[#292B25]">
                              {MEAL_SLOT_LABELS[meal.slot]}
                            </span>
                            <span
                              className="text-base leading-none"
                              title={recipe.cuisine}
                              aria-label={recipe.cuisine}
                            >
                              {getCuisineFlag(recipe.cuisine)}
                            </span>
                            {meal.cooked && (
                              <span className="w-5 h-5 rounded-full bg-[#68734E] text-white flex items-center justify-center">
                                <IconCheck size={11} />
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-extrabold text-[#292B25] tabular-nums-fa">
                            {formatToman(cost)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openRecipe(recipe.id, meal.servings)}
                          data-testid="meal-card"
                          className="font-display font-black text-[17px] leading-snug text-[#292B25] hover:text-[#F04438] text-right block line-clamp-1 w-full transition-colors"
                        >
                          {recipe.title}
                        </button>

                        {/* Clean scannable icon metrics + compact circular swap & cook actions */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div className="flex items-center gap-3 text-xs font-bold text-[#75746E] tabular-nums-fa">
                            <span className="inline-flex items-center gap-1">
                              <IconClock size={14} className="text-[#C87955]" />
                              {toFaDigits(totalMin)} دقیقه
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <IconFlame size={14} className="text-[#F04438]" />
                              {toFaDigits(recipe.caloriesPerServing)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setSwappingMeal(meal)}
                              aria-label="تعویض غذا"
                              className="w-9 h-9 rounded-full bg-[#F3E9DE] hover:bg-[#EAE0D5] text-[#292B25] flex items-center justify-center"
                            >
                              <IconSwap size={15} />
                            </motion.button>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.92 }}
                              onClick={() => openRecipe(recipe.id, meal.servings)}
                              className="h-9 px-3.5 rounded-full coral-glass-pill text-white text-xs font-extrabold flex items-center gap-1.5"
                            >
                              <IconCookingPot size={15} />
                              <span>پخت</span>
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Analytics Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="liquid-glass-card rounded-[28px] p-5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2.5 flex-1">
                <div className="text-xs font-extrabold text-[#75746E]">
                  تغذیهٔ {DAY_NAMES_FULL[selectedDay]}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'پروتئین', val: `${toFaDigits(dayMacros.protein)}g`, color: 'text-[#68734E]' },
                    { label: 'کربوهیدرات', val: `${toFaDigits(dayMacros.carbs)}g`, color: 'text-[#C87955]' },
                    { label: 'چربی', val: `${toFaDigits(dayMacros.fat)}g`, color: 'text-[#F04438]' },
                  ].map((m) => (
                    <div key={m.label} className="rounded-2xl bg-[#FBF5EF] p-2 text-center">
                      <div className={`font-display font-black text-base tabular-nums-fa ${m.color}`}>
                        {m.val}
                      </div>
                      <div className="text-[10px] font-bold text-[#75746E]">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <MacroRing
                calories={dayMacros.cal}
                targetCalories={prefs.dailyCalorieTarget}
                proteinG={dayMacros.protein}
                carbsG={dayMacros.carbs}
                fatG={dayMacros.fat}
              />
            </div>

            {/* Animated 14-Bar Protein Ticks */}
            <div className="pt-2 border-t border-[#EFE4D8]">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-[#292B25]">پروتئین روزانه</span>
                <span className="text-[#68734E] tabular-nums-fa">
                  {toFaDigits(dayMacros.protein)} / {toFaDigits(prefs.dailyProteinTarget)} گرم
                </span>
              </div>
              <div className="grid grid-cols-14 gap-1 h-4 items-end">
                {Array.from({ length: totalTicks }).map((_, i) => {
                  const active = i < filledTicks;
                  return (
                    <motion.span
                      key={i}
                      initial={{ scaleY: 0.3 }}
                      animate={{ scaleY: active ? 1 : 0.45 }}
                      transition={{ delay: i * 0.02, type: 'spring', stiffness: 320 }}
                      className={`w-full rounded-full origin-bottom ${
                        active
                          ? 'h-full bg-gradient-to-t from-[#68734E] to-[#98A677]'
                          : 'h-2.5 bg-[#E9DFD4]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weekly Budget Card */}
          <div className="liquid-glass-card rounded-[28px] p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#75746E]">هزینهٔ هفته</div>
                <div className="font-display font-black text-2xl text-[#292B25] tabular-nums-fa mt-0.5">
                  {formatToman(costSummary.consumptionCostToman)}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-[#EEF2E6] text-[#4C5736] text-xs font-extrabold tabular-nums-fa">
                {toFaDigits(costSummary.budgetPercent)}٪ بودجه
              </span>
            </div>

            <div className="h-2 bg-[#EFE4D8] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-[#FF6A5C] to-[#F04438]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, costSummary.budgetPercent)}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-2xl bg-[#FBF5EF] p-3">
                <div className="text-[11px] text-[#75746E]">صندوق خرید</div>
                <div className="font-extrabold text-sm text-[#292B25] mt-0.5 tabular-nums-fa">
                  {formatToman(costSummary.shelfCheckoutCostToman)}
                </div>
              </div>
              <div className="rounded-2xl bg-[#EEF2E6]/80 p-3">
                <div className="text-[11px] text-[#55613E]">مانده برای بعد</div>
                <div className="font-extrabold text-sm text-[#4C5736] mt-0.5 tabular-nums-fa">
                  {formatToman(costSummary.leftoverFridgeValueToman)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('shop')}
              className="w-full py-3 rounded-full bg-[#292B25] text-white font-extrabold text-xs hover:bg-black transition"
            >
              رفتن به لیست خرید
            </button>
          </div>
        </div>
      </div>

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
              className="w-full sm:max-w-lg max-h-[80dvh] bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] p-5 flex flex-col shadow-2xl border border-white"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-black text-xl text-[#292B25]">
                  جایگزین {MEAL_SLOT_LABELS[swappingMeal.slot]}
                </h3>
                <button
                  type="button"
                  onClick={() => setSwappingMeal(null)}
                  aria-label="بستن"
                  className="w-9 h-9 rounded-full bg-white text-[#292B25] flex items-center justify-center shadow-sm"
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
                    className="w-full bg-white rounded-2xl p-3 flex items-center gap-3 text-right hover:border-[#F04438] border border-transparent shadow-sm transition"
                  >
                    <Icon3D
                      src={cand.recipe.icon}
                      alt={cand.recipe.title}
                      sizeClass="w-13 h-13"
                      roundedClass="rounded-[15px]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{getCuisineFlag(cand.recipe.cuisine)}</span>
                        <span className="font-extrabold text-sm text-[#292B25] truncate">
                          {cand.recipe.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] font-bold text-[#75746E] tabular-nums-fa">
                        <span>{toFaDigits(cand.recipe.prepMinutes + cand.recipe.cookMinutes)} دقیقه</span>
                        <span>{toFaDigits(cand.recipe.caloriesPerServing)} کالری</span>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-extrabold tabular-nums-fa shrink-0 ${
                        cand.deltaConsumptionCostToman <= 0
                          ? 'text-[#68734E]'
                          : 'text-[#C87955]'
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
    </div>
  );
};
