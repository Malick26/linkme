import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { CrmContact, CrmSegment } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { BRAND_NAME } from '../../core/config/brand';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { formatDate, formatShortDate } from '../referral/rates';
import { AdminTabsComponent } from './admin-tabs.component';

const SEGMENTS: readonly CrmSegment[] = ['prospects', 'never_subscribed', 'expiring_soon', 'expired', 'active'];

/** Lien de chaque modèle de message : ce que le contact doit faire ensuite. */
const LINK_PATH: Record<CrmSegment, string> = {
  prospects: '/register', never_subscribed: '/app/abonnement', expiring_soon: '/app/abonnement', expired: '/app/abonnement', active: '/app',
};

/**
 * Numéro pour wa.me (chiffres seulement, indicatif compris). Un numéro sénégalais saisi sans indicatif
 * (9 chiffres commençant par 7) reçoit +221 ; les autres sont pris tels quels (D63).
 */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!phone.trim().startsWith('+') && /^7\d{8}$/.test(digits)) return `221${digits}`;
  return digits.length >= 8 ? digits : null;
}

/**
 * CRM (D60–D63) : contacts par segment, message modèle, WhatsApp par lien wa.me pré-rempli (l'admin appuie sur
 * Envoyer ; l'ouverture est notée comme relance), email groupé envoyé par le serveur avec lien de désinscription.
 */
