import { type Browser, type Page, expect, test } from '@playwright/test';

/**
 * Gate C (D51–D56) : lien de parrainage /r/CODE → inscription « Invité·e par … » → abonnement du filleul →
 * gain de 20 % chez le parrain (filleul masqué) → portefeuille → collab 60 % → retrait → traitement admin.
 * Contre la stack complète (E2E_BASE_URL). Le gel des gains dépend du serveur : avec le mock, lancer une fois
 * par défaut (7 jours → gain « en attente ») et une fois avec MOCK_REFERRAL_HOLD_DAYS=0 (retrait possible).
 */
test.describe.configure({ mode: 'serial' });

const HOLD_ZERO = process.env['MOCK_REFERRAL_HOLD_DAYS'] === '0';
const ADMIN_EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin-e2e@test.sn';
const stamp = Date.now().toString(36);

async function register(page: Page, name: string, handle: string, email: string): Promise<void> {
  await page.getByLabel('Nom affiché').fill(name);
  await page.locator('input[formcontrolname="handle"]').fill(handle);
  await expect(page.getByText('Disponible !')).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Mot de passe/).fill('motdepasse-solide');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/app\/onboarding/);
}

async function newCreator(browser: Browser, name: string, handle: string): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('/register');
  await register(page, name, handle, `${handle}@test.sn`);
  return page;
}

async function subscribe(page: Page, plan: 'Standard' | 'Boutique', phone: string): Promise<void> {
  await page.goto('/app/abonnement');
  await page.getByRole('button', { name: new RegExp(`^${plan}`) }).click();
  await page.getByLabel('Numéro pour le paiement').fill(phone);
  await page.getByRole('button', { name: 'Payer et activer' }).click();
  await page.getByRole('button', { name: 'Payer avec Wave (simulé)' }).click();
  await expect(page.getByText('Paiement reçu — ton abonnement est actif.')).toBeVisible();
}

async function adminPage(browser: Browser): Promise<Page> {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel(/Mot de passe/).fill('motdepasse-solide');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  if (!(await page.waitForURL(/\/app/, { timeout: 4_000 }).then(() => true, () => false))) {
    await page.goto('/register');
    await register(page, 'Équipe', `adm${stamp}`, ADMIN_EMAIL);
  }
  return page;
}

test('le filleul arrive par le lien, s’abonne, et le parrain voit son gain masqué', async ({ browser }) => {
  test.setTimeout(120_000);
  const parrain = await newCreator(browser, 'Fatou Sarr', `par${stamp}`);

  await parrain.goto('/app/parrainage');
  await expect(parrain.getByRole('heading', { name: /gagne 20\s%\sde chaque abonnement/ })).toBeVisible();
  const link = await parrain.getByTestId('referral-link').inputValue();
  expect(link).toMatch(/\/r\/[A-HJ-NP-Z2-9]{8}$/);
  const code = link.split('/r/')[1];
  await expect(parrain.getByTestId('kpi-real')).toHaveText(/^0\sFCFA$/);

  // lien court → inscription avec le bandeau du parrain
  const filleul = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await filleul.goto(`/r/${code}`);
  await expect(filleul).toHaveURL(new RegExp(`/register\\?ref=${code}`));
  await expect(filleul.getByTestId('invited-by')).toContainText('Invité·e par Fatou Sarr');
  await filleul.screenshot({ path: 'test-results/referral-register-390.png', fullPage: true });
  await register(filleul, 'Moussa Ndiaye', `fil${stamp}`, `fil${stamp}@test.sn`);

  // inscrit mais pas abonné : gain potentiel de 20 % du Standard (220 FCFA)
  await parrain.reload();
  await expect(parrain.getByTestId('kpi-potential')).toHaveText(/^220\sFCFA$/);
  await expect(parrain.getByText('Mo*** N.')).toBeVisible();
  await expect(parrain.getByText('Moussa')).toHaveCount(0);

  await subscribe(filleul, 'Standard', '+221 77 123 45 67');

  await parrain.reload();
  await expect(parrain.getByTestId('kpi-real')).toHaveText(/^220\sFCFA$/);
  await expect(parrain.getByText('+221 77 *** ** 67')).toBeVisible();
  await expect(parrain.getByText(/1\s100\sFCFA × 20\s%/)).toBeVisible();
  await expect(parrain.getByText(HOLD_ZERO ? 'Disponible' : /Disponible le/).first()).toBeVisible();
  await parrain.screenshot({ path: `test-results/referral-page-1280${HOLD_ZERO ? '-hold0' : ''}.png`, fullPage: true });

  await parrain.goto('/app/portefeuille');
  await expect(parrain.getByTestId(HOLD_ZERO ? 'wallet-available' : 'wallet-held')).toHaveText(/^220\sFCFA$/);
  // minimum 1 500 FCFA : il manque 1 500 − disponible (le gain gelé ne compte pas encore)
  await expect(parrain.getByText(HOLD_ZERO ? /Encore 1\s280\sFCFA avant ton premier retrait/ : /Encore 1\s500\sFCFA avant ton premier retrait/)).toBeVisible();
});

