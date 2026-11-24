import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Public HTTPS backend URL baked into native Capacitor builds (Android APK / iOS)
 * via VITE_API_BASE_URL (or default Vercel deployment) so Gemini AI features
 * (/api/chef-chat, /api/scan-fridge, /api/import-recipe) work automatically
 * with zero user configuration while keeping GEMINI_API_KEY strictly server-side.
 */
const DEFAULT_NATIVE_API_BASE_URL = 'https://sofre.vercel.app';

function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

export function resolveApiUrl(apiPath: string): string {
  const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;

  if (Capacitor.isNativePlatform()) {
    const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? '';
    if (isValidHttpUrl(envBase)) {
      return `${envBase.replace(/\/+$/, '')}${normalizedPath}`;
    }
    return `${DEFAULT_NATIVE_API_BASE_URL}${normalizedPath}`;
  }

  // On web/preview, always hit same-origin /api/* routes directly
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
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: payload,
        connectTimeout: 14_000,
        readTimeout: timeoutMs,
      });

      let parsed = {} as TResponse;
      let isJson = false;
      if (typeof resp.data === 'string') {
        const trimmed = resp.data.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            parsed = JSON.parse(trimmed) as TResponse;
            isJson = true;
          } catch {
            isJson = false;
          }
        }
      } else if (resp.data && typeof resp.data === 'object') {
        parsed = resp.data as TResponse;
        isJson = true;
      }

      if (!isJson) {
        return {
          ok: false,
          status: resp.status || 502,
          data: { error: 'پاسخ معتبری از سرویس هوش مصنوعی دریافت نشد.' } as TResponse,
        };
      }

      return {
        ok: resp.status >= 200 && resp.status < 300,
        status: resp.status,
        data: parsed,
      };
    } catch {
      throw new Error(
        'ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت را بررسی کرده و دوباره تلاش کنید.'
      );
    }
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const rawText = await resp.text();
    let data = {} as TResponse;
    try {
      data = JSON.parse(rawText) as TResponse;
    } catch {
      return {
        ok: false,
        status: resp.status || 502,
        data: { error: 'پاسخ معتبری از سرویس هوش مصنوعی دریافت نشد.' } as TResponse,
      };
    }
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('پاسخ سرویس هوش مصنوعی طولانی شد. لطفاً دوباره امتحان کنید.');
    }
    throw new Error(
      'ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفاً اتصال اینترنت را بررسی کنید.'
    );
  } finally {
    window.clearTimeout(timer);
  }
}
