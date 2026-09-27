import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BrandLogoComponent } from '../../design-system';
import { MeApi } from '../core/api/me-api.service';
import { BRAND_NAME } from '../core/config/brand';
import { toProblem } from '../core/http/problem';
import { frSite } from '../core/i18n/fr-site';
import { I18n, TPipe, registerDictionary } from '../core/i18n/i18n.service';
import { SeoService } from '../core/seo/seo.service';

// textes de cette page : chargés avec elle, pas dans le bundle initial (D57)
registerDictionary(frSite);

function normalizePhone(raw: string): string {
  const s = raw.trim();
  return (s.startsWith('+') ? '+' : '') + s.replace(/\D/g, '');
}

/**
 * Inscription des prospects aux nouveautés (D61) : prénom, WhatsApp et/ou email, consentement explicite, champ
 * piège anti-robots. Réponse identique qu'on soit déjà inscrit ou non.
 */
@Component({
  selector: 'app-join',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, BrandLogoComponent],
  template: `
    <main class="jn">
      <a routerLink="/" class="jn__brand" [attr.aria-label]="brand"><lm-brand-logo /></a>
      <section class="jn__card">
        @if (done()) {
          <h1>{{ 'join.doneTitle' | t }}</h1>
          <p class="jn__lead" role="status">{{ 'join.doneText' | t }}</p>
          <a routerLink="/register" class="jn__btn jn__btn--primary">{{ 'join.createPage' | t }}</a>
          <a routerLink="/" class="jn__link">{{ 'join.home' | t }}</a>
        } @else {
          <span class="jn__badge">{{ 'join.badge' | t }}</span>
          <h1>{{ 'join.title' | t }}</h1>
          <p class="jn__lead">{{ 'join.lead' | t }}</p>
          <form class="jn__form" (submit)="$event.preventDefault(); submit()" novalidate>
            <label class="jn__field"><span>{{ 'join.name' | t }}</span>
              <input autocomplete="given-name" maxlength="60" [value]="name()" (input)="name.set($any($event.target).value)" />
            </label>
            <label class="jn__field" [class.invalid]="field() === 'phone'"><span>{{ 'join.phone' | t }}</span>
              <input type="tel" autocomplete="tel" maxlength="40" [value]="phone()" (input)="phone.set($any($event.target).value)"
                     aria-describedby="jn-phone-hint" [attr.aria-invalid]="field() === 'phone'" />
              <small id="jn-phone-hint">{{ 'join.phoneHint' | t }}</small>
            </label>
            <label class="jn__field" [class.invalid]="field() === 'email'"><span>{{ 'join.email' | t }}</span>
              <input type="email" autocomplete="email" maxlength="254" [value]="email()" (input)="email.set($any($event.target).value)"
                     [attr.aria-invalid]="field() === 'email'" />
            </label>
            <!-- piège à robots : invisible pour les humains et les lecteurs d'écran -->
            <input class="jn__trap" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"
                   [value]="website()" (input)="website.set($any($event.target).value)" />
            <label class="jn__check" [class.invalid]="field() === 'consent'">
              <input type="checkbox" [checked]="consent()" (change)="consent.set($any($event.target).checked)" />
              <span>{{ 'join.consent' | t: { brand } }}</span>
            </label>
            @if (error()) { <p class="jn__error" role="alert">{{ error() }}</p> }
            <button type="submit" class="jn__btn jn__btn--primary" [disabled]="busy()">{{ (busy() ? 'join.sending' : 'join.submit') | t }}</button>
          </form>
        }
      </section>
    </main>
  `,
  styleUrl: './join.component.scss',
})
export class JoinComponent {
  private readonly api = inject(MeApi);
  private readonly i18n = inject(I18n);
  protected readonly brand = BRAND_NAME;
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly website = signal('');
  protected readonly consent = signal(false);
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal('');
  protected readonly field = signal<string | null>(null);

  constructor() {
    inject(SeoService).set({ title: `${BRAND_NAME} — ${this.i18n.t('join.seoTitle')}`, description: this.i18n.t('join.lead'), path: '/rejoindre' });
  }

  private fail(field: string, key: 'join.needOne' | 'join.phoneInvalid' | 'join.emailInvalid' | 'join.consentRequired'): void {
    this.field.set(field);
    this.error.set(this.i18n.t(key));
  }

  protected async submit(): Promise<void> {
    this.field.set(null);
    this.error.set('');
    const email = this.email().trim();
    const phone = this.phone().trim();
    const digits = normalizePhone(phone).replace(/\D/g, '').length;
    if (!email && !phone) return this.fail('email', 'join.needOne');
    if (phone && (digits < 8 || digits > 15)) return this.fail('phone', 'join.phoneInvalid');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.fail('email', 'join.emailInvalid');
    if (!this.consent()) return this.fail('consent', 'join.consentRequired');
    this.busy.set(true);
    try {
      await firstValueFrom(this.api.joinProspects({
        consent: true,
        ...(this.name().trim() ? { name: this.name().trim() } : {}),
        ...(email ? { email } : {}),
        ...(phone ? { phone: normalizePhone(phone) } : {}),
        ...(this.website() ? { website: this.website() } : {}),
      }));
      this.done.set(true);
    } catch (e) {
      const p = toProblem(e);
      this.field.set(p.errors?.[0]?.field ?? null);
      this.error.set(p.errors?.[0]?.message ?? this.i18n.error(p.code));
    } finally {
      this.busy.set(false);
    }
  }
}
