import type {
  AisleCategory,
  AllergenId,
  ApplianceId,
  CuisinePreference,
  CuisineType,
  DietType,
  GoalId,
  MealSlotType,
} from '../types/sofreh';
import { ALLERGY_ICONS, FOOD_ICONS, KITCHEN_SCENE_3D, ONBOARDING_ICONS } from './database/assets';
import { INGREDIENT_ICON_PATHS } from './database/ingredientIcons';
import { INGREDIENTS_MASTER, INGREDIENTS_MAP } from './database/ingredients';
import {
  BUILTIN_RECIPES_MASTER,
  EMPTY_OWNER_OVERRIDES,
  getHydratedCatalog,
} from './database/repository';

export {
  ALLERGY_ICONS,
  FOOD_ICONS,
  KITCHEN_SCENE_3D,
  ONBOARDING_ICONS,
  INGREDIENTS_MASTER,
  INGREDIENTS_MAP,
  BUILTIN_RECIPES_MASTER,
  EMPTY_OWNER_OVERRIDES,
};

const INITIAL_HYDRATED = getHydratedCatalog(EMPTY_OWNER_OVERRIDES);

/** Default hydrated 250-food catalog (125 Persian + 125 International) */
export const RECIPES_CATALOG = INITIAL_HYDRATED.recipes;

export const DAY_NAMES_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'] as const;
export const DAY_NAMES_FULL = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

export const MEAL_SLOT_LABELS: Record<MealSlotType, string> = {
  breakfast: 'صبحانه',
  lunch: 'ناهار',
  dinner: 'شام',
};

export const AISLE_LABELS: Record<AisleCategory, string> = {
  protein: 'پروتئین و گوشت',
  produce: 'سبزیجات و صیفی‌جات',
  dairy: 'لبنیات و پنیر',
  bread_grains: 'برنج، نان و پاستا',
  pantry: 'حبوبات، سس و خشکبار',
  spices: 'ادویه و چاشنی',
};

export const GOALS_META: Array<{
  id: GoalId;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  {
    id: 'budget',
    title: 'خرج کمتر',
    subtitle: '',
    icon: ONBOARDING_ICONS.budget,
  },
  {
    id: 'nowaste',
    title: 'بدون دورریز',
    subtitle: '',
    icon: ONBOARDING_ICONS.nowaste,
  },
  {
    id: 'healthy',
    title: 'تغذیه سالم',
    subtitle: '',
    icon: ONBOARDING_ICONS.healthy,
  },
  {
    id: 'fast',
    title: 'پخت سریع',
    subtitle: '',
    icon: ONBOARDING_ICONS.fast,
  },
  {
    id: 'cook',
    title: 'تنوع آشپزی',
    subtitle: '',
    icon: ONBOARDING_ICONS.cook,
  },
  {
    id: 'calories',
    title: 'کنترل کالری',
    subtitle: '',
    icon: ONBOARDING_ICONS.calories,
  },
];

export const DIETS_META: Array<{ id: DietType; label: string; desc: string }> = [
  { id: 'omnivore', label: 'محدودیتی ندارم', desc: 'همهٔ غذاها' },
  { id: 'high_protein', label: 'پروتئین بالا', desc: 'ورزشی و مقوی' },
  { id: 'vegetarian', label: 'گیاه‌خواری', desc: 'بدون گوشت و ماهی' },
  { id: 'vegan', label: 'وگان', desc: 'کاملاً گیاهی' },
  { id: 'low_carb', label: 'کم‌کربوهیدرات', desc: 'سبک و سیرکننده' },
  { id: 'mediterranean', label: 'مدیترانه‌ای', desc: 'روغن زیتون و سبزیجات' },
];

export const CUISINE_PREFS_META: Array<{
  id: CuisinePreference;
  label: string;
  desc: string;
}> = [
  { id: 'mostly_persian', label: 'بیشتر ایرانی', desc: '۸۰٪ ایرانی' },
  { id: 'balanced', label: 'متعادل', desc: '۵۵٪ ایرانی' },
  { id: 'global_explorer', label: 'تنوع جهانی', desc: '۷۰٪ جهانی' },
];

export const CUISINE_FILTERS: Array<'همه' | CuisineType> = [
  'همه',
  'ایرانی',
  'ایتالیایی',
  'مدیترانه‌ای',
  'آسیایی',
  'مکزیکی',
  'خاورمیانه',
  'بین‌المللی',
];

