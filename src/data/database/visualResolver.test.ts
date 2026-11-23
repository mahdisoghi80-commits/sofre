import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DISH_PHOTOS } from './photos';
import { BUILTIN_RECIPES_MASTER } from './repository';
import { EXPLICIT_RECIPE_VISUALS, EXTENDED_FOOD_ICONS, resolveRecipeVisuals } from './visualResolver';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

test('All 250 built-in recipes are explicitly mapped in EXPLICIT_RECIPE_VISUALS', () => {
  assert.equal(BUILTIN_RECIPES_MASTER.length, 250, 'Expected 250 built-in recipes');
  const missing: string[] = [];
  for (const r of BUILTIN_RECIPES_MASTER) {
    if (!EXPLICIT_RECIPE_VISUALS[r.id]) {
      missing.push(r.id);
    }
  }
  assert.deepEqual(missing, [], `Recipes missing explicit visual mapping: ${missing.join(', ')}`);
});

test('Zero external http(s) URLs exist in DISH_PHOTOS and every bundled photo exists on disk (>1KB)', () => {
  const external: string[] = [];
  const missing: string[] = [];
  for (const [key, relUrl] of Object.entries(DISH_PHOTOS)) {
    if (/^https?:\/\//i.test(relUrl)) {
      external.push(`${key} -> ${relUrl}`);
    } else if (relUrl.startsWith('/assets/')) {
      const diskPath = path.join(PUBLIC_DIR, relUrl.slice(1));
      if (!fs.existsSync(diskPath) || fs.statSync(diskPath).size < 1024) {
        missing.push(`${key} -> ${relUrl}`);
      }
    }
  }
  assert.deepEqual(external, [], `External URLs found in DISH_PHOTOS:\n${external.join('\n')}`);
  assert.deepEqual(missing, [], `Missing or empty local photos:\n${missing.join('\n')}`);
});

test('Every local /assets/ icon and dish photo referenced by the 250 recipes exists on disk (>1KB)', () => {
  const missingFiles: string[] = [];
  for (const r of BUILTIN_RECIPES_MASTER) {
    const resolved = resolveRecipeVisuals(r);
    assert.ok(
      resolved.photoUrl.startsWith('/assets/'),
      `${r.id} resolved to non-local photo: ${resolved.photoUrl}`
    );
    for (const assetUrl of [resolved.icon, resolved.photoUrl]) {
      const diskPath = path.join(PUBLIC_DIR, assetUrl.slice(1));
      if (!fs.existsSync(diskPath) || fs.statSync(diskPath).size < 1024) {
        missingFiles.push(`${r.id} -> ${assetUrl}`);
      }
    }
  }
  assert.deepEqual(missingFiles, [], `Missing or empty local assets:\n${missingFiles.join('\n')}`);
});

test('All 80 3D food icons in EXTENDED_FOOD_ICONS exist on disk', () => {
  const entries = Object.entries(EXTENDED_FOOD_ICONS);
  assert.equal(entries.length, 80, 'Expected 80 distinct 3D food icons');
  for (const [key, relUrl] of entries) {
    const diskPath = path.join(PUBLIC_DIR, relUrl.slice(1));
    assert.ok(fs.existsSync(diskPath), `Missing 3D icon file for ${key}: ${diskPath}`);
    assert.ok(fs.statSync(diskPath).size > 1024, `3D icon too small for ${key}: ${diskPath}`);
  }
});

