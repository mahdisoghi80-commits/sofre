import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { AISLE_LABELS } from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type { AisleCategory, ConsolidatedGroceryItem } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import {
  IconCheck,
  IconPantryShelf,
  IconPlus,
  IconTrash,
} from './icons/SofrehIcons';

const AISLE_ORDER: AisleCategory[] = [
  'protein',
  'produce',
  'dairy',
  'bread_grains',
  'pantry',
  'spices',
];

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
  } = useAppState();

  const [groupBy, setGroupBy] = useState<'aisle' | 'recipe'>('aisle');

  const toBuyItems = useMemo(
    () => groceryList.filter((i) => !i.inPantry),
    [groceryList]
  );

  const inHomeCount = useMemo(
    () => pantry.filter((p) => p.inStock).length,
    [pantry]
  );

  const groupedByAisle = useMemo(() => {
    const map = new Map<AisleCategory, ConsolidatedGroceryItem[]>();
    for (const a of AISLE_ORDER) map.set(a, []);
    for (const item of toBuyItems) {
      map.get(item.aisle)?.push(item);
    }
    return AISLE_ORDER.map((aisle) => ({
      aisle,
      label: AISLE_LABELS[aisle],
      items: map.get(aisle) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [toBuyItems]);

  const groupedByRecipe = useMemo(() => {
    const map = new Map<string, ConsolidatedGroceryItem[]>();
    for (const item of toBuyItems) {
      for (const title of item.recipeTitles) {
        const list = map.get(title) ?? [];
        list.push(item);
        map.set(title, list);
      }
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [toBuyItems]);

  const checkedCount = toBuyItems.filter((i) => i.checked).length;

  return (
    <div className="space-y-4">
      {/* CLEAN MINIMAL HEADER */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/84 backdrop-blur-xl border-b border-white/60 safe-top">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display font-black text-2xl text-[#292B25]">
            لیست خرید
          </h1>

          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={openInventory}
              className="h-9 px-3.5 rounded-full liquid-glass text-[#292B25] text-xs font-extrabold flex items-center gap-1.5"
            >
              <IconPantryShelf size={15} className="text-[#68734E]" />
              <span>موجودی خانه ({toFaDigits(inHomeCount)})</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={onOpenAddGrocery}
              aria-label="افزودن قلم خرید"
              className="w-9 h-9 rounded-full coral-glass-pill text-white flex items-center justify-center"
            >
              <IconPlus size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      {/* UNCLUTTERED SUMMARY + GROUPING TOGGLE */}
      <section className="liquid-glass-card rounded-[28px] p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-[#75746E]">
              جمع خرید ({toFaDigits(toBuyItems.length)} قلم)
            </div>
            <div className="font-display font-black text-2xl text-[#292B25] tabular-nums-fa mt-0.5">
              {formatToman(costSummary.shelfCheckoutCostToman)}
            </div>
          </div>

          <div className="liquid-glass rounded-full p-1 flex shrink-0">
            <button
              type="button"
              onClick={() => setGroupBy('aisle')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition ${
                groupBy === 'aisle' ? 'bg-[#292B25] text-white' : 'text-[#75746E]'
              }`}
            >
              قفسه
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('recipe')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition ${
                groupBy === 'recipe' ? 'bg-[#292B25] text-white' : 'text-[#75746E]'
              }`}
            >
              غذا
            </button>
          </div>
        </div>

        {/* Thin progress strip */}
        {toBuyItems.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-[#EFE4D8] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#68734E] rounded-full transition-all"
                style={{ width: `${(checkedCount / Math.max(1, toBuyItems.length)) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-extrabold text-[#68734E] tabular-nums-fa">
              {toFaDigits(checkedCount)}/{toFaDigits(toBuyItems.length)}
            </span>
          </div>
        )}
      </section>

      {/* GROCERY LIST */}
      {toBuyItems.length === 0 ? (
        <div className="liquid-glass-card rounded-[28px] p-8 text-center space-y-2">
          <div className="font-display font-black text-lg text-[#292B25]">
            همهٔ اقلام در خانه موجود است
          </div>
          <button
            type="button"
            onClick={openInventory}
            className="px-4 py-2 rounded-full bg-[#68734E] text-white text-xs font-extrabold"
          >
            مدیریت موجودی خانه
          </button>
        </div>
      ) : groupBy === 'aisle' ? (
        <div className="space-y-3.5">
          {groupedByAisle.map((group) => (
            <section key={group.aisle} className="liquid-glass-card rounded-[26px] p-4 space-y-2">
              <div className="flex items-center justify-between pb-1">
                <h2 className="font-display font-black text-base text-[#292B25]">
                  {group.label}
                </h2>
                <span className="text-[11px] font-bold text-[#75746E] tabular-nums-fa">
                  {toFaDigits(group.items.length)}
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
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3.5">
          {groupedByRecipe.map((group) => (
            <section key={group.title} className="liquid-glass-card rounded-[26px] p-4 space-y-2">
              <h2 className="font-display font-black text-base text-[#292B25] pb-1">
                {group.title}
              </h2>
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
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

const GroceryItemRow: React.FC<{
  item: ConsolidatedGroceryItem;
  onToggleCheck: () => void;
  onMoveToPantry: () => void;
  onDeleteManual?: () => void;
}> = ({ item, onToggleCheck, onMoveToPantry, onDeleteManual }) => (
  <div className={`py-3 flex items-center justify-between gap-2.5 ${item.checked ? 'opacity-50' : ''}`}>
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <button
        type="button"
        onClick={onToggleCheck}
        aria-label={`تیک ${item.name}`}
        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
          item.checked
            ? 'bg-[#68734E] text-white'
            : 'border-2 border-[#D4C7B8] bg-white'
        }`}
      >
        {item.checked && <IconCheck size={13} />}
      </button>

      <div className="min-w-0">
        <div className={`font-extrabold text-sm text-[#292B25] truncate ${item.checked ? 'line-through' : ''}`}>
          {item.name}
        </div>
        <div className="text-[11px] font-bold text-[#75746E] tabular-nums-fa mt-0.5">
          {toFaDigits(item.formattedAmount)} • {formatToman(item.shelfCostToman)}
        </div>
      </div>
    </div>

    <div className="flex items-center gap-1.5 shrink-0">
      {!item.isManual && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onMoveToPantry}
          data-testid={`have-at-home-${item.ingredientId}`}
          className="h-8 px-3 rounded-full bg-[#EEF2E6] hover:bg-[#E1E9D2] text-[#4C5736] text-[11px] font-extrabold flex items-center gap-1 transition"
        >
          <IconPantryShelf size={13} />
          <span>در خانه دارم</span>
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
