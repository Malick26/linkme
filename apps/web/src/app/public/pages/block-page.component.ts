import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { GlassCardComponent, IconComponent } from '../../../design-system';
import { BeaconService } from '../../core/analytics/beacon.service';
import type { BlockItem } from '../../core/api/types';
import { PublicApi } from '../../core/api/public-api.service';
import { formatXof } from '../../core/format/compact-number';
import { imageUrl } from '../../core/images/image-url';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { SeoService } from '../../core/seo/seo.service';
import { BlockShellComponent } from '../view/block-shell.component';
import { ContactFormComponent } from './contact-form.component';
import { NotFoundComponent } from './not-found.component';
import { useResponseStatus } from './page-context';

const EMBED_ALLOW = [
  /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{6,20}$/,
  /^https:\/\/open\.spotify\.com\/embed\/(playlist|track|album|episode|show|artist)\/[A-Za-z0-9]{10,40}$/,
];

/** Route `/{handle}/{slug}` — détail d'un bloc (liste d'éléments, boutique ou contact). */
@Component({
  selector: 'app-block-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BlockShellComponent, GlassCardComponent, IconComponent, RouterLink, TPipe, NgTemplateOutlet, ContactFormComponent, NotFoundComponent],
  templateUrl: './block-page.component.html',
  styleUrl: './block-page.component.scss',
})
export class BlockPageComponent {
  readonly handle = input.required<string>();
  readonly slug = input.required<string>();
  private readonly api = inject(PublicApi);
  private readonly seo = inject(SeoService);
  private readonly i18n = inject(I18n);
  private readonly beacon = inject(BeaconService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly setStatus = useResponseStatus();

  protected readonly page = rxResource({ params: () => this.handle().toLowerCase(), stream: ({ params }) => this.api.page(params) });
  protected readonly detail = rxResource({
    params: () => ({ h: this.handle().toLowerCase(), s: this.slug().toLowerCase() }),
    stream: ({ params }) => this.api.block(params.h, params.s),
  });
  protected readonly failed = computed(() => !!this.page.error() || !!this.detail.error());
  protected readonly formatXof = formatXof;
  protected readonly imageUrl = imageUrl;

  constructor() {
    effect(() => {
      if (this.failed()) {
        this.setStatus(404);
        return;
      }
      const p = this.page.hasValue() ? this.page.value() : null;
      const d = this.detail.hasValue() ? this.detail.value() : null;
      if (!p || !d) return;
      this.seo.set({
        title: `${d.block.title} — ${p.profile.displayName}`,
        description: d.block.subtitle || p.profile.bio,
        image: imageUrl(d.block.thumbnail ?? null, 1200),
        path: `/${p.profile.handle}/${d.block.slug}`,
      });
    });
  }

  protected embedUrl(item: BlockItem): SafeResourceUrl | null {
    const src = item.embed?.src;
    if (!src || !EMBED_ALLOW.some((re) => re.test(src))) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(src);
  }

  protected isSpotify(item: BlockItem): boolean {
    return item.embed?.provider === 'spotify';
  }

  /** Élément dont la façade a été cliquée : lui seul charge son iframe. */
  protected readonly playing = signal<string | null>(null);

  protected play(item: BlockItem): void {
    this.playing.set(item.id);
    this.click(item);
  }

  /** Pluriel simple (fr/en) : une clé « .one », une clé « .other ». */
  protected plural(base: 'public.block.count', n: number): I18nKey {
    return `${base}.${n <= 1 ? 'one' : 'other'}` as I18nKey;
  }

  protected providerName(item: BlockItem): string {
    return item.embed?.provider === 'spotify' ? 'Spotify' : item.embed?.provider === 'youtube' ? 'YouTube' : '';
  }

  protected linkLabel(item: BlockItem): I18nKey {
    if (item.embed?.provider === 'spotify') return 'public.block.listenOn';
    if (item.embed?.provider === 'youtube') return 'public.block.watchOn';
    return 'public.block.open';
  }

  protected click(item: BlockItem): void {
    const d = this.detail.hasValue() ? this.detail.value() : null;
    if (d) this.beacon.send(this.handle(), { type: 'link_click', blockId: d.block.id, target: `item:${item.id}`.slice(0, 64) });
  }

}