export const SMART_LABEL_FILTERS = [
  'همه',
  'سریع',
  'زیر ۲۰ دقیقه',
  'پروتئین بالا',
  'کم‌کالری',
  'کم‌کربوهیدرات',
  'گیاهی',
  'وگان',
  'ورزشی',
  'بدون گلوتن',
  'یک‌قابلمه‌ای',
  'مجلسی',
  'ایرفرایر',
] as const;

export const ALLERGENS_META: Array<{
  id: AllergenId;
  label: string;
  subtitle: string;
  icon: string;
}> = [
  {
    id: 'dairy',
    label: 'لبنیات',
    subtitle: '',
    icon: ALLERGY_ICONS.dairy,
  },
  {
    id: 'gluten',
    label: 'گلوتن',
    subtitle: '',
    icon: ALLERGY_ICONS.gluten,
  },
  {
    id: 'nuts',
    label: 'مغزیجات',
    subtitle: '',
    icon: ALLERGY_ICONS.nuts,
  },
  {
    id: 'eggs',
    label: 'تخم‌مرغ',
    subtitle: '',
    icon: ALLERGY_ICONS.eggs,
  },
  {
    id: 'legumes',
    label: 'حبوبات',
    subtitle: '',
    icon: ALLERGY_ICONS.legumes,
  },
  {
    id: 'seafood',
    label: 'غذای دریایی',
    subtitle: '',
    icon: ALLERGY_ICONS.seafood,
  },
];

export const APPLIANCES_META: Array<{ id: ApplianceId; label: string; desc: string }> =
  KITCHEN_SCENE_3D.hotspots.map((h) => ({
    id: h.id,
    label: h.labelFa,
    desc: h.shortDesc,
  }));

export const APPLIANCE_SHORT_LABELS: Record<ApplianceId, string> = {
  stovetop: 'اجاق گاز',
  oven: 'فر',
  pressure_cooker: 'زودپز',
  airfryer: 'ایرفرایر',
  microwave: 'مایکروویو',
  blender: 'مخلوط‌کن',
  grill: 'گریل',
};

export interface DislikedFoodOption {
  id: string;
  label: string;
  icon: string;
  codes: string[];
}

