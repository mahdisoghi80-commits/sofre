import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  EMPTY_OWNER_OVERRIDES,
  FOOD_ICONS,
  INGREDIENTS_MASTER,
} from '../data/catalog';
import { DISH_PHOTOS } from '../data/database/photos';
import { getHydratedCatalog } from '../data/database/repository';
import type {
  AisleCategory,
  AppTab,
  ConsolidatedGroceryItem,
  CookbookCollection,
  IngredientMasterRecord,
  IngredientSpec,
  ManualGroceryItem,
  MealSlotType,
  OwnerDatabaseOverrides,
  PantryItem,
  PlanCostSummary,
  PlannedMeal,
  Recipe,
  RecipeMasterRecord,
  UserPreferences,
} from '../types/sofreh';
import {
  buildConsolidatedGroceryList,
  checkRecipeEligibility,
  computeMinimumWeeklyBudget,
  generateWeeklyPlan,
} from '../utils/planner';
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
  loadPersistedString,
  savePersistedString,
} from '../utils/native';
import {
  fetchLivePrices,
  loadCachedLivePrices,
  mergeLivePricesWithOverrides,
} from '../utils/livePricing';
import type { LivePricesPayload } from '../utils/priceEngine';

const STORAGE_KEY = 'sofreh_app_state_v2';

export interface ToastMessage {
  id: number;
  text: string;
  undoLabel?: string;
  onUndo?: () => void;
}

const DEFAULT_PANTRY_CODES = new Set([
  'ING_RICE_IRANI',
  'ING_ONION',
  'ING_GARLIC',
  'ING_POTATO',
  'ING_EGG',
  'ING_TOMATO',
  'ING_CHICKEN_BREAST',
  'ING_COOKING_OIL',
  'ING_OLIVE_OIL',
  'ING_TOMATO_PASTE',
  'ING_SAFFRON',
  'ING_TURMERIC',
  'ING_DRIED_LIME',
  'ING_BLACK_PEPPER',
  'ING_BUTTER',
  'ING_FLOUR_WHEAT',
]);

function buildDefaultPantry(): PantryItem[] {
  return INGREDIENTS_MASTER.filter(
    (ing) => ing.isStaple || DEFAULT_PANTRY_CODES.has(ing.code)
  ).map((ing) => ({
    ingredientId: ing.code,
    name: ing.nameFa,
    aisle: ing.aisle,
    inStock: DEFAULT_PANTRY_CODES.has(ing.code),
  }));
}

const DEFAULT_PREFS: UserPreferences = {
  name: 'سفرهٔ خانه',
  goals: ['budget', 'nowaste', 'healthy'],
  servings: 2,
  cookingDaysPerWeek: 7,
  cookingDays: [0, 1, 2, 3, 4, 5, 6],
  activeMealSlots: ['lunch', 'dinner'],
  diet: 'omnivore',
  cuisinePreference: 'balanced',
  persianRatio: 65,
  allergens: [],
  dislikedIngredients: [],
  appliances: ['stovetop', 'oven', 'microwave', 'blender'],
  weeklyBudgetToman: 5_000_000,
  dailyCalorieTarget: 2050,
  dailyProteinTarget: 95,
  remindersEnabled: true,
  soakingReminder: true,
  reminderTime: '۱۷:۳۰',
  householdCode: 'SFR-404',
  isPro: false,
};

interface PersistedSnapshot {
  onboarded: boolean;
  prefs: UserPreferences;
  plan: PlannedMeal[];
  planLocked: boolean;
  pantry: PantryItem[];
  checkedGroceryMap: Record<string, boolean>;
  manualGroceryItems: ManualGroceryItem[];
  ownerOverrides: OwnerDatabaseOverrides;
  cookbooks: CookbookCollection[];
  cookedCount: number;
  recipeFeedback: Record<string, 'up' | 'down'>;
}

