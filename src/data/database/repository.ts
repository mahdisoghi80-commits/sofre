import type {
  AllergenId,
  IngredientMasterRecord,
  IngredientSpec,
  OwnerDatabaseOverrides,
  Recipe,
  RecipeMasterRecord,
} from '../../types/sofreh';
import { INGREDIENTS_MASTER } from './ingredients';
import { RECIPES_PERSIAN_A } from './recipesPersianA';
import { RECIPES_PERSIAN_B } from './recipesPersianB';
import { RECIPES_WORLD_A } from './recipesWorldA';
import { RECIPES_WORLD_B } from './recipesWorldB';

export const BUILTIN_RECIPES_MASTER: RecipeMasterRecord[] = [
  ...RECIPES_PERSIAN_A,
  ...RECIPES_PERSIAN_B,
  ...RECIPES_WORLD_A,
  ...RECIPES_WORLD_B,
];

export const EMPTY_OWNER_OVERRIDES: OwnerDatabaseOverrides = {
  ingredientPrices: {},
  customRecipes: [],
  deletedRecipeIds: [],
};

/**
 * Returns the live INGREDIENTS_MASTER map with any Owner Dashboard price updates applied.
 */
export function buildLiveIngredientsMap(
  overrides?: OwnerDatabaseOverrides
): Record<string, IngredientMasterRecord> {
  const priceMap = overrides?.ingredientPrices ?? {};
  const result: Record<string, IngredientMasterRecord> = {};

  for (const ing of INGREDIENTS_MASTER) {
    const custom = priceMap[ing.code];
    result[ing.code] = custom
      ? {
          ...ing,
          unitPriceToman: Math.max(1, Math.round(custom.unitPriceToman)),
          packPriceToman: Math.max(1000, Math.round(custom.packPriceToman)),
        }
      : ing;
  }

  return result;
}

/**
 * Dynamic Auto-Labeling Engine:
 * Automatically computes rich, consistent culinary, macro, speed, dietary, and budget labels
 * from the recipe's live canonical ING_* costs and nutritional profile.
 */
export function computeRecipeLabels(
  master: RecipeMasterRecord,
  costPerServingToman: number,
  derivedAllergens: AllergenId[]
): string[] {
  const labels = new Set<string>(master.baseLabels);
  const totalMinutes = master.prepMinutes + master.cookMinutes;

  // 1. Live Cost / Budget Tier labels (auto-recalculated when ING_* prices change!)
  if (costPerServingToman <= 85000) {
    labels.add('خیلی اقتصادی');
    labels.add('اقتصادی');
  } else if (costPerServingToman <= 145000) {
    labels.add('اقتصادی');
  } else if (costPerServingToman >= 250000) {
    labels.add('مجلسی');
  }

  // 2. Speed labels
  if (totalMinutes <= 20) {
    labels.add('زیر ۲۰ دقیقه');
    labels.add('سریع');
  } else if (totalMinutes <= 30) {
    labels.add('سریع');
  }

  // 3. Macro & Fitness labels
  if (master.proteinG >= 32) {
    labels.add('پروتئین بالا');
  }
  if (master.proteinG >= 36 && master.caloriesPerServing <= 580) {
    labels.add('ورزشی');
  }
  if (master.caloriesPerServing <= 410) {
    labels.add('کم‌کالری');
  }
  if (master.carbsG <= 24) {
    labels.add('کم‌کربوهیدرات');
  }
  if (master.fiberG >= 9) {
    labels.add('فیبر بالا');
  }

  // 4. Dietary & Allergen-free labels
  if (master.diets.includes('vegan')) {
    labels.add('وگان');
    labels.add('گیاهی');
  } else if (master.diets.includes('vegetarian')) {
    labels.add('گیاهی');
  }
  if (!derivedAllergens.includes('gluten')) {
    labels.add('بدون گلوتن');
  }
  if (!derivedAllergens.includes('dairy')) {
    labels.add('بدون لبنیات');
  }

  return Array.from(labels);
}

/**
 * Hydrates a normalized RecipeMasterRecord into a runtime Recipe
 * by resolving every canonical ING_* code against the live price table.
 */
