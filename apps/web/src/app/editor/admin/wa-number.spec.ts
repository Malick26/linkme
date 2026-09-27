import { describe, expect, it } from 'vitest';
import { waNumber } from './admin-crm.component';

describe('waNumber (liens wa.me du CRM, D63)', () => {
  it('garde l’indicatif fourni', () => {
    expect(waNumber('+221771234567')).toBe('221771234567');
    expect(waNumber('+33 6 12 34 56 78')).toBe('33612345678');
  });
  it('ajoute +221 à un numéro sénégalais saisi sans indicatif', () => {
    expect(waNumber('77 123 45 67')).toBe('221771234567');
    expect(waNumber('701112233')).toBe('221701112233');
  });
  it('refuse un numéro vide ou trop court', () => {
    expect(waNumber(null)).toBeNull();
    expect(waNumber('')).toBeNull();
    expect(waNumber('12345')).toBeNull();
  });
});
