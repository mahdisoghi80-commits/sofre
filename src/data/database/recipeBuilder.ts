import type {
  AllergenId,
  ApplianceId,
  CuisineType,
  DietType,
  IngredientUsage,
  MainProteinType,
  MealSlotType,
  RecipeCategory,
  RecipeMasterRecord,
  RecipeStep,
} from '../../types/sofreh';
import { FOOD_ICONS, type FoodIconKey } from './assets';
import { DISH_PHOTOS, type DishPhotoKey } from './photos';

export type CookingMethodPattern =
  | 'persian_stew'
  | 'persian_polo'
  | 'persian_kebab'
  | 'persian_soup'
  | 'persian_kuku'
  | 'persian_dip'
  | 'persian_breakfast'
  | 'italian_pasta'
  | 'oven_bake'
  | 'asian_stirfry'
  | 'curry_simmer'
  | 'mexican_wrap'
  | 'grill_sear'
  | 'bowl_assemble'
  | 'salad_toss'
  | 'blender_smoothie'
  | 'soup_blend';

export interface CompactRecipeDef {
  id: string;
  title: string;
  titleEn: string;
  subtitle: string;
  cuisine: CuisineType;
  category: RecipeCategory;
  mainProtein: MainProteinType;
  iconKey: FoodIconKey;
  photoKey: DishPhotoKey;
  mealTypes: MealSlotType[];
  baseServings?: number;
  prep: number;
  cook: number;
  /** [calories, proteinG, carbsG, fatG, fiberG] per serving */
  macros: [number, number, number, number, number];
  diff: 'آسان' | 'متوسط' | 'مجلسی';
  diets?: DietType[];
  appliances: ApplianceId[];
  labels: string[];
  /** Canonical [ING_CODE, amountForBaseServings] tuples */
  ings: Array<[string, number]>;
  method: CookingMethodPattern;
  /** Optional custom chef tip appended to final step */
  chefNote?: string;
  /** Optional explicit custom steps (overrides pattern when provided) */
  customSteps?: RecipeStep[];
  aliases: string[];
}

function pickCodes(ings: Array<[string, number]>, indices: number[]): string[] {
  const result: string[] = [];
  for (const idx of indices) {
    const item = ings[idx];
    if (item) result.push(item[0]);
  }
  return result;
}

/**
 * Generates uniform, culinary-accurate level-by-level step-by-step instructions
 * with dynamic {0}/{1} ingredient scaling tokens and realistic timerSeconds
 * so every one of the 250 dishes feels cohesive in Cook Mode.
 */
