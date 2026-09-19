import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Trait d'appui au pinceau (swash) — SVG sur mesure, forme effilée, couleur héritée. */
@Component({
  selector: 'lm-swash',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true', class: 'lm-swash' },
  template: `
    @switch (variant()) {
      @case ('name') {
        <svg viewBox="0 0 300 30" preserveAspectRatio="none">
          <path fill="currentColor" d="M2 25.5 C 40 19.5, 110 13.5, 176 11.2 C 214 9.8, 248 9.6, 276 10.4 C 283 10.6, 287 11.6, 285.6 13 C 284.4 14.2, 279 14.1, 272 13.9 C 238 13, 196 14.2, 150 16.6 C 96 19.4, 46 23.4, 4 28 C 1.2 28.3, 0.4 26.3, 2 25.5 Z" />
          <path fill="currentColor" opacity=".9" d="M60 20.6 C 110 16.4, 170 14, 232 13.9 C 236 14, 236.6 15.6, 232.6 15.9 C 176 17.4, 118 19.8, 62 23.2 C 58.6 23.4, 57.8 21, 60 20.6 Z" />
        </svg>
      }
      @case ('logo') {
        <svg viewBox="0 0 120 16" preserveAspectRatio="none">
          <path fill="currentColor" d="M2 13.4 C 28 8.6, 64 5.4, 104 3.6 C 112 3.3, 118 3.4, 117.4 5 C 116.8 6.4, 110 6.4, 100 6.9 C 66 8.6, 32 11.6, 3.6 15.4 C 1.4 15.7, 0.6 13.8, 2 13.4 Z" />
          <path fill="currentColor" opacity=".8" d="M40 11.2 C 60 9.4, 82 8.4, 104 8.2 C 106.4 8.2, 106.4 9.4, 104.2 9.6 C 82 10.4, 62 11.6, 41 13.2 C 38.8 13.4, 38.2 11.4, 40 11.2 Z" />
        </svg>
      }
      @default {
        <svg viewBox="0 0 160 18" preserveAspectRatio="none">
          <path fill="currentColor" d="M3 15.6 C 40 10.4, 88 6.8, 150 4.4 C 155 4.2, 158 4.8, 157 6.1 C 156 7.2, 151 7.3, 146 7.5 C 96 9.6, 50 13, 4.4 17.4 C 1.6 17.7, 0.8 15.9, 3 15.6 Z" />
        </svg>
      }
    }
  `,
  styles: `:host { display: block; line-height: 0; } svg { width: 100%; height: 100%; display: block; overflow: visible; }`,
})
export class SwashComponent {
  readonly variant = input<'name' | 'logo' | 'small'>('small');
}
