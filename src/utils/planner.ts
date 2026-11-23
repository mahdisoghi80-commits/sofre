import type {
  ConsolidatedGroceryItem,
  CuisineType,
  FridgeMatchResult,
  MainProteinType,
  ManualGroceryItem,
  MealSlotType,
  PantryItem,
  PlanCostSummary,
  PlannedMeal,
  Recipe,
  RecipeCategory,
  RecommendationScore,
  SwapCandidate,
  UserPreferences,
} from '../types/sofreh';
import { toPersianDigits } from './format';

export type CookbookSortOption =
  | 'recommended'
  | 'fastest'
  | 'cheapest'
  | 'highest_protein'
  | 'lowest_cal'
  | 'pantry_match';

export interface WeeklyPrepInsight {
  soakingAlerts: Array<{
    dayIndex: number;
    recipeId: string;
    recipeTitle: string;
    recipeIcon: string;
    legumes: string[];
    legumeCodes: string[];
  }>;
  batchPrepSuggestions: Array<{ ingredientName: string; mealCount: number; recipeTitles: string[] }>;
  sharedPerishableCount: number;
  sharedPerishables: Array<{ code: string; name: string }>;
  estimatedWasteSavedToman: number;
  weeklyAvgProteinG: number;
  weeklyAvgCalories: number;
}

const SOAKING_LEGUME_CODES = new Set([
  'ING_RED_BEANS',
  'ING_WHITE_BEANS',
  'ING_PINTO_BEANS',
  'ING_BLACK_BEANS',
  'ING_CHICKPEA',
  'ING_BLACK_EYED_PEA',
]);

const RICE_CODES = new Set(['ING_RICE_IRANI', 'ING_RICE_ARBORIO']);

export function getRecipeConsumptionCostForServings(
  recipe: Recipe,
  servings: number
): number {
  const ratio = servings / Math.max(1, recipe.baseServings);
  return Math.round(
    recipe.ingredients.reduce((acc, ing) => acc + ing.consumptionCostToman * ratio, 0)
  );
}

/**
 * STAGE 1 — Hard Clinical, Dietary, Allergen & Appliance Gate
 * Strictly verifies allergens (recipe + canonical ING_* level), diet rules, owned appliances, and meal slot.
 */
export function checkRecipeEligibility(
  recipe: Recipe,
  prefs: UserPreferences,
  slot?: MealSlotType
): { eligible: boolean; reason?: string } {
  if (slot && !recipe.mealTypes.includes(slot)) {
    return { eligible: false, reason: 'نامناسب برای این وعده' };
  }

  for (const allergen of prefs.allergens) {
    if (recipe.allergens.includes(allergen)) {
      return { eligible: false, reason: `دارای آلرژن ${allergen}` };
    }
    if (recipe.ingredients.some((ing) => ing.allergens?.includes(allergen))) {
      return { eligible: false, reason: `دارای ماده حساسیت‌زا (${allergen})` };
    }
  }

  if (Array.isArray(prefs.dislikedIngredients) && prefs.dislikedIngredients.length > 0) {
    const dislikedSet = new Set(prefs.dislikedIngredients);
    const dislikedHit = recipe.ingredients.find((ing) => dislikedSet.has(ing.code));
    if (dislikedHit) {
      return { eligible: false, reason: `دارای ماده ناخواسته (${dislikedHit.name})` };
    }
  }

  if (prefs.diet === 'vegan' && !recipe.diets.includes('vegan')) {
    return { eligible: false, reason: 'غیر وگان' };
  }
  if (
    prefs.diet === 'vegetarian' &&
    !recipe.diets.includes('vegetarian') &&
    !recipe.diets.includes('vegan')
  ) {
    return { eligible: false, reason: 'دارای گوشت یا ماهی' };
  }
  if (prefs.diet === 'low_carb' && recipe.carbsG > 32 && !recipe.diets.includes('low_carb')) {
    return { eligible: false, reason: 'کربوهیدرات بالا' };
  }
  if (
    prefs.diet === 'mediterranean' &&
    !recipe.diets.includes('mediterranean') &&
    recipe.cuisine !== 'ایرانی' &&
    recipe.cuisine !== 'مدیترانه‌ای'
  ) {
    return { eligible: false, reason: 'خارج از الگوی مدیترانه‌ای' };
  }

  if (prefs.appliances.length > 0) {
    const hasAllTools = recipe.requiredAppliances.every((tool) =>
      prefs.appliances.includes(tool)
    );
    if (!hasAllTools) {
      return { eligible: false, reason: 'نیاز به وسیله آشپزخانه انتخاب‌نشده' };
    }
  }

  return { eligible: true };
}

/**
 * STAGE 2 — Latent User Taste Profile Inference Engine
 * Generalizes explicit thumbs-up / thumbs-down ratings and saved cookbooks into
 * soft affinity weights across cuisines, categories, main proteins, and signature ingredients.
 */
export interface UserTasteProfile {
  cuisineAffinity: Partial<Record<CuisineType, number>>;
  categoryAffinity: Partial<Record<RecipeCategory, number>>;
  proteinAffinity: Partial<Record<MainProteinType, number>>;
  ingredientAffinity: Record<string, number>;
}

export function inferTasteProfile(
  catalog: Recipe[],
  ratings: Record<string, 'up' | 'down'> = {},
  savedRecipeIds: Set<string> = new Set()
): UserTasteProfile {
  const cuisineAffinity: Partial<Record<CuisineType, number>> = {};
  const categoryAffinity: Partial<Record<RecipeCategory, number>> = {};
  const proteinAffinity: Partial<Record<MainProteinType, number>> = {};
  const ingredientAffinity: Record<string, number> = {};

  const recipeMap = new Map(catalog.map((r) => [r.id, r]));

  const applyWeight = (recipe: Recipe, weight: number) => {
    cuisineAffinity[recipe.cuisine] = (cuisineAffinity[recipe.cuisine] ?? 0) + weight;
    categoryAffinity[recipe.category] = (categoryAffinity[recipe.category] ?? 0) + weight;
    proteinAffinity[recipe.mainProtein] = (proteinAffinity[recipe.mainProtein] ?? 0) + weight;
    for (const ing of recipe.ingredients) {
      if (!ing.isStaple) {
        ingredientAffinity[ing.code] = (ingredientAffinity[ing.code] ?? 0) + weight * 0.6;
      }
    }
  };

  for (const [id, rating] of Object.entries(ratings)) {
    const rec = recipeMap.get(id);
    if (!rec) continue;
    applyWeight(rec, rating === 'up' ? 3.5 : -4.5);
  }
  for (const id of savedRecipeIds) {
    const rec = recipeMap.get(id);
    if (!rec) continue;
    applyWeight(rec, 1.8);
  }

  return { cuisineAffinity, categoryAffinity, proteinAffinity, ingredientAffinity };
}

export interface ScoringContext {
  dayIndex: number;
  slot: MealSlotType;
  prefs: UserPreferences;
  pantryIds: Set<string>;
  plannedIngredientIds: Set<string>;
  /** Tracks exact accumulated quantity per canonical ING_* code across the week to measure pack-remainder synergy! */
  plannedIngredientUsage?: Map<string, number>;
  plannedRecipeCounts: Map<string, number>;
  pickedTodayRecipeIds: Set<string>;
  pickedTodayCategories?: Set<RecipeCategory>;
  todayHasRiceDish?: boolean;
  todayCaloriesSoFar?: number;
  todayProteinSoFar?: number;
  slotsPlannedToday?: number;
  slotsPerDay?: number;
  previousSlotProtein?: string;
  previousDaySlotProtein?: string;
  previousCategory?: string;
  previousDayCategories?: Set<RecipeCategory>;
  ratings: Record<string, 'up' | 'down'>;
  savedRecipeIds?: Set<string>;
  tasteProfile?: UserTasteProfile;
  plannedCountSoFar: number;
  persianCountSoFar: number;
  totalMealsInWeek: number;
  spentBudgetSoFar?: number;
  /** Optional tie-breaker rotation seed (0 = deterministic default) */
  varietySeed?: number;
}

