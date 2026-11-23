import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DAY_NAMES_FULL, DAY_NAMES_SHORT, MEAL_SLOT_LABELS } from '../data/catalog';
import { getIngredientIconPath } from '../data/database/ingredientIcons';
import { useAppState } from '../context/AppStateContext';
import type { Recipe } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { getRecipeConsumptionCostForServings, type WeeklyPrepInsight } from '../utils/planner';
import { BudgetDial } from './BudgetDial';
import {
  Icon3D,
  IconArrowLeft,
  IconClose,
  IconFlame,
  IconMacroCarbs,
  IconMacroFat,
  IconMacroProtein,
  IconMarketBasket,
  IconMinus,
  IconPiggyBank,
  IconPlus,
  IconSnowflake,
  IconWallet,
  IngredientIcon3D,
  MEAL_SLOT_THEMES,
  MealSlotIcon,
} from './icons/SofrehIcons';

export type PlanInsightSheetType = 'budget' | 'macros' | 'savings' | null;

interface PlanInsightSheetsProps {
  activeSheet: PlanInsightSheetType;
  onClose: () => void;
  weeklyInsights: WeeklyPrepInsight;
}

export const PlanInsightSheets: React.FC<PlanInsightSheetsProps> = ({
  activeSheet,
  onClose,
  weeklyInsights,
}) => {
  const {
    prefs,
    recipes,
    plan,
    selectedDay,
    costSummary,
    minWeeklyBudgetToman,
    setSelectedDay,
    updatePrefs,
    openRecipe,
    setActiveTab,
  } = useAppState();

  const [macroMetric, setMacroMetric] = useState<'protein' | 'calories'>('protein');

  const recipeMap = useMemo(() => new Map<string, Recipe>(recipes.map((r) => [r.id, r])), [recipes]);

  // 7-day aggregated stats for both Budget & Macros charts
  const dailyStats = useMemo(() => {
    const slotOrder = { breakfast: 0, lunch: 1, dinner: 2 };
    return Array.from({ length: 7 }, (_, dayIdx) => {
      const meals = plan
        .filter((m) => m.dayIndex === dayIdx)
        .sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot]);
      let cost = 0;
      let cal = 0;
      let protein = 0;
      let carbs = 0;
      let fat = 0;
      for (const m of meals) {
        const r = recipeMap.get(m.recipeId);
        if (!r) continue;
        cost += getRecipeConsumptionCostForServings(r, m.servings);
        cal += r.caloriesPerServing;
        protein += r.proteinG;
        carbs += r.carbsG;
        fat += r.fatG;
      }
      return { dayIdx, meals, cost, cal, protein, carbs, fat };
    });
  }, [plan, recipeMap]);

  const activeDayStat = dailyStats[selectedDay] ?? dailyStats[0];
  const cookingDaysCount = Math.max(1, prefs.cookingDays?.length ?? 7);
  const dailyBudgetGuide = Math.round(costSummary.weeklyBudgetToman / cookingDaysCount);
  const maxDayCost = Math.max(dailyBudgetGuide * 1.15, ...dailyStats.map((d) => d.cost), 1);

  const budgetDiff = costSummary.weeklyBudgetToman - costSummary.consumptionCostToman;
  const isOverBudget = budgetDiff < 0;

  // Waterfall proportions (exact split of supermarket checkout into this-week usage vs next-week carryover)
  const shelfTotal = Math.max(0, costSummary.shelfCheckoutCostToman);
  const leftoverFromShelf = Math.min(shelfTotal, costSummary.leftoverFridgeValueToman);
  const usedFromShelf = Math.max(0, shelfTotal - leftoverFromShelf);
  const consumedPct = shelfTotal > 0 ? Math.round((usedFromShelf / shelfTotal) * 100) : 100;
  const leftoverPct = Math.max(0, 100 - consumedPct);

  // Macro chart max
  const macroTarget =
    macroMetric === 'protein' ? prefs.dailyProteinTarget : prefs.dailyCalorieTarget;
  const maxMacroVal = Math.max(
    macroTarget * 1.15,
    ...dailyStats.map((d) => (macroMetric === 'protein' ? d.protein : d.cal)),
    1
  );

  // Build map of ingredient code -> list of dish titles for Savings Sheet
  const sharedRecipeMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const m of plan) {
      const r = recipeMap.get(m.recipeId);
      if (!r) continue;
      for (const ing of r.ingredients) {
        const list = map.get(ing.code) ?? [];
        if (!list.includes(r.title)) {
          list.push(r.title);
          map.set(ing.code, list);
        }
      }
    }
    return map;
  }, [plan, recipeMap]);

  return (
    <AnimatePresence>
      {activeSheet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#292B25]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`plan-insight-sheet-${activeSheet}`}
            className="w-full sm:max-w-lg max-h-[88dvh] bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] flex flex-col shadow-2xl border border-white overflow-hidden"
          >
            {/* Sticky Sheet Header */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#EFE4D8] bg-[#FBF5EF]/95">
              <div className="flex items-center gap-2.5">
                {activeSheet === 'budget' && (
                  <span className="w-9 h-9 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center">
                    <IconWallet size={19} />
                  </span>
                )}
                {activeSheet === 'macros' && (
                  <span className="w-9 h-9 rounded-full bg-[#EEF5E9] text-[#5E8B42] flex items-center justify-center">
                    <IconMacroProtein size={19} />
                  </span>
                )}
                {activeSheet === 'savings' && (
                  <span className="w-9 h-9 rounded-full bg-[#EEF5E9] text-[#5E8B42] flex items-center justify-center">
                    <IconPiggyBank size={19} />
                  </span>
                )}
                <h3 className="font-display font-black text-xl text-[#292B25]">
                  {activeSheet === 'budget'
                    ? 'جزئیات بودجه هفته'
                    : activeSheet === 'macros'
                      ? 'تغذیه و پروتئین'
                      : 'صرفه‌جویی هوشمند'}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="w-9 h-9 rounded-full bg-white text-[#292B25] flex items-center justify-center shadow-sm"
              >
                <IconClose size={17} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto p-5 space-y-5 flex-1">
              {/* ==================== 1. BUDGET INSIGHT SHEET ==================== */}
              {activeSheet === 'budget' && (
                <>
                  {/* Hero Status Pill */}
                  <div className="liquid-glass-card rounded-[26px] p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-bold text-[#75746E]">هزینهٔ غذای این هفته</div>
                      <div className="font-display font-black text-2xl text-[#292B25] tabular-nums-fa mt-0.5">
                        {formatToman(costSummary.consumptionCostToman)}
                      </div>
                    </div>
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-left tabular-nums-fa ${
                        isOverBudget
                          ? 'bg-[#FFF0ED] text-[#C42F26]'
                          : 'bg-[#EEF5E9] text-[#4C6E35]'
                      }`}
                    >
                      <div className="font-display font-black text-sm">
                        {isOverBudget ? '+' : ''}
                        {formatToman(Math.abs(budgetDiff))}
                      </div>
                      <div className="text-[10px] font-extrabold opacity-80">
                        {isOverBudget ? 'بیش از سقف' : 'زیر بودجه'}
                      </div>
                    </div>
                  </div>

                  {/* Interactive 7-Day Cost Bar Chart */}
                  <div className="liquid-glass-card rounded-[26px] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-black text-sm text-[#292B25]">
                        خرج روز به روز{' '}
                        <span className="text-[10px] font-bold text-[#8C867E]">(هزار تومان)</span>
                      </span>
                      <span className="text-[11px] font-extrabold text-[#F04438] tabular-nums-fa">
                        {DAY_NAMES_FULL[selectedDay]}: {formatToman(activeDayStat.cost)}
                      </span>
                    </div>

                    <div className="relative h-32 pt-4 flex items-end justify-between gap-2">
                      {/* Daily budget guide line */}
                      <div
                        className="absolute inset-x-0 border-t border-dashed border-[#C87955]/50 pointer-events-none"
                        style={{
                          bottom: `${Math.min(92, Math.round((dailyBudgetGuide / maxDayCost) * 100))}%`,
                        }}
                      />
                      {dailyStats.map((d) => {
                        const pct = Math.max(6, Math.round((d.cost / maxDayCost) * 100));
                        const isSelected = d.dayIdx === selectedDay;
                        return (
                          <button
                            key={d.dayIdx}
                            type="button"
                            onClick={() => setSelectedDay(d.dayIdx)}
                            className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 group"
                          >
                            <span className="text-[10px] font-extrabold text-[#75746E] tabular-nums-fa">
                              {d.cost > 0 ? toFaDigits(Math.round(d.cost / 1000)) : '−'}
                            </span>
                            <div className="w-full max-w-[26px] flex-1 flex items-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: d.cost > 0 ? `${pct}%` : '6%' }}
                                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                                className={`w-full rounded-t-xl transition-colors ${
                                  isSelected
                                    ? 'bg-gradient-to-t from-[#F04438] to-[#FF7B6B] shadow-sm'
                                    : d.cost > dailyBudgetGuide
                                      ? 'bg-[#E8B4A9]'
                                      : 'bg-[#E5D8C8] group-hover:bg-[#D8C5B0]'
                                }`}
                              />
                            </div>
                            <span
                              className={`text-[11px] font-black ${
                                isSelected ? 'text-[#F04438]' : 'text-[#75746E]'
                              }`}
                            >
                              {DAY_NAMES_SHORT[d.dayIdx]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clean 2-Part Visual Waterfall: Supermarket = Used This Week + Saved for Next Week */}
                  <div className="liquid-glass-card rounded-[26px] p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="inline-flex items-center gap-1.5 text-[#292B25]">
                        <IconMarketBasket size={15} className="text-[#C87955]" />
                        کل خرید سوپرمارکت
                      </span>
                      <span className="tabular-nums-fa text-[#292B25]">
                        {formatToman(shelfTotal)}
                      </span>
                    </div>

                    <div className="h-3.5 rounded-full bg-[#EFE4D8] overflow-hidden flex gap-0.5 p-0.5">
                      <div
                        className="h-full rounded-full bg-[#F04438]"
                        style={{ width: `${consumedPct}%` }}
                      />
                      {leftoverPct > 0 && (
                        <div
                          className="h-full rounded-full bg-[#5E8B42]"
                          style={{ width: `${leftoverPct}%` }}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="rounded-2xl bg-[#FFF4F1] p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#C23024]">
                          <span className="w-2 h-2 rounded-full bg-[#F04438]" />
                          مصرف این هفته از خرید
                        </div>
                        <div className="font-display font-black text-sm text-[#292B25] tabular-nums-fa mt-1">
                          {formatToman(usedFromShelf)}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-[#EEF5E9] p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#4C6E35]">
                          <IconSnowflake size={12} />
                          ذخیره برای هفته بعد
                        </div>
                        <div className="font-display font-black text-sm text-[#4C6E35] tabular-nums-fa mt-1">
                          {formatToman(leftoverFromShelf)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Rotary Budget Dial right inside the sheet */}
                  <div className="space-y-2">
                    <div className="font-display font-black text-sm text-[#292B25] px-1">
                      تنظیم سقف بودجه
                    </div>
                    <BudgetDial
                      value={prefs.weeklyBudgetToman}
                      min={minWeeklyBudgetToman}
                      servings={prefs.servings}
                      mealsPerWeek={cookingDaysCount * prefs.activeMealSlots.length}
                      onChange={(val) => updatePrefs({ weeklyBudgetToman: val }, true)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setActiveTab('shop');
                    }}
                    className="w-full h-12 rounded-full bg-[#292B25] text-white font-display font-black text-sm flex items-center justify-center gap-2"
                  >
                    <span>رفتن به لیست خرید</span>
                    <IconArrowLeft size={16} />
                  </button>
                </>
              )}

              {/* ==================== 2. MACROS / PROTEIN INSIGHT SHEET ==================== */}
              {activeSheet === 'macros' && (
                <>
                  {/* Metric Segmented Switcher */}
                  <div className="liquid-glass rounded-full p-1 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setMacroMetric('protein')}
                      className={`py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                        macroMetric === 'protein'
                          ? 'bg-[#5E8B42] text-white shadow-sm'
                          : 'text-[#5C5952]'
                      }`}
                    >
                      <IconMacroProtein size={15} />
                      <span>پروتئین (گرم)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMacroMetric('calories')}
                      className={`py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                        macroMetric === 'calories'
                          ? 'coral-glass-pill text-white'
                          : 'text-[#5C5952]'
                      }`}
                    >
                      <IconFlame size={15} />
                      <span>کالری روزانه</span>
                    </button>
                  </div>

                  {/* 7-Day Nutrition Bar Chart */}
                  <div className="liquid-glass-card rounded-[26px] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-black text-sm text-[#292B25]">
                        {DAY_NAMES_FULL[selectedDay]}
                      </span>
                      <span className="text-xs font-extrabold tabular-nums-fa text-[#292B25]">
                        {macroMetric === 'protein'
                          ? `${toFaDigits(activeDayStat.protein)} از ${toFaDigits(prefs.dailyProteinTarget)} گرم`
                          : `${toFaDigits(activeDayStat.cal)} از ${toFaDigits(prefs.dailyCalorieTarget)} کالری`}
                      </span>
                    </div>

                    <div className="relative h-32 pt-4 flex items-end justify-between gap-2">
                      {/* Daily target line */}
                      <div
                        className="absolute inset-x-0 border-t border-dashed border-[#5E8B42]/55 pointer-events-none"
                        style={{
                          bottom: `${Math.min(92, Math.round((macroTarget / maxMacroVal) * 100))}%`,
                        }}
                      />
                      {dailyStats.map((d) => {
                        const val = macroMetric === 'protein' ? d.protein : d.cal;
                        const pct = Math.max(6, Math.round((val / maxMacroVal) * 100));
                        const isSelected = d.dayIdx === selectedDay;
                        return (
                          <button
                            key={d.dayIdx}
                            type="button"
                            onClick={() => setSelectedDay(d.dayIdx)}
                            className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"
                          >
                            <span className="text-[9px] font-extrabold text-[#75746E] tabular-nums-fa">
                              {val > 0 ? toFaDigits(val) : '−'}
                            </span>
                            <div className="w-full max-w-[26px] flex-1 flex items-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: val > 0 ? `${pct}%` : '6%' }}
                                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                                className={`w-full rounded-t-xl ${
                                  isSelected
                                    ? macroMetric === 'protein'
                                      ? 'bg-[#5E8B42]'
                                      : 'bg-[#F04438]'
                                    : macroMetric === 'protein'
                                      ? 'bg-[#D6E4CA]'
                                      : 'bg-[#F2CEC8]'
                                }`}
                              />
                            </div>
                            <span
                              className={`text-[11px] font-black ${
                                isSelected ? 'text-[#292B25]' : 'text-[#75746E]'
                              }`}
                            >
                              {DAY_NAMES_SHORT[d.dayIdx]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Per-Meal Macro Breakdown for Active Day */}
                  <div className="space-y-2.5">
                    <div className="font-display font-black text-sm text-[#292B25] px-1">
                      سهم هر وعده در {DAY_NAMES_FULL[selectedDay]}
                    </div>
                    {activeDayStat.meals.map((meal) => {
                      const r = recipeMap.get(meal.recipeId);
                      if (!r) return null;
                      const theme = MEAL_SLOT_THEMES[meal.slot];
                      return (
                        <button
                          key={meal.id}
                          type="button"
                          onClick={() => {
                            onClose();
                            openRecipe(r.id, meal.servings);
                          }}
                          className={`w-full rounded-[22px] p-3 border ${theme.cardBg} ${theme.cardBorder} flex items-center gap-3 text-right transition active:scale-[0.98]`}
                        >
                          <Icon3D
                            src={r.icon}
                            alt={r.title}
                            sizeClass="w-12 h-12"
                            roundedClass="rounded-[14px]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${theme.badgeBg} ${theme.badgeText}`}
                              >
                                <MealSlotIcon slot={meal.slot} size={11} />
                                {MEAL_SLOT_LABELS[meal.slot]}
                              </span>
                              <span className="font-extrabold text-sm text-[#292B25] truncate">
                                {r.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-extrabold tabular-nums-fa">
                              <span className="inline-flex items-center gap-1 text-[#5E8B42]">
                                <IconMacroProtein size={12} />
                                {toFaDigits(r.proteinG)}گ
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#D98218]">
                                <IconMacroCarbs size={12} />
                                {toFaDigits(r.carbsG)}گ
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#3B82F6]">
                                <IconMacroFat size={12} />
                                {toFaDigits(r.fatG)}گ
                              </span>
                              <span className="text-[#75746E] mr-auto">
                                {toFaDigits(r.caloriesPerServing)} کالری
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Daily Target Adjusters */}
                  <div className="liquid-glass-card rounded-[24px] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[#292B25]">هدف پروتئین روزانه</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updatePrefs(
                              { dailyProteinTarget: Math.max(40, prefs.dailyProteinTarget - 10) },
                              false
                            )
                          }
                          aria-label="کاهش پروتئین"
                          className="w-8 h-8 rounded-full bg-[#F3E9DE] text-[#292B25] flex items-center justify-center"
                        >
                          <IconMinus size={14} />
                        </button>
                        <span className="font-display font-black text-sm text-[#5E8B42] w-14 text-center tabular-nums-fa">
                          {toFaDigits(prefs.dailyProteinTarget)} گرم
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updatePrefs(
                              { dailyProteinTarget: Math.min(220, prefs.dailyProteinTarget + 10) },
                              false
                            )
                          }
                          aria-label="افزایش پروتئین"
                          className="w-8 h-8 rounded-full bg-[#5E8B42] text-white flex items-center justify-center"
                        >
                          <IconPlus size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#EFE4D8]">
                      <span className="text-xs font-extrabold text-[#292B25]">هدف کالری روزانه</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updatePrefs(
                              { dailyCalorieTarget: Math.max(1200, prefs.dailyCalorieTarget - 100) },
                              false
                            )
                          }
                          aria-label="کاهش کالری"
                          className="w-8 h-8 rounded-full bg-[#F3E9DE] text-[#292B25] flex items-center justify-center"
                        >
                          <IconMinus size={14} />
                        </button>
                        <span className="font-display font-black text-sm text-[#F04438] w-14 text-center tabular-nums-fa">
                          {toFaDigits(prefs.dailyCalorieTarget)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updatePrefs(
                              { dailyCalorieTarget: Math.min(3600, prefs.dailyCalorieTarget + 100) },
                              false
                            )
                          }
                          aria-label="افزایش کالری"
                          className="w-8 h-8 rounded-full coral-glass-pill text-white flex items-center justify-center"
                        >
                          <IconPlus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ==================== 3. SAVINGS / ZERO-WASTE INSIGHT SHEET ==================== */}
              {activeSheet === 'savings' && (
                <>
                  <div className="rounded-[26px] bg-gradient-to-br from-[#4C6E35] to-[#638C47] text-white p-5 flex items-center justify-between gap-3 shadow-lg">
                    <div>
                      <div className="text-xs font-bold text-white/75">جلوگیری از دورریز هفته</div>
                      <div className="font-display font-black text-3xl tabular-nums-fa mt-1">
                        {formatToman(weeklyInsights.estimatedWasteSavedToman)}
                      </div>
                    </div>
                    <div className="px-3.5 py-2 rounded-2xl bg-white/15 backdrop-blur-sm text-center shrink-0">
                      <div className="font-display font-black text-xl leading-none tabular-nums-fa">
                        {toFaDigits(weeklyInsights.sharedPerishableCount)}
                      </div>
                      <div className="text-[10px] font-bold text-white/85 mt-1">مادهٔ مشترک</div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {weeklyInsights.sharedPerishables.length === 0 ? (
                      <div className="liquid-glass-card rounded-[24px] p-6 text-center text-sm font-bold text-[#75746E]">
                        با اضافه کردن وعده‌های بیشتر، همپوشانی مواد تازه اینجا نمایش داده می‌شود.
                      </div>
                    ) : (
                      weeklyInsights.sharedPerishables.map((ing) => {
                        const usedIn = sharedRecipeMap.get(ing.code) ?? [];
                        return (
                          <div
                            key={ing.code}
                            className="liquid-glass-card rounded-[22px] p-3.5 flex items-start gap-3"
                          >
                            <div className="w-12 h-12 rounded-[16px] bg-[#EEF5E9] flex items-center justify-center shrink-0">
                              <IngredientIcon3D
                                src={getIngredientIconPath(ing.code, ing.name)}
                                alt={ing.name}
                                sizeClass="w-9 h-9"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-display font-black text-sm text-[#292B25]">
                                  {ing.name}
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full bg-[#EEF5E9] text-[#4C6E35] text-[10px] font-extrabold tabular-nums-fa shrink-0">
                                  در {toFaDigits(Math.max(2, usedIn.length))} وعده
                                </span>
                              </div>
                              {usedIn.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {usedIn.slice(0, 4).map((title) => (
                                    <span
                                      key={title}
                                      className="px-2 py-0.5 rounded-full bg-[#F6EFE7] text-[10px] font-bold text-[#5C5952]"
                                    >
                                      {title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
