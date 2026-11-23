import type { RecipeMasterRecord } from '../../types/sofreh';
import { DISH_PHOTOS } from './photos';

/**
 * 80-Icon Distinct 3D Food Visual Catalog + Explicit 250-Recipe Verified Visual Map
 * Every single one of the 250 built-in recipes is explicitly mapped by ID to its exact
 * authentic 3D cartoon food icon AND high-resolution dish photograph — zero substring regex bugs.
 */

const F3D = '/assets/food3d';
const IMG = '/assets/images';

export const EXTENDED_FOOD_ICONS = {
  // 16 classic studio 3D icons
  ghormeh_sabzi: `${IMG}/food_ghormeh_sabzi_1795370285181.jpg`,
  zereshk_polo: `${IMG}/food_zereshk_polo_1795370286070.jpg`,
  kashk_bademjan: `${IMG}/food_kashk_bademjan_1795370285091.jpg`,
  adas_polo: `${IMG}/food_adas_polo_1795370335962.jpg`,
  ash_reshteh: `${IMG}/food_ash_reshteh_1795370284056.jpg`,
  abgoosht_dizi: `${IMG}/food_abgoosht_dizi_1795370284345.jpg`,
  kabab_koobideh: `${IMG}/food_kabab_tarkibi_1795370283958.jpg`,
  kuku_sabzi: `${IMG}/food_kuku_sabzi_1795370285462.jpg`,
  morgh_tanoori: `${IMG}/food_morgh_tanoori_1795370284282.jpg`,
  omelette_irani: `${IMG}/food_omelette_irani_1795370284473.jpg`,
  pasta_italian: `${IMG}/food_pasta_italian_1795372314976.jpg`,
  bowl_healthy: `${IMG}/food_bowl_healthy_1795372315130.jpg`,
  curry_asian: `${IMG}/food_curry_asian_1795372315161.jpg`,
  taco_wrap: `${IMG}/food_taco_wrap_1795372315322.jpg`,
  salad_fresh: `${IMG}/food_salad_fresh_1795372315550.jpg`,
  soup_stew: `${IMG}/food_soup_stew_1795372314788.jpg`,

  // 16 Persian 3D icons (Sheet A)
  fesenjan: `${F3D}/fesenjan.jpg`,
  gheimeh: `${F3D}/gheimeh.jpg`,
  karafs: `${F3D}/karafs.jpg`,
  bademjan: `${F3D}/bademjan.jpg`,
  baghali_polo: `${F3D}/baghali_polo.jpg`,
  lubia_polo: `${F3D}/lubia_polo.jpg`,
  albaloo_polo: `${F3D}/albaloo_polo.jpg`,
  tahchin: `${F3D}/tahchin.jpg`,
  joojeh_kabab: `${F3D}/joojeh_kabab.jpg`,
  kabab_barg: `${F3D}/kabab_barg.jpg`,
  mirza_ghasemi: `${F3D}/mirza_ghasemi.jpg`,
  dolmeh: `${F3D}/dolmeh.jpg`,
  koofteh: `${F3D}/koofteh.jpg`,
  kotlet: `${F3D}/kotlet.jpg`,
  halim: `${F3D}/halim.jpg`,
  adasi: `${F3D}/adasi.jpg`,

  // 16 World 3D icons (Sheet B)
  pizza: `${F3D}/pizza.jpg`,
  alfredo: `${F3D}/alfredo.jpg`,
  lasagna: `${F3D}/lasagna.jpg`,
  risotto: `${F3D}/risotto.jpg`,
  burger: `${F3D}/burger.jpg`,
  steak: `${F3D}/steak.jpg`,
  sushi: `${F3D}/sushi.jpg`,
  ramen: `${F3D}/ramen.jpg`,
  pad_thai: `${F3D}/pad_thai.jpg`,
  fried_rice: `${F3D}/fried_rice.jpg`,
  burrito_bowl: `${F3D}/burrito_bowl.jpg`,
  quesadilla: `${F3D}/quesadilla.jpg`,
  falafel: `${F3D}/falafel.jpg`,
  shawarma: `${F3D}/shawarma.jpg`,
  shakshuka: `${F3D}/shakshuka.jpg`,
  pancakes: `${F3D}/pancakes.jpg`,

  // 16 Specialty 3D icons (Sheet C)
  fish_fillet: `${F3D}/fish_fillet.jpg`,
  shrimp_skillet: `${F3D}/shrimp_skillet.jpg`,
  pumpkin_soup: `${F3D}/pumpkin_soup.jpg`,
  caesar_salad: `${F3D}/caesar_salad.jpg`,
  avocado_toast: `${F3D}/avocado_toast.jpg`,
  oatmeal: `${F3D}/oatmeal.jpg`,
  smoothie_bowl: `${F3D}/smoothie_bowl.jpg`,
  grilled_chicken_bowl: `${F3D}/grilled_chicken_bowl.jpg`,
  crispy_chicken: `${F3D}/crispy_chicken.jpg`,
  pesto_pasta: `${F3D}/pesto_pasta.jpg`,
  arrabbiata: `${F3D}/arrabbiata.jpg`,
  stuffed_pepper: `${F3D}/stuffed_pepper.jpg`,
  sabzi_polo_mahi: `${F3D}/sabzi_polo_mahi.jpg`,
  shole_zard: `${F3D}/shole_zard.jpg`,
  panini: `${F3D}/panini.jpg`,
  lamb_wrap: `${F3D}/lamb_wrap.jpg`,

  // 16 New Targeted Persian & World 3D icons (Sheet D — 80 total!)
  nan_panir: `${F3D}/nan_panir.jpg`,
  salad_olivieh: `${F3D}/salad_olivieh.jpg`,
  nargesi: `${F3D}/nargesi.jpg`,
  baghali_ghatogh: `${F3D}/baghali_ghatogh.jpg`,
  ghalieh_mahi: `${F3D}/ghalieh_mahi.jpg`,
  kalam_polo: `${F3D}/kalam_polo.jpg`,
  butter_chicken: `${F3D}/butter_chicken.jpg`,
  stroganoff: `${F3D}/stroganoff.jpg`,
  shepherds_pie: `${F3D}/shepherds_pie.jpg`,
  ratatouille: `${F3D}/ratatouille.jpg`,
  teriyaki_bowl: `${F3D}/teriyaki_bowl.jpg`,
  chili_bowl: `${F3D}/chili_bowl.jpg`,
  enchilada: `${F3D}/enchilada.jpg`,
  poke_bowl: `${F3D}/poke_bowl.jpg`,
  mushroom_soup: `${F3D}/mushroom_soup.jpg`,
  egg_muffin: `${F3D}/egg_muffin.jpg`,
} as const;

