import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Couronne dessinée à la main (SVG sur mesure, currentColor) — brief annexe B. */
@Component({
  selector: 'lm-crown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'lm-crown', '[style.width.px]': 'size() || null' },
  template: `
    <svg viewBox="0 0 48 36" fill="none" stroke="currentColor" [attr.stroke-width]="weight()" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7.5 29.5 L5 11.2 L15.6 20.4 L23.6 5.6 L31.2 20 L42.6 10.6 L39.6 29.8" />
      <path d="M8.2 30.2 C 18 28.4, 29 28.6, 39.2 30.6" />
      <path d="M8 33.4 C 18.5 31.8, 28.8 32, 39 33.8" opacity=".85" />
      <circle cx="5" cy="9.2" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="23.6" cy="3.2" r="1.7" fill="currentColor" stroke="none" />
      <circle cx="42.8" cy="8.4" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  `,
  styles: `:host { display: block; line-height: 0; } svg { width: 100%; height: auto; overflow: visible; }`,
})
export class CrownComponent {
  readonly size = input(40);
  readonly weight = input(2.2);
}
