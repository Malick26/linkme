import { Injectable, Pipe, PipeTransform, inject, signal } from '@angular/core';
import { Dict, I18nKey, fr } from './fr';

export type Lang = 'fr' | 'en';
/** FR = dictionnaire initial, complété par celui de l'éditeur quand son chunk est chargé. */
const FR: Partial<Dict> = { ...fr };
const DICTS: Partial<Record<Lang, Partial<Dict>>> = { fr: FR };

/** Appelé une fois par un chunk différé (éditeur, pages /rejoindre et /desinscription) pour ajouter ses textes. */
export function registerDictionary(extra: Partial<Dict>): void {
  Object.assign(FR, extra);
}

export function interpolate(s: string, params?: Record<string, string | number>): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => (params[k] ?? `{${k}}`).toString());
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>('fr');

  t(key: I18nKey, params?: Record<string, string | number>): string {
    return interpolate((DICTS[this.lang()] ?? FR)[key] ?? FR[key] ?? key, params);
  }

  /** Change de langue ; le dictionnaire EN est chargé à la demande (hors bundle initial). */
  async use(lang: Lang): Promise<void> {
    if (!DICTS[lang] && lang === 'en') DICTS.en = (await import('./en')).en;
    this.lang.set(lang);
  }

  /** Message utilisateur pour un code d'erreur API (repli : message générique). */
  error(code: string | undefined): string {
    const key = `error.${code}` as I18nKey;
    return code && key in FR ? this.t(key) : this.t('common.error');
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
