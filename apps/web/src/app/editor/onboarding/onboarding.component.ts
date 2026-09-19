import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IconComponent } from '../../../design-system';
import type { Block } from '../../core/api/types';
import { toProblem } from '../../core/http/problem';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { THEME_PRESETS } from '../../core/theme/presets';
import { IdentityFormComponent, profileUpdateFrom } from '../profile/identity-form.component';
import { SocialsStatsFormComponent } from '../profile/socials-stats-form.component';
import { ImageUploadComponent } from '../shared/image-upload.component';
import { PreviewFrameComponent } from '../shared/preview-frame.component';
import { EditorStore } from '../state/editor.store';

/**
 * Assistant d'onboarding en 5 étapes (brief §7.1) : identité → photo de fond → réseaux & stats → blocs → style + publication.
 * Chaque étape enregistre au passage ; l'aperçu live est visible en permanence (desktop) ou via l'onglet Aperçu (mobile).
 */
@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent, IdentityFormComponent, SocialsStatsFormComponent, ImageUploadComponent, PreviewFrameComponent],
  template: `
    @if (!store.loading() && store.profile(); as p) {
      <div class="split" [attr.data-tab]="tab()">
        <div class="split__tabs" role="tablist">
          <button role="tab" [attr.aria-selected]="tab() === 'edit'" (click)="tab.set('edit')">{{ 'ed.tabEdit' | t }}</button>
          <button role="tab" [attr.aria-selected]="tab() === 'preview'" (click)="tab.set('preview')">{{ 'ed.tabPreview' | t }}</button>
        </div>
        <div class="split__edit">
          <div>
            <p class="ed-muted">{{ 'onb.step' | t: { n: step(), total: 5 } }}</p>
            <h1>{{ titles[step() - 1] | t }}</h1>
            <div class="prog" role="progressbar" aria-valuemin="1" aria-valuemax="5" [attr.aria-valuenow]="step()"><i [style.width.%]="step() * 20"></i></div>
          </div>
          @if (error()) {
            <p class="ed-error" role="alert">{{ error() }}</p>
          }
          <section class="ed-card">
            @switch (step()) {
              @case (1) {
                <ed-identity-form />
              }
              @case (2) {
                <p class="ed-muted">{{ 'onb.s2.text' | t }}</p>
                <ed-image-upload kind="background" [wide]="true" [value]="p.backgroundImageId" [image]="p.backgroundImageId ? store.images()[p.backgroundImageId] : null"
                                 [label]="'profile.background' | t" (uploaded)="store.addImage($event)" (changed)="store.patchProfileLocal({ backgroundImageId: $event })" />
              }
              @case (3) {
                <ed-socials-stats-form />
              }
              @case (4) {
                <p class="ed-muted">{{ 'onb.s4.text' | t }}</p>
                <ul class="onb-blocks" role="list">
                  @for (b of store.blocks(); track b.id) {
                    <li><label class="ed-switch"><input type="checkbox" [checked]="b.visible" (change)="toggle(b)" /><lm-icon [name]="b.icon ?? 'link'" [size]="18" /> {{ b.title }}</label></li>
                  }
                </ul>
              }
              @case (5) {
                <p class="ed-muted">{{ 'onb.s5.text' | t }}</p>
                <div class="onb-presets" role="radiogroup">
                  @for (pr of presets; track pr.id) {
                    <button type="button" role="radio" class="onb-preset" [attr.aria-checked]="store.theme().preset === pr.id" (click)="store.applyPreset(pr.id)">
                      <span class="onb-sw" [style.background]="pr.config.colors.overlay"><i [style.background]="pr.config.colors.accent"></i></span>{{ pr.name }}
                    </button>
                  }
                </div>
              }
            }
          </section>
          <div class="ed-row nav">
            @if (step() > 1) {
              <button type="button" class="ed-btn" (click)="step.set(step() - 1)">{{ 'common.previous' | t }}</button>
            }
            @if (step() < 5) {
              <button type="button" class="ed-btn ed-btn--primary" (click)="next()" [disabled]="busy()" data-testid="onb-next">{{ 'common.next' | t }}</button>
            } @else {
              <button type="button" class="ed-btn ed-btn--primary" (click)="finish()" [disabled]="busy()" data-testid="onb-finish"><lm-icon name="sparkles" [size]="18" />{{ 'onb.finish' | t }}</button>
            }
          </div>
        </div>
        <aside class="split__preview"><ed-preview-frame [page]="store.previewPage()" /></aside>
      </div>
    }
  `,
  styleUrl: '../shared/split-layout.scss',
  styles: `
    .prog { height: 6px; border-radius: 6px; background: var(--ed-panel-2); overflow: hidden; margin-top: 10px; }
    .prog i { display: block; height: 100%; background: var(--ed-accent); transition: width .3s; }
    .onb-blocks { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
    .onb-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
    .onb-preset { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; border: 1px solid var(--ed-border); background: var(--ed-bg); color: var(--ed-text); font-weight: 600; cursor: pointer; text-align: left; }
    .onb-preset[aria-checked='true'] { border-color: var(--ed-accent); }
    .onb-sw { display: flex; align-items: flex-end; padding: 8px; height: 44px; border-radius: 8px; }
    .onb-sw i { width: 14px; height: 14px; border-radius: 50%; }
    .nav { justify-content: flex-end; }
  `,
})
export class OnboardingComponent {
  protected readonly store = inject(EditorStore);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  protected readonly step = signal(1);
  protected readonly tab = signal<'edit' | 'preview'>('edit');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly presets = THEME_PRESETS;
  protected readonly titles = ['onb.s1', 'onb.s2', 'onb.s3', 'onb.s4', 'onb.s5'] as const;
  private readonly socials = viewChild(SocialsStatsFormComponent);

  protected async next(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      if (this.step() <= 2) await this.store.saveProfile(profileUpdateFrom(this.store));
      if (this.step() === 3) await this.socials()?.save();
      this.step.update((s) => s + 1);
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }

  protected async toggle(b: Block): Promise<void> {
    await this.store.updateBlock(b.id, { type: b.type, title: b.title, subtitle: b.subtitle, icon: b.icon, thumbnailImageId: b.thumbnailImageId ?? null, url: b.url ?? null, config: b.config, visible: !b.visible });
  }

  protected async finish(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.saveThemeNow();
      await this.store.publish();
      await this.store.saveProfile(profileUpdateFrom(this.store, { onboardingCompleted: true, published: true }));
      await this.router.navigate(['/app'], { queryParams: { welcome: 1 } });
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }
}
