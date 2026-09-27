import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Announcement } from '../core/api/types';
import { TPipe } from '../core/i18n/i18n.service';

const DISMISSED_KEY = 'lm.announcements.dismissed';

function readDismissed(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Annonce en pop-up (D65, D66) sur l'accueil ou le tableau de bord. Chargée uniquement dans le navigateur, après le
 * premier rendu (aucun effet sur le rendu serveur ni le LCP) ; une annonce fermée ne réapparaît plus chez ce visiteur.
 * Le contenu vient de l'admin : rendu en texte uniquement (jamais d'innerHTML), lien filtré côté serveur.
 */
@Component({
  selector: 'app-announcement-popup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    @if (item(); as a) {
      <div class="ap__backdrop" (click)="close()"></div>
      <section #dialog class="ap" role="dialog" aria-modal="true" aria-labelledby="ap-title" aria-describedby="ap-body" tabindex="-1"
               data-testid="announcement">
        <button type="button" class="ap__close" (click)="close()" [attr.aria-label]="'common.close' | t">×</button>
        <h2 id="ap-title">{{ a.title }}</h2>
        <p id="ap-body">{{ a.body }}</p>
        @if (a.ctaUrl && a.ctaLabel) {
          @if (a.ctaUrl.startsWith('/')) {
            <a class="ap__cta" [routerLink]="path(a.ctaUrl)" [queryParams]="query(a.ctaUrl)" (click)="close()">{{ a.ctaLabel }}</a>
          } @else {
            <a class="ap__cta" [href]="a.ctaUrl" target="_blank" rel="noopener" (click)="close()">{{ a.ctaLabel }}</a>
          }
        }
      </section>
    }
  `,
  styles: `
    .ap__backdrop { position: fixed; inset: 0; z-index: 60; background: color-mix(in srgb, var(--lm-overlay) 70%, transparent); }
    .ap {
      position: fixed; z-index: 61; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%);
      width: min(440px, calc(100vw - 32px)); padding: 24px 22px 22px; border-radius: 20px; display: flex; flex-direction: column; gap: 12px;
      background: var(--lm-bg); color: var(--lm-text); border: 1px solid var(--lm-control-border); font-family: var(--lm-font-body);
      box-shadow: var(--lm-shadow-card, 0 12px 40px color-mix(in srgb, var(--lm-overlay) 60%, transparent));
      animation: ap-in 0.25s ease-out;
    }
    @media (min-width: 640px) { .ap { top: 50%; bottom: auto; transform: translate(-50%, -50%); } }
    .ap:focus { outline: none; }
    h2 { margin: 0 36px 0 0; font-size: 20px; line-height: 1.25; }
    p { margin: 0; color: var(--lm-text-muted); line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere; }
    .ap__close {
      position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; border: 0; border-radius: 999px; font-size: 26px; line-height: 1;
      background: transparent; color: var(--lm-text-muted); cursor: pointer;
      &:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    }
    .ap__cta {
      align-self: flex-start; display: inline-flex; align-items: center; min-height: 48px; padding: 0 20px; border-radius: 999px;
      background: var(--lm-accent); color: var(--lm-overlay); font-weight: 600; text-decoration: none;
      &:focus-visible { outline: none; box-shadow: var(--lm-focus-ring); }
    }
    @keyframes ap-in { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .ap { animation: none; } }
  `,
})
export class AnnouncementPopupComponent {
  readonly audience = input.required<'landing' | 'dashboard'>();
  protected readonly item = signal<Announcement | null>(null);
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly http = inject(HttpClient);

  constructor() {
    afterNextRender(() => {
      this.http.get<Announcement | null>('/api/public/announcements/current', { params: { audience: this.audience() } }).subscribe({
        next: (a) => {
          if (!a || readDismissed().includes(a.id)) return;
          this.item.set(a);
          setTimeout(() => this.dialog()?.nativeElement.focus());
        },
        error: () => undefined, // une annonce ne doit jamais gêner la page
      });
    });
  }

  protected path(url: string): string {
    return url.split(/[?#]/)[0];
  }

  protected query(url: string): Record<string, string> {
    const q = url.split('#')[0].split('?')[1];
    return q ? Object.fromEntries(new URLSearchParams(q)) : {};
  }

  close(): void {
    const a = this.item();
    if (!a) return;
    this.item.set(null);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...readDismissed(), a.id].slice(-50)));
    } catch {
      /* stockage indisponible (navigation privée) : l'annonce reviendra, sans gravité */
    }
  }
}
