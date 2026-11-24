import { GoogleGenAI, Type } from '@google/genai';
import { INGREDIENTS_MASTER, INGREDIENTS_MAP } from '../src/data/database/ingredients.js';

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

interface ScanFridgeBody {
  imageBase64?: string;
  mimeType?: string;
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

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'کلید هوش مصنوعی روی سرور تنظیم نشده است. می‌توانید مواد را دستی اضافه کنید.',
      });
    }

    const { imageBase64, mimeType } = parseJsonBody<ScanFridgeBody>(req);
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({
        error: 'تصویر یخچال ارسال نشده است. لطفاً یک عکس واضح انتخاب یا ثبت کنید.',
      });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    const safeMime = allowedMimes.includes(mimeType ?? '') ? mimeType! : 'image/jpeg';

    const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
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

    let rawText = '';
    let lastErr: unknown = null;

    for (const model of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { data: cleanBase64, mimeType: safeMime } },
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
          item.confidence === 'high' || item.confidence === 'low' ? item.confidence : 'medium';
        return {
          code: master.code,
          nameFa: master.nameFa,
          confidence: conf as 'high' | 'medium' | 'low',
          quantityHint: item.quantityHint ?? '',
        };
      });

    return res.status(200).json({
      summaryFa:
        parsed.summaryFa ?? `${validDetected.length} قلم ماده غذایی در تصویر یخچال شناسایی شد.`,
      detected: validDetected,
    });
  } catch (err) {
    console.error('[api/scan-fridge] error:', err);
    return res.status(500).json({
      error: 'خطا در تحلیل تصویر یخچال. می‌توانید مواد را دستی اضافه کنید.',
    });
  }
}