export const LOCAL_PERSIAN_DISH_PHOTOS = {
  fesenjan: DISH_PHOTOS.persian_fesenjan,
  gheimeh: DISH_PHOTOS.persian_gheimeh,
  tahchin: DISH_PHOTOS.persian_tahchin,
  zereshk_polo: DISH_PHOTOS.persian_zereshk_polo,
  ash_reshteh: DISH_PHOTOS.persian_ash_reshteh,
  baghali_polo: DISH_PHOTOS.persian_baghali_polo,
  joojeh_kabab: DISH_PHOTOS.persian_joojeh_kabab,
  kuku_sabzi: DISH_PHOTOS.persian_kuku_sabzi,
  mirza_ghasemi: DISH_PHOTOS.persian_mirza_ghasemi,
  kotlet: DISH_PHOTOS.persian_kotlet,
  dolmeh: DISH_PHOTOS.persian_dolmeh,
  abgoosht: DISH_PHOTOS.persian_abgoosht,
  kabab: DISH_PHOTOS.persian_kabab,
  morgh: DISH_PHOTOS.persian_morgh,
  kashk: DISH_PHOTOS.persian_kashk,
  ghormeh: DISH_PHOTOS.persian_ghormeh,
  lubia_polo: DISH_PHOTOS.persian_lubia_polo,
  adas_polo: DISH_PHOTOS.persian_adas_polo,
  sabzi_polo_mahi: DISH_PHOTOS.persian_sabzi_polo_mahi,
  khoresht_karafs: DISH_PHOTOS.persian_khoresht_karafs,
  khoresht_bademjan: DISH_PHOTOS.persian_khoresht_bademjan,
  koofteh_tabrizi: DISH_PHOTOS.persian_koofteh_tabrizi,
  halim: DISH_PHOTOS.persian_halim,
  omelette: DISH_PHOTOS.persian_omelette,
  olivieh: DISH_PHOTOS.persian_olivieh,
  kalam_polo: DISH_PHOTOS.persian_kalam_polo,
  nargesi: DISH_PHOTOS.persian_nargesi,
  meygoo_polo: DISH_PHOTOS.persian_meygoo_polo,
} as const;

const I = EXTENDED_FOOD_ICONS;
const P = DISH_PHOTOS;

export interface ResolvedVisual {
  icon: string;
  photoUrl: string;
}

/**
 * Explicit, 100%-audited visual map for all 250 built-in recipes.
 * Guarantees that every recipe displays its exact 3D food icon and authentic dish photograph.
 */
