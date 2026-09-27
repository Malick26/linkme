import { type Browser, type Page, expect, test } from '@playwright/test';

/**
 * Gate E (D64–D66) : annonce admin → pop-up sur l'accueil et le tableau de bord, fermeture mémorisée, désactivation ;
 * liste des collabs. Contre la stack complète (E2E_BASE_URL).
 */
test.describe.configure({ mode: 'serial' });

const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin-e2e@test.sn';
const stamp = Date.now().toString(36);

async function register(page: Page, name: string, handle: string, email: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Nom affiché').fill(name);
  await page.locator('input[formcontrolname="handle"]').fill(handle);
  await expect(page.getByText('Disponible !')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Mot de passe/).fill('motdepasse-solide');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding/);
}

async function adminPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel(/Mot de passe/).fill('motdepasse-solide');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  if (!(await page.waitForURL(/\/app/, { timeout: 4_000 }).then(() => true, () => false))) {
    await register(page, 'Équipe', `adm${stamp}`, ADMIN_EMAIL);
  }
  return page;
}

test('annonce : pop-up sur l’accueil et le tableau de bord, fermée pour de bon, puis désactivée', async ({ browser }) => {
  test.setTimeout(120_000);
  const admin = await adminPage(browser);
  // on repart d'un état propre : les annonces encore en ligne d'un passage précédent sont désactivées
  await admin.goto('/app/admin/annonces');
  await expect(admin.getByText(/Aucune annonce|Désactivée|En ligne|Programmée|Terminée/).first()).toBeVisible();
  const liveButtons = admin.getByRole('button', { name: 'Désactiver' });
  for (let n = await liveButtons.count(); n > 0; n--) {
    await liveButtons.first().click();
    await expect(liveButtons).toHaveCount(n - 1);
  }

  const title = `Offre de lancement ${stamp}`;
  await admin.getByTestId('ann-title').fill(title);
  await admin.getByTestId('ann-body').fill('-50 % sur ton premier mois avec le code RENTREE.');
  await admin.getByLabel(/Texte du bouton/).fill('J’en profite');
  await admin.getByLabel(/Lien du bouton/).fill('javascript:alert(1)');
  await admin.getByRole('button', { name: 'Publier l’annonce' }).click();
  await expect(admin.getByRole('alert')).toBeVisible(); // lien dangereux refusé
  await admin.getByLabel(/Lien du bouton/).fill('/app/abonnement');
  await admin.getByRole('button', { name: 'Publier l’annonce' }).click();
  await expect(admin.getByText('Annonce enregistrée.')).toBeVisible();
  await expect(admin.locator('li', { hasText: title }).getByText('En ligne')).toBeVisible();
  await admin.screenshot({ path: 'test-results/admin-announcements-1280.png', fullPage: true });

  // visiteur de l'accueil (mobile)
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const visitor = await ctx.newPage();
  await visitor.goto('/');
  const popup = visitor.getByRole('dialog', { name: title });
  await expect(popup).toBeVisible();
  await expect(popup.getByRole('link', { name: 'J’en profite' })).toHaveAttribute('href', '/app/abonnement');
  await visitor.screenshot({ path: 'test-results/announcement-landing-390.png' });
  await visitor.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await visitor.reload();
  await visitor.waitForLoadState('networkidle');
  await expect(visitor.getByRole('dialog')).toHaveCount(0); // fermée = ne revient pas chez ce visiteur

  // créateur : tableau de bord
  const creator = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await register(creator, 'Binta Kane', `ann${stamp}`, `ann${stamp}@test.sn`);
  // l'annonce n'interrompt pas l'onboarding : elle attend le tableau de bord
  await expect(creator.getByRole('dialog')).toHaveCount(0);
  for (let i = 0; i < 4; i++) await creator.getByTestId('onb-next').click();
  await creator.getByTestId('onb-finish').click();
  await expect(creator).toHaveURL(/\/app(\?|$)/);
  const dash = creator.getByRole('dialog', { name: title });
  await expect(dash).toBeVisible();
  await dash.getByRole('button', { name: 'Fermer' }).click();
  await expect(dash).toHaveCount(0);

  // désactivée : plus personne ne la voit
  await admin.locator('li', { hasText: title }).getByRole('button', { name: 'Désactiver' }).click();
  await expect(admin.locator('li', { hasText: title }).getByText('Désactivée')).toBeVisible();
  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto('/');
  await fresh.waitForLoadState('networkidle');
  await expect(fresh.getByRole('dialog')).toHaveCount(0);
});

test('liste des collabs et modification depuis la liste', async ({ browser }) => {
  const admin = await adminPage(browser);
  const handle = `lst${stamp}`;
  const other = await (await browser.newContext()).newPage();
  await register(other, 'Awa Collab', handle, `${handle}@test.sn`);

  await admin.goto('/app/admin/collabs');
  await admin.getByLabel('Nom d’utilisateur du créateur').fill(handle);
  await admin.getByRole('button', { name: 'Chercher' }).click();
  await admin.getByLabel('Taux collab (%)').fill('45');
  await admin.getByLabel('Expire le').fill(new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10));
  await admin.getByRole('button', { name: 'Enregistrer la collab' }).click();
  const row = admin.locator('li', { hasText: `@${handle}` });
  await expect(row).toContainText(/45\s% · jusqu’au/);

  await row.getByRole('button', { name: 'Modifier' }).click();
  await expect(admin.getByLabel('Taux collab (%)')).toHaveValue('45');
  await admin.getByLabel('Taux collab (%)').fill('55');
  await admin.getByRole('button', { name: 'Enregistrer la collab' }).click();
  await expect(row).toContainText(/55\s% · jusqu’au/);
  await admin.screenshot({ path: 'test-results/admin-collabs-1280.png', fullPage: true });
});
