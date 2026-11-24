import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChefHat } from '@phosphor-icons/react';
import { useAppState } from '../context/AppStateContext';
import { hapticMedium, hapticSuccess } from '../utils/native';
import {
  IconCheck,
  IconClose,
  IconCrown,
  IconFridgeLens,
  IconPiggyBank,
  IconSparkle,
} from './icons/SofrehIcons';

const PERKS = [
  { icon: <IconFridgeLens size={17} filled />, label: 'اسکن نامحدود یخچال' },
  { icon: <ChefHat size={17} weight="fill" />, label: 'سرآشپز هوشمند' },
  { icon: <IconPiggyBank size={17} />, label: 'بهینه‌سازی خودکار بودجه' },
  { icon: <IconSparkle size={17} />, label: 'دستورهای ویژه و اختصاصی' },
];

export const SubscriptionSheet: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { prefs, updatePrefs, registerBackHandler, showToast } = useAppState();
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');

  useEffect(() => {
    if (!open) return;
    return registerBackHandler('subscription-sheet', () => {
      onClose();
      return true;
    });
  }, [open, onClose, registerBackHandler]);

  const handleActivate = () => {
    hapticSuccess();
    updatePrefs({ isPro: true });
    showToast('اشتراک سفره پلاس فعال شد');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#1B1917]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="subscription-sheet"
            className="w-full sm:max-w-md bg-[#FBF5EF] dark:bg-[#1E201B] rounded-t-[34px] sm:rounded-[34px] p-5 space-y-5 shadow-2xl border border-white dark:border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F6B73C] to-[#DF8B17] text-white flex items-center justify-center shadow-md">
                  <IconCrown size={20} />
                </span>
                <div>
                  <h3 className="font-display font-black text-xl text-[#292B25] dark:text-[#F5EFE8] leading-tight">
                    سفره پلاس
                  </h3>
                  {prefs.isPro && (
                    <span className="text-[11px] font-extrabold text-[#5E8B42] dark:text-[#98C87A]">
                      اشتراک فعال
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="w-9 h-9 rounded-full bg-white dark:bg-[#2A2C25] text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shadow-sm"
              >
                <IconClose size={17} />
              </button>
            </div>

            {/* Crisp Icon-Led 2x2 Perks */}
            <div className="grid grid-cols-2 gap-2.5">
              {PERKS.map((perk) => (
                <div
                  key={perk.label}
                  className="rounded-[20px] bg-white dark:bg-[#262822] p-3 flex items-center gap-2.5 border border-[#EFE4D8] dark:border-white/10"
                >
                  <span className="w-8 h-8 rounded-full bg-[#FFF2EE] dark:bg-[#3A2220] text-[#F04438] dark:text-[#FF7E75] flex items-center justify-center shrink-0">
                    {perk.icon}
                  </span>
                  <span className="text-xs font-extrabold text-[#292B25] dark:text-[#F5EFE8] leading-snug">
                    {perk.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Plan Selector */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  hapticMedium();
                  setSelectedPlan('yearly');
                }}
                className={`relative rounded-[24px] p-4 text-right transition-all border-2 ${
                  selectedPlan === 'yearly'
                    ? 'bg-white dark:bg-[#262822] border-[#F04438] shadow-[0_10px_24px_rgba(240,68,56,0.14)]'
                    : 'bg-white/75 dark:bg-[#22241F]/85 border-transparent'
                }`}
              >
                <span className="inline-block px-2 py-0.5 rounded-full bg-[#EEF2E6] dark:bg-[#232D1F] text-[#4C6E35] dark:text-[#98C87A] text-[10px] font-extrabold mb-2">
                  ۴۵٪ تخفیف
                </span>
                <div className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">سالانه</div>
                <div className="font-display font-black text-xl text-[#F04438] dark:text-[#FF7E75] mt-1 tabular-nums-fa">
                  ۹۹ هزار
                </div>
                <div className="text-[10px] font-bold text-[#75746E] dark:text-[#ADA89F]">ماهانه · پرداخت سالانه</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  hapticMedium();
                  setSelectedPlan('monthly');
                }}
                className={`rounded-[24px] p-4 text-right transition-all border-2 flex flex-col justify-end ${
                  selectedPlan === 'monthly'
                    ? 'bg-white dark:bg-[#262822] border-[#F04438] shadow-[0_10px_24px_rgba(240,68,56,0.14)]'
                    : 'bg-white/75 dark:bg-[#22241F]/85 border-transparent'
                }`}
              >
                <div className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">ماهانه</div>
                <div className="font-display font-black text-xl text-[#292B25] dark:text-[#F5EFE8] mt-1 tabular-nums-fa">
                  ۱۷۹ هزار
                </div>
                <div className="text-[10px] font-bold text-[#75746E] dark:text-[#ADA89F]">تومان در ماه</div>
              </button>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleActivate}
              data-testid="subscription-confirm-btn"
              className="w-full h-14 rounded-full btn-shimmer text-white font-display font-black text-base flex items-center justify-center gap-2"
            >
              {prefs.isPro ? (
                <>
                  <IconCheck size={19} />
                  <span>اشتراک فعال است</span>
                </>
              ) : (
                <>
                  <IconCrown size={19} />
                  <span>فعال‌سازی اشتراک</span>
                </>
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
