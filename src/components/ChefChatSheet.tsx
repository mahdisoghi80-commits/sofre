import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PaperPlaneTilt, Sparkle, Lightning, Trash, ChefHat } from '@phosphor-icons/react';
import { useAppState } from '../context/AppStateContext';
import { ALLERGENS_META, APPLIANCES_META, DIETS_META } from '../data/catalog';
import type { Recipe } from '../types/sofreh';
import { postApiJson } from '../utils/api';
import { hapticLight, hapticSuccess } from '../utils/native';
import { IconClose } from './icons/SofrehIcons';

export interface ChefChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

interface ChefChatResponse {
  reply: string;
  model: string;
}

function renderChatText(text: string): React.ReactNode {
  const normalized = text.replace(/^\s*[\*\-]\s+/gm, '• ');
  const parts = normalized.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-extrabold text-[#1E201B] dark:text-[#FFF8F0]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const ChefChatSheet: React.FC<{
  open: boolean;
  activeRecipe?: Recipe | null;
  activeServings?: number;
  onClose: () => void;
}> = ({ open, activeRecipe = null, activeServings, onClose }) => {
  const { prefs, pantry, plan, recipes, selectedDay, registerBackHandler } = useAppState();

  const [mode, setMode] = useState<'smart' | 'fast'>('smart');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChefChatMessage[]>([]);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    return registerBackHandler('chef-chat-sheet', () => {
      onClose();
      return true;
    });
  }, [open, onClose, registerBackHandler]);

  useEffect(() => {
    if (!open) return;
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading, open]);

  const userContext = useMemo(() => {
    const dietLabel = DIETS_META.find((d) => d.id === prefs.diet)?.label ?? 'معمولی';
    const allergyLabels = prefs.allergens.map(
      (a) => ALLERGENS_META.find((m) => m.id === a)?.label ?? a
    );
    const applianceLabels = prefs.appliances.map(
      (a) => APPLIANCES_META.find((m) => m.id === a)?.label ?? a
    );
    const pantryNames = pantry.filter((p) => p.inStock).map((p) => p.name);
    const recipeById = new Map(recipes.map((r) => [r.id, r]));
    const todayMeals = plan
      .filter((m) => m.dayIndex === selectedDay)
      .map((m) => recipeById.get(m.recipeId)?.title)
      .filter((t): t is string => Boolean(t));

    return {
      householdSize: prefs.servings,
      diet: dietLabel,
      allergies: allergyLabels,
      weeklyBudgetToman: prefs.weeklyBudgetToman,
      appliances: applianceLabels,
      pantryNames,
      todayMeals,
      activeRecipe: activeRecipe
        ? {
            title: activeRecipe.title,
            cuisine: activeRecipe.cuisine,
            servings: activeServings ?? prefs.servings,
            ingredients: activeRecipe.ingredients.map((i) => `${i.name} (${i.amount} ${i.unit})`),
            caloriesPerServing: activeRecipe.caloriesPerServing,
            proteinG: activeRecipe.proteinG,
          }
        : null,
    };
  }, [prefs, pantry, plan, recipes, selectedDay, activeRecipe, activeServings]);

  const quickPrompts = useMemo(() => {
    if (activeRecipe) {
      return [
        `جایگزین یکی از مواد «${activeRecipe.title}» چیه؟`,
        'چطور کالری این غذا رو کمتر و پروتئینش رو بیشتر کنم؟',
        'نکتهٔ طلایی جاافتادن و خوش‌عطرتر شدن این غذا چیه؟',
        'کنار این غذا چه سالاد یا دورچینی پیشنهاد می‌دی؟',
      ];
    }
    return [
      'با مواد داخل یخچالم الان چی بپزم؟',
      'یه شام سریع زیر ۲۰ دقیقه و سالم پیشنهاد بده',
      'چطور هزینهٔ سبد خرید این هفته رو کمتر کنم؟',
      'ترفند ته‌دیگ طلایی و برنج کاملاً دون‌دون چیه؟',
    ];
  }, [activeRecipe]);

  const sendMessage = async (rawText?: string) => {
    const text = (rawText ?? input).trim();
    if (!text || loading) return;

    hapticLight();
    setError(null);
    setInput('');

    const userMsg: ChefChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    const historySnapshot = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await postApiJson<ChefChatResponse & { error?: string }>(
        '/api/chef-chat',
        {
          message: text,
          history: historySnapshot,
          mode,
          context: userContext,
        },
        45_000
      );

      if (!resp.ok || !resp.data.reply) {
        throw new Error(
          resp.data.error ||
            'ارتباط با سرآشپز هوشمند برقرار نشد. لطفاً دوباره امتحان کنید.'
        );
      }

      hapticSuccess();
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          role: 'model',
          text: resp.data.reply,
          modelUsed: resp.data.model,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'ارتباط با سرآشپز هوشمند برقرار نشد. لطفاً دوباره امتحان کنید.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    hapticLight();
    setMessages([]);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#1B1C18]/50 flex items-end md:items-center justify-center md:p-4"
          onClick={onClose}
        >
          <motion.section
            role="dialog"
            aria-label="سرآشپز هوشمند سفره"
            data-testid="chef-chat-dialog"
            initial={{ y: '100%', opacity: 0.92 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.92 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-[520px] h-[90dvh] md:h-[78dvh] max-h-[760px] rounded-t-[32px] md:rounded-[32px] ambient-canvas border border-white/80 dark:border-white/12 shadow-[0_24px_60px_rgba(24,20,16,0.34)] flex flex-col overflow-hidden"
          >
            {/* Selective Liquid Glass Header */}
            <header className="liquid-glass-nav px-4 pt-3.5 pb-3 border-b border-white/75 dark:border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full coral-glass-pill text-white flex items-center justify-center shrink-0">
                  <ChefHat size={21} weight="fill" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-[17px] font-black text-[#292B25] dark:text-[#F5EFE8] truncate leading-tight">
                    سرآشپز هوشمند سفره
                  </h2>
                  <p className="text-[11px] font-bold text-[#75746E] dark:text-[#ADA89F] truncate">
                    {activeRecipe
                      ? `درباره: ${activeRecipe.title}`
                      : `آگاه به یخچال، بودجه و رژیم شما`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div className="p-0.5 rounded-full bg-[#EFE5D8] dark:bg-[#292B25] flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMode('smart');
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                      mode === 'smart'
                        ? 'bg-[#292B25] dark:bg-[#F5EFE8] text-white dark:text-[#161714] shadow-sm'
                        : 'text-[#66645E] dark:text-[#ADA89F]'
                    }`}
                  >
                    <Sparkle size={12} weight="fill" />
                    هوشمند
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setMode('fast');
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 transition-all ${
                      mode === 'fast'
                        ? 'bg-[#F04438] text-white shadow-sm'
                        : 'text-[#66645E] dark:text-[#ADA89F]'
                    }`}
                  >
                    <Lightning size={12} weight="fill" />
                    فوری
                  </button>
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={resetChat}
                    aria-label="پاک کردن گفت‌وگو"
                    className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-[#75746E] dark:text-[#ADA89F] hover:text-[#D92D20] active:scale-95 transition-transform"
                  >
                    <Trash size={16} weight="bold" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="بستن سرآشپز هوشمند"
                  className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-[#292B25] dark:text-[#F5EFE8] active:scale-95 transition-transform"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Scrollable Multi-Turn Conversation Thread */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
              {messages.length === 0 ? (
                <div className="py-4 space-y-4">
                  <div className="liquid-glass-card rounded-[24px] p-4 space-y-2">
                    <p className="text-[14px] font-extrabold text-[#292B25] dark:text-[#F5EFE8] leading-relaxed">
                      سلام! من سرآشپز اختصاصی سفره‌ام.
                    </p>
                    <p className="text-[12.5px] font-medium text-[#6C6A64] dark:text-[#ADA89F] leading-relaxed">
                      {activeRecipe
                        ? `هر سوالی درباره «${activeRecipe.title}»، جایگزین مواد لازم، تغییر طعم یا نکات پختش داری بپرس.`
                        : 'می‌تونم بر اساس موجودی یخچال، بودجه، رژیم و ابزار آشپزخونه‌ات پیشنهاد غذا بدم، جایگزین مواد بگم یا فوت‌وفن آشپزی راهنمایی کنم.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[11px] font-extrabold text-[#8A877F] dark:text-[#9A958C] px-1">
                      سوال‌های پیشنهادی
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => sendMessage(prompt)}
                          className="text-right px-3.5 py-2.5 rounded-[18px] bg-white/95 dark:bg-[#252721] border border-[#EDE2D4] dark:border-white/10 text-[12.5px] font-bold text-[#292B25] dark:text-[#F5EFE8] hover:border-[#F04438]/40 active:scale-[0.99] transition-all shadow-[0_3px_10px_rgba(96,56,30,0.04)]"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        data-testid={isUser ? 'chef-chat-msg-user' : 'chef-chat-msg-model'}
                        className={`max-w-[86%] rounded-[22px] px-4 py-3 text-[13.5px] leading-[1.75] whitespace-pre-wrap break-words ${
                          isUser
                            ? 'bg-[#292B25] dark:bg-[#F04438] text-white font-semibold rounded-tr-[6px] shadow-[0_6px_18px_rgba(41,43,37,0.18)]'
                            : 'bg-white dark:bg-[#252721] text-[#292B25] dark:text-[#F5EFE8] font-medium border border-[#EFE3D5] dark:border-white/10 rounded-tl-[6px] shadow-[0_6px_18px_rgba(96,56,30,0.06)]'
                        }`}
                      >
                        {isUser ? msg.text : renderChatText(msg.text)}
                      </div>
                    </div>
                  );
                })
              )}

              {loading && (
                <div className="flex justify-end">
                  <div className="bg-white dark:bg-[#252721] border border-[#EFE3D5] dark:border-white/10 rounded-[22px] rounded-tl-[6px] px-4 py-3 flex items-center gap-2 text-[12.5px] font-bold text-[#75746E] dark:text-[#ADA89F] shadow-sm">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F04438] animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E69A2B] animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#68734E] animate-bounce [animation-delay:240ms]" />
                    </span>
                    <span>سرآشپز در حال نوشتن پاسخ...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-[20px] bg-[#FFECEA] dark:bg-[#3A2220] border border-[#F04438]/25 px-4 py-3 text-[12.5px] font-bold text-[#B42318] dark:text-[#FF958C] flex items-center justify-between gap-2">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-[#2A2C25] text-[#B42318] dark:text-[#FF958C] text-[11px] font-extrabold shrink-0"
                  >
                    بستن
                  </button>
                </div>
              )}

              <div ref={threadEndRef} />
            </div>

            {/* Selective Liquid Glass Input Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="liquid-glass-nav px-3.5 py-3 border-t border-white/80 dark:border-white/10 flex items-center gap-2 shrink-0"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="از سرآشپز سفره بپرس..."
                aria-label="پیام به سرآشپز هوشمند"
                data-testid="chef-chat-input"
                disabled={loading}
                className="flex-1 h-11 px-4 rounded-full bg-white/95 dark:bg-[#252721] border border-[#E7DAC9] dark:border-white/10 text-[13.5px] font-semibold text-[#292B25] dark:text-[#F5EFE8] placeholder:text-[#9A968E] focus:outline-none focus:border-[#F04438]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="ارسال پیام"
                data-testid="chef-chat-send"
                className="w-11 h-11 rounded-full coral-glass-pill text-white flex items-center justify-center shrink-0 disabled:opacity-45 active:scale-95 transition-transform"
              >
                <PaperPlaneTilt size={19} weight="fill" className="-scale-x-100" />
              </button>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
