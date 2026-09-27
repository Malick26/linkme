import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Page d'accueil : c'est la première chose que voit quelqu'un qui ne connaît pas le produit. */
test.describe("page d'accueil", () => {
  test('dit ce que fait le produit et propose de créer une page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/lien/i);
    // un visiteur doit pouvoir s'inscrire depuis le haut, le milieu et le bas de la page
    const ctas = page.getByRole('link', { name: /Créer ma page/i });
    expect(await ctas.count()).toBeGreaterThanOrEqual(3);
    await expect(ctas.first()).toHaveAttribute('href', /\/register$/);
    await expect(page.getByRole('link', { name: /Se connecter/i }).first()).toHaveAttribute('href', /\/login$/);
  });

  test('rendu SSR : le texte est dans le HTML initial (référencement et partage)', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('Ta page en trois étapes');
    expect(html).toContain('Questions fréquentes');
    expect(html).toMatch(/<meta name="description" content="[^"]{40,}">/);
  });

  test("l'aperçu change d'ambiance au clic", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const phone = page.locator('.phone');
    const before = await phone.getAttribute('style');
    await page.getByRole('button', { name: 'Emerald Night' }).click();
    await expect(phone).not.toHaveAttribute('style', before ?? '');
    await expect(page.getByRole('button', { name: 'Emerald Night' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('les questions fréquentes se déplient', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const q = page.getByText('Combien ça coûte vraiment ?');
    await q.click();
    await expect(page.getByText(/1 100 FCFA par mois/)).toBeVisible();
  });

  test('accessibilité (axe) : 0 violation critique ou sérieuse', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const serious = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(serious.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  });

  test('aucun débordement horizontal et cibles tactiles ≥ 44 px (390 px)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('a, button')]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({ t: el.textContent?.trim().slice(0, 24) ?? '', h: Math.round(el.getBoundingClientRect().height) }))
        .filter((x) => x.h > 0 && x.h < 44),
    );
    expect(small).toEqual([]);
  });
});
