import type {
  ConsolidatedGroceryItem,
  CuisineType,
  FridgeMatchResult,
  ManualGroceryItem,
  MealSlotType,
  PantryItem,
  PlanCostSummary,
  PlannedMeal,
  Recipe,
  RecommendationScore,
  SwapCandidate,
  UserPreferences,
} from '../types/sofreh';
import { toPersianDigits } from './format';

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
 * Factor 1: Hard Safety & Feasibility Gate
 * Strictly verifies allergens (recipe + canonical ING_* level), diet, and owned kitchen appliances.
 */
export function checkRecipeEligibility(
  recipe: Recipe,
  prefs: UserPreferences,
  slot?: MealSlotType
): { eligible: boolean; reason?: string } {
  if (slot && !recipe.mealTypes.includes(slot)) {
    return { eligible: false, reason: 'نامناسب برای این وعده' };
  }

  // Strict allergen check on recipe AND every canonical ingredient
  for (const allergen of prefs.allergens) {
    if (recipe.allergens.includes(allergen)) {
      return { eligible: false, reason: `دارای آلرژن ${allergen}` };
    }
    if (recipe.ingredients.some((ing) => ing.allergens?.includes(allergen))) {
      return { eligible: false, reason: `دارای ماده حساسیت‌زا (${allergen})` };
    }
  }

  // Strict diet compliance
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
  if (prefs.diet === 'mediterranean' && !recipe.diets.includes('mediterranean') && recipe.cuisine !== 'ایرانی' && recipe.cuisine !== 'مدیترانه‌ای') {
    return { eligible: false, reason: 'خارج از الگوی مدیترانه‌ای' };
  }

  // Strict kitchen appliance ownership check
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

export interface ScoringContext {
  dayIndex: number;
  slot: MealSlotType;
  prefs: UserPreferences;
  pantryIds: Set<string>;
  plannedIngredientIds: Set<string>;
  plannedRecipeCounts: Map<string, number>;
  pickedTodayRecipeIds: Set<string>;
  previousSlotProtein?: string;
  previousDaySlotProtein?: string;
  previousCategory?: string;
  ratings: Record<string, 'up' | 'down'>;
  savedRecipeIds?: Set<string>;
  plannedCountSoFar: number;
  persianCountSoFar: number;
  totalMealsInWeek: number;
}

/**
 * 10-Factor Culinary Intelligence Scorer
 * Evaluates each candidate recipe across budget, waste-overlap, macros, weekday/weekend rhythm,
 * cuisine mix, protein diversity, and user taste memory, emitting human-readable Persian matchReasons.
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
  const targetMealBudget =
    ctx.prefs.weeklyBudgetToman / Math.max(1, ctx.totalMealsInWeek);

  // Factor 2: Budget Fit Curve
  const budgetRatio = mealCost / Math.max(1, targetMealBudget);
  const budgetWeight = ctx.prefs.goals.includes('budget') ? 1.6 : 1.0;
  if (budgetRatio <= 0.8) {
    score += 22 * budgetWeight;
    reasonCandidates.push({ priority: 90 * budgetWeight, text: 'اقتصادی و داخل بودجه' });
  } else if (budgetRatio <= 1.08) {
    score += 12 * budgetWeight;
  } else if (budgetRatio <= 1.35) {
    score -= 10 * budgetWeight;
  } else {
    score -= 26 * budgetWeight;
  }

  // Factor 3: Anti-Waste & Perishable Canonical ING_* Overlap
  const nonStaples = recipe.ingredients.filter((i) => !i.isStaple);
  let pantryMatches = 0;
  let weeklySharedPerishables = 0;
  for (const ing of nonStaples) {
    if (ctx.pantryIds.has(ing.code)) pantryMatches += 1;
    if (ctx.plannedIngredientIds.has(ing.code)) {
      weeklySharedPerishables += ing.perishable ? 1.5 : 0.8;
    }
  }
  const wasteWeight = ctx.prefs.goals.includes('nowaste') ? 1.7 : 1.0;
  const overlapScore = pantryMatches * 7 + weeklySharedPerishables * 6;
  score += Math.min(34, overlapScore * wasteWeight);
  if (pantryMatches >= 2) {
    reasonCandidates.push({
      priority: 88 * wasteWeight,
      text: `${toPersianDigits(pantryMatches)} قلم آن را در خانه دارید`,
    });
  } else if (weeklySharedPerishables >= 2) {
    reasonCandidates.push({
      priority: 84 * wasteWeight,
      text: 'همپوشانی مواد هفته (ضداسراف)',
    });
  }

  // Factor 4: Protein Alignment
  const slotShare =
    ctx.slot === 'breakfast' ? 0.26 : ctx.slot === 'lunch' ? 0.4 : 0.34;
  const targetProtein = Math.max(15, ctx.prefs.dailyProteinTarget * slotShare);
  const proteinWeight =
    ctx.prefs.diet === 'high_protein' || ctx.prefs.goals.includes('healthy')
      ? 1.5
      : 1.0;
  if (recipe.proteinG >= targetProtein) {
    score += 18 * proteinWeight;
    if (recipe.proteinG >= 34) {
      reasonCandidates.push({
        priority: 82 * proteinWeight,
        text: `پروتئین بالا (${toPersianDigits(recipe.proteinG)} گرم)`,
      });
    }
  } else if (recipe.proteinG >= targetProtein * 0.75) {
    score += 8 * proteinWeight;
  } else {
    score -= 6 * proteinWeight;
  }

  // Factor 5: Calorie Alignment
  const targetCal = ctx.prefs.dailyCalorieTarget * slotShare;
  const calDiff = Math.abs(recipe.caloriesPerServing - targetCal);
  const calWeight = ctx.prefs.goals.includes('calories') ? 1.6 : 1.0;
  if (calDiff <= 90) {
    score += 16 * calWeight;
    if (ctx.prefs.goals.includes('calories')) {
      reasonCandidates.push({ priority: 80, text: 'متناسب با کالری روزانه' });
    }
  } else if (calDiff <= 170) {
    score += 6 * calWeight;
  } else {
    score -= Math.min(18, (calDiff - 170) / 18) * calWeight;
  }

  // Factor 6: Weekday Speed vs Weekend Slow-Cook Rhythm
  const isWeekend = ctx.dayIndex >= 5;
  const fastWeight = ctx.prefs.goals.includes('fast') ? 1.7 : 1.0;
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
      score -= 14 * fastWeight;
    }
  } else {
    if (recipe.difficulty === 'مجلسی' || recipe.tags.includes('مجلسی') || totalTime >= 50) {
      const cookBoost = ctx.prefs.goals.includes('cook') ? 22 : 13;
      score += cookBoost;
      reasonCandidates.push({ priority: 78, text: 'مجلسی و ویژه آخر هفته' });
    }
  }

  // Factor 7: Persian vs International Cuisine Mix Controller (supports continuous 0..100 slider)
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
  const isPersian = recipe.cuisine === 'ایرانی';

  if (targetPersianRatio >= 0.95) {
    score += isPersian ? 34 : -42;
  } else if (targetPersianRatio <= 0.05) {
    score += !isPersian ? 34 : -42;
  } else if (isPersian && currentPersianRatio < targetPersianRatio) {
    score += 18;
    if (targetPersianRatio >= 0.7) {
      reasonCandidates.push({ priority: 64, text: 'سفره اصیل ایرانی' });
    }
  } else if (!isPersian && currentPersianRatio > targetPersianRatio) {
    score += 18;
    reasonCandidates.push({ priority: 66, text: `تنوع ${recipe.cuisine}` });
  } else if (isPersian && currentPersianRatio > targetPersianRatio + 0.14) {
    score -= 14;
  } else if (!isPersian && currentPersianRatio < targetPersianRatio - 0.14) {
    score -= 14;
  }

  // Factor 8: Main-Protein, Category & Repeat Diversity Guard
  if (ctx.pickedTodayRecipeIds.has(recipe.id)) {
    score -= 500;
  }
  const weeklyCount = ctx.plannedRecipeCounts.get(recipe.id) ?? 0;
  if (weeklyCount > 0) {
    score -= weeklyCount * 170;
  }
  if (ctx.previousSlotProtein && recipe.mainProtein === ctx.previousSlotProtein) {
    score -= 22;
  }
  if (ctx.previousDaySlotProtein && recipe.mainProtein === ctx.previousDaySlotProtein) {
    score -= 14;
  }
  if (ctx.previousCategory && recipe.category === ctx.previousCategory) {
    score -= 8;
  }

  // Factor 9: Taste Memory (Ratings & Saved Cookbooks)
  const rating = ctx.ratings[recipe.id];
  if (rating === 'up') {
    score += 32;
    reasonCandidates.push({ priority: 95, text: 'بر اساس پسند شما' });
  } else if (rating === 'down') {
    score -= 140;
  }
  if (ctx.savedRecipeIds?.has(recipe.id)) {
    score += 12;
  }

  // Subtle deterministic variety tie-breaker (no Math.random so unit tests stay 100% deterministic!)
  const hash =
    recipe.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 7;
  score += ((hash + ctx.dayIndex * 3) % 7) * 0.4;

  // Factor 10: Extract top 2 concise Persian reasons
  reasonCandidates.sort((a, b) => b.priority - a.priority);
  const matchReasons = Array.from(
    new Set(reasonCandidates.map((r) => r.text))
  ).slice(0, 2);
  if (matchReasons.length === 0) {
    matchReasons.push(recipe.tags[0] ?? 'پیشنهاد متعادل سفره');
  }

  const normalizedScore = Math.max(
    45,
    Math.min(99, Math.round(52 + (score - 45) * 0.52))
  );

  return {
    score,
    normalizedScore,
    matchReasons,
    eligible: true,
  };
}

/**
 * Generates a full 7-day personalized weekly plan using the 10-Factor Culinary Intelligence Engine.
 */
export function generateWeeklyPlan(
  catalog: Recipe[],
  prefs: UserPreferences,
  pantry: PantryItem[],
  ratings: Record<string, 'up' | 'down'> = {},
  savedRecipeIds: Set<string> = new Set()
): PlannedMeal[] {
  const pantryIds = new Set(pantry.filter((p) => p.inStock).map((p) => p.ingredientId));
  const plannedIngredientIds = new Set<string>();
  const plannedRecipeCounts = new Map<string, number>();
  const lastDaySlotProtein: Partial<Record<MealSlotType, string>> = {};
  const lastDaySlotCategory: Partial<Record<MealSlotType, string>> = {};

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

  for (const dayIndex of selectedDayIndices) {
    const pickedTodayRecipeIds = new Set<string>();
    let previousSlotProtein: string | undefined;

    for (const slot of slots) {
      let candidates = catalog
        .map((recipe) => ({
          recipe,
          result: scoreRecipeForSlot(recipe, {
            dayIndex,
            slot,
            prefs,
            pantryIds,
            plannedIngredientIds,
            plannedRecipeCounts,
            pickedTodayRecipeIds,
            previousSlotProtein,
            previousDaySlotProtein: lastDaySlotProtein[slot],
            previousCategory: lastDaySlotCategory[slot],
            ratings,
            savedRecipeIds,
            plannedCountSoFar: plan.length,
            persianCountSoFar,
            totalMealsInWeek,
          }),
        }))
        .filter((item) => item.result.eligible);

      // Graceful fallback if extreme filters eliminate all candidates for a specific slot
      if (candidates.length === 0) {
        const relaxedPrefs: UserPreferences = {
          ...prefs,
          appliances: [],
          diet: prefs.diet === 'vegan' || prefs.diet === 'vegetarian' ? prefs.diet : 'omnivore',
        };
        candidates = catalog
          .map((recipe) => ({
            recipe,
            result: scoreRecipeForSlot(recipe, {
              dayIndex,
              slot,
              prefs: relaxedPrefs,
              pantryIds,
              plannedIngredientIds,
              plannedRecipeCounts,
              pickedTodayRecipeIds,
              previousSlotProtein,
              previousDaySlotProtein: lastDaySlotProtein[slot],
              previousCategory: lastDaySlotCategory[slot],
              ratings,
              savedRecipeIds,
              plannedCountSoFar: plan.length,
              persianCountSoFar,
              totalMealsInWeek,
            }),
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
      previousSlotProtein = chosen.recipe.mainProtein;
      lastDaySlotProtein[slot] = chosen.recipe.mainProtein;
      lastDaySlotCategory[slot] = chosen.recipe.category;
      plannedRecipeCounts.set(
        chosen.recipe.id,
        (plannedRecipeCounts.get(chosen.recipe.id) ?? 0) + 1
      );
      if (chosen.recipe.cuisine === 'ایرانی') persianCountSoFar += 1;

      for (const ing of chosen.recipe.ingredients) {
        if (!ing.isStaple) plannedIngredientIds.add(ing.code);
      }
    }
  }

  return plan;
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
      packLabel: `${packsNeeded} بسته (${entry.packSize} ${entry.unit})`,
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
      ingredientId: `manual-${m.id}`,
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
 * Returns ranked Swap Candidates powered by the 10-Factor Engine with delta cost & matchReasons.
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
  const plannedRecipeCounts = new Map<string, number>();
  const pickedTodayRecipeIds = new Set<string>();
  let persianCountSoFar = 0;

  for (const m of plan) {
    if (m.id === currentMeal.id) continue;
    const r = recipeMap.get(m.recipeId);
    if (!r) continue;
    if (m.dayIndex === currentMeal.dayIndex) pickedTodayRecipeIds.add(r.id);
    plannedRecipeCounts.set(r.id, (plannedRecipeCounts.get(r.id) ?? 0) + 1);
    if (r.cuisine === 'ایرانی') persianCountSoFar += 1;
    for (const ing of r.ingredients) {
      if (!ing.isStaple) otherPlanIngredients.add(ing.code);
    }
  }

  const pantryIds = new Set(pantry.filter((p) => p.inStock).map((p) => p.ingredientId));

  return catalog
    .filter((r) => r.id !== currentMeal.recipeId)
    .map((recipe) => {
      const scored = scoreRecipeForSlot(recipe, {
        dayIndex: currentMeal.dayIndex,
        slot: currentMeal.slot,
        prefs,
        pantryIds,
        plannedIngredientIds: otherPlanIngredients,
        plannedRecipeCounts,
        pickedTodayRecipeIds,
        ratings,
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
    .slice(0, 12);
}

/**
 * Matches all 250 dishes against detected + manually added canonical ING_* fridge ingredients.
 * Returns exact matches, missing 1 item, missing 2 items, and top partial matches with missing cost.
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
 * Searches across all 250 Persian + International recipes by query (Persian, English, Finglish, ING_* name),
 * Cuisine filter, and Smart Auto-Label filter.
 */
export function searchRecipes(
  catalog: Recipe[],
  query: string,
  options?: {
    cuisine?: 'همه' | CuisineType;
    label?: string;
    mealSlot?: 'همه' | MealSlotType;
  }
): Recipe[] {
  const q = query.trim().toLowerCase();
  const cuisine = options?.cuisine ?? 'همه';
  const label = options?.label ?? 'همه';
  const mealSlot = options?.mealSlot ?? 'همه';

  return catalog.filter((r) => {
    if (cuisine !== 'همه' && r.cuisine !== cuisine) return false;
    if (label !== 'همه' && !r.tags.includes(label)) return false;
    if (mealSlot !== 'همه' && !r.mealTypes.includes(mealSlot)) return false;

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
}

/**
 * Formats a recipe step template by substituting {0}, {1} tokens with scaled quantities.
 * Returns structured segments so Cook Mode can render coral highlighted quantity pills (.big b)!
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
