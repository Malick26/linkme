import { expect, test } from '@playwright/test';

/**
 * Régression : un numéro écrit avec des tirets faisait échouer l'envoi avec
 * « Certains champs sont invalides », sans dire quel champ.
 */
test.describe('formulaire de contact public', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/malick/contact');
    // page rendue au serveur : on attend l'hydratation, sinon la saisie peut précéder le branchement du formulaire
    await page.waitForLoadState('networkidle');
  });

  test('accepte un numéro écrit avec des tirets', async ({ page }) => {
    await page.locator('input[formcontrolname="name"]').fill('Awa Diop');
    await page.locator('input[formcontrolname="phone"]').fill('77-123-45-67');
    await page.locator('textarea[formcontrolname="message"]').fill('Bonjour, je voudrais collaborer avec toi.');
    await page.getByRole('button', { name: /Envoyer/ }).click();
    await expect(page.getByRole('status')).toContainText(/Message envoyé/);
  });

  test('dit quel champ pose problème, sous le champ', async ({ page }) => {
    await page.locator('input[formcontrolname="name"]').fill('Awa Diop');
    await page.locator('input[formcontrolname="email"]').fill('pas-un-email');
    await page.locator('textarea[formcontrolname="message"]').fill('Bonjour, je voudrais collaborer avec toi.');
    await page.getByRole('button', { name: /Envoyer/ }).click();
    await expect(page.locator('#cf-e-email')).toBeVisible();
    await expect(page.locator('input[formcontrolname="email"]')).toHaveAttribute('aria-invalid', 'true');
    // pas d'envoi tant que le champ est invalide
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('demande au moins un moyen de réponse', async ({ page }) => {
    await page.locator('input[formcontrolname="name"]').fill('Awa Diop');
    await page.locator('textarea[formcontrolname="message"]').fill('Bonjour, je voudrais collaborer avec toi.');
    await page.getByRole('button', { name: /Envoyer/ }).click();
    await expect(page.getByRole('alert')).toContainText(/email ou un numéro/);
  });
});