function buildStandardSteps(def: CompactRecipeDef): RecipeStep[] {
  if (def.customSteps && def.customSteps.length > 0) {
    return def.customSteps;
  }

  const ing0 = def.ings[0]?.[0];
  const ing1 = def.ings[1]?.[0];
  const ing2 = def.ings[2]?.[0];
  const ing3 = def.ings[3]?.[0];
  const ing4 = def.ings[4]?.[0];
  const cookSec = Math.max(300, def.cook * 60);
  const halfCookSec = Math.max(180, Math.round((def.cook * 60) / 2));
  const finalTip =
    def.chefNote ??
    'پیش از سرو نمک و چاشنی غذا را بچشید و ۲ دقیقه استراحت دهید تا طعم‌ها کاملاً جا بیفتند.';

  switch (def.method) {
    case 'persian_stew':
      return [
        {
          template: 'پیاز و مواد پایه را نگینی خرد کنید و با ادویه روی حرارت ملایم طلایی کنید تا عطرشان بلند شود.',
          ingredientIds: pickCodes(def.ings, [1, 2]),
          timerSeconds: 420,
          tip: 'تفت آرام پیاز پایهٔ لعاب و عطر هر خورشت اصیل است.',
        },
        {
          template: '{0} را اضافه کنید و با حرارت متوسط تفت دهید تا رنگش تغییر کرده و آب نیندازد.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: 360,
        },
        {
          template:
            ing2 && ing3
              ? '{0} و {1} را به قابلمه بیفزایید و همراه با ۲ پیمانه آب جوش مخلوط کنید تا به قل بیفتد.'
              : '{0} را همراه با آب جوش به قابلمه بیفزایید تا خورشت به جوش بیاید.',
          ingredientIds: ing2 && ing3 ? [ing2, ing3] : ing1 ? [ing1] : [],
          timerSeconds: 300,
        },
        {
          template: 'درِ قابلمه را نیمه‌باز بگذارید و اجازه دهید خورشت با شعلهٔ ملایم کاملاً بپزد و به روغن بیفتد.',
          timerSeconds: Math.min(cookSec, 3600),
          tip: 'در ۱۵ دقیقهٔ پایانی چاشنی ترشی یا زعفران را اضافه کنید تا رنگ و عطر حفظ شود.',
        },
        {
          template:
            ing4
              ? 'در مرحلهٔ آخر {0} را اضافه کنید، ۱۰ دقیقه جا بیندازید و داغ سرو کنید.'
              : 'حرارت را خاموش کنید و پس از ۵ دقیقه استراحت، خورشت جاافتاده را سرو کنید.',
          ingredientIds: ing4 ? [ing4] : [],
          timerSeconds: 600,
          tip: finalTip,
        },
      ];

    case 'persian_polo':
      return [
        {
          template: '{0} را بشویید و با کمی نمک حداقل ۳۰ دقیقه خیس کنید تا قد بکشد.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: 1800,
          tip: 'خیساندن برنج ایرانی باعث می‌شود دانه‌ها بدون شکستن کشیده و مجلسی شوند.',
        },
        {
          template:
            ing1 && ing2
              ? 'در تابهٔ جداگانه {0} و {1} را با ادویه و عطر معطر تفت دهید تا مایهٔ میانی پلو آماده شود.'
              : 'مایهٔ میانی و چاشنی پلو را روی حرارت ملایم آماده و معطر کنید.',
          ingredientIds: ing1 && ing2 ? [ing1, ing2] : ing1 ? [ing1] : [],
          timerSeconds: Math.min(900, halfCookSec),
        },
        {
          template: 'برنج را در آب جوش بریزید و وقتی مغزش کمی زنده بود (۶ تا ۸ دقیقه) آبکش کنید.',
          timerSeconds: 420,
        },
        {
          template:
            ing3
              ? 'کف قابلمه را چرب کرده، برنج و مایهٔ میانی را لایه‌لایه همراه با {0} بچینید و دم‌کنی بگذارید.'
              : 'برنج و مواد میانی را لایه‌لایه در قابلمه بچینید و با دم‌کنی روی شعلهٔ ملایم دم بیندازید.',
          ingredientIds: ing3 ? [ing3] : [],
          timerSeconds: Math.min(2100, Math.max(1200, halfCookSec)),
          tip: '۵ دقیقهٔ اول حرارت متوسط باشد تا بخار بپیچد، سپس شعله را کم کنید تا ته‌دیگ طلایی شود.',
        },
        {
          template: 'پلو را آرام هم بزنید تا دانه‌ها نشکنند، با تزئین روی دیس بکشید و سرو کنید.',
          tip: finalTip,
        },
      ];

    case 'persian_kebab':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} را با {1}، ادویه و چاشنی خوب مخلوط یا مرینیت کنید تا طعم به عمق گوشت نفوذ کند.'
              : '{0} را با ادویه‌ها و چاشنی کاملاً طعم‌دار کنید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 900,
          tip: 'استراحت کوتاه در یخچال باعث تردی و آب‌دار ماندن کباب می‌شود.',
        },
        {
          template: 'تابهٔ گریل، سیخ یا فر را کاملاً داغ کنید تا سطح گوشت فوراً شوک حرارتی ببیند.',
          timerSeconds: 240,
        },
        {
          template:
            ing2
              ? 'کباب‌ها را فرم دهید و همراه با {0} روی حرارت یکنواخت بپزید تا دو طرف طلایی و برشته شود.'
              : 'مواد طعم‌دار شده را با حرارت یکنواخت بپزید و هر چند دقیقه برگردانید تا مغزپخت شود.',
          ingredientIds: ing2 ? [ing2] : [],
          timerSeconds: Math.min(1200, cookSec),
          tip: 'از فشار دادن گوشت هنگام پخت خودداری کنید تا آب طبیعی آن خارج نشود.',
        },
        {
          template: 'در دقیقهٔ پایانی کره یا زعفران دم‌کرده را روی سطح کباب بزنید و پس از ۲ دقیقه استراحت سرو کنید.',
          timerSeconds: 180,
          tip: finalTip,
        },
      ];

    case 'persian_soup':
      return [
        {
          template:
            ing0 && ing1
              ? 'پیاز داغ طلایی آماده کنید و {0} را همراه با {1} و ادویه به قابلمه اضافه کنید.'
              : '{0} را همراه با پیاز و زردچوبه کمی تفت دهید تا عطرش آزاد شود.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 420,
        },
        {
          template: 'آب جوش یا عصاره اضافه کنید و اجازه دهید حبوبات و پایهٔ آش/سوپ با حرارت ملایم کاملاً نرم شود.',
          timerSeconds: Math.min(1800, halfCookSec),
          tip: 'هر ۱۰ دقیقه هم بزنید تا ته نگیرد و لعاب یکدست بدهد.',
        },
        {
          template:
            ing2 && ing3
              ? '{0} و {1} را اضافه کنید و بگذارید آش/سوپ به غلظت دلخواه برسد.'
              : ing2
                ? '{0} را اضافه کنید و با حرارت ملایم جا بیندازید.'
                : 'سبزیجات و رشته را اضافه کنید تا کاملاً جا بیفتد.',
          ingredientIds: ing2 && ing3 ? [ing2, ing3] : ing2 ? [ing2] : [],
          timerSeconds: Math.min(1200, halfCookSec),
        },
        {
          template: 'چاشنی نهایی و نعناع‌داغ یا لیمو را بیفزایید و داغ در کاسه سرو کنید.',
          timerSeconds: 180,
          tip: finalTip,
        },
      ];

    case 'persian_kuku':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} و {1} را آماده و یکدست خرد یا رنده کنید تا بافت کوکو یا کتلت منسجم شود.'
              : '{0} را کاملاً آماده و خرد کنید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 300,
          tip: 'گرفتن آب اضافی سبزیجات یا سیب‌زمینی رمز ترد شدن و وا نرفتن کتلت است.',
        },
        {
          template:
            ing2
              ? 'همهٔ مواد را همراه با {0} و ادویه‌ها ۵ دقیقه خوب ورز دهید یا هم بزنید.'
              : 'تخم‌مرغ، ادویه و مواد را کاملاً با هم مخلوط کنید تا مایهٔ یکدستی به دست آید.',
          ingredientIds: ing2 ? [ing2] : [],
          timerSeconds: 300,
        },
        {
          template: 'تابه را با کمی روغن گرم کنید، مایه را پهن یا قالب‌گیری کنید و هر طرف را تا طلایی شدن بپزید.',
          timerSeconds: Math.min(900, cookSec),
          tip: 'در ۵ دقیقهٔ اول درِ تابه را بگذارید تا مغزپخت شود، سپس بدون در سرخ کنید تا برشته بماند.',
        },
        {
          template: 'برش بزنید یا در دیس بچینید و با سبزی خوردن و نان تازه سرو کنید.',
          tip: finalTip,
        },
      ];

    case 'persian_dip':
      return [
        {
          template: '{0} را پوست بگیرید، برش دهید و با کمی روغن در تابه، فر یا ایرفرایر کاملاً نرم و طلایی کنید.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: Math.min(1080, halfCookSec),
          tip: 'پخت با حداقل روغن باعث می‌شود خوراک سبک، خوش‌طعم و کم‌کالری بماند.',
        },
        {
          template:
            ing1 && ing2
              ? '{0} و {1} را با زردچوبه و نعناع تفت دهید تا عطر سنتی آن آزاد شود.'
              : 'سیر و پیاز داغ معطر را در تابه آماده کنید.',
          ingredientIds: ing1 && ing2 ? [ing1, ing2] : ing1 ? [ing1] : [],
          timerSeconds: 300,
        },
        {
          template: 'مواد پخته را با گوشت‌کوب بکوبید یا ترکیب کنید و روی حرارت ملایم بگذارید تا به خورد هم بروند.',
          timerSeconds: 420,
        },
        {
          template: 'در ظرف سرو بکشید، با تزئین سنتی بیارایید و همراه با نان تازه نوش جان کنید.',
          tip: finalTip,
        },
      ];

    case 'persian_breakfast':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} و {1} را آماده کنید و تابه را روی حرارت ملایم گرم کنید.'
              : '{0} را آماده کنید و تابه را گرم کنید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 240,
        },
        {
          template:
            ing2
              ? '{0} را اضافه کنید و تا رسیدن به بافت لطیف و خوش‌عطر بپزید.'
              : 'مواد اصلی صبحانه را با حرارت ملایم بپزید تا بافتی نرم و لذیذ بگیرد.',
          ingredientIds: ing2 ? [ing2] : [],
          timerSeconds: Math.min(600, cookSec),
          tip: 'حرارت ملایم از خشک شدن صبحانه جلوگیری می‌کند.',
        },
        {
          template: 'ادویه و چاشنی تازه بزنید و فوراً داغ همراه با نان یا چای تازه سرو کنید.',
          tip: finalTip,
        },
      ];

    case 'italian_pasta':
      return [
        {
          template: '{0} را در قابلمهٔ آب جوش نمک‌دار بریزید تا به حالت «آل‌دنته» (زنده و خوش‌بافت) بپزد.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: 540,
          tip: 'نصف پیمانه از آب نشاسته‌دار پخت پاستا را برای لطافت سس نگه دارید.',
        },
        {
          template:
            ing1 && ing2
              ? 'در تابهٔ پهن {0} و {1} را با سیر و روغن زیتون تفت دهید تا سس غلیظ و معطر شکل بگیرد.'
              : '{0} را در تابه با روغن زیتون و سیر تفت دهید تا سس خوش‌عطر آماده شود.',
          ingredientIds: ing1 && ing2 ? [ing1, ing2] : ing1 ? [ing1] : [],
          timerSeconds: Math.min(600, halfCookSec),
        },
        {
          template:
            ing3
              ? 'پاستای آبکش‌شده را با کمی از آب پاستا و {0} داخل تابهٔ سس بریزید و ۲ دقیقه روی حرارت ملایم مخلوط کنید.'
              : 'پاستای آبکش‌شده را مستقیماً داخل سس ریخته و ۲ دقیقه با هم تفت دهید تا سس به پاستا بچسبد.',
          ingredientIds: ing3 ? [ing3] : [],
          timerSeconds: 180,
        },
        {
          template: 'با سبزی تازه و فلفل سیاه نیم‌کوب تزئین کرده و بلافاصله داغ سرو کنید.',
          tip: finalTip,
        },
      ];

    case 'oven_bake':
      return [
        {
          template: 'فر یا ایرفرایر را روی ۱۹۰ تا ۲۰۰ درجه سانتی‌گراد پیش‌گرم کنید و ظرف پخت را کمی چرب کنید.',
          timerSeconds: 300,
        },
        {
          template:
            ing0 && ing1
              ? '{0} را با {1}، ادویه‌ها و چاشنی کاملاً مخلوط یا لایه‌بندی کنید.'
              : '{0} را با ادویه‌ها و روغن زیتون آغشته کنید و در سینی بچینید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 360,
        },
        {
          template:
            ing2
              ? '{0} را اضافه کنید و ظرف را داخل فر بگذارید تا مغزپخت و سطح آن طلایی و برشته شود.'
              : 'داخل فر بگذارید تا کاملاً بپزد و روی آن طلایی و خوش‌رنگ شود.',
          ingredientIds: ing2 ? [ing2] : [],
          timerSeconds: Math.min(2400, cookSec),
          tip: 'در ۵ دقیقهٔ آخر گریل بالا را روشن کنید تا روی غذا طلایی و ترد شود.',
        },
        {
          template: 'از فر خارج کنید، ۵ دقیقه استراحت دهید تا برش تمیز بخورد و سپس سرو کنید.',
          timerSeconds: 300,
          tip: finalTip,
        },
      ];

    case 'asian_stirfry':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} را به برش‌های یکدست خرد کنید و همراه با {1} کنار دست بچینید (آشپزی ووک سریع است!).'
              : '{0} و سبزیجات را به برش‌های باریک و یک‌اندازه خرد کنید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 240,
        },
        {
          template: 'تابه یا ووک را روی شعلهٔ زیاد داغ کنید و پروتئین را سریع تفت دهید تا برشته و آبدار بماند.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: 300,
          tip: 'شعلهٔ بالا باعث کاراملی شدن سطح مواد بدون آب انداختن می‌شود.',
        },
        {
          template:
            ing2 && ing3
              ? '{0} و {1} را همراه با سس سویا و زنجبیل اضافه کنید و ۳ دقیقه تند تفت دهید.'
              : 'سبزیجات و سس آسیایی را اضافه کرده و ۳ تا ۴ دقیقه با حرارت بالا هم بزنید.',
          ingredientIds: ing2 && ing3 ? [ing2, ing3] : ing2 ? [ing2] : [],
          timerSeconds: 240,
        },
        {
          template: 'با پیازچه و کنجد بوداده تزئین کرده و فوراً داغ سرو کنید.',
          tip: finalTip,
        },
      ];

    case 'curry_simmer':
      return [
        {
          template: 'پیاز، سیر و زنجبیل تازه را با ادویه کاری در روغن تفت دهید تا عطر ادویه‌ها کاملاً آزاد شود.',
          ingredientIds: pickCodes(def.ings, [1, 2]),
          timerSeconds: 300,
          tip: 'بو دادن کوتاه ادویه در روغن، عمق طعم کاری را دو برابر می‌کند.',
        },
        {
          template: '{0} را اضافه کنید و ۴ دقیقه تفت دهید تا تمام سطحش به ادویه آغشته شود.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: 240,
        },
        {
          template:
            ing3
              ? '{0} و گوجه یا عصاره را بیفزایید و بگذارید با حرارت ملایم قل بزند تا سس غلیظ و مخملی شود.'
              : 'مایع سس کاری را بیفزایید و روی حرارت ملایم جا بیندازید تا سس غلیظ و مخملی شود.',
          ingredientIds: ing3 ? [ing3] : [],
          timerSeconds: Math.min(1500, cookSec),
        },
        {
          template: 'با گشنیز تازه و آب لیموی تازه طعم‌دهی نهایی را انجام دهید و داغ سرو کنید.',
          tip: finalTip,
        },
      ];

    case 'mexican_wrap':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} را با ادویه تاکو/فاهیتا و {1} روی حرارت بالا تفت دهید تا دودی و خوش‌عطر شود.'
              : '{0} را با ادویه مکزیکی در تابهٔ داغ بپزید تا طلایی شود.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: Math.min(600, cookSec),
        },
        {
          template:
            ing2
              ? '{0} را ۳۰ ثانیه روی تابه گرم کنید تا نرم و انعطاف‌پذیر شود.'
              : 'نان‌ها را روی تابه گرم و کمی برشته کنید.',
          ingredientIds: ing2 ? [ing2] : [],
          timerSeconds: 120,
        },
        {
          template:
            ing3
              ? 'مواد داغ، {0}، سالسا و آب لیمو ترش تازه را روی نان بچینید و بپیچید یا گریل کنید.'
              : 'مواد داغ و تاپینگ‌های تازه را داخل نان بچینید و با لیمو ترش تازه سرو کنید.',
          ingredientIds: ing3 ? [ing3] : [],
          timerSeconds: 180,
          tip: finalTip,
        },
      ];

    case 'grill_sear':
      return [
        {
          template: '{0} را با دستمال خشک کنید و با روغن زیتون، نمک دریا، فلفل و ادویه ماساژ دهید.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: 180,
          tip: 'خشک کردن سطح پروتئین پیش از گریل، خط کبابی و پوستهٔ طلایی بی‌نظیری می‌سازد.',
        },
        {
          template: 'تابهٔ چدنی یا گریل را کاملاً داغ کنید و هر سمت را بدون تکان دادن بپزید تا طلایی شود.',
          timerSeconds: Math.min(720, cookSec),
        },
        {
          template:
            ing1 && ing2
              ? 'همراه با {0} و {1} برشته‌شده در بشقاب بچینید و ۲ دقیقه استراحت دهید.'
              : 'پس از پخت ۳ دقیقه به گوشت استراحت دهید تا بافت آن کاملاً آبدار بماند.',
          ingredientIds: ing1 && ing2 ? [ing1, ing2] : ing1 ? [ing1] : [],
          timerSeconds: 180,
          tip: finalTip,
        },
      ];

    case 'bowl_assemble':
      return [
        {
          template: '{0} را طبق دستور بپزید و اجازه دهید پایهٔ کاسه گرم و آماده شود.',
          ingredientIds: ing0 ? [ing0] : [],
          timerSeconds: Math.min(900, halfCookSec),
        },
        {
          template:
            ing1
              ? '{0} را با ادویه و کمی روغن زیتون تفت دهید یا گریل کنید تا طلایی و مغزپخت شود.'
              : 'پروتئین اصلی کاسه را با حرارت متوسط گریل یا تفت دهید.',
          ingredientIds: ing1 ? [ing1] : [],
          timerSeconds: Math.min(600, halfCookSec),
        },
        {
          template:
            ing2 && ing3
              ? 'در کاسهٔ گود پایه را ریخته و {0}، {1} و پروتئین داغ را رنگی و تفکیک‌شده بچینید.'
              : 'مواد تازه و پروتئین را به صورت بخش‌بندی‌شده و رنگی داخل کاسه بچینید.',
          ingredientIds: ing2 && ing3 ? [ing2, ing3] : ing2 ? [ing2] : [],
          timerSeconds: 180,
        },
        {
          template: 'سس تازه و آب‌لیمو را روی کاسه بریزید و بلافاصله میل کنید.',
          tip: finalTip,
        },
      ];

    case 'salad_toss':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} و {1} را بشویید، کاملاً خشک کنید و به اندازهٔ لقمه‌ای خرد کنید.'
              : '{0} را تازه بشویید، خشک کنید و خرد کنید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 240,
          tip: 'خشک بودن سبزیجات باعث می‌شود سس به برگ‌ها بچسبد و سالاد ترد بماند.',
        },
        {
          template:
            ing2
              ? 'اگر {0} نیاز به پخت یا برشته‌کردن دارد، ۵ دقیقه آماده کنید و بگذارید کمی خنک شود.'
              : 'مواد تکمیلی و سس را در ظرف جداگانه هم بزنید تا یکدست شود.',
          ingredientIds: ing2 ? [ing2] : [],
          timerSeconds: def.cook > 0 ? Math.min(480, cookSec) : 120,
        },
        {
          template: 'همهٔ مواد را در کاسهٔ بزرگ آرام زیر و رو کنید، سس را در لحظهٔ سرو اضافه کرده و میل کنید.',
          tip: finalTip,
        },
      ];

    case 'blender_smoothie':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} و {1} را همراه با مایع پایه داخل پارچ مخلوط‌کن بریزید.'
              : '{0} را داخل پارچ مخلوط‌کن قرار دهید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 120,
        },
        {
          template: 'به مدت ۶۰ تا ۹۰ ثانیه با دور تند میکس کنید تا بافتی کاملاً یکدست و مخملی بگیرد.',
          timerSeconds: 90,
          tip: 'برای بافت غلیظ‌تر و خنک‌تر از میوهٔ نیمه‌منجمد یا چند قطعه یخ استفاده کنید.',
        },
        {
          template:
            ing2
              ? 'در کاسه یا لیوان بریزید و با {0} تزئین کرده و تازه میل کنید.'
              : 'در کاسه بریزید، با مغزها یا دانه‌ها تزئین کرده و فوراً سرو کنید.',
          ingredientIds: ing2 ? [ing2] : [],
          tip: finalTip,
        },
      ];

    case 'soup_blend':
      return [
        {
          template:
            ing0 && ing1
              ? '{0} و {1} را خرد کرده و با پیاز و کمی روغن زیتون ۵ دقیقه تفت دهید تا کاراملی شوند.'
              : '{0} را با پیاز و سیر تفت دهید.',
          ingredientIds: ing0 && ing1 ? [ing0, ing1] : ing0 ? [ing0] : [],
          timerSeconds: 300,
        },
        {
          template: 'عصاره یا آب جوش اضافه کنید و اجازه دهید سبزیجات با حرارت ملایم کاملاً نرم شوند.',
          timerSeconds: Math.min(1200, cookSec),
        },
        {
          template: 'با مخلوط‌کن یا گوشت‌کوب برقی پوره کنید تا سوپ کرمی و مخملی شود، سپس ۳ دقیقه دوباره گرم کنید.',
          timerSeconds: 180,
          tip: finalTip,
        },
      ];
  }
}

