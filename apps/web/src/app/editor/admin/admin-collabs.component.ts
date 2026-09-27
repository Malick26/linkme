import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MeApi } from '../../core/api/me-api.service';
import type { AdminCollab, AdminReferrer } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { formatXof } from '../../core/format/compact-number';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { formatDate, formatRate } from '../referral/rates';
import { AdminTabsComponent } from './admin-tabs.component';

/**
 * Collabs négociées (D52, D64) : liste complète (en cours, échéance la plus proche en tête, puis expirées), et
 * formulaire pour accorder / prolonger / terminer une collab (taux 20–60 %, date d'expiration).
 */
@Component({
  selector: 'app-admin-collabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, AdminTabsComponent],
  template: `
    <div class="ed-page ed-stack">
      <app-admin-tabs />
      <h1>{{ 'admin.collabTitle' | t }}</h1>
      <p class="ed-muted">{{ 'admin.collabText' | t }}</p>
      @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }

      <section class="ed-card ed-stack">
        <form class="ed-row" (submit)="$event.preventDefault(); search()">
          <label class="ed-field grow"><span>{{ 'admin.collabHandle' | t }}</span>
            <input [value]="handle()" (input)="handle.set($any($event.target).value)" autocapitalize="none" spellcheck="false" />
          </label>
          <button type="submit" class="ed-btn">{{ 'admin.collabSearch' | t }}</button>
        </form>
        @if (referrer(); as r) {
          <div class="ed-stack" data-testid="collab-editor">
            <p><strong>{{ r.displayName }}</strong><span class="ed-muted">&nbsp;&#64;{{ r.handle }} · {{ r.code }}</span></p>
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

      <section class="ed-card ed-stack">
        <h2>{{ 'collabs.listTitle' | t }}</h2>
        @if (list.value(); as items) {
          @if (!items.length) { <p class="ed-muted">{{ 'collabs.empty' | t }}</p> }
          <ul class="list" role="list">
            @for (c of items; track c.userId) {
              <li class="row" [class.row--off]="!c.active">
                <span class="row__main"><strong>{{ c.displayName }}</strong><span class="ed-muted">&#64;{{ c.handle }}</span>
                  <span class="ed-muted small">{{ 'admin.collabStats' | t: { referees: c.referees, active: c.activeReferees, earned: fmt(c.totalEarnedXof) } }}</span>
                </span>
                <span class="ed-chip" [class.ed-chip--ok]="c.active">{{ rate(c.rateBps) }} ·
                  {{ (c.active ? 'collabs.until' : 'collabs.endedOn') | t: { date: date(c.expiresAt) } }}</span>
                <button type="button" class="ed-btn" (click)="edit(c)">{{ 'common.edit' | t }}</button>
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
    .grow { flex: 1 1 220px; }
    .self-start { align-self: flex-start; }
    .list { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; padding: 12px 0; border-bottom: 1px solid var(--ed-border); }
    .row:last-child { border-bottom: 0; }
    .row--off { opacity: 0.7; }
    .row__main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 220px; min-width: 0; }
    .small { font-size: 13px; }
  `,
})
export class AdminCollabsComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly list = rxResource({ stream: () => this.api.adminCollabs() });
  protected readonly handle = signal('');
  protected readonly referrer = signal<AdminReferrer | null>(null);
  protected readonly collabPct = signal(40);
  protected readonly collabUntil = signal('');
  protected readonly collabMsg = signal('');
  protected readonly error = signal('');
  protected readonly fmt = formatXof;
  protected readonly rate = formatRate;
  protected readonly date = formatDate;

  protected async edit(c: AdminCollab): Promise<void> {
    this.handle.set(c.handle);
    this.collabPct.set(c.rateBps / 100);
    this.collabUntil.set(c.active ? c.expiresAt.slice(0, 10) : '');
    await this.search();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
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
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }

  protected async saveCollab(r: AdminReferrer): Promise<void> {
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      const expiresAt = new Date(`${this.collabUntil()}T23:59:59Z`).toISOString();
      this.referrer.set(await firstValueFrom(this.api.adminSetCollab(r.handle, { rateBps: Math.round(this.collabPct() * 100), expiresAt })));
      this.collabMsg.set(this.i18n.t('admin.collabSaved'));
      this.list.reload();
    } catch (e) {
      const p = toProblem(e);
      this.error.set(p.errors?.[0]?.message ?? this.i18n.error(p.code));
    }
  }

  protected async endCollab(r: AdminReferrer): Promise<void> {
    try {
      await this.auth.ensureCsrf();
      this.referrer.set(await firstValueFrom(this.api.adminEndCollab(r.handle)));
      this.list.reload();
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }
}
