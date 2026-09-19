import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal, viewChild,
} from '@angular/core';
import { IconComponent } from '../../../design-system';
import type { PublicPage } from '../../core/api/types';
import { TPipe } from '../../core/i18n/i18n.service';
import { PublicPageViewComponent } from '../../public/view/public-page-view.component';

type Device = 'mobile' | 'tablet' | 'desktop';
const SIZES: Record<Device, { w: number; h: number }> = { mobile: { w: 390, h: 844 }, tablet: { w: 768, h: 1024 }, desktop: { w: 1280, h: 800 } };

/**
 * Aperçu live : rend le **même** composant que la page publique (ADR 0001) dans un cadre à la taille d'un appareil
 * (container queries `lm`, D29), mis à l'échelle pour tenir dans la colonne.
 */
@Component({
  selector: 'ed-preview-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PublicPageViewComponent, IconComponent, TPipe],
  template: `
    <div class="pf__bar" role="group" [attr.aria-label]="'ed.preview' | t">
      @for (d of devices; track d.id) {
        <button type="button" class="pf__dev" [attr.aria-pressed]="device() === d.id" (click)="device.set(d.id)" [attr.aria-label]="d.label | t">
          <lm-icon [name]="d.icon" [size]="18" />
        </button>
      }
    </div>
    <div class="pf__stage" #stage [style.height.px]="size().h * scale()">
      <div class="pf__frame" [style.width.px]="size().w" [style.height.px]="size().h" [style.transform]="'scale(' + scale() + ')'" data-testid="preview-frame">
        @if (page(); as p) {
          <lm-public-page-view [page]="p" [embedded]="true" [pageUrl]="''" />
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .pf__bar { display: flex; justify-content: center; gap: 4px; margin-bottom: 10px; }
    .pf__dev { display: grid; place-items: center; width: 44px; height: 36px; border-radius: 10px; border: 1px solid var(--ed-border); background: var(--ed-panel); color: var(--ed-muted); cursor: pointer; }
    .pf__dev[aria-pressed='true'] { color: var(--ed-text); border-color: var(--ed-accent); }
    .pf__stage { position: relative; width: 100%; overflow: hidden; display: flex; justify-content: center; }
    .pf__frame {
      position: absolute; top: 0; transform-origin: top center; overflow-y: auto; overflow-x: hidden;
      border-radius: 28px; border: 1px solid var(--ed-border); background: var(--ed-bg);
      container: lm / size; overscroll-behavior: contain;
    }
  `,
})
export class PreviewFrameComponent {
  readonly page = input<PublicPage | null>(null);
  protected readonly device = signal<Device>('mobile');
  protected readonly devices = [
    { id: 'mobile' as const, icon: 'smartphone', label: 'ed.device.mobile' as const },
    { id: 'tablet' as const, icon: 'tablet', label: 'ed.device.tablet' as const },
    { id: 'desktop' as const, icon: 'monitor', label: 'ed.device.desktop' as const },
  ];
  protected readonly size = computed(() => SIZES[this.device()]);
  private readonly available = signal(400);
  private readonly maxHeight = signal(760);
  protected readonly scale = computed(() => Math.min(1, this.available() / this.size().w, this.maxHeight() / this.size().h));
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.stage().nativeElement;
      const measure = () => {
        this.available.set(el.clientWidth || 400);
        this.maxHeight.set(Math.max(420, window.innerHeight - 170));
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      window.addEventListener('resize', measure);
      destroyRef.onDestroy(() => {
        ro.disconnect();
        window.removeEventListener('resize', measure);
      });
    });
  }
}