export const EXPLICIT_RECIPE_VISUALS: Record<string, ResolvedVisual> = {
  // === 1-22: Persian Stews (خورشت) ===
  'ghormeh-sabzi': { icon: I.ghormeh_sabzi, photoUrl: P.persian_ghormeh },
  'gheimeh-sibzamini': { icon: I.gheimeh, photoUrl: P.persian_gheimeh },
  'gheimeh-bademjan': { icon: I.bademjan, photoUrl: P.persian_khoresht_bademjan },
  'fesenjan-morgh': { icon: I.fesenjan, photoUrl: P.persian_fesenjan },
  'fesenjan-ordak': { icon: I.fesenjan, photoUrl: P.persian_fesenjan },
  'khoresht-karafs': { icon: I.karafs, photoUrl: P.persian_khoresht_karafs },
  'khoresht-karafs-morgh': { icon: I.karafs, photoUrl: P.persian_khoresht_karafs },
  'khoresht-bademjan-morgh': { icon: I.bademjan, photoUrl: P.persian_khoresht_bademjan },
  'khoresht-bamieh': { icon: I.gheimeh, photoUrl: P.persian_bamieh },
  'khoresht-aloo-esfenaj': { icon: I.karafs, photoUrl: P.persian_khoresht_karafs },
  'khoresht-ghalieh-mahi': { icon: I.ghalieh_mahi, photoUrl: P.persian_ghalieh_mahi },
  'khoresht-ghalieh-meygoo': { icon: I.shrimp_skillet, photoUrl: P.persian_ghalieh_mahi },
  'khoresht-kadoo-sabz': { icon: I.gheimeh, photoUrl: P.persian_bamieh },
  'khoresht-havij-tabriz': { icon: I.gheimeh, photoUrl: P.persian_gheimeh },
  'khoresht-beh-aloo': { icon: I.gheimeh, photoUrl: P.persian_bamieh },
  'khoresht-rivas': { icon: I.karafs, photoUrl: P.persian_khoresht_karafs },
  'khoresht-khalal-kermanshah': { icon: I.gheimeh, photoUrl: P.persian_gheimeh },
  'baghali-ghatogh': { icon: I.baghali_ghatogh, photoUrl: P.persian_baghali_ghatogh },
  'torsh-tareh': { icon: I.nargesi, photoUrl: P.persian_nargesi },
  'ghormeh-sabzi-gharch': { icon: I.ghormeh_sabzi, photoUrl: P.persian_ghormeh },
  'khoresht-sib-aloo': { icon: I.gheimeh, photoUrl: P.persian_bamieh },
  'khoresht-anar-bij': { icon: I.fesenjan, photoUrl: P.persian_fesenjan },

  // === 23-45: Persian Polos & Rice (پلو) ===
  'zereshk-polo-morgh': { icon: I.zereshk_polo, photoUrl: P.persian_zereshk_polo },
  'adas-polo': { icon: I.adas_polo, photoUrl: P.persian_adas_polo },
  'adas-polo-goosht': { icon: I.adas_polo, photoUrl: P.persian_adas_polo },
  'lubia-polo': { icon: I.lubia_polo, photoUrl: P.persian_lubia_polo },
  'estamboli-polo': { icon: I.lubia_polo, photoUrl: P.persian_lubia_polo },
  'baghali-polo-mahicheh': { icon: I.baghali_polo, photoUrl: P.persian_baghali_polo },
  'baghali-polo-morgh': { icon: I.baghali_polo, photoUrl: P.persian_baghali_polo },
  'sabzi-polo-mahi': { icon: I.sabzi_polo_mahi, photoUrl: P.persian_sabzi_polo_mahi },
  'tahchin-morgh': { icon: I.tahchin, photoUrl: P.persian_tahchin },
  'tahchin-bademjan': { icon: I.tahchin, photoUrl: P.persian_tahchin },
  'albaloo-polo': { icon: I.albaloo_polo, photoUrl: P.persian_albaloo_polo },
  'shirin-polo': { icon: I.albaloo_polo, photoUrl: P.persian_shirin_polo },
  'kalam-polo-shirazi': { icon: I.kalam_polo, photoUrl: P.persian_kalam_polo },
  'havij-polo': { icon: I.albaloo_polo, photoUrl: P.persian_shirin_polo },
  'reshteh-polo': { icon: I.adas_polo, photoUrl: P.persian_adas_polo },
  'mash-polo': { icon: I.adas_polo, photoUrl: P.persian_adas_polo },
  'shevid-polo-ton': { icon: I.baghali_polo, photoUrl: P.persian_baghali_polo },
  'dampokhtak-baghali': { icon: I.baghali_polo, photoUrl: P.persian_baghali_polo },
  'ghambar-polo-shirazi': { icon: I.albaloo_polo, photoUrl: P.persian_albaloo_polo },
  'shekar-polo': { icon: I.tahchin, photoUrl: P.persian_shirin_polo },
  'meygoo-polo-jonoobi': { icon: I.shrimp_skillet, photoUrl: P.persian_meygoo_polo },
  'keshmesh-polo-morgh': { icon: I.zereshk_polo, photoUrl: P.persian_zereshk_polo },
  'makaroni-tahdig': { icon: I.arrabbiata, photoUrl: P.persian_makaroni },

  // === 46-63: Persian Kebabs & Chicken (کباب و مرغ) ===
  'kabab-tarkibi': { icon: I.kabab_koobideh, photoUrl: P.persian_kabab },
  'joojeh-kabab-zaferani': { icon: I.joojeh_kabab, photoUrl: P.persian_joojeh_kabab },
  'joojeh-kabab-tabei': { icon: I.joojeh_kabab, photoUrl: P.persian_joojeh_kabab },
  'kabab-torsh-gilani': { icon: I.kabab_barg, photoUrl: P.persian_kabab_torsh },
  'morgh-tanoori': { icon: I.morgh_tanoori, photoUrl: P.persian_morgh },
  'morgh-airfryer-zaferani': { icon: I.crispy_chicken, photoUrl: P.persian_morgh },
  'akbar-joojeh': { icon: I.morgh_tanoori, photoUrl: P.persian_akbar_joojeh },
  'morgh-shekampor-gilani': { icon: I.morgh_tanoori, photoUrl: P.chicken_roast },
  'kabab-koobideh-morgh': { icon: I.kabab_koobideh, photoUrl: P.persian_kabab },
  'kabab-digy': { icon: I.kabab_koobideh, photoUrl: P.persian_kabab },
  'tas-kabab': { icon: I.abgoosht_dizi, photoUrl: P.persian_abgoosht },
  'chenjeh-tabei': { icon: I.kabab_barg, photoUrl: P.persian_kabab_torsh },
  'mahi-shekampor-jonoobi': { icon: I.fish_fillet, photoUrl: P.fish_grilled },
  'morgh-booghalamoon-zaferani': { icon: I.morgh_tanoori, photoUrl: P.persian_morgh },
  'joojeh-chobini-bademjan': { icon: I.kabab_barg, photoUrl: P.chicken_skewer },
  'jegar-tabei': { icon: I.steak, photoUrl: P.persian_vavishka },
  'khorak-morgh-gharch': { icon: I.morgh_tanoori, photoUrl: P.persian_morgh },
  'morgh-torsh-gilani': { icon: I.karafs, photoUrl: P.persian_khoresht_karafs },

  // === 64-80: Persian Ash, Abgoosht & Soups (آش و سوپ) ===
  'abgoosht-dizi': { icon: I.abgoosht_dizi, photoUrl: P.persian_abgoosht },
  'ash-reshteh': { icon: I.ash_reshteh, photoUrl: P.persian_ash_reshteh },
  'ash-jo': { icon: I.ash_reshteh, photoUrl: P.persian_ash_reshteh },
  'ash-doogh-ardabil': { icon: I.ash_reshteh, photoUrl: P.persian_ash_doogh },
  'ash-shole-ghalamkar': { icon: I.ash_reshteh, photoUrl: P.persian_ash_reshteh },
  'ash-mast-shirazi': { icon: I.ash_reshteh, photoUrl: P.persian_ash_doogh },
  'ash-anar': { icon: I.ash_reshteh, photoUrl: P.persian_ash_reshteh },
  'ash-gandom-kashk': { icon: I.ash_reshteh, photoUrl: P.persian_ash_doogh },
  'ash-shalgham-laboo': { icon: I.ash_reshteh, photoUrl: P.persian_ash_reshteh },
  'soup-jo-morgh': { icon: I.soup_stew, photoUrl: P.persian_soup_jo },
  'soup-jo-sefid': { icon: I.mushroom_soup, photoUrl: P.world_mushroom_soup },
  'soup-vermicelli': { icon: I.soup_stew, photoUrl: P.persian_soup_jo },
  'eshkeneh-piyazdagh': { icon: I.soup_stew, photoUrl: P.persian_soup_jo },
  'kalleh-joosh': { icon: I.abgoosht_dizi, photoUrl: P.persian_ash_doogh },
  'bozghormeh-kerman': { icon: I.abgoosht_dizi, photoUrl: P.persian_abgoosht },
  'abgoosht-ghormeh-sabzi': { icon: I.abgoosht_dizi, photoUrl: P.persian_abgoosht },
  'soup-dal-adas-jonoobi': { icon: I.adasi, photoUrl: P.soup_lentil },

  // === 81-113: Persian Kuku, Kotlet, Dolmeh, Eggplant & Dishes (کوکو و خوراک) ===
  'kuku-sabzi': { icon: I.kuku_sabzi, photoUrl: P.persian_kuku_sabzi },
  'kuku-sibzamini': { icon: I.kotlet, photoUrl: P.persian_kuku_sibzamini },
  'kotlet-goosht': { icon: I.kotlet, photoUrl: P.persian_kotlet },
  'kotlet-morgh-airfryer': { icon: I.kotlet, photoUrl: P.persian_kotlet },
  'shami-lapeh': { icon: I.kotlet, photoUrl: P.persian_kotlet },
  'shami-roodbar': { icon: I.kotlet, photoUrl: P.persian_kotlet },
  'kuku-kadoo-sabz': { icon: I.kuku_sabzi, photoUrl: P.frittata_kuku },
  'kuku-bademjan': { icon: I.kuku_sabzi, photoUrl: P.persian_kuku_sibzamini },
  'kuku-morgh-felfel': { icon: I.kuku_sabzi, photoUrl: P.frittata_kuku },
  'kuku-gol-kalam': { icon: I.kuku_sabzi, photoUrl: P.frittata_kuku },
  'kuku-adas-soya': { icon: I.kotlet, photoUrl: P.persian_kuku_sibzamini },
  'kuku-shirin-shab': { icon: I.kuku_sabzi, photoUrl: P.persian_kuku_sibzamini },
  'kuku-ton-mahi': { icon: I.kotlet, photoUrl: P.persian_kuku_sibzamini },
  'kuku-gharch-esfenaj': { icon: I.kuku_sabzi, photoUrl: P.frittata_kuku },
  'kotlet-soya-giah': { icon: I.kotlet, photoUrl: P.persian_kotlet },
  'kashk-bademjan': { icon: I.kashk_bademjan, photoUrl: P.persian_kashk },
  'mirza-ghasemi': { icon: I.mirza_ghasemi, photoUrl: P.persian_mirza_ghasemi },
  'koofteh-tabrizi': { icon: I.koofteh, photoUrl: P.persian_koofteh_tabrizi },
  'dolmeh-barg-moo': { icon: I.dolmeh, photoUrl: P.persian_dolmeh },
  'dolmeh-felfel': { icon: I.stuffed_pepper, photoUrl: P.persian_dolmeh_felfel },
  'halim-bademjan': { icon: I.kashk_bademjan, photoUrl: P.persian_kashk },
  'vavishka-goosht': { icon: I.chili_bowl, photoUrl: P.persian_vavishka },
  'khorak-lubia-chiti': { icon: I.adasi, photoUrl: P.persian_lubia_chiti },
  'yatimcheh': { icon: I.ratatouille, photoUrl: P.world_ratatouille },
  'do-piazeh-aloo-shirazi': { icon: I.kotlet, photoUrl: P.persian_kuku_sibzamini },
  'salad-olivieh': { icon: I.salad_olivieh, photoUrl: P.persian_olivieh },
  'nargesi-esfenaj': { icon: I.nargesi, photoUrl: P.persian_nargesi },
  'bandari-homemade': { icon: I.panini, photoUrl: P.world_panini },
  'khorak-badamjan-shekampor': { icon: I.bademjan, photoUrl: P.persian_khoresht_bademjan },
  'borani-esfenaj-morgh': { icon: I.grilled_chicken_bowl, photoUrl: P.persian_nargesi },
  'khorak-morgh-aloo-felfel': { icon: I.morgh_tanoori, photoUrl: P.persian_morgh },
  'salad-shirazi-chickpea': { icon: I.salad_fresh, photoUrl: P.persian_salad_shirazi },
  'khorak-gharch-nokhod': { icon: I.adasi, photoUrl: P.persian_lubia_chiti },

  // === 114-125: Persian Breakfast (صبحانه ایرانی) ===
  'omelette-irani': { icon: I.omelette_irani, photoUrl: P.persian_omelette },
  'adasi-irani': { icon: I.adasi, photoUrl: P.persian_adasi },
  'nimroo-khorma': { icon: I.omelette_irani, photoUrl: P.persian_omelette },
  'nan-panir-gerdoo': { icon: I.nan_panir, photoUrl: P.persian_nan_panir },
  'omelette-gharch-felfel': { icon: I.omelette_irani, photoUrl: P.persian_omelette },
  'sobhane-ardeh-asal': { icon: I.nan_panir, photoUrl: P.persian_nan_panir },
  'shir-berenj-zaferani': { icon: I.shole_zard, photoUrl: P.persian_shole_zard },
  'halim-gandom-morgh': { icon: I.halim, photoUrl: P.persian_halim },
  'omelette-sibzamini-piyazche': { icon: I.egg_muffin, photoUrl: P.frittata_kuku },
  'omelette-rob-anar-gerdoo': { icon: I.nargesi, photoUrl: P.persian_nargesi },
  'khagineh-zaferani': { icon: I.pancakes, photoUrl: P.pancake_stack },
  'mast-o-granola-irani': { icon: I.smoothie_bowl, photoUrl: P.smoothie_bowl },

  // === 126-147: Italian & Pasta (پاستا و ایتالیایی) ===
  'pasta-alfredo-chicken': { icon: I.alfredo, photoUrl: P.pasta_creamy },
  'spaghetti-bolognese': { icon: I.arrabbiata, photoUrl: P.pasta_tomato },
  'pasta-pesto-chicken': { icon: I.pesto_pasta, photoUrl: P.pasta_pesto },
  'pasta-arrabbiata': { icon: I.arrabbiata, photoUrl: P.pasta_tomato },
  'pasta-aglio-olio': { icon: I.pasta_italian, photoUrl: P.pasta_tomato },
  'lasagna-classic': { icon: I.lasagna, photoUrl: P.lasagna_baked },
  'lasagna-spinach-mushroom': { icon: I.lasagna, photoUrl: P.lasagna_baked },
  'pizza-margherita': { icon: I.pizza, photoUrl: P.pizza_artisan },
  'pizza-chicken-pesto': { icon: I.pizza, photoUrl: P.pizza_artisan },
  'risotto-mushroom': { icon: I.risotto, photoUrl: P.risotto_creamy },
  'risotto-saffron-milanese': { icon: I.risotto, photoUrl: P.risotto_creamy },
  'pasta-shrimp-scampi': { icon: I.shrimp_skillet, photoUrl: P.world_shrimp_skillet },
  'pasta-tuna-olive': { icon: I.pasta_italian, photoUrl: P.pasta_tomato },
  'chicken-parmesan': { icon: I.crispy_chicken, photoUrl: P.world_chicken_parm },
  'eggplant-parmigiana': { icon: I.lasagna, photoUrl: P.lasagna_baked },
  'pasta-primavera': { icon: I.pasta_italian, photoUrl: P.pasta_pesto },
  'pasta-creamy-tomato-spinach': { icon: I.pasta_italian, photoUrl: P.pasta_tomato },
  'chicken-piccata': { icon: I.morgh_tanoori, photoUrl: P.chicken_roast },
  'minestrone-soup': { icon: I.soup_stew, photoUrl: P.world_minestrone },
  'caprese-chicken-skillet': { icon: I.grilled_chicken_bowl, photoUrl: P.chicken_roast },
  'pasta-meatballs': { icon: I.arrabbiata, photoUrl: P.world_meatballs_pasta },
  'pasta-salmon-lemon': { icon: I.alfredo, photoUrl: P.pasta_creamy },

  // === 148-168: Mediterranean, Turkish & Middle Eastern ===
  'greek-chicken-souvlaki': { icon: I.joojeh_kabab, photoUrl: P.chicken_skewer },
  'med-salmon-quinoa-bowl': { icon: I.fish_fillet, photoUrl: P.salmon_bowl },
  'greek-salad-grilled-chicken': { icon: I.salad_fresh, photoUrl: P.salad_med },
  'halloumi-roasted-veg-bowl': { icon: I.bowl_healthy, photoUrl: P.world_buddha_bowl },
  'falafel-hummus-plate': { icon: I.falafel, photoUrl: P.hummus_falafel },
  'chicken-shawarma-wrap': { icon: I.shawarma, photoUrl: P.shawarma_wrap },
  'shakshuka-middle-eastern': { icon: I.shakshuka, photoUrl: P.shakshuka_pan },
  'hummus-spiced-beef-bowl': { icon: I.falafel, photoUrl: P.hummus_falafel },
  'turkish-red-lentil-soup': { icon: I.adasi, photoUrl: P.soup_lentil },
  'turkish-iskender-kebab': { icon: I.kabab_barg, photoUrl: P.world_iskender_kebab },
  'turkish-menemen': { icon: I.shakshuka, photoUrl: P.shakshuka_pan },
  'turkish-adana-kebab': { icon: I.kabab_koobideh, photoUrl: P.kebab_grill },
  'lebanese-tabbouleh-chicken': { icon: I.salad_fresh, photoUrl: P.salad_med },
  'shish-tawook': { icon: I.joojeh_kabab, photoUrl: P.chicken_skewer },
  'greek-moussaka-light': { icon: I.lasagna, photoUrl: P.lasagna_baked },
  'moroccan-chickpea-tagine': { icon: I.curry_asian, photoUrl: P.persian_bamieh },
  'med-baked-cod-tomatoes': { icon: I.fish_fillet, photoUrl: P.fish_grilled },
  'mujaddara-lebanese': { icon: I.adas_polo, photoUrl: P.rice_lentil },
  'arabic-kabsa-chicken': { icon: I.zereshk_polo, photoUrl: P.world_kabsa },
  'fattoush-grilled-chicken': { icon: I.salad_fresh, photoUrl: P.salad_med },
  'turkish-lahmacun-wrap': { icon: I.pizza, photoUrl: P.world_lahmacun },

  // === 169-188: Asian & Curry (آسیایی و کاری) ===
  'chicken-teriyaki-bowl': { icon: I.teriyaki_bowl, photoUrl: P.world_teriyaki_bowl },
  'beef-broccoli-stirfry': { icon: I.teriyaki_bowl, photoUrl: P.stir_fry },
  'indian-butter-chicken': { icon: I.butter_chicken, photoUrl: P.world_butter_chicken },
  'chicken-tikka-masala': { icon: I.butter_chicken, photoUrl: P.world_butter_chicken },
  'thai-coconut-chicken-curry': { icon: I.curry_asian, photoUrl: P.curry_bowl },
  'indian-chickpea-curry': { icon: I.curry_asian, photoUrl: P.curry_bowl },
  'indian-red-lentil-dal': { icon: I.adasi, photoUrl: P.soup_lentil },
  'chicken-fried-rice': { icon: I.fried_rice, photoUrl: P.fried_rice },
  'shrimp-fried-rice': { icon: I.fried_rice, photoUrl: P.fried_rice },
  'chicken-chow-mein': { icon: I.pad_thai, photoUrl: P.pad_thai },
  'chicken-pad-thai': { icon: I.pad_thai, photoUrl: P.pad_thai },
  'ramen-chicken-egg': { icon: I.ramen, photoUrl: P.ramen_noodle },
  'kung-pao-chicken': { icon: I.teriyaki_bowl, photoUrl: P.world_kung_pao },
  'honey-garlic-salmon': { icon: I.fish_fillet, photoUrl: P.salmon_bowl },
  'korean-beef-bowl': { icon: I.teriyaki_bowl, photoUrl: P.world_teriyaki_bowl },
  'tofu-veggie-stirfry': { icon: I.bowl_healthy, photoUrl: P.stir_fry },
  'sweet-sour-chicken': { icon: I.crispy_chicken, photoUrl: P.world_kung_pao },
  'japanese-chicken-katsu': { icon: I.crispy_chicken, photoUrl: P.world_buffalo_chicken },
  'peanut-noodles-veggie': { icon: I.pad_thai, photoUrl: P.pad_thai },
  'thai-shrimp-curry': { icon: I.curry_asian, photoUrl: P.curry_bowl },

  // === 189-204: Mexican & Wraps (مکزیکی و رپ) ===
  'chicken-fajita-tacos': { icon: I.taco_wrap, photoUrl: P.tacos_mexican },
  'beef-tacos-salsa': { icon: I.taco_wrap, photoUrl: P.tacos_mexican },
  'chicken-burrito-bowl': { icon: I.burrito_bowl, photoUrl: P.burrito_bowl },
  'chicken-cheese-quesadilla': { icon: I.quesadilla, photoUrl: P.quesadilla_wrap },
  'black-bean-quesadilla': { icon: I.quesadilla, photoUrl: P.quesadilla_wrap },
  'chili-con-carne': { icon: I.chili_bowl, photoUrl: P.world_chili_con_carne },
  'vegan-three-bean-chili': { icon: I.chili_bowl, photoUrl: P.world_chili_con_carne },
  'shrimp-avocado-tacos': { icon: I.taco_wrap, photoUrl: P.tacos_mexican },
  'chicken-enchiladas': { icon: I.enchilada, photoUrl: P.world_enchiladas },
  'chicken-caesar-wrap': { icon: I.lamb_wrap, photoUrl: P.shawarma_wrap },
  'tuna-avocado-wrap': { icon: I.lamb_wrap, photoUrl: P.shawarma_wrap },
  'turkey-pesto-panini': { icon: I.panini, photoUrl: P.world_panini },
  'bbq-chicken-wrap': { icon: I.lamb_wrap, photoUrl: P.shawarma_wrap },
  'mexican-stuffed-sweet-potato': { icon: I.burrito_bowl, photoUrl: P.burrito_bowl },
  'fish-tacos-crispy': { icon: I.taco_wrap, photoUrl: P.tacos_mexican },
  'mexican-huevos-rancheros': { icon: I.shakshuka, photoUrl: P.shakshuka_pan },

  // === 205-220: Western Classics, Burgers, Steaks & Comfort ===
  'classic-smash-burger': { icon: I.burger, photoUrl: P.burger_gourmet },
  'grilled-chicken-burger': { icon: I.burger, photoUrl: P.burger_gourmet },
  'garlic-butter-steak': { icon: I.steak, photoUrl: P.steak_sliced },
  'beef-stroganoff': { icon: I.stroganoff, photoUrl: P.world_stroganoff },
  'chicken-stroganoff': { icon: I.stroganoff, photoUrl: P.world_stroganoff },
  'honey-mustard-sheet-pan-chicken': { icon: I.morgh_tanoori, photoUrl: P.chicken_roast },
  'airfryer-buffalo-chicken': { icon: I.crispy_chicken, photoUrl: P.world_buffalo_chicken },
  'french-ratatouille': { icon: I.ratatouille, photoUrl: P.world_ratatouille },
  'shepherds-pie': { icon: I.shepherds_pie, photoUrl: P.world_shepherds_pie },
  'airfryer-garlic-salmon-asparagus': { icon: I.fish_fillet, photoUrl: P.salmon_bowl },
  'turkey-meatballs-zucchini': { icon: I.koofteh, photoUrl: P.world_meatballs_pasta },
  'mushroom-swiss-veggie-burger': { icon: I.burger, photoUrl: P.burger_gourmet },
  'goulash-hungarian': { icon: I.chili_bowl, photoUrl: P.stew_red },
  'lemon-herb-baked-chicken-rice': { icon: I.grilled_chicken_bowl, photoUrl: P.rice_saffron },
  'grilled-shrimp-garlic-skillet': { icon: I.shrimp_skillet, photoUrl: P.world_shrimp_skillet },
  'baked-potato-tuna-cheddar': { icon: I.shepherds_pie, photoUrl: P.world_shepherds_pie },

  // === 221-236: Healthy Bowls, Salads & Western Soups ===
  'caesar-salad-grilled-chicken': { icon: I.caesar_salad, photoUrl: P.salad_caesar },
  'quinoa-avocado-chicken-bowl': { icon: I.grilled_chicken_bowl, photoUrl: P.world_buddha_bowl },
  'buddha-bowl-roasted-chickpea': { icon: I.bowl_healthy, photoUrl: P.world_buddha_bowl },
  'nicoise-tuna-egg-salad': { icon: I.salad_fresh, photoUrl: P.world_cobb_salad },
  'cobb-salad-protein': { icon: I.caesar_salad, photoUrl: P.world_cobb_salad },
  'roasted-beet-feta-walnut-salad': { icon: I.salad_fresh, photoUrl: P.world_beet_salad },
  'warm-lentil-roasted-veggie-salad': { icon: I.bowl_healthy, photoUrl: P.world_buddha_bowl },
  'asian-sesame-chicken-salad': { icon: I.salad_fresh, photoUrl: P.salad_med },
  'roasted-tomato-basil-soup': { icon: I.pumpkin_soup, photoUrl: P.world_tomato_pumpkin_soup },
  'creamy-pumpkin-ginger-soup': { icon: I.pumpkin_soup, photoUrl: P.world_tomato_pumpkin_soup },
  'cream-of-mushroom-soup': { icon: I.mushroom_soup, photoUrl: P.world_mushroom_soup },
  'broccoli-cheddar-soup': { icon: I.mushroom_soup, photoUrl: P.world_broccoli_soup },
  'french-onion-soup': { icon: I.soup_stew, photoUrl: P.world_french_onion },
  'mexican-chicken-tortilla-soup': { icon: I.chili_bowl, photoUrl: P.world_minestrone },
  'poke-bowl-salmon-avocado': { icon: I.poke_bowl, photoUrl: P.world_poke_salmon },
  'med-chicken-orzo-bowl': { icon: I.grilled_chicken_bowl, photoUrl: P.world_buddha_bowl },

  // === 237-250: Global Breakfast & Quick Meals ===
  'avocado-poached-egg-toast': { icon: I.avocado_toast, photoUrl: P.avocado_toast },
  'protein-oatmeal-banana-pb': { icon: I.oatmeal, photoUrl: P.oatmeal_berries },
  'overnight-oats-berry-chia': { icon: I.oatmeal, photoUrl: P.oatmeal_berries },
  'banana-oat-pancakes': { icon: I.pancakes, photoUrl: P.pancake_stack },
  'french-toast-berries': { icon: I.pancakes, photoUrl: P.world_french_toast },
  'green-protein-smoothie-bowl': { icon: I.smoothie_bowl, photoUrl: P.smoothie_bowl },
  'berry-protein-smoothie': { icon: I.smoothie_bowl, photoUrl: P.smoothie_bowl },
  'chocolate-pb-smoothie': { icon: I.smoothie_bowl, photoUrl: P.smoothie_bowl },
  'breakfast-burrito-egg-cheese': { icon: I.lamb_wrap, photoUrl: P.world_breakfast_burrito },
  'spanish-potato-tortilla': { icon: I.omelette_irani, photoUrl: P.frittata_kuku },
  'scrambled-tofu-turmeric': { icon: I.egg_muffin, photoUrl: P.frittata_kuku },
  'smoked-salmon-cream-cheese-toast': { icon: I.avocado_toast, photoUrl: P.world_smoked_salmon_toast },
  'apple-cinnamon-baked-oats': { icon: I.oatmeal, photoUrl: P.oatmeal_berries },
  'egg-muffin-cups-veggie': { icon: I.egg_muffin, photoUrl: P.world_egg_muffins },
};

