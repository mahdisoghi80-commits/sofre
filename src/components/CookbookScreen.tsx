import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CUISINE_FILTERS, MEAL_SLOT_LABELS, SMART_LABEL_FILTERS } from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type { CuisineType, MealSlotType } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { searchRecipes } from '../utils/planner';
import {
  getCuisineFlag,
  Icon3D,
  IconBookmark,
  IconClock,
  IconClose,
  IconFilter,
  IconFlame,
  IconFolderPlus,
  IconLinkMagic,
  IconSearch,
} from './icons/SofrehIcons';

const PAGE_SIZE = 24;

export const CookbookScreen: React.FC<{
  onOpenImportRecipe: () => void;
}> = ({ onOpenImportRecipe }) => {
  const { recipes, cookbooks, openRecipe, createCookbook } = useAppState();

  const [mode, setMode] = useState<'explore' | 'saved'>('explore');
  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<'همه' | CuisineType>('همه');
  const [selectedLabel, setSelectedLabel] = useState<string>('همه');
  const [selectedMealSlot, setSelectedMealSlot] = useState<'همه' | MealSlotType>('همه');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [newBookName, setNewBookName] = useState('');

  const activeFilterCount =
    (selectedCuisine !== 'همه' ? 1 : 0) +
    (selectedLabel !== 'همه' ? 1 : 0) +
    (selectedMealSlot !== 'همه' ? 1 : 0);

  const filteredRecipes = useMemo(
    () =>
      searchRecipes(recipes, query, {
        cuisine: selectedCuisine,
        label: selectedLabel,
        mealSlot: selectedMealSlot,
      }),
    [recipes, query, selectedCuisine, selectedLabel, selectedMealSlot]
  );

  const visibleRecipes = useMemo(
    () => filteredRecipes.slice(0, visibleCount),
    [filteredRecipes, visibleCount]
  );

  const savedSet = useMemo(() => {
    const s = new Set<string>();
    for (const cb of cookbooks) {
      for (const id of cb.recipeIds) s.add(id);
    }
    return s;
  }, [cookbooks]);

  const clearFilters = () => {
    setSelectedCuisine('همه');
    setSelectedLabel('همه');
    setSelectedMealSlot('همه');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-4">
      {/* CLEAN NATIVE APP STICKY HEADER */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/84 backdrop-blur-xl border-b border-white/60 safe-top space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-display font-black text-2xl text-[#292B25]">
            دستورها
          </h1>

          <div className="flex items-center gap-2">
            <div className="liquid-glass rounded-full p-1 flex">
              <button
                type="button"
                onClick={() => setMode('explore')}
                className={`px-3 py-1 rounded-full text-xs font-extrabold transition ${
                  mode === 'explore' ? 'bg-[#292B25] text-white' : 'text-[#5C5952]'
                }`}
              >
                همه
              </button>
              <button
                type="button"
                onClick={() => setMode('saved')}
                className={`px-3 py-1 rounded-full text-xs font-extrabold transition ${
                  mode === 'saved' ? 'bg-[#292B25] text-white' : 'text-[#5C5952]'
                }`}
              >
                ذخیره‌ها
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onOpenImportRecipe}
              data-testid="open-ai-import-btn"
              className="h-9 px-3.5 rounded-full coral-glass-pill text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0"
            >
              <IconLinkMagic size={15} />
              <span>از لینک</span>
            </motion.button>
          </div>
        </div>

        {/* Native Search Input + Circular Filter Sheet Trigger */}
        {mode === 'explore' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <IconSearch
                size={16}
                className="text-[#75746E] absolute right-3.5 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="جستجوی غذا یا ماده اولیه…"
                className="w-full h-10 pr-10 pl-3 rounded-full bg-white/92 border border-[#E6DACD] text-xs font-bold focus:outline-none focus:border-[#F04438]"
              />
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setFilterSheetOpen(true)}
              aria-label="فیلتر دستورها"
              data-testid="cookbook-filter-btn"
              className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
                activeFilterCount > 0
                  ? 'coral-glass-pill text-white'
                  : 'liquid-glass text-[#292B25]'
              }`}
            >
              <IconFilter size={17} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4.5 h-4.5 rounded-full bg-[#292B25] text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums-fa">
                  {toFaDigits(activeFilterCount)}
                </span>
              )}
            </motion.button>
          </div>
        )}
      </header>

      {mode === 'explore' ? (
        <>
          {/* Active Filter Summary Chips (Only shown when user applied filters) */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedCuisine !== 'همه' && (
                <button
                  type="button"
                  onClick={() => setSelectedCuisine('همه')}
                  className="px-3 py-1 rounded-full bg-[#292B25] text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  <span>{getCuisineFlag(selectedCuisine)} {selectedCuisine}</span>
                  <IconClose size={12} />
                </button>
              )}
              {selectedMealSlot !== 'همه' && (
                <button
                  type="button"
                  onClick={() => setSelectedMealSlot('همه')}
                  className="px-3 py-1 rounded-full bg-[#292B25] text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  <span>{MEAL_SLOT_LABELS[selectedMealSlot]}</span>
                  <IconClose size={12} />
                </button>
              )}
              {selectedLabel !== 'همه' && (
                <button
                  type="button"
                  onClick={() => setSelectedLabel('همه')}
                  className="px-3 py-1 rounded-full coral-glass-pill text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  <span>{selectedLabel}</span>
                  <IconClose size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={clearFilters}
                className="px-2.5 py-1 text-xs font-bold text-[#F04438]"
              >
                پاک کردن
              </button>
            </div>
          )}

          {/* Clean Recipe Grid with Edge-to-Edge Icon3D & Country Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleRecipes.map((r) => (
              <motion.button
                key={r.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => openRecipe(r.id)}
                className="liquid-glass-card rounded-[26px] p-3.5 text-right flex items-center gap-3.5 hover:border-[#F04438]/40 transition"
              >
                <Icon3D
                  src={r.icon}
                  alt={r.title}
                  sizeClass="w-16 h-16"
                  roundedClass="rounded-[18px]"
                  loading="lazy"
                />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base leading-none" title={r.cuisine}>
                      {getCuisineFlag(r.cuisine)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {savedSet.has(r.id) && (
                        <IconBookmark size={14} filled className="text-[#F04438]" />
                      )}
                      <span className="text-[11px] font-extrabold text-[#292B25] tabular-nums-fa">
                        {formatToman(r.costPerServingToman)}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display font-black text-[15px] text-[#292B25] line-clamp-1">
                    {r.title}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] font-bold text-[#75746E] tabular-nums-fa">
                    <span className="inline-flex items-center gap-1">
                      <IconClock size={13} className="text-[#C87955]" />
                      {toFaDigits(r.prepMinutes + r.cookMinutes)} د
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IconFlame size={13} className="text-[#F04438]" />
                      {toFaDigits(r.caloriesPerServing)}
                    </span>
                    <span className="text-[#68734E]">
                      {toFaDigits(r.proteinG)}g پروتئین
                    </span>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {visibleCount < filteredRecipes.length && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-6 py-3 rounded-full liquid-glass font-extrabold text-xs text-[#292B25] hover:bg-white transition"
              >
                نمایش بیشتر
              </button>
            </div>
          )}
        </>
      ) : (
        /* SAVED COOKBOOKS */
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newBookName.trim()) return;
              createCookbook(newBookName);
              setNewBookName('');
            }}
            className="liquid-glass-card rounded-full p-1.5 pr-4 flex items-center gap-2"
          >
            <input
              type="text"
              value={newBookName}
              onChange={(e) => setNewBookName(e.target.value)}
              placeholder="نام دفترچهٔ جدید…"
              className="flex-1 h-9 bg-transparent text-xs font-bold focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 px-4 rounded-full coral-glass-pill text-white text-xs font-extrabold flex items-center gap-1.5"
            >
              <IconFolderPlus size={15} />
              <span>ساختن</span>
            </button>
          </form>

          {cookbooks.map((cb) => {
            const cbRecipes = cb.recipeIds
              .map((id) => recipes.find((r) => r.id === id))
              .filter((r): r is NonNullable<typeof r> => Boolean(r));
            return (
              <section key={cb.id} className="liquid-glass-card rounded-[26px] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-black text-lg text-[#292B25]">{cb.name}</h3>
                  <span className="text-xs font-bold text-[#75746E] tabular-nums-fa">
                    {toFaDigits(cbRecipes.length)}
                  </span>
                </div>
                {cbRecipes.length === 0 ? (
                  <p className="text-xs text-[#75746E]">هنوز غذایی ذخیره نشده است.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {cbRecipes.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openRecipe(r.id)}
                        className="bg-[#FBF5EF] rounded-2xl p-2.5 flex items-center gap-3 text-right hover:bg-white transition"
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
                            {formatToman(r.costPerServingToman)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* NATIVE MOBILE BOTTOM FILTER SHEET */}
      <AnimatePresence>
        {filterSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFilterSheetOpen(false)}
            className="fixed inset-0 z-50 bg-[#292B25]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="cookbook-filter-sheet"
              className="w-full sm:max-w-lg max-h-[82dvh] bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] p-5 flex flex-col gap-5 shadow-2xl border border-white overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-xl text-[#292B25]">فیلتر</h3>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  aria-label="بستن فیلتر"
                  className="w-9 h-9 rounded-full bg-white text-[#292B25] flex items-center justify-center shadow-sm"
                >
                  <IconClose size={17} />
                </button>
              </div>

              {/* Cuisine Section */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-[#75746E]">آشپزی</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CUISINE_FILTERS.map((c) => {
                    const active = selectedCuisine === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSelectedCuisine(c);
                          setVisibleCount(PAGE_SIZE);
                        }}
                        className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                          active
                            ? 'bg-[#292B25] text-white'
                            : 'bg-white text-[#292B25] border border-[#EAE0D5]'
                        }`}
                      >
                        {c !== 'همه' && <span>{getCuisineFlag(c)}</span>}
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Meal Slot Section */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-[#75746E]">وعده</div>
                <div className="grid grid-cols-4 gap-2">
                  {(['همه', 'breakfast', 'lunch', 'dinner'] as const).map((slot) => {
                    const active = selectedMealSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setSelectedMealSlot(slot);
                          setVisibleCount(PAGE_SIZE);
                        }}
                        className={`py-2.5 rounded-2xl text-xs font-extrabold transition ${
                          active
                            ? 'bg-[#292B25] text-white'
                            : 'bg-white text-[#292B25] border border-[#EAE0D5]'
                        }`}
                      >
                        {slot === 'همه' ? 'همه' : MEAL_SLOT_LABELS[slot]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style / Speed / Diet Labels */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-[#75746E]">ویژگی</div>
                <div className="flex flex-wrap gap-2">
                  {SMART_LABEL_FILTERS.map((lbl) => {
                    const active = selectedLabel === lbl;
                    return (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          setSelectedLabel(lbl);
                          setVisibleCount(PAGE_SIZE);
                        }}
                        className={`px-3.5 py-2 rounded-full text-xs font-extrabold transition ${
                          active
                            ? 'coral-glass-pill text-white'
                            : 'bg-white text-[#5C5952] border border-[#EAE0D5]'
                        }`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-12 px-5 rounded-full bg-white text-[#292B25] font-extrabold text-xs border border-[#E6DACD]"
                  >
                    حذف فیلترها
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="flex-1 h-12 rounded-full btn-shimmer text-white font-display font-black text-sm"
                >
                  نمایش {toFaDigits(filteredRecipes.length)} غذا
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
