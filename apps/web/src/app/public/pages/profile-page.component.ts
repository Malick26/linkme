import { ChangeDetectionStrategy, Component, Injector, computed, effect, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { afterNextRender } from '@angular/core';
import { BeaconService } from '../../core/analytics/beacon.service';
import { PublicApi } from '../../core/api/public-api.service';
import { imageSrcset, imageUrl } from '../../core/images/image-url';
import { I18n } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { displayFontFile } from '../../core/theme/fonts';
import { NotFoundComponent } from './not-found.component';
import { PublicPageViewComponent, ViewClick } from '../view/public-page-view.component';
import { usePublicUrl, useResponseStatus } from './page-context';

/** Précharger la police du nom (brief §5.3). Mesuré : voir docs/PROGRESS.md (Lighthouse). */
const PRELOAD_DISPLAY_FONT = false;

/** Route `/{handle}` — page publique SSR. */
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PublicPageViewComponent, NotFoundComponent],
  template: `
    @if (res.error()) {
      <app-not-found />
    } @else if (res.hasValue()) {
      <lm-public-page-view [page]="res.value()" [pageUrl]="url()" (linkClick)="track($event)" />
    }
  `,
})
export class ProfilePageComponent {
  readonly handle = input.required<string>();
  private readonly api = inject(PublicApi);
  private readonly seo = inject(SeoService);
  private readonly beacon = inject(BeaconService);
  private readonly i18n = inject(I18n);
  private readonly setStatus = useResponseStatus();
  private readonly publicUrl = usePublicUrl();

  protected readonly res = rxResource({
    params: () => this.handle().toLowerCase(),
    stream: ({ params }) => this.api.page(params),
  });
  protected readonly url = computed(() => this.publicUrl(`/${this.handle().toLowerCase()}`));

  constructor() {
    effect(() => {
      if (this.res.error()) {
        this.setStatus(404);
        this.seo.set({ title: this.i18n.t('public.notFound.title'), description: this.i18n.t('public.notFound.text'), path: `/${this.handle()}`, noindex: true });
        return;
      }
      if (!this.res.hasValue()) return;
      const page = this.res.value();
      const p = page.profile;
      const bg = page.theme.background.imageId ? page.images[page.theme.background.imageId] : null;
      this.seo.set({
        title: page.seo?.title ?? p.displayName,
        description: page.seo?.description ?? this.i18n.t('public.seo.description', { name: p.displayName, bio: p.bio.replace(/\s+/g, ' ') }),
        image: page.seo?.ogImage ?? imageUrl(bg, 1200),
        path: `/${p.handle}`,
        noindex: page.preview,
      });
      // LCP : image de fond + police du nom préchargées dès le HTML SSR
      if (bg && page.theme.background.type === 'image') {
        this.seo.preload({ as: 'image', href: imageUrl(bg, 1080)!, imagesrcset: imageSrcset(bg, [640, 1080, 1600, 2400]) ?? '', imagesizes: '100vw', fetchpriority: 'high' });
      }
      if (PRELOAD_DISPLAY_FONT) {
        this.seo.preload({ as: 'font', type: 'font/woff2', href: displayFontFile(page.theme.typography.display), crossorigin: 'anonymous' });
      }
    });
    const injector = inject(Injector);
    afterNextRender(() => {
      const stop = effect(() => {
        const page = this.res.hasValue() ? this.res.value() : null;
        if (page && !page.preview) {
          this.beacon.send(page.profile.handle, { type: 'page_view' });
          stop.destroy();
        }
      }, { injector });
    });
  }

  protected track(e: ViewClick): void {
    const page = this.res.hasValue() ? this.res.value() : null;
    if (!page || page.preview) return;
    this.beacon.send(page.profile.handle, { type: 'link_click', blockId: e.blockId ?? null, target: e.target });
  }
}
