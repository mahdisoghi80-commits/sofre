import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChefHat } from '@phosphor-icons/react';
import { AISLE_LABELS, DAY_NAMES_FULL, MEAL_SLOT_LABELS } from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type {
  AisleCategory,
  AppTab,
  MealSlotType,
  RecipeMasterRecord,
} from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { postApiJson } from '../utils/api';
import { searchRecipes } from '../utils/planner';
import {
  getCuisineFlag,
  Icon3D,
  IconAlert,
  IconCalendarPlus,
  IconClose,
  IconCookbook,
  IconCrown,
  IconFridgeLens,
  IconLinkMagic,
  IconMarketBasket,
  IconPlus,
  IconProfile,
  IconSearch,
  IconSofrehPlan,
  IconSparkle,
  IconUndo,
  MEAL_SLOT_THEMES,
  MealSlotIcon,
  SofrehLogoMark,
} from './icons/SofrehIcons';

export type ActiveSheetType =
  | null
  | { type: 'quick_actions' }
  | { type: 'add_meal'; dayIndex: number }
  | { type: 'add_grocery' }
  | { type: 'import_recipe' };

const TABS: Array<{
  id: AppTab;
  label: string;
  renderIcon: (active: boolean) => React.ReactNode;
}> = [
  { id: 'plan', label: 'برنامه', renderIcon: (a) => <IconSofrehPlan size={19} filled={a} /> },
  { id: 'shop', label: 'خرید', renderIcon: (a) => <IconMarketBasket size={19} filled={a} /> },
  { id: 'scan', label: 'یخچال', renderIcon: (a) => <IconFridgeLens size={19} filled={a} /> },
  { id: 'book', label: 'دستورها', renderIcon: (a) => <IconCookbook size={19} filled={a} /> },
  { id: 'me', label: 'من', renderIcon: (a) => <IconProfile size={19} filled={a} /> },
];

