import {
  ChangeDetectionStrategy, Component, ElementRef, PLATFORM_ID, effect, inject, input, output, viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IconComponent } from '../icons/icon.component';
import { TPipe } from '../../app/core/i18n/i18n.service';

/**
 * Feuille modale : bottom sheet sur mobile, popover ancré en haut à droite sur desktop.
 * Basée sur <dialog> natif (piège de focus, Échap, fond inerte) — zéro dépendance.
 */
@Component({
  selector: 'lm-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TPipe],
  template: `
    <dialog #dlg class="sh" [attr.aria-labelledby]="titleId" (close)="closed.emit()" (click)="onBackdrop($event)">
      <div class="sh__panel">
        <div class="sh__grab" aria-hidden="true"></div>
        <header class="sh__head">
          <h2 class="sh__title" [id]="titleId">{{ heading() }}</h2>
          <button type="button" class="sh__close" (click)="close()" [attr.aria-label]="'common.close' | t">
            <lm-icon name="x" [size]="20" />
          </button>
        </header>
        <div class="sh__body"><ng-content /></div>
      </div>
    </dialog>
  `,
  styles: `
    .sh {
      margin: auto auto 0; padding: 0; border: 0; width: 100%; max-width: 560px; max-height: 88dvh;
      background: transparent; color: var(--lm-text); overflow: visible;
    }
    .sh::backdrop { background: var(--lm-backdrop); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
    .sh[open] .sh__panel { animation: sh-up .28s var(--lm-ease) both; }
    @keyframes sh-up { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }
    .sh__panel {
      background: var(--lm-surface-strong); border: 1px solid var(--lm-card-border);
      border-radius: 24px 24px 0 0; padding: 8px 20px calc(20px + env(safe-area-inset-bottom));
      max-height: 88dvh; overflow: auto; font-family: var(--lm-font-body);
    }
    .sh__grab { width: 40px; height: 4px; border-radius: 4px; background: var(--lm-hairline); margin: 4px auto 8px; }
    .sh__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .sh__title { margin: 0; font-size: 17px; font-weight: 600; }
    .sh__close {
      display: grid; place-items: center; width: var(--lm-touch); height: var(--lm-touch); border-radius: 50%;
      background: transparent; border: 1px solid var(--lm-card-border); color: var(--lm-text); cursor: pointer;
    }
    @media (min-width: 1024px) {
      .sh { margin: 76px var(--lm-gutter) auto auto; width: 400px; }
      .sh::backdrop { background: var(--lm-backdrop-light); }
      .sh__panel { border-radius: 20px; padding: 12px 20px 20px; }
      .sh__grab { display: none; }
    }
  `,
})
export class SheetComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly closed = output<void>();
  protected readonly titleId = `lm-sheet-${Math.random().toString(36).slice(2, 8)}`;
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;
      const d = this.dlg().nativeElement;
      if (this.open() && !d.open) {
        this.opener = document.activeElement as HTMLElement | null;
        d.showModal();
      } else if (!this.open() && d.open) {
        d.close();
      }
    });
  }

  close(): void {
    this.dlg().nativeElement.close();
    this.opener?.focus?.();
  }

  protected onBackdrop(e: MouseEvent): void {
    if (e.target === this.dlg().nativeElement) this.close();
  }
}