/**
 * STAGE 3 — 15-Factor Deep Culinary Intelligence Scorer
 * Evaluates candidate recipes across dynamic budget-envelope pressure, leftover pack synergy,
 * intra-day macro balancing, Persian cultural cadence (Friday majlesi, no double-rice),
 * texture/protein diversity, fiber nutrition, and learned latent taste profile.
 */
export function scoreRecipeForSlot(
  recipe: Recipe,
  ctx: ScoringContext
): RecommendationScore {
  const gate = checkRecipeEligibility(recipe, ctx.prefs, ctx.slot);
  if (!gate.eligible) {
    return {
      score: -1000,
      normalizedScore: 0,
      matchReasons: [],
      eligible: false,
      disqualifyReason: gate.reason,
    };
  }

  let score = 50;
  const reasonCandidates: Array<{ priority: number; text: string }> = [];

  const totalTime = recipe.prepMinutes + recipe.cookMinutes;
  const mealCost = getRecipeConsumptionCostForServings(recipe, ctx.prefs.servings);
  const ratio = ctx.prefs.servings / Math.max(1, recipe.baseServings);

  // Dynamic remaining budget per remaining meal (strictly tracks true remaining envelope!)
  const remainingMeals = Math.max(1, ctx.totalMealsInWeek - ctx.plannedCountSoFar);
  const trueRemainingBudget =
    typeof ctx.spentBudgetSoFar === 'number'
      ? ctx.prefs.weeklyBudgetToman - ctx.spentBudgetSoFar
      : ctx.prefs.weeklyBudgetToman;
  const targetMealBudget =
    typeof ctx.spentBudgetSoFar === 'number'
      ? Math.max(1, trueRemainingBudget / remainingMeals)
      : Math.max(1, ctx.prefs.weeklyBudgetToman / Math.max(1, ctx.totalMealsInWeek));

  // Factor 2: Strict Budget-Envelope Elasticity Curve
  const budgetRatio = mealCost / targetMealBudget;
  const budgetWeight = ctx.prefs.goals.includes('budget') ? 1.85 : 1.35;
  if (trueRemainingBudget <= 0) {
    // Already at or past budget cap — heavily favor the absolute cheapest dishes
    score -= Math.min(340, 120 + (mealCost / Math.max(1, ctx.prefs.weeklyBudgetToman / Math.max(1, ctx.totalMealsInWeek))) * 140);
  } else if (budgetRatio <= 0.78) {
    score += 28 * budgetWeight;
    reasonCandidates.push({ priority: 90 * budgetWeight, text: 'اقتصادی و داخل بودجه' });
  } else if (budgetRatio <= 1.0) {
    score += 16 * budgetWeight;
  } else if (budgetRatio <= 1.2) {
    score -= 22 * budgetWeight;
  } else {
    score -= Math.min(280, 48 + (budgetRatio - 1.2) * 95) * budgetWeight;
  }

  // Factor 3: True Perishable Pack-Remainder Synergy & Pantry Rescue
  const nonStaples = recipe.ingredients.filter((i) => !i.isStaple);
  let pantryMatches = 0;
  let perishablePantryRescues = 0;
  let packSynergyScore = 0;
  let sharedPerishableCount = 0;
  let bestSharedName = '';

  for (const ing of nonStaples) {
    if (ctx.pantryIds.has(ing.code)) {
      pantryMatches += 1;
      if (ing.perishable) perishablePantryRescues += 1;
    }

    if (ctx.plannedIngredientIds.has(ing.code)) {
      const scaledNeed = ing.amount * ratio;
      const alreadyUsed = ctx.plannedIngredientUsage?.get(ing.code) ?? 0;
      const packsBefore = alreadyUsed > 0 ? Math.ceil(alreadyUsed / ing.packSize) : 0;
      const packsAfter = Math.ceil((alreadyUsed + scaledNeed) / ing.packSize);

      if (alreadyUsed > 0 && packsAfter === packsBefore) {
        // ZERO extra supermarket pack needed — uses leftover from an already-opened pack!
        packSynergyScore += ing.perishable ? 9.5 : 4.5;
        if (ing.perishable) {
          sharedPerishableCount += 1;
          if (!bestSharedName) bestSharedName = ing.name;
        }
      } else {
        packSynergyScore += ing.perishable ? 5.2 : 2.4;
        if (ing.perishable) sharedPerishableCount += 1;
      }
    }
  }

  const wasteWeight = ctx.prefs.goals.includes('nowaste') ? 1.85 : 1.1;
  const totalOverlap = pantryMatches * 6.5 + perishablePantryRescues * 3.5 + packSynergyScore;
  score += Math.min(42, totalOverlap * wasteWeight);

  if (pantryMatches >= 2) {
    reasonCandidates.push({
      priority: 91 * wasteWeight,
      text: `${toPersianDigits(pantryMatches)} قلم آن را در خانه دارید`,
    });
  } else if (sharedPerishableCount >= 1 && bestSharedName) {
    reasonCandidates.push({
      priority: 87 * wasteWeight,
      text: `همپوشانی بستهٔ ${bestSharedName.split(' ')[0]} (ضداسراف)`,
    });
  } else if (sharedPerishableCount >= 2) {
    reasonCandidates.push({
      priority: 84 * wasteWeight,
      text: 'همپوشانی مواد هفته (ضداسراف)',
    });
  }

  // Factor 4 & 5: Intra-Day Adaptive Protein & Calorie Balancing
  const slotShare =
    ctx.slot === 'breakfast' ? 0.25 : ctx.slot === 'lunch' ? 0.42 : 0.33;
  const slotsPerDay = Math.max(1, ctx.slotsPerDay ?? ctx.prefs.activeMealSlots.length);
  const slotsLeftToday = Math.max(1, slotsPerDay - (ctx.slotsPlannedToday ?? 0));

  const targetProtein =
    typeof ctx.todayProteinSoFar === 'number' && (ctx.slotsPlannedToday ?? 0) > 0
      ? Math.max(14, (ctx.prefs.dailyProteinTarget - ctx.todayProteinSoFar) / slotsLeftToday)
      : Math.max(15, ctx.prefs.dailyProteinTarget * slotShare);

  const targetCal =
    typeof ctx.todayCaloriesSoFar === 'number' && (ctx.slotsPlannedToday ?? 0) > 0
      ? Math.max(260, (ctx.prefs.dailyCalorieTarget - ctx.todayCaloriesSoFar) / slotsLeftToday)
      : ctx.prefs.dailyCalorieTarget * slotShare;

  const proteinWeight =
    ctx.prefs.diet === 'high_protein' || ctx.prefs.goals.includes('healthy') ? 1.65 : 1.0;

  if (recipe.proteinG >= targetProtein) {
    score += 19 * proteinWeight;
    if (recipe.proteinG >= 34) {
      reasonCandidates.push({
        priority: 83 * proteinWeight,
        text: `پروتئین بالا (${toPersianDigits(recipe.proteinG)} گرم)`,
      });
    }
  } else if (recipe.proteinG >= targetProtein * 0.78) {
    score += 8 * proteinWeight;
  } else {
    score -= 8 * proteinWeight;
  }

  const calDiff = Math.abs(recipe.caloriesPerServing - targetCal);
  const calWeight = ctx.prefs.goals.includes('calories') ? 1.7 : 1.0;
  if (calDiff <= 85) {
    score += 17 * calWeight;
    if (ctx.prefs.goals.includes('calories')) {
      reasonCandidates.push({ priority: 81, text: 'متناسب با کالری امروز' });
    }
  } else if (calDiff <= 170) {
    score += 6 * calWeight;
  } else {
    score -= Math.min(20, (calDiff - 170) / 16) * calWeight;
  }

  // Factor 6: Fiber & Micronutrient Quality Bonus
  if (recipe.fiberG >= 8) {
    score += ctx.prefs.goals.includes('healthy') ? 8 : 4;
  }

  // Factor 7: Persian Cultural Cadence (Weekday Quick-Cook vs Thursday/Friday Majlesi Feast)
  const isFriday = ctx.dayIndex === 6;
  const isWeekend = ctx.dayIndex >= 5;
  const fastWeight = ctx.prefs.goals.includes('fast') ? 1.8 : 1.0;
  const isPersian = recipe.cuisine === 'ایرانی';

  if (!isWeekend) {
    if (totalTime <= 25) {
      score += 18 * fastWeight;
      reasonCandidates.push({
        priority: 79 * fastWeight,
        text: `سریع (${toPersianDigits(totalTime)} دقیقه)`,
      });
    } else if (totalTime <= 40) {
      score += 8 * fastWeight;
    } else if (totalTime >= 75) {
      score -= 16 * fastWeight;
    }
  } else {
    const isMajlesi =
      recipe.difficulty === 'مجلسی' ||
      recipe.tags.includes('مجلسی') ||
      (isPersian && (recipe.category === 'خورشت' || recipe.category === 'پلو' || recipe.category === 'کباب و مرغ') && totalTime >= 45);
    if (isMajlesi) {
      const weekendBoost = (isFriday ? 22 : 14) + (ctx.prefs.goals.includes('cook') ? 8 : 0);
      score += weekendBoost;
      reasonCandidates.push({
        priority: 85,
        text: isFriday ? 'مجلسی ویژهٔ جمعه' : 'پخت دلچسب آخر هفته',
      });
    }
  }

  // Factor 8: Lighter Dinner Pairing & Double-Rice / Same-Category Intra-Day Guard
  const isRiceDish =
    recipe.category === 'پلو' ||
    recipe.ingredients.some((i) => RICE_CODES.has(i.code) && i.amount >= 100);

  if (ctx.todayHasRiceDish && isRiceDish) {
    // Avoid serving heavy rice for both lunch and dinner on the exact same day
    score -= 34;
  }
  if (ctx.slot === 'dinner' && ctx.todayCaloriesSoFar && ctx.todayCaloriesSoFar > ctx.prefs.dailyCalorieTarget * 0.55) {
    if (recipe.caloriesPerServing <= 460 && totalTime <= 35) {
      score += 12;
      reasonCandidates.push({ priority: 74, text: 'شام سبک و متعادل' });
    }
  }
  if (ctx.pickedTodayCategories?.has(recipe.category)) {
    score -= 26;
  }

  // Factor 9: Continuous Persian vs International Proportional Feedback Controller
  const targetPersianRatio =
    typeof ctx.prefs.persianRatio === 'number'
      ? Math.max(0, Math.min(1, ctx.prefs.persianRatio / 100))
      : ctx.prefs.cuisinePreference === 'mostly_persian'
        ? 0.78
        : ctx.prefs.cuisinePreference === 'global_explorer'
          ? 0.3
          : 0.55;
  const currentPersianRatio =
    ctx.plannedCountSoFar > 0
      ? ctx.persianCountSoFar / ctx.plannedCountSoFar
      : targetPersianRatio;

  if (targetPersianRatio >= 0.95) {
    score += isPersian ? 38 : -52;
  } else if (targetPersianRatio <= 0.05) {
    score += !isPersian ? 38 : -52;
  } else {
    const ratioError = targetPersianRatio - currentPersianRatio;
    if (isPersian) {
      score += Math.max(-24, Math.min(26, ratioError * 68));
      if (ratioError > 0.05 && targetPersianRatio >= 0.65) {
        reasonCandidates.push({ priority: 66, text: 'سفرهٔ اصیل ایرانی' });
      }
    } else {
      score += Math.max(-24, Math.min(26, -ratioError * 68));
      if (ratioError < -0.05) {
        reasonCandidates.push({ priority: 68, text: `تنوع ${recipe.cuisine}` });
      }
    }
  }

  // Factor 10: Anti-Repetition & Multi-Day Protein/Category Diversity Guard
  if (ctx.pickedTodayRecipeIds.has(recipe.id)) {
    score -= 550;
  }
  const weeklyCount = ctx.plannedRecipeCounts.get(recipe.id) ?? 0;
  if (weeklyCount > 0) {
    score -= weeklyCount * 210;
  }
  if (ctx.previousSlotProtein && recipe.mainProtein === ctx.previousSlotProtein) {
    score -= 24;
  }
  if (ctx.previousDaySlotProtein && recipe.mainProtein === ctx.previousDaySlotProtein) {
    score -= 16;
  }
  if (ctx.previousCategory && recipe.category === ctx.previousCategory) {
    score -= 12;
  }
  if (ctx.previousDayCategories?.has(recipe.category)) {
    score -= 7;
  }

  // Factor 11 & 12: Direct Taste Memory + Learned Latent Taste Affinity
  const rating = ctx.ratings[recipe.id];
  if (rating === 'up') {
    score += 36;
    reasonCandidates.push({ priority: 96, text: 'بر اساس پسند شما' });
  } else if (rating === 'down') {
    score -= 180;
  }
  if (ctx.savedRecipeIds?.has(recipe.id)) {
    score += 13;
  }

  if (ctx.tasteProfile) {
    const latent =
      (ctx.tasteProfile.cuisineAffinity[recipe.cuisine] ?? 0) * 1.1 +
      (ctx.tasteProfile.categoryAffinity[recipe.category] ?? 0) * 1.4 +
      (ctx.tasteProfile.proteinAffinity[recipe.mainProtein] ?? 0) * 1.2 +
      recipe.ingredients.reduce(
        (sum, ing) => sum + (ctx.tasteProfile?.ingredientAffinity[ing.code] ?? 0) * 0.3,
        0
      );
    const clampedLatent = Math.max(-22, Math.min(22, latent));
    score += clampedLatent;
    if (clampedLatent >= 7 && rating !== 'up') {
      reasonCandidates.push({ priority: 77, text: 'همسو با ذائقهٔ شما' });
    }
  }

  // Deterministic variety tie-breaker (supports optional seed on manual shuffle)
  const seed = ctx.varietySeed ?? 0;
  const hash =
    recipe.id.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0) % 13;
  score += ((hash + ctx.dayIndex * 5 + seed * 7) % 13) * 0.35;

  reasonCandidates.sort((a, b) => b.priority - a.priority);
  const matchReasons = Array.from(new Set(reasonCandidates.map((r) => r.text))).slice(0, 2);
  if (matchReasons.length === 0) {
    matchReasons.push(recipe.tags[0] ?? 'پیشنهاد متعادل سفره');
  }

  const normalizedScore = Math.max(48, Math.min(99, Math.round(52 + (score - 45) * 0.48)));

  return {
    score,
    normalizedScore,
    matchReasons,
    eligible: true,
  };
}

