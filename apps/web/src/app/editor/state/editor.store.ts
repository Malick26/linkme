import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { MeApi } from '../../core/api/me-api.service';
import type {
  Audio, Block, BlockInput, Image, Profile, ProfileStats, ProfileUpdate, PublicPage, SocialAccount, SocialAccountInput, ThemeConfig, ThemeState,
} from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { presetConfig } from '../../core/theme/presets';

const HISTORY_LIMIT = 60;

/**
 * État de l'éditeur : copie locale du profil, des réseaux, des stats, des blocs et du thème (brouillon).
 * `previewPage` reconstruit en continu la page à partir de cet état → aperçu live instantané, rendu par le même
 * composant que la page publique (ADR 0001).
 */
@Injectable({ providedIn: 'root' })
export class EditorStore {
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);

  readonly loading = signal(true);
  readonly profile = signal<Profile | null>(null);
  readonly socials = signal<SocialAccount[]>([]);
  readonly stats = signal<ProfileStats | null>(null);
  readonly blocks = signal<Block[]>([]);
  readonly themeState = signal<ThemeState | null>(null);
  readonly theme = signal<ThemeConfig>(presetConfig('sunset'));
  readonly images = signal<Record<string, Image>>({});
  /** Cache des sons uploadés (D50), par id — même rôle que {@link images} pour les items de bloc « sons ». */
  readonly sounds = signal<Record<string, Audio>>({});
  readonly saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  private readonly past = signal<ThemeConfig[]>([]);
  private readonly future = signal<ThemeConfig[]>([]);
  readonly canUndo = computed(() => this.past().length > 0);
  readonly canRedo = computed(() => this.future().length > 0);
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  readonly hasUnpublishedChanges = computed(() => {
    const st = this.themeState();
    return !st?.published || JSON.stringify(st.published) !== JSON.stringify(this.theme()) || !this.auth.me()?.published;
  });

  /** Page reconstruite localement pour l'aperçu. */
  readonly previewPage = computed<PublicPage | null>(() => {
    const p = this.profile();
    if (!p) return null;
    const theme = structuredClone(this.theme());
    if (!theme.background.imageId && p.backgroundImageId) theme.background.imageId = p.backgroundImageId;
    return {
      profile: { handle: p.handle, displayName: p.displayName, taglineLines: p.taglineLines, categories: p.categories, bio: p.bio },
      stats: this.stats(),
      socials: this.socials().map(({ platform, url, followersCount }) => ({ platform, url, followersCount })),
      blocks: this.blocks()
        .filter((b) => b.visible)
        .map((b) => ({ ...b, thumbnail: b.thumbnailImageId ? (this.images()[b.thumbnailImageId] ?? b.thumbnail ?? null) : null })),
      theme,
      images: this.images(),
      showBranding: p.plan !== 'boutique',
      preview: false,
    };
  });

  async load(): Promise<void> {
    this.loading.set(true);
    const r = await firstValueFrom(
      forkJoin({ preview: this.api.preview(), profile: this.api.profile(), socials: this.api.socials(), stats: this.api.stats(), blocks: this.api.blocks(), theme: this.api.theme() }),
    );
    const images: Record<string, Image> = { ...r.preview.images };
    if (r.profile.backgroundImage && r.profile.backgroundImageId) images[r.profile.backgroundImageId] = r.profile.backgroundImage;
    for (const b of r.blocks) if (b.thumbnail && b.thumbnailImageId) images[b.thumbnailImageId] = b.thumbnail;
    this.images.set(images);
    this.profile.set(r.profile);
    this.socials.set(r.socials);
    this.stats.set(r.stats);
    this.blocks.set(r.blocks);
    this.themeState.set(r.theme);
    this.theme.set(r.theme.draft);
    this.past.set([]);
    this.future.set([]);
    this.loading.set(false);
  }

  addImage(img: Image): void {
    this.images.update((m) => ({ ...m, [img.id]: img }));
  }

  addAudio(sound: Audio): void {
    this.sounds.update((m) => ({ ...m, [sound.id]: sound }));
  }

  // ───────────── profil
  async saveProfile(update: ProfileUpdate): Promise<void> {
    await this.auth.ensureCsrf();
    const p = await firstValueFrom(this.api.updateProfile(update));
    if (p.backgroundImage && p.backgroundImageId) this.addImage(p.backgroundImage);
    this.profile.set(p);
    this.auth.patch({ displayName: p.displayName, onboardingCompleted: p.onboardingCompleted ?? false, published: p.published });
  }

  /** Mise à jour locale (aperçu live pendant la saisie), sans appel serveur. */
  patchProfileLocal(p: Partial<Profile>): void {
    const cur = this.profile();
    if (cur) this.profile.set({ ...cur, ...p });
  }

  async saveSocials(items: SocialAccountInput[]): Promise<void> {
    await this.auth.ensureCsrf();
    this.socials.set(await firstValueFrom(this.api.updateSocials(items)));
  }

  setSocialsLocal(items: SocialAccountInput[]): void {
    this.socials.set(items.map((s, i) => ({ ...s, id: `local-${i}`, position: i, updatedAt: new Date().toISOString() })));
  }

  async saveStats(s: { followers: number; likes: number; views30d: number }): Promise<void> {
    await this.auth.ensureCsrf();
    this.stats.set(await firstValueFrom(this.api.updateStats(s)));
  }

  setStatsLocal(s: { followers: number; likes: number; views30d: number }): void {
    this.stats.set({ ...s, updatedAt: this.stats()?.updatedAt ?? null });
  }

  // ───────────── blocs
  async createBlock(input: BlockInput): Promise<Block> {
    await this.auth.ensureCsrf();
    const b = await firstValueFrom(this.api.createBlock(input));
    this.blocks.update((l) => [...l, b]);
    return b;
  }

  async updateBlock(id: string, input: BlockInput): Promise<Block> {
    await this.auth.ensureCsrf();
    const b = await firstValueFrom(this.api.updateBlock(id, input));
    if (b.thumbnail && b.thumbnailImageId) this.addImage(b.thumbnail);
    this.blocks.update((l) => l.map((x) => (x.id === id ? b : x)));
    return b;
  }

  async deleteBlock(id: string): Promise<void> {
    await this.auth.ensureCsrf();
    await firstValueFrom(this.api.deleteBlock(id));
    this.blocks.update((l) => l.filter((x) => x.id !== id).map((x, i) => ({ ...x, position: i })));
  }

  /** Garde à jour le « n éléments » de la liste quand on ajoute ou retire un élément dans l'éditeur. */
  setBlockItemCount(id: string, itemCount: number): void {
    this.blocks.update((l) => l.map((b) => (b.id === id ? { ...b, itemCount } : b)));
  }

  async reorderBlocks(ids: string[]): Promise<void> {
    const byId = new Map(this.blocks().map((b) => [b.id, b]));
    this.blocks.set(ids.map((id, i) => ({ ...byId.get(id)!, position: i }))); // optimiste
    await this.auth.ensureCsrf();
    this.blocks.set(await firstValueFrom(this.api.reorderBlocks(ids)));
  }

  // ───────────── thème (brouillon + annuler/rétablir + sauvegarde automatique)
  setTheme(next: ThemeConfig, opts: { record?: boolean } = {}): void {
    const cur = this.theme();
    if (JSON.stringify(cur) === JSON.stringify(next)) return;
    if (opts.record !== false) {
      this.past.update((p) => [...p.slice(-HISTORY_LIMIT + 1), cur]);
      this.future.set([]);
    }
    this.theme.set(next);
    this.scheduleSave();
  }

  updateTheme(mutate: (t: ThemeConfig) => void): void {
    const next = structuredClone(this.theme());
    mutate(next);
    if (next.preset !== 'custom' && JSON.stringify(next) !== JSON.stringify(this.theme())) {
      const onlyPreset = JSON.stringify({ ...next, preset: '' }) === JSON.stringify({ ...presetConfig(next.preset), preset: '' });
      if (!onlyPreset) next.preset = 'custom';
    }
    this.setTheme(next);
  }

  undo(): void {
    const p = this.past();
    if (!p.length) return;
    this.future.update((f) => [this.theme(), ...f]);
    this.past.set(p.slice(0, -1));
    this.theme.set(p[p.length - 1]);
    this.scheduleSave();
  }

  redo(): void {
    const f = this.future();
    if (!f.length) return;
    this.past.update((p) => [...p, this.theme()]);
    this.future.set(f.slice(1));
    this.theme.set(f[0]);
    this.scheduleSave();
  }

  applyPreset(id: string): void {
    const cfg = presetConfig(id);
    // on conserve l'image de fond du créateur
    cfg.background.imageId = this.theme().background.imageId ?? null;
    if (cfg.background.type === 'image' && !cfg.background.imageId && !this.profile()?.backgroundImageId) cfg.background.type = 'gradient';
    this.setTheme(cfg);
  }

  resetToPreset(): void {
    const id = this.theme().preset === 'custom' ? 'sunset' : this.theme().preset;
    this.applyPreset(id);
  }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer);
    this.saveState.set('saving');
    this.saveTimer = setTimeout(() => void this.saveThemeNow(), 700);
  }

  async saveThemeNow(): Promise<void> {
    clearTimeout(this.saveTimer);
    try {
      await this.auth.ensureCsrf();
      this.themeState.set(await firstValueFrom(this.api.saveTheme(this.theme())));
      this.saveState.set('saved');
    } catch {
      this.saveState.set('error');
    }
  }

  async publish(): Promise<void> {
    await this.saveThemeNow();
    this.themeState.set(await firstValueFrom(this.api.publishTheme()));
    this.auth.patch({ published: true });
    const p = this.profile();
    if (p) this.profile.set({ ...p, published: true });
  }
}
