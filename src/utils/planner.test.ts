import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { RECIPES_CATALOG } from '../data/catalog';
import { INGREDIENTS_MASTER } from '../data/database/ingredients';
import {
  EMPTY_OWNER_OVERRIDES,
  getHydratedCatalog,
} from '../data/database/repository';
import type { PantryItem, UserPreferences } from '../types/sofreh';
import { mergeLivePricesWithOverrides } from './livePricing';
import {
  buildConsolidatedGroceryList,
  buildWeeklyPrepInsights,
  computeMinimumWeeklyBudget,
  formatScaledStep,
  formatScaledStepSegments,
  generateWeeklyPlan,
  getSwapCandidates,
  inferTasteProfile,
  matchRecipesByIngredients,
  searchRecipes,
} from './planner';
import { getIngredientIconPath } from '../data/database/ingredientIcons';

const BASE_PREFS: UserPreferences = {
  name: 'آرش',
  goals: ['budget', 'nowaste', 'healthy'],
  servings: 2,
  cookingDaysPerWeek: 7,
  activeMealSlots: ['breakfast', 'lunch', 'dinner'],
  diet: 'omnivore',
  cuisinePreference: 'balanced',
  allergens: [],
  appliances: ['stovetop', 'oven', 'pressure_cooker', 'airfryer', 'microwave', 'blender', 'grill'],
  weeklyBudgetToman: 2800000,
  dailyCalorieTarget: 2050,
  dailyProteinTarget: 95,
  remindersEnabled: true,
  reminderTime: '18:00',
  householdCode: 'SF-4821',
};

test('database has exactly 250 unique hydrated recipes (125 Persian + 125 International) using canonical ING_* codes', () => {
  assert.equal(RECIPES_CATALOG.length, 250);
  const persian = RECIPES_CATALOG.filter((r) => r.cuisine === 'ایرانی');
  const world = RECIPES_CATALOG.filter((r) => r.cuisine !== 'ایرانی');
  assert.equal(persian.length, 125);
  assert.equal(world.length, 125);
  assert.ok(INGREDIENTS_MASTER.length >= 130);

  for (const r of RECIPES_CATALOG) {
    assert.ok(r.costPerServingToman > 0, `Recipe ${r.id} should have positive price`);
    assert.ok(r.tags.length > 0, `Recipe ${r.id} should have computed smart labels`);
    assert.ok(r.photoUrl.length > 5, `Recipe ${r.id} should have a photo URL`);
    for (const ing of r.ingredients) {
      assert.ok(ing.code.startsWith('ING_'), `Ingredient ${ing.code} must be canonical ING_*`);
    }
  }
});

test('updating a single canonical ING_* ingredient price dynamically recalculates every recipe using it', () => {
  const before = getHydratedCatalog(EMPTY_OWNER_OVERRIDES).recipes.find(
    (r) => r.id === 'joojeh-kabab-zaferani'
  )!;

  const after = getHydratedCatalog({
    ingredientPrices: {
      ING_CHICKEN_BREAST: { unitPriceToman: 500, packPriceToman: 500000 }, // doubled
    },
    customRecipes: [],
    deletedRecipeIds: [],
  }).recipes.find((r) => r.id === 'joojeh-kabab-zaferani')!;

  assert.ok(
    after.costPerServingToman > before.costPerServingToman,
    'Doubling ING_CHICKEN_BREAST must raise Joojeh Kabab cost per serving'
  );
});

test('10-factor planner strictly excludes seafood, dairy, and nut allergens at canonical ING_* level', () => {
  const restrictedPrefs: UserPreferences = {
    ...BASE_PREFS,
    allergens: ['dairy', 'nuts', 'seafood'],
  };
  const plan = generateWeeklyPlan(RECIPES_CATALOG, restrictedPrefs, []);
  assert.equal(plan.length, 21);

  for (const meal of plan) {
    const recipe = RECIPES_CATALOG.find((r) => r.id === meal.recipeId)!;
    assert.ok(!recipe.allergens.includes('dairy'), `${recipe.id} leaked dairy`);
    assert.ok(!recipe.allergens.includes('nuts'), `${recipe.id} leaked nuts`);
    assert.ok(!recipe.allergens.includes('seafood'), `${recipe.id} leaked seafood`);
    assert.ok(meal.matchReasons && meal.matchReasons.length > 0, 'Must emit Persian matchReasons');
    assert.ok((meal.matchScore ?? 0) >= 45, 'Must emit normalized matchScore');
  }
});