export function compileRecipeDef(def: CompactRecipeDef): RecipeMasterRecord {
  const ingredients: IngredientUsage[] = def.ings.map(([code, amount]) => ({
    code,
    amount,
  }));

  // Derive diets cleanly if not explicitly provided
  const diets: DietType[] = def.diets ? [...def.diets] : ['omnivore'];
  if (!diets.includes('omnivore')) diets.unshift('omnivore');
  if (def.macros[1] >= 28 && !diets.includes('high_protein')) {
    diets.push('high_protein');
  }
  if (def.macros[2] <= 24 && !diets.includes('low_carb')) {
    diets.push('low_carb');
  }

  return {
    id: def.id,
    title: def.title,
    titleEn: def.titleEn,
    subtitle: def.subtitle,
    cuisine: def.cuisine,
    category: def.category,
    mainProtein: def.mainProtein,
    icon: FOOD_ICONS[def.iconKey],
    photoUrl: DISH_PHOTOS[def.photoKey],
    mealTypes: def.mealTypes,
    baseServings: def.baseServings ?? 2,
    prepMinutes: def.prep,
    cookMinutes: def.cook,
    caloriesPerServing: def.macros[0],
    proteinG: def.macros[1],
    carbsG: def.macros[2],
    fatG: def.macros[3],
    fiberG: def.macros[4],
    difficulty: def.diff,
    diets,
    allergens: [] as AllergenId[], // Auto-computed from canonical ING_* ingredients during hydration!
    requiredAppliances: def.appliances,
    baseLabels: def.labels,
    ingredients,
    steps: buildStandardSteps(def),
    searchAliases: def.aliases,
  };
}
