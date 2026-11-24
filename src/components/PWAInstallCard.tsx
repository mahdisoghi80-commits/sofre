import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DeviceMobile, Export, PlusSquare } from '@phosphor-icons/react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { IconClose } from './icons/SofrehIcons';

export const PWAInstallCard: React.FC<{ variant?: 'card' | 'compact' }> = ({
  variant = 'card',
}) => {
  const { isNative, isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Never show inside native Android/iOS APK or when already installed on Home Screen
  if (isNative || isInstalled) return null;
  if (!isInstallable && !isIOS) return null;

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'compact' ? (
        <div className="w-full mt-2.5 flex justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleClick}
            data-testid="pwa-install-btn"
            className="h-11 px-5 rounded-full liquid-glass text-[#292B25] dark:text-[#F5EFE8] text-xs font-extrabold flex items-center justify-center gap-2"
          >
            <DeviceMobile size={16} weight="duotone" className="text-[#F04438] dark:text-[#FF7E75]" />
            <span>{isIOS ? 'نصب روی صفحه اصلی آیفون (iOS)' : 'نصب وب‌اپ سفره'}</span>
          </motion.button>
        </div>
      ) : (
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={handleClick}
          data-testid="pwa-install-card"
          className="w-full liquid-glass-card rounded-[26px] p-4 flex items-center justify-between text-right gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-full bg-[#FFF0ED] dark:bg-[#3A2220] text-[#F04438] dark:text-[#FF7E75] flex items-center justify-center shrink-0">
              <DeviceMobile size={20} weight="duotone" />
            </span>
            <div className="min-w-0">
              <div className="font-display font-black text-base text-[#292B25] dark:text-[#F5EFE8]">
                {isIOS ? 'نصب نسخه وب‌اپ آیفون (iOS)' : 'نصب نسخه وب‌اپ سفره'}
              </div>
              <div className="text-xs font-bold text-[#75746E] dark:text-[#ADA89F] truncate">
                {isIOS
                  ? 'اجرا تمام‌صفحه روی آیفون و آیپد'
                  : 'افزودن مستقیم به صفحه اصلی گوشی'}
              </div>
            </div>
          </div>

          <span className="px-3.5 py-1.5 rounded-full coral-glass-pill text-white text-xs font-extrabold shrink-0">
            نصب
          </span>
        </motion.button>
      )}

      {/* iOS Safari Add to Home Screen Guide Modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIOSGuide(false)}
            className="fixed inset-0 z-50 bg-[#1B1917]/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-sm bg-[#FBF5EF] dark:bg-[#1E201B] rounded-t-[32px] sm:rounded-[32px] p-5 space-y-4 shadow-2xl border border-white dark:border-white/10 text-right"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-lg text-[#292B25] dark:text-[#F5EFE8]">
                  نصب سفره روی آیفون
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="بستن"
                  className="w-9 h-9 rounded-full bg-white dark:bg-[#2A2C25] text-[#292B25] dark:text-[#F5EFE8] flex items-center justify-center shadow-sm"
                >
                  <IconClose size={16} />
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="rounded-[20px] bg-white dark:bg-[#262822] border border-[#EFE4D8] dark:border-white/10 p-3.5 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#FFF0ED] dark:bg-[#3A2220] text-[#F04438] dark:text-[#FF7E75] flex items-center justify-center shrink-0">
                    <Export size={18} weight="bold" />
                  </span>
                  <p className="text-xs font-extrabold text-[#292B25] dark:text-[#F5EFE8] leading-relaxed">
                    ۱. در مرورگر <strong>Safari</strong>، دکمه <strong>Share</strong> (مربع با فلش رو به بالا) را بزنید.
                  </p>
                </div>

                <div className="rounded-[20px] bg-white dark:bg-[#262822] border border-[#EFE4D8] dark:border-white/10 p-3.5 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#EEF2E6] dark:bg-[#232D1F] text-[#5E8B42] dark:text-[#98C87A] flex items-center justify-center shrink-0">
                    <PlusSquare size={18} weight="bold" />
                  </span>
                  <p className="text-xs font-extrabold text-[#292B25] dark:text-[#F5EFE8] leading-relaxed">
                    ۲. گزینه <strong>Add to Home Screen</strong> و سپس <strong>Add</strong> را انتخاب کنید.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full h-12 rounded-full btn-shimmer text-white font-display font-black text-sm"
              >
                متوجه شدم
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
