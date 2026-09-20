import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../design-system';
import { imageUrl } from '../../core/images/image-url';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { PreviewFrameComponent } from '../shared/preview-frame.component';
import { EditorStore } from '../state/editor.store';
import { IdentityFormComponent, profileUpdateFrom } from './identity-form.component';
import { SocialsStatsFormComponent } from './socials-stats-form.component';

/** Délai après la dernière frappe avant l'enregistrement automatique. */
const AUTOSAVE_MS = 1200;

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, RouterLink, IconComponent, IdentityFormComponent, SocialsStatsFormComponent, PreviewFrameComponent],
  template: `
    @if (!store.loading() && store.profile(); as p) {
      <div class="split" [attr.data-tab]="tab()">
        <div class="split__tabs" role="tablist">
          <button role="tab" [attr.aria-selected]="tab() === 'edit'" (click)="tab.set('edit')">{{ 'ed.tabEdit' | t }}</button>
          <button role="tab" [attr.aria-selected]="tab() === 'preview'" (click)="tab.set('preview')">{{ 'ed.tabPreview' | t }}</button>
        </div>
        <div class="split__edit">
          <div class="split__head">
            <h1>{{ 'nav.profile' | t }}</h1>
            <div class="split__actions">
              <span class="ed-muted" role="status" aria-live="polite">
                {{ (state() === 'saving' ? 'ed.saving' : state() === 'saved' ? 'common.saved' : 'profile.saveHint') | t }}
              </span>
              <button class="ed-btn ed-btn--primary" type="button" (click)="saveNow()" [disabled]="state() === 'saving'">{{ 'common.save' | t }}</button>
            </div>
          </div>
          @if (error()) {
            <p class="ed-error" role="alert">{{ error() }}</p>
          }
          <section class="ed-card"><h2>{{ 'profile.identity' | t }}</h2><ed-identity-form (dirty)="queue()" /></section>
          <section class="ed-card">
            <h2>{{ 'profile.background' | t }}</h2>
            <div class="bg">
              @if (backgroundUrl(); as url) {
                <img class="bg__img" [src]="url" alt="" width="132" height="88" />
              } @else {
                <p class="ed-muted bg__none">{{ 'profile.background.none' | t }}</p>
              }
              <div class="bg__txt">
                <p class="ed-muted">{{ 'profile.background.hint' | t }}</p>
                <a class="ed-btn" routerLink="/app/design" fragment="fond"><lm-icon name="palette" [size]="18" />{{ 'profile.background.edit' | t }}</a>
              </div>
            </div>
          </section>
          <section class="ed-card"><ed-socials-stats-form (dirty)="queue()" /></section>
        </div>
        <aside class="split__preview"><ed-preview-frame [page]="store.previewPage()" /></aside>
      </div>
    }
  `,
  styles: `
    .bg { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-start; }
    .bg__img { width: 132px; height: 88px; object-fit: cover; border-radius: 12px; }
    .bg__txt { flex: 1 1 240px; display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
    .bg__none { margin: 0; }
  `,
  styleUrl: '../shared/split-layout.scss',
})
export class ProfilePageComponent {
  protected readonly store = inject(EditorStore);
  private readonly i18n = inject(I18n);
  protected readonly tab = signal<'edit' | 'preview'>('edit');
  protected readonly state = signal<'idle' | 'saving' | 'saved'>('idle');
  protected readonly error = signal('');
  private readonly socialsForm = viewChild(SocialsStatsFormComponent);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending = false;

  constructor() {
    // une sortie de page ne doit jamais perdre une frappe : on vide la file d'attente
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      if (this.pending) void this.save();
    });
  }

  /** Aperçu du fond réellement rendu (thème d'abord, photo du profil en repli) — cf. `previewPage`. */
  protected backgroundUrl(): string | null {
    const id = this.store.theme().background.imageId ?? this.store.profile()?.backgroundImageId ?? null;
    const img = id ? this.store.images()[id] : null;
    return img ? imageUrl(img, 264) : null;
  }

  /** Appelé à chaque frappe : enregistre après une courte pause. */
  protected queue(): void {
    this.pending = true;
    this.state.set('idle');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.save(), AUTOSAVE_MS);
  }

  protected async saveNow(): Promise<void> {
    clearTimeout(this.timer);
    await this.save();
  }

  private async save(): Promise<void> {
    this.pending = false;
    this.state.set('saving');
    this.error.set('');
    try {
      await this.store.saveProfile(profileUpdateFrom(this.store));
      await this.socialsForm()?.save();
      this.state.set('saved');
    } catch (e) {
      this.state.set('idle');
      this.pending = true;
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }
}
