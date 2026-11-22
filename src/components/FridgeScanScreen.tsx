import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QUICK_FRIDGE_STAPLE_CODES } from '../data/catalog';
import { useAppState } from '../context/AppStateContext';
import type { FridgeAIDetectedItem } from '../types/sofreh';
import { formatToman, toFaDigits } from '../utils/format';
import { resolveApiUrl } from '../utils/api';
import { matchRecipesByIngredients } from '../utils/planner';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/native';
import {
  getCuisineFlag,
  Icon3D,
  IconAlert,
  IconCalendarPlus,
  IconCheck,
  IconClose,
  IconCookingPot,
  IconFridgeLens,
  IconGallery,
  IconMarketBasket,
  IconPantryShelf,
  IconPlus,
  IconSearch,
  IconSparkle,
  IconTrash,
} from './icons/SofrehIcons';

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      resolve({
        base64,
        mimeType: file.type || 'image/jpeg',
        previewUrl: dataUrl,
      });
    };
    reader.onerror = () => reject(new Error('خواندن تصویر ناموفق بود'));
    reader.readAsDataURL(file);
  });
}

export const FridgeScanScreen: React.FC = () => {
  const {
    recipes,
    ingredientsMaster,
    pantry,
    prefs,
    selectedDay,
    fridgeInitialSubTab,
    openRecipe,
    addMealToPlan,
    addMissingIngredientsToGrocery,
    togglePantryStock,
    setPantryItemsInStock,
    showToast,
  } = useAppState();

  const [subTab, setSubTab] = useState<'camera' | 'inventory'>(fridgeInitialSubTab);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraStatus, setCameraStatus] = useState<'starting' | 'live' | 'unavailable'>('starting');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMetaMap, setAiMetaMap] = useState<Record<string, FridgeAIDetectedItem>>({});
  const [manualQuery, setManualQuery] = useState('');
  const [respectPrefs, setRespectPrefs] = useState(true);

  useEffect(() => {
    setSubTab(fridgeInitialSubTab);
  }, [fridgeInitialSubTab]);

  // Live Inventory codes sourced directly from persisted pantry inStock items!
  const inventoryCodes = useMemo(
    () => pantry.filter((p) => p.inStock).map((p) => p.ingredientId),
    [pantry]
  );

  const ingredientsByCode = useMemo(
    () => Object.fromEntries(ingredientsMaster.map((i) => [i.code, i])),
    [ingredientsMaster]
  );

  // Stop active camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Immediately open live camera when entering Camera sub-tab
  useEffect(() => {
    if (subTab !== 'camera' || capturedPreview) {
      stopCamera();
      return;
    }

    let cancelled = false;
    setCameraStatus('starting');

    const startLiveCamera = async () => {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        if (!cancelled) setCameraStatus('unavailable');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraStatus('live');
      } catch {
        if (!cancelled) setCameraStatus('unavailable');
      }
    };

    startLiveCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [subTab, capturedPreview, stopCamera]);

  const analyzeImageBase64 = useCallback(
    async (base64: string, mimeType: string, previewUrl: string) => {
      setCapturedPreview(previewUrl);
      setAiError(null);
      setAiMessage(null);
      setScanning(true);
      hapticMedium();

      try {
        const resp = await fetch(resolveApiUrl('/api/scan-fridge'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });

        const rawText = await resp.text();
        let data: {
          summaryFa?: string;
          detected?: FridgeAIDetectedItem[];
          error?: string;
        } = {};
        try {
          data = JSON.parse(rawText);
        } catch {
          // Non-JSON response (e.g. backend offline or not yet deployed)
        }

        if (!resp.ok) {
          throw new Error(
            data.error ||
              'اتصال به سرور هوش مصنوعی برقرار نشد. مطمئن شوید نسخه سرور اپ منتشر شده است.'
          );
        }

        const detected = data.detected ?? [];
        if (detected.length === 0) {
          setAiMessage(
            data.summaryFa ?? 'ماده‌ای تشخیص داده نشد؛ می‌توانید دستی به موجودی اضافه کنید.'
          );
        } else {
          hapticSuccess();
          const meta: Record<string, FridgeAIDetectedItem> = {};
          const codes: string[] = [];
          for (const item of detected) {
            meta[item.code] = item;
            codes.push(item.code);
          }
          setAiMetaMap((prev) => ({ ...prev, ...meta }));
          setPantryItemsInStock(codes, true);
          setAiMessage(
            data.summaryFa ?? `${toFaDigits(detected.length)} قلم به موجودی خانه اضافه شد.`
          );
          showToast(`${toFaDigits(detected.length)} قلم به موجودی خانه اضافه شد`);
          setSubTab('inventory');
        }
      } catch (err) {
        setAiError(
          err instanceof Error
            ? err.message
            : 'تحلیل تصویر انجام نشد. می‌توانید مواد را دستی اضافه کنید.'
        );
      } finally {
        setScanning(false);
      }
    },
    [setPantryItemsInStock, showToast]
  );

  const captureFromLiveCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 960;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1] ?? '';
    stopCamera();
    analyzeImageBase64(base64, 'image/jpeg', dataUrl);
  };

  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const { base64, mimeType, previewUrl } = await fileToBase64(file);
      stopCamera();
      analyzeImageBase64(base64, mimeType, previewUrl);
    } catch {
      setAiError('خواندن تصویر انتخاب‌شده ناموفق بود.');
    }
  };

  const manualSuggestions = useMemo(() => {
    const q = manualQuery.trim().toLowerCase();
    if (!q) return [];
    return ingredientsMaster
      .filter((ing) => {
        if (inventoryCodes.includes(ing.code)) return false;
        return (
          ing.nameFa.toLowerCase().includes(q) ||
          ing.nameEn.toLowerCase().includes(q)
        );
      })
      .slice(0, 7);
  }, [ingredientsMaster, manualQuery, inventoryCodes]);

  const matches = useMemo(
    () =>
      matchRecipesByIngredients(
        recipes,
        inventoryCodes,
        respectPrefs ? prefs : undefined
      ).slice(0, 20),
    [recipes, inventoryCodes, respectPrefs, prefs]
  );

  const addCode = (code: string) => {
    hapticLight();
    setPantryItemsInStock([code], true);
    setManualQuery('');
  };

  const removeCode = (code: string) => {
    hapticLight();
    togglePantryStock(code);
  };

  return (
    <div className="space-y-4">
      {/* CLEAN MINIMAL HEADER + CAMERA / INVENTORY SWITCH */}
      <header className="sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-[#FBF5EF]/84 backdrop-blur-xl border-b border-white/60 safe-top">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display font-black text-2xl text-[#292B25]">
            یخچال
          </h1>

          <div className="liquid-glass rounded-full p-1 flex shrink-0">
            <button
              type="button"
              onClick={() => setSubTab('camera')}
              data-testid="fridge-tab-camera"
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                subTab === 'camera' ? 'coral-glass-pill text-white' : 'text-[#5C5952]'
              }`}
            >
              <IconFridgeLens size={15} />
              <span>دوربین</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('inventory')}
              data-testid="fridge-tab-inventory"
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition ${
                subTab === 'inventory' ? 'coral-glass-pill text-white' : 'text-[#5C5952]'
              }`}
            >
              <IconPantryShelf size={15} />
              <span>موجودی ({toFaDigits(inventoryCodes.length)})</span>
            </button>
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryFile}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ==================== SUB-TAB 1: INSTANT LIVE CAMERA ==================== */}
      {subTab === 'camera' && (
        <section
          data-testid="fridge-live-camera"
          className="relative rounded-[32px] overflow-hidden bg-[#141513] text-white shadow-[0_24px_54px_rgba(20,21,19,0.32)] min-h-[470px] sm:min-h-[520px] flex flex-col justify-between"
        >
          {/* Live Video Feed or Captured Photo */}
          {capturedPreview ? (
            <img
              src={capturedPreview}
              alt="تصویر ثبت‌شده"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                cameraStatus === 'live' ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Subtle dark studio backdrop only when camera device isn't available */}
          {!capturedPreview && cameraStatus !== 'live' && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(240,68,56,0.16),transparent_60%),#141513]" />
          )}

          {/* Clean Viewfinder Corner Brackets */}
          <div className="absolute inset-6 pointer-events-none">
            <span className="absolute top-0 right-0 w-7 h-7 border-t-[2.5px] border-r-[2.5px] border-white/70 rounded-tr-xl" />
            <span className="absolute top-0 left-0 w-7 h-7 border-t-[2.5px] border-l-[2.5px] border-white/70 rounded-tl-xl" />
            <span className="absolute bottom-24 right-0 w-7 h-7 border-b-[2.5px] border-r-[2.5px] border-white/70 rounded-br-xl" />
            <span className="absolute bottom-24 left-0 w-7 h-7 border-b-[2.5px] border-l-[2.5px] border-white/70 rounded-bl-xl" />
          </div>

          {scanning && (
            <div className="absolute inset-x-8 h-1 rounded-full bg-gradient-to-r from-transparent via-[#FF6A5C] to-transparent shadow-[0_0_24px_6px_rgba(240,68,56,0.75)] scan-laser z-20" />
          )}

          {/* Top Bar inside Camera */}
          <div className="relative z-10 p-4 flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md text-[11px] font-extrabold text-white/90">
              {scanning
                ? 'در حال تشخیص…'
                : cameraStatus === 'live'
                  ? 'دوربین آماده است'
                  : 'ثبت تصویر یخچال'}
            </span>

            {capturedPreview && !scanning && (
              <button
                type="button"
                onClick={() => {
                  setCapturedPreview(null);
                  setAiError(null);
                }}
                aria-label="عکاسی مجدد"
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center"
              >
                <IconClose size={17} />
              </button>
            )}
          </div>

          {/* Center Minimal State (No verbose AI pitch!) */}
          <div className="relative z-10 flex-1 flex items-center justify-center px-6 text-center">
            {scanning ? (
              <div className="liquid-glass-dark rounded-full px-5 py-3 inline-flex items-center gap-2.5">
                <IconSparkle size={18} className="text-[#FF7A6D] animate-spin" />
                <span className="font-display font-black text-sm">شناسایی مواد…</span>
              </div>
            ) : cameraStatus === 'unavailable' && !capturedPreview ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 mx-auto rounded-full bg-white/12 border border-white/25 flex items-center justify-center text-white"
                >
                  <IconFridgeLens size={28} />
                </button>
                <p className="text-xs font-bold text-white/75">
                  دسترسی دوربین فعال نیست؛ از گالری انتخاب کن
                </p>
              </div>
            ) : null}
          </div>

          {/* Native Camera Bottom Shutter Dock (True Circular Buttons) */}
          <div className="relative z-10 px-6 pb-6 pt-4 bg-gradient-to-t from-black/80 via-black/45 to-transparent flex items-center justify-between">
            {/* Gallery Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              disabled={scanning}
              onClick={() => fileInputRef.current?.click()}
              aria-label="انتخاب از گالری"
              className="w-12 h-12 rounded-full bg-white/18 backdrop-blur-md border border-white/25 text-white flex items-center justify-center disabled:opacity-50"
            >
              <IconGallery size={21} />
            </motion.button>

            {/* Primary Circular Camera Shutter */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              disabled={scanning}
              onClick={() => {
                if (cameraStatus === 'live') {
                  captureFromLiveCamera();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              aria-label="ثبت عکس"
              data-testid="camera-shutter-btn"
              className="w-18 h-18 rounded-full border-4 border-white p-1 flex items-center justify-center disabled:opacity-50"
            >
              <span className="w-full h-full rounded-full bg-white active:bg-[#F04438] transition" />
            </motion.button>

            {/* Switch straight to Inventory */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setSubTab('inventory')}
              aria-label="موجودی خانه"
              className="w-12 h-12 rounded-full bg-white/18 backdrop-blur-md border border-white/25 text-white flex items-center justify-center relative"
            >
              <IconPantryShelf size={20} />
              {inventoryCodes.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#F04438] text-[10px] font-extrabold flex items-center justify-center tabular-nums-fa">
                  {toFaDigits(inventoryCodes.length)}
                </span>
              )}
            </motion.button>
          </div>
        </section>
      )}

      {/* Honest AI Feedback Banners */}
      <AnimatePresence>
        {aiMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-[#EEF2E6] border border-[#68734E]/25 px-4 py-3 flex items-center gap-2.5 text-xs font-bold text-[#3F4A2B]"
          >
            <IconCheck size={16} className="text-[#68734E] shrink-0" />
            <span>{aiMessage}</span>
          </motion.div>
        )}
        {aiError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-[#FFF0ED] border border-[#F04438]/25 px-4 py-3 flex items-center gap-2.5 text-xs font-bold text-[#B42318]"
          >
            <IconAlert size={16} className="shrink-0" />
            <span>{aiError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== SUB-TAB 2: DEDICATED HOME INVENTORY + COOKABLE DISHES ==================== */}
      {subTab === 'inventory' && (
        <div className="space-y-5" data-testid="fridge-inventory-section">
          <section className="liquid-glass-card rounded-[28px] p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-black text-lg text-[#292B25]">
                موجودی یخچال و خانه ({toFaDigits(inventoryCodes.length)})
              </h2>
              {inventoryCodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setPantryItemsInStock(inventoryCodes, false);
                    setAiMetaMap({});
                  }}
                  aria-label="پاک کردن موجودی"
                  className="w-8 h-8 rounded-full bg-[#FFF0ED] text-[#F04438] flex items-center justify-center"
                >
                  <IconTrash size={15} />
                </button>
              )}
            </div>

            {/* 1-by-1 Manual Ingredient Adder */}
            <div className="relative">
              <IconSearch
                size={17}
                className="text-[#75746E] absolute right-3.5 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && manualSuggestions.length > 0) {
                    e.preventDefault();
                    addCode(manualSuggestions[0].code);
                  }
                }}
                data-testid="manual-fridge-input"
                placeholder="افزودن ماده به موجودی (قارچ، مرغ، پنیر…)"
                className="w-full h-11 pr-10 pl-4 rounded-full bg-white border border-[#E6DACD] focus:border-[#F04438] focus:outline-none text-sm font-bold"
              />

              {manualSuggestions.length > 0 && (
                <div className="absolute top-13 inset-x-0 z-30 rounded-2xl bg-white border border-[#E6DACD] shadow-2xl overflow-hidden divide-y divide-[#F3E9DE]">
                  {manualSuggestions.map((ing) => (
                    <button
                      key={ing.code}
                      type="button"
                      onClick={() => addCode(ing.code)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-right hover:bg-[#FFF5F2] transition"
                    >
                      <span className="font-extrabold text-sm text-[#292B25]">{ing.nameFa}</span>
                      <span className="w-7 h-7 rounded-full coral-glass-pill text-white flex items-center justify-center">
                        <IconPlus size={14} />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current Inventory Chips */}
            {inventoryCodes.length === 0 ? (
              <p className="text-xs font-bold text-[#75746E] text-center py-3">
                موردی در موجودی خانه ثبت نشده؛ بالا جستجو کن یا با دوربین اسکن کن.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {inventoryCodes.map((code) => {
                    const ing = ingredientsByCode[code];
                    if (!ing) return null;
                    const aiMeta = aiMetaMap[code];
                    return (
                      <motion.span
                        key={code}
                        layout
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-[#292B25] text-white text-xs font-extrabold"
                      >
                        <span>{ing.nameFa}</span>
                        {aiMeta?.quantityHint && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-[#FFD3CD]">
                            {aiMeta.quantityHint}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCode(code)}
                          aria-label={`حذف ${ing.nameFa}`}
                          className="w-5 h-5 rounded-full bg-white/18 hover:bg-[#F04438] flex items-center justify-center transition"
                        >
                          <IconClose size={11} />
                        </button>
                      </motion.span>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Quick Staple Add Rail */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {QUICK_FRIDGE_STAPLE_CODES.filter((c) => !inventoryCodes.includes(c))
                .slice(0, 12)
                .map((code) => {
                  const ing = ingredientsByCode[code];
                  if (!ing) return null;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => addCode(code)}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-[#E6DACD] hover:border-[#F04438] text-xs font-bold text-[#292B25] flex items-center gap-1 active:scale-95 transition"
                    >
                      <IconPlus size={12} className="text-[#F04438]" />
                      <span>{ing.nameFa}</span>
                    </button>
                  );
                })}
            </div>
          </section>

          {/* COOKABLE MATCHES FROM INVENTORY */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display font-black text-lg text-[#292B25]">
                با همین‌ها می‌تونی بپزی
              </h3>
              <button
                type="button"
                onClick={() => setRespectPrefs((v) => !v)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold transition ${
                  respectPrefs
                    ? 'bg-[#68734E] text-white'
                    : 'liquid-glass text-[#75746E]'
                }`}
              >
                {respectPrefs ? 'مطابق رژیم من' : 'همهٔ غذاها'}
              </button>
            </div>

            {matches.length === 0 ? (
              <div className="liquid-glass-card rounded-[26px] p-6 text-center text-xs font-bold text-[#75746E]">
                چند ماده به موجودی اضافه کن تا غذاهای قابل پخت نمایش داده شوند.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matches.map((item) => {
                  const { recipe, missingIngredients, matchType, missingEstimatedCostToman } = item;
                  return (
                    <motion.article
                      key={recipe.id}
                      layout
                      className="liquid-glass-card rounded-[26px] p-3.5 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openRecipe(recipe.id)}
                          className="shrink-0 active:scale-95 transition"
                        >
                          <Icon3D
                            src={recipe.icon}
                            alt={recipe.title}
                            sizeClass="w-15 h-15"
                            roundedClass="rounded-[18px]"
                          />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                matchType === 'exact'
                                  ? 'bg-[#68734E] text-white'
                                  : 'bg-[#FFF0ED] text-[#C42F26]'
                              }`}
                            >
                              {matchType === 'exact'
                                ? 'آمادهٔ پخت'
                                : `${toFaDigits(missingIngredients.length)} قلم کسری`}
                            </span>
                            <span className="text-sm">{getCuisineFlag(recipe.cuisine)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => openRecipe(recipe.id)}
                            className="font-display font-black text-base text-[#292B25] hover:text-[#F04438] text-right mt-1 block truncate w-full"
                          >
                            {recipe.title}
                          </button>

                          {missingIngredients.length > 0 && (
                            <div className="text-[11px] text-[#75746E] mt-0.5 line-clamp-1">
                              کسری: {missingIngredients.map((m) => m.name).join('، ')} (
                              {formatToman(missingEstimatedCostToman)})
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#EFE4D8]">
                        <button
                          type="button"
                          onClick={() => openRecipe(recipe.id)}
                          className="flex-1 py-2 rounded-full bg-[#FBF5EF] text-[#292B25] font-extrabold text-xs flex items-center justify-center gap-1.5"
                        >
                          <IconCookingPot size={14} className="text-[#F04438]" />
                          <span>دستور</span>
                        </button>
                        {missingIngredients.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => addMissingIngredientsToGrocery(missingIngredients)}
                            className="flex-1 py-2 rounded-full coral-glass-pill text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
                          >
                            <IconMarketBasket size={14} />
                            <span>خرید کسری</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addMealToPlan(selectedDay, 'dinner', recipe.id)}
                            className="flex-1 py-2 rounded-full bg-[#68734E] text-white font-extrabold text-xs flex items-center justify-center gap-1.5"
                          >
                            <IconCalendarPlus size={14} />
                            <span>ثبت در برنامه</span>
                          </button>
                        )}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
