import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DAY_NAMES_FULL } from '../data/catalog';
import { getIngredientIconPath } from '../data/database/ingredientIcons';
import { useAppState } from '../context/AppStateContext';
import { dispatchPrepPushNotification } from '../utils/notifications';
import { hapticMedium, hapticSuccess } from '../utils/native';
import {
  Icon3D,
  IconBellRinging,
  IconCheck,
  IconClose,
  IconMoon,
  IngredientIcon3D,
} from './icons/SofrehIcons';

export interface PrepAlertItem {
  dayIndex: number;
  recipeId: string;
  recipeTitle: string;
  recipeIcon: string;
  legumes: string[];
  legumeCodes: string[];
}

export const PrepAlertModal: React.FC<{
  alert: PrepAlertItem | null;
  done: boolean;
  onMarkDone: (recipeId: string) => void;
  onClose: () => void;
}> = ({ alert, done, onMarkDone, onClose }) => {
  const { registerBackHandler, showToast } = useAppState();
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    setNotified(false);
  }, [alert?.recipeId]);

  useEffect(() => {
    if (!alert) return;
    return registerBackHandler('prep-alert-modal', () => {
      onClose();
      return true;
    });
  }, [alert, onClose, registerBackHandler]);

  const handleSchedulePush = async () => {
    if (!alert) return;
    hapticMedium();
    const res = await dispatchPrepPushNotification({
      title: `خیساندن برای ${DAY_NAMES_FULL[alert.dayIndex]}`,
      body: `${alert.legumes.join(' و ')} · ${alert.recipeTitle}`,
      tag: `sofreh-soak-${alert.recipeId}`,
    });
    setNotified(true);
    if (res.delivered) {
      showToast('اعلان یادآور ارسال شد');
    } else {
      showToast('یادآور شب قبل ثبت شد');
    }
  };

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-[#1B1917]/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: '100%', scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="prep-alert-modal"
            className="w-full sm:max-w-sm bg-[#FBF5EF] rounded-t-[34px] sm:rounded-[34px] p-5 space-y-5 shadow-2xl border border-white"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#292B25] text-white text-[11px] font-extrabold">
                <IconMoon size={14} className="text-[#FFD66B]" />
                <span>آماده‌سازی امشب</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="w-9 h-9 rounded-full bg-white text-[#292B25] flex items-center justify-center shadow-sm"
              >
                <IconClose size={16} />
              </button>
            </div>

            {/* Visual Stage: Legume 3D Icons + Target Dish Card */}
            <div className="rounded-[26px] bg-white p-5 border border-[#EFE4D8] flex flex-col items-center text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                {alert.legumeCodes.map((code, idx) => (
                  <div
                    key={code}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-18 h-18 rounded-[22px] bg-[#EEF2E6] flex items-center justify-center shadow-inner">
                      <IngredientIcon3D
                        src={getIngredientIconPath(code, alert.legumes[idx])}
                        alt={alert.legumes[idx] ?? 'حبوبات'}
                        sizeClass="w-13 h-13"
                      />
                    </div>
                    <span className="text-xs font-extrabold text-[#292B25]">
                      {alert.legumes[idx]}
                    </span>
                  </div>
                ))}
              </div>

              {/* Target Dish Pill */}
              <div className="w-full rounded-[20px] bg-[#FBF5EF] p-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon3D
                    src={alert.recipeIcon}
                    alt={alert.recipeTitle}
                    sizeClass="w-11 h-11"
                    roundedClass="rounded-[13px]"
                  />
                  <div className="text-right min-w-0">
                    <div className="text-[10px] font-extrabold text-[#75746E]">
                      {DAY_NAMES_FULL[alert.dayIndex]}
                    </div>
                    <div className="font-display font-black text-sm text-[#292B25] truncate">
                      {alert.recipeTitle}
                    </div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white text-[11px] font-extrabold text-[#5E8B42] shrink-0 tabular-nums-fa">
                  ۸–۱۲ ساعت
                </span>
              </div>
            </div>

            {/* Tactile Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={handleSchedulePush}
                data-testid="prep-alert-push-btn"
                className={`h-13 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                  notified
                    ? 'bg-[#EEF2E6] text-[#4C6E35]'
                    : 'bg-white border border-[#E6DACD] text-[#292B25]'
                }`}
              >
                <IconBellRinging size={17} className="text-[#F04438]" />
                <span>{notified ? 'اعلان فعال شد' : 'اعلان یادآور'}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  hapticSuccess();
                  onMarkDone(alert.recipeId);
                  onClose();
                }}
                data-testid="prep-alert-done-btn"
                className={`h-13 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                  done
                    ? 'bg-[#5E8B42] text-white'
                    : 'coral-glass-pill text-white'
                }`}
              >
                <IconCheck size={17} />
                <span>خیس کردم</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
