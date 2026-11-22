export type DietType =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'high_protein'
  | 'low_carb'
  | 'mediterranean';

export type AllergenId =
  | 'dairy'
  | 'gluten'
  | 'nuts'
  | 'eggs'
  | 'legumes'
  | 'seafood';

export type ApplianceId =
  | 'stovetop'
  | 'oven'
  | 'pressure_cooker'
  | 'airfryer'
  | 'microwave'
  | 'blender'
  | 'grill';

export type GoalId = 'budget' | 'nowaste' | 'healthy' | 'fast' | 'cook' | 'calories';

export type MealSlotType = 'breakfast' | 'lunch' | 'dinner';

export type CuisineType =
  | 'ایرانی'
  | 'ایتالیایی'
  | 'مدیترانه‌ای'
  | 'آسیایی'
  | 'مکزیکی'
  | 'خاورمیانه'
  | 'بین‌المللی';

export type CuisinePreference = 'mostly_persian' | 'balanced' | 'global_explorer';

export type MainProteinType =
  | 'beef_lamb'
  | 'chicken'
  | 'fish_seafood'
  | 'egg'
  | 'legume_plant'
  | 'dairy_cheese';

export type AisleCategory =
  | 'protein'
  | 'produce'
  | 'dairy'
  | 'pantry'
  | 'bread_grains'
  | 'spices';

export type RecipeCategory =
  | 'خورشت'
  | 'پلو'
  | 'کباب و مرغ'
  | 'آش و سوپ'
  | 'کوکو و خوراک'
  | 'پاستا و ایتالیایی'
  | 'آسیایی و کاری'
  | 'مکزیکی و رپ'
  | 'کاسه سالم و سالاد'
  | 'صبحانه و سریع';

/** Normalized canonical ingredient in the master catalog (coded by ING_*) */
export interface IngredientMasterRecord {
  /** Canonical stable code e.g. ING_CHICKEN_BREAST */
  code: string;
  nameFa: string;
  nameEn: string;
  unit: string;
  /** Exact price per 1 unit (e.g. per 1 gram or per 1 piece) in Toman */
  unitPriceToman: number;
  /** Standard Iranian market pack size in the same unit */
  packSize: number;
  /** Market price of 1 standard pack in Toman */
  packPriceToman: number;
  aisle: AisleCategory;
  isStaple?: boolean;
  /** Perishable produce/herbs/fresh meat prioritized for pack-waste reduction */
  perishable?: boolean;
  allergens?: AllergenId[];
}

export interface IngredientUsage {
  /** References IngredientMasterRecord.code (ING_*) */
  code: string;
  /** Amount required for baseServings */
  amount: number;
}

/** Hydrated ingredient attached to a Recipe with live pricing from INGREDIENTS_MASTER */
export interface IngredientSpec {
  id: string; // canonical ING_* code
  code: string; // canonical ING_* code
  name: string;
  nameEn?: string;
  amount: number; // for baseServings
  unit: string;
  aisle: AisleCategory;
  /** Consumption cost for baseServings in Toman (calculated live from ING_* unitPriceToman) */
  consumptionCostToman: number;
  /** Standard Iranian store pack size in same unit */
  packSize: number;
  /** Shelf/pack cost in Toman for 1 store pack */
  packCostToman: number;
  /** Pantry staple tag — often already at home */
  isStaple?: boolean;
  perishable?: boolean;
  /** Allergens triggered by this ingredient */
  allergens?: AllergenId[];
}

export interface RecipeStep {
  /** Supports {0}, {1} tokens linked to scaled ingredients by ingredientIds (ING_* codes) */
  template: string;
  ingredientIds?: string[];
  timerSeconds?: number;
  tip?: string;
}

/** Normalized database recipe stored in the master table / future owner CMS */
export interface RecipeMasterRecord {
  id: string;
  title: string;
  titleEn: string;
  subtitle: string;
  cuisine: CuisineType;
  category: RecipeCategory;
  mainProtein: MainProteinType;
  /** Generated 3D food icon path */
  icon: string;
  /** High-resolution web dish photo URL for Recipe Detail hero */
  photoUrl: string;
  mealTypes: MealSlotType[];
  baseServings: number;
  prepMinutes: number;
  cookMinutes: number;
  caloriesPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  difficulty: 'آسان' | 'متوسط' | 'مجلسی';
  diets: DietType[];
  allergens: AllergenId[];
  requiredAppliances: ApplianceId[];
  /** Curated editorial labels (merged with dynamic auto-computed labels) */
  baseLabels: string[];
  /** Canonical ING_* ingredient usages */
  ingredients: IngredientUsage[];
  steps: RecipeStep[];
  /** Search keywords including English & Finglish */
  searchAliases: string[];
  isCustom?: boolean;
}

