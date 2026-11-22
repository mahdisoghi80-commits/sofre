import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

export function getNativePlatform(): 'android' | 'ios' | 'web' {
  const platform = Capacitor.getPlatform();
  if (platform === 'android' || platform === 'ios') return platform;
  return 'web';
}

export async function hapticLight(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch {
    // Graceful no-op on unsupported desktop browsers
  }
}

export async function hapticMedium(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(18);
    }
  } catch {
    // Graceful no-op
  }
}

export async function hapticSuccess(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([15, 40, 20]);
    }
  } catch {
    // Graceful no-op
  }
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
