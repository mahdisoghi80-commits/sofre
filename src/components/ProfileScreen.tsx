import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ALLERGENS_META,
  DAY_NAMES_SHORT,
  DIETS_META,
  DISLIKED_FOODS_META,
} from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type { AllergenId, ApplianceId, CuisinePreference, DietType } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { hapticLight, hapticMedium } from '../utils/native';
import { requestPrepNotificationPermission } from '../utils/notifications';
import { BudgetDial } from './BudgetDial';
import { CuisineRatioControl } from './CuisineRatioControl';
import { InteractiveKitchen2D } from './InteractiveKitchen2D';
import { AndroidApkDownloadCard } from './AndroidApkDownloadCard';
import {
  DietStyleIcon,
  Icon3D,
  IconArrowLeft,
  IconBell,
  IconBellRinging,
  IconClose,
  IconKitchen,
  IconMinus,
  IconPantryShelf,
  IconPlus,
  IconUndo,
  IngredientIcon3D,
  SofrehLogoMark,
} from './icons/SofrehIcons';

import { ChefHat, Moon, Sun } from '@phosphor-icons/react';

function ratioToCuisinePref(ratio: number): CuisinePreference {
  if (ratio >= 68) return 'mostly_persian';
  if (ratio <= 35) return 'global_explorer';
  return 'balanced';
}

