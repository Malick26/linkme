import { expect, test } from '@playwright/test';

/** Gate 3 : achat complet avec le fournisseur Mock (page de paiement simulée → webhook signé → commande PAID). */
test('achat complet sur /malick avec le paiement simulé', async ({ page }) => {
  await page.goto('/malick/shop');
  await page.getByRole('link', { name: /Hoodie/ }).click();
  await page.getByLabel('Nom complet').fill('Awa Diop');
  await page.getByLabel(/Téléphone/).fill('+221 77 000 00 00');
  await page.getByRole('button', { name: /Payer/ }).click();
  await expect(page.getByText('Paiement simulé (mode test)')).toBeVisible();
  await page.getByRole('button', { name: /Payer avec Wave/ }).click();
  await expect(page).toHaveURL(/\/malick\/commande\/LM-/);
  await expect(page.getByRole('heading', { name: /Paiement confirmé/ })).toBeVisible();
});
