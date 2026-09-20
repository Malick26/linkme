import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { normalizePhone, phoneValidator } from './contact-phone';

/**
 * Régression : un numéro écrit « comme dans la vraie vie » (tirets, points, parenthèses)
 * était refusé avec un message générique « Certains champs sont invalides ».
 */
describe('formulaire de contact — téléphone', () => {
  it.each([
    ['77-123-45-67', '771234567'],
    ['+221 77 123 45 67', '+221771234567'],
    ['(221) 77.123.45.67', '221771234567'],
    ['  77 123 45 67  ', '771234567'],
  ])('normalise « %s »', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it('laisse un champ vide vide', () => {
    expect(normalizePhone('   ')).toBe('');
  });

  const valid = (v: string) => phoneValidator(new FormControl(v)) === null;

  it.each(['', '77-123-45-67', '+221 77 123 45 67', '(221) 77.123.45.67', '771234567'])('accepte « %s »', (v) => {
    expect(valid(v)).toBe(true);
  });

  it.each(['77-12', '06 12 34 56 78 90 12 34 56', 'appelle-moi', '77 123 45 67 ext. 2'])('refuse « %s »', (v) => {
    expect(valid(v)).toBe(false);
  });
});