export function hydrateRecipe(
  master: RecipeMasterRecord,
  ingredientsMap: Record<string, IngredientMasterRecord>
): Recipe {
  const allergenSet = new Set<AllergenId>(master.allergens);
  let totalConsumptionCost = 0;

  const ingredients: IngredientSpec[] = master.ingredients.map((usage) => {
    const ingMaster = ingredientsMap[usage.code];
    if (!ingMaster) {
      throw new Error(`Unknown canonical ingredient code "${usage.code}" in recipe "${master.id}"`);
    }

    const consumptionCostToman = Math.max(
      500,
      Math.round((usage.amount * ingMaster.unitPriceToman) / 500) * 500
    );
    totalConsumptionCost += consumptionCostToman;

    if (ingMaster.allergens) {
      for (const a of ingMaster.allergens) allergenSet.add(a);
    }

    return {
      id: ingMaster.code,
      code: ingMaster.code,
      name: ingMaster.nameFa,
      nameEn: ingMaster.nameEn,
      amount: usage.amount,
      unit: ingMaster.unit,
      aisle: ingMaster.aisle,
      consumptionCostToman,
      packSize: ingMaster.packSize,
      packCostToman: ingMaster.packPriceToman,
      isStaple: ingMaster.isStaple,
      perishable: ingMaster.perishable,
      allergens: ingMaster.allergens,
    };
  });

  const costPerServingToman = Math.round(totalConsumptionCost / Math.max(1, master.baseServings));
  const derivedAllergens = Array.from(allergenSet);
  const tags = computeRecipeLabels(master, costPerServingToman, derivedAllergens);

  return {
    id: master.id,
    title: master.title,
    titleEn: master.titleEn,
    subtitle: master.subtitle,
    cuisine: master.cuisine,
    category: master.category,
    mainProtein: master.mainProtein,
    icon: master.icon,
    photoUrl: master.photoUrl,
    mealTypes: master.mealTypes,
    baseServings: master.baseServings,
    prepMinutes: master.prepMinutes,
    cookMinutes: master.cookMinutes,
    caloriesPerServing: master.caloriesPerServing,
    proteinG: master.proteinG,
    carbsG: master.carbsG,
    fatG: master.fatG,
    fiberG: master.fiberG,
    difficulty: master.difficulty,
    diets: master.diets,
    allergens: derivedAllergens,
    requiredAppliances: master.requiredAppliances,
    tags,
    costPerServingToman,
    ingredients,
    steps: master.steps,
    searchAliases: master.searchAliases,
    isCustom: master.isCustom,
  };
}

/**
 * Returns the complete hydrated recipe catalog (250 built-in + custom owner recipes - deleted),
 * dynamically priced with the current INGREDIENTS_MASTER & Owner Overrides.
 */
export function getHydratedCatalog(overrides?: OwnerDatabaseOverrides): {
  ingredients: IngredientMasterRecord[];
  ingredientsMap: Record<string, IngredientMasterRecord>;
  recipes: Recipe[];
} {
  const ingredientsMap = buildLiveIngredientsMap(overrides);
  const deletedSet = new Set(overrides?.deletedRecipeIds ?? []);
  const customMap = new Map<string, RecipeMasterRecord>();

  for (const r of overrides?.customRecipes ?? []) {
    customMap.set(r.id, r);
  }

  const mergedMasters: RecipeMasterRecord[] = [];
  for (const r of BUILTIN_RECIPES_MASTER) {
    if (deletedSet.has(r.id)) continue;
    mergedMasters.push(customMap.get(r.id) ?? r);
    customMap.delete(r.id);
  }
  // Append newly added custom recipes from owner dashboard
  for (const customRecipe of customMap.values()) {
    if (!deletedSet.has(customRecipe.id)) {
      mergedMasters.push(customRecipe);
    }
  }

  return {
    ingredients: Object.values(ingredientsMap),
    ingredientsMap,
    recipes: mergedMasters.map((m) => hydrateRecipe(m, ingredientsMap)),
  };
}

/**
 * Generates the complete, clean, structured Master Database Markdown Document
 * covering all canonical ING_* ingredient codes + all 250 recipes with macros, labels,
 * live prices, and level-by-level step-by-step instructions with timer counts.
 */
