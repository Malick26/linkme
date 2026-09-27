import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { AdminReferrer, AdminWithdrawal, WithdrawalMethod, WithdrawalStatus } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { formatXof } from '../../core/format/compact-number';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { formatDate, formatRate } from '../referral/rates';

/**
 * Espace admin minimal (D56) : file des retraits à envoyer à la main (numéro complet + signaux anti-fraude),
 * décision « payé » (référence Wave/OM) ou « refusé » (motif, recrédit automatique), et collabs négociées (D52).
 */
@Component({
  selector: 'app-admin-withdrawals',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent],
  template: `
    <div class="ed-page ed-stack">
      <h1>{{ 'admin.title' | t }}</h1>
      <div class="ed-seg" role="group">
        <button type="button" [attr.aria-pressed]="filter() === 'REQUESTED'" (click)="filter.set('REQUESTED')">{{ 'admin.filter.todo' | t }}</button>
        <button type="button" [attr.aria-pressed]="filter() === undefined" (click)="filter.set(undefined)">{{ 'admin.filter.all' | t }}</button>
      </div>
      @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }

      @if (list.value(); as items) {
        @if (!items.length) { <p class="ed-muted">{{ 'admin.empty' | t }}</p> }
        @for (w of items; track w.id) {
          <article class="ed-card ed-stack" [attr.data-testid]="'withdrawal-' + w.id">
            <div class="head">
              <div class="head__who">
                <strong>{{ w.creator.displayName }}</strong>
                <span class="ed-muted">&#64;{{ w.creator.handle }} · {{ w.creator.email }}</span>
              </div>
              <span class="ed-chip" [class.ed-chip--ok]="w.status === 'PAID'" [class.ed-chip--bad]="w.status === 'REJECTED'" [class.ed-chip--warn]="w.status === 'REQUESTED'">{{ statusKey(w.status) | t }}</span>
            </div>
            <p class="amount">{{ 'admin.sendTo' | t: { amount: fmt(w.amountXof), method: (methodKey(w.method) | t) } }}</p>
            <div class="ed-row">
              <span class="mono phone">{{ w.phone }}</span>
              <button type="button" class="ed-btn ed-btn--icon" (click)="copy(w.phone)" [attr.aria-label]="'admin.copyPhone' | t"><lm-icon name="copy" [size]="18" /></button>
              <span class="ed-muted">{{ 'admin.requestedOn' | t: { date: date(w.createdAt) } }}</span>
            </div>
            <div class="ed-row">
              <span class="ed-chip">{{ 'admin.signal.referees' | t: { n: w.signals.referees, active: w.signals.activeReferees } }}</span>
              @if (w.signals.blockedSelfPayments > 0) {
                <span class="ed-chip ed-chip--bad"><lm-icon name="triangle-alert" [size]="14" />{{ 'admin.signal.selfPayments' | t: { n: w.signals.blockedSelfPayments } }}</span>
              }
              @if (w.signals.sameDayIpReferrals > 0) {
                <span class="ed-chip ed-chip--warn"><lm-icon name="triangle-alert" [size]="14" />{{ 'admin.signal.sameIp' | t: { n: w.signals.sameDayIpReferrals } }}</span>
              }
            </div>

            @if (w.status === 'REQUESTED') {
              <div class="decide">
                <label class="ed-field"><span>{{ 'admin.providerRef' | t }} <small>({{ 'common.optional' | t }})</small></span>
                  <input [value]="refs()[w.id] ?? ''" (input)="setRef(w.id, $any($event.target).value)" maxlength="128" />
                </label>
                <button type="button" class="ed-btn ed-btn--primary" [disabled]="busy() === w.id" (click)="pay(w)">{{ 'admin.markPaid' | t }}</button>
                <label class="ed-field"><span>{{ 'admin.rejectNote' | t }}</span>
                  <input [value]="notes()[w.id] ?? ''" (input)="setNote(w.id, $any($event.target).value)" maxlength="500" />
                </label>
                <button type="button" class="ed-btn ed-btn--danger" [disabled]="busy() === w.id || !(notes()[w.id] ?? '').trim()" (click)="reject(w)">{{ 'admin.reject' | t }}</button>
              </div>
            } @else {
              <p class="ed-muted">{{ 'admin.processedOn' | t: { date: date(w.processedAt) } }}@if (w.providerRef) { · <span class="mono">{{ w.providerRef }}</span> }@if (w.note) { · {{ w.note }} }</p>
            }
          </article>
        }
      } @else if (list.error()) {
        <p class="ed-error" role="alert">{{ errorOf(list.error()) }}</p>
      }

      <section class="ed-card ed-stack">
        <h2>{{ 'admin.collabTitle' | t }}</h2>
        <p class="ed-muted">{{ 'admin.collabText' | t }}</p>
        <form class="ed-row" (submit)="$event.preventDefault(); search()">
          <label class="ed-field grow"><span>{{ 'admin.collabHandle' | t }}</span>
            <input [value]="handle()" (input)="handle.set($any($event.target).value)" autocapitalize="none" spellcheck="false" />
          </label>
          <button type="submit" class="ed-btn">{{ 'admin.collabSearch' | t }}</button>
        </form>
        @if (referrer(); as r) {
          <div class="ed-stack">
            <p><strong>{{ r.displayName }}</strong> <span class="ed-muted">&#64;{{ r.handle }} · {{ r.code }}</span></p>
            <p class="ed-muted">{{ 'admin.collabStats' | t: { referees: r.referees, active: r.activeReferees, earned: fmt(r.totalEarnedXof) } }}</p>
            @if (r.collab; as c) {
              <p class="ed-chip ed-chip--ok self-start">{{ 'admin.collabActiveUntil' | t: { rate: rate(c.rateBps), date: date(c.expiresAt) } }}</p>
            } @else {
              <p class="ed-muted">{{ 'admin.collabNone' | t }} {{ 'admin.collabCurrent' | t: { rate: rate(r.effectiveRateBps) } }}</p>
            }
            <div class="ed-grid2">
              <label class="ed-field"><span>{{ 'admin.collabRate' | t }}</span>
                <input type="number" min="20" max="60" step="1" [value]="collabPct()" (input)="collabPct.set(+$any($event.target).value)" />
              </label>
              <label class="ed-field"><span>{{ 'admin.collabExpires' | t }}</span>
                <input type="date" [value]="collabUntil()" (input)="collabUntil.set($any($event.target).value)" />
              </label>
            </div>
            <div class="ed-row">
              <button type="button" class="ed-btn ed-btn--primary" [disabled]="!collabUntil()" (click)="saveCollab(r)">{{ 'admin.collabSave' | t }}</button>
              @if (r.collab) { <button type="button" class="ed-btn ed-btn--danger" (click)="endCollab(r)">{{ 'admin.collabEnd' | t }}</button> }
            </div>
            @if (collabMsg()) { <p class="ed-success" role="status">{{ collabMsg() }}</p> }
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    h2 { margin: 0; font-size: 18px; }
    .ed-seg button { min-height: 44px; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .head__who { display: flex; flex-direction: column; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
    .amount { margin: 0; font-size: 18px; font-weight: 700; }
    .phone { font-size: 16px; }
    .mono { font-family: ui-monospace, monospace; }
    .decide { display: grid; gap: 10px; grid-template-columns: 1fr; align-items: end; }
    @media (min-width: 720px) { .decide { grid-template-columns: 1fr auto; } }
    .grow { flex: 1 1 220px; }
    .self-start { align-self: flex-start; }
    .ed-chip { gap: 6px; }
  `,
})
export class AdminWithdrawalsComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly filter = signal<WithdrawalStatus | undefined>('REQUESTED');
  protected readonly list = rxResource<AdminWithdrawal[], WithdrawalStatus | 'ALL'>({
    params: () => this.filter() ?? 'ALL',
    stream: ({ params }) => this.api.adminWithdrawals(params === 'ALL' ? undefined : params),
  });
  protected readonly refs = signal<Record<string, string>>({});
  protected readonly notes = signal<Record<string, string>>({});
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly handle = signal('');
  protected readonly referrer = signal<AdminReferrer | null>(null);
  protected readonly collabPct = signal(40);
  protected readonly collabUntil = signal('');
  protected readonly collabMsg = signal('');
  protected readonly fmt = formatXof;
  protected readonly date = formatDate;
  protected readonly rate = formatRate;

  protected methodKey(m: WithdrawalMethod): I18nKey {
    return `wallet.method.${m}` as I18nKey;
  }

  protected statusKey(s: WithdrawalStatus): I18nKey {
    return `wallet.status.${s}` as I18nKey;
  }

  protected errorOf(e: unknown): string {
    return this.i18n.error(toProblem(e).code);
  }

  protected setRef(id: string, v: string): void {
    this.refs.update((m) => ({ ...m, [id]: v }));
  }

  protected setNote(id: string, v: string): void {
    this.notes.update((m) => ({ ...m, [id]: v }));
  }

  protected copy(v: string): void {
    void navigator.clipboard?.writeText(v).catch(() => undefined);
  }

  protected async pay(w: AdminWithdrawal): Promise<void> {
    await this.decide(w, () => this.api.adminPayWithdrawal(w.id, { providerRef: this.refs()[w.id]?.trim() || undefined }));
  }

  protected async reject(w: AdminWithdrawal): Promise<void> {
    await this.decide(w, () => this.api.adminRejectWithdrawal(w.id, { note: this.notes()[w.id]?.trim() }));
  }

  private async decide(w: AdminWithdrawal, call: () => import('rxjs').Observable<AdminWithdrawal>): Promise<void> {
    this.busy.set(w.id);
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      await firstValueFrom(call());
      this.list.reload();
    } catch (e) {
      this.error.set(this.errorOf(e));
    } finally {
      this.busy.set(null);
    }
  }

  protected async search(): Promise<void> {
    this.collabMsg.set('');
    this.error.set('');
    const h = this.handle().trim().toLowerCase();
    if (!h) return;
    try {
      this.referrer.set(await firstValueFrom(this.api.adminReferrer(h)));
    } catch (e) {
      this.referrer.set(null);
      this.error.set(this.errorOf(e));
    }
  }

  protected async saveCollab(r: AdminReferrer): Promise<void> {
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      // fin de journée (heure de Dakar = UTC) à la date choisie
      const expiresAt = new Date(`${this.collabUntil()}T23:59:59Z`).toISOString();
      this.referrer.set(await firstValueFrom(this.api.adminSetCollab(r.handle, { rateBps: Math.round(this.collabPct() * 100), expiresAt })));
      this.collabMsg.set(this.i18n.t('admin.collabSaved'));
    } catch (e) {
      const p = toProblem(e);
      this.error.set(p.errors?.[0]?.message ?? this.i18n.error(p.code));
    }
  }

  protected async endCollab(r: AdminReferrer): Promise<void> {
    try {
      await this.auth.ensureCsrf();
      this.referrer.set(await firstValueFrom(this.api.adminEndCollab(r.handle)));
    } catch (e) {
      this.error.set(this.errorOf(e));
    }
  }
}