@Component({
  selector: 'app-admin-crm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent, AdminTabsComponent],
  template: `
    <div class="ed-page ed-stack">
      <app-admin-tabs />
      <h1>{{ 'crm.title' | t }}</h1>
      <p class="ed-muted">{{ 'crm.text' | t }}</p>
      <p class="ed-muted">{{ 'crm.joinLink' | t: { url: origin + '/rejoindre' } }}</p>

      <div class="ed-seg" role="group">
        @for (s of segments; track s) {
          <button type="button" [attr.aria-pressed]="segment() === s" (click)="pick(s)">{{ segKey(s) | t }}</button>
        }
      </div>

      <section class="ed-card ed-stack">
        <h2>{{ 'crm.messageTitle' | t }}</h2>
        <label class="ed-field"><span>{{ 'crm.subject' | t }}</span>
          <input [value]="subject()" (input)="subject.set($any($event.target).value)" maxlength="150" data-testid="crm-subject" />
        </label>
        <label class="ed-field"><span>{{ 'crm.body' | t }}</span>
          <textarea rows="4" [value]="body()" (input)="editBody($any($event.target).value)" maxlength="5000" aria-describedby="crm-body-hint" data-testid="crm-body"></textarea>
        </label>
        <p id="crm-body-hint" class="ed-muted">{{ 'crm.bodyHint' | t }}</p>
        @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }
        @if (result()) { <p class="ed-success" role="status">{{ result() }}</p> }
        <button type="button" class="ed-btn self-start" [class.ed-btn--primary]="confirming()" [disabled]="sending() || !emailable() || !subject().trim() || !body().trim()"
                (click)="sendEmails()" data-testid="crm-send">
          <lm-icon name="mail" [size]="18" />
          {{ (confirming() ? 'crm.confirmSend' : 'crm.sendEmails') | t: { n: emailable() } }}
        </button>
      </section>

      <section class="ed-card ed-stack">
        @if (contacts.value(); as list) {
          <p class="ed-muted">{{ 'crm.count' | t: { n: list.length } }}</p>
          @if (!list.length) { <p class="ed-muted">{{ 'crm.empty' | t }}</p> }
          <ul class="list" role="list">
            @for (c of list; track c.id) {
              <li class="row" [attr.data-testid]="'contact-' + (c.handle ?? c.email ?? c.phone)">
                <span class="row__main">
                  <strong>{{ c.name || '—' }}</strong>@if (c.handle) { <span class="ed-muted">&#64;{{ c.handle }}</span> }
                  <span class="ed-muted small">{{ c.email ?? '' }}@if (c.email && c.phone) { · }{{ c.phone ?? '' }}</span>
                  <span class="ed-muted small">
                    @if (c.subscriptionExpiresAt && segment() !== 'prospects') { {{ 'crm.expires' | t: { date: short(c.subscriptionExpiresAt) } }} · }
                    {{ c.lastContactedAt ? ('crm.lastContact' | t: { date: short(c.lastContactedAt) }) : ('crm.neverContacted' | t) }}
                  </span>
                </span>
                @if (c.optedOut) {
                  <span class="ed-chip ed-chip--bad">{{ 'crm.optedOut' | t }}</span>
                } @else if (waLink(c); as href) {
                  <a class="ed-btn" [href]="href" target="_blank" rel="noopener" (click)="logWhatsapp(c)"><lm-icon name="brand-whatsapp" [size]="18" />{{ 'crm.whatsapp' | t }}</a>
                } @else {
                  <span class="ed-muted small">{{ 'crm.noPhone' | t }}</span>
                }
              </li>
            }
          </ul>
        } @else if (contacts.error()) {
          <p class="ed-error" role="alert">{{ 'common.error' | t }}</p>
        } @else {
          <p class="ed-muted" role="status">{{ 'common.loading' | t }}</p>
        }
      </section>
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    h2 { margin: 0; font-size: 18px; }
    .self-start { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; }
    .ed-seg button { min-height: 44px; }
    .list { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 12px 0; border-bottom: 1px solid var(--ed-border); }
    .row:last-child { border-bottom: 0; }
    .row__main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 220px; min-width: 0; overflow-wrap: anywhere; }
    .small { font-size: 13px; }
    a.ed-btn { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
  `,
})
export class AdminCrmComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly origin = typeof location !== 'undefined' ? location.origin : '';
  protected readonly segments = SEGMENTS;
  protected readonly segment = signal<CrmSegment>('prospects');
  protected readonly contacts = rxResource({ params: () => this.segment(), stream: ({ params }) => this.api.adminCrmContacts(params) });
  protected readonly subject = signal(BRAND_NAME);
  protected readonly body = signal(this.template('prospects'));
  private bodyEdited = false;
  protected readonly confirming = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal('');
  protected readonly short = formatShortDate;
  protected readonly date = formatDate;

  protected readonly emailable = computed(() => (this.contacts.value() ?? []).filter((c) => c.email && !c.optedOut).length);

  protected segKey(s: CrmSegment): I18nKey {
    return `crm.segment.${s}` as I18nKey;
  }

  /** Modèle du segment : {brand} et {lien} remplis ici, {nom} laissé pour chaque contact. */
  private template(s: CrmSegment): string {
    return this.i18n.t(`crm.template.${s}` as I18nKey, { brand: BRAND_NAME, lien: this.origin + LINK_PATH[s] });
  }

  protected pick(s: CrmSegment): void {
    this.segment.set(s);
    this.confirming.set(false);
    this.result.set('');
    if (!this.bodyEdited) this.body.set(this.template(s));
  }

  protected editBody(v: string): void {
    this.bodyEdited = true;
    this.body.set(v);
    this.confirming.set(false);
  }

  protected waLink(c: CrmContact): string | null {
    const n = waNumber(c.phone);
    if (!n) return null;
    const text = c.name ? this.body().replace(/\{nom}/g, c.name) : this.body().replace(/[ \t]*\{nom}/g, '');
    return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
  }

  protected logWhatsapp(c: CrmContact): void {
    // l'ouverture de WhatsApp vaut relance : notée en arrière-plan, sans bloquer le lien
    void this.auth.ensureCsrf().then(() => firstValueFrom(this.api.adminCrmLog(c.kind, c.id, 'whatsapp'))).then(
      () => this.contacts.update((list) => list?.map((x) => (x.id === c.id ? { ...x, lastContactedAt: new Date().toISOString() } : x))),
      () => undefined,
    );
  }

  protected async sendEmails(): Promise<void> {
    if (!this.confirming()) {
      this.confirming.set(true);
      return;
    }
    this.sending.set(true);
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      const r = await firstValueFrom(this.api.adminCrmEmail({ segment: this.segment(), subject: this.subject().trim(), body: this.body().trim() }));
      this.result.set(this.i18n.t('crm.sent', { sent: r.sent, skipped: r.skipped }));
      this.contacts.reload();
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.sending.set(false);
      this.confirming.set(false);
    }
  }
}