test('collab 60 %, retrait, refus puis paiement par l’admin', async ({ browser }) => {
  test.skip(!HOLD_ZERO, 'Nécessite un serveur sans gel des gains (MOCK_REFERRAL_HOLD_DAYS=0).');
  test.setTimeout(150_000);
  const handle = `col${stamp}`;
  const parrain = await newCreator(browser, 'Aminata Fall', handle);
  await parrain.goto('/app/parrainage');
  const code = (await parrain.getByTestId('referral-link').inputValue()).split('/r/')[1];

  // l'admin accorde une collab à 60 %
  const admin = await adminPage(browser);
  await admin.goto('/app/admin/collabs');
  await admin.getByLabel('Nom d’utilisateur du créateur').fill(handle);
  await admin.getByRole('button', { name: 'Chercher' }).click();
  await expect(admin.getByText('Pas de collab en cours (taux de base).', { exact: false })).toBeVisible();
  await admin.getByLabel('Taux collab (%)').fill('60');
  const until = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await admin.getByLabel('Expire le').fill(until);
  await admin.getByRole('button', { name: 'Enregistrer la collab' }).click();
  await expect(admin.getByText(/Collab à 60\s% jusqu’au/)).toBeVisible();

  const filleul = await (await browser.newContext()).newPage();
  await filleul.goto(`/r/${code}`);
  await register(filleul, 'Ibrahima Ba', `colf${stamp}`, `colf${stamp}@test.sn`);
  await subscribe(filleul, 'Boutique', '+221 76 555 44 33');

  await parrain.reload();
  await expect(parrain.getByRole('heading', { name: /gagne 60\s%\sde chaque abonnement/ })).toBeVisible();
  await expect(parrain.getByTestId('kpi-real')).toHaveText(/^1\s620\sFCFA$/);

  // retrait de 1 500 FCFA vers Wave
  await parrain.goto('/app/portefeuille');
  await expect(parrain.getByTestId('wallet-available')).toHaveText(/^1\s620\sFCFA$/);
  await parrain.getByTestId('withdraw-amount').fill('1500');
  await parrain.getByTestId('withdraw-phone').fill('70 111 22 33');
  await parrain.getByRole('button', { name: 'Demander le retrait' }).click();
  await expect(parrain.getByText('Demande envoyée.', { exact: false })).toBeVisible();
  await expect(parrain.getByTestId('wallet-available')).toHaveText(/^120\sFCFA$/);
  await expect(parrain.getByText('En traitement')).toBeVisible();
  await parrain.screenshot({ path: 'test-results/wallet-1280.png', fullPage: true });

  // l'admin refuse (motif obligatoire) → recrédit
  await admin.goto('/app/admin/retraits');
  const card = admin.locator('article', { hasText: `@${handle}` });
  await expect(card.getByText('Envoyer 1 500 FCFA sur Wave')).toBeVisible();
  await expect(card.getByText('701112233', { exact: true })).toBeVisible(); // l'admin voit le numéro complet pour envoyer l'argent
  await expect(card.getByRole('button', { name: 'Refuser et recréditer' })).toBeDisabled();
  await card.getByLabel('Motif du refus (visible par le créateur)').fill('Numéro Wave introuvable');
  await card.getByRole('button', { name: 'Refuser et recréditer' }).click();
  await expect(admin.locator('article', { hasText: `@${handle}` })).toHaveCount(0); // plus dans « À traiter »

  await parrain.reload();
  await expect(parrain.getByTestId('wallet-available')).toHaveText(/^1\s620\sFCFA$/);
  await expect(parrain.getByText('Motif : Numéro Wave introuvable')).toBeVisible();

  // nouvelle demande, payée par l'admin
  await parrain.getByTestId('withdraw-phone').fill('+221 70 111 22 33');
  await parrain.getByRole('button', { name: 'Demander le retrait' }).click();
  await expect(parrain.getByTestId('wallet-available')).toHaveText(/^0\sFCFA$/);
  await admin.reload();
  const card2 = admin.locator('article', { hasText: `@${handle}` });
  await card2.getByLabel(/Référence de la transaction/).fill('WAVE-TX-42');
  await admin.screenshot({ path: 'test-results/admin-withdrawals-1280.png', fullPage: true });
  await card2.getByRole('button', { name: 'Marquer comme payé' }).click();
  await expect(admin.locator('article', { hasText: `@${handle}` })).toHaveCount(0);

  await parrain.reload();
  await expect(parrain.getByText('Envoyé')).toBeVisible();
});

test('un créateur sans droits ne voit pas l’espace admin', async ({ browser }) => {
  const page = await newCreator(browser, 'Curieux', `cur${stamp}`);
  await page.goto('/app/admin/retraits');
  await expect(page).toHaveURL(/\/app(\/onboarding)?$/);
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  const res = await page.request.get('/api/admin/withdrawals');
  expect(res.status()).toBe(403);
});
