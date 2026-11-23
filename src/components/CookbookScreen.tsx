import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  DAY_NAMES_FULL,
  CUISINE_FILTERS,
  MEAL_SLOT_LABELS,
  SMART_LABEL_FILTERS,
} from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type { CuisineType, MealSlotType, Recipe } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { searchRecipes, type CookbookSortOption } from '../utils/planner';
import { hapticLight } from '../utils/native';
import { ContextActionMenu, useLongPress, type ContextMenuAction } from './ContextActionMenu';
import {
  getCuisineFlag,
  Icon3D,
  IconBookmark,
  IconCalendarPlus,
  IconCheck,
  IconClock,
  IconClose,
  IconCookingPot,
  IconFilter,
  IconFlame,
  IconFolderPlus,
  IconLinkMagic,
  IconSearch,
  IconSort,
  IconThumbDown,
  IconThumbUp,
} from './icons/SofrehIcons';

const PAGE_SIZE = 24;

const SORT_OPTIONS: Array<{ id: CookbookSortOption; label: string }> = [
  { id: 'recommended', label: 'پیشنهادی سفره' },
  { id: 'fastest', label: 'سریع‌ترین پخت' },
  { id: 'cheapest', label: 'اقتصادی‌ترین' },
  { id: 'highest_protein', label: 'بیشترین پروتئین' },
  { id: 'lowest_cal', label: 'کم‌کالری‌ترین' },
  { id: 'pantry_match', label: 'بیشترین مواد موجود' },
];

const TIME_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: 'همه' },
  { value: 20, label: 'زیر ۲۰ د' },
  { value: 30, label: 'زیر ۳۰ د' },
  { value: 45, label: 'زیر ۴۵ د' },
];

