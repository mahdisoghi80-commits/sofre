import type { OwnerDatabaseOverrides } from '../types/sofreh';
import { resolveApiUrl } from './api';
import { loadPersistedString, savePersistedString } from './native';
import type { LivePricesPayload } from './priceEngine';

const LIVE_PRICES_CACHE_KEY = 'sofreh_live_prices_cache_v2';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface CachedLivePrices {
  fetchedAt: number;
  payload: LivePricesPayload;
}

function isValidPayload(data: unknown): data is LivePricesPayload {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Partial<LivePricesPayload>;
  return (
    typeof obj.updatedAt === 'string' &&
    typeof obj.prices === 'object' &&
    obj.prices !== null &&
    Object.keys(obj.prices).length > 0
  );
}

/** Load last cached live Iranian market prices for instant offline startup */
export async function loadCachedLivePrices(): Promise<CachedLivePrices | null> {
  try {
    const raw = await loadPersistedString(LIVE_PRICES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLivePrices;
    if (!parsed || !isValidPayload(parsed.payload)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fetch fresh live prices JSON (auto-updated by GitHub Actions / local Iran-IP sync).
 * Tries VITE_PRICES_URL (e.g. GitHub Raw / CDN) -> hosted /api/prices-live -> bundled /prices-live.json.
 */
export async function fetchLivePrices(force = false): Promise<LivePricesPayload | null> {
  if (!force) {
    const cached = await loadCachedLivePrices();
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.payload;
    }
  }

  const envUrl = (
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_PRICES_URL ?? ''
  ).trim();
  const apiPricesUrl = resolveApiUrl('/api/prices-live');
  const candidates = Array.from(
    new Set([
      ...(envUrl ? [envUrl] : []),
      apiPricesUrl,
      '/prices-live.json',
    ])
  );

  for (const url of candidates) {
    try {
      const separator = url.includes('?') ? '&' : '?';
      const fetchUrl = force ? `${url}${separator}t=${Date.now()}` : url;
      const resp = await fetch(fetchUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) continue;
      const json = (await resp.json()) as unknown;
      if (!isValidPayload(json)) continue;

      const cacheEntry: CachedLivePrices = {
        fetchedAt: Date.now(),
        payload: json,
      };
      await savePersistedString(LIVE_PRICES_CACHE_KEY, JSON.stringify(cacheEntry));
      return json;
    } catch {
      // Try next fallback URL
    }
  }

  const stale = await loadCachedLivePrices();
  return stale?.payload ?? null;
}

/**
 * Merge automated live market prices underneath the user's manual overrides.
 * Priority: Manual User Override > Automated Live Market Price > Static Baseline.
 */
export function mergeLivePricesWithOverrides(
  livePayload: LivePricesPayload | null,
  userOverrides: OwnerDatabaseOverrides
): OwnerDatabaseOverrides {
  if (!livePayload) return userOverrides;

  const mergedPrices: OwnerDatabaseOverrides['ingredientPrices'] = {};

  for (const [code, entry] of Object.entries(livePayload.prices)) {
    if (
      entry &&
      typeof entry.unitPriceToman === 'number' &&
      entry.unitPriceToman > 0 &&
      typeof entry.packPriceToman === 'number' &&
      entry.packPriceToman > 0
    ) {
      mergedPrices[code] = {
        unitPriceToman: entry.unitPriceToman,
        packPriceToman: entry.packPriceToman,
      };
    }
  }

  // User manual overrides always take highest priority
  for (const [code, override] of Object.entries(userOverrides.ingredientPrices)) {
    mergedPrices[code] = override;
  }

  return {
    ...userOverrides,
    ingredientPrices: mergedPrices,
  };
}
