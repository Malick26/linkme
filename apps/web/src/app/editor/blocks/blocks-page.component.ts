import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IconComponent } from '../../../design-system';
import type { Block, BlockType } from '../../core/api/types';
import { toProblem } from '../../core/http/problem';
import type { I18nKey } from '../../core/i18n/fr';
import { I18n, TPipe } from '../../core/i18n/i18n.service';
import { PreviewFrameComponent } from '../shared/preview-frame.component';
import { EditorStore } from '../state/editor.store';
import { BlockEditorComponent } from './block-editor.component';

const TYPES: BlockType[] = ['travel', 'shop', 'music', 'content', 'contact', 'link'];
const DEFAULT_ICON: Record<BlockType, string> = { travel: 'plane', shop: 'shopping-bag', music: 'music', content: 'clapperboard', contact: 'mail', link: 'link' };

/** Blocs : réordonner par glisser-déposer (CDK) ou au clavier, masquer/afficher, éditer, ajouter (brief §6.2, §7.3). */
@Component({
  selector: 'app-blocks-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, IconComponent, CdkDropList, CdkDrag, CdkDragHandle, PreviewFrameComponent, BlockEditorComponent],
  template: `
    @if (!store.loading()) {
      <div class="split" [attr.data-tab]="tab()">
        <div class="split__tabs" role="tablist">
          <button role="tab" [attr.aria-selected]="tab() === 'edit'" (click)="tab.set('edit')">{{ 'ed.tabEdit' | t }}</button>
          <button role="tab" [attr.aria-selected]="tab() === 'preview'" (click)="tab.set('preview')">{{ 'ed.tabPreview' | t }}</button>
        </div>
        <div class="split__edit">
          <div class="split__head"><h1>{{ 'blocks.title' | t }}</h1></div>
          <p class="ed-muted">{{ 'blocks.hint2' | t }}</p>
          <p class="ed-muted">{{ 'blocks.hint' | t }}</p>
          @if (error()) {
            <p class="ed-error" role="alert">{{ error() }}</p>
          }
          <ul class="bl" role="list" cdkDropList (cdkDropListDropped)="drop($event)">
            @for (b of store.blocks(); track b.id; let i = $index; let last = $last) {
              <li class="bl__item ed-card" cdkDrag [cdkDragData]="b" [class.bl__item--hidden]="!b.visible">
                <div class="bl__row">
                  <button type="button" class="bl__handle" cdkDragHandle [attr.aria-label]="b.title"><lm-icon name="grip-vertical" [size]="20" /></button>
                  <lm-icon class="bl__icon" [name]="b.icon ?? 'link'" [size]="20" />
                  <button type="button" class="bl__text" (click)="toggleOpen(b.id)" [attr.aria-expanded]="open() === b.id" [attr.aria-label]="('blocks.edit' | t) + ' : ' + b.title">
                    <strong>{{ b.title }}</strong>
                    <span class="ed-muted">{{ typeKey(b.type) | t }} · {{ summary(b) | t: { n: b.itemCount ?? 0 } }}</span>
                  </button>
                  <button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="move(i, -1)" [disabled]="i === 0" [attr.aria-label]="('common.moveUp' | t) + ' : ' + b.title"><lm-icon name="arrow-up" [size]="18" /></button>
                  <button type="button" class="ed-btn ed-btn--icon ed-btn--ghost" (click)="move(i, 1)" [disabled]="last" [attr.aria-label]="('common.moveDown' | t) + ' : ' + b.title"><lm-icon name="arrow-down" [size]="18" /></button>
                  <label class="ed-switch" [title]="(b.visible ? 'blocks.visible' : 'blocks.hidden') | t">
                    <input type="checkbox" [checked]="b.visible" (change)="toggle(b)" [attr.aria-label]="(b.visible ? 'blocks.visible' : 'blocks.hidden') + ' ' + b.title" />
                  </label>
                  <button type="button" class="ed-btn bl__edit" (click)="toggleOpen(b.id)" [attr.aria-expanded]="open() === b.id" [attr.aria-label]="('blocks.edit' | t) + ' : ' + b.title">
                    <lm-icon [name]="open() === b.id ? 'x' : 'pencil'" [size]="18" />
                    <span>{{ (open() === b.id ? 'blocks.close' : 'common.edit') | t }}</span>
                  </button>
                </div>
                @if (open() === b.id) {
                  <div class="bl__editor"><ed-block-editor [block]="b" (closed)="open.set(null)" /></div>
                }
              </li>
            }
          </ul>
          <p class="lm-sr-only" aria-live="polite">{{ announce() }}</p>
          <div class="ed-card">
            <h2>{{ 'blocks.add' | t }}</h2>
            <div class="add">
              @for (tp of types; track tp) {
                <button type="button" class="ed-btn" (click)="add(tp)"><lm-icon [name]="defaultIcon[tp]" [size]="18" />{{ typeKey(tp) | t }}</button>
              }
            </div>
          </div>
        </div>
        <aside class="split__preview"><ed-preview-frame [page]="store.previewPage()" /></aside>
      </div>
    }
  `,
  styleUrls: ['../shared/split-layout.scss', './blocks-page.component.scss'],
})
export class BlocksPageComponent {
  protected readonly store = inject(EditorStore);
  private readonly i18n = inject(I18n);
  protected readonly tab = signal<'edit' | 'preview'>('edit');
  protected readonly open = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly announce = signal('');
  protected readonly types = TYPES;
  protected readonly defaultIcon = DEFAULT_ICON;

