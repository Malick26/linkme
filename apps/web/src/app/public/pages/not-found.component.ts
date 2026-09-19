import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogoComponent } from '../../../design-system';
import { TPipe } from '../../core/i18n/i18n.service';

@Component({
  selector: 'app-not-found',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, BrandLogoComponent],
  template: `
    <main class="nf">
      <lm-brand-logo />
      <h1>{{ 'public.notFound.title' | t }}</h1>
      <p>{{ 'public.notFound.text' | t }}</p>
      <a routerLink="/register" class="nf__cta">{{ 'public.notFound.cta' | t }}</a>
    </main>
  `,
  styles: `
    .nf { min-height: 100svh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; background: var(--lm-overlay); color: var(--lm-text); }
    h1 { margin: 24px 0 0; font-size: 24px; }
    p { margin: 0; color: var(--lm-text-muted); }
    .nf__cta { margin-top: 16px; display: inline-flex; align-items: center; min-height: 48px; padding: 0 22px; border-radius: 999px; background: var(--lm-accent); color: var(--lm-overlay); font-weight: 600; text-decoration: none; }
  `,
})
export class NotFoundComponent {}
