import type { AbstractControl, ValidationErrors } from '@angular/forms';

/**
 * Numéro tel que les gens l'écrivent : « 77-123-45-67 », « (221) 77 123 45 67 », « +221.77.123.45.67 ».
 * On ne garde que l'indicatif éventuel et les chiffres — c'est ce qui part à l'API.
 */
export function normalizePhone(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/\D/g, '');
}

/** Séparateurs courants acceptés ; 8 à 15 chiffres (E.164). Un champ vide est valide (il est facultatif). */
export function phoneValidator(c: AbstractControl): ValidationErrors | null {
  const raw = String(c.value ?? '').trim();
  if (!raw) return null;
  if (/[^\d\s().+-]/.test(raw)) return { phone: true };
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? null : { phone: true };
}
