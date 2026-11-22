const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * Formats an integer Toman amount with Persian digits and Iranian thousands separator (٬).
 */
export function formatToman(amount: number, showUnit = true): string {
  const rounded = Math.round(amount / 1000) * 1000;
  const absVal = Math.abs(rounded);
  const formatted = absVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const sign = rounded < 0 ? '−' : '';
  const fa = toPersianDigits(`${sign}${formatted}`);
  return showUnit ? `${fa} تومان` : fa;
}

/**
 * Compact Toman display for dense cards (e.g., ۴۵۰ هزار یا ۱.۲ میلیون).
 */
export function formatTomanCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '−' : '';
  if (abs >= 1_000_000) {
    const mil = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${toPersianDigits(mil)} میلیون`;
  }
  const thou = Math.round(abs / 1000);
  return `${sign}${toPersianDigits(thou)} هزار`;
}

/**
 * Normalizes Persian & Arabic characters and strips ZWNJ/diacritics for reliable search.
 */
export function normalizePersian(text: string): string {
  return text
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[\u200c\u064b-\u0652]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Natural Iranian kitchen unit rounding — avoids awkward decimals like 0.67 or 15 tbsp.
 */
export function formatScaledAmount(amount: number, unit: string): string {
  if (unit === 'گرم') {
    if (amount >= 1000) {
      const kg = Math.round((amount / 1000) * 4) / 4; // quarter-kg steps
      return `${toPersianDigits(kg)} کیلوگرم`;
    }
    const g = Math.max(10, Math.round(amount / 10) * 10);
    return `${toPersianDigits(g)} گرم`;
  }

  if (unit === 'قاشق غذاخوری' && amount >= 12) {
    const cups = Math.round((amount / 16) * 4) / 4;
    return `${toPersianDigits(cups)} پیمانه`;
  }

  if (unit === 'عدد' || unit === 'حبه') {
    if (amount >= 1.75) {
      return `${toPersianDigits(Math.round(amount))} ${unit}`;
    }
    const rounded = amount < 0.75 ? 0.5 : Math.round(amount * 2) / 2;
    if (rounded === 0.5) return `نصف ${unit}`;
    if (rounded === 1.5) return `۱ و نیم ${unit}`;
    return `${toPersianDigits(Math.round(rounded))} ${unit}`;
  }

  const nice = Math.round(amount * 2) / 2;
  if (nice % 1 === 0.5) {
    const whole = Math.floor(nice);
    return whole === 0 ? `نصف ${unit}` : `${toPersianDigits(whole)} و نیم ${unit}`;
  }
  return `${toPersianDigits(Math.max(0.5, nice))} ${unit}`;
}

export function formatTimerClock(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${toPersianDigits(String(mins).padStart(2, '0'))}:${toPersianDigits(
    String(secs).padStart(2, '0')
  )}`;
}

export const toFaDigits = toPersianDigits;
export const formatAmount = formatScaledAmount;
export const formatTimer = formatTimerClock;
