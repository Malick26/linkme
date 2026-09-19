import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProfileStats } from '../../app/core/api/types';
import { compactNumber } from '../../app/core/format/compact-number';
import { TPipe } from '../../app/core/i18n/i18n.service';

/** Bandeau de stats : 3 colonnes, séparateurs verticaux fins, halo bleu arrondi derrière la 1re (maquette §5.1-8). */
@Component({
  selector: 'lm-stats-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    <dl class="st">
      <div class="st__cell st__cell--glow">
        <dt class="st__label">{{ 'public.stats.followers' | t }}</dt>
        <dd class="st__value">{{ f().followers }}</dd>
      </div>
      <div class="st__cell">
        <dt class="st__label">{{ 'public.stats.likes' | t }}</dt>
        <dd class="st__value">{{ f().likes }}</dd>
      </div>
      <div class="st__cell">
        <dt class="st__label">{{ 'public.stats.views' | t }}</dt>
        <dd class="st__value">{{ f().views }}</dd>
      </div>
    </dl>
  `,
  styles: `
    :host { display: block; }
    .st { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; max-width: 380px; }
    .st__cell { position: relative; display: flex; flex-direction: column-reverse; align-items: center; gap: 4px; padding: 12px 4px; }
    .st__cell + .st__cell::before {
      content: ''; position: absolute; left: 0; top: 50%; height: 46px; transform: translateY(-50%);
      border-left: 1px solid var(--lm-hairline);
    }
    .st__cell--glow::after {
      content: ''; position: absolute; inset: -2px 2px; z-index: -1; border-radius: 24px;
      background: radial-gradient(ellipse at 50% 50%, var(--lm-stat-glow), transparent 75%), var(--lm-stat-glow);
      filter: blur(6px);
    }
    .st__value { margin: 0; font-size: var(--lm-fs-stat); font-weight: 600; line-height: 1.05; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
    .st__label { font-size: var(--lm-fs-stat-label); color: var(--lm-text-muted); white-space: nowrap; }
  `,
  host: { style: 'position: relative; isolation: isolate' },
})
export class StatsRowComponent {
  readonly stats = input.required<ProfileStats>();
  protected readonly f = computed(() => ({
    followers: compactNumber(this.stats().followers),
    likes: compactNumber(this.stats().likes),
    views: compactNumber(this.stats().views30d),
  }));
}
