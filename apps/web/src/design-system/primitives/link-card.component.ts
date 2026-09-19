import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import type { Image } from '../../app/core/api/types';
import { imageSrcset, imageUrl } from '../../app/core/images/image-url';
import { IconComponent } from '../icons/icon.component';

export type CardLink = { kind: 'route'; commands: string[] } | { kind: 'url'; href: string };

/**
 * Carte de lien (maquette §5.1-10) : vignette pleine hauteur → icône outline → titre + sous-titre → bouton flèche.
 * C'est un vrai <a> (a11y). Styles 100 % tokens.
 */
@Component({
  selector: 'lm-link-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, RouterLink, NgTemplateOutlet],
  host: { class: 'lm-link-card-host', '[style.--i]': 'index()' },
  template: `
    @let l = link();
    @if (l.kind === 'route') {
      <a class="lc" [routerLink]="l.commands" (click)="activate.emit()">
        <ng-container *ngTemplateOutlet="body" />
      </a>
    } @else {
      <a class="lc" [href]="l.href" target="_blank" rel="noopener noreferrer" (click)="activate.emit()">
        <ng-container *ngTemplateOutlet="body" />
      </a>
    }
    <ng-template #body>
      @if (thumbSrc()) {
        <span class="lc__thumb">
          <img [src]="thumbSrc()" [attr.srcset]="thumbSrcset()" sizes="120px" alt="" width="112" height="92" loading="lazy" decoding="async" [style.background]="thumbnail()?.placeholder?.startsWith('data:') ? 'center/cover url(' + thumbnail()?.placeholder + ')' : null" />
        </span>
      }
      @if (icon()) {
        <lm-icon class="lc__icon" [name]="icon()!" [size]="22" />
      }
      <span class="lc__text">
        <span class="lc__title">{{ title() }}</span>
        @if (subtitle()) {
          <span class="lc__sub">{{ subtitle() }}</span>
        }
      </span>
      <span class="lc__arrow"><lm-icon name="arrow-right" [size]="18" [strokeWidth]="1.6" /></span>
    </ng-template>
  `,
  styleUrl: './link-card.component.scss',
})
export class LinkCardComponent {
  readonly link = input.required<CardLink>();
  readonly title = input.required<string>();
  readonly subtitle = input<string | null | undefined>();
  readonly icon = input<string | null | undefined>();
  readonly thumbnail = input<Image | null | undefined>();
  readonly showThumbnail = input(true);
  readonly index = input(0);
  readonly activate = output<void>();

  protected readonly thumbSrc = computed(() => (this.showThumbnail() ? imageUrl(this.thumbnail(), 240) : null));
  protected readonly thumbSrcset = computed(() => (this.showThumbnail() ? imageSrcset(this.thumbnail(), [240, 480]) : null));
}
