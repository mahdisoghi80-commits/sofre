import { Capacitor } from '@capacitor/core';

/**
 * Hosted Sofreh backend URL used automatically inside native Capacitor builds (Android APK / iOS)
 * so Gemini AI features (/api/scan-fridge, /api/import-recipe) work out of the box
 * while keeping GEMINI_API_KEY strictly on the server.
 */
const DEFAULT_NATIVE_API_BASE_URL =
  'https://ais-pre-7jrqyptvpc2wsuizxf4wxo-112056476918.europe-west2.run.app';

export function resolveApiUrl(apiPath: string): string {
  const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  const envBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  if (envBase) {
    return `${envBase.replace(/\/+$/, '')}${normalizedPath}`;
  }

  if (Capacitor.isNativePlatform()) {
    return `${DEFAULT_NATIVE_API_BASE_URL}${normalizedPath}`;
  }

  return normalizedPath;
}