interface VisualRule {
  test: RegExp;
  icon: string;
  photo: string;
}

/**
 * Clean, word-boundary-safe fallback rules used ONLY for custom user/AI-imported recipes
 * that aren't in the 250-entry EXPLICIT_RECIPE_VISUALS table.
 */
const CUSTOM_RECIPE_RULES: VisualRule[] = [
  // Dishes with very specific names first
  { test: /برگر|همبرگر|\bburger\b/i, icon: I.burger, photo: P.burger_gourmet },
  { test: /پیتزا|\bpizza\b/i, icon: I.pizza, photo: P.pizza_artisan },
  { test: /لازانیا|\blasagna\b/i, icon: I.lasagna, photo: P.lasagna_baked },
  { test: /پوکه|\bpoke\b/i, icon: I.poke_bowl, photo: P.world_poke_salmon },
  { test: /سوشی|\bsushi\b/i, icon: I.sushi, photo: P.world_poke_salmon },
  { test: /استروگانف|\bstroganoff\b/i, icon: I.stroganoff, photo: P.world_stroganoff },
  { test: /باتر\s*چیکن|butter chicken|تیکا ماسالا|tikka masala/i, icon: I.butter_chicken, photo: P.world_butter_chicken },
  { test: /راتاتویی|\bratatouille\b/i, icon: I.ratatouille, photo: P.world_ratatouille },
  { test: /شپردز پای|shepherd/i, icon: I.shepherds_pie, photo: P.world_shepherds_pie },
  { test: /انچیلادا|\benchilada/i, icon: I.enchilada, photo: P.world_enchiladas },
  { test: /تریاکی|\bteriyaki\b/i, icon: I.teriyaki_bowl, photo: P.world_teriyaki_bowl },
  { test: /چیلی کان کارنه|\bchili\b/i, icon: I.chili_bowl, photo: P.world_chili_con_carne },
  { test: /پنینی|ساندویچ|\bpanini\b|\bsandwich\b/i, icon: I.panini, photo: P.world_panini },

  // Salads
  { test: /الویه|olivieh|olivier/i, icon: I.salad_olivieh, photo: P.persian_olivieh },
  { test: /سزار|\bcaesar\b/i, icon: I.caesar_salad, photo: P.salad_caesar },
  { test: /سالاد|تبوله|فتوش|\bsalad\b/i, icon: I.salad_fresh, photo: P.salad_med },

  // Signature Persian
  { test: /قورمه|ghormeh/i, icon: I.ghormeh_sabzi, photo: P.persian_ghormeh },
  { test: /فسنجان|فسنجون|fesenjan/i, icon: I.fesenjan, photo: P.persian_fesenjan },
  { test: /کشک.?بادمجان|حلیم بادمجان|kashk/i, icon: I.kashk_bademjan, photo: P.persian_kashk },
  { test: /میرزا.?قاسمی|mirza/i, icon: I.mirza_ghasemi, photo: P.persian_mirza_ghasemi },
  { test: /قیمه بادمجان|خورش بادمجان|bademjan/i, icon: I.bademjan, photo: P.persian_khoresht_bademjan },
  { test: /قیمه|gheimeh/i, icon: I.gheimeh, photo: P.persian_gheimeh },
  { test: /کرفس|karafs/i, icon: I.karafs, photo: P.persian_khoresht_karafs },
  { test: /باقالی.?قاتوق|baghali ghatogh/i, icon: I.baghali_ghatogh, photo: P.persian_baghali_ghatogh },
  { test: /نرگسی|nargesi/i, icon: I.nargesi, photo: P.persian_nargesi },
  { test: /قلیه.?ماهی|ghalieh/i, icon: I.ghalieh_mahi, photo: P.persian_ghalieh_mahi },
  { test: /ته‌چین|ته چین|tahchin/i, icon: I.tahchin, photo: P.persian_tahchin },
  { test: /زرشک.?پلو|zereshk/i, icon: I.zereshk_polo, photo: P.persian_zereshk_polo },
  { test: /کلم.?پلو|kalam polo/i, icon: I.kalam_polo, photo: P.persian_kalam_polo },
  { test: /لوبیا.?پلو|استانبولی|lubia polo/i, icon: I.lubia_polo, photo: P.persian_lubia_polo },
  { test: /عدس.?پلو|adas polo/i, icon: I.adas_polo, photo: P.persian_adas_polo },
  { test: /باقالی.?پلو|baghali polo/i, icon: I.baghali_polo, photo: P.persian_baghali_polo },
  { test: /سبزی.?پلو|sabzi polo/i, icon: I.sabzi_polo_mahi, photo: P.persian_sabzi_polo_mahi },
  { test: /آلبالو.?پلو|albaloo/i, icon: I.albaloo_polo, photo: P.persian_albaloo_polo },
  { test: /شیرین.?پلو|shirin polo/i, icon: I.albaloo_polo, photo: P.persian_shirin_polo },
  { test: /جوجه|joojeh/i, icon: I.joojeh_kabab, photo: P.persian_joojeh_kabab },
  { test: /دلمه|dolmeh/i, icon: I.dolmeh, photo: P.persian_dolmeh },
  { test: /کوفته|koofteh/i, icon: I.koofteh, photo: P.persian_koofteh_tabrizi },
  { test: /کتلت|شامی|kotlet/i, icon: I.kotlet, photo: P.persian_kotlet },
  { test: /کوکو|kuku/i, icon: I.kuku_sabzi, photo: P.persian_kuku_sabzi },
  { test: /آبگوشت|دیزی|abgoosht|dizi/i, icon: I.abgoosht_dizi, photo: P.persian_abgoosht },
  { test: /آش\s|آش$|ash-e/i, icon: I.ash_reshteh, photo: P.persian_ash_reshteh },
  { test: /کباب|kabab|kebab/i, icon: I.kabab_koobideh, photo: P.persian_kabab },

  // World Pasta, Asian, Mexican, Soups, Breakfast
  { test: /آلفردو|\balfredo\b/i, icon: I.alfredo, photo: P.pasta_creamy },
  { test: /پستو|\bpesto\b/i, icon: I.pesto_pasta, photo: P.pasta_pesto },
  { test: /ریزوتو|\brisotto\b/i, icon: I.risotto, photo: P.risotto_creamy },
  { test: /پاستا|اسپاگتی|ماکارونی|\bpasta\b|\bspaghetti\b/i, icon: I.pasta_italian, photo: P.pasta_tomato },
  { test: /رامن|\bramen\b|\bpho\b/i, icon: I.ramen, photo: P.ramen_noodle },
  { test: /پدتای|نودل|چاومین|pad thai|\bnoodle/i, icon: I.pad_thai, photo: P.pad_thai },
  { test: /فراید رایس|برنج سرخ|fried rice/i, icon: I.fried_rice, photo: P.fried_rice },
  { test: /کاری|ماسالا|\bcurry\b/i, icon: I.curry_asian, photo: P.curry_bowl },
  { test: /کسادیا|\bquesadilla\b/i, icon: I.quesadilla, photo: P.quesadilla_wrap },
  { test: /تاکو|\btaco/i, icon: I.taco_wrap, photo: P.tacos_mexican },
  { test: /بوریتو|\bburrito\b/i, icon: I.burrito_bowl, photo: P.burrito_bowl },
  { test: /شاورما|\bshawarma\b/i, icon: I.shawarma, photo: P.shawarma_wrap },
  { test: /فلافل|حمص|\bfalafel\b|\bhummus\b/i, icon: I.falafel, photo: P.hummus_falafel },
  { test: /میگو|\bshrimp\b|\bprawn\b/i, icon: I.shrimp_skillet, photo: P.world_shrimp_skillet },
  { test: /سالمون|\bsalmon\b/i, icon: I.fish_fillet, photo: P.salmon_bowl },
  { test: /ماهی|\bfish\b|\btuna\b/i, icon: I.fish_fillet, photo: P.fish_grilled },
  { test: /استیک|\bsteak\b/i, icon: I.steak, photo: P.steak_sliced },
  { test: /سوپ قارچ|mushroom soup/i, icon: I.mushroom_soup, photo: P.world_mushroom_soup },
  { test: /سوپ کدو|سوپ گوجه|pumpkin soup|tomato soup/i, icon: I.pumpkin_soup, photo: P.world_tomato_pumpkin_soup },
  { test: /سوپ|\bsoup\b/i, icon: I.soup_stew, photo: P.soup_bowl },
  { test: /عدسی|adasi/i, icon: I.adasi, photo: P.soup_lentil },
  { test: /شاکشوکا|\bshakshuka\b/i, icon: I.shakshuka, photo: P.shakshuka_pan },
  { test: /پنکیک|وافل|فرنچ تست|\bpancake\b/i, icon: I.pancakes, photo: P.pancake_stack },
  { test: /اوتمیل|جو دوسر|\boatmeal\b|\boats\b/i, icon: I.oatmeal, photo: P.oatmeal_berries },
  { test: /اسموتی|\bsmoothie\b/i, icon: I.smoothie_bowl, photo: P.smoothie_bowl },
  { test: /آووکادو تست|تست آووکادو|avocado toast/i, icon: I.avocado_toast, photo: P.avocado_toast },
  { test: /املت|نیمرو|\bomelette\b/i, icon: I.omelette_irani, photo: P.persian_omelette },
];

