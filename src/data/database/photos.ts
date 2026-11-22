/**
 * Curated high-resolution food photography URLs (built directly into the app, zero backend needed)
 * paired with our 5 extracted authentic Persian dish photos (/assets/extracted/img_1.jpg..img_5.jpg).
 * Used on Recipe Detail Hero with smooth fade-into-cream transition + automatic fallback to 3D icon.
 */
export const DISH_PHOTOS = {
  // Authentic extracted Persian hero photos (always local & instant)
  persian_abgoosht: '/assets/extracted/img_1.jpg',
  persian_kabab: '/assets/extracted/img_2.jpg',
  persian_morgh: '/assets/extracted/img_3.jpg',
  persian_kashk: '/assets/extracted/img_4.jpg',
  persian_ghormeh: '/assets/extracted/img_5.jpg',

  // High-resolution curated web food photography (Unsplash direct CDN, verified food IDs)
  stew_red: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=85',
  stew_green: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=85',
  stew_fesenjan: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=1200&q=85',
  rice_saffron: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=1200&q=85',
  rice_herb: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=85',
  rice_lentil: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=85',
  kebab_grill: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=85',
  chicken_roast: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1200&q=85',
  chicken_skewer: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=1200&q=85',
  fish_grilled: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=85',
  shrimp_dish: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=85',
  soup_bowl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
  soup_lentil: 'https://images.unsplash.com/photo-1603105037880-880cd4edfb0d?auto=format&fit=crop&w=1200&q=85',
  eggplant_dip: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&w=1200&q=85',
  frittata_kuku: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1200&q=85',
  cutlet_patty: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1200&q=85',
  omelette_pan: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=85',
  pasta_tomato: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=85',
  pasta_creamy: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=1200&q=85',
  pasta_pesto: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=1200&q=85',
  lasagna_baked: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=1200&q=85',
  pizza_artisan: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=85',
  risotto_creamy: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=1200&q=85',
  curry_bowl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=1200&q=85',
  stir_fry: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=85',
  ramen_noodle: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=85',
  pad_thai: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=1200&q=85',
  fried_rice: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=85',
  tacos_mexican: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=85',
  burrito_bowl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=85',
  quesadilla_wrap: 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?auto=format&fit=crop&w=1200&q=85',
  burger_gourmet: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85',
  steak_sliced: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',
  salmon_bowl: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=1200&q=85',
  salad_med: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=85',
  salad_caesar: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=1200&q=85',
  hummus_falafel: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=1200&q=85',
  shawarma_wrap: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=1200&q=85',
  shakshuka_pan: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=1200&q=85',
  oatmeal_berries: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=1200&q=85',
  avocado_toast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=85',
  pancake_stack: 'https://images.unsplash.com/photo-1528207776549-360741a20fed?auto=format&fit=crop&w=1200&q=85',
  smoothie_bowl: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=1200&q=85',
} as const;

export type DishPhotoKey = keyof typeof DISH_PHOTOS;
