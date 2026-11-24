import { GoogleGenAI, Type } from '@google/genai';
import { INGREDIENTS_MASTER, INGREDIENTS_MAP } from '../src/data/database/ingredients.js';
import { DISH_PHOTOS } from '../src/data/database/photos.js';
import type {
  CuisineType,
  MainProteinType,
  MealSlotType,
  RecipeCategory,
  RecipeMasterRecord,
} from '../src/types/sofreh.js';

interface ServerlessRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (data: unknown) => void;
  end: () => void;
  setHeader: (key: string, value: string) => void;
}

interface ImportRecipeBody {
  url?: string;
  notes?: string;
}

function applyCors(req: ServerlessRequest, res: ServerlessResponse): boolean {
  const rawOrigin = req.headers.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

function parseJsonBody<T extends object>(req: ServerlessRequest): T {
  if (!req.body) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  if (typeof req.body === 'object') {
    return req.body as T;
  }
  return {} as T;
}

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

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'کلید هوش مصنوعی روی سرور تنظیم نشده است.',
      });
    }

    const { url, notes } = parseJsonBody<ImportRecipeBody>(req);
    const trimmedUrl = typeof url === 'string' ? url.trim() : '';
    const trimmedNotes = typeof notes === 'string' ? notes.trim().slice(0, 6000) : '';

    if (!trimmedUrl && !trimmedNotes) {
      return res.status(400).json({
        error: 'لطفاً لینک دستور غذا یا متن آن را وارد کنید.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const prompt = `You are a Persian culinary data extractor for the app "Sofreh" (سفره).
Extract a clean, complete, authentic recipe in natural Persian (Farsi) from the provided URL and/or user notes.

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
- ingredients: 4 to 10 items, EVERY code MUST exist verbatim in the Canonical ING_* Dictionary below.
- steps: 3 to 6 clear step-by-step Persian cooking instructions with realistic timerSeconds (optional) and optional short Persian tip.

Source URL: ${trimmedUrl || 'N/A'}
User Notes: ${trimmedNotes || 'N/A'}

Canonical ING_* Dictionary:
${CANONICAL_GLOSSARY}`;

    let rawText = '';
    let lastErr: unknown = null;

    for (const model of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']) {
      try {
        const response = await ai.models.generateContent({
          model,
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
        if (response.text) {
          rawText = response.text;
          break;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    if (!rawText) {
      if (lastErr) throw lastErr;
      return res.status(502).json({
        error: 'استخراج دستور غذا انجام نشد. دوباره تلاش کنید.',
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
      : 'صبحانه و سریع';
    const mainProtein: MainProteinType = VALID_PROTEINS.includes(
      data.mainProtein as MainProteinType
    )
      ? (data.mainProtein as MainProteinType)
      : 'legume_plant';
    const difficulty =
      data.difficulty === 'آسان' || data.difficulty === 'مجلسی' ? data.difficulty : 'متوسط';
    const mealTypes: MealSlotType[] = (data.mealTypes ?? []).filter(
      (m): m is MealSlotType => m === 'breakfast' || m === 'lunch' || m === 'dinner'
    );
    if (mealTypes.length === 0) mealTypes.push('lunch', 'dinner');

    const validIngredients = (data.ingredients ?? [])
      .filter((i) => i && typeof i.code === 'string' && Boolean(INGREDIENTS_MAP[i.code]))
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
      mealTypes,
      icon: '/assets/icons/food/skillet.png',
      photoUrl:
        cuisine === 'ایرانی' ? DISH_PHOTOS.persian_morgh : DISH_PHOTOS.pasta_tomato,
      baseServings: Math.max(1, Math.min(6, Math.round(Number(data.baseServings) || 2))),
      prepMinutes: Math.max(5, Math.min(90, Math.round(Number(data.prepMinutes) || 15))),
      cookMinutes: Math.max(5, Math.min(180, Math.round(Number(data.cookMinutes) || 25))),
      caloriesPerServing: Math.max(
        120,
        Math.min(1200, Math.round(Number(data.caloriesPerServing) || 440))
      ),
      proteinG: Math.max(3, Math.min(90, Math.round(Number(data.proteinG) || 22))),
      carbsG: Math.max(3, Math.min(130, Math.round(Number(data.carbsG) || 42))),
      fatG: Math.max(2, Math.min(70, Math.round(Number(data.fatG) || 15))),
      fiberG: Math.max(1, Math.min(30, Math.round(Number(data.fiberG) || 5))),
      difficulty,
      mainProtein,
      diets: ['omnivore'],
      allergens: [],
      requiredAppliances: ['stovetop'],
      baseLabels: ['واردشده'],
      searchAliases: [cleanTitle, data.titleEn?.trim() || cleanTitle],
      ingredients: validIngredients,
      steps: validSteps,
      isCustom: true,
    };

    return res.status(200).json({ recipe: record });
  } catch (err) {
    console.error('[api/import-recipe] error:', err);
    return res.status(500).json({
      error: 'استخراج دستور غذا با خطا مواجه شد. می‌توانید متن دستور را نیز پیست کنید.',
    });
  }
}
