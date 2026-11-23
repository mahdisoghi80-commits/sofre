import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { INGREDIENTS_MASTER } from '../src/data/database/ingredients';
import type { AisleCategory, IngredientMasterRecord } from '../src/types/sofreh';
import {
  computeRobustUnitPrice,
  normalizeFaText,
  type LiveIngredientPrice,
  type LivePricesPayload,
  type MarketProductOffer,
} from '../src/utils/priceEngine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.resolve(__dirname, '../public/prices-live.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Curated search queries for ingredients whose Persian display name needs
 * explicit pack/freshness cues for clean store search results.
 */
const QUERY_OVERRIDES: Record<string, string> = {
  ING_LAMB_STEW: 'گوشت خورشتی گوسفندی یک کیلو',
  ING_BEEF_MINCED: 'گوشت چرخ کرده گوساله یک کیلو',
  ING_BEEF_SIRLOIN: 'گوشت راسته گوساله یک کیلو',
  ING_LAMB_SHANK: 'ماهیچه گوسفندی تازه یک کیلو',
  ING_CHICKEN_BREAST: 'سینه مرغ بدون استخوان یک کیلو',
  ING_CHICKEN_THIGH: 'ران مرغ تازه یک کیلو',
  ING_CHICKEN_MINCED: 'گوشت مرغ چرخ کرده 500 گرم',
  ING_TURKEY_BREAST: 'سینه بوقلمون یک کیلو',
  ING_FISH_WHITE: 'فیله ماهی قزل آلا یک کیلو',
  ING_SALMON: 'فیله ماهی سالمون 500 گرم',
  ING_SHRIMP: 'میگو پاک شده 500 گرم',
  ING_TUNA_CAN: 'کنسرو تن ماهی 180 گرم',
  ING_EGG: 'تخم مرغ شانه 30 عددی',
  ING_TOFU: 'توفو ارگانیک 300 گرم',
  ING_MILK: 'شیر کم چرب 1 لیتری پگاه',
  ING_YOGURT: 'ماست کم چرب 900 گرمی کاله',
  ING_GREEK_YOGURT: 'ماست چکیده 900 گرمی کاله',
  ING_KASHK: 'کشک پاستوریزه 500 گرمی کاله',
  ING_FETA_CHEESE: 'پنیر سفید ایرانی 400 گرمی',
  ING_MOZZARELLA: 'پنیر پیتزا موزارلا 500 گرمی',
  ING_PARMESAN: 'پنیر پارمسان 100 گرمی',
  ING_CHEDDAR: 'پنیر چدار ورقه ای 200 گرم کاله',
  ING_CREAM_CHEESE: 'پنیر خامه ای 200 گرمی کاله',
  ING_BUTTER: 'کره پاستوریزه 100 گرمی کاله',
  ING_CREAM: 'خامه صبحانه 200 گرمی کاله',
  ING_HEAVY_CREAM: 'خامه صبحانه 200 گرمی کاله',
  ING_COCONUT_MILK: 'شیر نارگیل قوطی 400 میلی لیتر',
  ING_ONION: 'پیاز زرد خوراکی تازه یک کیلو',
  ING_RED_ONION: 'پیاز قرمز خوراکی تازه یک کیلو',
  ING_GARLIC: 'سیر تازه یک کیلو',
  ING_POTATO: 'سیب زمینی زرد تازه یک کیلو',
  ING_SWEET_POTATO: 'سیب زمینی شیرین یک کیلو',
  ING_TOMATO: 'گوجه فرنگی تازه یک کیلو',
  ING_CHERRY_TOMATO: 'گوجه گیلاسی تازه 500 گرم',
  ING_CUCUMBER: 'خیار درختی تازه یک کیلو',
  ING_EGGPLANT: 'بادمجان قلمی تازه یک کیلو',
  ING_ZUCCHINI: 'کدو سبز تازه یک کیلو',
  ING_CARROT: 'هویج تازه یک کیلو',
  ING_BELL_PEPPER: 'فلفل دلمه ای تازه یک کیلو',
  ING_MUSHROOM: 'قارچ دکمه ای خوراکی تازه 400 گرم',
  ING_SPINACH: 'اسفناج تازه یک کیلو',
  ING_BROCCOLI: 'کلم بروکلی تازه 500 گرم',
  ING_CAULIFLOWER: 'گل کلم تازه یک کیلو',
  ING_CELERY: 'کرفس تازه یک کیلو',
  ING_GREEN_BEANS: 'لوبیا سبز تازه یک کیلو',
  ING_OKRA: 'بامیه تازه 500 گرم',
  ING_LETTUCE: 'کاهو رسمی تازه یک کیلو',
  ING_CABBAGE: 'کلم سفید تازه یک کیلو',
  ING_ARUGULA: 'سبزی روکولا آرگولا تازه',
  ING_AVOCADO: 'آووکادو تازه یک کیلو',
  ING_LEMON: 'لیمو ترش تازه یک کیلو',
  ING_LIME: 'لیمو ترش شیرازی یک کیلو',
  ING_BANANA: 'موز تازه یک کیلو',
  ING_APPLE: 'سیب زرد تازه یک کیلو',
  ING_BERRIES: 'توت فرنگی تازه 500 گرم',
  ING_POMEGRANATE_SEEDS: 'انار دانه شده تازه 500 گرم',
  ING_RICE_IRANI: 'برنج طارم هاشمی یک کیلو',
  ING_RICE_BASMATI: 'برنج هندی باسماتی 1 کیلو',
  ING_QUINOA: 'کینوا سفید 500 گرم',
  ING_OATS: 'جو دوسر پرک 500 گرم',
  ING_BARLEY: 'جو پوست کنده یک کیلو',
  ING_BULGUR: 'بلغور گندم یک کیلو',
  ING_PASTA_PENNE: 'ماکارونی پنه 500 گرمی زر',
  ING_SPAGHETTI: 'اسپاگتی 500 گرمی زر ماکارون',
  ING_LASAGNA_SHEET: 'ورقه لازانیا 500 گرمی زر ماکارون',
  ING_NOODLE_ASIAN: 'نودل 75 گرمی بسته 5 عددی',
  ING_RESHTEH_ASH: 'رشته آش 500 گرمی',
  ING_RESHTEH_POLO: 'رشته پلویی 500 گرمی',
  ING_VERMICELLI: 'ورمیشل 400 گرمی',
  ING_SANGAK_BREAD: 'نان سنگک سنتی',
  ING_TORTILLA: 'نان تورتیلا 8 عددی',
  ING_PITA_BREAD: 'نان پیتا لبنانی 6 عددی',
  ING_TOAST_BREAD: 'نان تست سبوس دار 500 گرم',
  ING_BURGER_BUN: 'نان همبرگر 4 عددی',
  ING_FLOUR_WHEAT: 'آرد سفید گندم یک کیلو',
  ING_BREADCRUMBS: 'پودر سوخاری 200 گرم',
  ING_RED_BEANS: 'لوبیا قرمز 900 گرمی',
  ING_WHITE_BEANS: 'لوبیا سفید 900 گرمی',
  ING_PINTO_BEANS: 'لوبیا چیتی 900 گرمی',
  ING_BLACK_BEANS: 'لوبیا سیاه 500 گرمی',
  ING_CHICKPEA: 'نخود آبگوشتی 900 گرمی',
  ING_SPLIT_PEA: 'لپه آذرشهر 900 گرمی',
  ING_LENTILS: 'عدس سبز 900 گرمی',
  ING_RED_LENTILS: 'دال عدس قرمز 900 گرمی',
  ING_MUNG_BEANS: 'ماش سبز 900 گرمی',
  ING_BLACK_EYED_PEA: 'لوبیا چشم بلبلی 900 گرمی',
  ING_WALNUT: 'مغز گردو 500 گرمی',
  ING_ALMOND_SLIVER: 'خلال بادام درختی 200 گرم',
  ING_PISTACHIO: 'خلال پسته سبز 100 گرم',
  ING_PEANUT_BUTTER: 'کره بادام زمینی 300 گرمی',
  ING_CASHEW: 'بادام هندی خام 250 گرم',
  ING_TAHINI: 'ارده کنجد 500 گرمی',
  ING_CHIA_SEEDS: 'دانه چیا 250 گرم',
  ING_TOMATO_PASTE: 'رب گوجه فرنگی 800 گرمی چین چین',
  ING_POMEGRANATE_PASTE: 'رب انار ملس 500 گرمی',
  ING_BARBERRY: 'زرشک پفکی 250 گرم',
  ING_RAISIN: 'کشمش پلویی 500 گرم',
  ING_DATES: 'خرما مضافتی بم 600 گرم',
  ING_DRIED_PLUM: 'آلو بخارا خورشتی 500 گرم',
  ING_OLIVE_OIL: 'روغن زیتون فرابکر 500 میلی لیتر',
  ING_COOKING_OIL: 'روغن مایع سرخ کردنی 1 لیتر بهار',
  ING_SESAME_OIL: 'روغن کنجد 500 میلی لیتر',
  ING_SOY_SAUCE: 'سس سویا 250 میلی لیتر',
  ING_BALSAMIC_VINEGAR: 'سرکه بالزامیک 500 میلی لیتر',
  ING_GRAPE_VINEGAR: 'سرکه سیب 1 لیتر',
  ING_VERJUICE: 'آبغوره طبیعی 1 لیتر',
  ING_HONEY: 'عسل طبیعی 500 گرم',
  ING_MUSTARD: 'سس خردل 250 گرم',
  ING_MAYONNAISE: 'سس مایونز 450 گرم مهرام',
  ING_PESTO_SAUCE: 'سس پستو ریحان 190 گرم',
  ING_BBQ_SAUCE: 'سس باربیکیو 300 گرم',
  ING_SUGAR: 'شکر سفید 1 کیلو',
  ING_ROSEWATER: 'گلاب دو آتشه کاشان 1 لیتر',
  ING_COCOA_POWDER: 'پودر کاکائو 100 گرم',
  ING_SAFFRON: 'زعفران سرگل یک مثقال',
  ING_DRIED_LIME: 'لیمو عمانی جهرم 250 گرم',
  ING_TURMERIC: 'زردچوبه خالص 100 گرم',
  ING_CINNAMON: 'پودر دارچین 100 گرم',
  ING_CUMIN: 'زیره سبز 100 گرم',
  ING_SUMAC: 'سماق قرمز 100 گرم',
  ING_ADVIEH_PERSIAN: 'ادویه خورشتی 100 گرم',
  ING_CURRY_POWDER: 'ادویه کاری 100 گرم',
  ING_PAPRIKA: 'پودر پاپریکا 100 گرم',
  ING_OREGANO: 'آویشن خشک 100 گرم',
  ING_DRIED_MINT: 'نعناع خشک 100 گرم',
  ING_CARDAMOM: 'هل سبز 50 گرم',
  ING_BLACK_PEPPER: 'فلفل سیاه 100 گرم',
  ING_SOUP_STOCK_CUBE: 'قرص عصاره مرغ الیت 6 عددی',
};

