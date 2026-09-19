import { THEME_PRESETS, presetConfig } from './presets';
import { themeToCssVars } from './theme-to-css-vars';
import { checkContrast, suggestContrastFix } from './contrast';

describe('themeToCssVars', () => {
  it('Sunset reproduit les tokens de la maquette (docs/design/tokens.md)', () => {
    const { vars } = themeToCssVars(presetConfig('sunset'));
    expect(vars['--lm-text']).toBe('rgba(255, 255, 255, 1)');
    expect(vars['--lm-text-muted']).toBe('rgba(255, 255, 255, 0.62)');
    expect(vars['--lm-accent']).toBe('rgba(255, 176, 103, 1)');
    expect(vars['--lm-card-bg']).toBe('rgba(10, 12, 18, 0.62)');
    expect(vars['--lm-card-border']).toBe('rgba(255, 255, 255, 0.14)');
    expect(vars['--lm-card-blur']).toBe('20px');
    expect(vars['--lm-card-radius']).toBe('28px');
    expect(vars['--lm-stat-glow']).toBe('rgba(60, 110, 255, 0.18)');
    expect(vars['--lm-overlay']).toBe('rgba(3, 5, 10, 1)');
  });

  for (const p of THEME_PRESETS) {
    it(`snapshot des tokens — preset ${p.id}`, () => {
      expect(themeToCssVars(p.config)).toMatchSnapshot();
    });
  }

  it('est pure (même entrée → même sortie)', () => {
    const c = presetConfig('rose-gold');
    expect(themeToCssVars(c)).toEqual(themeToCssVars(structuredClone(c)));
  });

  it('style « contour » : fond transparent, bordure renforcée, pas de flou', () => {
    const c = presetConfig('sunset');
    c.cards.style = 'outline';
    const { vars, classes } = themeToCssVars(c);
    expect(vars['--lm-card-bg']).toBe('rgba(10, 12, 18, 0)');
    expect(vars['--lm-card-blur']).toBe('0px');
    expect(classes).toContain('lm-cards-outline');
  });
});

describe('garde-fou de contraste', () => {
  it('Sunset sur fond sombre passe AA', () => {
    const c = presetConfig('sunset');
    const dark = { r: 20, g: 20, b: 24, a: 1 };
    expect(checkContrast(c, { hero: [dark], cards: [dark] }).ok).toBe(true);
  });

  it('détecte un texte illisible et propose une correction en un clic qui passe AA', () => {
    const c = presetConfig('sunset');
    c.colors.overlayStrength = 0.1;
    c.colors.cardBgOpacity = 0.05;
    c.colors.textMuted = '#FFFFFF55';
    const light = { r: 235, g: 235, b: 235, a: 1 };
    const samples = { hero: [light], cards: [light] };
    const report = checkContrast(c, samples);
    expect(report.ok).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
    const fixed = suggestContrastFix(c, samples);
    expect(checkContrast(fixed, samples).ok).toBe(true);
  });

  it('Clean Light : texte sombre sur fond clair passe AA', () => {
    const c = presetConfig('clean-light');
    expect(checkContrast(c).ok).toBe(true);
  });
});
