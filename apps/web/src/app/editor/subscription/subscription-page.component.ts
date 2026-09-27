import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { Plan, PromoQuote, SubscriptionPaymentView } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { formatXof } from '../../core/format/compact-number';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';

/** « (77) 123-45-67 » → « 771234567 » : mêmes règles que le formulaire de contact public. */
function normalizePhone(raw: string): string {
  const s = raw.trim();
  const plus = s.startsWith('+') ? '+' : '';
  return plus + s.replace(/\D/g, '');
}

function phoneValid(raw: string): boolean {
  const digits = normalizePhone(raw).replace(/\D/g, '').length;
  return digits >= 8 && digits <= 15;
}

/**
 * Abonnement obligatoire pour la visibilité publique (D44/D45/D46) : plus de plan gratuit publiable — l'édition
 * reste libre, seule la page publique exige un abonnement actif. Pas de prélèvement récurrent : on paie une
 * période de 30 jours, à renouveler soi-même (rappels WhatsApp/email : phase ultérieure).
 */
@Component({
  selector: 'app-subscription-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, RouterLink, IconComponent],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'subscription.title' | t }}</h1>

      @if (reference()) {
        <!-- Retour du fournisseur de paiement -->
        <section class="ed-card ed-stack">
          @switch (payment.value()?.status) {
            @case ('PAID') { <p class="ed-ok" role="status"><lm-icon name="circle-check" [size]="20" />{{ 'subscription.paymentPaid' | t }}</p> }
            @case ('FAILED') { <p class="ed-error" role="alert">{{ 'subscription.paymentFailed' | t }}</p> }
            @case ('CANCELED') { <p class="ed-error" role="alert">{{ 'subscription.paymentCanceled' | t }}</p> }
            @default { <p class="ed-muted" role="status">{{ 'subscription.paymentPending' | t }}</p> }
          }
          <a class="ed-btn ed-btn--primary" routerLink="/app">{{ 'subscription.backToApp' | t }}</a>
        </section>
      } @else {
        <section class="ed-card ed-stack">
          <h2>{{ 'subscription.currentPlan' | t }}</h2>
          @if (status.value(); as st) {
            @if (st.status === 'active') {
              <p class="ed-ok">{{ (st.plan === 'boutique' ? 'subscription.boutiqueName' : 'subscription.standardName') | t }} —
                {{ 'subscription.statusActiveUntil' | t: { date: fmtDate(st.expiresAt) } }}</p>
            } @else if (st.status === 'expired') {
              <p class="ed-error">{{ 'subscription.statusExpired' | t }}</p>
            } @else {
              <p class="ed-muted">{{ 'subscription.statusInactive' | t }}</p>
            }
          }
        </section>

        <section class="ed-card ed-stack">
          <h2>{{ 'subscription.choosePlan' | t }}</h2>
          <div class="plans">
            @for (p of plans.value(); track p.plan) {
              <button type="button" class="plan" [class.plan--on]="selected() === p.plan" (click)="selected.set(p.plan)">
                <strong>{{ (p.plan === 'boutique' ? 'subscription.boutiqueName' : 'subscription.standardName') | t }}</strong>
                <span class="plan__price">{{ fmt(p.priceXof) }} <small>{{ 'subscription.perMonth' | t }}</small></span>
                <span class="ed-muted">{{ (p.plan === 'boutique' ? 'subscription.boutiqueDesc' : 'subscription.standardDesc') | t }}</span>
              </button>
            }
          </div>

          <div class="promo">
            @if (promo(); as q) {
              <p class="ed-ok promo__ok" role="status" data-testid="promo-applied">
                <lm-icon name="circle-check" [size]="18" />
                {{ q.finalPriceXof === 0 ? ('subscription.promoFree' | t) : ('subscription.promoApplied' | t: { pct: q.percentOff, final: fmt(q.finalPriceXof), price: fmt(q.priceXof) }) }}
                <button type="button" class="ed-btn ed-btn--ghost" (click)="clearPromo()">{{ 'subscription.promoRemove' | t }}</button>
              </p>
            } @else {
              <form class="promo__row" (submit)="$event.preventDefault(); applyPromo()">
                <label class="ed-field promo__field">
                  <span>{{ 'subscription.promoLabel' | t }} <small>({{ 'common.optional' | t }})</small></span>
                  <input [value]="promoInput()" (input)="promoInput.set($any($event.target).value)" autocapitalize="characters" spellcheck="false" maxlength="24" />
                </label>
                <button type="submit" class="ed-btn" [disabled]="!promoInput().trim() || promoBusy()">{{ 'subscription.promoApply' | t }}</button>
              </form>
              @if (promoError()) { <p class="ed-error" role="alert">{{ promoError() }}</p> }
            }
          </div>

          <label class="ed-field">
            <span>{{ 'subscription.phoneLabel' | t }}</span>
            <input type="tel" [value]="phone()" (input)="phone.set($any($event.target).value)" [attr.aria-describedby]="'sub-phone-hint'" />
          </label>
          <p id="sub-phone-hint" class="ed-muted">{{ 'subscription.phoneHint' | t }}</p>

          @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }

          <button type="button" class="ed-btn ed-btn--primary" [disabled]="!canPay() || busy()" (click)="pay()">
            {{ (busy() ? 'subscription.redirecting' : promo()?.finalPriceXof === 0 ? 'subscription.activateFree' : 'subscription.payCta') | t }}
          </button>
        </section>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .ed-ok { display: flex; align-items: center; gap: 8px; color: var(--ed-success); font-weight: 600; }
    .plans { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .plan {
      display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 16px; border-radius: 14px;
      border: 2px solid var(--ed-border); background: var(--ed-panel); cursor: pointer; min-height: 44px;
    }
    .plan--on { border-color: var(--ed-accent); }
    .plan__price { font-size: 20px; font-weight: 700; }
    .promo__row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .promo__field { flex: 1 1 200px; }
    .promo__ok { flex-wrap: wrap; }
    .plan__price small { font-size: 13px; font-weight: 400; color: var(--ed-muted); }
  `,
})
export class SubscriptionPageComponent {
  protected readonly auth = inject(AuthStore);
  private readonly api = inject(MeApi);
  private readonly i18n = inject(I18n);

  readonly reference = input<string | undefined>(undefined);

  protected readonly plans = rxResource({ stream: () => this.api.plans() });
  protected readonly status = rxResource({ stream: () => this.api.subscription() });
  protected readonly payment = rxResource<SubscriptionPaymentView, string | undefined>({
    params: () => this.reference(),
    stream: ({ params }) => this.api.subscriptionPayment(params!),
  });

  protected readonly selected = signal<Plan>('standard');
  protected readonly phone = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly fmt = formatXof;

  protected readonly canPay = computed(() => phoneValid(this.phone()));

  // code promo (D59) : vérifié par l'API pour le plan choisi, jamais appliqué en silence
  protected readonly promoInput = signal('');
  protected readonly promo = signal<PromoQuote | null>(null);
  protected readonly promoBusy = signal(false);
  protected readonly promoError = signal('');

  constructor() {
    // changer de plan après avoir appliqué un code : on recalcule le prix pour le nouveau plan
    effect(() => {
      const plan = this.selected();
      const q = untracked(this.promo);
      if (q && q.plan !== plan) void this.applyPromo(q.code);
    });
  }

  protected async applyPromo(code = this.promoInput().trim()): Promise<void> {
    if (!code) return;
    this.promoBusy.set(true);
    this.promoError.set('');
    try {
      this.promo.set(await firstValueFrom(this.api.quotePromo(code, this.selected())));
    } catch (e) {
      this.promo.set(null);
      this.promoError.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.promoBusy.set(false);
    }
  }

  protected clearPromo(): void {
    this.promo.set(null);
    this.promoInput.set('');
  }

  protected fmtDate(iso: string | null | undefined): string {
    return iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }

  protected async pay(): Promise<void> {
    if (!phoneValid(this.phone())) {
      this.error.set(this.i18n.t('subscription.phoneInvalid'));
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      const promoCode = this.promo()?.code;
      const res = await firstValueFrom(this.api.checkoutSubscription({ plan: this.selected(), phone: normalizePhone(this.phone()), ...(promoCode ? { promoCode } : {}) }));
      // abonnement offert (code à 100 %) : déjà actif, pas de page de paiement
      location.href = res.paymentUrl ?? `/app/abonnement/${res.reference}`;
    } catch (e) {
      this.busy.set(false);
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }
}
