import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { IconComponent, PLATFORM_LABELS, SheetComponent } from '../../../design-system';
import type { PublicPage } from '../../core/api/types';
import { compactNumber } from '../../core/format/compact-number';
import { TPipe } from '../../core/i18n/i18n.service';
import { ShareService } from './share.service';
import type { ViewClick } from './public-page-view.component';

/** Feuille « My Links » : tous les liens du créateur + Partager / Copier / QR code (brief §5.5). */
@Component({
  selector: 'lm-my-links-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, IconComponent, RouterLink, TPipe],
  template: `
    <lm-sheet [open]="open()" [heading]="'public.sheet.title' | t: { name: page().profile.displayName }" (closed)="closed.emit(); qr.set(null)">
      <ul class="ml" role="list">
        @for (b of blocks(); track b.id) {
          <li>
            @if (b.type === 'link' && b.url) {
              <a class="ml__row" [href]="b.url" target="_blank" rel="noopener noreferrer" (click)="linkClick.emit({ kind: 'block', blockId: b.id, target: 'mylinks:' + b.slug })">
                <lm-icon [name]="b.icon ?? 'link'" [size]="20" /><span>{{ b.title }}</span><lm-icon class="ml__go" name="external-link" [size]="16" />
              </a>
            } @else {
              <a class="ml__row" [routerLink]="['/', page().profile.handle, b.slug]" (click)="linkClick.emit({ kind: 'block', blockId: b.id, target: 'mylinks:' + b.slug })">
                <lm-icon [name]="b.icon ?? 'link'" [size]="20" /><span>{{ b.title }}</span><lm-icon class="ml__go" name="arrow-right" [size]="16" />
              </a>
            }
          </li>
        }
        @for (s of socials(); track s.platform) {
          <li>
            <a class="ml__row" [href]="s.url" target="_blank" rel="noopener noreferrer me" (click)="linkClick.emit({ kind: 'social', target: 'mylinks:social:' + s.platform })">
              <lm-icon [name]="'brand-' + s.platform" [size]="18" /><span>{{ s.label }}</span><span class="ml__count">{{ s.count }}</span>
            </a>
          </li>
        }
      </ul>
      <div class="ml__actions">
        <button type="button" class="ml__btn" (click)="share.share(page().profile.displayName, pageUrl())"><lm-icon name="share-2" [size]="18" />{{ 'common.share' | t }}</button>
        <button type="button" class="ml__btn" (click)="copy()"><lm-icon [name]="copied() ? 'check' : 'copy'" [size]="18" />{{ (copied() ? 'common.copied' : 'common.copy') | t }}</button>
        <button type="button" class="ml__btn" (click)="toggleQr()" [attr.aria-expanded]="!!qr()"><lm-icon name="qr-code" [size]="18" />{{ 'public.sheet.qr' | t }}</button>
      </div>
      @if (qr(); as svg) {
        <div class="ml__qr" role="img" [attr.aria-label]="'public.sheet.qrAlt' | t: { url: pageUrl() }" [innerHTML]="svg"></div>
      }
      <p class="ml__sr" aria-live="polite">{{ copied() ? ('common.copied' | t) : '' }}</p>
    </lm-sheet>
  `,
  styles: `
    .ml { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .ml__row {
      display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 0 14px; border-radius: 14px;
      color: var(--lm-text); text-decoration: none; background: var(--lm-control-bg); border: 1px solid var(--lm-card-border);
    }
    .ml__row span:first-of-type { flex: 1; font-size: 15px; }
    .ml__row:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    .ml__go, .ml__count { color: var(--lm-text-muted); font-size: 13px; }
    .ml__actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
    .ml__btn {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; min-height: 64px;
      border-radius: 14px; border: 1px solid var(--lm-card-border); background: transparent; color: var(--lm-text); cursor: pointer; font-size: 13px;
    }
    .ml__btn:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    .ml__qr { margin: 14px auto 0; width: 208px; padding: 12px; border-radius: 16px; background: var(--lm-text); color: var(--lm-overlay); }
    .ml__qr ::ng-deep svg { width: 100%; height: auto; }
    .ml__sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); margin: 0; }
  `,
})
export class MyLinksSheetComponent {
  readonly open = input(false);
  readonly page = input.required<PublicPage>();
  readonly pageUrl = input('');
  readonly closed = output<void>();
  readonly linkClick = output<ViewClick>();
  protected readonly share = inject(ShareService);
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly copied = signal(false);
  protected readonly qr = signal<SafeHtml | null>(null);

  protected readonly blocks = computed(() => this.page().blocks.filter((b) => b.visible));
  protected readonly socials = computed(() =>
    this.page().socials.map((s) => ({ ...s, label: PLATFORM_LABELS[s.platform] ?? s.platform, count: compactNumber(s.followersCount) })),
  );

  protected async copy(): Promise<void> {
    if (await this.share.copy(this.pageUrl())) {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }
  }

  protected async toggleQr(): Promise<void> {
    if (this.qr()) return this.qr.set(null);
    // chargé à la demande : pas de poids sur la page publique
    const { default: qrcode } = await import('qrcode-generator');
    const q = qrcode(0, 'M');
    q.addData(this.pageUrl());
    q.make();
    // SVG généré localement à partir de l'URL de la page (aucune donnée HTML utilisateur)
    this.qr.set(this.sanitizer.bypassSecurityTrustHtml(q.createSvgTag({ cellSize: 4, margin: 0, scalable: true })));
  }
}
