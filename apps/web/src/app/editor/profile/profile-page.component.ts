import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { ImageUploadComponent } from '../shared/image-upload.component';
import { PreviewFrameComponent } from '../shared/preview-frame.component';
import { EditorStore } from '../state/editor.store';
import { IdentityFormComponent, profileUpdateFrom } from './identity-form.component';
import { SocialsStatsFormComponent } from './socials-stats-form.component';

@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IdentityFormComponent, SocialsStatsFormComponent, ImageUploadComponent, PreviewFrameComponent],
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
              @if (status()) {
                <span class="ed-success" role="status">{{ status() }}</span>
              }
              <button class="ed-btn ed-btn--primary" type="button" (click)="save()" [disabled]="busy()">{{ (busy() ? 'common.saving' : 'common.save') | t }}</button>
            </div>
          </div>
          @if (error()) {
            <p class="ed-error" role="alert">{{ error() }}</p>
          }
          <section class="ed-card"><h2>{{ 'profile.identity' | t }}</h2><ed-identity-form /></section>
          <section class="ed-card">
            <h2>{{ 'profile.background' | t }}</h2>
            <ed-image-upload kind="background" [wide]="true" [value]="p.backgroundImageId" [image]="p.backgroundImageId ? store.images()[p.backgroundImageId] : null"
                             [label]="'profile.background' | t" (uploaded)="store.addImage($event)" (changed)="store.patchProfileLocal({ backgroundImageId: $event })" />
          </section>
          <section class="ed-card"><ed-socials-stats-form /></section>
        </div>
        <aside class="split__preview"><ed-preview-frame [page]="store.previewPage()" /></aside>
      </div>
    }
  `,
  styleUrl: '../shared/split-layout.scss',
})
export class ProfilePageComponent {
  protected readonly store = inject(EditorStore);
  private readonly i18n = inject(I18n);
  protected readonly tab = signal<'edit' | 'preview'>('edit');
  protected readonly busy = signal(false);
  protected readonly status = signal('');
  protected readonly error = signal('');
  private readonly socialsForm = viewChild(SocialsStatsFormComponent);

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    this.status.set('');
    try {
      await this.store.saveProfile(profileUpdateFrom(this.store));
      await this.socialsForm()?.save();
      this.status.set(this.i18n.t('profile.saved'));
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }
}
