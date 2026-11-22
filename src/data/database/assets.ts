import type { AllergenId, ApplianceId } from '../../types/sofreh';

export const ONBOARDING_ICONS = {
  budget: '/assets/images/ob_goal_budget_1795370263900.jpg',
  nowaste: '/assets/images/ob_goal_nowaste_1795370265280.jpg',
  healthy: '/assets/images/ob_goal_healthy_1795370266996.jpg',
  fast: '/assets/images/ob_goal_fast_1795370267457.jpg',
  cook: '/assets/images/ob_goal_cook_1795370268490.jpg',
  calories: '/assets/images/ob_goal_calories_1795370268870.jpg',
  family: '/assets/images/ob_step_family_1795370270288.jpg',
  allergy: '/assets/images/ob_step_allergy_1795370284946.jpg',
  fridge: '/assets/images/ob_step_fridge_1795370283430.jpg',
} as const;

export const ALLERGY_ICONS: Record<AllergenId, string> = {
  dairy: '/assets/images/allergy_dairy_1795372315005.jpg',
  gluten: '/assets/images/allergy_gluten_1795372315037.jpg',
  nuts: '/assets/images/allergy_nuts_1795372315194.jpg',
  eggs: '/assets/images/allergy_eggs_1795372314912.jpg',
  legumes: '/assets/images/allergy_legumes_1795372315642.jpg',
  seafood: '/assets/images/allergy_seafood_1795372315642.jpg',
};

export const FOOD_ICONS = {
  // 10 Authentic Persian 3D Icons
  ghormeh: '/assets/images/food_ghormeh_sabzi_1795370285181.jpg',
  abgoosht: '/assets/images/food_abgoosht_dizi_1795370284345.jpg',
  kabab: '/assets/images/food_kabab_tarkibi_1795370283958.jpg',
  kashk: '/assets/images/food_kashk_bademjan_1795370285091.jpg',
  morgh: '/assets/images/food_morgh_tanoori_1795370284282.jpg',
  adas_polo: '/assets/images/food_adas_polo_1795370335962.jpg',
  kuku: '/assets/images/food_kuku_sabzi_1795370285462.jpg',
  zereshk: '/assets/images/food_zereshk_polo_1795370286070.jpg',
  omelette: '/assets/images/food_omelette_irani_1795370284473.jpg',
  ash: '/assets/images/food_ash_reshteh_1795370284056.jpg',
  // 6 World Food 3D Icons
  pasta: '/assets/images/food_pasta_italian_1795372314976.jpg',
  bowl: '/assets/images/food_bowl_healthy_1795372315130.jpg',
  curry: '/assets/images/food_curry_asian_1795372315161.jpg',
  taco: '/assets/images/food_taco_wrap_1795372315322.jpg',
  soup: '/assets/images/food_soup_stew_1795372314788.jpg',
  salad: '/assets/images/food_salad_fresh_1795372315550.jpg',
} as const;

export type FoodIconKey = keyof typeof FOOD_ICONS;

export interface KitchenHotspot {
  id: ApplianceId;
  labelFa: string;
  /** Compact tag rendered directly over the 3D kitchen diorama so pins never collide on mobile */
  shortPinFa: string;
  shortDesc: string;
  /** Visual percentage position on kitchen_scene_3d_1795372315196.jpg (4:3) */
  xPercent: number;
  yPercent: number;
}

export const KITCHEN_SCENE_3D = {
  image: '/assets/images/kitchen_scene_3d_1795372315196.jpg',
  hotspots: [
    {
      id: 'microwave',
      labelFa: 'مایکروویو',
      shortPinFa: 'مایکروویو',
      shortDesc: 'گرم‌کردن و پخت سریع ۵ دقیقه‌ای',
      xPercent: 23,
      yPercent: 25,
    },
    {
      id: 'stovetop',
      labelFa: 'اجاق گاز',
      shortPinFa: 'اجاق',
      shortDesc: 'خورشت، پلو، تابه و آشپزی روزمره',
      xPercent: 20,
      yPercent: 52,
    },
    {
      id: 'oven',
      labelFa: 'فر توکار',
      shortPinFa: 'فر',
      shortDesc: 'تنوری، لازانیا، پیتزا و سینی فر',
      xPercent: 24,
      yPercent: 74,
    },
    {
      id: 'airfryer',
      labelFa: 'سرخ‌کن بدون روغن',
      shortPinFa: 'هواپز',
      shortDesc: 'ترد و کم‌کالری بدون روغن اضافه',
      xPercent: 46,
      yPercent: 46,
    },
    {
      id: 'pressure_cooker',
      labelFa: 'زودپز',
      shortPinFa: 'زودپز',
      shortDesc: 'پخت سریع گوشت، حبوبات و آبگوشت',
      xPercent: 64,
      yPercent: 32,
    },
    {
      id: 'blender',
      labelFa: 'مخلوط‌کن و بلندر',
      shortPinFa: 'بلندر',
      shortDesc: 'اسموتی، سوپ کرمی، حمص و سس',
      xPercent: 83,
      yPercent: 52,
    },
    {
      id: 'grill',
      labelFa: 'گریل و باربیکیو',
      shortPinFa: 'گریل',
      shortDesc: 'کباب، استیک، سبزیجات و هالومی',
      xPercent: 65,
      yPercent: 68,
    },
  ] as KitchenHotspot[],
};
