import { describe, it, expect } from 'vitest';
import { validateBooking, minBookingDate, maxBookingDate, toISODate } from '../../src/lib/validate.js';

const TODAY = new Date(2026, 0, 15); // 15 Jan 2026, local
const valid = {
  name: 'Napat Srisuk',
  email: 'napat@example.com',
  phone: '+66 81 234 5678',
  unit: '2br',
  date: '2026-01-20',
};

describe('validateBooking', () => {
  it('accepts valid values', () => {
    expect(validateBooking(valid, TODAY)).toEqual({});
  });

  it('reports every empty field', () => {
    const errors = validateBooking({}, TODAY);
    expect(Object.keys(errors).sort()).toEqual(['date', 'email', 'name', 'phone', 'unit']);
    expect(errors.name).toBe('Enter your full name.');
    expect(errors.email).toBe('Enter a valid email address.');
  });

  it('checks name length', () => {
    expect(validateBooking({ ...valid, name: 'A' }, TODAY).name).toBeDefined();
    expect(validateBooking({ ...valid, name: 'x'.repeat(81) }, TODAY).name).toBeDefined();
  });

  it('checks email shape', () => {
    expect(validateBooking({ ...valid, email: 'napat@' }, TODAY).email).toBeDefined();
    expect(validateBooking({ ...valid, email: 'na pat@example.com' }, TODAY).email).toBeDefined();
  });

  it('checks phone characters and digit count', () => {
    expect(validateBooking({ ...valid, phone: '1234567' }, TODAY).phone).toBeDefined();
    expect(validateBooking({ ...valid, phone: '12345678901234567' }, TODAY).phone).toBeDefined();
    expect(validateBooking({ ...valid, phone: '081-234-5678' }, TODAY).phone).toBeUndefined();
    expect(validateBooking({ ...valid, phone: '081 234 abc' }, TODAY).phone).toBeDefined();
  });

  it('checks residence type', () => {
    expect(validateBooking({ ...valid, unit: 'studio' }, TODAY).unit).toBe('Choose a residence type.');
  });

  it('checks the date window', () => {
    expect(validateBooking({ ...valid, date: '2026-01-15' }, TODAY).date).toBe('Choose a date from tomorrow onward.');
    expect(validateBooking({ ...valid, date: '2026-01-16' }, TODAY).date).toBeUndefined();
    expect(validateBooking({ ...valid, date: maxBookingDate(TODAY) }, TODAY).date).toBeUndefined();
    expect(validateBooking({ ...valid, date: '2026-12-31' }, TODAY).date).toMatch(/within the next 180 days/);
    expect(validateBooking({ ...valid, date: '2026-02-30' }, TODAY).date).toBeDefined();
  });
});

describe('date helpers', () => {
  it('formats local dates', () => {
    expect(toISODate(TODAY)).toBe('2026-01-15');
    expect(minBookingDate(TODAY)).toBe('2026-01-16');
  });
});
