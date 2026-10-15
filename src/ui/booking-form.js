// Client-side booking form. Nothing is sent anywhere: no fetch, no XHR, no storage.

import { UNITS } from '../content/facts.js';
import { validateBooking, minBookingDate, maxBookingDate } from '../lib/validate.js';

const FIELDS = ['name', 'email', 'phone', 'unit', 'date'];

/**
 * Preselect a residence type in the booking form (from the Tower Explorer). '' clears it.
 * @param {string} typeId
 */
export function selectUnit(typeId) {
  const select = /** @type {HTMLSelectElement|null} */ (document.getElementById('f-unit'));
  if (!select) return;
  select.value = typeId || '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

export function initBookingForm() {
  const form = /** @type {HTMLFormElement|null} */ (document.getElementById('booking-form'));
  const success = document.getElementById('booking-success');
  const heading = document.getElementById('success-heading');
  const resetBtn = document.getElementById('booking-reset');
  if (!form || !success || !heading || !resetBtn) return;

  const select = form.elements.namedItem('unit');
  for (const u of UNITS) {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = `${u.label} · ${u.sqm} sqm`;
    select.appendChild(opt);
  }

  const dateInput = form.elements.namedItem('date');
  dateInput.min = minBookingDate();
  dateInput.max = maxBookingDate();

  let submitted = false;

  const values = () => Object.fromEntries(FIELDS.map((f) => [f, form.elements.namedItem(f).value]));

  const show = (errors, only) => {
    for (const f of FIELDS) {
      if (only && f !== only) continue;
      const input = form.elements.namedItem(f);
      const err = document.getElementById(`err-${f}`);
      if (errors[f]) {
        input.setAttribute('aria-invalid', 'true');
        err.textContent = errors[f];
      } else {
        input.removeAttribute('aria-invalid');
        err.textContent = '';
      }
    }
  };

  const revalidate = (e) => {
    if (!submitted) return;
    const name = e.target.name;
    if (FIELDS.includes(name)) show(validateBooking(values()), name);
  };
  form.addEventListener('input', revalidate);
  form.addEventListener('change', revalidate);
  form.addEventListener('focusout', revalidate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitted = true;
    const v = values();
    const errors = validateBooking(v);
    show(errors);
    const first = FIELDS.find((f) => errors[f]);
    if (first) {
      form.elements.namedItem(first).focus();
      return;
    }
    const firstName = v.name.trim().split(/\s+/)[0];
    heading.textContent = `Thank you, ${firstName}. This is a demonstration, so nothing was sent.`;
    form.hidden = true;
    success.hidden = false;
    heading.focus();
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    submitted = false;
    show({});
    success.hidden = true;
    heading.textContent = '';
    form.hidden = false;
    form.elements.namedItem('name').focus();
  });
}