  protected typeKey(t: BlockType): I18nKey {
    return `blocks.type.${t}` as I18nKey;
  }

  /** Ce que contient le bloc, dit en clair sous son titre. */
  protected summary(b: Block): I18nKey {
    if (b.type === 'shop') return 'blocks.countShop';
    if (b.type === 'contact') return 'blocks.countContact';
    if (b.type === 'link') return 'blocks.countLink';
    const n = b.itemCount ?? 0;
    return n === 0 ? 'blocks.countEmpty' : n === 1 ? 'blocks.count.one' : 'blocks.count.other';
  }

  protected toggleOpen(id: string): void {
    this.open.set(this.open() === id ? null : id);
  }

  protected async drop(e: CdkDragDrop<Block[]>): Promise<void> {
    if (e.previousIndex === e.currentIndex) return;
    const ids = this.store.blocks().map((b) => b.id);
    moveItemInArray(ids, e.previousIndex, e.currentIndex);
    await this.persist(ids, e.currentIndex);
  }

  protected async move(i: number, d: number): Promise<void> {
    const ids = this.store.blocks().map((b) => b.id);
    moveItemInArray(ids, i, i + d);
    await this.persist(ids, i + d);
  }

  private async persist(ids: string[], newIndex: number): Promise<void> {
    this.error.set('');
    try {
      await this.store.reorderBlocks(ids);
      const b = this.store.blocks()[newIndex];
      this.announce.set(this.i18n.t('blocks.moved', { title: b.title, n: newIndex + 1 }));
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }

  protected async toggle(b: Block): Promise<void> {
    try {
      await this.store.updateBlock(b.id, { type: b.type, title: b.title, subtitle: b.subtitle, icon: b.icon, thumbnailImageId: b.thumbnailImageId ?? null, url: b.url ?? null, config: b.config, visible: !b.visible });
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }

  protected async add(type: BlockType): Promise<void> {
    this.error.set('');
    const title = this.i18n.t(this.typeKey(type));
    try {
      const b = await this.store.createBlock({ type, title, icon: DEFAULT_ICON[type] as never, visible: type !== 'link', url: type === 'link' ? 'https://example.com' : null });
      this.open.set(b.id);
    } catch (e) {
      this.error.set(this.i18n.error(toProblem(e).code));
    }
  }
}
