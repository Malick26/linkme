import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MeApi } from '../../core/api/me-api.service';
import type { AdminAnnouncement, AnnouncementAudience, AnnouncementInput } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { formatShortDate } from '../referral/rates';
import { AdminTabsComponent } from './admin-tabs.component';

const AUDIENCES: readonly AnnouncementAudience[] = ['both', 'landing', 'dashboard'];

/** Annonces en pop-up (D65) : création / modification, public, période, bouton facultatif, activation. */
@Component({
  selector: 'app-admin-announcements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, AdminTabsComponent],
  template: `
    <div class="ed-page ed-stack">
      <app-admin-tabs />
      <h1>{{ 'ann.title' | t }}</h1>
      <p class="ed-muted">{{ 'ann.text' | t }}</p>

      <section class="ed-card ed-stack">
        <h2>{{ (editingId() ? 'ann.editTitle' : 'ann.newTitle') | t }}</h2>
        <form class="ed-stack" (submit)="$event.preventDefault(); save()" novalidate>
          <label class="ed-field" [class.invalid]="field() === 'title'"><span>{{ 'ann.fieldTitle' | t }}</span>
            <input maxlength="80" [value]="title()" (input)="title.set($any($event.target).value)" data-testid="ann-title" />
          </label>
          <label class="ed-field" [class.invalid]="field() === 'body'"><span>{{ 'ann.fieldBody' | t }}</span>
            <textarea rows="3" maxlength="500" [value]="body()" (input)="body.set($any($event.target).value)" data-testid="ann-body"></textarea>
          </label>
          <div class="ed-grid2">
            <label class="ed-field" [class.invalid]="field() === 'ctaLabel'"><span>{{ 'ann.ctaLabel' | t }} <small>({{ 'common.optional' | t }})</small></span>
              <input maxlength="40" [value]="ctaLabel()" (input)="ctaLabel.set($any($event.target).value)" />
            </label>
            <label class="ed-field" [class.invalid]="field() === 'ctaUrl'"><span>{{ 'ann.ctaUrl' | t }} <small>({{ 'common.optional' | t }})</small></span>
              <input maxlength="500" placeholder="/app/abonnement" [value]="ctaUrl()" (input)="ctaUrl.set($any($event.target).value)" />
            </label>
          </div>
          <fieldset class="ed-field">
            <legend>{{ 'ann.audience' | t }}</legend>
            <div class="ed-seg" role="group">
              @for (a of audiences; track a) {
                <button type="button" [attr.aria-pressed]="audience() === a" (click)="audience.set(a)">{{ audienceKey(a) | t }}</button>
              }
            </div>
          </fieldset>
          <div class="ed-grid2">
            <label class="ed-field"><span>{{ 'ann.starts' | t }} <small>({{ 'common.optional' | t }})</small></span>
              <input type="date" [value]="starts()" (input)="starts.set($any($event.target).value)" />
            </label>
            <label class="ed-field" [class.invalid]="field() === 'endsAt'"><span>{{ 'ann.ends' | t }} <small>({{ 'common.optional' | t }})</small></span>
              <input type="date" [value]="ends()" (input)="ends.set($any($event.target).value)" />
            </label>
          </div>
          <label class="ed-switch"><input type="checkbox" [checked]="active()" (change)="active.set($any($event.target).checked)" /> <span>{{ 'ann.active' | t }}</span></label>
          @if (error()) { <p class="ed-error" role="alert">{{ error() }}</p> }
          @if (done()) { <p class="ed-success" role="status">{{ done() }}</p> }
          <div class="ed-row">
            <button type="submit" class="ed-btn ed-btn--primary" [disabled]="busy() || !title().trim() || !body().trim()">{{ (editingId() ? 'common.save' : 'ann.create') | t }}</button>
            @if (editingId()) { <button type="button" class="ed-btn" (click)="reset()">{{ 'common.cancel' | t }}</button> }
          </div>
        </form>
      </section>

      <section class="ed-card ed-stack">
        @if (list.value(); as items) {
          @if (!items.length) { <p class="ed-muted">{{ 'ann.empty' | t }}</p> }
          <ul class="list" role="list">
            @for (a of items; track a.id) {
              <li class="row">
                <span class="row__main"><strong>{{ a.title }}</strong><span class="ed-muted small clamp">{{ a.body }}</span>
                  <span class="ed-muted small">{{ audienceKey(a.audience) | t }} · {{ short(a.startsAt) }}@if (a.endsAt) { → {{ short(a.endsAt) }} }</span>
                </span>
                <span class="ed-chip" [class.ed-chip--ok]="a.live" [class.ed-chip--warn]="a.active && !a.live">{{ stateKey(a) | t }}</span>
                <button type="button" class="ed-btn" (click)="edit(a)">{{ 'common.edit' | t }}</button>
                <button type="button" class="ed-btn" [class.ed-btn--danger]="a.active" (click)="toggle(a)">{{ (a.active ? 'ann.deactivate' : 'ann.activate') | t }}</button>
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
    fieldset { border: 0; padding: 0; margin: 0; }
    legend { padding: 0; margin-bottom: 6px; }
    .ed-seg button { min-height: 44px; }
    .list { list-style: none; margin: 0; padding: 0; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; padding: 12px 0; border-bottom: 1px solid var(--ed-border); }
    .row:last-child { border-bottom: 0; }
    .row__main { display: flex; flex-direction: column; gap: 2px; flex: 1 1 240px; min-width: 0; overflow-wrap: anywhere; }
    .small { font-size: 13px; }
    .clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `,
})
export class AdminAnnouncementsComponent {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly list = rxResource({ stream: () => this.api.adminAnnouncements() });
  protected readonly audiences = AUDIENCES;
  protected readonly editingId = signal<string | null>(null);
  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly ctaLabel = signal('');
  protected readonly ctaUrl = signal('');
  protected readonly audience = signal<AnnouncementAudience>('both');
  protected readonly starts = signal('');
  protected readonly ends = signal('');
  protected readonly active = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly field = signal<string | null>(null);
  protected readonly done = signal('');
  protected readonly short = formatShortDate;