test('planner strictly respects interactive kitchen appliances (e.g. stovetop-only excludes oven/airfryer/blender)', () => {
  const stovetopOnly: UserPreferences = {
    ...BASE_PREFS,
    appliances: ['stovetop'],
  };
  const plan = generateWeeklyPlan(RECIPES_CATALOG, stovetopOnly, []);
  for (const meal of plan) {
    const recipe = RECIPES_CATALOG.find((r) => r.id === meal.recipeId)!;
    assert.ok(
      recipe.requiredAppliances.every((a) => a === 'stovetop'),
      `Recipe ${recipe.id} requires ${recipe.requiredAppliances.join(',')} not owned`
    );
  }
});

test('planner obeys vegan diet strictly across all 21 meals', () => {
  const veganPrefs: UserPreferences = {
    ...BASE_PREFS,
    diet: 'vegan',
    activeMealSlots: ['lunch', 'dinner'],
  };
  const plan = generateWeeklyPlan(RECIPES_CATALOG, veganPrefs, []);
  assert.equal(plan.length, 14);
  for (const meal of plan) {
    const recipe = RECIPES_CATALOG.find((r) => r.id === meal.recipeId)!;
    assert.ok(recipe.diets.includes('vegan'), `Non-vegan recipe ${recipe.id} selected`);
  }
});

test('planner avoids same-day duplicates and steers cuisinePreference ratio accurately', () => {
  const persianHeavy = generateWeeklyPlan(
    RECIPES_CATALOG,
    { ...BASE_PREFS, cuisinePreference: 'mostly_persian', activeMealSlots: ['lunch', 'dinner'] },
    []
  );
  const globalHeavy = generateWeeklyPlan(
    RECIPES_CATALOG,
    { ...BASE_PREFS, cuisinePreference: 'global_explorer', activeMealSlots: ['lunch', 'dinner'] },
    []
  );

  // Check zero same-day duplicates
  for (let d = 0; d < 7; d++) {
    const dayIds = persianHeavy.filter((m) => m.dayIndex === d).map((m) => m.recipeId);
    assert.equal(new Set(dayIds).size, dayIds.length, `Duplicate on day ${d}`);
  }

  const persianCountInMostly = persianHeavy.filter(
    (m) => RECIPES_CATALOG.find((r) => r.id === m.recipeId)?.cuisine === 'ایرانی'
  ).length;
  const persianCountInGlobal = globalHeavy.filter(
    (m) => RECIPES_CATALOG.find((r) => r.id === m.recipeId)?.cuisine === 'ایرانی'
  ).length;

  assert.ok(
    persianCountInMostly > persianCountInGlobal,
    `Expected mostly_persian (${persianCountInMostly}) > global_explorer (${persianCountInGlobal})`
  );
});

test('dual-cost grocery consolidation aggregates identical ING_* codes across Persian & International meals', () => {
  const plan = [
    { id: 'm1', dayIndex: 0, slot: 'lunch' as const, recipeId: 'joojeh-kabab-zaferani', servings: 2 },
    { id: 'm2', dayIndex: 0, slot: 'dinner' as const, recipeId: 'pasta-alfredo-chicken', servings: 2 },
  ];
  const pantry: PantryItem[] = [
    { ingredientId: 'ING_ONION', name: 'پیاز زرد', aisle: 'produce', inStock: true },
  ];
  const { items, summary } = buildConsolidatedGroceryList(plan, RECIPES_CATALOG, pantry, {}, []);
  const chickenItem = items.find((i) => i.ingredientId === 'ING_CHICKEN_BREAST');
  assert.ok(chickenItem, 'Canonical ING_CHICKEN_BREAST must be consolidated across Persian & Italian dishes');
  assert.equal(chickenItem.recipeTitles.length, 2);
  assert.equal(chickenItem.totalAmount, 620); // 340g + 280g
  assert.ok(summary.shelfCheckoutCostToman >= summary.consumptionCostToman);
});

