import { INGREDIENTS_MASTER } from '../src/data/database/ingredients';
import { applyCors, type ServerlessRequest, type ServerlessResponse } from './_cors';

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (applyCors(req, res)) return;
  res.status(200).json({
    ok: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    canonicalIngredientsCount: INGREDIENTS_MASTER.length,
  });
}