  protected audienceKey(a: AnnouncementAudience): I18nKey {
    return `ann.audience.${a}` as I18nKey;
  }

  protected stateKey(a: AdminAnnouncement): I18nKey {
    if (a.live) return 'ann.state.live';
    if (!a.active) return 'ann.state.off';
    return a.endsAt && Date.parse(a.endsAt) <= Date.now() ? 'ann.state.ended' : 'ann.state.scheduled';
  }

  protected reset(): void {
    this.editingId.set(null);
    this.title.set('');
    this.body.set('');
    this.ctaLabel.set('');
    this.ctaUrl.set('');
    this.audience.set('both');
    this.starts.set('');
    this.ends.set('');
    this.active.set(true);
    this.field.set(null);
    this.error.set('');
  }

  protected edit(a: AdminAnnouncement): void {
    this.editingId.set(a.id);
    this.title.set(a.title);
    this.body.set(a.body);
    this.ctaLabel.set(a.ctaLabel ?? '');
    this.ctaUrl.set(a.ctaUrl ?? '');
    this.audience.set(a.audience);
    this.starts.set(a.startsAt.slice(0, 10));
    this.ends.set(a.endsAt ? a.endsAt.slice(0, 10) : '');
    this.active.set(a.active);
    this.done.set('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private input(overrides: Partial<AnnouncementInput> = {}): AnnouncementInput {
    return {
      title: this.title().trim(),
      body: this.body().trim(),
      ctaLabel: this.ctaLabel().trim() || null,
      ctaUrl: this.ctaUrl().trim() || null,
      audience: this.audience(),
      // début : minuit UTC du jour choisi (vide = maintenant) ; fin : fin de journée du jour choisi
      startsAt: this.starts() ? new Date(`${this.starts()}T00:00:00Z`).toISOString() : null,
      endsAt: this.ends() ? new Date(`${this.ends()}T23:59:59Z`).toISOString() : null,
      active: this.active(),
      ...overrides,
    };
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.field.set(null);
    this.done.set('');
    try {
      await this.auth.ensureCsrf();
      const id = this.editingId();
      // en modification, un début laissé tel quel garde la date d'origine (pas de remise à « maintenant »)
      await firstValueFrom(id ? this.api.adminUpdateAnnouncement(id, this.input()) : this.api.adminCreateAnnouncement(this.input()));
      this.done.set(this.i18n.t('ann.saved'));
      this.reset();
      this.list.reload();
    } catch (e) {
      const p = toProblem(e);
      this.field.set(p.errors?.[0]?.field ?? null);
      this.error.set(p.errors?.[0]?.message ?? this.i18n.error(p.code));
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggle(a: AdminAnnouncement): Promise<void> {
    try {
      await this.auth.ensureCsrf();
      await firstValueFrom(this.api.adminUpdateAnnouncement(a.id, {
        title: a.title, body: a.body, ctaLabel: a.ctaLabel ?? null, ctaUrl: a.ctaUrl ?? null, audience: a.audience,
        startsAt: a.startsAt, endsAt: a.endsAt ?? null, active: !a.active,
      }));
      this.list.reload();
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }
}