export const DISLIKED_FOODS_META: DislikedFoodOption[] = [
  { id: 'eggplant', label: 'بادمجان', icon: INGREDIENT_ICON_PATHS.eggplant, codes: ['ING_EGGPLANT'] },
  { id: 'milk', label: 'شیر و خامه', icon: INGREDIENT_ICON_PATHS.milk, codes: ['ING_MILK', 'ING_HEAVY_CREAM'] },
  { id: 'mushroom', label: 'قارچ', icon: INGREDIENT_ICON_PATHS.mushroom, codes: ['ING_MUSHROOM'] },
  {
    id: 'fish',
    label: 'ماهی',
    icon: INGREDIENT_ICON_PATHS.salmon_fillet,
    codes: ['ING_SALMON_FILLET', 'ING_WHITE_FISH', 'ING_TUNA_CAN'],
  },
  { id: 'shrimp', label: 'میگو', icon: INGREDIENT_ICON_PATHS.shrimp, codes: ['ING_SHRIMP'] },
  { id: 'celery', label: 'کرفس', icon: INGREDIENT_ICON_PATHS.celery, codes: ['ING_CELERY'] },
  { id: 'zucchini', label: 'کدو سبز', icon: INGREDIENT_ICON_PATHS.zucchini, codes: ['ING_ZUCCHINI'] },
  {
    id: 'broccoli',
    label: 'بروکلی',
    icon: INGREDIENT_ICON_PATHS.broccoli,
    codes: ['ING_BROCCOLI', 'ING_CAULIFLOWER'],
  },
  {
    id: 'bell_pepper',
    label: 'فلفل دلمه‌ای',
    icon: INGREDIENT_ICON_PATHS.bell_pepper,
    codes: ['ING_BELL_PEPPER'],
  },
  { id: 'garlic', label: 'سیر', icon: INGREDIENT_ICON_PATHS.garlic, codes: ['ING_GARLIC'] },
  {
    id: 'red_meat',
    label: 'گوشت قرمز',
    icon: INGREDIENT_ICON_PATHS.beef_steak,
    codes: [
      'ING_LAMB_STEW',
      'ING_BEEF_MINCED',
      'ING_BEEF_SIRLOIN',
      'ING_LAMB_SHANK',
      'ING_LAMB_LIVER',
      'ING_BEEF_SAUSAGE',
    ],
  },
  {
    id: 'yogurt_kashk',
    label: 'ماست و کشک',
    icon: INGREDIENT_ICON_PATHS.yogurt,
    codes: ['ING_YOGURT', 'ING_GREEK_YOGURT', 'ING_KASHK'],
  },
  {
    id: 'onion',
    label: 'پیاز',
    icon: INGREDIENT_ICON_PATHS.onion,
    codes: ['ING_ONION', 'ING_RED_ONION', 'ING_GREEN_ONION'],
  },
  {
    id: 'tomato',
    label: 'گوجه',
    icon: INGREDIENT_ICON_PATHS.tomato,
    codes: ['ING_TOMATO', 'ING_CHERRY_TOMATO'],
  },
  {
    id: 'spinach',
    label: 'اسفناج',
    icon: INGREDIENT_ICON_PATHS.spinach_herbs,
    codes: ['ING_SPINACH'],
  },
  {
    id: 'cheese',
    label: 'پنیر',
    icon: INGREDIENT_ICON_PATHS.cheese,
    codes: [
      'ING_FETA_CHEESE',
      'ING_MOZZARELLA',
      'ING_PARMESAN',
      'ING_CHEDDAR',
      'ING_CREAM_CHEESE',
      'ING_HALLOUMI',
    ],
  },
  { id: 'egg', label: 'تخم‌مرغ', icon: INGREDIENT_ICON_PATHS.egg, codes: ['ING_EGG'] },
  {
    id: 'chicken',
    label: 'مرغ',
    icon: INGREDIENT_ICON_PATHS.chicken_breast,
    codes: ['ING_CHICKEN_BREAST', 'ING_CHICKEN_THIGH', 'ING_CHICKEN_MINCED'],
  },
  { id: 'avocado', label: 'آووکادو', icon: INGREDIENT_ICON_PATHS.avocado, codes: ['ING_AVOCADO'] },
  { id: 'okra', label: 'بامیه', icon: INGREDIENT_ICON_PATHS.green_beans, codes: ['ING_OKRA'] },
  {
    id: 'walnut_nuts',
    label: 'گردو و مغزها',
    icon: INGREDIENT_ICON_PATHS.walnut,
    codes: [
      'ING_WALNUT',
      'ING_ALMOND_SLIVER',
      'ING_PISTACHIO',
      'ING_CASHEW',
      'ING_PINE_NUTS',
      'ING_PEANUT_BUTTER',
    ],
  },
  {
    id: 'beans',
    label: 'لوبیا و حبوبات',
    icon: INGREDIENT_ICON_PATHS.kidney_beans,
    codes: [
      'ING_RED_BEANS',
      'ING_PINTO_BEANS',
      'ING_BLACK_BEANS',
      'ING_WHITE_BEANS',
      'ING_CHICKPEA',
      'ING_FAVA_BEAN',
      'ING_SPLIT_PEA',
      'ING_BLACK_EYED_PEA',
    ],
  },
  {
    id: 'tofu_soy',
    label: 'توفو و سویا',
    icon: INGREDIENT_ICON_PATHS.tofu,
    codes: ['ING_TOFU', 'ING_SOY_PROTEIN'],
  },
  {
    id: 'chili_spicy',
    label: 'تند و فلفلی',
    icon: INGREDIENT_ICON_PATHS.saffron_spices,
    codes: ['ING_CHILI_PEPPER', 'ING_SRIRACHA', 'ING_CHILI_FLAKES'],
  },
];

export const QUICK_FRIDGE_STAPLE_CODES = [
  'ING_CHICKEN_BREAST',
  'ING_EGG',
  'ING_TOMATO',
  'ING_POTATO',
  'ING_EGGPLANT',
  'ING_MUSHROOM',
  'ING_SPINACH',
  'ING_RICE_IRANI',
  'ING_PASTA_PENNE',
  'ING_BEEF_MINCED',
  'ING_TUNA_CAN',
  'ING_LENTILS',
  'ING_CHICKPEA',
  'ING_YOGURT',
  'ING_FETA_CHEESE',
  'ING_MOZZARELLA',
  'ING_BELL_PEPPER',
  'ING_ZUCCHINI',
  'ING_BROCCOLI',
  'ING_HERB_GHORMEH',
];
