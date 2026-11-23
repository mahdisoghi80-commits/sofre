import 'dotenv/config';
import dns from 'dns/promises';
import express from 'express';
import fs from 'fs';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { INGREDIENTS_MASTER, INGREDIENTS_MAP } from './src/data/database/ingredients';
import { DISH_PHOTOS } from './src/data/database/photos';
import type {
  CuisineType,
  MainProteinType,
  MealSlotType,
  RecipeCategory,
  RecipeMasterRecord,
} from './src/types/sofreh';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Compact canonical ingredient glossary injected into Gemini prompts
const CANONICAL_GLOSSARY = INGREDIENTS_MASTER.map(
  (i) => `${i.code}: ${i.nameFa} (${i.nameEn}) [${i.unit}]`
).join('\n');

const VALID_CUISINES: CuisineType[] = [
  'ایرانی',
  'ایتالیایی',
  'مدیترانه‌ای',
  'آسیایی',
  'مکزیکی',
  'خاورمیانه',
  'بین‌المللی',
];

const VALID_CATEGORIES: RecipeCategory[] = [
  'خورشت',
  'پلو',
  'کباب و مرغ',
  'آش و سوپ',
  'کوکو و خوراک',
  'پاستا و ایتالیایی',
  'آسیایی و کاری',
  'مکزیکی و رپ',
  'کاسه سالم و سالاد',
  'صبحانه و سریع',
];

const VALID_PROTEINS: MainProteinType[] = [
  'beef_lamb',
  'chicken',
  'fish_seafood',
  'egg',
  'legume_plant',
  'dairy_cheese',
];

const PHOTO_BY_CATEGORY: Record<RecipeCategory, string> = {
  خورشت: DISH_PHOTOS.stew_red,
  پلو: DISH_PHOTOS.rice_saffron,
  'کباب و مرغ': DISH_PHOTOS.chicken_roast,
  'آش و سوپ': DISH_PHOTOS.soup_bowl,
  'کوکو و خوراک': DISH_PHOTOS.eggplant_dip,
  'پاستا و ایتالیایی': DISH_PHOTOS.pasta_tomato,
  'آسیایی و کاری': DISH_PHOTOS.stir_fry,
  'مکزیکی و رپ': DISH_PHOTOS.tacos_mexican,
  'کاسه سالم و سالاد': DISH_PHOTOS.salad_med,
  'صبحانه و سریع': DISH_PHOTOS.omelette_pan,
};

function isPrivateOrBlockedIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/i, '');
  if (net.isIPv4(clean)) {
    const parts = clean.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(clean)) {
    const lower = clean.toLowerCase();
    if (
      lower === '::1' ||
      lower === '::' ||
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe80:')
    ) {
      return true;
    }
    return false;
  }
  return true;
}

async function validatePublicHttpUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl.trim());
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('فقط لینک‌های http و https پشتیبانی می‌شوند.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('لینک واردشده معتبر نیست.');
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('لینک‌های محلی قابل دریافت نیستند.');
  }
  if (net.isIP(host) && isPrivateOrBlockedIp(host)) {
    throw new Error('آدرس شبکه خصوصی مجاز نیست.');
  }
  try {
    const resolved = await dns.lookup(host, { all: true });
    if (resolved.length > 0 && resolved.some((r) => isPrivateOrBlockedIp(r.address))) {
      throw new Error('آدرس مقصد معتبر یا عمومی نیست.');
    }
  } catch (err) {
    // Re-throw explicit SSRF policy violations; allow transient DNS unavailability to fall back cleanly
    if (err instanceof Error && err.message.includes('عمومی نیست')) {
      throw err;
    }
  }
  return parsed;
}

function stripHtmlToReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14_000);
}