/** Positive anchor keywords so search results cannot accidentally match unrelated products */
const REQUIRED_KEYWORDS: Record<string, string[]> = {
  ING_CAULIFLOWER: ['گل کلم'],
  ING_BROCCOLI: ['بروکلی'],
  ING_ONION: ['پیاز'],
  ING_RED_ONION: ['پیاز'],
  ING_MUSHROOM: ['قارچ'],
  ING_BERRIES: ['توت فرنگی', 'بلوبری', 'تمشک'],
  ING_POMEGRANATE_SEEDS: ['انار'],
  ING_SANGAK_BREAD: ['سنگک'],
  ING_PITA_BREAD: ['پیتا'],
  ING_CHEDDAR: ['چدار'],
  ING_MOZZARELLA: ['موزارلا', 'پیتزا'],
  ING_PARMESAN: ['پارمسان', 'پارمزان'],
  ING_OREGANO: ['آویشن', 'اورگانو'],
  ING_DRIED_MINT: ['نعناع', 'نعنا'],
  ING_SOY_SAUCE: ['سویا'],
  ING_SUGAR: ['شکر'],
  ING_BEEF_SIRLOIN: ['گوساله', 'راسته'],
  ING_GREEK_YOGURT: ['ماست'],
  ING_KASHK: ['کشک'],
  ING_ARUGULA: ['روکولا', 'آرگولا', 'منداب'],
  ING_SOUP_STOCK_CUBE: ['عصاره'],
};

