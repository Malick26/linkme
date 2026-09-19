import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import type { PublicSocial } from '../../app/core/api/types';
import { compactNumber } from '../../app/core/format/compact-number';
import { I18n } from '../../app/core/i18n/i18n.service';
import { IconComponent } from '../icons/icon.component';

export const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', snapchat: 'Snapchat', x: 'X',
  facebook: 'Facebook', linkedin: 'LinkedIn', twitch: 'Twitch', spotify: 'Spotify', whatsapp: 'WhatsApp',
};

/** Rail social vertical : boutons ronds en verre sombre + compteur à droite (maquette §5.1-9). */
@Component({
  selector: 'lm-social-rail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'lm-social-rail', '[class.lm-social-rail--row]': 'orientation() === "row"' },
  template: `
    <ul class="sr" role="list">
      @for (s of items(); track s.platform) {
        <li>
          <a class="sr__item" [href]="s.url" target="_blank" rel="noopener noreferrer me" [attr.aria-label]="s.label" (click)="activate.emit(s.platform)">
            <span class="sr__btn"><lm-icon [name]="s.icon" [size]="s.iconSize" /></span>
            @if (showCounts()) {
              <span class="sr__count" aria-hidden="true">{{ s.count }}</span>
            }
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    :host { display: block; }
    .sr { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--lm-social-gap); }
    :host(.lm-social-rail--row) .sr { flex-direction: row; flex-wrap: wrap; gap: 10px 16px; }
    .sr__item { display: flex; align-items: center; gap: 10px; min-height: var(--lm-touch); color: var(--lm-text); text-decoration: none; border-radius: 999px; -webkit-tap-highlight-color: transparent; }
    .sr__item:focus-visible { outline: none; }
    .sr__item:focus-visible .sr__btn { box-shadow: var(--lm-focus-ring); }
    .sr__btn {
      display: grid; place-items: center; flex: none;
      width: var(--lm-social-size); height: var(--lm-social-size);
      border-radius: var(--lm-social-radius);
      background: var(--lm-control-bg);
      border: 1px solid var(--lm-card-border);
      -webkit-backdrop-filter: blur(14px) saturate(1.2);
      backdrop-filter: blur(14px) saturate(1.2);
      box-shadow: 0 6px 18px var(--lm-shadow-text);
      transition: transform .18s var(--lm-ease);
    }
    @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .sr__btn { background: var(--lm-surface-strong); } }
    .sr__item:active .sr__btn { transform: scale(.94); }
    .sr__count { font-size: var(--lm-fs-social-count); font-weight: 500; min-width: 3ch; font-variant-numeric: tabular-nums; text-shadow: 0 1px 8px var(--lm-shadow-text); }
  `,
})
export class SocialRailComponent {
  readonly socials = input.required<PublicSocial[]>();
  readonly showCounts = input(true);
  readonly orientation = input<'column' | 'row'>('column');
  readonly activate = output<string>();
  private readonly i18n = inject(I18n);

  protected readonly items = computed(() =>
    this.socials().map((s) => {
      const name = PLATFORM_LABELS[s.platform] ?? s.platform;
      const count = compactNumber(s.followersCount);
      return {
        ...s,
        icon: `brand-${s.platform}`,
        iconSize: s.platform === 'x' ? 18 : 22,
        count,
        label: this.i18n.t('public.social.label', { platform: name, count }),
      };
    }),
  );
}
