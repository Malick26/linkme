import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BRAND_LOGO, BRAND_NAME } from '../../app/core/config/brand';
import { SwashComponent } from './swash.component';

/** Logo plateforme : script manuscrit blanc + swash (maquette §5.1-3). Piloté par BRAND_LOGO. */
@Component({
  selector: 'lm-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SwashComponent],
  template: `
    @if (logo.kind === 'image') {
      <img [src]="logo.src" [alt]="logo.alt" height="40" />
    } @else {
      <span class="bl" role="img" [attr.aria-label]="name">
        <span class="bl__text" aria-hidden="true">{{ logo.text }}</span>
        <lm-swash class="bl__swash" variant="logo" />
      </span>
    }
  `,
  styles: `
    :host { display: inline-block; color: var(--lm-text); }
    .bl { display: inline-flex; flex-direction: column; transform: rotate(-9deg); transform-origin: left center; }
    .bl__text { font-family: var(--lm-font-brand); font-size: var(--lm-fs-logo, 27px); line-height: 1; letter-spacing: .01em; }
    .bl__swash { width: 78%; height: 8px; margin: -1px 0 0 6%; }
  `,
})
export class BrandLogoComponent {
  protected readonly logo = BRAND_LOGO;
  protected readonly name = BRAND_NAME;
}
