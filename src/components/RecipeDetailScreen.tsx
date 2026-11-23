import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { APPLIANCE_SHORT_LABELS, DAY_NAMES_FULL, MEAL_SLOT_LABELS } from '../data/catalog';
import { getIngredientIconPath } from '../data/database/ingredientIcons';
import { useAppState } from '../context/AppStateContext';
import type { MealSlotType, Recipe } from '../types/sofreh';
import { formatAmount, formatToman, toFaDigits } from '../utils/format';
import { formatScaledStep, getRecipeConsumptionCostForServings } from '../utils/planner';
import { hapticLight } from '../utils/native';
import { ChefHat } from '@phosphor-icons/react';
import {
  ApplianceIcon,
  CuisineFlag,
  IconArrowRight,
  IconBookmark,
  IconCalendarPlus,
  IconClock,
  IconCookingPot,
  IconFlame,
  IconMacroCarbs,
  IconMacroFat,
  IconMacroProtein,
  IconMinus,
  IconPlus,
  IconThumbDown,
  IconThumbUp,
  IconTimer,
  IngredientIcon3D,
  MEAL_SLOT_THEMES,
  MealSlotIcon,
} from './icons/SofrehIcons';

export const RecipeDetailScreen: React.FC<{
  onAskChef?: (recipe: Recipe, servings: number) => void;
}> = ({ onAskChef }) => {
  const {
    selectedRecipeId,
    selectedRecipeServings,
    recipes,
    cookbooks,
    recipeFeedback,
    closeRecipe,
    startCookMode,
    rateRecipe,
    toggleRecipeInCookbook,
    addMealToPlan,
  } = useAppState();

  const recipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId]
  );

  const [servings, setServings] = useState<number>(selectedRecipeServings);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [showAddDayPicker, setShowAddDayPicker] = useState(false);
  const [pickedDay, setPickedDay] = useState(0);
  const [pickedSlot, setPickedSlot] = useState<MealSlotType>('lunch');

  if (!recipe) return null;

  const isSaved = cookbooks.some((cb) => cb.recipeIds.includes(recipe.id));
  const feedback = recipeFeedback[recipe.id];
  const ratio = servings / Math.max(1, recipe.baseServings);
  const scaledTotalCost = getRecipeConsumptionCostForServings(recipe, servings);
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  // Quiet corner labels (max 2 subtle tags, excluding generic budget buzzwords)
  const quietCornerTags = recipe.tags
    .filter((t) => !t.includes('اقتصادی') && !t.includes('ارزان'))
    .slice(0, 2);

  // Macro proportions for illustrative visual widget
  const totalMacroG = Math.max(1, recipe.proteinG + recipe.carbsG + recipe.fatG);
  const proteinPct = Math.round((recipe.proteinG / totalMacroG) * 100);
  const carbsPct = Math.round((recipe.carbsG / totalMacroG) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      className="min-h-dvh w-full bg-[#FBF5EF] pb-32 relative"
    >
      {/* STRICTLY LOCKED CIRCULAR FLOATING TOP CONTROLS */}
      <header className="fixed top-0 inset-x-0 lg:right-[248px] z-50 px-4 pt-3 safe-top pointer-events-none">
        <div className="max-w-3xl mx-auto flex items-center justify-between pointer-events-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={closeRecipe}
            aria-label="بازگشت"
            data-testid="recipe-back-btn"
            className="w-11 h-11 rounded-full liquid-glass text-[#292B25] flex items-center justify-center shadow-lg"
          >
            <IconArrowRight size={20} />
          </motion.button>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => rateRecipe(recipe.id, 'up')}
              aria-label="پسندیدم"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                feedback === 'up'
                  ? 'bg-[#68734E] text-white shadow-lg'
                  : 'liquid-glass text-[#292B25]'
              }`}
            >
              <IconThumbUp size={17} filled={feedback === 'up'} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => rateRecipe(recipe.id, 'down')}
              aria-label="کمتر پیشنهاد بده"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                feedback === 'down'
                  ? 'bg-[#292B25] text-white shadow-lg'
                  : 'liquid-glass text-[#292B25]'
              }`}
            >
              <IconThumbDown size={17} filled={feedback === 'down'} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const targetBook = cookbooks[0]?.id ?? 'fav';
                toggleRecipeInCookbook(targetBook, recipe.id);
              }}
              aria-label="ذخیره در دفترچه"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isSaved
                  ? 'coral-glass-pill text-white'
                  : 'liquid-glass text-[#292B25]'
              }`}
            >
              <IconBookmark size={17} filled={isSaved} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* FULL-BLEED HIGH-RES PHOTO FADING SEAMLESSLY INTO #FBF5EF (No AI square icon next to title!) */}
      <div className="relative w-full h-[340px] sm:h-[400px] overflow-hidden bg-[#EFE4D8]">
        <img
          src={heroImgFailed ? recipe.icon : recipe.photoUrl}
          alt={recipe.title}
          referrerPolicy="no-referrer"
          onError={() => setHeroImgFailed(true)}
          data-testid="recipe-hero-photo"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 hero-fade-overlay pointer-events-none" />

        {/* Title + Quiet Corner Labels */}
        <div className="absolute bottom-3 inset-x-4 sm:inset-x-6 max-w-3xl mx-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/85 backdrop-blur-sm shadow-sm" title={recipe.cuisine}>
                <CuisineFlag cuisine={recipe.cuisine} size="md" />
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/85 backdrop-blur-sm text-[11px] font-extrabold text-[#292B25]">
                {recipe.difficulty}
              </span>
              {recipe.requiredAppliances.map((appId) => (
                <span
                  key={appId}
                  title={APPLIANCE_SHORT_LABELS[appId]}
                  data-testid={`recipe-detail-appliance-${appId}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm text-[10.5px] font-extrabold text-[#4D4A44]"
                >
                  <ApplianceIcon appliance={appId} size={12} className="text-[#C87955]" />
                  <span>{APPLIANCE_SHORT_LABELS[appId]}</span>
                </span>
              ))}
            </div>
            <h1 className="font-display font-black text-[28px] sm:text-[34px] text-[#292B25] leading-tight">
              {recipe.title}
            </h1>
          </div>

          {/* Subtle Quiet Corner Labels */}
          {quietCornerTags.length > 0 && (
            <div className="flex flex-col items-end gap-1 shrink-0 pb-1">
              {quietCornerTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full bg-white/75 backdrop-blur-md text-[10px] font-bold text-[#6A665F] border border-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-5 mt-2">
        {/* Clean Time, Calories & Cost Strip */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="liquid-glass-card rounded-[24px] p-3.5 text-center space-y-1">
            <IconClock size={18} className="text-[#C87955] mx-auto" />
            <div className="font-display font-black text-base text-[#292B25] tabular-nums-fa">
              {toFaDigits(totalMinutes)} دقیقه
            </div>
            <div className="text-[10px] font-bold text-[#75746E]">زمان کل</div>
          </div>

          <div className="liquid-glass-card rounded-[24px] p-3.5 text-center space-y-1">
            <IconFlame size={18} className="text-[#F04438] mx-auto" />
            <div className="font-display font-black text-base text-[#292B25] tabular-nums-fa">
              {toFaDigits(recipe.caloriesPerServing)}
            </div>
            <div className="text-[10px] font-bold text-[#75746E]">کالری</div>
          </div>

          <div className="liquid-glass-card rounded-[24px] p-3.5 text-center space-y-1">
            <span className="text-xs font-black text-[#68734E] block leading-[18px]">تومان</span>
            <div className="font-display font-black text-base text-[#292B25] tabular-nums-fa">
              {toFaDigits(Math.round(scaledTotalCost / 1000))} هزار
            </div>
            <div className="text-[10px] font-bold text-[#75746E]">
              برای {toFaDigits(servings)} نفر
            </div>
          </div>
        </div>

        {/* UNIFIED APPLE-FITNESS MACRO CARD (Protein=Green, Carbs=Amber, Fat=Blue) */}
        <section
          data-testid="recipe-macro-visual"
          className="liquid-glass-card rounded-[28px] p-5 space-y-4"
        >
          {/* Proportional Tri-Color Stacked Bar */}
          <div className="h-3 rounded-full overflow-hidden flex bg-[#EFE4D8] gap-0.5 p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${proteinPct}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
              className="h-full rounded-full bg-[#5E8B42]"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${carbsPct}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.05 }}
              className="h-full rounded-full bg-[#E59326]"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fatPct}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.1 }}
              className="h-full rounded-full bg-[#3B82F6]"
            />
          </div>

          {/* 3 Visual Nutrient Gauges */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              {
                label: 'پروتئین',
                grams: recipe.proteinG,
                pct: proteinPct,
                color: '#5E8B42',
                bg: 'bg-[#EEF5E9]',
                icon: <IconMacroProtein size={19} />,
              },
              {
                label: 'کربوهیدرات',
                grams: recipe.carbsG,
                pct: carbsPct,
                color: '#E59326',
                bg: 'bg-[#FEF6E8]',
                icon: <IconMacroCarbs size={19} />,
              },
              {
                label: 'چربی',
                grams: recipe.fatG,
                pct: fatPct,
                color: '#3B82F6',
                bg: 'bg-[#EEF5FF]',
                icon: <IconMacroFat size={19} />,
              },
            ].map((m) => {
              const r = 20;
              const circ = 2 * Math.PI * r;
              const dash = (m.pct / 100) * circ;
              return (
                <div
                  key={m.label}
                  className={`rounded-[22px] ${m.bg} p-3 flex flex-col items-center gap-1.5`}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r={r}
                        fill="none"
                        stroke="rgba(41,43,37,0.08)"
                        strokeWidth="4"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r={r}
                        fill="none"
                        stroke={m.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circ}`}
                      />
                    </svg>
                    <span className="absolute" style={{ color: m.color }}>
                      {m.icon}
                    </span>
                  </div>
                  <div className="font-display font-black text-base text-[#292B25] tabular-nums-fa leading-none">
                    {toFaDigits(m.grams)} گرم
                  </div>
                  <div className="text-[10px] font-extrabold text-[#75746E]">
                    {m.label} · {toFaDigits(m.pct)}٪
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* COMPACT RECIPE-AWARE AI CHEF CTA */}
        {onAskChef && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              hapticLight();
              onAskChef(recipe, servings);
            }}
            data-testid="recipe-ask-chef-btn"
            className="w-full liquid-glass rounded-[22px] px-4 py-3 flex items-center justify-between gap-3 text-right"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-full coral-glass-pill text-white flex items-center justify-center shrink-0">
                <ChefHat size={18} weight="fill" />
              </span>
              <span className="font-display font-black text-sm text-[#292B25] truncate">
                سرآشپز هوشمند
              </span>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-[#292B25] text-white text-[11px] font-extrabold shrink-0">
              پرسش
            </span>
          </motion.button>
        )}

        {/* INGREDIENTS + CIRCULAR SERVINGS STEPPER */}
        <section className="liquid-glass-card rounded-[28px] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display font-black text-xl text-[#292B25]">
              مواد لازم
            </h2>

            <div className="flex items-center gap-2 bg-[#F3E9DE] rounded-full p-1">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setServings((s) => Math.max(1, s - 1));
                }}
                aria-label="کاهش نفرات"
                className="w-8 h-8 rounded-full bg-white text-[#292B25] flex items-center justify-center shadow-sm active:scale-90"
              >
                <IconMinus size={15} />
              </button>
              <span className="px-2 font-extrabold text-xs text-[#292B25] tabular-nums-fa">
                {toFaDigits(servings)} نفر
              </span>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setServings((s) => Math.min(12, s + 1));
                }}
                aria-label="افزایش نفرات"
                className="w-8 h-8 rounded-full coral-glass-pill text-white flex items-center justify-center active:scale-90"
              >
                <IconPlus size={15} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#EFE4D8]">
            {recipe.ingredients.map((ing) => {
              const scaledAmt = ing.amount * ratio;
              const scaledCost = Math.round(ing.consumptionCostToman * ratio);
              return (
                <div
                  key={ing.code}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IngredientIcon3D
                      src={getIngredientIconPath(ing.code, ing.name)}
                      alt={ing.name}
                      sizeClass="w-8 h-8"
                    />
                    <span className="font-bold text-sm text-[#292B25] truncate">{ing.name}</span>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-extrabold text-sm text-[#F04438] tabular-nums-fa">
                      {formatAmount(scaledAmt, ing.unit)}
                    </div>
                    <div className="text-[10px] text-[#75746E] tabular-nums-fa">
                      {formatToman(scaledCost)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* STEP-BY-STEP COOKING */}
        <section className="liquid-glass-card rounded-[28px] p-5 space-y-4">
          <h2 className="font-display font-black text-xl text-[#292B25]">
            مراحل پخت
          </h2>

          <div className="space-y-3">
            {recipe.steps.map((s, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-[#FBF5EF]/90 border border-[#EFE4D8] p-4 flex gap-3.5"
              >
                <span className="w-8 h-8 rounded-full coral-glass-pill text-white font-display font-black text-sm flex items-center justify-center shrink-0">
                  {toFaDigits(idx + 1)}
                </span>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-[#292B25] leading-relaxed font-medium">
                    {formatScaledStep(recipe, idx, servings)}
                  </p>
                  {s.timerSeconds && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF0ED] text-[#C42F26] text-[11px] font-extrabold tabular-nums-fa">
                      <IconTimer size={14} />
                      <span>{toFaDigits(Math.max(1, Math.round(s.timerSeconds / 60)))} دقیقه</span>
                    </div>
                  )}
                  {s.tip && (
                    <p className="text-xs text-[#68734E] bg-[#EEF2E6] rounded-xl px-3 py-2 font-medium">
                      {s.tip}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Inline Add-to-Plan Drawer */}
        {showAddDayPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="liquid-glass-card rounded-[26px] p-4 space-y-3 border-2 border-[#F04438]/30"
          >
            <div className="font-extrabold text-sm text-[#292B25]">
              ثبت در کدام روز؟
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {DAY_NAMES_FULL.map((d, idx) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPickedDay(idx)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${
                    pickedDay === idx
                      ? 'coral-glass-pill text-white'
                      : 'bg-[#F3E9DE] text-[#292B25]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['breakfast', 'lunch', 'dinner'] as MealSlotType[]).map((sl) => {
                const theme = MEAL_SLOT_THEMES[sl];
                return (
                  <button
                    key={sl}
                    type="button"
                    onClick={() => setPickedSlot(sl)}
                    className={`py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                      pickedSlot === sl
                        ? theme.activePill
                        : `${theme.badgeBg} ${theme.badgeText}`
                    }`}
                  >
                    <MealSlotIcon slot={sl} size={13} filled={pickedSlot === sl} />
                    <span>{MEAL_SLOT_LABELS[sl]}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                addMealToPlan(pickedDay, pickedSlot, recipe.id, servings);
                setShowAddDayPicker(false);
              }}
              className="w-full py-2.5 rounded-full coral-glass-pill text-white font-extrabold text-sm"
            >
              ثبت در برنامه
            </button>
          </motion.div>
        )}
      </div>

      {/* LOCKED FLOATING BOTTOM COOK MODE BAR */}
      <footer className="fixed bottom-3.5 inset-x-3.5 lg:right-[264px] z-50 safe-bottom pointer-events-none">
        <div className="max-w-3xl mx-auto liquid-glass-nav rounded-full p-2 flex items-center gap-2 pointer-events-auto">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => startCookMode(recipe.id, servings)}
            className="flex-1 h-13 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2"
          >
            <IconCookingPot size={20} />
            <span>شروع پخت</span>
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => setShowAddDayPicker((v) => !v)}
            aria-label="افزودن به برنامه هفته"
            className="w-13 h-13 rounded-full bg-[#292B25] text-white flex items-center justify-center shrink-0"
          >
            <IconCalendarPlus size={20} />
          </motion.button>
        </div>
      </footer>
    </motion.div>
  );
};
