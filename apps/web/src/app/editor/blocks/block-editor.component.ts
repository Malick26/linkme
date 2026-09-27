import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from '../../../design-system';
import { MeApi } from '../../core/api/me-api.service';
import type { Block, BlockIcon, BlockInput, BlockItem } from '../../core/api/types';
import { AuthStore } from '../../core/auth/auth.store';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { AudioUploadComponent } from '../shared/audio-upload.component';
import { ImageUploadComponent } from '../shared/image-upload.component';
import { EditorStore } from '../state/editor.store';

const ICONS: BlockIcon[] = ['plane', 'shopping-bag', 'music', 'clapperboard', 'mail', 'link', 'camera', 'heart', 'star', 'map-pin', 'mic', 'book', 'briefcase'];

/** Édition d'un bloc (titre, sous-titre, icône, vignette, URL, canaux de contact) et de ses éléments. */
@Component({
  selector: 'ed-block-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent, ImageUploadComponent, AudioUploadComponent],
  template: `
    @let b = block();
    <div class="ed-stack">
      <div class="ed-grid2">
        <label class="ed-field"><span>{{ 'blocks.field.title' | t }}</span><input [value]="draft().title" maxlength="40" (input)="patch({ title: $any($event.target).value })" /></label>
        <label class="ed-field"><span>{{ 'blocks.field.subtitle' | t }}</span><input [value]="draft().subtitle ?? ''" maxlength="80" (input)="patch({ subtitle: $any($event.target).value })" /></label>
      </div>
      <div class="ed-field">
        <span>{{ 'blocks.field.icon' | t }}</span>
        <div class="icons" role="radiogroup" [attr.aria-label]="'blocks.field.icon' | t">
          @for (ic of icons; track ic) {
            <button type="button" role="radio" class="icons__b" [attr.aria-checked]="draft().icon === ic" [attr.aria-label]="ic" (click)="patch({ icon: ic })"><lm-icon [name]="ic" [size]="20" /></button>
          }
        </div>
      </div>
      <div class="ed-field">
        <span>{{ 'blocks.field.thumbnail' | t }}</span>
        <ed-image-upload kind="thumbnail" [value]="draft().thumbnailImageId" [image]="draft().thumbnailImageId ? store.images()[draft().thumbnailImageId!] : null"
                         [label]="'blocks.field.thumbnail' | t" (uploaded)="store.addImage($event)" (changed)="patch({ thumbnailImageId: $event })" />
      </div>
      @if (b.type !== 'link') {
        <div class="ed-field">
          <span>{{ 'blocks.field.background' | t }}</span>
          <ed-image-upload kind="background" [wide]="true" [value]="draft().backgroundImageId" [image]="draft().backgroundImageId ? store.images()[draft().backgroundImageId!] : null"
                           [label]="'blocks.field.background' | t" (uploaded)="store.addImage($event)" (changed)="patch({ backgroundImageId: $event })" />
          <p class="ed-muted">{{ 'blocks.field.backgroundHint' | t }}</p>
        </div>
      }
      @if (b.type === 'link') {
        <label class="ed-field"><span>{{ 'blocks.field.url' | t }}</span><input type="url" [value]="draft().url ?? ''" (input)="patch({ url: $any($event.target).value || null })" /></label>
      }
      @if (b.type === 'contact') {
        <div class="ed-grid2">
          <label class="ed-field"><span>{{ 'blocks.field.whatsapp' | t }}</span><input type="tel" [value]="draft().config?.whatsapp ?? ''" placeholder="+221770000000" (input)="cfg('whatsapp', $any($event.target).value)" /></label>
          <label class="ed-field"><span>{{ 'blocks.field.email' | t }}</span><input type="email" [value]="draft().config?.email ?? ''" (input)="cfg('email', $any($event.target).value)" /></label>
          <label class="ed-field"><span>{{ 'blocks.field.phone' | t }}</span><input type="tel" [value]="draft().config?.phone ?? ''" (input)="cfg('phone', $any($event.target).value)" /></label>
        </div>
      }
      @if (error()) {
        <p class="ed-error" role="alert">{{ error() }}</p>
      }
      <div class="ed-row">
        <button type="button" class="ed-btn ed-btn--primary" (click)="save()" [disabled]="busy()">{{ (busy() ? 'common.saving' : 'common.save') | t }}</button>
        <button type="button" class="ed-btn" (click)="closed.emit()">{{ 'common.close' | t }}</button>
        <button type="button" class="ed-btn ed-btn--danger" (click)="remove()">{{ (confirmDelete() ? 'ed.confirmDelete' : 'common.delete') | t }}</button>
      </div>

      @if (b.type === 'shop') {
        <p class="ed-muted">{{ 'blocks.shopHint' | t }}</p>
      } @else if (b.type !== 'contact' && b.type !== 'link') {
        <h3 class="items__title">{{ 'blocks.items' | t }}</h3>
        <p class="ed-muted">{{ itemsHint() | t }}</p>
        <ul class="items" role="list">
          @for (it of items(); track it.id; let i = $index) {
            <li class="item">
              <div class="ed-grid2">
                <label class="ed-field"><span>{{ 'blocks.item.title' | t }}</span><input [value]="it.title" maxlength="80" (change)="saveItem(it, { title: $any($event.target).value })" /></label>
                <label class="ed-field"><span>{{ (b.type === 'music' ? 'blocks.item.urlMusic' : b.type === 'travel' ? 'blocks.item.urlTravel' : 'blocks.item.url') | t }}</span>
                  <input type="url" [value]="it.url ?? ''" (change)="saveItem(it, { url: $any($event.target).value || null })" /></label>
              </div>
              <label class="ed-field"><span>{{ 'blocks.item.description' | t }}</span><textarea rows="2" maxlength="500" [value]="it.description ?? ''" (change)="saveItem(it, { description: $any($event.target).value })"></textarea></label>
              @if (b.type === 'music') {
                <label class="ed-field">
                  <span>{{ 'blocks.item.sound' | t }}</span>
                  <ed-audio-upload [value]="it.soundId" [sound]="it.sound" [label]="'blocks.item.sound' | t" (uploaded)="store.addAudio($event)" (changed)="saveItem(it, { soundId: $event })" />
                </label>
              }
              <div class="ed-row">
                <ed-image-upload kind="item" [value]="it.imageId" [image]="it.image" [label]="'blocks.item.image' | t" (uploaded)="store.addImage($event)" (changed)="saveItem(it, { imageId: $event })" />
                <button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="moveItem(i, -1)" [disabled]="i === 0" [attr.aria-label]="'common.moveUp' | t"><lm-icon name="arrow-up" [size]="18" /></button>
                <button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="deleteItem(it)" [attr.aria-label]="'common.delete' | t"><lm-icon name="trash-2" [size]="18" /></button>
              </div>
            </li>
          }
        </ul>
        <button type="button" class="ed-btn" (click)="addItem()"><lm-icon name="plus" [size]="18" />{{ 'blocks.addItem' | t }}</button>
      }
    </div>
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .icons { display: flex; flex-wrap: wrap; gap: 6px; }
    .icons__b { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 10px; border: 1px solid var(--ed-border); background: var(--ed-bg); color: var(--ed-muted); cursor: pointer; }
    .icons__b[aria-checked='true'] { color: var(--ed-text); border-color: var(--ed-accent); }
    .items__title { font-size: 15px; margin: 8px 0 0; }
    .items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
    .item { padding: 12px; border-radius: 12px; border: 1px solid var(--ed-border); display: flex; flex-direction: column; gap: 10px; }
  `,
})
export class BlockEditorComponent implements OnInit {
  readonly block = input.required<Block>();
  readonly closed = output<void>();
  protected readonly store = inject(EditorStore);
  private readonly api = inject(MeApi);
  private readonly auth = inject(AuthStore);
  private readonly i18n = inject(I18n);
  protected readonly icons = ICONS;
  protected readonly draft = signal<BlockInput>({ type: 'link', title: '', visible: true });
  protected readonly items = signal<BlockItem[]>([]);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly confirmDelete = signal(false);