async function fetchSafePageText(rawUrl: string): Promise<{ text: string; fetched: boolean }> {
  const safeUrl = await validatePublicHttpUrl(rawUrl);
  try {
    const resp = await fetch(safeUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(7000),
      headers: {
        'User-Agent': 'SofrehRecipeReader/1.0 (+https://sofreh.app)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
    });

    // Follow at most 1 validated redirect
    let activeResp = resp;
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get('location');
      if (loc) {
        const nextUrl = new URL(loc, safeUrl);
        await validatePublicHttpUrl(nextUrl.toString());
        activeResp = await fetch(nextUrl.toString(), {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(6000),
          headers: {
            'User-Agent': 'SofrehRecipeReader/1.0 (+https://sofreh.app)',
            Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
          },
        });
      }
    }

    if (!activeResp.ok) {
      return { text: '', fetched: false };
    }

    const raw = (await activeResp.text()).slice(0, 160_000);
    const cleaned = stripHtmlToReadableText(raw);
    return { text: cleaned, fetched: cleaned.length > 80 };
  } catch {
    return { text: '', fetched: false };
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '14mb' }));

  // Allow native Capacitor Android/iOS WebView origins to call hosted /api/* Gemini routes
  const ALLOWED_NATIVE_ORIGINS = new Set([
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'ionic://localhost',
  ]);
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (ALLOWED_NATIVE_ORIGINS.has(origin) || origin.endsWith('.run.app'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  });

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      canonicalIngredientsCount: INGREDIENTS_MASTER.length,
    });
  });

  // Live Iranian grocery market prices (updated automatically via npm run sync:prices / GitHub Actions)
  app.get('/api/prices-live', (_req, res) => {
    const livePath = path.resolve(__dirname, 'public/prices-live.json');
    if (!fs.existsSync(livePath)) {
      return res.status(404).json({ error: 'فایل قیمت‌های زنده هنوز ساخته نشده است.' });
    }
    res.setHeader('Cache-Control', 'public, max-age=1800');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.sendFile(livePath);
  });

  // Android Test APK metadata for in-app chunked download inside authenticated preview
  app.get('/api/apk-info', (_req, res) => {
    const apkPath = path.resolve(__dirname, 'releases/sofreh-test-debug.apk');
    if (!fs.existsSync(apkPath)) {
      return res.json({ available: false, filename: 'sofreh-test-debug.apk', sizeBytes: 0 });
    }
    const stat = fs.statSync(apkPath);
    return res.json({
      available: true,
      filename: 'sofreh-test-debug.apk',
      sizeBytes: stat.size,
    });
  });

  // Direct Android Test APK download route with explicit Range (206) support for Cloud Run chunking
  app.get('/downloads/sofreh-test-debug.apk', (req, res) => {
    const apkPath = path.resolve(__dirname, 'releases/sofreh-test-debug.apk');
    if (!fs.existsSync(apkPath)) {
      return res.status(404).json({ error: 'فایل APK هنوز ساخته نشده است.' });
    }
    const stat = fs.statSync(apkPath);
    const total = stat.size;
    const range = req.headers.range;

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="sofreh-test-debug.apk"');

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (!match) {
        res.setHeader('Content-Range', `bytes */${total}`);
        return res.status(416).end();
      }
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(total - 1, Number(match[2])) : total - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        res.setHeader('Content-Range', `bytes */${total}`);
        return res.status(416).end();
      }
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', String(end - start + 1));
      return fs.createReadStream(apkPath, { start, end }).pipe(res);
    }

    res.setHeader('Content-Length', String(total));
    return fs.createReadStream(apkPath).pipe(res);
  });

  // Real Gemini Vision Fridge Scanner using gemini-4-hydrogen (server-side only)
  app.post('/api/scan-fridge', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error:
            'کلید هوش مصنوعی روی سرور تنظیم نشده است. می‌توانید مواد را دستی اضافه کنید.',
        });
      }

      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({
          error: 'تصویر یخچال ارسال نشده است. لطفاً یک عکس واضح انتخاب یا ثبت کنید.',
        });
      }

      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
      const safeMime = allowedMimes.includes(mimeType ?? '') ? mimeType! : 'image/jpeg';

      const cleanBase64 = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

      if (cleanBase64.length > 12_000_000) {
        return res.status(413).json({
          error: 'حجم تصویر بسیار زیاد است. لطفاً تصویر کم‌حجم‌تری انتخاب کنید.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `You are a culinary computer-vision assistant for the Persian meal-planning app "Sofreh" (سفره).
Inspect this photograph of a refrigerator, pantry shelf, or kitchen countertop carefully.
Identify every visible edible ingredient and map each detected item to the CLOSEST canonical code from the official ING_* dictionary below.

Rules:
- ONLY return codes that exist verbatim in the dictionary below.
- Do not invent codes or include non-food containers unless their contents are clearly identifiable.
- Return confidence as "high", "medium", or "low".
- Provide a short natural Persian quantityHint (e.g. "۴ عدد", "۱ بسته", "نصف کاسه").
- Write a short 1-sentence summaryFa in Persian summarizing what you spotted.

Canonical ING_* Dictionary:
${CANONICAL_GLOSSARY}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: safeMime,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryFa: { type: Type.STRING },
              detected: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    code: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    quantityHint: { type: Type.STRING },
                  },
                  required: ['code', 'confidence'],
                },
              },
            },
            required: ['summaryFa', 'detected'],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        return res.status(502).json({
          error: 'پاسخی از سرویس هوش مصنوعی دریافت نشد. لطفاً دوباره امتحان کنید.',
        });
      }

      const parsed = JSON.parse(rawText) as {
        summaryFa?: string;
        detected?: Array<{ code: string; confidence?: string; quantityHint?: string }>;
      };

      const seen = new Set<string>();
      const validDetected = (parsed.detected ?? [])
        .filter((item) => {
          if (!item?.code || seen.has(item.code)) return false;
          if (!INGREDIENTS_MAP[item.code]) return false;
          seen.add(item.code);
          return true;
        })
        .map((item) => {
          const master = INGREDIENTS_MAP[item.code];
          const conf =
            item.confidence === 'high' || item.confidence === 'low'
              ? item.confidence
              : 'medium';
          return {
            code: master.code,
            nameFa: master.nameFa,
            confidence: conf as 'high' | 'medium' | 'low',
            quantityHint: item.quantityHint ?? '',
          };
        });

      return res.json({
        summaryFa:
          parsed.summaryFa ??
          `${validDetected.length} قلم ماده غذایی در تصویر یخچال شناسایی شد.`,
        detected: validDetected,
      });
    } catch (err) {
      console.error('[api/scan-fridge] error:', err);
      const message =
        err instanceof Error && err.message.includes('API key')
          ? 'کلید هوش مصنوعی معتبر نیست یا منقضی شده است.'
          : 'خطا در تحلیل تصویر یخچال. می‌توانید مواد را دستی اضافه کنید.';
      return res.status(500).json({ error: message });
    }
  });

  // Real Gemini AI Recipe Link & Text Importer (server-side only, SSRF-protected)
  app.post('/api/import-recipe', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'کلید هوش مصنوعی روی سرور تنظیم نشده است.',
        });
      }

      const { url, notes } = req.body as { url?: string; notes?: string };
      const trimmedUrl = typeof url === 'string' ? url.trim() : '';
      const trimmedNotes = typeof notes === 'string' ? notes.trim().slice(0, 6000) : '';

      if (!trimmedUrl && !trimmedNotes) {
        return res.status(400).json({
          error: 'لطفاً لینک دستور غذا یا متن آن را وارد کنید.',
        });
      }

      let fetchedContent = '';
      let fetchedFromWeb = false;

      if (trimmedUrl) {
        try {
          const result = await fetchSafePageText(trimmedUrl);
          fetchedContent = result.text;
          fetchedFromWeb = result.fetched;
        } catch (urlErr) {
          return res.status(400).json({
            error:
              urlErr instanceof Error ? urlErr.message : 'لینک واردشده معتبر نیست.',
          });
        }
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `You are a Persian culinary data extractor for the app "Sofreh" (سفره).
Extract a clean, complete, authentic recipe in natural Persian (Farsi) from the provided URL and/or page content.
If the website blocked scraping (content is empty), infer the exact classic recipe clearly named in the URL slug or user notes.

Rules:
- title: Clean Persian dish name (never include words like "ارزان" or "خیلی اقتصادی").
- titleEn: Short English dish name.
- subtitle: Short 6-10 word appetizing Persian description.
- cuisine: Must be strictly one of: ${VALID_CUISINES.join(', ')}.
- category: Must be strictly one of: ${VALID_CATEGORIES.join(', ')}.
- mainProtein: Must be strictly one of: ${VALID_PROTEINS.join(', ')}.
- difficulty: Must be one of: "آسان", "متوسط", "مجلسی".
- mealTypes: array from ["breakfast", "lunch", "dinner"].
- baseServings: integer 1..6 (default 2).
- prepMinutes & cookMinutes: realistic integers.
- caloriesPerServing, proteinG, carbsG, fatG, fiberG: realistic per-serving nutritional integers.
- ingredients: 4 to 10 items, EVERY code MUST exist verbatim in the Canonical ING_* Dictionary below, with realistic numeric amount matching that code's unit!
- steps: 3 to 6 clear step-by-step Persian cooking instructions with realistic timerSeconds (optional, e.g. 600 for 10 min) and optional short Persian tip.

Source URL: ${trimmedUrl || 'N/A'}
User Notes: ${trimmedNotes || 'N/A'}
Fetched Page Text (${fetchedFromWeb ? 'fetched' : 'unavailable — use URL slug/notes'}):
${fetchedContent || '(empty)'}

Canonical ING_* Dictionary:
${CANONICAL_GLOSSARY}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              titleEn: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              cuisine: { type: Type.STRING },
              category: { type: Type.STRING },
              mainProtein: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              mealTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
              baseServings: { type: Type.NUMBER },
              prepMinutes: { type: Type.NUMBER },
              cookMinutes: { type: Type.NUMBER },
              caloriesPerServing: { type: Type.NUMBER },
              proteinG: { type: Type.NUMBER },
              carbsG: { type: Type.NUMBER },
              fatG: { type: Type.NUMBER },
              fiberG: { type: Type.NUMBER },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    code: { type: Type.STRING },
                    amount: { type: Type.NUMBER },
                  },
                  required: ['code', 'amount'],
                },
              },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    template: { type: Type.STRING },
                    timerSeconds: { type: Type.NUMBER },
                    tip: { type: Type.STRING },
                  },
                  required: ['template'],
                },
              },
            },
            required: [
              'title',
              'subtitle',
              'cuisine',
              'category',
              'ingredients',
              'steps',
              'caloriesPerServing',
              'proteinG',
              'carbsG',
              'fatG',
            ],
          },
        },
      });

      const rawText = response.text;
      if (!rawText) {
        return res.status(502).json({
          error: 'استخراج دستور غذا با هوش مصنوعی انجام نشد. دوباره تلاش کنید.',
        });
      }

      const data = JSON.parse(rawText) as {
        title?: string;
        titleEn?: string;
        subtitle?: string;
        cuisine?: string;
        category?: string;
        mainProtein?: string;
        difficulty?: string;
        mealTypes?: string[];
        baseServings?: number;
        prepMinutes?: number;
        cookMinutes?: number;
        caloriesPerServing?: number;
        proteinG?: number;
        carbsG?: number;
        fatG?: number;
        fiberG?: number;
        ingredients?: Array<{ code: string; amount: number }>;
        steps?: Array<{ template: string; timerSeconds?: number; tip?: string }>;
      };

      const cuisine: CuisineType = VALID_CUISINES.includes(data.cuisine as CuisineType)
        ? (data.cuisine as CuisineType)
        : 'بین‌المللی';
      const category: RecipeCategory = VALID_CATEGORIES.includes(data.category as RecipeCategory)
        ? (data.category as RecipeCategory)
        : 'کوکو و خوراک';
      const mainProtein: MainProteinType = VALID_PROTEINS.includes(
        data.mainProtein as MainProteinType
      )
        ? (data.mainProtein as MainProteinType)
        : 'chicken';
      const difficulty: 'آسان' | 'متوسط' | 'مجلسی' =
        data.difficulty === 'متوسط' || data.difficulty === 'مجلسی' ? data.difficulty : 'آسان';

      const validMeals = (data.mealTypes ?? []).filter(
        (m): m is MealSlotType => m === 'breakfast' || m === 'lunch' || m === 'dinner'
      );

      // Deduplicate & validate canonical ING_* codes strictly
      const seenIngs = new Set<string>();
      const validIngredients = (data.ingredients ?? [])
        .filter((i) => {
          if (!i?.code || seenIngs.has(i.code) || !INGREDIENTS_MAP[i.code]) return false;
          seenIngs.add(i.code);
          return true;
        })
        .map((i) => ({
          code: i.code,
          amount: Math.max(1, Math.round(Number(i.amount) || 100)),
        }));

      if (validIngredients.length === 0) {
        validIngredients.push(
          { code: 'ING_ONION', amount: 120 },
          { code: 'ING_TOMATO', amount: 200 },
          { code: 'ING_OLIVE_OIL', amount: 2 }
        );
      }

      const validSteps: Array<{ template: string; timerSeconds?: number; tip?: string }> = (
        data.steps ?? []
      )
        .filter((s) => typeof s?.template === 'string' && s.template.trim().length > 4)
        .map((s) => ({
          template: s.template.trim(),
          timerSeconds:
            typeof s.timerSeconds === 'number' && s.timerSeconds >= 30
              ? Math.min(7200, Math.round(s.timerSeconds))
              : undefined,
          tip: typeof s.tip === 'string' && s.tip.trim() ? s.tip.trim() : undefined,
        }));

      if (validSteps.length === 0) {
        validSteps.push({
          template: 'مواد اولیه را آماده کرده و روی حرارت ملایم بپزید تا کاملاً جا بیفتد.',
          timerSeconds: 1200,
        });
      }

      const cleanTitle = (data.title || 'دستور واردشده')
        .replace(/خیلی اقتصادی|خیلی ارزان|اقتصادی|ارزان/g, '')
        .trim();

      const record: RecipeMasterRecord = {
        id: `ai-import-${Date.now()}`,
        title: cleanTitle || 'دستور واردشده',
        titleEn: data.titleEn?.trim() || cleanTitle,
        subtitle: data.subtitle?.trim() || 'واردشده با هوش مصنوعی از لینک شما',
        cuisine,
        category,
        mainProtein,
        icon: '', // Resolved on client with FOOD_ICONS
        photoUrl: PHOTO_BY_CATEGORY[category] ?? DISH_PHOTOS.stew_red,
        mealTypes: validMeals.length > 0 ? validMeals : ['lunch', 'dinner'],
        baseServings: Math.max(1, Math.min(8, Math.round(data.baseServings ?? 2))),
        prepMinutes: Math.max(5, Math.min(120, Math.round(data.prepMinutes ?? 15))),
        cookMinutes: Math.max(5, Math.min(240, Math.round(data.cookMinutes ?? 30))),
        caloriesPerServing: Math.max(120, Math.min(1400, Math.round(data.caloriesPerServing ?? 460))),
        proteinG: Math.max(4, Math.min(120, Math.round(data.proteinG ?? 26))),
        carbsG: Math.max(2, Math.min(160, Math.round(data.carbsG ?? 46))),
        fatG: Math.max(2, Math.min(90, Math.round(data.fatG ?? 16))),
        fiberG: Math.max(1, Math.min(40, Math.round(data.fiberG ?? 6))),
        difficulty,
        diets: ['omnivore'],
        allergens: [],
        requiredAppliances: ['stovetop'],
        baseLabels: ['شخصی'],
        ingredients: validIngredients,
        steps: validSteps,
        searchAliases: [cleanTitle, data.titleEn?.trim() || ''].filter(Boolean),
        isCustom: true,
      };

      return res.json({
        recipe: record,
        fetchedFromWeb,
      });
    } catch (err) {
      console.error('[api/import-recipe] error:', err);
      return res.status(500).json({
        error: 'خطا در تحلیل لینک دستور غذا. لطفاً دوباره امتحان کنید.',
      });
    }
  });

  // Multi-turn Gemini AI Chef Chatbot ("سرآشپز هوشمند سفره", server-side only)
  app.post('/api/chef-chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          error: 'کلید هوش مصنوعی روی سرور تنظیم نشده است. در تنظیمات سرور کلید Gemini را بررسی کنید.',
        });
      }

      const {
        message,
        history,
        mode,
        context,
      } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'model'; text: string }>;
        mode?: 'smart' | 'fast';
        context?: {
          householdSize?: number;
          diet?: string;
          allergies?: string[];
          weeklyBudgetToman?: number;
          appliances?: string[];
          pantryNames?: string[];
          todayMeals?: string[];
          activeRecipe?: {
            title: string;
            cuisine: string;
            servings: number;
            ingredients: string[];
            caloriesPerServing: number;
            proteinG: number;
          } | null;
        };
      };

      const trimmedMessage = typeof message === 'string' ? message.trim().slice(0, 2000) : '';
      if (!trimmedMessage) {
        return res.status(400).json({
          error: 'لطفاً سوال یا درخواست آشپزی خود را بنویسید.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const ctx = context ?? {};
      const allergyLine =
        Array.isArray(ctx.allergies) && ctx.allergies.length > 0
          ? ctx.allergies.join('، ')
          : 'هیچ حساسیت ثبت‌شده‌ای ندارد';
      const pantryLine =
        Array.isArray(ctx.pantryNames) && ctx.pantryNames.length > 0
          ? ctx.pantryNames.slice(0, 28).join('، ')
          : 'مورد خاصی ثبت نشده';
      const todayLine =
        Array.isArray(ctx.todayMeals) && ctx.todayMeals.length > 0
          ? ctx.todayMeals.join(' | ')
          : 'هنوز وعده‌ای برای امروز باز نشده';
      const activeRecipeBlock = ctx.activeRecipe
        ? `\nغذای فعلی که کاربر دارد می‌بیند: «${ctx.activeRecipe.title}» (${ctx.activeRecipe.cuisine}، ${ctx.activeRecipe.servings} نفر، ${ctx.activeRecipe.caloriesPerServing} کالری، ${ctx.activeRecipe.proteinG} گرم پروتئین).\nمواد لازم این غذا: ${ctx.activeRecipe.ingredients.slice(0, 14).join('، ')}.`
        : '';

      const systemInstruction = `تو «سرآشپز سفره» هستی — یک سرآشپز حرفه‌ای ایرانی و بین‌المللی، متخصص تغذیه، مدیریت بودجه خانوار به تومان و جلوگیری از دورریز غذا در اپلیکیشن «سفره».
قوانین پاسخ‌گویی تو:
- همیشه به فارسی روان، صمیمی، کاربردی و ساختاریافته (با بولت‌های کوتاه و اعداد فارسی در صورت نیاز) پاسخ بده.
- پاسخ‌ها را خلاصه، مستقیم و دقیق نگه دار (حداکثر ۶ تا ۱۰ خط مگر کاربر دستور کامل خواسته باشد).
- هرگز ماده‌ای که کاربر به آن حساسیت دارد پیشنهاد نکن!
- در پیشنهاد جایگزین مواد، حتماً به موجودی یخچال و ابزار آشپزخانه کاربر توجه کن.
- از مارک‌داون سنگین یا جدول‌های شلوغ استفاده نکن؛ متن تمیز و خوانا بنویس.

پروفایل فعلی کاربر:
- تعداد نفرات: ${ctx.householdSize ?? 2} نفر
- رژیم غذایی: ${ctx.diet ?? 'معمولی'}
- حساسیت‌های غذایی (خط قرمز): ${allergyLine}
- بودجه هفتگی: ${ctx.weeklyBudgetToman ? `${ctx.weeklyBudgetToman.toLocaleString('en-US')} تومان` : 'نامشخص'}
- ابزارهای آشپزخانه: ${(ctx.appliances ?? ['اجاق گاز']).join('، ')}
- موجودی فعلی یخچال: ${pantryLine}
- برنامهٔ امروز: ${todayLine}${activeRecipeBlock}`;

      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (h) =>
                h &&
                (h.role === 'user' || h.role === 'model') &&
                typeof h.text === 'string' &&
                h.text.trim().length > 0
            )
            .slice(-16)
            .map((h) => ({
              role: h.role,
              parts: [{ text: h.text.trim().slice(0, 2000) }],
            }))
        : [];

      const primaryModel = mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
      const fallbackModel = mode === 'fast' ? 'gemini-4-hydrogen' : 'gemini-3.1-flash-lite';

      let reply = '';
      let usedModel = primaryModel;
      let lastErr: unknown = null;

      for (const candidateModel of [primaryModel, fallbackModel]) {
        try {
          const chat = ai.chats.create({
            model: candidateModel,
            history: safeHistory,
            config: {
              systemInstruction,
              thinkingConfig: {
                thinkingLevel:
                  candidateModel === 'gemini-3.1-flash-lite'
                    ? ThinkingLevel.MINIMAL
                    : ThinkingLevel.LOW,
              },
            },
          });
          const response = await chat.sendMessage({
            message: trimmedMessage,
          });
          const text = response.text?.trim();
          if (text) {
            reply = text;
            usedModel = candidateModel;
            break;
          }
        } catch (err) {
          lastErr = err;
          console.warn(`[api/chef-chat] model ${candidateModel} failed, trying fallback:`, err);
        }
      }

      if (!reply) {
        if (lastErr) throw lastErr;
        return res.status(502).json({
          error: 'پاسخی از سرآشپز هوشمند دریافت نشد. لطفاً دوباره امتحان کنید.',
        });
      }

      return res.json({
        reply,
        model: usedModel,
      });
    } catch (err) {
      console.error('[api/chef-chat] error:', err);
      const msg =
        err instanceof Error && (err.message.includes('API key') || err.message.includes('PERMISSION_DENIED'))
          ? 'کلید Gemini معتبر نیست. لطفاً در Settings > Secrets کلید را بررسی کنید.'
          : err instanceof Error && err.message.includes('RESOURCE_EXHAUSTED')
            ? 'سقف درخواست هوش مصنوعی موقتاً پر شده است. لطفاً کمی بعد یا با حالت «پاسخ فوری» امتحان کنید.'
            : 'خطا در ارتباط با سرآشپز هوشمند. لطفاً دوباره تلاش کنید.';
      return res.status(500).json({ error: msg });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sofreh server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
