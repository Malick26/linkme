import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CrownComponent } from './crown.component';
import { SwashComponent } from './swash.component';

/**
 * Nom en script pinceau + couronne au-dessus (≈ 42 % de la largeur, comme sur la maquette) + swash sous le nom.
 * Le nom est un vrai <h1> (SEO/a11y) ; couronne et swash sont décoratifs.
 */
@Component({
  selector: 'lm-script-name',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CrownComponent, SwashComponent],
  template: `
    <div class="sn">
      @if (showCrown()) {
        <lm-crown class="sn__crown" [size]="0" />
      }
      <h1 class="sn__text">{{ name() }}</h1>
      <lm-swash class="sn__swash" variant="name" />
    </div>
  `,
  styles: `
    :host { display: block; }
    .sn { position: relative; display: inline-block; max-width: 100%; padding-top: calc(var(--lm-fs-name) * var(--lm-name-scale) * .5); }
    .sn__text {
      margin: 0;
      font-family: var(--lm-font-display);
      font-weight: 400;
      font-size: calc(var(--lm-fs-name) * var(--lm-name-scale));
      line-height: 1.02;
      letter-spacing: .005em;
      color: var(--lm-text);
      transform: rotate(-4deg);
      transform-origin: left bottom;
      text-shadow: 0 2px 18px var(--lm-shadow-text);
      overflow-wrap: anywhere;
      padding-inline-end: .12em;
    }
    .sn__crown {
      position: absolute;
      top: calc(var(--lm-fs-name) * var(--lm-name-scale) * .02);
      left: 40%;
      width: calc(var(--lm-fs-name) * var(--lm-name-scale) * .5);
      color: var(--lm-text);
    }
    .sn__swash {
      width: 58%;
      height: calc(var(--lm-fs-name) * var(--lm-name-scale) * .2);
      margin: calc(var(--lm-fs-name) * var(--lm-name-scale) * -.04) 0 0 24%;
      color: var(--lm-text);
      transform: rotate(-2.5deg);
    }
  `,
})
export class ScriptNameComponent {
  readonly name = input.required<string>();
  readonly showCrown = input(true);
}