/**
 * Computes the true mathematical minimum weekly budget (in Toman, rounded up to nearest 100k)
 * required to build a valid meal plan under the user's exact servings, days, slots, diet,
 * allergies, dislikes, and appliances using current live prices.
 */
export function computeMinimumWeeklyBudget(
  catalog: Recipe[],
  prefs: UserPreferences
): number {
  const slots: MealSlotType[] =
    prefs.activeMealSlots.length > 0 ? prefs.activeMealSlots : ['lunch', 'dinner'];
  const dayCount =
    Array.isArray(prefs.cookingDays) && prefs.cookingDays.length > 0
      ? prefs.cookingDays.length
      : Math.min(7, Math.max(1, prefs.cookingDaysPerWeek));

  let rawMinTotal = 0;
  for (const slot of slots) {
    const eligibleCosts = catalog
      .filter((r) => checkRecipeEligibility(r, prefs, slot).eligible)
      .map((r) => getRecipeConsumptionCostForServings(r, prefs.servings))
      .sort((a, b) => a - b);

    if (eligibleCosts.length === 0) continue;
    // Average of the cheapest ~dayCount distinct dishes (with slight headroom so variety stays enjoyable)
    const sampleCount = Math.min(eligibleCosts.length, Math.max(3, dayCount));
    let slotSum = 0;
    for (let i = 0; i < dayCount; i++) {
      slotSum += eligibleCosts[i % sampleCount];
    }
    rawMinTotal += slotSum;
  }

  if (rawMinTotal <= 0) return 1_000_000;
  // Round up cleanly to nearest 100,000 Toman (min 500k)
  return Math.max(500_000, Math.ceil(rawMinTotal / 100_000) * 100_000);
}

