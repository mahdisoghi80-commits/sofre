import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { hapticTick } from '../utils/native';
import { Icon3D, IngredientIcon3D } from './icons/SofrehIcons';

export interface ContextMenuAction {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  tone?: 'default' | 'accent' | 'positive' | 'danger';
  onSelect: () => void;
}

export interface ContextMenuPreview {
  title: string;
  subtitle?: string;
  iconSrc?: string;
  iconKind?: 'food3d' | 'ingredient3d';
}

interface UseLongPressOptions {
  delay?: number;
  moveThreshold?: number;
}

/**
 * Scroll-safe long-press + right-click gesture hook.
 * Cancels immediately if the user drags > 10px so vertical scrolling stays 60fps.
 * Returns `wasLongPressed()` to let onClick handlers cleanly skip normal tap navigation.
 */
export function useLongPress(
  onLongPress: () => void,
  options: UseLongPressOptions = {}
) {
  const { delay = 420, moveThreshold = 10 } = options;
  const timerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button === 2) return; // handled by onContextMenu
      firedRef.current = false;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        hapticTick();
        onLongPress();
      }, delay);
    },
    [clearTimer, delay, onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPosRef.current || timerRef.current === null) return;
      const dx = Math.abs(e.clientX - startPosRef.current.x);
      const dy = Math.abs(e.clientY - startPosRef.current.y);
      if (dx > moveThreshold || dy > moveThreshold) {
        clearTimer();
      }
    },
    [clearTimer, moveThreshold]
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
    startPosRef.current = null;
  }, [clearTimer]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
    startPosRef.current = null;
  }, [clearTimer]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      clearTimer();
      firedRef.current = true;
      hapticTick();
      onLongPress();
    },
    [clearTimer, onLongPress]
  );

  const consumeLongPress = useCallback(() => {
    if (firedRef.current) {
      firedRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onContextMenu,
    },
    consumeLongPress,
  };
}

/**
 * Apple iOS-style frosted long-press context action menu.
 */
export const ContextActionMenu: React.FC<{
  open: boolean;
  preview: ContextMenuPreview | null;
  actions: ContextMenuAction[];
  onClose: () => void;
}> = ({ open, preview, actions, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && preview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          data-testid="context-action-menu-backdrop"
          className="fixed inset-0 z-[70] bg-[#1F1D1A]/40 backdrop-blur-md flex items-end sm:items-center justify-center p-4 pb-8 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 14 }}
            transition={{ type: 'spring', stiffness: 440, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="context-action-menu"
            className="w-full max-w-[330px] space-y-2.5"
          >
            {/* Preview Pill Header */}
            <div className="rounded-[24px] bg-white/95 dark:bg-[#22241F]/95 backdrop-blur-xl px-4 py-3 shadow-[0_14px_36px_rgba(24,20,16,0.18)] border border-transparent dark:border-white/10 flex items-center gap-3">
              {preview.iconSrc && (
                preview.iconKind === 'ingredient3d' ? (
                  <div className="w-11 h-11 rounded-[14px] bg-[#FBF5EF] dark:bg-[#2A2D26] flex items-center justify-center shrink-0">
                    <IngredientIcon3D src={preview.iconSrc} alt={preview.title} sizeClass="w-8 h-8" />
                  </div>
                ) : (
                  <Icon3D
                    src={preview.iconSrc}
                    alt={preview.title}
                    sizeClass="w-11 h-11"
                    roundedClass="rounded-[14px]"
                  />
                )
              )}
              <div className="min-w-0 flex-1 text-right">
                <div className="font-display font-black text-sm text-[#292B25] dark:text-[#F5EFE8] truncate">
                  {preview.title}
                </div>
                {preview.subtitle && (
                  <div className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F] truncate mt-0.5 tabular-nums-fa">
                    {preview.subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Frosted Grouped Action List */}
            <div className="rounded-[24px] bg-white/95 dark:bg-[#22241F]/95 backdrop-blur-xl overflow-hidden shadow-[0_18px_46px_rgba(24,20,16,0.22)] border border-transparent dark:border-white/10 divide-y divide-[#EFE6DC] dark:divide-white/8">
              {actions.map((action) => {
                const toneClasses =
                  action.tone === 'danger'
                    ? 'text-[#D92D20] dark:text-[#FF857B] hover:bg-[#FFF2F0] dark:hover:bg-[#3A2220]'
                    : action.tone === 'positive'
                      ? 'text-[#4C6E35] dark:text-[#98C87A] hover:bg-[#F1F7EC] dark:hover:bg-[#232D1F]'
                      : action.tone === 'accent'
                        ? 'text-[#F04438] dark:text-[#FF7E75] hover:bg-[#FFF4F2] dark:hover:bg-[#3A2220]'
                        : 'text-[#292B25] dark:text-[#F5EFE8] hover:bg-[#F9F4EE] dark:hover:bg-white/6';

                return (
                  <button
                    key={action.id}
                    type="button"
                    data-testid={`context-action-${action.id}`}
                    onClick={() => {
                      onClose();
                      action.onSelect();
                    }}
                    className={`w-full px-4 py-3.5 flex items-center justify-between gap-3 text-right transition-colors active:bg-[#F3EAE0] dark:active:bg-white/10 ${toneClasses}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-extrabold text-[13.5px] leading-snug">
                        {action.label}
                      </div>
                      {action.sublabel && (
                        <div className="text-[10.5px] font-bold text-[#8A847C] dark:text-[#ADA89F] mt-0.5">
                          {action.sublabel}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 opacity-90">{action.icon}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
