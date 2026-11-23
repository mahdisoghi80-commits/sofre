import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export function getNativePlatform(): 'android' | 'ios' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return platform;
  return 'web';
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
