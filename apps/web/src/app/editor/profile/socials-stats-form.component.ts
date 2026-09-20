import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { IconComponent, PLATFORM_LABELS } from '../../../design-system';
import type { SocialAccountInput, SocialPlatform } from '../../core/api/types';
import { TPipe } from '../../core/i18n/i18n.service';
import { EditorStore } from '../state/editor.store';

const PLATFORMS: SocialPlatform[] = ['tiktok', 'instagram', 'youtube', 'snapchat', 'x', 'facebook', 'twitch', 'spotify', 'whatsapp'];

/** Réseaux (plateforme, lien, compteur saisi à la main) + stats globales déclaratives (brief §7.2). */
@Component({
  selector: 'ed-socials-stats-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent],
  template: `
    <div class="ed-stack">
      <h2>{{ 'profile.socials' | t }}</h2>
      <p class="ed-muted">{{ 'profile.socialsHint' | t }}</p>
      @for (s of socials(); track $index; let i = $index) {
        <div class="soc">
          <!-- [selected] et non [value] : sur un <select>, Angular pose la valeur avant que les options existent -->
          <select class="ed-input" (change)="update(i, { platform: $any($event.target).value })" [attr.aria-label]="'profile.platform' | t">
            @for (p of platforms; track p) {
              <option [value]="p" [selected]="p === s.platform" [disabled]="taken(p, i)">{{ labels[p] }}</option>
            }
          </select>
          <input class="ed-input" type="url" inputmode="url" [value]="s.url" placeholder="https://" (input)="update(i, { url: $any($event.target).value })" [attr.aria-label]="'profile.url' | t" />
          <input class="ed-input" type="number" min="0" inputmode="numeric" [value]="s.followersCount" (input)="update(i, { followersCount: toInt($any($event.target).value) })" [attr.aria-label]="'profile.followers' | t" />
          <div class="soc__btns">
            <button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="move(i, -1)" [disabled]="i === 0" [attr.aria-label]="'common.moveUp' | t"><lm-icon name="arrow-up" [size]="18" /></button>
            <button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="remove(i)" [attr.aria-label]="'common.delete' | t"><lm-icon name="trash-2" [size]="18" /></button>
          </div>
        </div>
      }
      @if (socials().length < 10) {
        <button type="button" class="ed-btn" (click)="add()"><lm-icon name="plus" [size]="18" />{{ 'profile.addSocial' | t }}</button>
      }

      <h2 class="mt">{{ 'profile.stats' | t }}</h2>
      <div class="ed-grid2">
        <label class="ed-field"><span>{{ 'profile.stats.followers' | t }}</span><input type="number" min="0" inputmode="numeric" [value]="stats().followers" (input)="stat('followers', $any($event.target).value)" data-testid="stat-followers" /></label>
        <label class="ed-field"><span>{{ 'profile.stats.likes' | t }}</span><input type="number" min="0" inputmode="numeric" [value]="stats().likes" (input)="stat('likes', $any($event.target).value)" /></label>
        <label class="ed-field"><span>{{ 'profile.stats.views' | t }}</span><input type="number" min="0" inputmode="numeric" [value]="stats().views30d" (input)="stat('views30d', $any($event.target).value)" /></label>
      </div>
      @if (store.stats()?.updatedAt; as d) {
        <p class="ed-muted">{{ 'profile.stats.updated' | t: { date: fmtDate(d) } }}</p>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .soc { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--ed-border); }
    .soc input[type='url'] { grid-column: 1 / -1; }
    .soc__btns { display: flex; justify-content: flex-end; }
    .mt { margin-top: 16px; }
    @media (min-width: 720px) { .soc { grid-template-columns: 150px 1fr 120px auto; border: 0; padding: 0; } .soc input[type='url'] { grid-column: auto; } }
  `,
})
export class SocialsStatsFormComponent {
  /** Émis à chaque modification : la page parente déclenche l'enregistrement automatique. */
  readonly dirty = output<void>();
  protected readonly store = inject(EditorStore);
  protected readonly platforms = PLATFORMS;
  protected readonly labels = PLATFORM_LABELS;
  readonly socials = signal<SocialAccountInput[]>(this.store.socials().map(({ platform, url, followersCount }) => ({ platform, url, followersCount })));
  readonly stats = signal({
    followers: this.store.stats()?.followers ?? 0,
    likes: this.store.stats()?.likes ?? 0,
    views30d: this.store.stats()?.views30d ?? 0,
  });

  protected toInt(v: string): number {
    const n = Math.max(0, Math.floor(Number(v) || 0));
    return Math.min(n, 10_000_000_000);
  }

  protected fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected taken(p: SocialPlatform, i: number): boolean {
    return this.socials().some((s, k) => k !== i && s.platform === p);
  }

  private sync(list: SocialAccountInput[]): void {
    this.socials.set(list);
    this.store.setSocialsLocal(list);
    this.dirty.emit();
  }

  protected update(i: number, patch: Partial<SocialAccountInput>): void {
    this.sync(this.socials().map((s, k) => (k === i ? { ...s, ...patch } : s)));
  }

  protected add(): void {
    const free = PLATFORMS.find((p) => !this.socials().some((s) => s.platform === p)) ?? 'tiktok';
    this.sync([...this.socials(), { platform: free, url: '', followersCount: 0 }]);
  }

  protected remove(i: number): void {
    this.sync(this.socials().filter((_, k) => k !== i));
  }

  protected move(i: number, d: number): void {
    const l = [...this.socials()];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    this.sync(l);
  }

  protected stat(k: 'followers' | 'likes' | 'views30d', v: string): void {
    this.stats.update((s) => ({ ...s, [k]: this.toInt(v) }));
    this.store.setStatsLocal(this.stats());
    this.dirty.emit();
  }

  /** Enregistre réseaux (liens complets uniquement) + stats. */
  async save(): Promise<void> {
    await this.store.saveSocials(this.socials().filter((s) => s.url.trim()));
    await this.store.saveStats(this.stats());
  }
}