export const DesktopSidebar: React.FC<{
  onOpenSheet: (sheet: ActiveSheetType) => void;
  onOpenChefChat?: () => void;
  onOpenSubscription?: () => void;
}> = ({ onOpenSheet, onOpenChefChat, onOpenSubscription }) => {
  const { activeTab, setActiveTab, costSummary, prefs } = useAppState();

  return (
    <aside className="hidden lg:flex flex-col w-[248px] shrink-0 sticky top-0 h-dvh p-4 border-l border-white/75 bg-white/48 backdrop-blur-2xl justify-between">
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 pt-2">
          <SofrehLogoMark className="w-10 h-10 shrink-0 shadow-sm" />
          <div className="font-display font-black text-2xl text-[#292B25] leading-none">
            سفره
          </div>
        </div>

        <nav className="space-y-1.5">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full h-12 px-4 rounded-full flex items-center gap-3 text-sm font-extrabold transition-all ${
                  active
                    ? 'coral-glass-pill text-white'
                    : 'text-[#5C5952] hover:bg-white/75 hover:text-[#292B25]'
                }`}
              >
                {tab.renderIcon(active)}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onOpenSheet({ type: 'quick_actions' })}
            className="w-full h-11 rounded-full bg-[#292B25] text-white text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-black transition shadow-lg"
          >
            <IconPlus size={18} />
            <span>افزودن سریع</span>
          </button>
          {onOpenChefChat && (
            <button
              type="button"
              onClick={onOpenChefChat}
              data-testid="sidebar-open-chef-chat"
              className="w-full h-11 px-4 rounded-full liquid-glass text-[#292B25] text-xs font-extrabold flex items-center justify-center gap-2 hover:text-[#F04438] transition"
            >
              <ChefHat size={17} weight="fill" className="text-[#F04438]" />
              <span>سرآشپز هوشمند</span>
            </button>
          )}
          {onOpenSubscription && (
            <button
              type="button"
              onClick={onOpenSubscription}
              data-testid="sidebar-open-subscription"
              className={`w-full h-11 px-4 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                prefs.isPro
                  ? 'bg-[#292B25] text-[#F5C563]'
                  : 'coral-glass-pill text-white'
              }`}
            >
              <IconCrown size={16} />
              <span>{prefs.isPro ? 'اشتراک ویژه فعال' : 'خرید اشتراک'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="liquid-glass-card rounded-[24px] p-4 space-y-2">
        <div className="text-[11px] font-bold text-[#75746E]">بودجهٔ هفته</div>
        <div className="font-display font-black text-lg text-[#292B25] tabular-nums-fa">
          {formatToman(costSummary.consumptionCostToman)}
        </div>
        <div className="h-1.5 bg-[#EFE4D8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F04438] rounded-full"
            style={{ width: `${Math.min(100, costSummary.budgetPercent)}%` }}
          />
        </div>
      </div>
    </aside>
  );
};

/**
 * STRICTLY LOCKED FLOATING LIQUID GLASS BOTTOM BAR (Slightly more transparent .liquid-glass-nav)
 */
export const MobileBottomNav: React.FC<{
  onOpenSheet: (sheet: ActiveSheetType) => void;
}> = ({ onOpenSheet }) => {
  const { activeTab, setActiveTab } = useAppState();

  return (
    <div
      data-testid="mobile-bottom-nav"
      className="lg:hidden fixed bottom-3 inset-x-3 z-40 safe-bottom pointer-events-none"
    >
      <div className="max-w-md mx-auto flex items-center gap-2 pointer-events-auto">
        <nav className="flex-1 liquid-glass-nav rounded-full p-1.5 grid grid-cols-5 gap-0.5">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                data-testid={`nav-tab-${tab.id}`}
                className="relative py-2 rounded-full flex flex-col items-center justify-center gap-0.5 transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="mobileNavActivePill"
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className="absolute inset-0 rounded-full coral-glass-pill"
                  />
                )}
                <span
                  className={`relative z-10 ${
                    active ? 'text-white' : 'text-[#5C5952]'
                  }`}
                >
                  {tab.renderIcon(active)}
                </span>
                <span
                  className={`relative z-10 text-[10px] font-extrabold ${
                    active ? 'text-white' : 'text-[#5C5952]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88, rotate: 90 }}
          onClick={() =>
            onOpenSheet(
              activeTab === 'shop' ? { type: 'add_grocery' } : { type: 'quick_actions' }
            )
          }
          aria-label={activeTab === 'shop' ? 'افزودن قلم خرید' : 'افزودن سریع'}
          data-testid="mobile-dock-plus-btn"
          className="w-13 h-13 rounded-full coral-glass-pill text-white flex items-center justify-center shrink-0 border border-white/40"
        >
          <IconPlus size={22} />
        </motion.button>
      </div>
    </div>
  );
};

