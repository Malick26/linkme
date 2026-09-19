import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BrandLogoComponent, IconComponent } from '../../../design-system';
import { AuthStore } from '../../core/auth/auth.store';
import type { I18nKey } from '../../core/i18n/fr';
import { TPipe } from '../../core/i18n/i18n.service';
import { EditorStore } from '../state/editor.store';

interface NavItem { path: string; icon: string; label: I18nKey; exact?: boolean; main?: boolean }

/** Cadre du back-office : barre latérale (desktop) / barre d'onglets en bas (mobile). */
@Component({
  selector: 'app-editor-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, TPipe, BrandLogoComponent],
  template: `
    <div class="sh">
      <aside class="sh__side" [attr.aria-label]="'nav.menu' | t">
        <a routerLink="/app" class="sh__logo"><lm-brand-logo /></a>
        <nav class="sh__nav">
          @for (n of nav; track n.path) {
            <a [routerLink]="n.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }" class="sh__link">
              <lm-icon [name]="n.icon" [size]="20" /><span>{{ n.label | t }}</span>
            </a>
          }
        </nav>
        <div class="sh__bottom">
          @if (pageUrl(); as url) {
            <a class="sh__link" [href]="url" target="_blank" rel="noopener"><lm-icon name="external-link" [size]="20" /><span>{{ 'nav.viewPage' | t }}</span></a>
          }
          <button type="button" class="sh__link" (click)="auth.logout()"><lm-icon name="log-out" [size]="20" /><span>{{ 'nav.logout' | t }}</span></button>
        </div>
      </aside>

      <main class="sh__main" id="main">
        @if (store.loading()) {
          <p class="sh__loading" role="status">{{ 'common.loading' | t }}</p>
        }
        <router-outlet />
      </main>

      <nav class="sh__tabs" [attr.aria-label]="'nav.menu' | t">
        @for (n of mainNav; track n.path) {
          <a [routerLink]="n.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: !!n.exact }" class="sh__tab">
            <lm-icon [name]="n.icon" [size]="22" /><span>{{ n.label | t }}</span>
          </a>
        }
        <button type="button" class="sh__tab" (click)="moreOpen.set(!moreOpen())" [attr.aria-expanded]="moreOpen()">
          <lm-icon name="menu" [size]="22" /><span>{{ 'nav.more' | t }}</span>
        </button>
      </nav>
      @if (moreOpen()) {
        <div class="sh__more" role="menu">
          @for (n of moreNav; track n.path) {
            <a role="menuitem" [routerLink]="n.path" class="sh__link" (click)="moreOpen.set(false)"><lm-icon [name]="n.icon" [size]="20" /><span>{{ n.label | t }}</span></a>
          }
          @if (pageUrl(); as url) {
            <a role="menuitem" class="sh__link" [href]="url" target="_blank" rel="noopener"><lm-icon name="external-link" [size]="20" /><span>{{ 'nav.viewPage' | t }}</span></a>
          }
          <button role="menuitem" type="button" class="sh__link" (click)="auth.logout()"><lm-icon name="log-out" [size]="20" /><span>{{ 'nav.logout' | t }}</span></button>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; background: var(--ed-bg); color: var(--ed-text); min-height: 100svh; font-family: var(--lm-font-body); }
    .sh { display: grid; grid-template-columns: 1fr; min-height: 100svh; }
    .sh__side { display: none; }
    .sh__main { min-width: 0; }
    .sh__loading { padding: 24px; color: var(--ed-muted); }
    .sh__link {
      display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 14px; border-radius: 10px; border: 0; width: 100%;
      background: transparent; color: var(--ed-muted); font-size: 14px; font-weight: 500; text-decoration: none; cursor: pointer; text-align: left;
    }
    .sh__link:hover { color: var(--ed-text); background: var(--ed-panel); }
    .sh__link.active { color: var(--ed-text); background: var(--ed-panel-2); }
    .sh__tabs {
      position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: grid; grid-template-columns: repeat(5, 1fr);
      background: var(--ed-panel); border-top: 1px solid var(--ed-border); padding-bottom: env(safe-area-inset-bottom);
    }
    .sh__tab { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 58px; border: 0; background: transparent; color: var(--ed-muted); font-size: 11px; text-decoration: none; cursor: pointer; }
    .sh__tab.active { color: var(--ed-accent); }
    .sh__more { position: fixed; right: 8px; bottom: 66px; z-index: 21; width: 240px; padding: 8px; border-radius: 14px; background: var(--ed-panel); border: 1px solid var(--ed-border); }
    @media (min-width: 1024px) {
      .sh { grid-template-columns: 240px 1fr; }
      .sh__side { display: flex; flex-direction: column; gap: 16px; position: sticky; top: 0; height: 100svh; padding: 20px 12px; border-right: 1px solid var(--ed-border); background: var(--ed-panel); }
      .sh__logo { padding: 4px 12px 12px; color: var(--ed-text); }
      .sh__nav { display: flex; flex-direction: column; gap: 2px; }
      .sh__bottom { margin-top: auto; display: flex; flex-direction: column; gap: 2px; }
      .sh__tabs, .sh__more { display: none; }
    }
  `,
})
export class EditorShellComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly store = inject(EditorStore);
  protected readonly moreOpen = signal(false);
  protected readonly nav: NavItem[] = [
    { path: '/app', icon: 'layout-template', label: 'nav.dashboard', exact: true, main: true },
    { path: '/app/profile', icon: 'user', label: 'nav.profile', main: true },
    { path: '/app/blocks', icon: 'link', label: 'nav.blocks', main: true },
    { path: '/app/design', icon: 'palette', label: 'nav.design', main: true },
    { path: '/app/shop', icon: 'store', label: 'nav.shop' },
    { path: '/app/sales', icon: 'wallet', label: 'nav.sales' },
    { path: '/app/messages', icon: 'inbox', label: 'nav.messages' },
    { path: '/app/analytics', icon: 'chart-column', label: 'nav.analytics' },
    { path: '/app/settings', icon: 'settings', label: 'nav.settings' },
  ];
  protected readonly mainNav = this.nav.filter((n) => n.main);
  protected readonly moreNav = this.nav.filter((n) => !n.main);
  protected readonly pageUrl = computed(() => {
    const m = this.auth.me();
    return m?.published ? `/${m.handle}` : null;
  });

  constructor() {
    void this.store.load().catch(() => undefined);
  }
}
