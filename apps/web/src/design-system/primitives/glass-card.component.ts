import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Surface « verre sombre » générique (contenus de pages de blocs, feuilles, formulaires). */
@Component({
  selector: 'lm-glass-card, [lmGlassCard]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lm-glass' },
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
      background: var(--lm-card-bg);
      border: 1px solid var(--lm-card-border);
      border-radius: var(--lm-card-radius);
      -webkit-backdrop-filter: blur(var(--lm-card-blur)) saturate(1.15);
      backdrop-filter: blur(var(--lm-card-blur)) saturate(1.15);
      color: var(--lm-text);
    }
    @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      :host { background: var(--lm-card-bg-fallback); }
    }
  `,
})
export class GlassCardComponent {}