/**
 * STAGE 4 — Strict Budget-Guaranteed Whole-Week Optimizer
 *  - Pass A: Lifts low-protein days ONLY while staying strictly inside prefs.weeklyBudgetToman.
 *  - Pass B: Hard Budget Guarantee — iteratively replaces the priciest meals with the best
 *    cheaper eligible alternatives (first unique + same cuisine, then unique any cuisine,
 *    then non-adjacent repeats if budget is ultra-tight) until totalCost <= prefs.weeklyBudgetToman.
 */
function optimizeWeeklyPlan(
  initialPlan: PlannedMeal[],
  catalog: Recipe[],
  prefs: UserPreferences,
  pantryIds: Set<string>,
  ratings: Record<string, 'up' | 'down'>,
  tasteProfile: UserTasteProfile
): PlannedMeal[] {
  if (initialPlan.length === 0) return initialPlan;
  const recipeMap = new Map(catalog.map((r) => [r.id, r]));
  const plan = [...initialPlan];

  const computeTotalConsumption = (p: PlannedMeal[]) =>
    p.reduce((sum, m) => {
      const r = recipeMap.get(m.recipeId);
      return sum + (r ? getRecipeConsumptionCostForServings(r, m.servings) : 0);
    }, 0);

  const targetPersianRatio =
    typeof prefs.persianRatio === 'number'
      ? Math.max(0, Math.min(1, prefs.persianRatio / 100))
      : null;

  const respectsCuisineLock = (cand: Recipe) => {
    if (targetPersianRatio === null) return true;
    if (targetPersianRatio >= 0.95) return cand.cuisine === 'ایرانی';
    if (targetPersianRatio <= 0.05) return cand.cuisine !== 'ایرانی';
    return true;
  };

  // Pass A: Daily Protein Floor Lift — STRICTLY budget-safe (never pushes total > weeklyBudgetToman)
  if (prefs.diet === 'high_protein' || prefs.goals.includes('healthy')) {
    const byDay = new Map<number, number[]>();
    plan.forEach((m, idx) => {
      const list = byDay.get(m.dayIndex) ?? [];
      list.push(idx);
      byDay.set(m.dayIndex, list);
    });

    const usedIds = new Set(plan.map((m) => m.recipeId));
    for (const [, indices] of byDay.entries()) {
      if (indices.length < 2) continue;
      const dayProtein = indices.reduce(
        (s, idx) => s + (recipeMap.get(plan[idx].recipeId)?.proteinG ?? 0),
        0
      );
      if (dayProtein >= prefs.dailyProteinTarget * 0.72) continue;

      let lowIdx = indices[0];
      let lowProtein = Infinity;
      for (const idx of indices) {
        const p = recipeMap.get(plan[idx].recipeId)?.proteinG ?? 0;
        if (p < lowProtein) {
          lowProtein = p;
          lowIdx = idx;
        }
      }

      const targetMeal = plan[lowIdx];
      const currentRecipe = recipeMap.get(targetMeal.recipeId);
      if (!currentRecipe) continue;
      const currentCost = getRecipeConsumptionCostForServings(currentRecipe, targetMeal.servings);
      const currentTotal = computeTotalConsumption(plan);
      const maxAllowedMealCost = Math.min(
        currentCost * 1.18,
        currentCost + Math.max(0, prefs.weeklyBudgetToman - currentTotal)
      );

      const replacement = catalog
        .filter((cand) => {
          if (usedIds.has(cand.id) || ratings[cand.id] === 'down') return false;
          if (!respectsCuisineLock(cand)) return false;
          if (!checkRecipeEligibility(cand, prefs, targetMeal.slot).eligible) return false;
          if (cand.proteinG < lowProtein + 10) return false;
          return getRecipeConsumptionCostForServings(cand, targetMeal.servings) <= maxAllowedMealCost;
        })
        .sort((a, b) => b.proteinG - a.proteinG)[0];

      if (replacement) {
        usedIds.add(replacement.id);
        plan[lowIdx] = {
          ...targetMeal,
          id: `meal-${targetMeal.dayIndex}-${targetMeal.slot}-${replacement.id}`,
          recipeId: replacement.id,
          matchReasons: [`پروتئین بالا (${toPersianDigits(replacement.proteinG)} گرم)`, 'متعادل‌ساز روزانه'],
          matchScore: 93,
        };
      }
    }
  }

  // Pass B: HARD BUDGET GUARANTEE — iteratively pull total weekly cost <= prefs.weeklyBudgetToman
  const maxPasses = Math.max(12, plan.length * 3);
  for (let iter = 0; iter < maxPasses; iter++) {
    const totalCost = computeTotalConsumption(plan);
    if (totalCost <= prefs.weeklyBudgetToman) break;

    const deficit = totalCost - prefs.weeklyBudgetToman;
    const usedIds = new Set(plan.map((m) => m.recipeId));

    type BudgetSwapCandidate = {
      mealIdx: number;
      recipe: Recipe;
      savings: number;
      rank: number;
    };

    const pickBestSwapForTier = (tier: number): BudgetSwapCandidate | null => {
      let best: BudgetSwapCandidate | null = null;

      // Order meals from most expensive to least expensive
      const mealOrder = plan
        .map((m, idx) => {
          const r = recipeMap.get(m.recipeId);
          return {
            idx,
            cost: r ? getRecipeConsumptionCostForServings(r, m.servings) : 0,
          };
        })
        .sort((a, b) => b.cost - a.cost);

      for (const { idx } of mealOrder) {
        const targetMeal = plan[idx];
        const currentRecipe = recipeMap.get(targetMeal.recipeId);
        if (!currentRecipe) continue;
        const currentCost = getRecipeConsumptionCostForServings(currentRecipe, targetMeal.servings);

        const sameOrAdjacentIds = new Set<string>();
        const otherIngs = new Set<string>();
        for (let i = 0; i < plan.length; i++) {
          if (i === idx) continue;
          const m = plan[i];
          if (Math.abs(m.dayIndex - targetMeal.dayIndex) <= 1) {
            sameOrAdjacentIds.add(m.recipeId);
          }
          const r = recipeMap.get(m.recipeId);
          r?.ingredients.forEach((ing) => {
            if (!ing.isStaple) otherIngs.add(ing.code);
          });
        }

        for (const cand of catalog) {
          if (cand.id === currentRecipe.id) continue;
          if (ratings[cand.id] === 'down') continue;
          if (tier < 2 && usedIds.has(cand.id)) continue;
          if (tier === 2 && sameOrAdjacentIds.has(cand.id)) continue;
          if (tier === 0 && !respectsCuisineLock(cand)) continue;
          if (!checkRecipeEligibility(cand, prefs, targetMeal.slot).eligible) continue;

          const candCost = getRecipeConsumptionCostForServings(cand, targetMeal.servings);
          const savings = currentCost - candCost;
          if (savings <= 2_000) continue;

          const overlap = cand.ingredients.filter(
            (i) => !i.isStaple && (otherIngs.has(i.code) || pantryIds.has(i.code))
          ).length;
          const sameCuisineBonus = cand.cuisine === currentRecipe.cuisine ? 14 : 0;
          const effectiveSavings = Math.min(savings, deficit * 1.15);
          const savingsScore = (effectiveSavings / Math.max(1, currentCost)) * 55;
          const proteinBonus = cand.proteinG >= 22 ? 6 : 0;
          const tasteBonus = (tasteProfile.categoryAffinity[cand.category] ?? 0) * 0.8;
          const rank = savingsScore + overlap * 4 + sameCuisineBonus + proteinBonus + tasteBonus;

          if (!best || rank > best.rank) {
            best = { mealIdx: idx, recipe: cand, savings, rank };
          }
        }
      }

      return best;
    };

    // Try 3 progressive tiers: (0) unique + cuisine-locked, (1) unique any cuisine, (2) non-adjacent repeat
    const chosenSwap =
      pickBestSwapForTier(0) ?? pickBestSwapForTier(1) ?? pickBestSwapForTier(2);

    if (!chosenSwap) break;

    const targetMeal = plan[chosenSwap.mealIdx];
    plan[chosenSwap.mealIdx] = {
      ...targetMeal,
      id: `meal-${targetMeal.dayIndex}-${targetMeal.slot}-${chosenSwap.recipe.id}`,
      recipeId: chosenSwap.recipe.id,
      matchReasons: ['بهینه‌شده برای بودجهٔ هفته', chosenSwap.recipe.tags[0] ?? 'اقتصادی'],
      matchScore: Math.max(82, targetMeal.matchScore ?? 85),
    };
  }

  return plan;
}

