import type { ThemeConfig, ThemePreset } from '../api/types';
import presets from './presets.generated.json';

/** Presets de thème — copie générée de services/api/src/main/resources/theme/presets.json (D13). */
export const THEME_PRESETS: ThemePreset[] = presets as ThemePreset[];

export function presetConfig(id: string): ThemeConfig {
  const p = THEME_PRESETS.find((x) => x.id === id) ?? THEME_PRESETS[0];
  return structuredClone(p.config);
}

export const DEFAULT_THEME: ThemeConfig = presetConfig('sunset');
