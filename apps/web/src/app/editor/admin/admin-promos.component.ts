import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MeApi } from '../../core/api/me-api.service';
import type { AdminPromoCode } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { formatDate } from '../referral/rates';
import { AdminTabsComponent } from './admin-tabs.component';

/** Codes promo sur les abonnements (D59) : création (%, usages, échéance), suivi des usages, désactivation. */
@Component({
  selector: 'app-admin-promos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, AdminTabsComponent],
  template: `
    <div class="ed-page ed-stack">
      <app-admin-tabs />
      <h1>{{ 'promos.title' | t }}</h1>
      <p class="ed-muted">{{ 'promos.text' | t }}</p>

      <section class="ed-card ed-stack">
        <h2>{{ 'promos.new' | t }}</h2>
        <form class="ed-stack" (submit)="$event.preventDefault(); create()" novalidate>
          <div class="ed-grid2">
            <label class="ed-field" [class.invalid]="field() === 'code'">
              <span>{{ 'promos.code' | t }}</span>
              <input [value]="code()" (input)="code.set($any($event.target).value.toUpperCase())" maxlength="24" autocapitalize="characters"
                     spellcheck="false" aria-describedby="promo-code-hint" data-testid="promo-code" />
            </label>
            <label class="ed-field" [class.invalid]="field() === 'percentOff'">
              <span>{{ 'promos.percent' | t }}</span>
              <input type="number" min="1" max="100" step="1" [value]="percent()" (input)="percent.set(+$any($event.target).value)" />
            </label>
            <label class="ed-field" [class.invalid]="field() === 'maxUses'">
              <span>{{ 'promos.maxUses' | t }}</span>
              <input type="number" min="1" max="100000" step="1" [value]="maxUses()" (input)="maxUses.set(+$any($event.target).value)" />
            </label>
            <label class="ed-field" [class.invalid]="field() === 'validUntil'">
              <span>{{ 'promos.validUntil' | t }} <small>({{ 'common.optional' | t }})</small></span>
              <input type="date" [value]="until()" (input)="until.set($any($event.target).value)" />
            </label>
          </div>
          <p id="promo-code-hint" class="ed-muted">{{ 'promos.codeHint' | t }}</p>
          @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }
          @if (done()) { <p class="ed-success" role="status">{{ done() }}</p> }
          <button type="submit" class="ed-btn ed-btn--primary self-start" [disabled]="busy() || !validCode()">{{ 'promos.create' | t }}</button>
        </form>
      </section>

      <section class="ed-card ed-stack">
        @if (list.value(); as items) {
          @if (!items.length) { <p class="ed-muted">{{ 'promos.empty' | t }}</p> }
          <ul class="list" role="list">
            @for (p of items; track p.id) {
              <li class="row">
                <span class="row__main"><strong class="mono">{{ p.code }}</strong>
                  <span class="ed-muted">−{{ p.percentOff }} % · {{ 'promos.uses' | t: { used: p.usesCount, max: p.maxUses } }} ·
                    {{ p.validUntil ? ('promos.until' | t: { date: date(p.validUntil) }) : ('promos.noEnd' | t) }}</span>
                </span>
                <span class="ed-chip" [class.ed-chip--ok]="state(p) === 'promos.active'" [class.ed-chip--bad]="state(p) !== 'promos.active'">{{ state(p) | t }}</span>
                @if (p.active) {
                  <button type="button" class="ed-btn ed-btn--danger" (click)="deactivate(p)">{{ 'promos.deactivate' | t }}</button>
                }
              </li>
            }
          </ul>
        } @else if (list.error()) {
          <p class="ed-error" role="alert">{{ 'common.error' | t }}</p>
        }
      </section>
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    h2 { margin: 0; font-size: 18px; }
    .self-start { align-self: flex-start; }
    .mono { font-family: ui-monospace, monospace; letter-spacing: 0.04em; }
    .list { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 12px 0; border-bottom: 1px solid var(--ed-border); }
    .row:last-child { border-bottom: 0; }
    .row__main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 220px; min-width: 0; }
  `,
})
export class AdminPromosComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly list = rxResource({ stream: () => this.api.adminPromoCodes() });
  protected readonly code = signal('');
  protected readonly percent = signal(20);
  protected readonly maxUses = signal(100);
  protected readonly until = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly field = signal<string | null>(null);
  protected readonly done = signal('');
  protected readonly date = formatDate;

  protected validCode(): boolean {
    return /^[A-Z0-9_-]{3,24}$/.test(this.code().trim());
  }

  protected state(p: AdminPromoCode): I18nKey {
    if (!p.active) return 'promos.inactive';
    if (p.validUntil && Date.parse(p.validUntil) <= Date.now()) return 'promos.expired';
    if (p.usesCount >= p.maxUses) return 'promos.exhausted';
    return 'promos.active';
  }

  protected async create(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.field.set(null);
    this.done.set('');
    try {
      await this.auth.ensureCsrf();
      const created = await firstValueFrom(this.api.adminCreatePromoCode({
        code: this.code().trim(), percentOff: Math.round(this.percent()), maxUses: Math.round(this.maxUses()),
        ...(this.until() ? { validUntil: new Date(`${this.until()}T23:59:59Z`).toISOString() } : {}),
      }));
      this.done.set(this.i18n.t('promos.created', { code: created.code }));
      this.code.set('');
      this.list.reload();
    } catch (e) {
      const p = toProblem(e);
      this.field.set(p.errors?.[0]?.field ?? null);
      this.error.set(p.errors?.[0]?.message ?? this.i18n.error(p.code));
    } finally {
      this.busy.set(false);
    }
  }

  protected async deactivate(p: AdminPromoCode): Promise<void> {
    try {
      await this.auth.ensureCsrf();
      await firstValueFrom(this.api.adminDeactivatePromoCode(p.id));
      this.list.reload();
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }
}