/**
 * Generates a full 7-day personalized weekly plan using the Multi-Stage Culinary Optimization Engine.
 */
export function generateWeeklyPlan(
  catalog: Recipe[],
  prefs: UserPreferences,
  pantry: PantryItem[],
  ratings: Record<string, 'up' | 'down'> = {},
  savedRecipeIds: Set<string> = new Set(),
  varietySeed = 0
): PlannedMeal[] {
  const pantryIds = new Set(pantry.filter((p) => p.inStock).map((p) => p.ingredientId));
  const plannedIngredientIds = new Set<string>();
  const plannedIngredientUsage = new Map<string, number>();
  const plannedRecipeCounts = new Map<string, number>();
  const lastDaySlotProtein: Partial<Record<MealSlotType, string>> = {};
  const lastDaySlotCategory: Partial<Record<MealSlotType, string>> = {};
  const tasteProfile = inferTasteProfile(catalog, ratings, savedRecipeIds);

  const slots: MealSlotType[] =
    prefs.activeMealSlots.length > 0 ? prefs.activeMealSlots : ['lunch', 'dinner'];
  const selectedDayIndices: number[] =
    Array.isArray(prefs.cookingDays) && prefs.cookingDays.length > 0
      ? Array.from(
          new Set(
            prefs.cookingDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
          )
        ).sort((a, b) => a - b)
      : Array.from(
          { length: Math.min(7, Math.max(1, prefs.cookingDaysPerWeek)) },
          (_, i) => i
        );
  const totalMealsInWeek = selectedDayIndices.length * slots.length;

  const plan: PlannedMeal[] = [];
  let persianCountSoFar = 0;
  let spentBudgetSoFar = 0;
  let previousDayCategories = new Set<RecipeCategory>();

  for (const dayIndex of selectedDayIndices) {
    const pickedTodayRecipeIds = new Set<string>();
    const pickedTodayCategories = new Set<RecipeCategory>();
    let previousSlotProtein: string | undefined;
    let todayHasRiceDish = false;
    let todayCaloriesSoFar = 0;
    let todayProteinSoFar = 0;
    let slotsPlannedToday = 0;

    for (const slot of slots) {
      const buildContext = (overridePrefs: UserPreferences): ScoringContext => ({
        dayIndex,
        slot,
        prefs: overridePrefs,
        pantryIds,
        plannedIngredientIds,
        plannedIngredientUsage,
        plannedRecipeCounts,
        pickedTodayRecipeIds,
        pickedTodayCategories,
        todayHasRiceDish,
        todayCaloriesSoFar,
        todayProteinSoFar,
        slotsPlannedToday,
        slotsPerDay: slots.length,
        previousSlotProtein,
        previousDaySlotProtein: lastDaySlotProtein[slot],
        previousCategory: lastDaySlotCategory[slot],
        previousDayCategories,
        ratings,
        savedRecipeIds,
        tasteProfile,
        plannedCountSoFar: plan.length,
        persianCountSoFar,
        totalMealsInWeek,
        spentBudgetSoFar,
        varietySeed,
      });

      let candidates = catalog
        .map((recipe) => ({
          recipe,
          result: scoreRecipeForSlot(recipe, buildContext(prefs)),
        }))
        .filter((item) => item.result.eligible);

      if (candidates.length === 0) {
        const relaxedPrefs: UserPreferences = {
          ...prefs,
          appliances: [],
          diet: prefs.diet === 'vegan' || prefs.diet === 'vegetarian' ? prefs.diet : 'omnivore',
        };
        candidates = catalog
          .map((recipe) => ({
            recipe,
            result: scoreRecipeForSlot(recipe, buildContext(relaxedPrefs)),
          }))
          .filter((item) => item.result.eligible);
      }

      if (candidates.length === 0) continue;

      candidates.sort((a, b) => b.result.score - a.result.score);
      const chosen = candidates[0];

      plan.push({
        id: `meal-${dayIndex}-${slot}-${chosen.recipe.id}`,
        dayIndex,
        slot,
        recipeId: chosen.recipe.id,
        servings: prefs.servings,
        cooked: false,
        matchReasons: chosen.result.matchReasons,
        matchScore: chosen.result.normalizedScore,
      });

      pickedTodayRecipeIds.add(chosen.recipe.id);
      pickedTodayCategories.add(chosen.recipe.category);
      previousSlotProtein = chosen.recipe.mainProtein;
      lastDaySlotProtein[slot] = chosen.recipe.mainProtein;
      lastDaySlotCategory[slot] = chosen.recipe.category;
      todayCaloriesSoFar += chosen.recipe.caloriesPerServing;
      todayProteinSoFar += chosen.recipe.proteinG;
      slotsPlannedToday += 1;
      spentBudgetSoFar += getRecipeConsumptionCostForServings(chosen.recipe, prefs.servings);

      if (
        chosen.recipe.category === 'پلو' ||
        chosen.recipe.ingredients.some((i) => RICE_CODES.has(i.code) && i.amount >= 100)
      ) {
        todayHasRiceDish = true;
      }

      plannedRecipeCounts.set(
        chosen.recipe.id,
        (plannedRecipeCounts.get(chosen.recipe.id) ?? 0) + 1
      );
      if (chosen.recipe.cuisine === 'ایرانی') persianCountSoFar += 1;

      const scale = prefs.servings / Math.max(1, chosen.recipe.baseServings);
      for (const ing of chosen.recipe.ingredients) {
        if (!ing.isStaple) {
          plannedIngredientIds.add(ing.code);
          plannedIngredientUsage.set(
            ing.code,
            (plannedIngredientUsage.get(ing.code) ?? 0) + ing.amount * scale
          );
        }
      }
    }

    previousDayCategories = pickedTodayCategories;
  }

  return optimizeWeeklyPlan(plan, catalog, prefs, pantryIds, ratings, tasteProfile);
}

