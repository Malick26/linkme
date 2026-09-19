import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../icons/icon.component';

/** Bouton verre sombre : rond (icône seule) ou pilule (icône + texte). À placer dans un <button> ou <a> hôte. */
@Component({
  selector: 'lm-icon-button, [lmIconButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  host: { class: 'lm-ib', '[class.lm-ib--pill]': '!!text()', '[class.lm-ib--plain]': 'plain()' },
  template: `
    <lm-icon [name]="icon()" [size]="iconSize()" [strokeWidth]="1.8" />
    @if (text()) {
      <span class="lm-ib__text">{{ text() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      min-width: var(--lm-touch); height: var(--lm-touch);
      padding: 0; border-radius: 999px; cursor: pointer; text-decoration: none;
      color: var(--lm-text);
      background: var(--lm-control-bg);
      border: 1px solid var(--lm-card-border);
      -webkit-backdrop-filter: blur(14px) saturate(1.2);
      backdrop-filter: blur(14px) saturate(1.2);
      transition: transform .18s var(--lm-ease), background-color .2s;
      -webkit-tap-highlight-color: transparent;
    }
    :host(.lm-ib--pill) { padding: 0 18px 0 14px; font-size: 15px; font-weight: 500; }
    :host(.lm-ib--plain) { background: transparent; border-color: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; }
    :host(:active) { transform: scale(.96); }
    :host(:focus-visible) { outline: none; box-shadow: var(--lm-focus-ring); }
    @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
      :host { background: var(--lm-surface-strong); }
    }
    .lm-ib__text { white-space: nowrap; letter-spacing: .01em; }
  `,
})
export class IconButtonComponent {
  readonly icon = input.required<string>();
  readonly text = input<string>();
  readonly iconSize = input(20);
  readonly plain = input(false);
}