export const ProfileScreen: React.FC<{
  onOpenChefChat?: () => void;
}> = ({ onOpenChefChat }) => {
  const {
    prefs,
    pantry,
    cookbooks,
    cookedCount,
    minWeeklyBudgetToman,
    updatePrefs,
    restartOnboarding,
    openInventory,
    registerBackHandler,
  } = useAppState();

  const [kitchenModalOpen, setKitchenModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  const isDark = prefs.theme === 'dark';

  useEffect(() => {
    if (!kitchenModalOpen && !budgetModalOpen) return;
    return registerBackHandler('profile-modals', () => {
      if (kitchenModalOpen) {
        setKitchenModalOpen(false);
        return true;
      }
      if (budgetModalOpen) {
        setBudgetModalOpen(false);
        return true;
      }
      return false;
    });
  }, [kitchenModalOpen, budgetModalOpen, registerBackHandler]);

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

  const dislikedCodes = prefs.dislikedIngredients ?? [];

  const toggleDislikedFood = (codes: string[]) => {
    hapticLight();
    const hasAny = codes.some((c) => dislikedCodes.includes(c));
    const next = hasAny
      ? dislikedCodes.filter((c) => !codes.includes(c))
      : Array.from(new Set([...dislikedCodes, ...codes]));
    updatePrefs({ dislikedIngredients: next }, true);
  };

  return (
    <div className="space-y-5">
      {/* CLEAN CONSUMER HEADER */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/84 dark:bg-[#161714]/88 backdrop-blur-xl border-b border-white/60 dark:border-white/10 safe-top">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SofrehLogoMark variant="mark" className="w-10 h-10 shrink-0" />
            <h1 className="font-display font-black text-2xl text-[#292B25] dark:text-[#F5EFE8]">
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
            <div className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F] mt-0.5">
              {st.label}
            </div>
          </div>
        ))}
      </section>

      {/* QUICK ACCESS ROW: INVENTORY + AI CHEF */}
      <div className="grid grid-cols-2 gap-2.5">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={openInventory}
          className="liquid-glass-card rounded-[24px] p-4 text-right space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-full bg-[#EEF5E9] dark:bg-[#2B3526] text-[#5E8B42] dark:text-[#8EC06E] flex items-center justify-center shrink-0">
              <IconPantryShelf size={20} />
            </span>
            <IconArrowLeft size={16} className="text-[#9E9B94] dark:text-[#8E8980]" />
          </div>
          <div>
            <div className="font-display font-black text-sm text-[#292B25] dark:text-[#F5EFE8]">
              موجودی یخچال
            </div>
            <div className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa">
              {toFaDigits(inventoryCount)} قلم
            </div>
          </div>
        </motion.button>

        {onOpenChefChat && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              hapticLight();
              onOpenChefChat();
            }}
            data-testid="profile-open-chef-chat"
            className="liquid-glass-card rounded-[24px] p-4 text-right space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="w-10 h-10 rounded-full coral-glass-pill text-white flex items-center justify-center shrink-0">
                <ChefHat size={20} weight="fill" />
              </span>
              <IconArrowLeft size={16} className="text-[#9E9B94] dark:text-[#8E8980]" />
            </div>
            <div>
              <div className="font-display font-black text-sm text-[#292B25] dark:text-[#F5EFE8]">
                سرآشپز هوشمند
              </div>
              <div className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F]">
                مشاوره پخت
              </div>
            </div>
          </motion.button>
        )}
      </div>

      {/* ANDROID APK DIRECT DOWNLOAD (Web preview only — hidden inside native APK) */}
      <AndroidApkDownloadCard variant="card" />

      {/* HOUSEHOLD, DAYS & BUDGET CARD */}
      <section className="liquid-glass-card rounded-[28px] p-5 space-y-5">
        {/* Servings */}
        <div className="flex items-center justify-between">
          <span className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
            تعداد نفرات
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => updatePrefs({ servings: Math.max(1, prefs.servings - 1) }, true)}
              aria-label="کاهش نفرات"
              className="w-9 h-9 rounded-full bg-[#F3E9DE] dark:bg-[#2C2F28] text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center"
            >
              <IconMinus size={16} />
            </button>
            <span className="font-display font-black text-lg text-[#292B25] dark:text-[#F5EFE8] w-10 text-center tabular-nums-fa">
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
        <div className="space-y-2.5 pt-4 border-t border-[#EFE4D8] dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
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
                    active
                      ? 'coral-glass-pill text-white'
                      : 'bg-[#F3E9DE] dark:bg-[#2A2C26] text-[#75746E] dark:text-[#ADA89F]'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget Trigger (Opens Rotary Dial) */}
        <div className="flex items-center justify-between pt-4 border-t border-[#EFE4D8] dark:border-white/10">
          <div>
            <div className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
              بودجهٔ هفتگی
            </div>
            <div className="text-xs font-extrabold text-[#F04438] tabular-nums-fa mt-0.5">
              {formatToman(prefs.weeklyBudgetToman)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBudgetModalOpen(true)}
            className="h-9 px-4 rounded-full bg-[#292B25] dark:bg-[#F5EFE8] text-white dark:text-[#161714] text-xs font-extrabold"
          >
            تغییر بودجه
          </button>
        </div>

        {/* Apple-style Persian / International Balance Control */}
        <div className="pt-4 border-t border-[#EFE4D8] dark:border-white/10">
          <CuisineRatioControl
            compact
            persianRatio={persianRatio}
            onChange={(v) =>
              updatePrefs(
                { persianRatio: v, cuisinePreference: ratioToCuisinePref(v) },
                true
              )
            }
          />
        </div>
      </section>

      {/* DIET & ALLERGIES */}
      <section className="liquid-glass-card rounded-[28px] p-5 space-y-5">
        <div className="space-y-3">
          <h2 className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
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
                      ? 'bg-[#292B25] dark:bg-[#F5EFE8] text-white dark:text-[#161714]'
                      : 'bg-[#FBF5EF] dark:bg-[#262822] text-[#292B25] dark:text-[#E7E2D9] border border-[#EAE0D5] dark:border-white/10'
                  }`}
                >
                  <DietStyleIcon diet={d.id} size={15} />
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-[#EFE4D8] dark:border-white/10">
          <h2 className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
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
                      ? 'bg-[#FFF0ED] dark:bg-[#3A2220] border-2 border-[#F04438]'
                      : 'bg-white dark:bg-[#252721] border border-[#EAE0D5] dark:border-white/10'
                  }`}
                >
                  <Icon3D
                    src={a.icon}
                    alt={a.label}
                    sizeClass="w-12 h-12"
                    roundedClass="rounded-[14px]"
                  />
                  <span className="font-extrabold text-[11px] text-[#292B25] dark:text-[#F5EFE8]">
                    {a.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
        {/* Disliked Foods Tile Grid */}
        <div className="space-y-3 pt-4 border-t border-[#EFE4D8] dark:border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
              مواد ناخواسته
            </h2>
            {dislikedCodes.length > 0 && (
              <span className="text-xs font-extrabold text-[#F04438] tabular-nums-fa">
                {toFaDigits(
                  DISLIKED_FOODS_META.filter((item) =>
                    item.codes.some((c) => dislikedCodes.includes(c))
                  ).length
                )}{' '}
                مورد
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {DISLIKED_FOODS_META.map((item) => {
              const active = item.codes.some((c) => dislikedCodes.includes(c));
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => toggleDislikedFood(item.codes)}
                  className={`rounded-[18px] p-2.5 flex flex-col items-center gap-1.5 transition ${
                    active
                      ? 'bg-[#FFF0ED] dark:bg-[#3A2220] border-2 border-[#F04438]'
                      : 'bg-white dark:bg-[#252721] border border-[#EAE0D5] dark:border-white/10'
                  }`}
                >
                  <IngredientIcon3D
                    src={item.icon}
                    alt={item.label}
                    sizeClass="w-9 h-9"
                  />
                  <span
                    className={`text-[10px] font-extrabold text-center leading-tight line-clamp-1 ${
                      active
                        ? 'text-[#C42F26] dark:text-[#FF8A80]'
                        : 'text-[#292B25] dark:text-[#E7E2D9]'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* KITCHEN APPLIANCES (2D INTERACTIVE), APPEARANCE & REMINDERS */}
      <section className="liquid-glass-card rounded-[28px] p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-full bg-[#FFF0ED] dark:bg-[#3A2220] text-[#F04438] flex items-center justify-center shrink-0">
              <IconKitchen size={19} />
            </span>
            <div className="min-w-0">
              <div className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
                وسایل آشپزخانه
              </div>
              <div className="text-xs font-bold text-[#75746E] dark:text-[#ADA89F] tabular-nums-fa">
                {toFaDigits(prefs.appliances.length)} وسیله فعال
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setKitchenModalOpen(true)}
            data-testid="profile-open-kitchen-2d"
            className="h-9 px-4 rounded-full bg-[#292B25] dark:bg-[#F5EFE8] text-xs font-extrabold text-white dark:text-[#161714] shrink-0"
          >
            ویرایش
          </button>
        </div>

        {/* Appearance & Reminders Toggles */}
        <div className="pt-4 border-t border-[#EFE4D8] dark:border-white/10 space-y-3.5">
          {/* Dark Mode Switch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isDark ? (
                <Moon size={18} weight="fill" className="text-[#F04438]" />
              ) : (
                <Sun size={18} weight="fill" className="text-[#E69A2B]" />
              )}
              <span className="font-extrabold text-sm text-[#292B25] dark:text-[#F5EFE8]">
                حالت تیره
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="حالت تیره"
              aria-checked={isDark}
              data-testid="dark-mode-toggle"
              onClick={() => {
                hapticLight();
                updatePrefs({ theme: isDark ? 'light' : 'dark' });
              }}
              className={`w-12 h-7 rounded-full p-1 transition flex items-center ${
                isDark
                  ? 'bg-[#F04438] justify-start'
                  : 'bg-[#DDD3C7] dark:bg-[#3A3D35] justify-end'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBell size={18} className="text-[#C87955]" />
              <span className="font-extrabold text-sm text-[#292B25] dark:text-[#F5EFE8]">
                اعلان شروع پخت ({prefs.reminderTime})
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="اعلان شروع پخت"
              aria-checked={prefs.remindersEnabled}
              onClick={() => updatePrefs({ remindersEnabled: !prefs.remindersEnabled })}
              className={`w-12 h-7 rounded-full p-1 transition flex items-center ${
                prefs.remindersEnabled
                  ? 'bg-[#5E8B42] justify-start'
                  : 'bg-[#DDD3C7] dark:bg-[#3A3D35] justify-end'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <IconBellRinging size={18} className="text-[#5E8B42] dark:text-[#8EC06E]" />
              <span className="font-extrabold text-sm text-[#292B25] dark:text-[#F5EFE8]">
                اعلان خیساندن شب قبل
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="اعلان خیساندن شب قبل"
              aria-checked={Boolean(prefs.soakingReminder)}
              onClick={async () => {
                const next = !prefs.soakingReminder;
                updatePrefs({ soakingReminder: next });
                if (next) {
                  await requestPrepNotificationPermission();
                }
              }}
              className={`w-12 h-7 rounded-full p-1 transition flex items-center ${
                prefs.soakingReminder
                  ? 'bg-[#5E8B42] justify-start'
                  : 'bg-[#DDD3C7] dark:bg-[#3A3D35] justify-end'
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
            className="fixed inset-0 z-50 bg-[#292B25]/45 dark:bg-black/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-[#FBF5EF] dark:bg-[#1E201B] rounded-t-[32px] sm:rounded-[32px] p-5 space-y-4 shadow-2xl border border-white dark:border-white/10"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-xl text-[#292B25] dark:text-[#F5EFE8]">
                  بودجهٔ هفتگی
                </h3>
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  aria-label="بستن"
                  className="w-9 h-9 rounded-full bg-white dark:bg-[#2B2E27] text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shadow-sm"
                >
                  <IconClose size={17} />
                </button>
              </div>
              <BudgetDial
                value={prefs.weeklyBudgetToman}
                min={minWeeklyBudgetToman}
                servings={prefs.servings}
                mealsPerWeek={cookingDays.length * prefs.activeMealSlots.length}
                onChange={(val) => updatePrefs({ weeklyBudgetToman: val }, true)}
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


      {/* FULL-SCREEN 2D INTERACTIVE KITCHEN MODAL WITH SIDE SCROLL INDICATORS */}
      <AnimatePresence>
        {kitchenModalOpen && (
          <InteractiveKitchen2D
            mode="modal"
            selectedAppliances={prefs.appliances}
            onToggleAppliance={toggleAppliance}
            onBack={() => setKitchenModalOpen(false)}
            onConfirm={() => setKitchenModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
