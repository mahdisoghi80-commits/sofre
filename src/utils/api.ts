import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Hosted Sofreh backend URL used inside native Capacitor builds (Android APK / iOS)
 * so Gemini AI features (/api/scan-fridge, /api/import-recipe) run safely server-side
 * while keeping GEMINI_API_KEY strictly on the server.
 */
const DEFAULT_NATIVE_API_BASE_URL =
  'https://ais-pre-7jrqyptvpc2wsuizxf4wxo-112056476918.europe-west2.run.app';

const CUSTOM_API_BASE_KEY = 'sofreh_custom_api_base_url';

export function getCustomApiBaseUrl(): string {
  try {
    return (window.localStorage.getItem(CUSTOM_API_BASE_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

export function setCustomApiBaseUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      window.localStorage.setItem(CUSTOM_API_BASE_KEY, clean);
    } else {
      window.localStorage.removeItem(CUSTOM_API_BASE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

export function getActiveNativeApiBaseUrl(): string {
  const custom = getCustomApiBaseUrl();
  if (isValidHttpUrl(custom)) return custom.replace(/\/+$/, '');
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
  if (isValidHttpUrl(envBase)) return envBase.replace(/\/+$/, '');
  return DEFAULT_NATIVE_API_BASE_URL;
}

export function resolveApiUrl(apiPath: string): string {
  const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const custom = getCustomApiBaseUrl();
  if (isValidHttpUrl(custom)) {
    return `${custom.replace(/\/+$/, '')}${normalizedPath}`;
  }

  if (Capacitor.isNativePlatform()) {
    const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
    if (isValidHttpUrl(envBase)) {
      return `${envBase.replace(/\/+$/, '')}${normalizedPath}`;
    }
    return `${DEFAULT_NATIVE_API_BASE_URL}${normalizedPath}`;
  }

  // On web/preview, always hit same-origin Express /api/* routes directly
  return normalizedPath;
}

/**
 * Unified JSON POST helper that uses Capacitor's native OkHttp bridge on Android/iOS
 * (avoiding WebView CORS/TLS issues) and standard fetch with clean timeouts on web.
 */
export async function postApiJson<TResponse = Record<string, unknown>>(
  apiPath: string,
  payload: Record<string, unknown>,
  timeoutMs = 28_000
): Promise<{ ok: boolean; status: number; data: TResponse }> {
  const url = resolveApiUrl(apiPath);

  if (Capacitor.isNativePlatform()) {
    try {
      const resp = await CapacitorHttp.post({
        url,
        headers: { 'Content-Type': 'application/json' },
        data: payload,
        connectTimeout: 12_000,
        readTimeout: timeoutMs,
      });
      const parsed =
        typeof resp.data === 'string'
          ? (() => {
              try {
                return JSON.parse(resp.data) as TResponse;
              } catch {
                return {} as TResponse;
              }
            })()
          : ((resp.data ?? {}) as TResponse);
      return {
        ok: resp.status >= 200 && resp.status < 300,
        status: resp.status,
        data: parsed,
      };
    } catch {
      throw new Error(
        'اتصال به سرور هوش مصنوعی برقرار نشد. اگر نسخهٔ تست را نصب کرده‌اید، از اتصال اینترنت/فیلترشکن یا منتشر شدن سرور مطمئن شوید؛ همچنین می‌توانید مواد را دستی وارد کنید.'
      );
    }
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const rawText = await resp.text();
    let data = {} as TResponse;
    try {
      data = JSON.parse(rawText) as TResponse;
    } catch {
      // Non-JSON response
    }
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('پاسخ سرور طولانی شد. لطفاً دوباره امتحان کنید.');
    }
    throw new Error(
      'اتصال به سرور هوش مصنوعی برقرار نشد. اتصال اینترنت را بررسی کنید یا مواد را دستی اضافه کنید.'
    );
  } finally {
    window.clearTimeout(timer);
  }
}