/** Hydrated runtime Recipe with live prices & dynamic smart labels */
export interface Recipe {
  id: string;
  title: string;
  titleEn: string;
  subtitle: string;
  cuisine: CuisineType;
  category: RecipeCategory;
  mainProtein: MainProteinType;
  icon: string;
  photoUrl: string;
  mealTypes: MealSlotType[];
  baseServings: number;
  prepMinutes: number;
  cookMinutes: number;
  caloriesPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  difficulty: 'آسان' | 'متوسط' | 'مجلسی';
  diets: DietType[];
  allergens: AllergenId[];
  requiredAppliances: ApplianceId[];
  /** Combined curated + dynamically computed labels (e.g. اقتصادی، پروتئین بالا، سریع) */
  tags: string[];
  /** Live calculated consumption cost per 1 serving in Toman */
  costPerServingToman: number;
  ingredients: IngredientSpec[];
  steps: RecipeStep[];
  searchAliases: string[];
  isCustom?: boolean;
}

export interface PlannedMeal {
  id: string;
  dayIndex: number; // 0 = شنبه ... 6 = جمعه
  slot: MealSlotType;
  recipeId: string;
  servings: number;
  cooked?: boolean;
  /** Explainable Persian reasons why the recommendation engine picked this meal */
  matchReasons?: string[];
  /** Match quality score (0..100) */
  matchScore?: number;
}

export interface PantryItem {
  ingredientId: string;
  name: string;
  aisle: AisleCategory;
  inStock: boolean;
}

export interface ManualGroceryItem {
  id: string;
  name: string;
  amountLabel: string;
  aisle: AisleCategory;
  estimatedCostToman: number;
  checked: boolean;
  ingredientCode?: string;
}

export interface ConsolidatedGroceryItem {
  ingredientId: string;
  name: string;
  aisle: AisleCategory;
  totalAmount: number;
  unit: string;
  formattedAmount: string;
  packsNeeded: number;
  packLabel: string;
  consumptionCostToman: number;
  shelfCostToman: number;
  inPantry: boolean;
  checked: boolean;
  recipeTitles: string[];
  isManual?: boolean;
  manualId?: string;
}

export interface PlanCostSummary {
  consumptionCostToman: number;
  shelfCheckoutCostToman: number;
  leftoverFridgeValueToman: number;
  weeklyBudgetToman: number;
  costPerServingToman: number;
  budgetPercent: number;
}

export interface CookbookCollection {
  id: string;
  name: string;
  recipeIds: string[];
}

export interface UserPreferences {
  name: string;
  goals: GoalId[];
  servings: number;
  cookingDaysPerWeek: number;
  /** Specific days of the week user cooks (0 = شنبه ... 6 = جمعه) */
  cookingDays?: number[];
  activeMealSlots: MealSlotType[];
  diet: DietType;
  cuisinePreference: CuisinePreference;
  /** Continuous slider 0..100 representing percentage of Persian food vs International food */
  persianRatio?: number;
  allergens: AllergenId[];
  appliances: ApplianceId[];
  weeklyBudgetToman: number;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  remindersEnabled: boolean;
  soakingReminder?: boolean;
  reminderTime: string;
  householdCode: string;
}

export interface FridgeMatchResult {
  recipe: Recipe;
  matchedCount: number;
  totalNonStapleCount: number;
  coveragePercent: number;
  missingIngredients: IngredientSpec[];
  missingEstimatedCostToman: number;
  matchType: 'exact' | 'missing_1' | 'missing_2' | 'partial';
}

export interface SwapCandidate {
  recipe: Recipe;
  deltaConsumptionCostToman: number;
  sharedIngredientsCount: number;
  matchScore: number;
  matchReasons: string[];
}

export interface RecommendationScore {
  score: number;
  normalizedScore: number;
  matchReasons: string[];
  eligible: boolean;
  disqualifyReason?: string;
}

export interface FridgeAIDetectedItem {
  code: string;
  nameFa: string;
  confidence: 'high' | 'medium' | 'low';
  quantityHint?: string;
}

export interface OwnerDatabaseOverrides {
  ingredientPrices: Record<string, { unitPriceToman: number; packPriceToman: number }>;
  customRecipes: RecipeMasterRecord[];
  deletedRecipeIds: string[];
}

export type AppTab = 'plan' | 'shop' | 'scan' | 'book' | 'me';
