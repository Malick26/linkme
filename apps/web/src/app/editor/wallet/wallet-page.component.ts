import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { Withdrawal, WithdrawalMethod } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { formatXof } from '../../core/format/compact-number';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { WITHDRAWAL_METHODS, formatDate, formatShortDate, normalizePhone, phoneValid } from '../referral/rates';

/**
 * Portefeuille (D55/D56) : solde retirable, gains gelés, demande de retrait (minimum 1 500 FCFA, une demande à la
 * fois) vers Wave / Orange Money / Free Money, envoyée à la main par l'équipe.
 */
@Component({
  selector: 'app-wallet-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, RouterLink, IconComponent],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'wallet.title' | t }}</h1>
      @if (wallet.value(); as w) {
        <div class="kpis">
          <div class="ed-card kpi kpi--main"><span class="ed-muted">{{ 'wallet.available' | t }}</span><strong data-testid="wallet-available">{{ fmt(w.availableXof) }}</strong></div>
          <div class="ed-card kpi">
            <span class="ed-muted">{{ 'wallet.held' | t }}</span><strong data-testid="wallet-held">{{ fmt(w.heldXof) }}</strong>
            @if (w.nextReleaseAt) { <small class="ed-muted">{{ 'wallet.heldHint' | t: { date: date(w.nextReleaseAt) } }}</small> }
          </div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'wallet.pending' | t }}</span><strong>{{ fmt(w.pendingWithdrawalXof) }}</strong></div>
          <div class="ed-card kpi"><span class="ed-muted">{{ 'wallet.withdrawn' | t }}</span><strong>{{ fmt(w.totalWithdrawnXof) }}</strong></div>
        </div>

        <section class="ed-card ed-stack">
          <h2>{{ 'wallet.withdrawTitle' | t }}</h2>
          @if (w.pendingWithdrawalXof > 0) {
            <p class="ed-muted" role="status"><lm-icon name="loader-circle" [size]="16" /> {{ 'wallet.pendingInfo' | t: { amount: fmt(w.pendingWithdrawalXof) } }}</p>
          } @else if (w.availableXof < w.minWithdrawalXof) {
            <p class="ed-muted">{{ 'wallet.belowMin' | t: { missing: fmt(w.minWithdrawalXof - w.availableXof), min: fmt(w.minWithdrawalXof) } }}</p>
            <a class="ed-btn link-btn" routerLink="/app/parrainage"><lm-icon name="gift" [size]="18" />{{ 'wallet.earnMore' | t }}</a>
          } @else {
            <form class="ed-stack" (submit)="$event.preventDefault(); submit()" novalidate>
              <label class="ed-field" [class.invalid]="fieldError() === 'amountXof'">
                <span>{{ 'wallet.amount' | t }}</span>
                <input type="number" inputmode="numeric" [min]="w.minWithdrawalXof" [max]="w.availableXof" step="1"
                       [value]="amount()" (input)="amount.set(+$any($event.target).value)" data-testid="withdraw-amount" />
              </label>
              <fieldset class="ed-field">
                <legend>{{ 'wallet.method' | t }}</legend>
                <div class="ed-seg" role="group">
                  @for (m of methods; track m) {
                    <button type="button" [attr.aria-pressed]="method() === m" (click)="method.set(m)">{{ methodKey(m) | t }}</button>
                  }
                </div>
              </fieldset>
              <label class="ed-field" [class.invalid]="fieldError() === 'phone'">
                <span>{{ 'wallet.phone' | t: { method: (methodKey(method()) | t) } }}</span>
                <input type="tel" autocomplete="tel" [value]="phone()" (input)="phone.set($any($event.target).value)" data-testid="withdraw-phone" />
              </label>
              @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }
              <button type="submit" class="ed-btn ed-btn--primary" [disabled]="busy() || !canSubmit()">
                {{ (busy() ? 'wallet.submitting' : 'wallet.submit') | t }}
              </button>
              <p class="ed-muted">{{ 'wallet.manualNote' | t }}</p>
            </form>
          }
          @if (done()) { <p class="ed-success" role="status">{{ 'wallet.requested' | t }}</p> }
        </section>

        <section class="ed-card ed-stack">
          <h2>{{ 'wallet.historyTitle' | t }}</h2>
          @if (!w.withdrawals.length) {
            <p class="ed-muted">{{ 'wallet.historyEmpty' | t }}</p>
          } @else {
            <ul class="list" role="list">
              @for (x of w.withdrawals; track x.id) {
                <li class="row">
                  <span class="row__main"><strong>{{ fmt(x.amountXof) }}</strong><span class="ed-muted">{{ methodKey(x.method) | t }} · <span class="mono">{{ x.maskedPhone }}</span></span></span>
                  <span class="ed-muted">{{ short(x.createdAt) }}</span>
                  <span class="ed-chip" [class.ed-chip--ok]="x.status === 'PAID'" [class.ed-chip--bad]="x.status === 'REJECTED'" [class.ed-chip--warn]="x.status === 'REQUESTED'">{{ statusKey(x) | t }}</span>
                  @if (x.status === 'REJECTED' && x.note) { <small class="ed-error row__full">{{ 'wallet.rejectedReason' | t: { note: x.note } }}</small> }
                </li>
              }
            </ul>
          }
        </section>
      } @else if (wallet.error()) {
        <p class="ed-error" role="alert">{{ 'common.error' | t }}</p>
      } @else {
        <p class="ed-muted" role="status">{{ 'common.loading' | t }}</p>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    h2 { margin: 0; font-size: 18px; }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .kpi { display: flex; flex-direction: column; gap: 4px; }
    .kpi strong { font-size: 22px; font-variant-numeric: tabular-nums; }
    .kpi--main strong { color: var(--ed-accent); }
    fieldset { border: 0; padding: 0; margin: 0; }
    legend { padding: 0; margin-bottom: 6px; }
    .ed-seg button { min-height: 44px; }
    .link-btn { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
    .list { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 12px 0; border-bottom: 1px solid var(--ed-border); }
    .row:last-child { border-bottom: 0; }
    .row__main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 180px; min-width: 0; }
    .row__full { flex-basis: 100%; }
    .mono { font-family: ui-monospace, monospace; font-size: 12px; }
  `,
})
export class WalletPageComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly wallet = rxResource({ stream: () => this.api.wallet() });
  protected readonly methods = WITHDRAWAL_METHODS;
  protected readonly amount = signal(0);
  protected readonly method = signal<WithdrawalMethod>('wave');
  protected readonly phone = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly fieldError = signal<string | null>(null);
  protected readonly done = signal(false);
  protected readonly fmt = formatXof;
  protected readonly date = formatDate;
  protected readonly short = formatShortDate;
  /** Une clé par tentative : un double-clic ou un rejeu réseau ne crée jamais deux retraits. */
  private idempotencyKey = newKey();

  protected readonly canSubmit = computed(() => {
    const w = this.wallet.value();
    return !!w && this.amount() >= w.minWithdrawalXof && this.amount() <= w.availableXof && phoneValid(this.phone());
  });

  constructor() {
    // montant proposé par défaut : tout le solde retirable
    effect(() => {
      const w = this.wallet.value();
      if (w && this.amount() === 0) this.amount.set(w.availableXof);
    });
  }

  protected methodKey(m: WithdrawalMethod): I18nKey {
    return `wallet.method.${m}` as I18nKey;
  }

  protected statusKey(x: Withdrawal): I18nKey {
    return `wallet.status.${x.status}` as I18nKey;
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set('');
    this.fieldError.set(null);
    try {
      await this.auth.ensureCsrf();
      await firstValueFrom(this.api.requestWithdrawal({
        amountXof: Math.floor(this.amount()), method: this.method(), phone: normalizePhone(this.phone()), idempotencyKey: this.idempotencyKey,
      }));
      this.idempotencyKey = newKey();
      this.done.set(true);
      this.amount.set(0);
      this.wallet.reload();
    } catch (e) {
      const p = toProblem(e);
      const field = p.errors?.[0];
      this.fieldError.set(field?.field ?? null);
      this.error.set(field?.message ?? this.i18n.error(p.code));
    } finally {
      this.busy.set(false);
    }
  }
}

function newKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
