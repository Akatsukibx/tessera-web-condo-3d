import { UNITS } from '../content/facts.js';

export const MAX_DAYS_AHEAD = 180;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS_RE = /^\+?[\d\s-]+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Formats a local date as YYYY-MM-DD. */
export function toISODate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const minBookingDate = (today = new Date()) => toISODate(addDays(startOfDay(today), 1));
export const maxBookingDate = (today = new Date()) => toISODate(addDays(startOfDay(today), MAX_DAYS_AHEAD));

function parseDate(value) {
  const m = DATE_RE.exec(value || '');
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/**
 * Validates booking form values. Returns an object of field -> message for each invalid field.
 * @param {{name?:string,email?:string,phone?:string,unit?:string,date?:string}} values
 * @param {Date} [today]
 * @returns {Record<string,string>}
 */
export function validateBooking(values, today = new Date()) {
  const errors = {};
  const name = (values.name || '').trim();
  const email = (values.email || '').trim();
  const phone = (values.phone || '').trim();
  const unit = values.unit || '';
  const date = (values.date || '').trim();

  if (name.length < 2 || name.length > 80) errors.name = 'Enter your full name.';

  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

  const digits = phone.replace(/\D/g, '').length;
  if (!phone || !PHONE_CHARS_RE.test(phone) || digits < 8 || digits > 16) {
    errors.phone = 'Enter a phone number with 8 to 16 digits.';
  }

  if (!UNITS.some((u) => u.id === unit)) errors.unit = 'Choose a residence type.';

  if (!date) {
    errors.date = 'Choose a date.';
  } else {
    const d = parseDate(date);
    const tomorrow = addDays(startOfDay(today), 1);
    const last = addDays(startOfDay(today), MAX_DAYS_AHEAD);
    if (!d || d < tomorrow) errors.date = 'Choose a date from tomorrow onward.';
    else if (d > last) errors.date = `Choose a date within the next ${MAX_DAYS_AHEAD} days.`;
  }

  return errors;
}
