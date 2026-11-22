import fs from 'fs';
import path from 'path';
import {
  BUILTIN_RECIPES_MASTER,
  buildMasterJsonExport,
  buildMasterMarkdownDocument,
  getHydratedCatalog,
} from '../src/data/database/repository';
import { INGREDIENTS_MAP } from '../src/data/database/ingredients';

function main() {
  const { ingredients, recipes } = getHydratedCatalog();
  const idSet = new Set<string>();
  const errors: string[] = [];

  for (const r of BUILTIN_RECIPES_MASTER) {
    if (idSet.has(r.id)) errors.push(`Duplicate recipe id: ${r.id}`);
    idSet.add(r.id);

    if (r.ingredients.length === 0) errors.push(`Recipe ${r.id} has no ingredients`);
    for (const ing of r.ingredients) {
      if (!INGREDIENTS_MAP[ing.code]) {
        errors.push(`Recipe ${r.id} references unknown ingredient code: ${ing.code}`);
      }
      if (ing.amount <= 0) {
        errors.push(`Recipe ${r.id} has non-positive amount for ${ing.code}`);
      }
    }
    if (r.steps.length < 3) {
      errors.push(`Recipe ${r.id} has fewer than 3 steps`);
    }
    for (const s of r.steps) {
      if (s.ingredientIds) {
        for (const code of s.ingredientIds) {
          if (!INGREDIENTS_MAP[code]) {
            errors.push(`Recipe ${r.id} step references unknown ingredient code: ${code}`);
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error('Database validation FAILED:\n' + errors.join('\n'));
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), 'public/docs');
  fs.mkdirSync(outDir, { recursive: true });

  const mdContent = buildMasterMarkdownDocument();
  const jsonContent = buildMasterJsonExport();

  fs.writeFileSync(path.join(outDir, 'sofreh-250-foods-master-database.md'), mdContent, 'utf-8');
  fs.writeFileSync(path.join(outDir, 'sofreh-250-foods-master-database.json'), jsonContent, 'utf-8');

  const persianCount = recipes.filter((r) => r.cuisine === 'ایرانی').length;
  const worldCount = recipes.length - persianCount;

  console.log(
    `OK! Validated ${recipes.length} recipes (${persianCount} Persian + ${worldCount} International) across ${ingredients.length} canonical ING_* ingredients.`
  );
  console.log(
    `Exported public/docs/sofreh-250-foods-master-database.md (${Math.round(mdContent.length / 1024)} KB) and .json (${Math.round(jsonContent.length / 1024)} KB)`
  );
}

main();