/** Per-ingredient negative keywords to block luxury/wrong-category variants */
const EXCLUDE_KEYWORDS: Record<string, string[]> = {
  ING_POMEGRANATE_SEEDS: ['زرشک', 'رب', 'سس', 'لواشک'],
  ING_PITA_BREAD: ['کشمشی', 'شیرمال', 'کیک'],
  ING_CHEDDAR: ['پوستی', 'خیکی', 'گوسفندی', 'پیتزا'],
  ING_BEEF_SIRLOIN: ['شیشلیک', 'گوسفندی'],
  ING_GREEK_YOGURT: ['بز', 'گوسفندی'],
  ING_SOUP_STOCK_CUBE: ['ترکیه', 'بیزیم', 'خارجی'],
  ING_CHICKEN_MINCED: ['محلی', 'مرغ کامل', 'پاک کرده'],
  ING_BREADCRUMBS: ['پاپریکا'],
  ING_PISTACHIO: ['زعفران', 'بهمراه'],
  ING_PEANUT_BUTTER: ['نارگیل', 'شکلات', 'عسلی'],
  ING_SUGAR: ['قهوه ای', 'نیشکر', 'رژیمی', 'استویا'],
};

function getSearchQuery(ing: IngredientMasterRecord): string {
  if (QUERY_OVERRIDES[ing.code]) return QUERY_OVERRIDES[ing.code];
  return ing.nameFa.replace(/\(.*?\)/g, '').trim();
}

