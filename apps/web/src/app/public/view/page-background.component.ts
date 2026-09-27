import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Image, ThemeConfig } from '../../core/api/types';
import { imageSrcset, imageUrl } from '../../core/images/image-url';

/**
 * Fond plein cadre (photo `object-fit: cover` + point focal, ou dégradé/couleur) + overlay dégradé + voile héros.
 * `fixed` sur la page publique ; `sticky` dans l'aperçu embarqué de l'éditeur.
 */
@Component({
  selector: 'lm-page-background',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pbg', 'aria-hidden': 'true' },
  template: `
    @if (src()) {
      <img
        class="pbg__img"
        [src]="src()"
        [attr.srcset]="srcset()"
        sizes="100vw"
        alt=""
        fetchpriority="high"
        decoding="async"
        [attr.width]="image()?.width"
        [attr.height]="image()?.height"
        [style.background-image]="placeholder()"
      />
    }
    <div class="pbg__overlay"></div>
    <div class="pbg__scrim"></div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 0; overflow: hidden; background: var(--lm-bg); pointer-events: none; }
    :host-context(.lm-page--embedded) { position: sticky; top: 0; display: block; height: 100cqb; margin-bottom: -100cqb; z-index: 0; }
    .pbg__img {
      width: 100%; height: 100%; object-fit: cover; object-position: var(--lm-bg-focal);
      filter: blur(var(--lm-bg-blur)); transform: scale(1.02);
      background-size: cover; background-position: var(--lm-bg-focal);
    }
    .pbg__overlay, .pbg__scrim { position: absolute; inset: 0; }
    .pbg__overlay { background: var(--lm-overlay-gradient); }
    .pbg__scrim { background: var(--lm-hero-scrim), var(--lm-bg-side, linear-gradient(transparent, transparent)); }
  `,
})
export class PageBackgroundComponent {
  readonly theme = input.required<ThemeConfig>();
  readonly image = input<Image | null>();
  /** Bloc « sons »/« voyages » avec sa propre image de fond (D50) : affichée même si le thème du profil n'est pas en mode image. */
  readonly forceImage = input(false);
  protected readonly src = computed(() => (this.forceImage() || this.theme().background.type === 'image' ? imageUrl(this.image(), 1080) : null));
  protected readonly srcset = computed(() => imageSrcset(this.image(), [640, 1080, 1600, 2400]));
  protected readonly placeholder = computed(() => {
    const p = this.image()?.placeholder;
    return p?.startsWith('data:image/') ? `url("${p}")` : null;
  });
}
