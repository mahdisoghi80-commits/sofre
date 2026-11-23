import assert from 'node:assert/strict';
import test from 'node:test';
import { INGREDIENTS_MAP } from '../data/database/ingredients';
import {
  computeRobustUnitPrice,
  extractOfferQuantity,
  isOfferRelevant,
  normalizeFaText,
  type MarketProductOffer,
} from './priceEngine';

test('normalizeFaText converts Persian & Arabic numerals and normalizes ي/ك', () => {
  assert.equal(normalizeFaText('برنج طارم ۱٬۰۰۰ گرمی كاله'), 'برنج طارم 1000 گرمی کاله');
  assert.equal(normalizeFaText('شیر ١.٥ لیتری'), 'شیر 1.5 لیتری');
});

test('extractOfferQuantity handles multi-packs, fractional Persian weights, kg, liters, and counts', () => {
  const paste = extractOfferQuantity('رب گوجه فرنگی چین چین 800 گرمی بسته 3 عددی', 'قاشق');
  assert.ok(paste);
  assert.equal(paste.quantityInTargetUnit, 2400);
  assert.equal(paste.confidence, 'high');

  const sugar = extractOfferQuantity('شکر سفید یک کیلو نیم', 'قاشق');
  assert.ok(sugar);
  assert.equal(sugar.quantityInTargetUnit, 1500);

  const eggs = extractOfferQuantity('تخم مرغ تازه شانه 30 عددی', 'عدد', undefined, 'ING_EGG');
  assert.ok(eggs);
  assert.equal(eggs.quantityInTargetUnit, 30);

  const milk = extractOfferQuantity('شیر کم چرب 1.5 لیتری پگاه', 'میلی‌لیتر');
  assert.ok(milk);
  assert.equal(milk.quantityInTargetUnit, 1500);
});

test('isOfferRelevant rejects non-food junk, fridge magnets, hats, flower bulbs, fungicides, and mismatched keywords', () => {
  const tomato = INGREDIENTS_MAP['ING_TOMATO'];
  assert.equal(isOfferRelevant(tomato, 'گوجه فرنگی تازه گلخانه ای یک کیلو'), true);
  assert.equal(isOfferRelevant(tomato, 'گوجه خشک اسلایس 200 گرم'), false);
  assert.equal(isOfferRelevant(tomato, 'بذر گوجه فرنگی اصلاح شده'), false);

  const sangak = INGREDIENTS_MAP['ING_SANGAK_BREAD'];
  assert.equal(isOfferRelevant(sangak, 'مگنت یخچال طرح نان بربری و نان سنگک'), false);

  const berries = INGREDIENTS_MAP['ING_BERRIES'];
  assert.equal(isOfferRelevant(berries, 'کلاه توت فرنگی یا بلوبری پینترستی'), false);

  const onion = INGREDIENTS_MAP['ING_ONION'];
  assert.equal(isOfferRelevant(onion, 'پیاز گل نرگس شهلا سایز متوسط بسته یک کیلویی'), false);

  const mushroom = INGREDIENTS_MAP['ING_MUSHROOM'];
  assert.equal(isOfferRelevant(mushroom, 'قارچکش زیستی باسیلوس سوبتیلیس حجم 50 گرم'), false);

  const cauliflower = INGREDIENTS_MAP['ING_CAULIFLOWER'];
  assert.equal(
    isOfferRelevant(cauliflower, 'گلاب ممتاز نیم لیتری اعتماد', [], ['گل کلم']),
    false
  );

  const chicken = INGREDIENTS_MAP['ING_CHICKEN_BREAST'];
  assert.equal(isOfferRelevant(chicken, 'غذای گربه با طعم سینه مرغ 1 کیلو'), false);
  assert.equal(isOfferRelevant(chicken, 'سینه مرغ تازه بدون استخوان یک کیلوگرم'), true);
});

test('computeRobustUnitPrice prices dried oregano realistically (~2g/spoon, never 400k+ for 20 spoons)', () => {
  const oregano = INGREDIENTS_MAP['ING_OREGANO'];
  const offers: MarketProductOffer[] = [
    { title: 'آویشن خشک کوهی 100 گرم', priceToman: 220_000, source: 'basalam' },
    { title: 'برگ آویشن خشک ممتاز 100 گرمی', priceToman: 260_000, source: 'basalam' },
    { title: 'آویشن خشک شیرازی 200 گرم', priceToman: 420_000, source: 'basalam' },
  ];
  const result = computeRobustUnitPrice(oregano, offers, {
    requiredAnyKeywords: ['آویشن', 'اورگانو'],
  });
  assert.ok(result);
  // 100g = ~220k-260k -> 1 spoon (2g) = ~4,400-5,200 Toman -> 20 spoons (40g) = ~88k-104k Toman
  assert.ok(
    result.unitPriceToman >= 3_500 && result.unitPriceToman <= 7_000,
    `Expected realistic spoon price, got ${result.unitPriceToman}`
  );
  assert.ok(
    result.packPriceToman >= 70_000 && result.packPriceToman <= 150_000,
    `Expected realistic 20-spoon jar price, got ${result.packPriceToman}`
  );
});

test('computeRobustUnitPrice calculates trimmed median in Toman and rejects wild outliers', () => {
  const chicken = INGREDIENTS_MAP['ING_CHICKEN_BREAST'];
  const offers: MarketProductOffer[] = [
    { title: 'سینه مرغ تازه بدون استخوان 1 کیلو', priceToman: 780_000, source: 'torob' },
    { title: 'سینه مرغ فیله 1 کیلوگرم', priceToman: 810_000, source: 'basalam' },
    { title: 'سینه مرغ تازه 500 گرمی', priceToman: 400_000, source: 'torob' },
    { title: 'سینه مرغ بسته 1 کیلویی', priceToman: 820_000, source: 'basalam' },
    { title: 'سینه مرغ تزیینی 1 کیلو', priceToman: 9_900_000, source: 'basalam' }, // crazy outlier
    { title: 'غذای سگ طعم سینه مرغ 1 کیلو', priceToman: 210_000, source: 'basalam' }, // pet food
  ];

  const result = computeRobustUnitPrice(chicken, offers);
  assert.ok(result);
  assert.ok(
    result.packPriceToman >= 760_000 && result.packPriceToman <= 840_000,
    `Expected ~800k Toman/kg, got ${result.packPriceToman}`
  );
});
