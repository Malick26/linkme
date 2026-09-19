import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
];

test.describe('page publique /malick (fixtures)', () => {
  for (const vp of VIEWPORTS) {
    test(`régression visuelle ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/malick');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`malick-${vp.name}.png`, { fullPage: true });
    });
  }

  test('SSR : contenu, SEO et Open Graph présents dans le HTML initial', async ({ request }) => {
    const res = await request.get('/malick');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('Malick Wane');
    expect(html).toContain('Mes voyages');
    expect(html).toMatch(/<meta property="og:title" content="Malick Wane[^"]*">/);
    expect(html).toMatch(/<meta property="og:image" content="http[^"]+">/);
    expect(html).toMatch(/<meta name="twitter:card" content="summary_large_image">/);
    expect(html).toContain('rel="preload" as="image"');
    expect(html).toContain('--lm-card-radius: 28px');
  });

  test('404 propre pour un handle inexistant', async ({ page }) => {
    const res = await page.goto('/personne-inconnue');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
  });

  test('aucun débordement horizontal et cibles tactiles ≥ 44 px (390 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/malick');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('a, button')]
        .filter((e) => (e as HTMLElement).offsetParent !== null && !e.closest('dialog'))
        .map((e) => ({ t: e.textContent?.trim() || e.getAttribute('aria-label'), r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && (r.height < 44 || r.width < 44))
        .map(({ t, r }) => `${t} ${Math.round(r.width)}×${Math.round(r.height)}`),
    );
    expect(small).toEqual([]);
  });

  test('accessibilité (axe) : 0 violation critique ou sérieuse', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/malick');
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('« My Links » ouvre la feuille avec partage / copie / QR', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/malick');
    await page.getByRole('button', { name: 'My Links' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /Mes voyages/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'QR code' }).click();
    await expect(dialog.locator('svg').last()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('carte → page de détail du bloc, retour au profil', async ({ page }) => {
    await page.goto('/malick');
    await page.getByRole('link', { name: /Mes voyages/ }).click();
    await expect(page).toHaveURL(/\/malick\/voyages$/);
    await expect(page.getByRole('heading', { name: 'Mes voyages' })).toBeVisible();
    await page.getByRole('link', { name: /Retour au profil/ }).click();
    await expect(page).toHaveURL(/\/malick$/);
  });

  test('bloc boutique → fiche produit', async ({ page }) => {
    await page.goto('/malick/shop');
    await page.getByRole('link', { name: /Hoodie/ }).click();
    await expect(page.getByRole('heading', { name: /Hoodie/ })).toBeVisible();
    await expect(page.getByText('15 000 FCFA').first()).toBeVisible();
  });

  test('navigation clavier : les cartes sont atteignables et ont un focus visible', async ({ page }) => {
    await page.goto('/malick');
    const first = page.getByRole('link', { name: /Mes voyages/ });
    await first.focus();
    const shadow = await first.evaluate((e) => getComputedStyle(e).boxShadow);
    expect(shadow).not.toBe('none');
  });
});
