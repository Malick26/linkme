import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { en } from './en';
import { Dict, I18nKey, fr } from './fr';

export type Lang = 'fr' | 'en';
const DICTS: Record<Lang, Dict> = { fr, en };

export function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] ?? `{${k}}`).toString());
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>('fr');

  t(key: I18nKey, params?: Record<string, string | number>): string {
    return interpolate(DICTS[this.lang()][key] ?? fr[key] ?? key, params);
  }

  /** Message utilisateur pour un code d'erreur API (repli : message générique). */
  error(code: string | undefined): string {
    const key = `error.${code}` as I18nKey;
    return code && key in fr ? this.t(key) : this.t('common.error');
  }
}

/** `{{ 'public.myLinks' | t }}` — pure=false car dépend du signal de langue (coût négligeable). */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(key: I18nKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
