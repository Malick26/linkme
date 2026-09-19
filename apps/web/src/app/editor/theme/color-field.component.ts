import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** Sélecteur de couleur + saisie hex (+ opacité optionnelle encodée en #RRGGBBAA). */
@Component({
  selector: 'ed-color-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cf">
      <span class="cf__label">{{ label() }}</span>
      <div class="cf__row">
        <input type="color" class="cf__swatch" [value]="rgb()" (input)="emitRgb($any($event.target).value)" [attr.aria-label]="label()" />
        <input class="cf__hex" [value]="value()" maxlength="9" spellcheck="false" (change)="emitHex($any($event.target).value)" [attr.aria-label]="label() + ' (hex)'" />
        @if (alpha()) {
          <input type="range" min="0" max="100" [value]="alphaPct()" (input)="emitAlpha(+$any($event.target).value)" [attr.aria-label]="label() + ' — ' + alphaLabel()" />
        }
      </div>
    </div>
  `,
  styles: `
    .cf { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--ed-muted); }
    .cf__row { display: flex; align-items: center; gap: 8px; }
    .cf__swatch { width: 44px; height: 44px; padding: 2px; border-radius: 10px; border: 1px solid var(--ed-border); background: var(--ed-bg); cursor: pointer; }
    .cf__hex { width: 108px; min-height: 44px; padding: 0 10px; border-radius: 10px; border: 1px solid var(--ed-border); background: var(--ed-bg); color: var(--ed-text); font-family: ui-monospace, monospace; font-size: 14px; }
    input[type='range'] { flex: 1; accent-color: var(--ed-accent); min-width: 80px; }
    input:focus-visible { outline: 2px solid var(--ed-accent); outline-offset: 2px; }
  `,
})
export class ColorFieldComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly alpha = input(false);
  readonly alphaLabel = input('opacité');
  readonly changed = output<string>();
  protected readonly rgb = computed(() => this.value().slice(0, 7));
  protected readonly alphaPct = computed(() => (this.value().length === 9 ? Math.round((parseInt(this.value().slice(7), 16) / 255) * 100) : 100));

  protected emitRgb(v: string): void {
    this.changed.emit((v + (this.value().length === 9 ? this.value().slice(7) : '')).toUpperCase());
  }

  protected emitHex(v: string): void {
    const t = v.trim().toUpperCase();
    if (/^#[0-9A-F]{6}([0-9A-F]{2})?$/.test(t)) this.changed.emit(t);
  }

  protected emitAlpha(pct: number): void {
    const a = Math.round((pct / 100) * 255).toString(16).padStart(2, '0').toUpperCase();
    this.changed.emit(this.rgb().toUpperCase() + a);
  }
}