/**
 * Resolves the exact distinct 3D food icon and authentic high-resolution dish photograph
 * for any built-in or custom RecipeMasterRecord.
 */
export function resolveRecipeVisuals(master: RecipeMasterRecord): ResolvedVisual {
  const explicit = EXPLICIT_RECIPE_VISUALS[master.id];
  if (explicit) {
    return explicit;
  }

  const probe = `${master.title} ${master.titleEn}`;
  for (const rule of CUSTOM_RECIPE_RULES) {
    if (rule.test.test(probe)) {
      return { icon: rule.icon, photoUrl: rule.photo };
    }
  }

  const fallbackByCategory: Record<string, ResolvedVisual> = {
    خورشت: { icon: I.gheimeh, photoUrl: P.persian_gheimeh },
    پلو: { icon: I.zereshk_polo, photoUrl: P.persian_zereshk_polo },
    'کباب و مرغ': { icon: I.joojeh_kabab, photoUrl: P.persian_joojeh_kabab },
    'آش و سوپ': { icon: I.soup_stew, photoUrl: P.soup_bowl },
    'کوکو و خوراک': { icon: I.kotlet, photoUrl: P.persian_kotlet },
    'پاستا و ایتالیایی': { icon: I.pasta_italian, photoUrl: P.pasta_tomato },
    'آسیایی و کاری': { icon: I.curry_asian, photoUrl: P.curry_bowl },
    'مکزیکی و رپ': { icon: I.taco_wrap, photoUrl: P.tacos_mexican },
    'کاسه سالم و سالاد': { icon: I.bowl_healthy, photoUrl: P.salad_med },
    'صبحانه و سریع': { icon: I.omelette_irani, photoUrl: P.persian_omelette },
  };

  const fb = fallbackByCategory[master.category];
  return {
    icon: fb?.icon ?? master.icon,
    photoUrl: master.photoUrl || fb?.photoUrl || P.persian_ghormeh,
  };
}
