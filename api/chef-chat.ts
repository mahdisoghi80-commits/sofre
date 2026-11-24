import { GoogleGenAI, ThinkingLevel } from '@google/genai';

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

interface ChefChatBody {
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

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({
        error: 'کلید هوش مصنوعی روی سرور تنظیم نشده است. لطفاً GEMINI_API_KEY را در تنظیمات Vercel بررسی کنید.',
      });
    }

    const { message, history, mode, context } = parseJsonBody<ChefChatBody>(req);
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
        const response = await chat.sendMessage({ message: trimmedMessage });
        const text = response.text?.trim();
        if (text) {
          reply = text;
          usedModel = candidateModel;
          break;
        }
      } catch (err) {
        lastErr = err;
        // Retry same model cleanly without thinkingConfig in case the model rejects thinking parameters
        try {
          const fallbackChat = ai.chats.create({
            model: candidateModel,
            history: safeHistory,
            config: { systemInstruction },
          });
          const fallbackResp = await fallbackChat.sendMessage({ message: trimmedMessage });
          const fallbackText = fallbackResp.text?.trim();
          if (fallbackText) {
            reply = fallbackText;
            usedModel = candidateModel;
            break;
          }
        } catch (innerErr) {
          lastErr = innerErr;
        }
      }
    }

    if (!reply) {
      if (lastErr) throw lastErr;
      return res.status(502).json({
        error: 'پاسخی از سرآشپز هوشمند دریافت نشد. لطفاً دوباره امتحان کنید.',
      });
    }

    return res.status(200).json({ reply, model: usedModel });
  } catch (err) {
    console.error('[api/chef-chat] error:', err);
    const errText = err instanceof Error ? err.message : String(err);
    const msg = errText.includes('RESOURCE_EXHAUSTED')
      ? 'سقف درخواست هوش مصنوعی موقتاً پر شده است. لطفاً کمی بعد یا با حالت «پاسخ فوری» امتحان کنید.'
      : errText.includes('API_KEY_INVALID') || errText.includes('API key not valid')
        ? 'کلید هوش مصنوعی معتبر نیست. لطفاً GEMINI_API_KEY را بررسی کنید.'
        : 'خطا در ارتباط با سرآشپز هوشمند. لطفاً دوباره تلاش کنید.';
    return res.status(500).json({ error: msg });
  }
}