export const CookbookScreen: React.FC<{
  onOpenImportRecipe: () => void;
}> = ({ onOpenImportRecipe }) => {
  const {
    recipes,
    cookbooks,
    pantry,
    prefs,
    selectedDay,
    recipeFeedback,
    openRecipe,
    startCookMode,
    addMealToPlan,
    toggleRecipeInCookbook,
    rateRecipe,
    createCookbook,
    registerBackHandler,
  } = useAppState();

  const [mode, setMode] = useState<'explore' | 'saved'>('explore');
  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<'همه' | CuisineType>('همه');
  const [selectedLabel, setSelectedLabel] = useState<string>('همه');
  const [selectedMealSlot, setSelectedMealSlot] = useState<'همه' | MealSlotType>('همه');
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [onlyPantryFriendly, setOnlyPantryFriendly] = useState(false);
  const [sortBy, setSortBy] = useState<CookbookSortOption>('recommended');

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [contextRecipe, setContextRecipe] = useState<Recipe | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [newBookName, setNewBookName] = useState('');

  // Hardware Back support for Sort, Filter & Context Menu
  useEffect(() => {
    if (!filterSheetOpen && !sortSheetOpen && !contextRecipe) return;
    return registerBackHandler('cookbook-sheets', () => {
      if (contextRecipe) {
        setContextRecipe(null);
        return true;
      }
      if (sortSheetOpen) {
        setSortSheetOpen(false);
        return true;
      }
      if (filterSheetOpen) {
        setFilterSheetOpen(false);
        return true;
      }
      return false;
    });
  }, [filterSheetOpen, sortSheetOpen, contextRecipe, registerBackHandler]);

  const pantryIds = useMemo(
    () => new Set(pantry.filter((p) => p.inStock).map((p) => p.ingredientId)),
    [pantry]
  );

  const activeFilterCount =
    (selectedCuisine !== 'همه' ? 1 : 0) +
    (selectedLabel !== 'همه' ? 1 : 0) +
    (selectedMealSlot !== 'همه' ? 1 : 0) +
    (maxMinutes !== null ? 1 : 0) +
    (onlyPantryFriendly ? 1 : 0);

  const filteredRecipes = useMemo(
    () =>
      searchRecipes(recipes, query, {
        cuisine: selectedCuisine,
        label: selectedLabel,
        mealSlot: selectedMealSlot,
        maxMinutes,
        pantryIds,
        onlyPantryFriendly,
        sortBy,
        prefs,
        ratings: recipeFeedback,
      }),
    [
      recipes,
      query,
      selectedCuisine,
      selectedLabel,
      selectedMealSlot,
      maxMinutes,
      pantryIds,
      onlyPantryFriendly,
      sortBy,
      prefs,
      recipeFeedback,
    ]
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
    hapticLight();
    setSelectedCuisine('همه');
    setSelectedLabel('همه');
    setSelectedMealSlot('همه');
    setMaxMinutes(null);
    setOnlyPantryFriendly(false);
    setVisibleCount(PAGE_SIZE);
  };

  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label ?? 'پیشنهادی سفره';

  return (
    <div className="space-y-4">
      {/* CLEAN STICKY HEADER WITH SEARCH + SORT + FILTER */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/90 backdrop-blur-md border-b border-white/60 safe-top space-y-2.5">
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

        {/* Search Input + Dedicated Sort By & Filter Buttons */}
        {mode === 'explore' && (
          <div className="space-y-2">
            <div className="relative">
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
                className="w-full h-10 pr-10 pl-3 rounded-full bg-white border border-[#E6DACD] text-xs font-bold focus:outline-none focus:border-[#F04438]"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    hapticLight();
                    setSortSheetOpen(true);
                  }}
                  data-testid="cookbook-sort-btn"
                  className={`h-9 px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                    sortBy !== 'recommended'
                      ? 'bg-[#292B25] text-white'
                      : 'liquid-glass text-[#292B25]'
                  }`}
                >
                  <IconSort size={15} />
                  <span>مرتب‌سازی: {activeSortLabel}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    hapticLight();
                    setFilterSheetOpen(true);
                  }}
                  data-testid="cookbook-filter-btn"
                  className={`relative h-9 px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                    activeFilterCount > 0
                      ? 'coral-glass-pill text-white'
                      : 'liquid-glass text-[#292B25]'
                  }`}
                >
                  <IconFilter size={15} />
                  <span>فیلتر</span>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white/25 text-[10px] tabular-nums-fa">
                      {toFaDigits(activeFilterCount)}
                    </span>
                  )}
                </motion.button>
              </div>

              <span className="text-[11px] font-extrabold text-[#75746E] tabular-nums-fa shrink-0">
                {toFaDigits(filteredRecipes.length)} غذا
              </span>
            </div>
          </div>
        )}
      </header>

      {mode === 'explore' ? (
        <>
          {/* Active Filter Chips */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedCuisine !== 'همه' && (
                <button
                  type="button"
                  onClick={() => setSelectedCuisine('همه')}
                  className="px-3 py-1 rounded-full bg-[#292B25] text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  {getCuisineFlag(selectedCuisine)}
                  <span>{selectedCuisine}</span>
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
              {maxMinutes !== null && (
                <button
                  type="button"
                  onClick={() => setMaxMinutes(null)}
                  className="px-3 py-1 rounded-full bg-[#68734E] text-white text-xs font-extrabold flex items-center gap-1.5 tabular-nums-fa"
                >
                  <span>زیر {toFaDigits(maxMinutes)} دقیقه</span>
                  <IconClose size={12} />
                </button>
              )}
              {onlyPantryFriendly && (
                <button
                  type="button"
                  onClick={() => setOnlyPantryFriendly(false)}
                  className="px-3 py-1 rounded-full bg-[#68734E] text-white text-xs font-extrabold flex items-center gap-1.5"
                >
                  <span>مناسب موجودی خانه</span>
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

          {/* VISUAL PHOTO-FIRST EDITORIAL TILE GRID (2-col mobile, 3-col desktop, featured spotlight tile!) */}
          {visibleRecipes.length === 0 ? (
            <div className="liquid-glass-card rounded-[28px] p-8 text-center space-y-3">
              <div className="font-display font-black text-base text-[#292B25]">
                غذایی با این فیلتر پیدا نشد
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="px-4 py-2 rounded-full coral-glass-pill text-white text-xs font-extrabold"
              >
                حذف همهٔ فیلترها
              </button>
            </div>
          ) : (
            <div
              data-testid="cookbook-tile-grid"
              className="grid grid-cols-2 lg:grid-cols-3 gap-3"
            >
              {visibleRecipes.map((r, idx) => {
                // Editorial rhythm: first card is a wide hero feature tile on mobile (col-span-2)
                const isFeatured = idx === 0 && !query.trim() && visibleRecipes.length > 2;
                return (
                  <RecipePhotoTile
                    key={r.id}
                    recipe={r}
                    isSaved={savedSet.has(r.id)}
                    featured={isFeatured}
                    onOpen={() => openRecipe(r.id)}
                    onLongPress={() => setContextRecipe(r)}
                  />
                );
              })}
            </div>
          )}

          {visibleCount < filteredRecipes.length && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-6 py-3 rounded-full liquid-glass font-extrabold text-xs text-[#292B25] hover:bg-white transition"
              >
                نمایش بیشتر ({toFaDigits(filteredRecipes.length - visibleCount)})
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
                  <div className="grid grid-cols-2 gap-2.5">
                    {cbRecipes.map((r) => (
                      <RecipePhotoTile
                        key={r.id}
                        recipe={r}
                        isSaved
                        featured={false}
                        onOpen={() => openRecipe(r.id)}
                        onLongPress={() => setContextRecipe(r)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* SORT BY BOTTOM SHEET */}
      <AnimatePresence>
        {sortSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSortSheetOpen(false)}
            className="fixed inset-0 z-50 bg-[#292B25]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              data-testid="cookbook-sort-sheet"
              className="w-full sm:max-w-md bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] p-5 space-y-3.5 shadow-2xl border border-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-xl text-[#292B25]">مرتب‌سازی</h3>
                <button
                  type="button"
                  onClick={() => setSortSheetOpen(false)}
                  aria-label="بستن"
                  className="w-9 h-9 rounded-full bg-white text-[#292B25] flex items-center justify-center shadow-sm"
                >
                  <IconClose size={17} />
                </button>
              </div>

              <div className="space-y-2">
                {SORT_OPTIONS.map((opt) => {
                  const active = sortBy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        hapticLight();
                        setSortBy(opt.id);
                        setVisibleCount(PAGE_SIZE);
                        setSortSheetOpen(false);
                      }}
                      className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between text-right transition ${
                        active
                          ? 'bg-[#292B25] text-white'
                          : 'bg-white text-[#292B25] border border-[#EAE0D5]'
                      }`}
                    >
                      <div className="font-display font-black text-sm">{opt.label}</div>
                      {active && (
                        <span className="w-7 h-7 rounded-full coral-glass-pill text-white flex items-center justify-center shrink-0">
                          <IconCheck size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FILTER BOTTOM SHEET */}
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
              className="w-full sm:max-w-lg max-h-[84dvh] bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] p-5 flex flex-col gap-5 shadow-2xl border border-white overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-xl text-[#292B25]">فیلتر دستورها</h3>
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
                        className={`py-2.5 px-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                          active
                            ? 'bg-[#292B25] text-white'
                            : 'bg-white text-[#292B25] border border-[#EAE0D5]'
                        }`}
                      >
                        {c !== 'همه' && getCuisineFlag(c)}
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Cook Time */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-[#75746E]">حداکثر زمان پخت</div>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_OPTIONS.map((t) => {
                    const active = maxMinutes === t.value;
                    return (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => {
                          setMaxMinutes(t.value);
                          setVisibleCount(PAGE_SIZE);
                        }}
                        className={`py-2.5 rounded-2xl text-xs font-extrabold transition ${
                          active
                            ? 'bg-[#292B25] text-white'
                            : 'bg-white text-[#292B25] border border-[#EAE0D5]'
                        }`}
                      >
                        {t.label}
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

              {/* Pantry-Friendly Toggle */}
              <button
                type="button"
                onClick={() => {
                  setOnlyPantryFriendly((v) => !v);
                  setVisibleCount(PAGE_SIZE);
                }}
                className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between text-xs font-extrabold transition ${
                  onlyPantryFriendly
                    ? 'bg-[#68734E] text-white'
                    : 'bg-white text-[#292B25] border border-[#EAE0D5]'
                }`}
              >
                <span>مناسب موجودی یخچال</span>
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    onlyPantryFriendly ? 'bg-white text-[#68734E]' : 'bg-[#F3E9DE]'
                  }`}
                >
                  {onlyPantryFriendly && <IconCheck size={13} />}
                </span>
              </button>

              {/* Style / Speed / Diet Labels */}
              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-[#75746E]">برچسب و ویژگی</div>
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
      {/* LONG-PRESS CONTEXT MENU FOR RECIPES */}
      <ContextActionMenu
        open={Boolean(contextRecipe)}
        preview={
          contextRecipe
            ? {
                title: contextRecipe.title,
                subtitle: `${toFaDigits(contextRecipe.prepMinutes + contextRecipe.cookMinutes)} دقیقه · ${toFaDigits(contextRecipe.caloriesPerServing)} کالری · ${formatToman(contextRecipe.costPerServingToman)}`,
                iconSrc: contextRecipe.icon,
                iconKind: 'food3d',
              }
            : null
        }
        actions={
          contextRecipe
            ? ((): ContextMenuAction[] => {
                const isSaved = savedSet.has(contextRecipe.id);
                const fb = recipeFeedback[contextRecipe.id];
                const defaultSlot: MealSlotType = contextRecipe.mealTypes[0] ?? 'lunch';
                const targetBook = cookbooks[0]?.id ?? 'fav';
                return [
                  {
                    id: 'add-to-plan',
                    label: `افزودن به ${MEAL_SLOT_LABELS[defaultSlot]} ${DAY_NAMES_FULL[selectedDay]}`,
                    icon: <IconCalendarPlus size={18} />,
                    tone: 'accent',
                    onSelect: () =>
                      addMealToPlan(selectedDay, defaultSlot, contextRecipe.id, prefs.servings),
                  },
                  {
                    id: 'start-cook',
                    label: 'شروع پخت مرحله‌به‌مرحله',
                    icon: <IconCookingPot size={18} />,
                    onSelect: () => startCookMode(contextRecipe.id, prefs.servings),
                  },
                  {
                    id: 'toggle-save',
                    label: isSaved ? 'حذف از ذخیره‌ها' : 'ذخیره در دفترچه',
                    icon: <IconBookmark size={18} filled={isSaved} />,
                    onSelect: () => toggleRecipeInCookbook(targetBook, contextRecipe.id),
                  },
                  {
                    id: 'like',
                    label: fb === 'up' ? 'برداشتن پسند' : 'پسندیدم',
                    icon: <IconThumbUp size={18} filled={fb === 'up'} />,
                    tone: 'positive',
                    onSelect: () => rateRecipe(contextRecipe.id, 'up'),
                  },
                  {
                    id: 'dislike',
                    label: fb === 'down' ? 'برداشتن عدم علاقه' : 'کمتر پیشنهاد بده',
                    icon: <IconThumbDown size={18} filled={fb === 'down'} />,
                    tone: 'danger',
                    onSelect: () => rateRecipe(contextRecipe.id, 'down'),
                  },
                ];
              })()
            : []
        }
        onClose={() => setContextRecipe(null)}
      />
    </div>
  );
};

/**
 * Rich Photo-First Editorial Recipe Tile (distinct dish photography + 3D icon badge + rectangular flag)
 */
const RecipePhotoTile: React.FC<{
  recipe: Recipe;
  isSaved: boolean;
  featured: boolean;
  onOpen: () => void;
  onLongPress: () => void;
}> = ({ recipe, isSaved, featured, onOpen, onLongPress }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const totalMin = recipe.prepMinutes + recipe.cookMinutes;
  const { handlers, consumeLongPress } = useLongPress(onLongPress);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      {...handlers}
      onClick={() => {
        if (consumeLongPress()) return;
        onOpen();
      }}
      data-testid={`recipe-tile-${recipe.id}`}
      className={`group liquid-glass-card rounded-[26px] overflow-hidden text-right flex flex-col hover:border-[#F04438]/40 transition select-none ${
        featured ? 'col-span-2 lg:col-span-2' : ''
      }`}
    >
      {/* Photo Stage with Seamless Bottom Fade */}
      <div
        className={`relative w-full overflow-hidden bg-[#EFE4D8] ${
          featured ? 'h-44 sm:h-52' : 'h-32 sm:h-36'
        }`}
      >
        <img
          src={imgFailed ? recipe.icon : recipe.photoUrl}
          alt={recipe.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(20,18,16,0.18) 0%, rgba(20,18,16,0) 45%, rgba(255,253,251,0.92) 100%)',
          }}
        />

        {/* Top-Right Flat Rectangular Flag + Category */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span className="px-2 py-1 rounded-full bg-white/88 backdrop-blur-sm shadow-sm flex items-center gap-1.5">
            {getCuisineFlag(recipe.cuisine)}
            {featured && (
              <span className="text-[10px] font-extrabold text-[#292B25]">
                {recipe.category}
              </span>
            )}
          </span>
        </div>

        {/* Top-Left Saved Badge / Price */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
          {isSaved && (
            <span className="w-7 h-7 rounded-full bg-white/90 text-[#F04438] flex items-center justify-center shadow-sm">
              <IconBookmark size={14} filled />
            </span>
          )}
        </div>

        {/* Floating Distinct 3D Dish Icon Emblem on Bottom-Left */}
        <div className="absolute bottom-2 left-2.5">
          <Icon3D
            src={recipe.icon}
            alt={recipe.title}
            sizeClass={featured ? 'w-12 h-12' : 'w-10 h-10'}
            roundedClass="rounded-[13px]"
            className="ring-2 ring-white"
          />
        </div>
      </div>

      {/* Crisp Tile Body */}
      <div className="p-3 pt-2 flex-1 flex flex-col justify-between gap-2">
        <div>
          <h3
            className={`font-display font-black text-[#292B25] leading-snug line-clamp-1 ${
              featured ? 'text-lg' : 'text-[14px]'
            }`}
          >
            {recipe.title}
          </h3>
          {featured && (
            <p className="text-xs font-bold text-[#75746E] line-clamp-1 mt-0.5">
              {recipe.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-[#F2E9DF] text-[10.5px] font-extrabold tabular-nums-fa">
          <div className="flex items-center gap-2 text-[#75746E]">
            <span className="inline-flex items-center gap-0.5">
              <IconClock size={12} className="text-[#C87955]" />
              {toFaDigits(totalMin)}د
            </span>
            <span className="inline-flex items-center gap-0.5">
              <IconFlame size={12} className="text-[#F04438]" />
              {toFaDigits(recipe.caloriesPerServing)}
            </span>
          </div>
          <span className="text-[#292B25] shrink-0">
            {toFaDigits(Math.round(recipe.costPerServingToman / 1000))} هـ ت
          </span>
        </div>
      </div>
    </motion.button>
  );
};
