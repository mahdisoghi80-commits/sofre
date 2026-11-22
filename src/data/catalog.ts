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
