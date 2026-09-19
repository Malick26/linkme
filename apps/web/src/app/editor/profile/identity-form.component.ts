import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TPipe } from '../../core/i18n/i18n.service';
import { EditorStore } from '../state/editor.store';

/** Identité : nom, punchline (3 lignes), catégories (3), bio (160). Chaque frappe met à jour l'aperçu live. */
@Component({
  selector: 'ed-identity-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe],
  template: `
    @if (store.profile(); as p) {
      <div class="ed-stack">
        <label class="ed-field"><span>{{ 'profile.displayName' | t }}</span>
          <input [value]="p.displayName" maxlength="60" (input)="set('displayName', $any($event.target).value)" required data-testid="displayName" />
        </label>
        <fieldset class="ed-fs">
          <legend>{{ 'profile.tagline' | t }}</legend>
          <div class="ed-grid3">
            @for (i of three; track i) {
              <input class="ed-input" [value]="p.taglineLines[i] ?? ''" maxlength="40" [attr.aria-label]="'profile.taglineLine' | t: { n: i + 1 }"
                     (input)="setLine('taglineLines', i, $any($event.target).value)" />
            }
          </div>
        </fieldset>
        <fieldset class="ed-fs">
          <legend>{{ 'profile.categories' | t }}</legend>
          <div class="ed-grid3">
            @for (i of three; track i) {
              <input class="ed-input" [value]="p.categories[i] ?? ''" maxlength="24" [attr.aria-label]="'profile.category' | t: { n: i + 1 }"
                     (input)="setLine('categories', i, $any($event.target).value)" />
            }
          </div>
        </fieldset>
        <label class="ed-field"><span>{{ 'profile.bio' | t }} <small>{{ 'profile.bioCount' | t: { n: p.bio.length } }}</small></span>
          <textarea rows="3" maxlength="160" [value]="p.bio" (input)="set('bio', $any($event.target).value)"></textarea>
        </label>
      </div>
    }
  `,
  styles: `
    @use 'editor' as ed;
    @include ed.base;
    .ed-fs { border: 0; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
    .ed-fs legend { font-size: 13px; color: var(--ed-muted); margin-bottom: 6px; }
    .ed-grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
  `,
})
export class IdentityFormComponent {
  protected readonly store = inject(EditorStore);
  protected readonly three = [0, 1, 2];
  readonly dirty = output<void>();

  protected set(key: 'displayName' | 'bio', value: string): void {
    this.store.patchProfileLocal({ [key]: key === 'bio' ? value.slice(0, 160) : value });
    this.dirty.emit();
  }

  protected setLine(key: 'taglineLines' | 'categories', i: number, value: string): void {
    const p = this.store.profile();
    if (!p) return;
    const arr = [...p[key]];
    while (arr.length <= i) arr.push('');
    arr[i] = value;
    // on garde des lignes vides intermédiaires pendant la saisie, nettoyées à l'enregistrement
    this.store.patchProfileLocal({ [key]: arr.slice(0, 3) });
    this.dirty.emit();
  }
}

export function profileUpdateFrom(store: EditorStore, extra: { published?: boolean; onboardingCompleted?: boolean } = {}) {
  const p = store.profile()!;
  return {
    displayName: p.displayName.trim() || p.handle,
    taglineLines: p.taglineLines.map((s) => s.trim()).filter(Boolean),
    categories: p.categories.map((s) => s.trim()).filter(Boolean),
    bio: p.bio,
    backgroundImageId: p.backgroundImageId ?? null,
    ...extra,
  };
}

