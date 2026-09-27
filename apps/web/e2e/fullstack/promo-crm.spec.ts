import { type Browser, type Page, expect, test } from '@playwright/test';

/**
 * Gate D (D59–D63) : codes promo admin → abonnement réduit ou offert ; prospect inscrit sur /rejoindre → CRM
 * (WhatsApp pré-rempli, email groupé) → désinscription par le lien. Contre la stack complète (E2E_BASE_URL).
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

async function createPromo(admin: Page, code: string, pct: number, uses: number): Promise<void> {
  await admin.goto('/app/admin/promos');
  await admin.getByTestId('promo-code').fill(code);
  await admin.getByLabel('Réduction (%)').fill(String(pct));
  await admin.getByLabel('Nombre d’utilisations').fill(String(uses));
  await admin.getByRole('button', { name: 'Créer le code' }).click();
  await expect(admin.getByText(`Code ${code} créé.`)).toBeVisible();
}

test('code promo : -50 % sur Boutique, usage compté au paiement', async ({ browser }) => {
  test.setTimeout(120_000);
  const admin = await adminPage(browser);
  const code = `RENTREE${stamp}`.toUpperCase().slice(0, 24);
  await createPromo(admin, code, 50, 5);
  await expect(admin.locator('li', { hasText: code }).getByText('0 / 5 utilisations')).toBeVisible();

  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await register(page, 'Khady Sow', `pro${stamp}`, `pro${stamp}@test.sn`);
  await page.goto('/app/abonnement');
  await page.getByRole('button', { name: /^Boutique/ }).click();

  await page.getByLabel(/Code promo/).fill('pas-un-code');
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await expect(page.getByText('Ce code promo n’existe pas.')).toBeVisible();

  await page.getByLabel(/Code promo/).fill(code.toLowerCase());
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await expect(page.getByTestId('promo-applied')).toContainText(/−50\s%\s: 1\s350\sFCFA au lieu de 2\s700\sFCFA/);
  // changer de plan recalcule le prix avec le même code
  await page.getByRole('button', { name: /^Standard/ }).click();
  await expect(page.getByTestId('promo-applied')).toContainText(/550\sFCFA au lieu de 1\s100\sFCFA/);
  await page.getByRole('button', { name: /^Boutique/ }).click();
  await expect(page.getByTestId('promo-applied')).toContainText(/1\s350\sFCFA au lieu de 2\s700/);
  await page.screenshot({ path: 'test-results/subscription-promo-390.png', fullPage: true });

  await page.getByLabel('Numéro pour le paiement').fill('+221 77 222 33 44');
  await page.getByRole('button', { name: 'Payer et activer' }).click();
  await expect(page.getByText('1350 FCFA')).toBeVisible(); // page de paiement simulée : montant réduit
  await page.getByRole('button', { name: 'Payer avec Wave (simulé)' }).click();
  await expect(page.getByText('Paiement reçu — ton abonnement est actif.')).toBeVisible();

  await admin.reload();
  await expect(admin.locator('li', { hasText: code }).getByText('1 / 5 utilisations')).toBeVisible();
});

test('code à 100 % : abonnement activé sans passer par le paiement', async ({ browser }) => {
  const admin = await adminPage(browser);
  const code = `OFFERT${stamp}`.toUpperCase().slice(0, 24);
  await createPromo(admin, code, 100, 1);

  const page = await (await browser.newContext()).newPage();
  await register(page, 'Ousmane Diagne', `free${stamp}`, `free${stamp}@test.sn`);
  await page.goto('/app/abonnement');
  await page.getByLabel(/Code promo/).fill(code);
  await page.getByRole('button', { name: 'Appliquer' }).click();
  await expect(page.getByText('Offert avec ton code')).toBeVisible();
  await page.getByLabel('Numéro pour le paiement').fill('+221 77 555 66 77');
  await page.getByRole('button', { name: 'Activer gratuitement' }).click();
  await expect(page).toHaveURL(/\/app\/abonnement\/SB-/);
  await expect(page.getByText('Paiement reçu — ton abonnement est actif.')).toBeVisible();

  // épuisé pour les suivants
  const other = await (await browser.newContext()).newPage();
  await register(other, 'Suivant', `free2${stamp}`, `free2${stamp}@test.sn`);
  await other.goto('/app/abonnement');
  await other.getByLabel(/Code promo/).fill(code);
  await other.getByRole('button', { name: 'Appliquer' }).click();
  await expect(other.getByText('Ce code promo a atteint son nombre d’utilisations.')).toBeVisible();
});

test('prospect : inscription /rejoindre → CRM (WhatsApp, email) → désinscription', async ({ browser }) => {
  test.setTimeout(120_000);
  const email = `prospect${stamp}@test.sn`;
  // numéro propre à ce passage : un numéro déjà connu rattache l'inscription au prospect existant (D61)
  const local = `77${String(Date.now()).slice(-7)}`;
  const visitor = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await visitor.goto('/');
  await visitor.getByRole('link', { name: 'Rester informé·e' }).click();
  await expect(visitor).toHaveURL(/\/rejoindre$/);
  await visitor.waitForLoadState('networkidle');
  await visitor.getByLabel('Ton prénom').fill('Mariama');
  await visitor.getByLabel('Numéro WhatsApp').fill(local);
  await visitor.getByLabel('Email', { exact: true }).fill(email);
  await visitor.getByRole('button', { name: 'Je m’inscris' }).click();
  await expect(visitor.getByText('Coche la case pour confirmer ton accord.')).toBeVisible();
  await visitor.getByRole('checkbox').check();
  await visitor.getByRole('button', { name: 'Je m’inscris' }).click();
  await expect(visitor.getByRole('heading', { name: 'C’est noté !' })).toBeVisible();
  expect(await visitor.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);

  const admin = await adminPage(browser);
  await admin.goto('/app/admin/crm');
  const row = admin.locator('li', { hasText: email });
  await expect(row).toBeVisible();
  await expect(row.getByText('Jamais relancé')).toBeVisible();
  const wa = row.getByRole('link', { name: 'WhatsApp' });
  const href = (await wa.getAttribute('href')) ?? '';
  expect(href).toContain(`https://wa.me/221${local}?text=`);
  expect(decodeURIComponent(href)).toContain('Bonjour Mariama !');
  expect(decodeURIComponent(href)).toContain('/register');
  const [popup] = await Promise.all([admin.waitForEvent('popup').catch(() => null), wa.click()]);
  await popup?.close();
  await expect(row.getByText(/Relancé le/)).toBeVisible();
  await admin.screenshot({ path: 'test-results/admin-crm-1280.png', fullPage: true });

  // email groupé : double confirmation
  await admin.getByTestId('crm-send').click();
  await expect(admin.getByTestId('crm-send')).toContainText('Confirmer l’envoi');
  await admin.getByTestId('crm-send').click();
  await expect(admin.getByText(/Email envoyé à \d+ contact\(s\)/)).toBeVisible();

  // lien de désinscription (jeton lu via l'outil de test du mock)
  const tokenRes = await admin.request.get(`/api/_mock/prospect-token?email=${encodeURIComponent(email)}`);
  test.skip(!tokenRes.ok(), 'Outil de jeton disponible uniquement avec le mock.');
  const { token } = await tokenRes.json();
  await visitor.goto(`/desinscription?t=${token}`);
  await expect(visitor.getByTestId('unsub-done')).toBeVisible();
  await admin.reload();
  await expect(admin.locator('li', { hasText: email }).getByText('Désinscrit')).toBeVisible();
});

test('les pages admin promo et CRM sont refusées aux créateurs', async ({ browser }) => {
  const page = await (await browser.newContext()).newPage();
  await register(page, 'Curieuse', `cur2${stamp}`, `cur2${stamp}@test.sn`);
  for (const path of ['/app/admin/promos', '/app/admin/crm']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/app(\/onboarding)?$/);
  }
  expect((await page.request.get('/api/admin/promo-codes')).status()).toBe(403);
});
