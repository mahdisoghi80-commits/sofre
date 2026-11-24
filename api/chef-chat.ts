import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { applyCors, parseJsonBody, type ServerlessRequest, type ServerlessResponse } from './_cors';

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

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'سرویس هوش مصنوعی در حال آماده‌سازی است. لطفاً کمی بعد دوباره تلاش کنید.',
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
    const msg =
      err instanceof Error && err.message.includes('RESOURCE_EXHAUSTED')
        ? 'سقف درخواست هوش مصنوعی موقتاً پر شده است. لطفاً کمی بعد یا با حالت «پاسخ فوری» امتحان کنید.'
        : 'خطا در ارتباط با سرآشپز هوشمند. لطفاً دوباره تلاش کنید.';
    return res.status(500).json({ error: msg });
  }
}