test('fridge matcher ranks exact matches first across 250 foods using canonical ING_* codes', () => {
  const matches = matchRecipesByIngredients(RECIPES_CATALOG, [
    'ING_TOMATO',
    'ING_EGG',
    'ING_SANGAK_BREAD',
    'ING_SPINACH',
    'ING_FETA_CHEESE',
  ]);
  assert.ok(matches.length >= 5);
  assert.equal(matches[0].matchType, 'exact');
  assert.equal(matches[0].missingIngredients.length, 0);
});

test('swap candidates return explainable matchReasons and accurate cost deltas', () => {
  const plan = generateWeeklyPlan(RECIPES_CATALOG, BASE_PREFS, []);
  const candidates = getSwapCandidates(plan[1], plan, RECIPES_CATALOG, BASE_PREFS, []);
  assert.ok(candidates.length >= 5);
  assert.ok(candidates[0].matchReasons.length > 0);
  assert.ok(typeof candidates[0].deltaConsumptionCostToman === 'number');
});

test('searchRecipes supports Persian, English, Finglish, cuisine, and auto-label filtering', () => {
  assert.ok(searchRecipes(RECIPES_CATALOG, 'alfredo').some((r) => r.id === 'pasta-alfredo-chicken'));
  assert.ok(searchRecipes(RECIPES_CATALOG, 'قورمه').some((r) => r.id === 'ghormeh-sabzi'));
  const veganFast = searchRecipes(RECIPES_CATALOG, '', { label: 'وگان' });
  assert.ok(veganFast.length >= 15);
  assert.ok(veganFast.every((r) => r.tags.includes('وگان')));
  const mexican = searchRecipes(RECIPES_CATALOG, '', { cuisine: 'مکزیکی' });
  assert.ok(mexican.length >= 10);
});

test('formatScaledStepSegments scales ingredient quantities and flags highlight pills for Cook Mode', () => {
  const ghormeh = RECIPES_CATALOG.find((r) => r.id === 'ghormeh-sabzi')!;
  const segments4 = formatScaledStepSegments(ghormeh, 1, 4);
  assert.ok(segments4.some((s) => s.isHighlight && s.text.includes('500')));
  const full = formatScaledStep(ghormeh, 1, 4);
  assert.ok(full.includes('500'));
});

test('planner schedules meals strictly on user-selected cookingDays calendar indices', () => {
  const plan = generateWeeklyPlan(
    RECIPES_CATALOG,
    { ...BASE_PREFS, cookingDays: [0, 2, 4], cookingDaysPerWeek: 3, activeMealSlots: ['lunch', 'dinner'] },
    []
  );
  assert.equal(plan.length, 6);
  const scheduledDays = Array.from(new Set(plan.map((m) => m.dayIndex))).sort((a, b) => a - b);
  assert.deepEqual(scheduledDays, [0, 2, 4]);
});

test('planner honors continuous persianRatio slider and sub-1M Toman weekly budgets', () => {
  const allPersian = generateWeeklyPlan(
    RECIPES_CATALOG,
    { ...BASE_PREFS, persianRatio: 100, weeklyBudgetToman: 600_000, activeMealSlots: ['lunch'] },
    []
  );
  const allWorld = generateWeeklyPlan(
    RECIPES_CATALOG,
    { ...BASE_PREFS, persianRatio: 0, weeklyBudgetToman: 600_000, activeMealSlots: ['lunch'] },
    []
  );
  const persianCountHigh = allPersian.filter(
    (m) => RECIPES_CATALOG.find((r) => r.id === m.recipeId)?.cuisine === 'ایرانی'
  ).length;
  const persianCountLow = allWorld.filter(
    (m) => RECIPES_CATALOG.find((r) => r.id === m.recipeId)?.cuisine === 'ایرانی'
  ).length;
  assert.ok(persianCountHigh >= 6, `Expected almost all Persian at 100%, got ${persianCountHigh}`);
  assert.ok(persianCountLow <= 1, `Expected almost no Persian at 0%, got ${persianCountLow}`);
});

