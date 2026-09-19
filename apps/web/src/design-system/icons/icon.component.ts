import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICONS } from './icon-registry';

/**
 * Icône SVG inline (Lucide outline / Simple Icons). Le contenu provient exclusivement du registre statique
 * généré (jamais de donnée utilisateur) → contournement du sanitizer sûr. Couleur = currentColor.
 */
@Component({
  selector: 'lm-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lm-icon', '[style.width.px]': 'size()', '[style.height.px]': 'size()', 'aria-hidden': 'true' },
  template: `<span class="lm-icon__svg" [innerHTML]="svg()"></span>`,
  styles: `
    :host { display: inline-flex; flex: none; line-height: 0; }
    .lm-icon__svg, .lm-icon__svg ::ng-deep svg { width: 100%; height: 100%; display: block; }
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(22);
  readonly strokeWidth = input(1.75);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly svg = computed<SafeHtml>(() => {
    const def = ICONS[this.name()] ?? ICONS['link'];
    const attrs =
      def.kind === 'stroke'
        ? `fill="none" stroke="currentColor" stroke-width="${this.strokeWidth()}" stroke-linecap="round" stroke-linejoin="round"`
        : `fill="currentColor"`;
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${attrs} focusable="false">${def.body}</svg>`,
    );
  });
}
