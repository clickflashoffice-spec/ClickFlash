type DateInput = Date | string | number;

function toDate(input: DateInput): Date {
  return input instanceof Date ? input : new Date(input);
}

export function formatDate(date: DateInput, style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium', locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(toDate(date));
}

export function formatDateTime(date: DateInput, style: Intl.DateTimeFormatOptions['dateStyle'] = 'medium', locale = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeStyle: 'short' }).format(toDate(date));
}

export function formatRelativeTime(date: DateInput, locale = 'en-US'): string {
  const d = toDate(date);
  const now = new Date();
  const diffInMs = d.getTime() - now.getTime();
  const diffInSeconds = Math.round(diffInMs / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (Math.abs(diffInSeconds) < 60) return rtf.format(diffInSeconds, 'second');
  
  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) return rtf.format(diffInMinutes, 'minute');
  
  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) return rtf.format(diffInHours, 'hour');
  
  const diffInDays = Math.round(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) return rtf.format(diffInDays, 'day');
  
  const diffInMonths = Math.round(diffInDays / 30);
  if (Math.abs(diffInMonths) < 12) return rtf.format(diffInMonths, 'month');
  
  const diffInYears = Math.round(diffInDays / 365);
  return rtf.format(diffInYears, 'year');
}

export function isToday(date: DateInput): boolean {
  const d = toDate(date);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

export function isWithinDays(date: DateInput, days: number): boolean {
  const d = toDate(date);
  const now = new Date();
  const diffInDays = Math.abs((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffInDays <= days;
}