export function buildMasterMarkdownDocument(overrides?: OwnerDatabaseOverrides): string {
  const { ingredients, recipes } = getHydratedCatalog(overrides);
  const persianCount = recipes.filter((r) => r.cuisine === 'ایرانی').length;
  const worldCount = recipes.length - persianCount;

  const lines: string[] = [
    '# سفره (Sofreh) — پایگاه‌داده جامع ۲۵۰ غذای ایرانی و بین‌المللی',
    '# Sofreh 250-Food Master Culinary, Macro, Pricing & Step-by-Step Database',
    '',
    `> **تعداد کل غذاها:** ${recipes.length} غذا (${persianCount} غذای اصیل ایرانی + ${worldCount} غذای محبوب بین‌المللی)`,
    `> **تعداد کدهای یکتای مواد اولیه (\`ING_*\`):** ${ingredients.length} قلم استانداردسازی‌شده`,
    '> **ویژگی کلیدی معماری:** تمامی دستورها از کدهای یکسان `ING_*` استفاده می‌کنند؛ تغییر قیمت هر کد در جدول مواد اولیه، هزینه تمام ۲۵۰ غذا را به صورت خودکار و لحظه‌ای به‌روزرسانی می‌کند.',
    '',
    '---',
    '',
    '## ۱. جدول کدهای یکتای مواد اولیه (Canonical Ingredient Codes — `ING_*`)',
    '',
    '| کد یکتا (`Code`) | نام فارسی | نام انگلیسی | واحد | قیمت هر واحد (تومان) | اندازه بسته | قیمت بسته (تومان) | بخش فروشگاه | آلرژن‌ها |',
    '|---|---|---|---|---:|---:|---:|---|---|',
  ];

  for (const ing of ingredients) {
    lines.push(
      `| \`${ing.code}\` | ${ing.nameFa} | ${ing.nameEn} | ${ing.unit} | ${ing.unitPriceToman.toLocaleString('en-US')} | ${ing.packSize} ${ing.unit} | ${ing.packPriceToman.toLocaleString('en-US')} | ${ing.aisle} | ${ing.allergens?.join(', ') || '—'} |`
    );
  }

  lines.push(
    '',
    '---',
    '',
    '## ۲. فهرست جامع و دستور پخت مرحله‌به‌مرحله ۲۵۰ غذا',
    ''
  );

  recipes.forEach((recipe, index) => {
    const totalMin = recipe.prepMinutes + recipe.cookMinutes;
    lines.push(`### ${index + 1}. ${recipe.title} (${recipe.titleEn})`);
    lines.push(
      `- **کد غذا:** \`${recipe.id}\` | **آشپزی:** ${recipe.cuisine} | **دسته:** ${recipe.category} | **سختی:** ${recipe.difficulty}`
    );
    lines.push(
      `- **ماکرو (هر پرس):** ${recipe.caloriesPerServing} kcal | پروتئین: ${recipe.proteinG}g | کربوهیدرات: ${recipe.carbsG}g | چربی: ${recipe.fatG}g | فیبر: ${recipe.fiberG}g`
    );
    lines.push(
      `- **زمان کل:** ${totalMin} دقیقه (آماده‌سازی ${recipe.prepMinutes} + پخت ${recipe.cookMinutes}) | **هزینه تخمینی هر پرس:** ${recipe.costPerServingToman.toLocaleString('en-US')} تومان`
    );
    lines.push(`- **برچسب‌های هوشمند:** ${recipe.tags.map((t) => `\`${t}\``).join(' ')}`);
    lines.push(
      `- **وسایل مورد نیاز:** ${recipe.requiredAppliances.join(', ')} | **آلرژن‌ها:** ${recipe.allergens.length > 0 ? recipe.allergens.join(', ') : 'ندارد'}`
    );
    lines.push(`- **مواد اولیه (برای ${recipe.baseServings} نفر — با کد یکتا):**`);
    for (const ing of recipe.ingredients) {
      lines.push(
        `  - \`${ing.code}\` — ${ing.name}: **${ing.amount} ${ing.unit}** (${ing.consumptionCostToman.toLocaleString('en-US')} تومان)`
      );
    }
    lines.push('- **مراحل پخت مرحله‌به‌مرحله (همراه با تایمر):**');
    recipe.steps.forEach((step, sIdx) => {
      let text = step.template;
      if (step.ingredientIds) {
        step.ingredientIds.forEach((code, tokenIdx) => {
          const found = recipe.ingredients.find((i) => i.code === code);
          const label = found ? `${found.amount} ${found.unit} ${found.name} [\`${code}\`]` : code;
          text = text.replace(`{${tokenIdx}}`, label);
        });
      }
      const timerTag = step.timerSeconds
        ? ` ⏱️ **[تایمر: ${Math.round(step.timerSeconds / 60)} دقیقه / ${step.timerSeconds} ثانیه]**`
        : '';
      lines.push(`  ${sIdx + 1}. ${text}${timerTag}`);
      if (step.tip) {
        lines.push(`     - *نکته سرآشپز:* ${step.tip}`);
      }
    });
    lines.push('');
  });

  return lines.join('\n');
}

export function buildMasterJsonExport(overrides?: OwnerDatabaseOverrides): string {
  const { ingredients, recipes } = getHydratedCatalog(overrides);
  return JSON.stringify(
    {
      schemaVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      stats: {
        totalRecipes: recipes.length,
        persianRecipes: recipes.filter((r) => r.cuisine === 'ایرانی').length,
        internationalRecipes: recipes.filter((r) => r.cuisine !== 'ایرانی').length,
        totalCanonicalIngredients: ingredients.length,
      },
      ingredients,
      recipes,
    },
    null,
    2
  );
}