test('Previously misclassified dishes now resolve to exact accurate local icons & photos', () => {
  const byId = new Map(BUILTIN_RECIPES_MASTER.map((r) => [r.id, r]));
  const check = (id: string, expectedIconPart: string, expectedPhotoPart: string) => {
    const rec = byId.get(id);
    assert.ok(rec, `Missing recipe ${id}`);
    const v = resolveRecipeVisuals(rec);
    assert.ok(
      v.icon.includes(expectedIconPart),
      `${id}: expected icon containing "${expectedIconPart}", got "${v.icon}"`
    );
    assert.ok(
      v.photoUrl.includes(expectedPhotoPart),
      `${id}: expected photo containing "${expectedPhotoPart}", got "${v.photoUrl}"`
    );
  };

  check('classic-smash-burger', 'burger.jpg', 'smash_burger.jpg');
  check('kashk-bademjan', 'food_kashk_bademjan', 'img_4.jpg');
  check('dolmeh-barg-moo', 'dolmeh.jpg', 'dolmeh.jpg');
  check('dolmeh-felfel', 'stuffed_pepper.jpg', 'dolmeh_felfel.jpg');
  check('omelette-irani', 'food_omelette_irani', 'omelette_irani.jpg');
  check('adasi-irani', 'adasi.jpg', 'adasi_irani.jpg');
  check('albaloo-polo', 'albaloo_polo.jpg', 'albaloo_polo.jpg');
  check('shirin-polo', 'albaloo_polo.jpg', 'shirin_polo.jpg');
  check('khoresht-ghalieh-mahi', 'ghalieh_mahi.jpg', 'ghalieh_mahi.jpg');
  check('khoresht-bamieh', 'gheimeh.jpg', 'khoresht_bamieh.jpg');
  check('baghali-ghatogh', 'baghali_ghatogh.jpg', 'baghali_ghatogh.jpg');
  check('nan-panir-gerdoo', 'nan_panir.jpg', 'nan_panir_sabzi.jpg');
  check('makaroni-tahdig', 'arrabbiata.jpg', 'makaroni_tahdig.jpg');
  check('ash-doogh-ardabil', 'food_ash_reshteh', 'ash_doogh.jpg');
  check('kabab-torsh-gilani', 'kabab_barg.jpg', 'kabab_torsh.jpg');
  check('akbar-joojeh', 'food_morgh_tanoori', 'akbar_joojeh.jpg');
  check('indian-butter-chicken', 'butter_chicken.jpg', 'butter_chicken.jpg');
  check('beef-stroganoff', 'stroganoff.jpg', 'beef_stroganoff.jpg');
  check('shepherds-pie', 'shepherds_pie.jpg', 'shepherds_pie.jpg');
  check('french-ratatouille', 'ratatouille.jpg', 'ratatouille_baked.jpg');
  check('chicken-enchiladas', 'enchilada.jpg', 'enchiladas_baked.jpg');
  check('lasagna-spinach-mushroom', 'lasagna.jpg', 'lasagna_classic.jpg');
  check('egg-muffin-cups-veggie', 'egg_muffin.jpg', 'egg_muffin_cups.jpg');
  check('french-onion-soup', 'food_soup_stew', 'french_onion_soup.jpg');
  check('broccoli-cheddar-soup', 'mushroom_soup.jpg', 'broccoli_cheddar_soup.jpg');
  check('arabic-kabsa-chicken', 'food_zereshk_polo', 'arabic_kabsa.jpg');
  check('turkish-lahmacun-wrap', 'pizza.jpg', 'lahmacun_wrap.jpg');
  check('french-toast-berries', 'pancakes.jpg', 'french_toast.jpg');
  check('smoked-salmon-cream-cheese-toast', 'avocado_toast.jpg', 'smoked_salmon_toast.jpg');
  check('tofu-veggie-stirfry', 'food_bowl_healthy', 'beef_broccoli_stirfry.jpg');
  check('meygoo-polo-jonoobi', 'shrimp_skillet.jpg', 'meygoo_polo.jpg');
  check('khoresht-karafs', 'karafs.jpg', 'khoresht_karafs.jpg');
  check('khoresht-bademjan-morgh', 'bademjan.jpg', 'khoresht_bademjan.jpg');
  check('lubia-polo', 'lubia_polo.jpg', 'lubia_polo.jpg');
  check('adas-polo', 'food_adas_polo', 'adas_polo.jpg');
  check('sabzi-polo-mahi', 'sabzi_polo_mahi.jpg', 'sabzi_polo_mahi.jpg');
});