export const ActionSheetsAndToast: React.FC<{
  activeSheet: ActiveSheetType;
  setActiveSheet: (s: ActiveSheetType) => void;
  onOpenChefChat?: () => void;
}> = ({ activeSheet, setActiveSheet, onOpenChefChat }) => {
  const {
    recipes,
    selectedDay,
    toast,
    dismissToast,
    addMealToPlan,
    addManualGroceryItem,
    importCustomRecipe,
    addImportedRecipeRecord,
    openRecipe,
    setActiveTab,
  } = useAppState();

  const [mealSearch, setMealSearch] = useState('');
  const [mealSlot, setMealSlot] = useState<MealSlotType>('dinner');

  const [groceryName, setGroceryName] = useState('');
  const [groceryAmount, setGroceryAmount] = useState('۱ بسته');
  const [groceryAisle, setGroceryAisle] = useState<AisleCategory>('produce');
  const [groceryCost, setGroceryCost] = useState('65000');

  // AI Link Importer State
  const [importMode, setImportMode] = useState<'link' | 'manual'>('link');
  const [importUrl, setImportUrl] = useState('');
  const [importNotes, setImportNotes] = useState('');
  const [importingAI, setImportingAI] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [manualTitle, setManualTitle] = useState('');
  const [manualIngs, setManualIngs] = useState('');

  const matchingMeals = useMemo(() => {
    return searchRecipes(recipes, mealSearch).slice(0, 24);
  }, [recipes, mealSearch]);

  const handleAIRecipeImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl.trim() && !importNotes.trim()) return;
    setImportingAI(true);
    setImportError(null);
    try {
      const resp = await postApiJson<{
        recipe?: RecipeMasterRecord;
        error?: string;
      }>('/api/import-recipe', {
        url: importUrl.trim(),
        notes: importNotes.trim(),
      });
      if (!resp.ok || !resp.data.recipe) {
        throw new Error(
          resp.data.error ||
            'اتصال به سرور هوش مصنوعی برقرار نشد. مطمئن شوید نسخه سرور اپ منتشر شده است.'
        );
      }
      const created = addImportedRecipeRecord(resp.data.recipe);
      setImportUrl('');
      setImportNotes('');
      setActiveSheet(null);
      openRecipe(created.id);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : 'خطا در دریافت دستور غذا از لینک.'
      );
    } finally {
      setImportingAI(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            className="fixed bottom-22 lg:bottom-6 left-4 right-4 lg:right-auto lg:left-6 z-50 pointer-events-none flex justify-center lg:justify-start"
          >
            <div className="pointer-events-auto liquid-glass-dark text-white rounded-full px-4 py-2.5 flex items-center gap-3 max-w-md">
              <span className="text-xs font-bold leading-relaxed">{toast.text}</span>
              {toast.undoLabel && toast.onUndo && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo?.();
                    dismissToast();
                  }}
                  className="px-3 py-1 rounded-full coral-glass-pill text-white text-xs font-extrabold flex items-center gap-1 shrink-0"
                >
                  <IconUndo size={13} />
                  <span>{toast.undoLabel}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSheet(null)}
            className="fixed inset-0 z-50 bg-[#292B25]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg max-h-[85dvh] bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] p-5 flex flex-col shadow-2xl border border-white"
            >
              {/* QUICK ACTIONS */}
              {activeSheet.type === 'quick_actions' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-xl text-[#292B25]">
                      افزودن سریع
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      aria-label="بستن"
                      className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
                    >
                      <IconClose size={17} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActiveSheet({ type: 'add_meal', dayIndex: selectedDay })}
                      className="liquid-glass-card rounded-[24px] p-4 text-right space-y-2"
                    >
                      <span className="w-10 h-10 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center">
                        <IconCalendarPlus size={19} />
                      </span>
                      <div className="font-display font-black text-sm text-[#292B25]">
                        افزودن وعده
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSheet({ type: 'add_grocery' })}
                      className="liquid-glass-card rounded-[24px] p-4 text-right space-y-2"
                    >
                      <span className="w-10 h-10 rounded-full bg-[#EEF2E6] text-[#68734E] flex items-center justify-center">
                        <IconMarketBasket size={19} />
                      </span>
                      <div className="font-display font-black text-sm text-[#292B25]">
                        افزودن قلم خرید
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSheet(null);
                        setActiveTab('scan');
                      }}
                      className="liquid-glass-card rounded-[24px] p-4 text-right space-y-2"
                    >
                      <span className="w-10 h-10 rounded-full bg-[#292B25] text-white flex items-center justify-center">
                        <IconFridgeLens size={19} />
                      </span>
                      <div className="font-display font-black text-sm text-[#292B25]">
                        دوربین یخچال
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSheet({ type: 'import_recipe' })}
                      className="liquid-glass-card rounded-[24px] p-4 text-right space-y-2"
                    >
                      <span className="w-10 h-10 rounded-full bg-[#FFF0ED] text-[#C87955] flex items-center justify-center">
                        <IconLinkMagic size={19} />
                      </span>
                      <div className="font-display font-black text-sm text-[#292B25]">
                        وارد کردن با لینک
                      </div>
                    </button>
                    {onOpenChefChat && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSheet(null);
                          onOpenChefChat();
                        }}
                        data-testid="quick-action-chef-chat"
                        className="col-span-2 liquid-glass-card rounded-[24px] p-4 text-right flex items-center gap-3"
                      >
                        <span className="w-10 h-10 rounded-full coral-glass-pill text-white flex items-center justify-center shrink-0">
                          <ChefHat size={19} weight="fill" />
                        </span>
                        <div className="font-display font-black text-sm text-[#292B25]">
                          سرآشپز هوشمند
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ADD MEAL */}
              {activeSheet.type === 'add_meal' && (
                <div className="flex flex-col max-h-[76dvh] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-xl text-[#292B25]">
                      وعده برای {DAY_NAMES_FULL[activeSheet.dayIndex]}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      aria-label="بستن"
                      className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
                    >
                      <IconClose size={17} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(['breakfast', 'lunch', 'dinner'] as MealSlotType[]).map((s) => {
                      const theme = MEAL_SLOT_THEMES[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setMealSlot(s)}
                          className={`py-2.5 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                            mealSlot === s
                              ? theme.activePill
                              : `${theme.badgeBg} ${theme.badgeText}`
                          }`}
                        >
                          <MealSlotIcon slot={s} size={14} filled={mealSlot === s} />
                          <span>{MEAL_SLOT_LABELS[s]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <IconSearch
                      size={16}
                      className="text-[#75746E] absolute right-3.5 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      value={mealSearch}
                      onChange={(e) => setMealSearch(e.target.value)}
                      placeholder="جستجوی غذا…"
                      className="w-full h-11 pr-10 pl-3 rounded-full bg-white border border-[#E6DACD] text-xs font-bold focus:outline-none focus:border-[#F04438]"
                    />
                  </div>

                  <div className="overflow-y-auto space-y-2 flex-1">
                    {matchingMeals.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          addMealToPlan(activeSheet.dayIndex, mealSlot, r.id);
                          setActiveSheet(null);
                        }}
                        className="w-full bg-white rounded-2xl p-2.5 flex items-center gap-3 text-right hover:border-[#F04438] border border-transparent shadow-sm"
                      >
                        <Icon3D
                          src={r.icon}
                          alt={r.title}
                          sizeClass="w-12 h-12"
                          roundedClass="rounded-[14px]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-sm text-[#292B25] truncate flex items-center gap-1.5">
                            <span>{getCuisineFlag(r.cuisine)}</span>
                            <span className="truncate">{r.title}</span>
                          </div>
                          <div className="text-[11px] text-[#75746E] tabular-nums-fa">
                            {toFaDigits(r.prepMinutes + r.cookMinutes)} دقیقه •{' '}
                            {formatToman(r.costPerServingToman)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ADD MANUAL GROCERY */}
              {activeSheet.type === 'add_grocery' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!groceryName.trim()) return;
                    addManualGroceryItem(
                      groceryName,
                      groceryAmount,
                      groceryAisle,
                      Number(groceryCost) || 0
                    );
                    setGroceryName('');
                    setActiveSheet(null);
                  }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-xl text-[#292B25]">
                      افزودن قلم خرید
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      aria-label="بستن"
                      className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
                    >
                      <IconClose size={17} />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    value={groceryName}
                    onChange={(e) => setGroceryName(e.target.value)}
                    placeholder="نام کالا (مثلاً لیموترش تازه)"
                    className="w-full h-11 px-4 rounded-2xl bg-white border border-[#E6DACD] text-sm font-bold focus:outline-none focus:border-[#F04438]"
                  />

                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={groceryAmount}
                      onChange={(e) => setGroceryAmount(e.target.value)}
                      placeholder="مقدار"
                      className="h-11 px-3.5 rounded-2xl bg-white border border-[#E6DACD] text-xs font-bold"
                    />
                    <input
                      type="number"
                      value={groceryCost}
                      onChange={(e) => setGroceryCost(e.target.value)}
                      placeholder="قیمت (تومان)"
                      className="h-11 px-3.5 rounded-2xl bg-white border border-[#E6DACD] text-xs font-bold tabular-nums-fa"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(AISLE_LABELS) as AisleCategory[]).map((aisle) => (
                      <button
                        key={aisle}
                        type="button"
                        onClick={() => setGroceryAisle(aisle)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                          groceryAisle === aisle
                            ? 'bg-[#292B25] text-white'
                            : 'bg-white text-[#5C5952]'
                        }`}
                      >
                        {AISLE_LABELS[aisle]}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full h-13 rounded-full btn-shimmer text-white font-display font-black text-base"
                  >
                    افزودن به لیست
                  </button>
                </form>
              )}

              {/* REAL AI RECIPE LINK IMPORTER + MANUAL TAB */}
              {activeSheet.type === 'import_recipe' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-black text-xl text-[#292B25]">
                      افزودن دستور جدید
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      aria-label="بستن"
                      className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
                    >
                      <IconClose size={17} />
                    </button>
                  </div>

                  <div className="liquid-glass rounded-full p-1 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setImportMode('link')}
                      className={`py-2 rounded-full text-xs font-extrabold transition ${
                        importMode === 'link'
                          ? 'coral-glass-pill text-white'
                          : 'text-[#5C5952]'
                      }`}
                    >
                      لینک هوشمند
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('manual')}
                      className={`py-2 rounded-full text-xs font-extrabold transition ${
                        importMode === 'manual'
                          ? 'coral-glass-pill text-white'
                          : 'text-[#5C5952]'
                      }`}
                    >
                      دستی
                    </button>
                  </div>

                  {importMode === 'link' ? (
                    <form onSubmit={handleAIRecipeImport} className="space-y-3.5">
                      <input
                        type="url"
                        dir="ltr"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        data-testid="ai-import-url-input"
                        placeholder="https://example.com/recipe/..."
                        className="w-full h-12 px-4 rounded-2xl bg-white border border-[#E6DACD] text-sm font-bold text-left focus:outline-none focus:border-[#F04438]"
                      />
                      <textarea
                        rows={2}
                        value={importNotes}
                        onChange={(e) => setImportNotes(e.target.value)}
                        placeholder="متن دستور (اختیاری)…"
                        className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DACD] text-xs font-medium focus:outline-none focus:border-[#F04438]"
                      />

                      {importError && (
                        <div className="rounded-2xl bg-[#FFF0ED] text-[#B42318] px-3.5 py-2.5 text-xs font-bold flex items-center gap-2">
                          <IconAlert size={16} className="shrink-0" />
                          <span>{importError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={importingAI || (!importUrl.trim() && !importNotes.trim())}
                        data-testid="ai-import-submit-btn"
                        className="w-full h-13 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <IconSparkle size={18} className={importingAI ? 'animate-spin' : ''} />
                        <span>{importingAI ? 'در حال استخراج…' : 'استخراج دستور'}</span>
                      </button>
                    </form>
                  ) : (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!manualTitle.trim()) return;
                        const created = importCustomRecipe(
                          manualTitle,
                          '',
                          manualIngs
                            .split(/[\n،,]/)
                            .map((s) => s.trim())
                            .filter(Boolean)
                        );
                        setManualTitle('');
                        setManualIngs('');
                        setActiveSheet(null);
                        openRecipe(created.id);
                      }}
                      className="space-y-3"
                    >
                      <input
                        type="text"
                        required
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="نام غذا"
                        className="w-full h-11 px-4 rounded-2xl bg-white border border-[#E6DACD] text-sm font-bold focus:outline-none focus:border-[#F04438]"
                      />
                      <textarea
                        rows={3}
                        value={manualIngs}
                        onChange={(e) => setManualIngs(e.target.value)}
                        placeholder="مواد اولیه (با ویرگول جدا کن: مرغ، برنج، زعفران…)"
                        className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DACD] text-xs font-medium focus:outline-none focus:border-[#F04438]"
                      />
                      <button
                        type="submit"
                        className="w-full h-13 rounded-full btn-shimmer text-white font-display font-black text-base"
                      >
                        ذخیره دستور
                      </button>
                    </form>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