interface AppStateContextValue {
  hydrated: boolean;
  onboarded: boolean;
  activeTab: AppTab;
  selectedDay: number;
  selectedRecipeId: string | null;
  selectedRecipeServings: number;
  cookModeRecipeId: string | null;
  cookModeServings: number;
  prefs: UserPreferences;
  ingredientsMaster: IngredientMasterRecord[];
  recipes: Recipe[];
  ownerOverrides: OwnerDatabaseOverrides;
  plan: PlannedMeal[];
  planLocked: boolean;
  pantry: PantryItem[];
  groceryList: ConsolidatedGroceryItem[];
  costSummary: PlanCostSummary;
  minWeeklyBudgetToman: number;
  cookbooks: CookbookCollection[];
  cookedCount: number;
  recipeFeedback: Record<string, 'up' | 'down'>;
  toast: ToastMessage | null;
  fridgeInitialSubTab: 'camera' | 'inventory';
  openFridgeCamera: () => void;
  openInventory: () => void;
  setActiveTab: (tab: AppTab) => void;
  goBackTab: () => boolean;
  registerBackHandler: (id: string, handler: () => boolean) => () => void;
  handleBackNavigation: () => boolean;
  setSelectedDay: (day: number) => void;
  openRecipe: (recipeId: string, servings?: number) => void;
  closeRecipe: () => void;
  startCookMode: (recipeId: string, servings: number) => void;
  closeCookMode: () => void;
  updatePrefs: (patch: Partial<UserPreferences>, autoRefilter?: boolean) => void;
  completeOnboarding: (finalPrefs: UserPreferences) => void;
  restartOnboarding: () => void;
  togglePlanLock: () => void;
  regeneratePlan: (force?: boolean) => void;
  swapMeal: (mealId: string, nextRecipeId: string, matchReasons?: string[]) => void;
  addMealToPlan: (dayIndex: number, slot: MealSlotType, recipeId: string, servings?: number) => void;
  removeMealFromPlan: (mealId: string) => void;
  markRecipeCooked: (recipeId: string) => void;
  rateRecipe: (recipeId: string, rating: 'up' | 'down') => void;
  toggleGroceryChecked: (ingredientId: string, isManual?: boolean, manualId?: string) => void;
  addManualGroceryItem: (
    name: string,
    amountLabel: string,
    aisle: AisleCategory,
    estimatedCostToman: number,
    ingredientCode?: string
  ) => void;
  addMissingIngredientsToGrocery: (missing: IngredientSpec[]) => void;
  removeManualGroceryItem: (manualId: string) => void;
  togglePantryStock: (ingredientId: string) => void;
  setPantryItemsInStock: (codes: string[], inStock: boolean) => void;
  toggleRecipeInCookbook: (cookbookId: string, recipeId: string) => void;
  createCookbook: (name: string) => void;
  importCustomRecipe: (title: string, sourceHint: string, rawIngredientCodesOrNames: string[]) => Recipe;
  addImportedRecipeRecord: (record: RecipeMasterRecord) => Recipe;
  updateIngredientPrice: (code: string, unitPriceToman: number, packPriceToman: number) => void;
  resetOwnerOverrides: () => void;
  livePrices: LivePricesPayload | null;
  isSyncingPrices: boolean;
  refreshLivePrices: (force?: boolean) => Promise<void>;
  showToast: (text: string, undoLabel?: string, onUndo?: () => void) => void;
  dismissToast: () => void;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const autostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean>(autostart);
  const [activeTab, setActiveTabState] = useState<AppTab>('plan');
  const [fridgeInitialSubTab, setFridgeInitialSubTab] = useState<'camera' | 'inventory'>('camera');
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedRecipeServings, setSelectedRecipeServings] = useState<number>(2);
  const [cookModeRecipeId, setCookModeRecipeId] = useState<string | null>(null);
  const [cookModeServings, setCookModeServings] = useState<number>(2);

  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [ownerOverrides, setOwnerOverrides] = useState<OwnerDatabaseOverrides>(
    EMPTY_OWNER_OVERRIDES
  );
  const [pantry, setPantry] = useState<PantryItem[]>(() => buildDefaultPantry());
  const [checkedGroceryMap, setCheckedGroceryMap] = useState<Record<string, boolean>>({});
  const [manualGroceryItems, setManualGroceryItems] = useState<ManualGroceryItem[]>([]);
  const [cookbooks, setCookbooks] = useState<CookbookCollection[]>([
    {
      id: 'fav',
      name: 'محبوب‌های خانواده',
      recipeIds: ['ghormeh-sabzi', 'zereshk-polo-morgh', 'pasta-alfredo-chicken', 'kashk-bademjan'],
    },
    {
      id: 'fast',
      name: 'شام‌های سریع زیر ۲۰ دقیقه',
      recipeIds: ['omelette-irani', 'pasta-aglio-olio', 'korean-beef-bowl', 'chicken-cheese-quesadilla'],
    },
    {
      id: 'sport',
      name: 'پروتئین بالا و ورزشی',
      recipeIds: ['joojeh-kabab-tabei', 'quinoa-avocado-chicken-bowl', 'med-salmon-quinoa-bowl'],
    },
  ]);
  const [cookedCount, setCookedCount] = useState<number>(9);
  const [recipeFeedback, setRecipeFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [planLocked, setPlanLocked] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [livePrices, setLivePrices] = useState<LivePricesPayload | null>(null);
  const [isSyncingPrices, setIsSyncingPrices] = useState<boolean>(false);

  const tabHistoryRef = useRef<AppTab[]>([]);
  const backHandlersRef = useRef<Array<{ id: string; handler: () => boolean }>>([]);
  const varietySeedRef = useRef<number>(1);

  const effectiveOverrides = useMemo(
    () => mergeLivePricesWithOverrides(livePrices, ownerOverrides),
    [livePrices, ownerOverrides]
  );

  const hydratedDb = useMemo(
    () => getHydratedCatalog(effectiveOverrides),
    [effectiveOverrides]
  );
  const recipes = hydratedDb.recipes;
  const ingredientsMaster = hydratedDb.ingredients;

  const [plan, setPlan] = useState<PlannedMeal[]>(() =>
    generateWeeklyPlan(hydratedDb.recipes, DEFAULT_PREFS, buildDefaultPantry())
  );

  const showToast = useCallback((text: string, undoLabel?: string, onUndo?: () => void) => {
    const id = Date.now();
    setToast({ id, text, undoLabel, onUndo });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast((prev) => (prev && prev.id === toast.id ? null : prev));
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Hydrate persisted state from Capacitor Preferences / localStorage
  useEffect(() => {
    let active = true;
    loadPersistedString(STORAGE_KEY).then((raw) => {
      if (!active) return;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as Partial<PersistedSnapshot>;
          if (!autostart && typeof parsed.onboarded === 'boolean') {
            setOnboarded(parsed.onboarded);
          }
          if (parsed.prefs) setPrefs({ ...DEFAULT_PREFS, ...parsed.prefs });
          if (parsed.ownerOverrides) {
            setOwnerOverrides({
              ...EMPTY_OWNER_OVERRIDES,
              ...parsed.ownerOverrides,
            });
          }
          if (Array.isArray(parsed.plan) && parsed.plan.length > 0) setPlan(parsed.plan);
          if (typeof parsed.planLocked === 'boolean') setPlanLocked(parsed.planLocked);
          if (Array.isArray(parsed.pantry) && parsed.pantry.length > 0) setPantry(parsed.pantry);
          if (parsed.checkedGroceryMap) setCheckedGroceryMap(parsed.checkedGroceryMap);
          if (Array.isArray(parsed.manualGroceryItems)) setManualGroceryItems(parsed.manualGroceryItems);
          if (Array.isArray(parsed.cookbooks) && parsed.cookbooks.length > 0) setCookbooks(parsed.cookbooks);
          if (typeof parsed.cookedCount === 'number') setCookedCount(parsed.cookedCount);
          if (parsed.recipeFeedback) setRecipeFeedback(parsed.recipeFeedback);
        } catch {
          // Corrupt storage fallback
        }
      }
      setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [autostart]);

  // Load cached live Iranian grocery prices immediately, then refresh in background
  const refreshLivePrices = useCallback(
    async (force = false) => {
      setIsSyncingPrices(true);
      try {
        const fresh = await fetchLivePrices(force);
        if (fresh) {
          setLivePrices(fresh);
          if (force) {
            hapticSuccess();
            showToast('قیمت‌های روز بازار به‌روزرسانی شد');
          }
        } else if (force) {
          showToast('دریافت قیمت جدید انجام نشد؛ قیمت‌های ذخیره فعال است');
        }
      } finally {
        setIsSyncingPrices(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    let active = true;
    loadCachedLivePrices().then((cached) => {
      if (active && cached?.payload) {
        setLivePrices(cached.payload);
      }
    });
    fetchLivePrices(false).then((fresh) => {
      if (active && fresh) {
        setLivePrices(fresh);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist changes
  useEffect(() => {
    if (!hydrated) return;
    const snapshot: PersistedSnapshot = {
      onboarded,
      prefs,
      plan,
      planLocked,
      pantry,
      checkedGroceryMap,
      manualGroceryItems,
      ownerOverrides,
      cookbooks,
      cookedCount,
      recipeFeedback,
    };
    savePersistedString(STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    hydrated,
    onboarded,
    prefs,
    plan,
    planLocked,
    pantry,
    checkedGroceryMap,
    manualGroceryItems,
    ownerOverrides,
    cookbooks,
    cookedCount,
    recipeFeedback,
  ]);

  const savedRecipeIds = useMemo(() => {
    const s = new Set<string>();
    for (const cb of cookbooks) {
      for (const id of cb.recipeIds) s.add(id);
    }
    return s;
  }, [cookbooks]);

  const { items: groceryList, summary: rawCostSummary } = useMemo(
    () =>
      buildConsolidatedGroceryList(
        plan,
        recipes,
        pantry,
        checkedGroceryMap,
        manualGroceryItems
      ),
    [plan, recipes, pantry, checkedGroceryMap, manualGroceryItems]
  );

  const minWeeklyBudgetToman = useMemo(
    () => computeMinimumWeeklyBudget(recipes, prefs),
    [recipes, prefs]
  );

  const costSummary = useMemo<PlanCostSummary>(() => {
    const budgetPercent =
      prefs.weeklyBudgetToman > 0
        ? Math.min(160, Math.round((rawCostSummary.consumptionCostToman / prefs.weeklyBudgetToman) * 100))
        : 0;
    return {
      ...rawCostSummary,
      weeklyBudgetToman: prefs.weeklyBudgetToman,
      budgetPercent,
    };
  }, [rawCostSummary, prefs.weeklyBudgetToman]);

  // Automatic Budget-Compliance Guard:
  // When live market prices finish loading (or legacy stored budget is below mathematical floor),
  // ensure the weekly plan stays strictly within budget — never "7M over budget"!
  const budgetGuardSigRef = useRef<string>('');
  useEffect(() => {
    if (!hydrated || planLocked || plan.length === 0) return;

    const sig = `${livePrices?.updatedAt ?? 'base'}|${prefs.weeklyBudgetToman}|${minWeeklyBudgetToman}|${prefs.servings}`;
    if (budgetGuardSigRef.current === sig) return;

    // 1. Lift impossible legacy stored budget up to realistic minimum floor
    if (prefs.weeklyBudgetToman < minWeeklyBudgetToman) {
      const liftedBudget = Math.ceil(minWeeklyBudgetToman / 200_000) * 200_000;
      budgetGuardSigRef.current = `${livePrices?.updatedAt ?? 'base'}|${liftedBudget}|${minWeeklyBudgetToman}|${prefs.servings}`;
      const adjustedPrefs = { ...prefs, weeklyBudgetToman: liftedBudget };
      setPrefs(adjustedPrefs);
      setPlan(generateWeeklyPlan(recipes, adjustedPrefs, pantry, recipeFeedback, savedRecipeIds));
      return;
    }

    // 2. If live prices pushed the existing plan over budget, re-optimize strictly inside budget
    if (rawCostSummary.consumptionCostToman > prefs.weeklyBudgetToman) {
      budgetGuardSigRef.current = sig;
      setPlan(generateWeeklyPlan(recipes, prefs, pantry, recipeFeedback, savedRecipeIds));
      return;
    }

    budgetGuardSigRef.current = sig;
  }, [
    hydrated,
    planLocked,
    plan.length,
    livePrices?.updatedAt,
    prefs,
    minWeeklyBudgetToman,
    rawCostSummary.consumptionCostToman,
    recipes,
    pantry,
    recipeFeedback,
    savedRecipeIds,
  ]);

  const setActiveTab = useCallback((tab: AppTab) => {
    hapticLight();
    setSelectedRecipeId(null);
    if (tab === 'scan') {
      setFridgeInitialSubTab('camera');
    }
    setActiveTabState((prev) => {
      if (prev !== tab) {
        tabHistoryRef.current = [...tabHistoryRef.current.slice(-11), prev];
      }
      return tab;
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0 });
    }
  }, []);

  const goBackTab = useCallback((): boolean => {
    const stack = tabHistoryRef.current;
    while (stack.length > 0) {
      const prevTab = stack.pop()!;
      if (prevTab !== activeTab) {
        hapticLight();
        setActiveTabState(prevTab);
        return true;
      }
    }
    if (activeTab !== 'plan') {
      hapticLight();
      setActiveTabState('plan');
      return true;
    }
    return false;
  }, [activeTab]);

  const registerBackHandler = useCallback((id: string, handler: () => boolean) => {
    backHandlersRef.current = [
      ...backHandlersRef.current.filter((h) => h.id !== id),
      { id, handler },
    ];
    return () => {
      backHandlersRef.current = backHandlersRef.current.filter((h) => h.id !== id);
    };
  }, []);

  const openFridgeCamera = useCallback(() => {
    hapticLight();
    setSelectedRecipeId(null);
    setFridgeInitialSubTab('camera');
    setActiveTabState((prev) => {
      if (prev !== 'scan') {
        tabHistoryRef.current = [...tabHistoryRef.current.slice(-11), prev];
      }
      return 'scan';
    });
  }, []);

  const openInventory = useCallback(() => {
    hapticLight();
    setSelectedRecipeId(null);
    setFridgeInitialSubTab('inventory');
    setActiveTabState((prev) => {
      if (prev !== 'scan') {
        tabHistoryRef.current = [...tabHistoryRef.current.slice(-11), prev];
      }
      return 'scan';
    });
  }, []);

  const openRecipe = useCallback(
    (recipeId: string, servings?: number) => {
      hapticLight();
      setSelectedRecipeServings(servings ?? prefs.servings);
      setSelectedRecipeId(recipeId);
    },
    [prefs.servings]
  );

  const closeRecipe = useCallback(() => {
    hapticLight();
    setSelectedRecipeId(null);
  }, []);

  const startCookMode = useCallback((recipeId: string, servings: number) => {
    hapticMedium();
    setCookModeServings(servings);
    setCookModeRecipeId(recipeId);
  }, []);

  const closeCookMode = useCallback(() => {
    hapticLight();
    setCookModeRecipeId(null);
  }, []);

  const handleBackNavigation = useCallback((): boolean => {
    // 1. Always exit full-screen Cook Mode first
    if (cookModeRecipeId) {
      closeCookMode();
      return true;
    }
    // 2. Let the most recently mounted modal/sheet/onboarding-step intercept Back (LIFO)
    const handlers = [...backHandlersRef.current].reverse();
    for (const entry of handlers) {
      if (entry.handler()) {
        return true;
      }
    }
    // 3. Close open Recipe Detail page
    if (selectedRecipeId) {
      closeRecipe();
      return true;
    }
    // 4. Pop tab navigation stack or return to root 'plan' tab
    if (onboarded) {
      return goBackTab();
    }
    return false;
  }, [cookModeRecipeId, closeCookMode, selectedRecipeId, closeRecipe, onboarded, goBackTab]);

  const updatePrefs = useCallback(
    (patch: Partial<UserPreferences>, autoRefilter = false) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        if (autoRefilter && !planLocked) {
          setPlan((currentPlan) => {
            const hasIncompatible = currentPlan.some((m) => {
              const r = recipes.find((rec) => rec.id === m.recipeId);
              return r ? !checkRecipeEligibility(r, next, m.slot).eligible : false;
            });
            const structureChanged =
              (patch.cuisinePreference && patch.cuisinePreference !== prev.cuisinePreference) ||
              (typeof patch.persianRatio === 'number' && patch.persianRatio !== prev.persianRatio) ||
              (typeof patch.weeklyBudgetToman === 'number' &&
                patch.weeklyBudgetToman < prev.weeklyBudgetToman) ||
              (Array.isArray(patch.dislikedIngredients) &&
                patch.dislikedIngredients.join(',') !== (prev.dislikedIngredients ?? []).join(',')) ||
              (Array.isArray(patch.cookingDays) &&
                patch.cookingDays.join(',') !== (prev.cookingDays ?? []).join(','));
            if (hasIncompatible || structureChanged) {
              showToast('برنامهٔ هفته متناسب با تنظیمات جدید چیده شد');
              return generateWeeklyPlan(recipes, next, pantry, recipeFeedback, savedRecipeIds);
            }
            if (patch.servings && patch.servings !== prev.servings) {
              const scaled = currentPlan.map((m) => ({ ...m, servings: next.servings }));
              // Re-optimize if increasing servings pushes total cost above weekly budget
              const scaledSummary = buildConsolidatedGroceryList(
                scaled,
                recipes,
                pantry,
                {},
                []
              ).summary;
              if (scaledSummary.consumptionCostToman > next.weeklyBudgetToman) {
                return generateWeeklyPlan(recipes, next, pantry, recipeFeedback, savedRecipeIds);
              }
              return scaled;
            }
            return currentPlan;
          });
        }
        return next;
      });
    },
    [pantry, planLocked, recipeFeedback, recipes, savedRecipeIds, showToast]
  );

  const completeOnboarding = useCallback(
    (finalPrefs: UserPreferences) => {
      hapticSuccess();
      setPrefs(finalPrefs);
      const nextPlan = generateWeeklyPlan(
        recipes,
        finalPrefs,
        pantry,
        recipeFeedback,
        savedRecipeIds
      );
      setPlan(nextPlan);
      setPlanLocked(false);
      setOnboarded(true);
      setActiveTabState('plan');
      const firstDay =
        finalPrefs.cookingDays && finalPrefs.cookingDays.length > 0
          ? Math.min(...finalPrefs.cookingDays)
          : 0;
      setSelectedDay(firstDay);
      showToast('سفرهٔ این هفته‌ات آماده شد');
    },
    [pantry, recipeFeedback, recipes, savedRecipeIds, showToast]
  );

  const restartOnboarding = useCallback(() => {
    hapticLight();
    setOnboarded(false);
    setSelectedRecipeId(null);
    setCookModeRecipeId(null);
  }, []);

  const togglePlanLock = useCallback(() => {
    hapticMedium();
    setPlanLocked((prev) => {
      const next = !prev;
      showToast(
        next
          ? 'برنامه قفل شد؛ خریدهای شما ایمن می‌مانند'
          : 'قفل برنامه باز شد؛ می‌توانید غذاها را تغییر دهید'
      );
      return next;
    });
  }, [showToast]);

  const regeneratePlan = useCallback(
    (force = false) => {
      if (planLocked && !force) {
        showToast('برنامه قفل است. ابتدا قفل بالای صفحه را باز کنید.');
        return;
      }
      hapticMedium();
      const previousPlan = plan;
      varietySeedRef.current += 1;
      const fresh = generateWeeklyPlan(
        recipes,
        prefs,
        pantry,
        recipeFeedback,
        savedRecipeIds,
        varietySeedRef.current
      );
      setPlan(fresh);
      showToast('برنامهٔ تازه با موتور هوشمند سفره چیده شد', 'بازگردانی', () => {
        setPlan(previousPlan);
      });
    },
    [pantry, plan, planLocked, prefs, recipeFeedback, recipes, savedRecipeIds, showToast]
  );

  const swapMeal = useCallback(
    (mealId: string, nextRecipeId: string, matchReasons?: string[]) => {
      if (planLocked) {
        showToast('برنامه قفل است؛ برای جابه‌جایی ابتدا قفل را باز کنید.');
        return;
      }
      hapticMedium();
      const previousPlan = plan;
      const nextRecipe = recipes.find((r) => r.id === nextRecipeId);
      setPlan((prev) =>
        prev.map((m) =>
          m.id === mealId
            ? {
                ...m,
                recipeId: nextRecipeId,
                matchReasons: matchReasons ?? nextRecipe?.tags.slice(0, 2) ?? m.matchReasons,
              }
            : m
        )
      );
      showToast(
        `با «${nextRecipe?.title ?? 'غذای جدید'}» جایگزین شد`,
        'بازگردانی',
        () => {
          setPlan(previousPlan);
        }
      );
    },
    [plan, planLocked, recipes, showToast]
  );

  const addMealToPlan = useCallback(
    (dayIndex: number, slot: MealSlotType, recipeId: string, servings?: number) => {
      hapticSuccess();
      const targetServings = servings ?? prefs.servings;
      const recipe = recipes.find((r) => r.id === recipeId);
      setPlan((prev) => {
        const existingIdx = prev.findIndex((m) => m.dayIndex === dayIndex && m.slot === slot);
        const newMeal: PlannedMeal = {
          id: `meal-${dayIndex}-${slot}-${recipeId}-${Date.now()}`,
          dayIndex,
          slot,
          recipeId,
          servings: targetServings,
          cooked: false,
          matchReasons: recipe?.tags.slice(0, 2) ?? ['انتخاب مستقیم شما'],
          matchScore: 95,
        };
        if (existingIdx >= 0) {
          const clone = [...prev];
          clone[existingIdx] = newMeal;
          return clone;
        }
        return [...prev, newMeal];
      });
      showToast(`«${recipe?.title ?? 'غذا'}» به برنامه اضافه شد`);
    },
    [prefs.servings, recipes, showToast]
  );

  const removeMealFromPlan = useCallback(
    (mealId: string) => {
      if (planLocked) {
        showToast('برنامه قفل است؛ برای حذف وعده قفل را باز کنید.');
        return;
      }
      hapticLight();
      const previousPlan = plan;
      setPlan((prev) => prev.filter((m) => m.id !== mealId));
      showToast('وعده از برنامه حذف شد', 'بازگردانی', () => setPlan(previousPlan));
    },
    [plan, planLocked, showToast]
  );

  const markRecipeCooked = useCallback(
    (recipeId: string) => {
      hapticSuccess();
      setCookedCount((c) => c + 1);
      setPlan((prev) =>
        prev.map((m) => (m.recipeId === recipeId ? { ...m, cooked: true } : m))
      );
      showToast('نوش جان! این غذا در تاریخچهٔ پخت ثبت شد');
    },
    [showToast]
  );

  const rateRecipe = useCallback(
    (recipeId: string, rating: 'up' | 'down') => {
      hapticLight();
      setRecipeFeedback((prev) => ({ ...prev, [recipeId]: rating }));
      showToast(
        rating === 'up'
          ? 'ثبت شد! موتور هوشمند این سبک را بیشتر پیشنهاد می‌دهد'
          : 'ثبت شد؛ این غذا در برنامه‌های آینده کمتر پیشنهاد می‌شود'
      );
    },
    [showToast]
  );

  const toggleGroceryChecked = useCallback(
    (ingredientId: string, isManual?: boolean, manualId?: string) => {
      hapticLight();
      if (isManual && manualId) {
        setManualGroceryItems((prev) =>
          prev.map((item) =>
            item.id === manualId ? { ...item, checked: !item.checked } : item
          )
        );
        return;
      }
      setCheckedGroceryMap((prev) => ({
        ...prev,
        [ingredientId]: !prev[ingredientId],
      }));
    },
    []
  );

  const addManualGroceryItem = useCallback(
    (
      name: string,
      amountLabel: string,
      aisle: AisleCategory,
      estimatedCostToman: number,
      ingredientCode?: string
    ) => {
      hapticMedium();
      const trimmed = name.trim();
      if (!trimmed) return;
      const item: ManualGroceryItem = {
        id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: trimmed,
        amountLabel: amountLabel.trim() || '۱ بسته',
        aisle,
        estimatedCostToman: Math.max(0, estimatedCostToman),
        checked: false,
        ingredientCode,
      };
      setManualGroceryItems((prev) => [item, ...prev]);
      showToast(`«${trimmed}» به لیست خرید اضافه شد`);
    },
    [showToast]
  );

  const addMissingIngredientsToGrocery = useCallback(
    (missing: IngredientSpec[]) => {
      if (missing.length === 0) return;
      hapticSuccess();
      const now = Date.now();
      const newItems: ManualGroceryItem[] = missing.map((ing, idx) => ({
        id: `m-fridge-${now}-${idx}`,
        name: ing.name,
        amountLabel: `${ing.amount} ${ing.unit}`,
        aisle: ing.aisle,
        estimatedCostToman: ing.packCostToman,
        checked: false,
        ingredientCode: ing.code,
      }));
      setManualGroceryItems((prev) => [...newItems, ...prev]);
      showToast(`${missing.length} قلم کسری به لیست خرید اضافه شد`);
    },
    [showToast]
  );

  const removeManualGroceryItem = useCallback((manualId: string) => {
    hapticLight();
    setManualGroceryItems((prev) => prev.filter((item) => item.id !== manualId));
  }, []);

  const togglePantryStock = useCallback(
    (ingredientId: string) => {
      hapticLight();
      setPantry((prev) => {
        const exists = prev.some((p) => p.ingredientId === ingredientId);
        if (exists) {
          return prev.map((p) =>
            p.ingredientId === ingredientId ? { ...p, inStock: !p.inStock } : p
          );
        }
        const master = hydratedDb.ingredientsMap[ingredientId];
        if (!master) return prev;
        return [
          ...prev,
          {
            ingredientId: master.code,
            name: master.nameFa,
            aisle: master.aisle,
            inStock: true,
          },
        ];
      });
      showToast('موجودی خانه به‌روز شد');
    },
    [hydratedDb.ingredientsMap, showToast]
  );

  const setPantryItemsInStock = useCallback(
    (codes: string[], inStock: boolean) => {
      if (codes.length === 0) return;
      const codeSet = new Set(codes);
      setPantry((prev) => {
        const updated = prev.map((p) =>
          codeSet.has(p.ingredientId) ? { ...p, inStock } : p
        );
        const existingSet = new Set(prev.map((p) => p.ingredientId));
        for (const code of codes) {
          if (!existingSet.has(code)) {
            const master = hydratedDb.ingredientsMap[code];
            if (master) {
              updated.push({
                ingredientId: master.code,
                name: master.nameFa,
                aisle: master.aisle,
                inStock,
              });
            }
          }
        }
        return updated;
      });
    },
    [hydratedDb.ingredientsMap]
  );

  const toggleRecipeInCookbook = useCallback((cookbookId: string, recipeId: string) => {
    hapticLight();
    setCookbooks((prev) =>
      prev.map((cb) => {
        if (cb.id !== cookbookId) return cb;
        const exists = cb.recipeIds.includes(recipeId);
        return {
          ...cb,
          recipeIds: exists
            ? cb.recipeIds.filter((id) => id !== recipeId)
            : [...cb.recipeIds, recipeId],
        };
      })
    );
  }, []);

  const createCookbook = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      hapticMedium();
      setCookbooks((prev) => [
        ...prev,
        { id: `cb-${Date.now()}`, name: trimmed, recipeIds: [] },
      ]);
      showToast(`دفترچهٔ «${trimmed}» ساخته شد`);
    },
    [showToast]
  );

  const importCustomRecipe = useCallback(
    (title: string, sourceHint: string, rawIngredients: string[]): Recipe => {
      hapticSuccess();
      const cleanTitle = title.trim() || 'دستور خانگی من';
      const iconPool = Object.values(FOOD_ICONS);
      const chosenIcon = iconPool[ownerOverrides.customRecipes.length % iconPool.length];

      // Match raw Persian/English ingredient lines to canonical ING_* codes where possible
      const matchedUsages: Array<{ code: string; amount: number }> = [];
      for (const raw of rawIngredients) {
        const q = raw.trim().toLowerCase();
        if (!q) continue;
        const found = INGREDIENTS_MASTER.find(
          (i) =>
            i.code.toLowerCase() === q ||
            i.nameFa.toLowerCase().includes(q) ||
            q.includes(i.nameFa.split(' ')[0].toLowerCase()) ||
            i.nameEn.toLowerCase().includes(q)
        );
        if (found && !matchedUsages.some((u) => u.code === found.code)) {
          matchedUsages.push({
            code: found.code,
            amount: found.unit === 'گرم' ? 200 : found.unit === 'میلی‌لیتر' ? 200 : 2,
          });
        }
      }
      if (matchedUsages.length === 0) {
        matchedUsages.push(
          { code: 'ING_ONION', amount: 120 },
          { code: 'ING_TOMATO', amount: 200 },
          { code: 'ING_OLIVE_OIL', amount: 2 }
        );
      }

      const masterRecord: RecipeMasterRecord = {
        id: `custom-${Date.now()}`,
        title: cleanTitle,
        titleEn: cleanTitle,
        subtitle: sourceHint.trim() ? `واردشده از ${sourceHint.trim()}` : 'دستور شخصی ذخیره‌شده',
        cuisine: 'ایرانی',
        category: 'کوکو و خوراک',
        mainProtein: 'legume_plant',
        icon: chosenIcon,
        photoUrl: DISH_PHOTOS.stew_red,
        mealTypes: ['lunch', 'dinner'],
        baseServings: prefs.servings,
        prepMinutes: 15,
        cookMinutes: 30,
        caloriesPerServing: 440,
        proteinG: 24,
        carbsG: 48,
        fatG: 16,
        fiberG: 6,
        difficulty: 'آسان',
        diets: ['omnivore'],
        allergens: [],
        requiredAppliances: ['stovetop'],
        baseLabels: ['شخصی', 'واردشده'],
        searchAliases: [cleanTitle],
        isCustom: true,
        ingredients: matchedUsages,
        steps: [
          {
            template: 'مواد اولیه را آماده کنید و {0} را روی حرارت ملایم تفت دهید تا عطرش بلند شود.',
            ingredientIds: [matchedUsages[0].code],
            timerSeconds: 420,
          },
          {
            template: 'بقیه مواد و ادویه‌ها را بیفزایید و اجازه دهید غذا کاملاً جا بیفتد و داغ سرو کنید.',
            timerSeconds: 1200,
          },
        ],
      };

      setOwnerOverrides((prev) => ({
        ...prev,
        customRecipes: [masterRecord, ...prev.customRecipes],
      }));
      showToast(`دستور «${cleanTitle}» اضافه شد`);
      const hydrated = getHydratedCatalog({
        ...ownerOverrides,
        customRecipes: [masterRecord, ...ownerOverrides.customRecipes],
      }).recipes.find((r) => r.id === masterRecord.id)!;
      return hydrated;
    },
    [ownerOverrides, prefs.servings, showToast]
  );

  const addImportedRecipeRecord = useCallback(
    (record: RecipeMasterRecord): Recipe => {
      hapticSuccess();
      const iconPool = Object.values(FOOD_ICONS);
      const normalized: RecipeMasterRecord = {
        ...record,
        id: record.id || `ai-import-${Date.now()}`,
        icon:
          record.icon && record.icon.trim().length > 0
            ? record.icon
            : iconPool[ownerOverrides.customRecipes.length % iconPool.length],
        isCustom: true,
      };
      const nextOverrides: OwnerDatabaseOverrides = {
        ...ownerOverrides,
        customRecipes: [normalized, ...ownerOverrides.customRecipes],
      };
      setOwnerOverrides(nextOverrides);
      setCookbooks((prev) => {
        if (prev.length === 0) return prev;
        return prev.map((cb, idx) =>
          idx === 0 && !cb.recipeIds.includes(normalized.id)
            ? { ...cb, recipeIds: [normalized.id, ...cb.recipeIds] }
            : cb
        );
      });
      showToast(`«${normalized.title}» به دستورهای شما اضافه شد`);
      return getHydratedCatalog(nextOverrides).recipes.find((r) => r.id === normalized.id)!;
    },
    [ownerOverrides, showToast]
  );

  const updateIngredientPrice = useCallback(
    (code: string, unitPriceToman: number, packPriceToman: number) => {
      hapticLight();
      setOwnerOverrides((prev) => ({
        ...prev,
        ingredientPrices: {
          ...prev.ingredientPrices,
          [code]: {
            unitPriceToman: Math.max(1, Math.round(unitPriceToman)),
            packPriceToman: Math.max(1000, Math.round(packPriceToman)),
          },
        },
      }));
      const master = INGREDIENTS_MASTER.find((i) => i.code === code);
      showToast(`قیمت «${master?.nameFa ?? code}» در کل ۲۵۰ غذا به‌روزرسانی شد`);
    },
    [showToast]
  );

  const resetOwnerOverrides = useCallback(() => {
    hapticMedium();
    setOwnerOverrides(EMPTY_OWNER_OVERRIDES);
    showToast('قیمت‌های دستی حذف شد و قیمت روز بازار فعال است');
  }, [showToast]);

  const value: AppStateContextValue = {
    hydrated,
    onboarded,
    activeTab,
    selectedDay,
    selectedRecipeId,
    selectedRecipeServings,
    cookModeRecipeId,
    cookModeServings,
    prefs,
    ingredientsMaster,
    recipes,
    ownerOverrides,
    plan,
    planLocked,
    pantry,
    groceryList,
    costSummary,
    minWeeklyBudgetToman,
    cookbooks,
    cookedCount,
    recipeFeedback,
    toast,
    fridgeInitialSubTab,
    openFridgeCamera,
    openInventory,
    setActiveTab,
    goBackTab,
    registerBackHandler,
    handleBackNavigation,
    setSelectedDay,
    openRecipe,
    closeRecipe,
    startCookMode,
    closeCookMode,
    updatePrefs,
    completeOnboarding,
    restartOnboarding,
    togglePlanLock,
    regeneratePlan,
    swapMeal,
    addMealToPlan,
    removeMealFromPlan,
    markRecipeCooked,
    rateRecipe,
    toggleGroceryChecked,
    addManualGroceryItem,
    addMissingIngredientsToGrocery,
    removeManualGroceryItem,
    togglePantryStock,
    setPantryItemsInStock,
    toggleRecipeInCookbook,
    createCookbook,
    importCustomRecipe,
    addImportedRecipeRecord,
    updateIngredientPrice,
    resetOwnerOverrides,
    livePrices,
    isSyncingPrices,
    refreshLivePrices,
    showToast,
    dismissToast,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
