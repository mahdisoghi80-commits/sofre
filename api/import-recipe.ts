import { GoogleGenAI, Type } from '@google/genai';
import { INGREDIENTS_MASTER, INGREDIENTS_MAP } from '../src/data/database/ingredients';
import { DISH_PHOTOS } from '../src/data/database/photos';
import type {
  CuisineType,
  MainProteinType,
  MealSlotType,
  RecipeCategory,
  RecipeMasterRecord,
} from '../src/types/sofreh';
import { applyCors, parseJsonBody, type ServerlessRequest, type ServerlessResponse } from './_cors';

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

interface ImportRecipeBody {
  url?: string;
  notes?: string;
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'سرویس هوش مصنوعی موقتاً در دسترس نیست.',
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
      : 'کوکو و خوراک';
    const mainProtein: MainProteinType = VALID_PROTEINS.includes(data.mainProtein as MainProteinType)
      ? (data.mainProtein as MainProteinType)
      : 'chicken';
    const difficulty: 'آسان' | 'متوسط' | 'مجلسی' =
      data.difficulty === 'متوسط' || data.difficulty === 'مجلسی' ? data.difficulty : 'آسان';

    const validMeals = (data.mealTypes ?? []).filter(
      (m): m is MealSlotType => m === 'breakfast' || m === 'lunch' || m === 'dinner'
    );

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

    const validSteps = (data.steps ?? [])
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
        tip: undefined,
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
      icon: '',
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

    return res.status(200).json({ recipe: record, fetchedFromWeb: false });
  } catch (err) {
    console.error('[api/import-recipe] error:', err);
    return res.status(500).json({
      error: 'خطا در تحلیل دستور غذا. لطفاً دوباره امتحان کنید.',
    });
  }
}