test('all 250 dishes resolve to rich distinct 3D food icons (>= 40 unique icons) and all 167 ingredients map to transparent 3D PNG icons', () => {
  const uniqueFoodIcons = new Set(RECIPES_CATALOG.map((r) => r.icon));
  assert.ok(
    uniqueFoodIcons.size >= 40,
    `Expected >= 40 distinct 3D food icons across catalog, got ${uniqueFoodIcons.size}`
  );
  for (const ing of INGREDIENTS_MASTER) {
    const iconPath = getIngredientIconPath(ing.code, ing.nameFa);
    assert.ok(
      iconPath.startsWith('/assets/ingredients/') && iconPath.endsWith('.png'),
      `Ingredient ${ing.code} should resolve to transparent PNG icon, got ${iconPath}`
    );
  }
});

test('multi-stage optimizer pulls tight-budget weekly plan under budget without breaking dietary rules', () => {
  const tightPrefs: UserPreferences = {
    ...BASE_PREFS,
    goals: ['budget', 'nowaste'],
    activeMealSlots: ['lunch', 'dinner'],
    weeklyBudgetToman: 1_200_000,
    servings: 2,
  };
  const plan = generateWeeklyPlan(RECIPES_CATALOG, tightPrefs, []);
  const { summary } = buildConsolidatedGroceryList(plan, RECIPES_CATALOG, [], {}, []);
  assert.ok(
    summary.consumptionCostToman <= tightPrefs.weeklyBudgetToman * 1.15,
    `Expected tight-budget plan (${summary.consumptionCostToman}) near budget ${tightPrefs.weeklyBudgetToman}`
  );
});

test('latent taste profile inference learns preferred cuisines & categories from user ratings', () => {
  const profile = inferTasteProfile(
    RECIPES_CATALOG,
    {
      'pasta-alfredo-chicken': 'up',
      'ghormeh-sabzi': 'down',
    },
    new Set(['pasta-aglio-olio'])
  );
  assert.ok((profile.cuisineAffinity['ایتالیایی'] ?? 0) > 0);
  assert.ok((profile.categoryAffinity['پاستا و ایتالیایی'] ?? 0) > 0);
  assert.ok((profile.categoryAffinity['خورشت'] ?? 0) < 0);
});

test('buildWeeklyPrepInsights surfaces legume soaking alerts and shared perishable waste savings', () => {
  const plan = generateWeeklyPlan(RECIPES_CATALOG, BASE_PREFS, []);
  const insights = buildWeeklyPrepInsights(plan, RECIPES_CATALOG);
  assert.ok(insights.weeklyAvgProteinG > 25);
  assert.ok(insights.weeklyAvgCalories > 400);
  assert.ok(Array.isArray(insights.soakingAlerts));
  assert.ok(Array.isArray(insights.batchPrepSuggestions));
});

test('searchRecipes supports multi-mode sorting (fastest, cheapest, highest_protein, lowest_cal)', () => {
  const fastest = searchRecipes(RECIPES_CATALOG, '', { sortBy: 'fastest' });
  assert.ok(
    fastest[0].prepMinutes + fastest[0].cookMinutes <=
      fastest[fastest.length - 1].prepMinutes + fastest[fastest.length - 1].cookMinutes
  );
  const cheapest = searchRecipes(RECIPES_CATALOG, '', { sortBy: 'cheapest' });
  assert.ok(cheapest[0].costPerServingToman <= cheapest[cheapest.length - 1].costPerServingToman);
  const highProtein = searchRecipes(RECIPES_CATALOG, '', { sortBy: 'highest_protein' });
  assert.ok(highProtein[0].proteinG >= highProtein[highProtein.length - 1].proteinG);
  const lowCal = searchRecipes(RECIPES_CATALOG, '', { sortBy: 'lowest_cal' });
  assert.ok(lowCal[0].caloriesPerServing <= lowCal[lowCal.length - 1].caloriesPerServing);
});

