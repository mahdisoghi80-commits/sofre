import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';

export function getNativePlatform(): 'android' | 'ios' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return platform;
  return 'web';
}

/**
 * Inform Android / iOS system status bar whether to render dark icons (Light Mode)
 * or light/white icons (Dark Mode) — without altering the app background itself.
 */
export async function syncNativeStatusBar(isDark: boolean): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('sofreh_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage restrictions
    }
  }
  if (typeof document !== 'undefined') {
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#161714' : '#FBF5EF');
    }
  }
  if (!Capacitor.isNativePlatform()) return;
  try {
    // Style.Light => dark icons for bright backgrounds; Style.Dark => light icons for dark backgrounds
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch {
    // Safe fallback if status bar plugin is unavailable
  }
}

/**
 * Reset root scroll position immediately across Web, iOS WKWebView, and Android WebView.
 */
export function scrollToTopInstant(): void {
  if (typeof window === 'undefined') return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }
  if (typeof document !== 'undefined') {
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }
}

/**
 * Subtle tactile tick reserved strictly for continuous dials & sliders (BudgetDial, CuisineRatioControl).
 * Normal buttons, tabs, and toggles stay completely silent to avoid annoying vibrations in the APK.
 */
export async function hapticTick(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.selectionChanged();
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(6);
    }
  } catch {
    // Graceful no-op on unsupported desktop browsers
  }
}

export async function hapticLight(): Promise<void> {
  // Intentionally silent — standard button taps must not vibrate the phone
}

export async function hapticMedium(): Promise<void> {
  // Intentionally silent — standard toggles/actions must not vibrate the phone
}

export async function hapticSuccess(): Promise<void> {
  // Intentionally silent — avoid repetitive vibration across routine actions
}

export async function savePersistedString(key: string, value: string): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export async function loadPersistedString(key: string): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function copyOrShareText(title: string, text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text });
      return true;
    }
  } catch {
    // User cancelled or share unavailable — fall through to clipboard
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback textarea copy
  }
  return false;
}
