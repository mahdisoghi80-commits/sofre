/**
 * Push / Local Notification Dispatcher for Day-Before Prep Reminders (e.g., Legume Soaking).
 * Uses the standard Browser Notification API (compatible with PWA & modern mobile WebViews)
 * with graceful non-throwing fallback when permissions are denied or unavailable.
 */

export type NotificationSupportStatus = 'granted' | 'default' | 'denied' | 'unsupported';

export function getNotificationPermissionStatus(): NotificationSupportStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationSupportStatus;
}

export async function requestPrepNotificationPermission(): Promise<NotificationSupportStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    return result as NotificationSupportStatus;
  } catch {
    return 'denied';
  }
}

export async function dispatchPrepPushNotification(payload: {
  title: string;
  body: string;
  tag?: string;
}): Promise<{ delivered: boolean; status: NotificationSupportStatus }> {
  const status = await requestPrepNotificationPermission();
  if (status !== 'granted') {
    return { delivered: false, status };
  }
  try {
    new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag ?? 'sofreh-prep',
      dir: 'rtl',
      lang: 'fa',
    });
    return { delivered: true, status: 'granted' };
  } catch {
    return { delivered: false, status };
  }
}