test('dislikedIngredients strictly excludes eggplant, milk, and mushroom recipes from weekly plan and swap candidates', () => {
  const dislikedPrefs: UserPreferences = {
    ...BASE_PREFS,
    dislikedIngredients: ['ING_EGGPLANT', 'ING_MILK', 'ING_MUSHROOM'],
    activeMealSlots: ['breakfast', 'lunch', 'dinner'],
  };
  const plan = generateWeeklyPlan(RECIPES_CATALOG, dislikedPrefs, []);
  assert.equal(plan.length, 21);

  for (const meal of plan) {
    const recipe = RECIPES_CATALOG.find((r) => r.id === meal.recipeId)!;
    const ingCodes = recipe.ingredients.map((i) => i.code);
    assert.ok(!ingCodes.includes('ING_EGGPLANT'), `${recipe.id} leaked disliked ING_EGGPLANT`);
    assert.ok(!ingCodes.includes('ING_MILK'), `${recipe.id} leaked disliked ING_MILK`);
    assert.ok(!ingCodes.includes('ING_MUSHROOM'), `${recipe.id} leaked disliked ING_MUSHROOM`);
  }

  const swaps = getSwapCandidates(plan[1], plan, RECIPES_CATALOG, dislikedPrefs, []);
  assert.ok(swaps.length >= 5);
  for (const cand of swaps) {
    const ingCodes = cand.recipe.ingredients.map((i) => i.code);
    assert.ok(!ingCodes.includes('ING_EGGPLANT'), `Swap ${cand.recipe.id} leaked ING_EGGPLANT`);
    assert.ok(!ingCodes.includes('ING_MILK'), `Swap ${cand.recipe.id} leaked ING_MILK`);
    assert.ok(!ingCodes.includes('ING_MUSHROOM'), `Swap ${cand.recipe.id} leaked ING_MUSHROOM`);
  }
});

test('strict budget guarantee never exceeds weeklyBudgetToman under live 2026 Iranian prices', () => {
  const live = JSON.parse(fs.readFileSync('public/prices-live.json', 'utf8'));
  const liveCatalog = getHydratedCatalog(
    mergeLivePricesWithOverrides(live, EMPTY_OWNER_OVERRIDES)
  ).recipes;

  const scenarios: Array<{ label: string; prefs: UserPreferences }> = [
    {
      label: '2ppl x 14 meals at minimum floor',
      prefs: {
        ...BASE_PREFS,
        servings: 2,
        activeMealSlots: ['lunch', 'dinner'],
        cookingDays: [0, 1, 2, 3, 4, 5, 6],
        cookingDaysPerWeek: 7,
      },
    },
    {
      label: '4ppl x 21 meals at minimum floor',
      prefs: {
        ...BASE_PREFS,
        servings: 4,
        activeMealSlots: ['breakfast', 'lunch', 'dinner'],
        cookingDays: [0, 1, 2, 3, 4, 5, 6],
        cookingDaysPerWeek: 7,
      },
    },
    {
      label: '2ppl x 14 meals healthy high-protein at minimum + 400k',
      prefs: {
        ...BASE_PREFS,
        goals: ['healthy', 'budget'],
        diet: 'high_protein',
        servings: 2,
        activeMealSlots: ['lunch', 'dinner'],
      },
    },
  ];

  for (const sc of scenarios) {
    const floor = computeMinimumWeeklyBudget(liveCatalog, sc.prefs);
    const budget = sc.label.includes('+ 400k') ? floor + 400_000 : floor;
    const prefsWithBudget: UserPreferences = { ...sc.prefs, weeklyBudgetToman: budget };
    const plan = generateWeeklyPlan(liveCatalog, prefsWithBudget, []);
    const { summary } = buildConsolidatedGroceryList(plan, liveCatalog, [], {}, []);
    assert.ok(
      summary.consumptionCostToman <= budget,
      `[${sc.label}] Plan cost (${summary.consumptionCostToman}) exceeded budget (${budget})!`
    );
  }
});
