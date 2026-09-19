import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BRAND_NAME } from '../../app/core/config/brand';
import { IconComponent } from '../icons/icon.component';
import { TPipe } from '../../app/core/i18n/i18n.service';

/** « Powered by 🔗 LinkMe » — masqué pour le plan Pro (P1). */
@Component({
  selector: 'lm-powered-by',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TPipe],
  template: `
    <a class="pb" href="/" rel="noopener">
      <span class="pb__label">{{ 'public.poweredBy' | t }}</span>
      <lm-icon name="link" [size]="18" [strokeWidth]="2.2" />
      <span class="pb__brand">{{ brand }}</span>
    </a>
  `,
  styles: `
    .pb { display: inline-flex; align-items: center; gap: 6px; min-height: var(--lm-touch); color: var(--lm-text); text-decoration: none; }
    .pb__label { font-size: var(--lm-fs-powered-label, 11px); color: var(--lm-text-muted); margin-inline-end: 4px; }
    .pb__brand { font-size: var(--lm-fs-powered-brand, 16px); font-weight: 600; letter-spacing: -.01em; }
  `,
})
export class PoweredByComponent {
  protected readonly brand = BRAND_NAME;
}