/**
 * STAGE 5 — Smart Weekly Prep, Soaking & Anti-Waste Intelligence
 */
export function buildWeeklyPrepInsights(
  plan: PlannedMeal[],
  catalog: Recipe[]
): WeeklyPrepInsight {
  const recipeMap = new Map(catalog.map((r) => [r.id, r]));
  const soakingAlerts: WeeklyPrepInsight['soakingAlerts'] = [];
  const ingredientToRecipes = new Map<
    string,
    { code: string; name: string; perishable: boolean; packCost: number; titles: Set<string> }
  >();

  let totalProtein = 0;
  let totalCalories = 0;
  const distinctDays = new Set<number>();

  for (const meal of plan) {
    const recipe = recipeMap.get(meal.recipeId);
    if (!recipe) continue;
    distinctDays.add(meal.dayIndex);
    totalProtein += recipe.proteinG;
    totalCalories += recipe.caloriesPerServing;

    const soakingIngs = recipe.ingredients.filter((i) => SOAKING_LEGUME_CODES.has(i.code));
    if (soakingIngs.length > 0) {
      soakingAlerts.push({
        dayIndex: meal.dayIndex,
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        recipeIcon: recipe.icon,
        legumes: soakingIngs.map((i) => i.name),
        legumeCodes: soakingIngs.map((i) => i.code),
      });
    }

    for (const ing of recipe.ingredients) {
      if (ing.isStaple) continue;
      const entry = ingredientToRecipes.get(ing.code) ?? {
        code: ing.code,
        name: ing.name,
        perishable: Boolean(ing.perishable),
        packCost: ing.packCostToman,
        titles: new Set<string>(),
      };
      entry.titles.add(recipe.title);
      ingredientToRecipes.set(ing.code, entry);
    }
  }

  const batchPrepSuggestions: WeeklyPrepInsight['batchPrepSuggestions'] = [];
  const sharedPerishables: Array<{ code: string; name: string }> = [];
  let sharedPerishableCount = 0;
  let estimatedWasteSavedToman = 0;

  for (const entry of ingredientToRecipes.values()) {
    if (entry.titles.size >= 2) {
      if (entry.perishable) {
        sharedPerishableCount += 1;
        sharedPerishables.push({ code: entry.code, name: entry.name });
        estimatedWasteSavedToman += Math.round(entry.packCost * 0.45);
      }
      if (entry.titles.size >= 2) {
        batchPrepSuggestions.push({
          ingredientName: entry.name,
          mealCount: entry.titles.size,
          recipeTitles: Array.from(entry.titles),
        });
      }
    }
  }

  batchPrepSuggestions.sort((a, b) => b.mealCount - a.mealCount);

  const dayCount = Math.max(1, distinctDays.size);
  return {
    soakingAlerts: soakingAlerts.slice(0, 6),
    batchPrepSuggestions: batchPrepSuggestions.slice(0, 4),
    sharedPerishableCount,
    sharedPerishables: sharedPerishables.slice(0, 5),
    estimatedWasteSavedToman,
    weeklyAvgProteinG: Math.round(totalProtein / dayCount),
    weeklyAvgCalories: Math.round(totalCalories / dayCount),
  };
}

function formatNaturalStorePack(
  code: string,
  aisle: ConsolidatedGroceryItem['aisle'],
  unit: string,
  packSize: number,
  packsNeeded: number
): string {
  // Liquids / oils / sauces stored in spoons -> real supermarket bottles/jars
  if (unit === 'قاشق') {
    if (code.includes('OIL') || code.includes('VINEGAR') || code === 'ING_VERJUICE' || code === 'ING_ROSEWATER' || code === 'ING_SOY_SAUCE') {
      const ml = Math.round((packSize * 12) / 50) * 50;
      const sizeStr = ml >= 900 ? '۱ لیتری' : `${ml} میلی‌لیتری`;
      return `${packsNeeded} بطری ${sizeStr}`;
    }
    if (code.includes('PASTE') || code.includes('HONEY') || code.includes('SAUCE') || code === 'ING_MAYONNAISE' || code === 'ING_MUSTARD' || code === 'ING_SALSA' || code === 'ING_SRIRACHA') {
      return `${packsNeeded} شیشه / قوطی کامل`;
    }
    if (code === 'ING_SAFFRON') {
      return `${packsNeeded} بسته زعفران`;
    }
    if (code === 'ING_SUGAR') {
      return `${packsNeeded} بسته (۱ کیلو)`;
    }
    if (aisle === 'spices') {
      return `${packsNeeded} بسته ادویه`;
    }
    return `${packsNeeded} بسته کامل`;
  }

  if (code === 'ING_EGG') {
    return `${packsNeeded} شانه ${packSize} عددی`;
  }
  if (unit === 'میلی‌لیتر') {
    const totalMl = packsNeeded * packSize;
    if (totalMl >= 1000 && totalMl % 1000 === 0) return `${totalMl / 1000} لیتر`;
    return `${packsNeeded} بسته (${packSize} میلی‌لیتر)`;
  }
  if (unit === 'گرم') {
    const totalG = packsNeeded * packSize;
    if (totalG >= 1000 && totalG % 1000 === 0) return `${totalG / 1000} کیلوگرم`;
    if (packsNeeded === 1) return `۱ بسته (${packSize} گرم)`;
    return `${packsNeeded} بسته (${totalG} گرم)`;
  }
  if (unit === 'برش') {
    return `${packsNeeded} بسته نان کامل`;
  }
  if (unit === 'حبه') {
    return `${packsNeeded} بوته کامل`;
  }
  return `${packsNeeded} بسته (${packSize} ${unit})`;
}

/**
 * Consolidates all planned meals into a dual-cost grocery list using canonical ING_* codes.
 */
