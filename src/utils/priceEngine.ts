import type { IngredientMasterRecord } from '../types/sofreh';

export interface MarketProductOffer {
  title: string;
  /** Exact selling price in Toman */
  priceToman: number;
  /** Optional explicit weight in grams from API (e.g. Basalam `weight`) */
  apiWeightGrams?: number;
  source: 'torob' | 'basalam' | 'shahrvand';
}

export interface LiveIngredientPrice {
  unitPriceToman: number;
  packPriceToman: number;
  source: 'torob' | 'basalam' | 'shahrvand' | 'estimated';
  sampleTitle?: string;
  sampleCount?: number;
}

export interface LivePricesPayload {
  version: number;
  updatedAt: string;
  sourcesUsed: Array<'torob' | 'basalam' | 'shahrvand'>;
  liveMatchedCount: number;
  totalCount: number;
  prices: Record<string, LiveIngredientPrice>;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Convert Persian/Arabic digits and normalize Persian characters (ي/ك/half-space) */
export function normalizeFaText(input: string): string {
  let out = input.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ');
  for (let i = 0; i < 10; i++) {
    out = out.replaceAll(PERSIAN_DIGITS[i], String(i)).replaceAll(ARABIC_DIGITS[i], String(i));
  }
  return out.replace(/٬|,/g, '').replace(/\s+/g, ' ').trim();
}

const LEAFY_DRIED_HERB_CODES = new Set([
  'ING_OREGANO',
  'ING_DRIED_MINT',
  'ING_ZAATAR',
]);

/**
 * Realistic culinary grams/ml represented by 1 spoon/cup/slice for non-gram units.
 * Leafy dried herbs (oregano, dried mint) weigh ~2g/spoon, ground spices ~3g/spoon,
 * sugar/cocoa ~12g/spoon, oils/sauces ~12ml/spoon, pastes/honey ~18g/spoon.
 */
export function getGramsPerUnit(ing: IngredientMasterRecord): number {
  switch (ing.unit) {
    case 'گرم':
    case 'میلی‌لیتر':
      return 1;
    case 'قاشق': {
      if (ing.code === 'ING_SAFFRON') return 0.25; // ~0.25g saffron per brewed spoon
      if (LEAFY_DRIED_HERB_CODES.has(ing.code)) return 2;
      if (ing.aisle === 'spices') return 3;
      if (ing.code === 'ING_SUGAR' || ing.code === 'ING_COCOA_POWDER') return 12;
      if (ing.code.includes('PASTE') || ing.code.includes('HONEY')) return 18;
      return 12; // oil / vinegar / soy sauce / mayo / dressing
    }
    case 'برش':
      return 35; // 1 slice toast bread
    case 'پیمانه':
      return 240;
    default:
      return 1;
  }
}

/** Approximate average grams per single count item when store sells by weight */
const GRAMS_PER_PIECE_BY_CODE: Record<string, number> = {
  ING_EGG: 62,
  ING_LEMON: 90,
  ING_LIME: 65,
  ING_GARLIC: 6, // 1 clove
  ING_DRIED_LIME: 12,
  ING_AVOCADO: 180,
  ING_BANANA: 130,
  ING_APPLE: 160,
  ING_SANGAK_BREAD: 450,
  ING_TORTILLA: 55,
  ING_PITA_BREAD: 65,
  ING_BURGER_BUN: 75,
  ING_SOUP_STOCK_CUBE: 10,
};

/**
 * Extract total quantity in grams (or ml, 1:1 approx) or count from a Persian product title.
 * Handles multi-packs like "رب گوجه فرنگی 800 گرمی بسته 3 عددی" -> 2400g
 * and Persian fractional weights like "یک کیلو نیم" -> 1500g.
 */
export function extractOfferQuantity(
  rawTitle: string,
  targetUnit: string,
  apiWeightGrams?: number,
  ingredientCode?: string
): { quantityInTargetUnit: number; confidence: 'high' | 'medium' } | null {
  const title = normalizeFaText(rawTitle);

  // Detect pack multiplier like "بسته 3 عددی", "پک 6 عددی", "3 عدد", "شانه 30 عددی"
  let packCount = 1;
  const multiMatch = title.match(
    /(?:بسته|پک|باکس|کارتن|شانه|بسته\s*بندی)?\s*(\d+(?:\.\d+)?)\s*(?:عددی|عدد|تایی|تا|بسته|قوطی|شیشه|بطری)/
  );
  if (multiMatch) {
    const n = Number(multiMatch[1]);
    if (n >= 1 && n <= 120) {
      packCount = n;
    }
  }

  // Target ingredient counted by piece ('عدد' / 'حبه')
  if (targetUnit === 'عدد' || targetUnit === 'حبه') {
    if (targetUnit === 'عدد' && multiMatch && packCount >= 1) {
      return { quantityInTargetUnit: packCount, confidence: 'high' };
    }
    const grams = extractGramsFromTitle(title, apiWeightGrams);
    const gPerPiece = ingredientCode ? GRAMS_PER_PIECE_BY_CODE[ingredientCode] : undefined;
    if (grams && gPerPiece && grams >= gPerPiece * 0.5) {
      return { quantityInTargetUnit: Math.max(1, grams / gPerPiece), confidence: 'medium' };
    }
    if (targetUnit === 'عدد' && (!apiWeightGrams || apiWeightGrams <= 1500)) {
      return { quantityInTargetUnit: 1, confidence: 'medium' };
    }
    return null;
  }

  // Weight/volume extraction in grams/ml
  const titleGrams = extractGramsFromTitle(title);
  if (titleGrams && titleGrams > 0) {
    const totalGrams = packCount > 1 && titleGrams <= 5000 ? titleGrams * packCount : titleGrams;
    return { quantityInTargetUnit: totalGrams, confidence: 'high' };
  }

  // Fallback to API weight (e.g. Basalam shipping/net weight in grams)
  if (apiWeightGrams && apiWeightGrams >= 10 && apiWeightGrams <= 50_000) {
    const netGrams = apiWeightGrams >= 400 ? Math.round(apiWeightGrams * 0.92) : apiWeightGrams;
    return { quantityInTargetUnit: netGrams, confidence: 'medium' };
  }

  return null;
}

function extractGramsFromTitle(normalizedTitle: string, fallbackApiGrams?: number): number | null {
  const slashNormalized = normalizedTitle.replace(/(\d+)\/(\d+)/g, '$1.$2');

  // Fractional Persian expressions first: "یک کیلو نیم", "یک و نیم کیلو", "دو کیلو نیم"
  if (/(?:یک|1)\s*(?:کیلوگرم|کیلو|لیتر)\s*(?:و\s*)?نیم/.test(slashNormalized)) {
    return 1500;
  }
  if (/(?:یک|1)\s*و\s*نیم\s*(?:کیلوگرم|کیلو|لیتر)/.test(slashNormalized)) {
    return 1500;
  }
  if (/(?:دو|2)\s*(?:کیلوگرم|کیلو|لیتر)\s*(?:و\s*)?نیم/.test(slashNormalized)) {
    return 2500;
  }

  // Numeric Kilograms / Liters
  const kgMatch = slashNormalized.match(
    /(\d+(?:\.\d+)?)\s*(?:کیلوگرم|کیلو|کیلویی|kg|لیتر|لیتری|liter|l\b)/i
  );
  if (kgMatch) {
    const val = Number(kgMatch[1]);
    if (val > 0 && val <= 50) return Math.round(val * 1000);
  }

  if (/(?:یک|۱)\s*(?:کیلو|کیلوگرم|کیلویی|لیتر|لیتری)/.test(slashNormalized)) {
    return 1000;
  }
  if (/(?:نیم|نصف)\s*(?:کیلو|کیلوگرم|کیلویی|لیتر|لیتری)/.test(slashNormalized)) {
    return 500;
  }
  if (/دو\s*(?:کیلو|کیلوگرم|لیتر|لیتری)/.test(slashNormalized)) {
    return 2000;
  }

  // Grams / Milliliters
  const gMatch = slashNormalized.match(
    /(\d+(?:\.\d+)?)\s*(?:گرم|گرمی|gr|g\b|میلی\s*لیتر|میلی‌لیتر|میلی|سی\s*سی|ml|cc)/i
  );
  if (gMatch) {
    const val = Number(gMatch[1]);
    if (val >= 5 && val <= 50_000) return Math.round(val);
  }

  // Methghal for saffron (1 مثقال = 4.608 گرم)
  const mesghalMatch = slashNormalized.match(/(\d+(?:\.\d+)?)\s*مثقال/);
  if (mesghalMatch) {
    const val = Number(mesghalMatch[1]);
    if (val > 0 && val <= 20) return val * 4.6;
  }

  if (fallbackApiGrams && fallbackApiGrams >= 10 && fallbackApiGrams <= 50_000) {
    return fallbackApiGrams;
  }

  return null;
}

/** Non-food / decorative / agricultural junk listings that pollute marketplace search results */
const GLOBAL_BAD_KEYWORDS = [
  'بذر',
  'نهال',
  'دانه کاشت',
  'عروسک',
  'اسباب بازی',
  'پلاستیکی',
  'مصنوعی',
  'کتاب',
  'صابون',
  'شامپو',
  'کرم پوست',
  'لوسیون',
  'روغن مو',
  'اسپری',
  'شمع',
  'مجسمه',
  'ظرف',
  'قابلمه',
  'تخم نطفه',
  'مگنت',
  'آهنربا',
  'جاکلیدی',
  'پیکسل',
  'کلاه',
  'لباس',
  'جوراب',
  'پینترست',
  'تزیینی',
  'دکوری',
  'طرح ',
  'قالب ',
  'شابلون',
  'قارچکش',
  'قارچ کش',
  'آفت کش',
  'سم ',
  'کود ',
  'پیاز گل',
  'گل نرگس',
  'گل لاله',
  'سنبل',
  'باسیلوس',
  'حشره کش',
];

const FRESH_PRODUCE_BAD_KEYWORDS = [
  'خشک',
  'پودر',
  'رب ',
  'سس ',
  'چیپس',
  'ترشی',
  'مربا',
  'پوره',
  'کنسرو',
  'اسلایس خشک',
  'دمنوش',
  'عرق ',
  'شربت',
  'گلاب',
  'پیازداغ',
  'پیاز داغ',
  'سیر داغ',
  'سرخ شده',
  'تفت داده',
  'طعم دار',
  'خیارشور',
  'خیار شور',
  'کبابی',
  'شیرین',
  'زرشک',
];

const FRESH_MEAT_BAD_KEYWORDS = [
  'کنسرو',
  'سوسیس',
  'کالباس',
  'ناگت',
  'شنیسل آماده',
  'عصاره',
  'پودر',
  'غذای گربه',
  'غذای سگ',
  'حیوانات',
  'خشک',
];

export function isOfferRelevant(
  ing: IngredientMasterRecord,
  rawTitle: string,
  extraExcludeKeywords: string[] = [],
  requiredAnyKeywords: string[] = []
): boolean {
  const title = normalizeFaText(rawTitle);

  for (const bad of GLOBAL_BAD_KEYWORDS) {
    if (title.includes(bad)) return false;
  }
  for (const bad of extraExcludeKeywords) {
    const normBad = normalizeFaText(bad);
    if (normBad && title.includes(normBad)) return false;
  }

  // Positive anchor check: at least one required keyword must appear in the product title
  if (requiredAnyKeywords.length > 0) {
    const matched = requiredAnyKeywords.some((kw) => title.includes(normalizeFaText(kw)));
    if (!matched) return false;
  }

  const nameNorm = normalizeFaText(ing.nameFa);
  // Fresh produce should not match dried/paste/pickled/roasted/flower versions
  if (
    ing.aisle === 'produce' &&
    !nameNorm.includes('خشک') &&
    !nameNorm.includes('ترشی') &&
    !nameNorm.includes('کنسرو') &&
    !nameNorm.includes('منجمد') &&
    !nameNorm.includes('شیرین')
  ) {
    for (const bad of FRESH_PRODUCE_BAD_KEYWORDS) {
      if (title.includes(bad)) return false;
    }
  }

  // Fresh meat/chicken/fish should not match pet food, canned, or nuggets
  if (
    ing.aisle === 'protein' &&
    !ing.code.includes('TUNA') &&
    !ing.code.includes('SAUSAGE') &&
    !ing.code.includes('TOFU')
  ) {
    for (const bad of FRESH_MEAT_BAD_KEYWORDS) {
      if (title.includes(bad)) return false;
    }
  }

  return true;
}

/**
 * Compute robust trimmed lower-median unit price (in Toman) from candidate store offers.
 * Guards against non-food matches, baked-in free-shipping premiums on tiny packs,
 * and extreme outliers using strict baseline sanity ratio bounds.
 */
export function computeRobustUnitPrice(
  ing: IngredientMasterRecord,
  offers: MarketProductOffer[],
  options: {
    extraExcludeKeywords?: string[];
    requiredAnyKeywords?: string[];
    minMultiplier?: number;
    maxMultiplier?: number;
  } = {}
): LiveIngredientPrice | null {
  const {
    extraExcludeKeywords = [],
    requiredAnyKeywords = [],
    minMultiplier = 0.85,
    maxMultiplier = 3.85, // realistic Iranian grocery ceiling vs legacy base; filters luxury/misparsed outliers
  } = options;

  const gramsPerUnit = getGramsPerUnit(ing);
  const candidates: Array<{
    unitPrice: number;
    offer: MarketProductOffer;
    confidence: 'high' | 'medium';
    hasFreeShippingPremium: boolean;
  }> = [];

  for (const offer of offers) {
    if (!offer.priceToman || offer.priceToman < 1500 || offer.priceToman > 40_000_000) continue;
    if (!isOfferRelevant(ing, offer.title, extraExcludeKeywords, requiredAnyKeywords)) continue;

    const extracted = extractOfferQuantity(
      offer.title,
      ing.unit,
      offer.apiWeightGrams,
      ing.code
    );
    if (!extracted || extracted.quantityInTargetUnit <= 0) continue;

    const unitsInOffer =
      ing.unit === 'عدد' || ing.unit === 'حبه'
        ? extracted.quantityInTargetUnit
        : extracted.quantityInTargetUnit / gramsPerUnit;

    if (unitsInOffer <= 0) continue;

    // Detect Basalam listings that bake ~50k-70k shipping into "ارسال رایگان" on small orders
    const normTitle = normalizeFaText(offer.title);
    const hasFreeShippingPremium =
      offer.source === 'basalam' &&
      (normTitle.includes('ارسال رایگان') || offer.priceToman < 350_000);

    // Strip a modest shipping margin when a Basalam seller explicitly bakes "ارسال رایگان" into the product price
    const effectiveOfferPrice =
      offer.source === 'basalam' && normTitle.includes('ارسال رایگان') && offer.priceToman > 120_000
        ? Math.max(offer.priceToman - 55_000, offer.priceToman * 0.72)
        : offer.priceToman;

    const unitPrice = effectiveOfferPrice / unitsInOffer;

    // Sanity bounds relative to canonical baseline (prevents unit mis-parses & luxury artisanal traps)
    const minAllowed = Math.max(1, ing.unitPriceToman * minMultiplier);
    const maxAllowed = Math.max(100, ing.unitPriceToman * maxMultiplier);
    if (unitPrice < minAllowed || unitPrice > maxAllowed) continue;

    candidates.push({
      unitPrice,
      offer,
      confidence: extracted.confidence,
      hasFreeShippingPremium,
    });
  }

  if (candidates.length === 0) return null;

  // Prefer high-confidence weight-parsed offers when at least 2 exist
  const highConf = candidates.filter((c) => c.confidence === 'high');
  const pool = highConf.length >= 2 ? highConf : candidates;

  const sorted = [...pool].sort((a, b) => a.unitPrice - b.unitPrice);

  // Trim extreme top/bottom 15% when >= 5 samples
  const trimmed =
    sorted.length >= 5
      ? sorted.slice(Math.floor(sorted.length * 0.15), Math.ceil(sorted.length * 0.85))
      : sorted;

  // Use 40th percentile (lower-median) for Basalam-only pools to match real supermarket shelf prices,
  // and exact 50th percentile when Torob (supermarket aggregator) offers are present.
  const hasTorob = trimmed.some((t) => t.offer.source === 'torob');
  const pctIdx = hasTorob
    ? Math.floor(trimmed.length / 2)
    : Math.max(0, Math.floor((trimmed.length - 1) * 0.4));

  const selectedPrice =
    hasTorob && trimmed.length % 2 === 0 && trimmed.length >= 2
      ? (trimmed[pctIdx - 1].unitPrice + trimmed[pctIdx].unitPrice) / 2
      : trimmed[pctIdx].unitPrice;

  // Round cleanly based on scale
  const unitPriceToman =
    selectedPrice >= 1000
      ? Math.round(selectedPrice / 100) * 100
      : selectedPrice >= 50
        ? Math.round(selectedPrice / 5) * 5
        : Math.max(1, Math.round(selectedPrice));

  const packPriceToman = Math.max(
    1000,
    Math.round((unitPriceToman * ing.packSize) / 1000) * 1000
  );

  const rep = trimmed[pctIdx] ?? sorted[0];

  return {
    unitPriceToman,
    packPriceToman,
    source: rep.offer.source,
    sampleTitle: rep.offer.title.slice(0, 72),
    sampleCount: pool.length,
  };
}