function getRequiredKeywords(ing: IngredientMasterRecord): string[] {
  if (REQUIRED_KEYWORDS[ing.code]) return REQUIRED_KEYWORDS[ing.code];
  // Auto-derive main first Persian word from display name (min 3 chars) as a lightweight anchor
  const clean = normalizeFaText(ing.nameFa.replace(/\(.*?\)/g, ''));
  const words = clean.split(' ').filter((w) => w.length >= 3);
  if (words.length === 0) return [];
  const skipGeneric = new Set(['تازه', 'پخته', 'خشک', 'سفید', 'قرمز', 'سبز', 'ایرانی', 'پودر', 'سس', 'ادویه', 'مغز', 'برگ', 'روغن']);
  const anchor = words.find((w) => !skipGeneric.has(w)) ?? words[0];
  return anchor ? [anchor] : [];
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probeTorobAvailability(): Promise<boolean> {
  const url =
    'https://api.torob.com/v4/base-product/search/?q=%D8%A8%D8%B1%D9%86%D8%AC&page=0&size=2';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(12000),
      });
      if (!resp.ok) continue;
      const json = (await resp.json()) as { results?: unknown[] };
      if (Array.isArray(json?.results) && json.results.length > 0) return true;
    } catch {
      if (attempt === 1) await sleep(800);
    }
  }
  return false;
}

async function fetchTorobOffers(query: string): Promise<MarketProductOffer[]> {
  try {
    const url = `https://api.torob.com/v4/base-product/search/?q=${encodeURIComponent(query)}&page=0&size=10`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      results?: Array<{ name1?: string; price?: number }>;
    };
    return (json.results ?? [])
      .filter((r) => r?.name1 && typeof r.price === 'number' && r.price > 0)
      .map((r) => ({
        title: String(r.name1),
        priceToman: Math.round(Number(r.price)), // Torob v4 returns Toman directly
        source: 'torob' as const,
      }));
  } catch {
    return [];
  }
}

