import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { IconComponent, SheetComponent } from '../../../design-system';
import type { PublicPage } from '../../core/api/types';
import { REPORT_EMAIL } from '../../core/config/brand';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { ShareService } from './share.service';

/** Menu « ··· » : partager, copier le lien, signaler la page (brief §5.5). */
@Component({
  selector: 'lm-more-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, IconComponent, TPipe],
  template: `
    <lm-sheet [open]="open()" [heading]="page().profile.displayName" (closed)="closed.emit(); done.set('')">
      <div class="mm" role="menu">
        <button type="button" role="menuitem" class="mm__item" (click)="share.share(page().profile.displayName, pageUrl())"><lm-icon name="share-2" [size]="20" />{{ 'public.menu.share' | t }}</button>
        <button type="button" role="menuitem" class="mm__item" (click)="copy()"><lm-icon name="copy" [size]="20" />{{ 'public.menu.copy' | t }}</button>
        <a role="menuitem" class="mm__item" [href]="reportHref()" (click)="done.set(i18n.t('public.menu.reportDone'))"><lm-icon name="flag" [size]="20" />{{ 'public.menu.report' | t }}</a>
      </div>
      <p class="mm__status" aria-live="polite">{{ done() }}</p>
    </lm-sheet>
  `,
  styles: `
    .mm { display: flex; flex-direction: column; gap: 4px; }
    .mm__item {
      display: flex; align-items: center; gap: 14px; min-height: 52px; padding: 0 14px; border-radius: 14px; border: 0;
      background: transparent; color: var(--lm-text); font-size: 15px; text-align: left; text-decoration: none; cursor: pointer;
    }
    .mm__item:hover { background: var(--lm-control-bg); }
    .mm__item:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    .mm__status { min-height: 1.2em; margin: 8px 14px 0; font-size: 13px; color: var(--lm-text-muted); }
  `,
})
export class MoreMenuComponent {
  readonly open = input(false);
  readonly page = input.required<PublicPage>();
  readonly pageUrl = input('');
  readonly closed = output<void>();
  protected readonly share = inject(ShareService);
  protected readonly i18n = inject(I18n);
  protected readonly done = signal('');
  protected readonly reportHref = computed(
    () => `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent('Signalement : @' + this.page().profile.handle)}&body=${encodeURIComponent(this.pageUrl())}`,
  );

  protected async copy(): Promise<void> {
    if (await this.share.copy(this.pageUrl())) this.done.set(this.i18n.t('common.copied'));
  }
}
