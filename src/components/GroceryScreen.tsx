import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AISLE_LABELS } from '../data/catalog';
import { getIngredientIconPath } from '../data/database/ingredientIcons';
import { useAppState } from '../context/AppStateContext';
import type { AisleCategory, ConsolidatedGroceryItem } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { ContextActionMenu, useLongPress, type ContextMenuAction } from './ContextActionMenu';
import {
  IconCaretLeft,
  IconChartBar,
  IconCheck,
  IconClose,
  IconMarketBasket,
  IconPantryShelf,
  IconPlus,
  IconSnowflake,
  IconTrash,
  IngredientIcon3D,
} from './icons/SofrehIcons';

const AISLE_ORDER: AisleCategory[] = [
  'protein',
  'produce',
  'dairy',
  'bread_grains',
  'pantry',
  'spices',
];

const AISLE_COLORS: Record<AisleCategory, string> = {
  protein: '#F04438',
  produce: '#5E8B42',
  dairy: '#3B82F6',
  bread_grains: '#D98A1C',
  pantry: '#8B5CF6',
  spices: '#C87955',
};

export const GroceryScreen: React.FC<{
  onOpenAddGrocery: () => void;
}> = ({ onOpenAddGrocery }) => {
  const {
    groceryList,
    costSummary,
    pantry,
    toggleGroceryChecked,
    togglePantryStock,
    removeManualGroceryItem,
    openInventory,
    registerBackHandler,
  } = useAppState();

  const [groupBy, setGroupBy] = useState<'aisle' | 'recipe'>('aisle');
  const [hideChecked, setHideChecked] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [contextItem, setContextItem] = useState<ConsolidatedGroceryItem | null>(null);

  useEffect(() => {
    if (!analyticsOpen && !contextItem) return;
    return registerBackHandler('grocery-analytics-sheet', () => {
      if (contextItem) {
        setContextItem(null);
        return true;
      }
      if (analyticsOpen) {
        setAnalyticsOpen(false);
        return true;
      }
      return false;
    });
  }, [analyticsOpen, contextItem, registerBackHandler]);

  const toBuyItems = useMemo(
    () => groceryList.filter((i) => !i.inPantry),
    [groceryList]
  );

  const coveredByPantryCount = useMemo(
    () => groceryList.filter((i) => i.inPantry).length,
    [groceryList]
  );

  const stockedPantryItems = useMemo(
    () => pantry.filter((p) => p.inStock),
    [pantry]
  );

  const visibleItems = useMemo(
    () => (hideChecked ? toBuyItems.filter((i) => !i.checked) : toBuyItems),
    [toBuyItems, hideChecked]
  );

  const groupedByAisle = useMemo(() => {
    const map = new Map<AisleCategory, ConsolidatedGroceryItem[]>();
    for (const a of AISLE_ORDER) map.set(a, []);
    for (const item of visibleItems) {
      map.get(item.aisle)?.push(item);
    }
    return AISLE_ORDER.map((aisle) => ({
      aisle,
      label: AISLE_LABELS[aisle],
      items: map.get(aisle) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [visibleItems]);

  const groupedByRecipe = useMemo(() => {
    const map = new Map<string, ConsolidatedGroceryItem[]>();
    for (const item of visibleItems) {
      for (const title of item.recipeTitles) {
        const list = map.get(title) ?? [];
        list.push(item);
        map.set(title, list);
      }
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [visibleItems]);

  const aisleBreakdown = useMemo(() => {
    const totals = new Map<AisleCategory, { cost: number; count: number }>();
    for (const a of AISLE_ORDER) totals.set(a, { cost: 0, count: 0 });
    for (const item of toBuyItems) {
      const entry = totals.get(item.aisle);
      if (entry) {
        entry.cost += item.shelfCostToman;
        entry.count += 1;
      }
    }
    const rows = AISLE_ORDER.map((aisle) => ({
      aisle,
      label: AISLE_LABELS[aisle],
      color: AISLE_COLORS[aisle],
      cost: totals.get(aisle)?.cost ?? 0,
      count: totals.get(aisle)?.count ?? 0,
    }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.cost - a.cost);
    const maxCost = Math.max(1, ...rows.map((r) => r.cost));
    return { rows, maxCost };
  }, [toBuyItems]);

  const checkedCount = toBuyItems.filter((i) => i.checked).length;
  const remainingCount = Math.max(0, toBuyItems.length - checkedCount);
  const progressPct =
    toBuyItems.length > 0 ? Math.round((checkedCount / toBuyItems.length) * 100) : 100;

  const remainingCostToman = useMemo(
    () =>
      toBuyItems
        .filter((i) => !i.checked)
        .reduce((sum, item) => sum + item.shelfCostToman, 0),
    [toBuyItems]
  );

  return (
    <div className="space-y-3.5">
      {/* CLEAN MINIMAL HEADER */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/90 backdrop-blur-md border-b border-white/60 safe-top">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display font-black text-2xl text-[#292B25]">
            لیست خرید
          </h1>

          {/* Desktop-only add button (mobile uses the floating dock + directly) */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onOpenAddGrocery}
            aria-label="افزودن قلم خرید"
            className="hidden lg:flex h-9 px-3.5 rounded-full coral-glass-pill text-white text-xs font-extrabold items-center gap-1.5"
          >
            <IconPlus size={15} />
            <span>قلم جدید</span>
          </motion.button>
        </div>
      </header>

      {/* SUPER-REACHABLE HOME INVENTORY BAR (Prominent, One-Tap Access) */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={openInventory}
        data-testid="grocery-home-inventory-btn"
        className="w-full rounded-[24px] bg-[#EEF5E9] hover:bg-[#E5F0DC] border border-[#5E8B42]/20 px-4 py-3 flex items-center justify-between gap-3 text-right transition shadow-[0_4px_14px_rgba(76,110,53,0.08)]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-[14px] bg-[#5E8B42] text-white flex items-center justify-center shrink-0 shadow-sm">
            <IconPantryShelf size={20} />
          </span>
          <div className="min-w-0">
            <div className="font-display font-black text-sm text-[#292B25]">
              موجودی خانه
            </div>
            <div className="text-[11px] font-bold text-[#4C6E35] tabular-nums-fa">
              {toFaDigits(stockedPantryItems.length)} قلم در یخچال
              {coveredByPantryCount > 0
                ? ` · ${toFaDigits(coveredByPantryCount)} مورد از خرید حذف شد`
                : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {stockedPantryItems.length > 0 && (
            <div className="flex items-center -space-x-2 space-x-reverse">
              {stockedPantryItems.slice(0, 3).map((item) => (
                <span
                  key={item.ingredientId}
                  className="w-8 h-8 rounded-full bg-white border-2 border-[#EEF5E9] flex items-center justify-center shadow-xs"
                >
                  <IngredientIcon3D
                    src={getIngredientIconPath(item.ingredientId, item.name)}
                    alt={item.name}
                    sizeClass="w-6 h-6"
                  />
                </span>
              ))}
            </div>
          )}
          <IconCaretLeft size={17} className="text-[#4C6E35]" />
        </div>
      </motion.button>

      {/* SIMPLE, AIRY CLICKABLE BASKET SUMMARY CARD (Tap for Charts & Breakdown) */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.985 }}
        onClick={() => setAnalyticsOpen(true)}
        data-testid="grocery-hero-dashboard"
        className="w-full text-right liquid-glass-card rounded-[28px] p-5 space-y-3.5 hover:border-[#F04438]/35 transition"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-[#75746E]">ماندهٔ سبد خرید</div>
            <div className="font-display font-black text-[28px] leading-tight text-[#292B25] tabular-nums-fa mt-0.5">
              {formatToman(remainingCostToman)}
            </div>
          </div>

          <span className="px-3 py-1.5 rounded-full bg-[#FFF0ED] text-[#F04438] text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0">
            <IconChartBar size={14} />
            <span>نمودار خرید</span>
            <IconCaretLeft size={13} />
          </span>
        </div>

        {/* Crisp Linear Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-2.5 bg-[#EFE4D8] rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                progressPct === 100
                  ? 'bg-[#5E8B42]'
                  : 'bg-gradient-to-l from-[#FF6A5C] to-[#F04438]'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-extrabold tabular-nums-fa">
            <span className="text-[#5C5952]">
              {remainingCount === 0
                ? 'خرید کامل شد!'
                : `${toFaDigits(remainingCount)} قلم مانده از ${toFaDigits(toBuyItems.length)}`}
            </span>
            <span className="text-[#F04438]">{toFaDigits(progressPct)}٪</span>
          </div>
        </div>
      </motion.button>

      {/* CLEAN SEPARATED FILTER & GROUPING STRIP */}
      <div className="flex items-center justify-between gap-2">
        <div className="liquid-glass rounded-full p-1 inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setGroupBy('aisle')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition ${
              groupBy === 'aisle' ? 'bg-[#292B25] text-white shadow-xs' : 'text-[#5C5952]'
            }`}
          >
            قفسه
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('recipe')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition ${
              groupBy === 'recipe' ? 'bg-[#292B25] text-white shadow-xs' : 'text-[#5C5952]'
            }`}
          >
            غذا
          </button>
        </div>

        <button
          type="button"
          onClick={() => setHideChecked((v) => !v)}
          className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition ${
            hideChecked
              ? 'coral-glass-pill text-white'
              : 'liquid-glass text-[#5C5952]'
          }`}
        >
          {hideChecked ? 'نمایش همه' : 'فقط مانده‌ها'}
        </button>
      </div>

      {/* GROCERY ANALYTICS SHEET (Opens when tapping the Summary Card) */}
      <AnimatePresence>
        {analyticsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAnalyticsOpen(false)}
            className="fixed inset-0 z-50 bg-[#292B25]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="grocery-analytics-sheet"
              className="w-full sm:max-w-lg max-h-[85dvh] bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] flex flex-col shadow-2xl border border-white overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#EFE4D8]">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center">
                    <IconChartBar size={19} />
                  </span>
                  <h3 className="font-display font-black text-xl text-[#292B25]">
                    نمودار خرید هفته
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsOpen(false)}
                  aria-label="بستن"
                  className="w-9 h-9 rounded-full bg-white text-[#292B25] flex items-center justify-center shadow-sm"
                >
                  <IconClose size={17} />
                </button>
              </div>

              <div className="overflow-y-auto p-5 space-y-5 flex-1">
                {/* Summary Tiles */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="liquid-glass-card rounded-[22px] p-3.5 space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#75746E]">
                      <IconMarketBasket size={14} className="text-[#F04438]" />
                      کل خرید سوپرمارکت
                    </div>
                    <div className="font-display font-black text-base text-[#292B25] tabular-nums-fa">
                      {formatToman(costSummary.shelfCheckoutCostToman)}
                    </div>
                  </div>
                  <div className="rounded-[22px] bg-[#EEF5E9] border border-[#5E8B42]/20 p-3.5 space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4C6E35]">
                      <IconSnowflake size={14} />
                      ذخیره برای هفته بعد
                    </div>
                    <div className="font-display font-black text-base text-[#4C6E35] tabular-nums-fa">
                      {formatToman(costSummary.leftoverFridgeValueToman)}
                    </div>
                  </div>
                </div>

                {/* Aisle Spend Breakdown Horizontal Bar Chart */}
                <div className="liquid-glass-card rounded-[26px] p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-black text-sm text-[#292B25]">
                      سهم هر قفسه از هزینه
                    </span>
                    <span className="text-[11px] font-bold text-[#75746E] tabular-nums-fa">
                      {toFaDigits(toBuyItems.length)} قلم
                    </span>
                  </div>

                  <div className="space-y-3">
                    {aisleBreakdown.rows.map((row) => {
                      const pct = Math.max(8, Math.round((row.cost / aisleBreakdown.maxCost) * 100));
                      return (
                        <div key={row.aisle} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-[#292B25]">
                              {row.label}
                              <span className="text-[10px] text-[#8C867E] font-bold mr-1.5 tabular-nums-fa">
                                ({toFaDigits(row.count)})
                              </span>
                            </span>
                            <span className="font-extrabold text-[#292B25] tabular-nums-fa">
                              {formatToman(row.cost)}
                            </span>
                          </div>
                          <div className="h-2.5 bg-[#EFE4D8] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: row.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Jump to Home Inventory */}
                <button
                  type="button"
                  onClick={() => {
                    setAnalyticsOpen(false);
                    openInventory();
                  }}
                  className="w-full h-12 rounded-full bg-[#5E8B42] text-white font-display font-black text-sm flex items-center justify-center gap-2"
                >
                  <IconPantryShelf size={17} />
                  <span>مدیریت موجودی خانه ({toFaDigits(stockedPantryItems.length)} قلم)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GROCERY LIST WITH TRANSPARENT 3D INGREDIENT ICONS */}
      {toBuyItems.length === 0 ? (
        <div className="liquid-glass-card rounded-[28px] p-8 text-center space-y-3">
          <div className="font-display font-black text-lg text-[#292B25]">
            همه در خانه موجودند
          </div>
          <button
            type="button"
            onClick={openInventory}
            className="px-4 py-2 rounded-full bg-[#68734E] text-white text-xs font-extrabold"
          >
            مدیریت موجودی خانه
          </button>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="liquid-glass-card rounded-[28px] p-7 text-center space-y-2.5">
          <div className="font-display font-black text-lg text-[#68734E]">
            همهٔ اقلام تیک خوردند!
          </div>
          <button
            type="button"
            onClick={() => setHideChecked(false)}
            className="px-4 py-2 rounded-full bg-[#292B25] text-white text-xs font-extrabold"
          >
            نمایش لیست کامل
          </button>
        </div>
      ) : groupBy === 'aisle' ? (
        <div className="space-y-3.5">
          {groupedByAisle.map((group) => (
            <section key={group.aisle} className="liquid-glass-card rounded-[26px] p-4 space-y-1.5">
              <div className="flex items-center justify-between pb-1.5">
                <h2 className="font-display font-black text-base text-[#292B25]">
                  {group.label}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F3E9DE] text-[11px] font-extrabold text-[#5C5952] tabular-nums-fa">
                  {toFaDigits(group.items.length)} قلم
                </span>
              </div>

              <div className="divide-y divide-[#F0E6DA]">
                {group.items.map((item) => (
                  <GroceryItemRow
                    key={item.ingredientId}
                    item={item}
                    onToggleCheck={() =>
                      toggleGroceryChecked(item.ingredientId, item.isManual, item.manualId)
                    }
                    onMoveToPantry={() => togglePantryStock(item.ingredientId)}
                    onDeleteManual={
                      item.manualId ? () => removeManualGroceryItem(item.manualId!) : undefined
                    }
                    onLongPress={() => setContextItem(item)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {groupedByRecipe.map((group) => (
            <section key={group.title} className="liquid-glass-card rounded-[26px] p-4 space-y-1.5">
              <div className="flex items-center justify-between pb-1.5">
                <h2 className="font-display font-black text-base text-[#292B25]">
                  {group.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F3E9DE] text-[11px] font-extrabold text-[#5C5952] tabular-nums-fa">
                  {toFaDigits(group.items.length)} قلم
                </span>
              </div>
              <div className="divide-y divide-[#F0E6DA]">
                {group.items.map((item) => (
                  <GroceryItemRow
                    key={`${group.title}-${item.ingredientId}`}
                    item={item}
                    onToggleCheck={() =>
                      toggleGroceryChecked(item.ingredientId, item.isManual, item.manualId)
                    }
                    onMoveToPantry={() => togglePantryStock(item.ingredientId)}
                    onDeleteManual={
                      item.manualId ? () => removeManualGroceryItem(item.manualId!) : undefined
                    }
                    onLongPress={() => setContextItem(item)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* LONG-PRESS CONTEXT MENU FOR GROCERY ITEMS */}
      <ContextActionMenu
        open={Boolean(contextItem)}
        preview={
          contextItem
            ? {
                title: contextItem.name,
                subtitle: `${toFaDigits(contextItem.isManual ? contextItem.formattedAmount : contextItem.packLabel)} · ${formatToman(contextItem.shelfCostToman)}`,
                iconSrc: getIngredientIconPath(contextItem.ingredientId, contextItem.name),
                iconKind: 'ingredient3d',
              }
            : null
        }
        actions={
          contextItem
            ? ((): ContextMenuAction[] => {
                const list: ContextMenuAction[] = [
                  {
                    id: 'toggle-check',
                    label: contextItem.checked ? 'بازگردانی به لیست خرید' : 'علامت به عنوان خریده شد',
                    icon: <IconCheck size={18} />,
                    tone: 'accent',
                    onSelect: () =>
                      toggleGroceryChecked(
                        contextItem.ingredientId,
                        contextItem.isManual,
                        contextItem.manualId
                      ),
                  },
                ];
                if (!contextItem.isManual) {
                  list.push({
                    id: 'in-pantry',
                    label: 'در خانه دارم (انتقال به یخچال)',
                    icon: <IconPantryShelf size={18} />,
                    tone: 'positive',
                    onSelect: () => togglePantryStock(contextItem.ingredientId),
                  });
                }
                if (contextItem.manualId) {
                  list.push({
                    id: 'delete-manual',
                    label: 'حذف از لیست خرید',
                    icon: <IconTrash size={18} />,
                    tone: 'danger',
                    onSelect: () => removeManualGroceryItem(contextItem.manualId!),
                  });
                }
                return list;
              })()
            : []
        }
        onClose={() => setContextItem(null)}
      />
    </div>
  );
};

const GroceryItemRow: React.FC<{
  item: ConsolidatedGroceryItem;
  onToggleCheck: () => void;
  onMoveToPantry: () => void;
  onDeleteManual?: () => void;
  onLongPress: () => void;
}> = ({ item, onToggleCheck, onMoveToPantry, onDeleteManual, onLongPress }) => {
  const iconSrc = getIngredientIconPath(item.ingredientId, item.name);
  const { handlers, consumeLongPress } = useLongPress(onLongPress);

  const handleToggle = () => {
    if (consumeLongPress()) return;
    onToggleCheck();
  };

  return (
    <div
      {...handlers}
      className={`py-2.5 flex items-center justify-between gap-2 transition-opacity select-none ${
        item.checked ? 'opacity-45' : ''
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={handleToggle}
          aria-label={`تیک ${item.name}`}
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition active:scale-90 ${
            item.checked
              ? 'bg-[#68734E] text-white'
              : 'border-2 border-[#D4C7B8] bg-white'
          }`}
        >
          {item.checked && <IconCheck size={13} />}
        </button>

        {/* Transparent-background 3D cartoony ingredient icon */}
        <IngredientIcon3D
          src={iconSrc}
          alt={item.name}
          sizeClass="w-10 h-10"
        />

        <button
          type="button"
          onClick={handleToggle}
          className="min-w-0 text-right flex-1 space-y-0.5"
        >
          <div
            className={`font-extrabold text-[13.5px] text-[#292B25] leading-snug ${
              item.checked ? 'line-through' : ''
            }`}
          >
            {item.name}
          </div>
          <div className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] tabular-nums-fa">
            <span className="font-bold text-[#5C5952]">
              {toFaDigits(item.isManual ? item.formattedAmount : item.packLabel)}
            </span>
            <span className="text-[#C8BFB3]">·</span>
            <span className="font-display font-black text-[#292B25]">
              {formatToman(item.shelfCostToman)}
            </span>
          </div>
          {!item.isManual && item.consumptionCostToman < item.shelfCostToman * 0.85 && (
            <div className="text-[10.5px] font-bold text-[#8C867E] tabular-nums-fa">
              مصرف هفته: {toFaDigits(item.formattedAmount)} ({formatToman(item.consumptionCostToman)})
            </div>
          )}
        </button>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!item.isManual && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onMoveToPantry}
            data-testid={`have-at-home-${item.ingredientId}`}
            className="h-8 px-2.5 rounded-full bg-[#EEF2E6] hover:bg-[#E1E9D2] text-[#4C5736] text-[11px] font-extrabold flex items-center gap-1 transition"
          >
            <IconPantryShelf size={13} />
            <span>دارم</span>
          </motion.button>
        )}
        {onDeleteManual && (
          <button
            type="button"
            onClick={onDeleteManual}
            aria-label="حذف"
            className="w-8 h-8 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center"
          >
            <IconTrash size={14} />
          </button>
        )}
      </div>
    </div>
  );
};
