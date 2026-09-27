import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TPipe } from '../../core/i18n/i18n.service';

/** Onglets de l'espace admin (D56, D59, D63). */
@Component({
  selector: 'app-admin-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, TPipe],
  template: `
    <nav class="tabs" aria-label="Admin">
      <a routerLink="/app/admin/retraits" routerLinkActive="on" ariaCurrentWhenActive="page">{{ 'admin.tab.withdrawals' | t }}</a>
      <a routerLink="/app/admin/promos" routerLinkActive="on" ariaCurrentWhenActive="page">{{ 'admin.tab.promos' | t }}</a>
      <a routerLink="/app/admin/crm" routerLinkActive="on" ariaCurrentWhenActive="page">{{ 'admin.tab.crm' | t }}</a>
    </nav>
  `,
  styles: `
    .tabs { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--ed-panel); border: 1px solid var(--ed-border); overflow-x: auto; }
    a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px; border-radius: 10px; color: var(--ed-muted); font-size: 14px;
        font-weight: 600; text-decoration: none; white-space: nowrap; }
    a.on { background: var(--ed-panel-2); color: var(--ed-text); }
    a:focus-visible { outline: 2px solid var(--ed-accent); outline-offset: 2px; }
  `,
})
export class AdminTabsComponent {}
