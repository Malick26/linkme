import { expect, test } from '@playwright/test';

/**
 * Gate 2 : « inscription → onboarding → changement de thème → publication → page publique à jour ».
 * Tourne contre la stack complète (E2E_BASE_URL) : Caddy + SSR + API Spring Boot, ou SSR + mock d'API en développement.
 */
test.describe.configure({ mode: 'serial' });

const handle = `e2e${Date.now().toString(36)}`;
const email = `${handle}@test.sn`;

test('parcours créateur complet', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });

  // 1. Inscription
  await page.goto('/register');
  await page.getByLabel('Nom affiché').fill('Awa Diop');
  await page.locator('input[formcontrolname="handle"]').fill(handle);
  await expect(page.getByText('Disponible !')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Mot de passe/).fill('motdepasse-solide');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding/);

  // 2. Onboarding — étape 1 : identité (aperçu live mis à jour pendant la saisie)
  await page.getByTestId('displayName').fill('Awa Diop');
  await page.getByLabel('Ligne 1').fill('Dakar vibes');
  await page.getByLabel('Catégorie 1').fill('Food');
  const preview = page.getByTestId('preview-frame');
  await expect(preview.getByRole('heading', { name: 'Awa Diop' })).toBeVisible();
  await expect(preview.getByText('Dakar vibes')).toBeVisible();
  await page.getByTestId('onb-next').click();
  // étape 2 : fond (on garde le fond par défaut)
  await expect(page.getByRole('heading', { name: 'Photo de fond' })).toBeVisible();
  await page.getByTestId('onb-next').click();
  // étape 3 : réseaux & stats
  await page.getByRole('button', { name: 'Ajouter un réseau' }).click();
  await page.getByLabel('Lien du profil').fill('https://www.tiktok.com/@awa');
  await page.getByRole('spinbutton', { name: 'Abonnés', exact: true }).fill('12500');
  await page.getByTestId('stat-followers').fill('12500');
  await expect(preview.getByText('12.5K').first()).toBeVisible();
  await page.getByTestId('onb-next').click();
  // étape 4 : blocs
  await expect(page.getByRole('heading', { name: 'Tes blocs' })).toBeVisible();
  await page.getByTestId('onb-next').click();
  // étape 5 : preset + publication
  await page.getByRole('radio', { name: /Midnight Blue/ }).click();
  await page.getByTestId('onb-finish').click();
  await expect(page).toHaveURL(/\/app(\?|$)/);
  await expect(page.getByText('Ta page est en ligne')).toBeVisible();

  // 3. Page publique publiée
  const pub = await page.request.get(`/${handle}`);
  expect(pub.status()).toBe(200);
  expect(await pub.text()).toContain('Awa Diop');

  // 4. Changement de thème dans l'éditeur → brouillon → publication
  await page.goto('/app/design');
  await page.getByTestId('preset-rose-gold').click();
  await expect(page.getByText('Brouillon enregistré')).toBeVisible();
  await expect(page.getByText('Modifications non publiées')).toBeVisible();
  // la page publique ne change pas tant que ce n'est pas publié
  let html = await (await page.request.get(`/${handle}`)).text();
  expect(html).toContain('--lm-accent: rgba(122, 167, 255, 1)'); // Midnight Blue
  await page.getByTestId('publish').click();
  await expect(page.getByTestId('publish')).toHaveText(/Publié/);
  html = await (await page.request.get(`/${handle}`)).text();
  expect(html).toContain('--lm-accent: rgba(245, 184, 166, 1)'); // Rose Gold

  // 5. Annuler / rétablir
  await page.getByTestId('radius').fill('10');
  await page.getByRole('button', { name: 'Annuler' }).click();
  await page.getByRole('button', { name: 'Rétablir' }).click();
});

test('garde-fou de contraste : avertissement puis correction en un clic', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill('motdepasse-solide');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.goto('/app/design');
  await page.getByRole('button', { name: 'Couleur unie' }).click();
  await page.getByLabel('Texte (hex)').fill('#555555');
  await page.getByLabel('Texte (hex)').press('Tab');
  await expect(page.getByTestId('contrast-warning')).toBeVisible();
  await page.getByTestId('contrast-fix').click();
  await expect(page.getByTestId('contrast-warning')).toBeHidden();
  await expect(page.getByText('Contraste conforme (WCAG AA)')).toBeVisible();
});

test('mobile : onglets Édition / Aperçu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mot de passe').fill('motdepasse-solide');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.goto('/app/design');
  await page.getByRole('tab', { name: 'Aperçu' }).click();
  await expect(page.getByTestId('preview-frame')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
