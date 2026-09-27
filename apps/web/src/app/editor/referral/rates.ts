import type { WithdrawalMethod } from '../../core/api/types';

/** 2000 points de base → « 20 % » (taux en entiers côté API, jamais de flottant pour l'argent — règle 6). */
export function formatRate(bps: number): string {
  const pct = bps / 100;
  // espace insécable : « 20 % » ne se coupe jamais en fin de ligne
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1).replace('.', ',')}\u00a0%`;
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

export function formatShortDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
}

/** Mêmes règles que le back ({@code Phones}) : on garde l'indicatif « + » et les chiffres. */
export function normalizePhone(raw: string): string {
  const s = raw.trim();
  return (s.startsWith('+') ? '+' : '') + s.replace(/\D/g, '');
}

export function phoneValid(raw: string): boolean {
  const n = normalizePhone(raw).replace(/\D/g, '').length;
  return n >= 8 && n <= 15;
}

export const WITHDRAWAL_METHODS: readonly WithdrawalMethod[] = ['wave', 'orange_money', 'free_money'];
