import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ALLERGENS_META,
  DAY_NAMES_SHORT,
  DIETS_META,
  KITCHEN_SCENE_3D,
} from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type { AllergenId, ApplianceId, CuisinePreference, DietType } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { hapticLight, hapticMedium } from '../utils/native';
import { BudgetDial } from './BudgetDial';
import {
  DietStyleIcon,
  Icon3D,
  IconArrowLeft,
  IconBell,
  IconCheck,
  IconClose,
  IconKitchen,
  IconMinus,
  IconPantryShelf,
  IconPlus,
  IconUndo,
  SofrehLogoMark,
} from './icons/SofrehIcons';

function ratioToCuisinePref(ratio: number): CuisinePreference {
  if (ratio >= 68) return 'mostly_persian';
  if (ratio <= 35) return 'global_explorer';
  return 'balanced';
}

export const ProfileScreen: React.FC = () => {
  const {
    prefs,
    pantry,
    cookbooks,
    cookedCount,
    updatePrefs,
    restartOnboarding,
    openInventory,
  } = useAppState();

  const [kitchenModalOpen, setKitchenModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  const savedCount = useMemo(() => {
    const s = new Set<string>();
    for (const cb of cookbooks) {
      for (const id of cb.recipeIds) s.add(id);
    }
    return s.size;
  }, [cookbooks]);

  const inventoryCount = useMemo(
    () => pantry.filter((p) => p.inStock).length,
    [pantry]
  );

  const cookingDays = prefs.cookingDays ?? [0, 1, 2, 3, 4, 5, 6];
  const persianRatio = prefs.persianRatio ?? 65;

  const toggleDay = (idx: number) => {
    hapticLight();
    const exists = cookingDays.includes(idx);
    const next = exists
      ? cookingDays.filter((d) => d !== idx)
      : [...cookingDays, idx].sort((a, b) => a - b);
    const safe = next.length > 0 ? next : [idx];
    updatePrefs({ cookingDays: safe, cookingDaysPerWeek: safe.length }, true);
  };

  const toggleAllergen = (id: AllergenId) => {
    hapticLight();
    const next = prefs.allergens.includes(id)
      ? prefs.allergens.filter((a) => a !== id)
      : [...prefs.allergens, id];
    updatePrefs({ allergens: next }, true);
  };

  const toggleAppliance = (id: ApplianceId) => {
    hapticMedium();
    const exists = prefs.appliances.includes(id);
    const next = exists
      ? prefs.appliances.filter((a) => a !== id)
      : [...prefs.appliances, id];
    updatePrefs({ appliances: next.length > 0 ? next : ['stovetop'] }, true);
  };

  return (
    <div className="space-y-5">
      {/* CLEAN CONSUMER HEADER */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/84 backdrop-blur-xl border-b border-white/60 safe-top">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <SofrehLogoMark className="w-9 h-9 shrink-0 shadow-sm" />
            <h1 className="font-display font-black text-2xl text-[#292B25]">
              پروفایل من
            </h1>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={restartOnboarding}
            aria-label="تنظیم مجدد از اول"
            className="h-9 px-3.5 rounded-full liquid-glass text-xs font-extrabold text-[#F04438] flex items-center gap-1.5"
          >
            <IconUndo size={14} />
            <span>چیدمان از نو</span>
          </motion.button>
        </div>
      </header>

      {/* CONSUMER STATS ROW */}
      <section className="grid grid-cols-3 gap-2.5">
        {[
          { val: toFaDigits(cookedCount), label: 'پخته‌شده' },
          { val: toFaDigits(savedCount), label: 'ذخیره‌شده' },
          { val: toFaDigits(inventoryCount), label: 'موجودی خانه' },
        ].map((st) => (
          <div key={st.label} className="liquid-glass-card rounded-[24px] p-3.5 text-center">
            <div className="font-display font-black text-2xl text-[#F04438] tabular-nums-fa">
              {st.val}
            </div>
            <div className="text-[11px] font-bold text-[#75746E] mt-0.5">{st.label}</div>
          </div>
        ))}
      </section>

      {/* DIRECT HOME INVENTORY SHORTCUT */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={openInventory}
        className="w-full liquid-glass-card rounded-[26px] p-4 flex items-center justify-between text-right"
      >
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-full bg-[#EEF2E6] text-[#68734E] flex items-center justify-center shrink-0">
            <IconPantryShelf size={21} />
          </span>
          <div>
            <div className="font-display font-black text-base text-[#292B25]">
              موجودی یخچال و خانه
            </div>
            <div className="text-xs font-bold text-[#75746E] tabular-nums-fa">
              {toFaDigits(inventoryCount)} قلم ثبت شده
            </div>
          </div>
        </div>
        <IconArrowLeft size={18} className="text-[#75746E]" />
      </motion.button>

      {/* HOUSEHOLD, DAYS & BUDGET CARD */}
      <section className="liquid-glass-card rounded-[28px] p-5 space-y-5">
        {/* Servings */}
        <div className="flex items-center justify-between">
          <span className="font-display font-black text-base text-[#292B25]">
            تعداد نفرات
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => updatePrefs({ servings: Math.max(1, prefs.servings - 1) }, true)}
              aria-label="کاهش نفرات"
              className="w-9 h-9 rounded-full bg-[#F3E9DE] text-[#292B25] flex items-center justify-center"
            >
              <IconMinus size={16} />
            </button>
            <span className="font-display font-black text-lg text-[#292B25] w-10 text-center tabular-nums-fa">
              {toFaDigits(prefs.servings)}
            </span>
            <button
              type="button"
              onClick={() => updatePrefs({ servings: Math.min(10, prefs.servings + 1) }, true)}
              aria-label="افزایش نفرات"
              className="w-9 h-9 rounded-full coral-glass-pill text-white flex items-center justify-center"
            >
              <IconPlus size={16} />
            </button>
          </div>
        </div>

        {/* Weekly Cooking Days Calendar */}
        <div className="space-y-2.5 pt-4 border-t border-[#EFE4D8]">
          <div className="flex items-center justify-between">
            <span className="font-display font-black text-base text-[#292B25]">
              روزهای پخت
            </span>
            <span className="text-xs font-bold text-[#F04438] tabular-nums-fa">
              {toFaDigits(cookingDays.length)} روز
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_NAMES_SHORT.map((d, idx) => {
              const active = cookingDays.includes(idx);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={`h-10 rounded-full font-display font-black text-xs transition ${
                    active ? 'coral-glass-pill text-white' : 'bg-[#F3E9DE] text-[#75746E]'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget Trigger (Opens Rotary Dial) */}
        <div className="flex items-center justify-between pt-4 border-t border-[#EFE4D8]">
          <div>
            <div className="font-display font-black text-base text-[#292B25]">
              بودجهٔ هفتگی
            </div>
            <div className="text-xs font-extrabold text-[#F04438] tabular-nums-fa mt-0.5">
              {formatToman(prefs.weeklyBudgetToman)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBudgetModalOpen(true)}
            className="h-9 px-4 rounded-full bg-[#292B25] text-white text-xs font-extrabold"
          >
            تغییر بودجه
          </button>
        </div>

        {/* Persian / International Slider */}
        <div className="space-y-2.5 pt-4 border-t border-[#EFE4D8]">
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="text-[#292B25]">🇮🇷 ایرانی {toFaDigits(persianRatio)}٪</span>
            <span className="text-[#68734E]">جهانی {toFaDigits(100 - persianRatio)}٪ 🌍</span>
          </div>
          <div dir="ltr">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={persianRatio}
              onChange={(e) => {
                const v = Number(e.target.value);
                updatePrefs(
                  { persianRatio: v, cuisinePreference: ratioToCuisinePref(v) },
                  true
                );
              }}
              aria-label="نسبت غذای ایرانی"
              className="w-full accent-[#F04438] h-2 cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* DIET & ALLERGIES */}
      <section className="liquid-glass-card rounded-[28px] p-5 space-y-5">
        <div className="space-y-3">
          <h2 className="font-display font-black text-base text-[#292B25]">
            سبک تغذیه
          </h2>
          <div className="flex flex-wrap gap-2">
            {DIETS_META.map((d) => {
              const active = prefs.diet === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => updatePrefs({ diet: d.id as DietType }, true)}
                  className={`px-3.5 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                    active
                      ? 'bg-[#292B25] text-white'
                      : 'bg-[#FBF5EF] text-[#292B25] border border-[#EAE0D5]'
                  }`}
                >
                  <DietStyleIcon diet={d.id} size={15} />
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#EFE4D8]">
          <h2 className="font-display font-black text-base text-[#292B25]">
            حساسیت‌های غذایی
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {ALLERGENS_META.map((a) => {
              const active = prefs.allergens.includes(a.id);
              return (
                <motion.button
                  key={a.id}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleAllergen(a.id)}
                  className={`rounded-[22px] p-3 flex flex-col items-center gap-2 transition ${
                    active
                      ? 'bg-[#FFF0ED] border-2 border-[#F04438]'
                      : 'bg-white border border-[#EAE0D5]'
                  }`}
                >
                  <Icon3D
                    src={a.icon}
                    alt={a.label}
                    sizeClass="w-12 h-12"
                    roundedClass="rounded-[14px]"
                  />
                  <span className="font-extrabold text-[11px] text-[#292B25]">
                    {a.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* KITCHEN APPLIANCES & REMINDERS */}
      <section className="liquid-glass-card rounded-[28px] p-5 space-y-4">
        <button
          type="button"
          onClick={() => setKitchenModalOpen(true)}
          className="w-full flex items-center justify-between text-right"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center shrink-0">
              <IconKitchen size={19} />
            </span>
            <div>
              <div className="font-display font-black text-base text-[#292B25]">
                وسایل آشپزخانه
              </div>
              <div className="text-xs font-bold text-[#75746E] tabular-nums-fa">
                {toFaDigits(prefs.appliances.length)} وسیله فعال
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-full bg-[#F3E9DE] text-xs font-extrabold text-[#292B25]">
            انتخاب روی تصویر
          </span>
        </button>

        {/* Reminders Toggles */}
        <div className="pt-4 border-t border-[#EFE4D8] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBell size={18} className="text-[#C87955]" />
              <span className="font-extrabold text-sm text-[#292B25]">
                یادآور شروع پخت ({prefs.reminderTime})
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.remindersEnabled}
              onClick={() => updatePrefs({ remindersEnabled: !prefs.remindersEnabled })}
              className={`w-12 h-7 rounded-full p-1 transition flex items-center ${
                prefs.remindersEnabled ? 'bg-[#68734E] justify-start' : 'bg-[#DDD3C7] justify-end'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBell size={18} className="text-[#68734E]" />
              <span className="font-extrabold text-sm text-[#292B25]">
                یادآور خیساندن حبوبات شب قبل
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(prefs.soakingReminder)}
              onClick={() => updatePrefs({ soakingReminder: !prefs.soakingReminder })}
              className={`w-12 h-7 rounded-full p-1 transition flex items-center ${
                prefs.soakingReminder ? 'bg-[#68734E] justify-start' : 'bg-[#DDD3C7] justify-end'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>
      </section>

      {/* ROTARY BUDGET DIAL MODAL */}
      <AnimatePresence>
        {budgetModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBudgetModalOpen(false)}
            className="fixed inset-0 z-50 bg-[#292B25]/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-[#FBF5EF] rounded-t-[32px] sm:rounded-[32px] p-5 space-y-4 shadow-2xl border border-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-xl text-[#292B25]">
                  بودجهٔ هفتگی
                </h3>
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  aria-label="بستن"
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
                >
                  <IconClose size={17} />
                </button>
              </div>
              <BudgetDial
                value={prefs.weeklyBudgetToman}
                min={300_000}
                max={6_000_000}
                step={100_000}
                servings={prefs.servings}
                mealsPerWeek={cookingDays.length * prefs.activeMealSlots.length}
                onChange={(val) => updatePrefs({ weeklyBudgetToman: val })}
              />
              <button
                type="button"
                onClick={() => setBudgetModalOpen(false)}
                className="w-full h-12 rounded-full btn-shimmer text-white font-display font-black text-sm"
              >
                تایید
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULL-SCREEN INTERACTIVE 3D KITCHEN MODAL */}
      <AnimatePresence>
        {kitchenModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#1B1917] overflow-hidden select-none"
          >
            <div dir="ltr" className="absolute inset-0 overflow-x-auto overflow-y-hidden no-scrollbar flex items-center">
              <div className="relative h-dvh aspect-[4/3] min-w-full shrink-0">
                <img
                  src={KITCHEN_SCENE_3D.image}
                  alt="آشپزخانه"
                  className="w-full h-full object-cover"
                />
                {KITCHEN_SCENE_3D.hotspots.map((spot) => {
                  const active = prefs.appliances.includes(spot.id);
                  return (
                    <button
                      key={spot.id}
                      type="button"
                      dir="rtl"
                      onClick={() => toggleAppliance(spot.id)}
                      style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 pl-3 pr-2 py-2 rounded-full shadow-xl transition ${
                        active
                          ? 'coral-glass-pill text-white ring-2 ring-white'
                          : 'bg-white/92 text-[#292B25]'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          active ? 'bg-white text-[#F04438]' : 'bg-[#F04438]/12 text-[#F04438]'
                        }`}
                      >
                        {active ? <IconCheck size={12} /> : <IconPlus size={12} />}
                      </span>
                      <span className="text-xs font-extrabold whitespace-nowrap">
                        {spot.shortPinFa}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <header className="absolute top-0 inset-x-0 z-30 px-4 pt-4 safe-top flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={() => setKitchenModalOpen(false)}
                aria-label="بستن"
                className="pointer-events-auto w-11 h-11 rounded-full liquid-glass text-[#292B25] flex items-center justify-center"
              >
                <IconClose size={20} />
              </button>
              <span className="px-4 py-2 rounded-full liquid-glass-dark text-white text-xs font-extrabold">
                وسایل آشپزخانه‌ات را لمس کن
              </span>
              <span className="w-11" />
            </header>

            <footer className="absolute bottom-5 inset-x-4 z-30 safe-bottom max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setKitchenModalOpen(false)}
                className="w-full h-14 rounded-full btn-shimmer text-white font-display font-black text-base"
              >
                ذخیره ({toFaDigits(prefs.appliances.length)} وسیله)
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