  ngOnInit(): void {
    const b = this.block();
    this.draft.set({
      type: b.type, title: b.title, subtitle: b.subtitle, icon: b.icon, thumbnailImageId: b.thumbnailImageId ?? null,
      backgroundImageId: b.backgroundImageId ?? null, url: b.url ?? null, visible: b.visible, config: b.config ?? {},
    });
    if (!['shop', 'contact', 'link'].includes(b.type)) void firstValueFrom(this.api.items(b.id)).then((l) => this.items.set(l));
  }

  /** Ce qu'on met dans ce bloc, dit dans les mots du créateur. */
  protected itemsHint(): I18nKey {
    return `blocks.itemsHint.${this.block().type === 'music' ? 'music' : this.block().type === 'content' ? 'content' : 'travel'}` as I18nKey;
  }

  protected patch(p: Partial<BlockInput>): void {
    this.draft.update((d) => ({ ...d, ...p }));
  }

  protected cfg(k: 'whatsapp' | 'email' | 'phone', v: string): void {
    this.draft.update((d) => ({ ...d, config: { ...(d.config ?? {}), [k]: v.trim() || undefined } }));
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.store.updateBlock(this.block().id, this.draft());
      this.closed.emit();
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    if (!this.confirmDelete()) return this.confirmDelete.set(true);
    await this.store.deleteBlock(this.block().id);
    this.closed.emit();
  }

  protected async addItem(): Promise<void> {
    await this.auth.ensureCsrf();
    const it = await firstValueFrom(this.api.createItem(this.block().id, { title: this.i18n.t('blocks.addItem') }));
    this.items.update((l) => [...l, it]);
    this.store.setBlockItemCount(this.block().id, this.items().length);
  }

  protected async saveItem(it: BlockItem, patch: Partial<BlockItem>): Promise<void> {
    this.error.set('');
    try {
      await this.auth.ensureCsrf();
      const next = { title: it.title, description: it.description ?? '', url: it.url ?? null, imageId: it.imageId ?? null, soundId: it.soundId ?? null, ...patch };
      const saved = await firstValueFrom(this.api.updateItem(this.block().id, it.id, next));
      this.items.update((l) => l.map((x) => (x.id === it.id ? saved : x)));
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }

  protected async deleteItem(it: BlockItem): Promise<void> {
    await this.auth.ensureCsrf();
    await firstValueFrom(this.api.deleteItem(this.block().id, it.id));
    this.items.update((l) => l.filter((x) => x.id !== it.id));
    this.store.setBlockItemCount(this.block().id, this.items().length);
  }

  protected async moveItem(i: number, d: number): Promise<void> {
    const l = [...this.items()];
    [l[i], l[i + d]] = [l[i + d], l[i]];
    this.items.set(l);
    await this.auth.ensureCsrf();
    this.items.set(await firstValueFrom(this.api.reorderItems(this.block().id, l.map((x) => x.id))));
  }
}