async function fetchBasalamOffers(query: string): Promise<MarketProductOffer[]> {
  try {
    const url = `https://search.basalam.com/ai-engine/api/v2.0/product/search?from=0&size=10&q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return [];
    const json = (await resp.json()) as {
      products?: Array<{ name?: string; price?: number; weight?: number }>;
    };
    return (json.products ?? [])
      .filter((p) => p?.name && typeof p.price === 'number' && p.price > 0)
      .map((p) => ({
        title: String(p.name),
        priceToman: Math.round(Number(p.price) / 10), // Basalam returns Rials -> Toman
        apiWeightGrams: typeof p.weight === 'number' && p.weight > 0 ? p.weight : undefined,
        source: 'basalam' as const,
      }));
  } catch {
    return [];
  }
}

async function runPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIdx = 0;

  async function runner() {
    while (true) {
      const idx = nextIdx++;
      if (idx >= items.length) break;
      results[idx] = await worker(items[idx], idx);
      await sleep(110);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));
  return results;
}

function medianNumber(nums: number[]): number {
  if (nums.length === 0) return 1;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function main() {
  const startTime = Date.now();

  console.log(`Probing Iranian price sources for ${INGREDIENTS_MASTER.length} canonical ingredients...`);
  const useTorob = await probeTorobAvailability();
  const sourcesUsed: Array<'torob' | 'basalam' | 'shahrvand'> = useTorob
    ? ['torob', 'basalam']
    : ['basalam'];

  console.log(
    useTorob
      ? '✓ Iran IP detected: Torob (Digikala/Okala/SnappMarket/Shahrvand) + Basalam active!'
      : '✓ Global Cloud mode: Basalam live JSON API active (run locally with Iran VPN to also include Torob).'
  );

  const liveMap: Record<string, LiveIngredientPrice> = {};
  const ratiosByAisle: Record<AisleCategory, number[]> = {
    protein: [],
    produce: [],
    dairy: [],
    bread_grains: [],
    pantry: [],
    spices: [],
  };

  let liveMatchedCount = 0;

  await runPool(INGREDIENTS_MASTER, useTorob ? 3 : 5, async (ing) => {
    const query = getSearchQuery(ing);
    const offers: MarketProductOffer[] = [];

    if (useTorob) {
      const torobOffers = await fetchTorobOffers(query);
      offers.push(...torobOffers);
    }
    const basalamOffers = await fetchBasalamOffers(query);
    offers.push(...basalamOffers);

    const computed = computeRobustUnitPrice(ing, offers, {
      extraExcludeKeywords: EXCLUDE_KEYWORDS[ing.code] ?? [],
      requiredAnyKeywords: getRequiredKeywords(ing),
      minMultiplier: 0.85,
      maxMultiplier: ing.aisle === 'spices' ? 2.8 : 3.85,
    });

    if (computed) {
      liveMap[ing.code] = computed;
      liveMatchedCount++;
      const ratio = computed.unitPriceToman / Math.max(1, ing.unitPriceToman);
      if (ratio >= 0.9 && ratio <= 3.85) {
        ratiosByAisle[ing.aisle].push(ratio);
      }
    }
  });

  // Fill any remaining unmatched fresh/specialty items using same-aisle live inflation median
  const allRatios = Object.values(ratiosByAisle).flat();
  const globalMedianRatio = Math.min(2.8, Math.max(1.2, medianNumber(allRatios)));

  for (const ing of INGREDIENTS_MASTER) {
    if (liveMap[ing.code]) continue;

    const aisleRatios = ratiosByAisle[ing.aisle];
    const aisleRatio =
      aisleRatios.length >= 3
        ? Math.min(3.1, Math.max(1.2, medianNumber(aisleRatios)))
        : globalMedianRatio;

    const rawUnit = ing.unitPriceToman * aisleRatio;
    const unitPriceToman =
      rawUnit >= 1000
        ? Math.round(rawUnit / 100) * 100
        : rawUnit >= 50
          ? Math.round(rawUnit / 5) * 5
          : Math.max(1, Math.round(rawUnit));

    const packPriceToman = Math.max(
      1000,
      Math.round((unitPriceToman * ing.packSize) / 1000) * 1000
    );

    liveMap[ing.code] = {
      unitPriceToman,
      packPriceToman,
      source: 'estimated',
    };
  }

  const payload: LivePricesPayload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    sourcesUsed,
    liveMatchedCount,
    totalCount: INGREDIENTS_MASTER.length,
    prices: liveMap,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const torobCount = Object.values(liveMap).filter((p) => p.source === 'torob').length;
  const basalamCount = Object.values(liveMap).filter((p) => p.source === 'basalam').length;
  const estimatedCount = Object.values(liveMap).filter((p) => p.source === 'estimated').length;
  console.log(`\n✓ Saved ${OUTPUT_PATH}`);
  console.log(
    `✓ Matched ${liveMatchedCount}/${INGREDIENTS_MASTER.length} ingredients directly from live Iranian market (${elapsedSec}s) — Torob: ${torobCount}, Basalam: ${basalamCount}, Estimated: ${estimatedCount}`
  );
  console.log('✓ Sample normalized live prices:');
  for (const code of [
    'ING_CHICKEN_BREAST',
    'ING_LAMB_STEW',
    'ING_EGG',
    'ING_MILK',
    'ING_RICE_IRANI',
    'ING_COOKING_OIL',
    'ING_OREGANO',
    'ING_SUGAR',
    'ING_ONION',
    'ING_SANGAK_BREAD',
  ]) {
    const p = liveMap[code];
    const m = INGREDIENTS_MASTER.find((i) => i.code === code);
    if (p && m) {
      console.log(
        `  - ${m.nameFa} (${m.packSize} ${m.unit}): ${p.packPriceToman.toLocaleString('en-US')} تومان (واحد: ${p.unitPriceToman.toLocaleString('en-US')}) [${p.source}]`
      );
    }
  }
}

main().catch((err) => {
  console.error('Price sync failed:', err);
  process.exit(1);
});