export function buildConsolidatedGroceryList(
  plan: PlannedMeal[],
  catalog: Recipe[],
  pantry: PantryItem[],
  checkedIds: Record<string, boolean>,
  manualItems: ManualGroceryItem[]
): { items: ConsolidatedGroceryItem[]; summary: PlanCostSummary } {
  const recipeMap = new Map(catalog.map((r) => [r.id, r]));
  const pantryIds = new Set(pantry.filter((p) => p.inStock).map((p) => p.ingredientId));

  const aggregated = new Map<
    string,
    {
      ingredientId: string;
      name: string;
      aisle: ConsolidatedGroceryItem['aisle'];
      totalAmount: number;
      unit: string;
      packSize: number;
      packCostToman: number;
      consumptionCostToman: number;
      recipeTitles: Set<string>;
    }
  >();

  let totalServings = 0;

  for (const meal of plan) {
    const recipe = recipeMap.get(meal.recipeId);
    if (!recipe) continue;
    totalServings += meal.servings;
    const ratio = meal.servings / Math.max(1, recipe.baseServings);

    for (const ing of recipe.ingredients) {
      const existing = aggregated.get(ing.code);
      const scaledAmount = ing.amount * ratio;
      const scaledConsumptionCost = ing.consumptionCostToman * ratio;

      if (existing) {
        existing.totalAmount += scaledAmount;
        existing.consumptionCostToman += scaledConsumptionCost;
        existing.recipeTitles.add(recipe.title);
      } else {
        aggregated.set(ing.code, {
          ingredientId: ing.code,
          name: ing.name,
          aisle: ing.aisle,
          totalAmount: scaledAmount,
          unit: ing.unit,
          packSize: ing.packSize,
          packCostToman: ing.packCostToman,
          consumptionCostToman: scaledConsumptionCost,
          recipeTitles: new Set([recipe.title]),
        });
      }
    }
  }

  const items: ConsolidatedGroceryItem[] = [];
  let totalConsumption = 0;
  let totalShelfCheckout = 0;
  let totalLeftoverValue = 0;

  for (const entry of aggregated.values()) {
    const roundedAmount =
      entry.totalAmount >= 10
        ? Math.round(entry.totalAmount)
        : Math.round(entry.totalAmount * 10) / 10;
    const packsNeeded = Math.max(1, Math.ceil(entry.totalAmount / entry.packSize));
    const shelfCost = packsNeeded * entry.packCostToman;
    const consumptionCost = Math.round(entry.consumptionCostToman);
    const inPantry = pantryIds.has(entry.ingredientId);

    totalConsumption += consumptionCost;
    if (!inPantry) {
      totalShelfCheckout += shelfCost;
      totalLeftoverValue += Math.max(0, shelfCost - consumptionCost);
    }

    items.push({
      ingredientId: entry.ingredientId,
      name: entry.name,
      aisle: entry.aisle,
      totalAmount: roundedAmount,
      unit: entry.unit,
      formattedAmount: `${roundedAmount} ${entry.unit}`,
      packsNeeded,
      packLabel: formatNaturalStorePack(
        entry.ingredientId,
        entry.aisle,
        entry.unit,
        entry.packSize,
        packsNeeded
      ),
      consumptionCostToman: consumptionCost,
      shelfCostToman: shelfCost,
      inPantry,
      checked: Boolean(checkedIds[entry.ingredientId]),
      recipeTitles: Array.from(entry.recipeTitles),
    });
  }

  for (const m of manualItems) {
    totalConsumption += m.estimatedCostToman;
    totalShelfCheckout += m.estimatedCostToman;
    items.push({
      ingredientId: m.ingredientCode ? m.ingredientCode : `manual-${m.id}`,
      name: m.name,
      aisle: m.aisle,
      totalAmount: 1,
      unit: '',
      formattedAmount: m.amountLabel,
      packsNeeded: 1,
      packLabel: m.amountLabel,
      consumptionCostToman: m.estimatedCostToman,
      shelfCostToman: m.estimatedCostToman,
      inPantry: false,
      checked: m.checked,
      recipeTitles: ['افزوده‌شده دستی'],
      isManual: true,
      manualId: m.id,
    });
  }

  items.sort((a, b) => {
    if (a.aisle !== b.aisle) return a.aisle.localeCompare(b.aisle);
    return b.shelfCostToman - a.shelfCostToman;
  });

  const summary: PlanCostSummary = {
    consumptionCostToman: Math.round(totalConsumption),
    shelfCheckoutCostToman: Math.round(totalShelfCheckout),
    leftoverFridgeValueToman: Math.round(totalLeftoverValue),
    weeklyBudgetToman: 0,
    costPerServingToman:
      totalServings > 0 ? Math.round(totalConsumption / totalServings) : 0,
    budgetPercent: 0,
  };

  return { items, summary };
}

/**
 * Returns ranked Swap Candidates powered by the 15-Factor Engine with delta cost & matchReasons.
 */
export function getSwapCandidates(
  currentMeal: PlannedMeal,
  plan: PlannedMeal[],
  catalog: Recipe[],
  prefs: UserPreferences,
  pantry: PantryItem[] = [],
  ratings: Record<string, 'up' | 'down'> = {}
): SwapCandidate[] {
  const recipeMap = new Map(catalog.map((r) => [r.id, r]));
  const currentRecipe = recipeMap.get(currentMeal.recipeId);
  const currentCost = currentRecipe
    ? getRecipeConsumptionCostForServings(currentRecipe, currentMeal.servings)
    : 0;

  const otherPlanIngredients = new Set<string>();
  const otherIngredientUsage = new Map<string, number>();
  const plannedRecipeCounts = new Map<string, number>();
  const pickedTodayRecipeIds = new Set<string>();
  const pickedTodayCategories = new Set<RecipeCategory>();
  let persianCountSoFar = 0;

  for (const m of plan) {
    if (m.id === currentMeal.id) continue;
    const r = recipeMap.get(m.recipeId);
    if (!r) continue;
    if (m.dayIndex === currentMeal.dayIndex) {
      pickedTodayRecipeIds.add(r.id);
      pickedTodayCategories.add(r.category);
    }
    plannedRecipeCounts.set(r.id, (plannedRecipeCounts.get(r.id) ?? 0) + 1);
    if (r.cuisine === 'ایرانی') persianCountSoFar += 1;
    const scale = m.servings / Math.max(1, r.baseServings);
    for (const ing of r.ingredients) {
      if (!ing.isStaple) {
        otherPlanIngredients.add(ing.code);
        otherIngredientUsage.set(
          ing.code,
          (otherIngredientUsage.get(ing.code) ?? 0) + ing.amount * scale
        );
      }
    }
  }

  const pantryIds = new Set(pantry.filter((p) => p.inStock).map((p) => p.ingredientId));
  const tasteProfile = inferTasteProfile(catalog, ratings);

  return catalog
    .filter((r) => r.id !== currentMeal.recipeId)
    .map((recipe) => {
      const scored = scoreRecipeForSlot(recipe, {
        dayIndex: currentMeal.dayIndex,
        slot: currentMeal.slot,
        prefs,
        pantryIds,
        plannedIngredientIds: otherPlanIngredients,
        plannedIngredientUsage: otherIngredientUsage,
        plannedRecipeCounts,
        pickedTodayRecipeIds,
        pickedTodayCategories,
        ratings,
        tasteProfile,
        plannedCountSoFar: Math.max(1, plan.length - 1),
        persianCountSoFar,
        totalMealsInWeek: Math.max(1, plan.length),
      });
      if (!scored.eligible) return null;

      const newCost = getRecipeConsumptionCostForServings(recipe, currentMeal.servings);
      const sharedIngredientsCount = recipe.ingredients.filter(
        (i) => !i.isStaple && otherPlanIngredients.has(i.code)
      ).length;

      return {
        recipe,
        deltaConsumptionCostToman: newCost - currentCost,
        sharedIngredientsCount,
        matchScore: scored.normalizedScore,
        matchReasons: scored.matchReasons,
      };
    })
    .filter((c): c is SwapCandidate => c !== null)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 14);
}

/**
 * Matches all 250 dishes against detected + manually added canonical ING_* fridge ingredients.
 */
export function matchRecipesByIngredients(
  catalog: Recipe[],
  availableIngredientCodes: string[],
  prefs?: UserPreferences
): FridgeMatchResult[] {
  const available = new Set(availableIngredientCodes);
  if (available.size === 0) return [];

  const results: FridgeMatchResult[] = [];

  for (const recipe of catalog) {
    if (prefs) {
      const gate = checkRecipeEligibility(recipe, prefs);
      if (!gate.eligible) continue;
    }

    const nonStaples = recipe.ingredients.filter((i) => !i.isStaple);
    const pool = nonStaples.length > 0 ? nonStaples : recipe.ingredients;
    const matched = pool.filter((i) => available.has(i.code));
    if (matched.length === 0) continue;

    const missing = pool.filter((i) => !available.has(i.code));
    const missingEstimatedCostToman = missing.reduce(
      (sum, ing) => sum + ing.consumptionCostToman,
      0
    );
    const coveragePercent = Math.round((matched.length / pool.length) * 100);

    const matchType: FridgeMatchResult['matchType'] =
      missing.length === 0
        ? 'exact'
        : missing.length === 1
          ? 'missing_1'
          : missing.length === 2
            ? 'missing_2'
            : 'partial';

    results.push({
      recipe,
      matchedCount: matched.length,
      totalNonStapleCount: pool.length,
      coveragePercent,
      missingIngredients: missing,
      missingEstimatedCostToman,
      matchType,
    });
  }

  return results.sort((a, b) => {
    if (a.missingIngredients.length !== b.missingIngredients.length) {
      return a.missingIngredients.length - b.missingIngredients.length;
    }
    if (b.coveragePercent !== a.coveragePercent) {
      return b.coveragePercent - a.coveragePercent;
    }
    return b.matchedCount - a.matchedCount;
  });
}

/**
 * STAGE 6 — Advanced Search, Filter & Smart Sorting across all 250 dishes
 */
export function searchRecipes(
  catalog: Recipe[],
  query: string,
  options?: {
    cuisine?: 'همه' | CuisineType;
    label?: string;
    mealSlot?: 'همه' | MealSlotType;
    maxMinutes?: number | null;
    maxCostToman?: number | null;
    pantryIds?: Set<string>;
    onlyPantryFriendly?: boolean;
    sortBy?: CookbookSortOption;
    prefs?: UserPreferences;
    ratings?: Record<string, 'up' | 'down'>;
  }
): Recipe[] {
  const q = query.trim().toLowerCase();
  const cuisine = options?.cuisine ?? 'همه';
  const label = options?.label ?? 'همه';
  const mealSlot = options?.mealSlot ?? 'همه';
  const maxMinutes = options?.maxMinutes ?? null;
  const maxCostToman = options?.maxCostToman ?? null;
  const pantryIds = options?.pantryIds;

  const filtered = catalog.filter((r) => {
    if (cuisine !== 'همه' && r.cuisine !== cuisine) return false;
    if (label !== 'همه' && !r.tags.includes(label)) return false;
    if (mealSlot !== 'همه' && !r.mealTypes.includes(mealSlot)) return false;
    if (maxMinutes && r.prepMinutes + r.cookMinutes > maxMinutes) return false;
    if (maxCostToman && r.costPerServingToman > maxCostToman) return false;

    if (options?.onlyPantryFriendly && pantryIds && pantryIds.size > 0) {
      const nonStaples = r.ingredients.filter((i) => !i.isStaple);
      const matched = nonStaples.filter((i) => pantryIds.has(i.code)).length;
      if (nonStaples.length > 0 && matched / nonStaples.length < 0.35) return false;
    }

    if (!q) return true;

    const hay = [
      r.title,
      r.titleEn,
      r.subtitle,
      r.cuisine,
      r.category,
      ...r.tags,
      ...r.searchAliases,
      ...r.ingredients.map((i) => `${i.name} ${i.nameEn ?? ''} ${i.code}`),
    ]
      .join(' ')
      .toLowerCase();

    return hay.includes(q);
  });

  const sortBy = options?.sortBy;
  if (!sortBy) return filtered;

  const copy = [...filtered];
  switch (sortBy) {
    case 'fastest':
      return copy.sort(
        (a, b) => a.prepMinutes + a.cookMinutes - (b.prepMinutes + b.cookMinutes)
      );
    case 'cheapest':
      return copy.sort((a, b) => a.costPerServingToman - b.costPerServingToman);
    case 'highest_protein':
      return copy.sort((a, b) => b.proteinG - a.proteinG);
    case 'lowest_cal':
      return copy.sort((a, b) => a.caloriesPerServing - b.caloriesPerServing);
    case 'pantry_match': {
      const scorePantry = (r: Recipe) => {
        if (!pantryIds || pantryIds.size === 0) return 0;
        const pool = r.ingredients.filter((i) => !i.isStaple);
        if (pool.length === 0) return 1;
        return pool.filter((i) => pantryIds.has(i.code)).length / pool.length;
      };
      return copy.sort((a, b) => scorePantry(b) - scorePantry(a));
    }
    case 'recommended':
    default: {
      if (!options?.prefs) return copy;
      const taste = inferTasteProfile(catalog, options.ratings);
      const scoreRec = (r: Recipe) => {
        const res = scoreRecipeForSlot(r, {
          dayIndex: 2,
          slot: r.mealTypes[0] ?? 'lunch',
          prefs: options.prefs!,
          pantryIds: pantryIds ?? new Set(),
          plannedIngredientIds: new Set(),
          plannedRecipeCounts: new Map(),
          pickedTodayRecipeIds: new Set(),
          ratings: options.ratings ?? {},
          tasteProfile: taste,
          plannedCountSoFar: 0,
          persianCountSoFar: 0,
          totalMealsInWeek: 14,
        });
        return res.eligible ? res.score : -500;
      };
      return copy.sort((a, b) => scoreRec(b) - scoreRec(a));
    }
  }
}

/**
 * Formats a recipe step template by substituting {0}, {1} tokens with scaled quantities.
 */
export function formatScaledStepSegments(
  recipe: Recipe,
  stepIndex: number,
  servings: number
): Array<{ text: string; isHighlight: boolean }> {
  const step = recipe.steps[stepIndex];
  if (!step) return [];

  const ratio = servings / Math.max(1, recipe.baseServings);
  const template = step.template;
  const ids = step.ingredientIds ?? [];

  const segments: Array<{ text: string; isHighlight: boolean }> = [];
  const regex = /\{(\d+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: template.slice(lastIndex, match.index), isHighlight: false });
    }
    const tokenIdx = Number(match[1]);
    const code = ids[tokenIdx];
    const ing = recipe.ingredients.find((i) => i.code === code || i.id === code);
    if (ing) {
      const scaled =
        ing.amount * ratio >= 10
          ? Math.round(ing.amount * ratio)
          : Math.round(ing.amount * ratio * 10) / 10;
      segments.push({
        text: `${scaled} ${ing.unit} ${ing.name}`,
        isHighlight: true,
      });
    } else {
      segments.push({ text: match[0], isHighlight: false });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    segments.push({ text: template.slice(lastIndex), isHighlight: false });
  }

  return segments;
}

export function formatScaledStep(
  recipe: Recipe,
  stepIndex: number,
  servings: number
): string {
  return formatScaledStepSegments(recipe, stepIndex, servings)
    .map((s) => s.text)
    .join('');
}
