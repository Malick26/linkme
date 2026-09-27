# LinkMe — hub créateur (page bio-link premium)

Application web responsive qui permet à un créateur de contenu de publier en moins de 15 minutes une **page
personnelle premium** : preuve sociale, blocs (voyages, shop, sons, contenus, contact), boutique payée en **mobile
money (FCFA)** et **design 100 % configurable avec aperçu en direct**.

> « LinkMe » est un nom provisoire : il vit dans `apps/web/src/app/core/config/brand.ts` (`BRAND_NAME`, `BRAND_LOGO`)
> et nulle part ailleurs.

| | |
|---|---|
| Front | Angular 22 (standalone, signals, zoneless) + `@angular/ssr`, SCSS + CSS custom properties |
| Back | Spring Boot 3.5 / Java 21, monolithe modulaire, PostgreSQL 16 + Flyway |
| Contrat | OpenAPI 3.1 (`services/api/src/main/resources/openapi/openapi.yaml`) → client TS généré |
| Infra | Docker Compose : Caddy (HTTPS) → web (SSR) + api → PostgreSQL |
| Démo | `/malick` (seed du brief, images générées) |

Documents : [`CLAUDE.md`](CLAUDE.md) (conventions) · [`docs/DECISIONS.md`](docs/DECISIONS.md) ·
[`docs/PROGRESS.md`](docs/PROGRESS.md) · [`docs/API.md`](docs/API.md) · [`docs/FINAL-REPORT.md`](docs/FINAL-REPORT.md) ·
[`docs/design/tokens.md`](docs/design/tokens.md) · ADR dans [`docs/adr/`](docs/adr).

---

## 1. Démarrage rapide (stack complète)

Prérequis : Docker + Docker Compose.

```bash
cd infra
cp .env.example .env
# pour une démo locale avec le seed /malick et le paiement simulé :
#   SPRING_PROFILES_ACTIVE=dev   SEED_DEMO=true   PAYMENT_MOCK_ENABLED=true
#   POSTGRES_PASSWORD=$(openssl rand -base64 32)
docker compose up --build
```

- Site : <https://localhost> (certificat local Caddy — accepter l'avertissement)
- Sous Windows, les ports 80/443 sont souvent réservés (`winnat`, IIS) et Docker répond
  « bind: an attempt was made to access a socket… ». Deux solutions : libérer le port
  (`net stop winnat` puis `net start winnat` après le démarrage) ou, dans `.env`, poser
  `HTTP_PORT=8088`, `HTTPS_PORT=8443`, `PUBLIC_BASE_URL=https://localhost:8443` et
  `ALLOWED_HOSTS=localhost,localhost:8443,web` → le site répond alors sur <https://localhost:8443>.
- Page de démo : <https://localhost/malick> · back-office : <https://localhost/login>
  (`malick@demo.linkme.sn` / `demo-malick-2026`, modifiable par `DEMO_PASSWORD`)

## 2. Développement

```bash
# 1) API (PostgreSQL local requis, ou `docker compose up db`)
cd services/api && ./mvnw spring-boot:run          # profil dev : seed /malick, paiements simulés, uploads locaux

# 2) Front (proxy /api → :8080)
cd apps/web && npm ci && npm start                 # http://localhost:4200

# 2 bis) sans back Java : mock d'API fidèle au contrat (in-memory)
cd apps/web && npm run mock-api                    # http://localhost:8080
```

Parcours bout-en-bout contre ce mock (utilisé pour `npm run e2e:fullstack` sans Docker) :

```bash
cd apps/web && npm run build
PUBLIC_BASE_URL=http://localhost:4101 MOCK_ADMIN_EMAILS=admin-e2e@test.sn node scripts/mock-api.mjs &
PORT=4101 API_PROXY=true API_INTERNAL_URL=http://localhost:8080 \
  PUBLIC_BASE_URL=http://localhost:4101 node dist/web/server/server.mjs &
E2E_BASE_URL=http://localhost:4101 npm run e2e:fullstack
# parcours retrait/admin du parrainage : relancer le mock sans gel des gains
# MOCK_REFERRAL_HOLD_DAYS=0 (mock) et MOCK_REFERRAL_HOLD_DAYS=0 E2E_BASE_URL=… npx playwright test e2e/fullstack/referral.spec.ts
```

| Commande (dans `apps/web`) | Effet |
|---|---|
| `npm start` | serveur de développement Angular |
| `npm run build` / `npm run serve:ssr` | build SSR / serveur Node (port 4000) |
| `npm test` | tests unitaires (Vitest) |
| `npm run e2e` | e2e + régression visuelle + axe sur la page publique (fixtures) |
| `npm run e2e:fullstack` | parcours bout-en-bout (`E2E_BASE_URL=…`) |
| `npm run gen:api` | régénère le client TS et les presets depuis l'OpenAPI |
| `npm run lint` | garde-fou tokens + typecheck |
| `npm run check:tokens` | échoue si une couleur est codée en dur dans un composant |

| Commande (dans `services/api`) | Effet |
|---|---|
| `./mvnw verify` | tests unitaires + intégration (Testcontainers) + couverture |
| `./mvnw spring-boot:run` | API en profil `dev` |

Images de démonstration : `python3 infra/scripts/gen_seed_images.py` (Pillow) — elles sont générées, aucune image
protégée n'est utilisée.

## 3. Variables d'environnement

Tout est décrit et commenté dans [`infra/.env.example`](infra/.env.example). Les essentielles :

| Variable | Rôle |
|---|---|
| `SITE_DOMAIN`, `PUBLIC_BASE_URL`, `ACME_EMAIL` | domaine servi par Caddy (HTTPS automatique) et URL publique |
| `POSTGRES_*` | base de données (mot de passe : `openssl rand -base64 32`) |
| `SPRING_PROFILES_ACTIVE` | `prod` (défaut) ou `dev` |
| `PLATFORM_COMMISSION_PERCENT` | commission plateforme (défaut **8 %**) |
| `CLOUDINARY_*` | images (upload signé). Vides → uploads locaux dans le volume `media` |
| `PAYMENT_DEFAULT_PROVIDER`, `PAYDUNYA_*`, `CINETPAY_*` | paiements mobile money |
| `SMTP_*`, `MAIL_FROM` | emails (ventes, reçus, réinitialisation) |
| `SEED_DEMO`, `PAYMENT_MOCK_ENABLED` | démo et paiement simulé — **toujours `false` en production** |
| `ADMIN_EMAILS` | comptes ayant accès à l'espace admin (retraits, collabs) — ex. `toi@exemple.sn` |
| `REFERRAL_BASE_RATE_BPS`, `REFERRAL_HOLD_DAYS`, `REFERRAL_MIN_WITHDRAWAL_XOF` | parrainage : 20 %, gel 7 jours, retrait dès 1 500 FCFA |

### Parrainage et retraits (espace admin)

Chaque créateur a un lien `https://<domaine>/r/<CODE>` (page **Parrainage**). Il touche 20 % de **chaque** paiement
d'abonnement de ses filleuls (ou le taux d'une collab négociée, ≤ 60 %, jusqu'à une date d'expiration), gelé 7 jours,
puis retirable dès 1 500 FCFA depuis **Portefeuille**. Les retraits sont **envoyés à la main** :

1. mettre ton email dans `ADMIN_EMAILS`, redémarrer l'API, te reconnecter → l'entrée **Admin** apparaît ;
2. `/app/admin/retraits` liste les demandes avec le numéro complet et des signaux anti-fraude (gains bloqués pour
   auto-parrainage, inscriptions depuis la même IP le même jour) ;
3. envoie l'argent sur Wave / Orange Money / Free Money, puis **Marquer comme payé** (avec la référence de la
   transaction) — ou **Refuser** avec un motif : le montant est recrédité au créateur, qui reçoit un email ;
4. même page, section **Collabs négociées** : taux entre 20 et 60 % et date d'expiration pour un créateur donné.

### Brancher les paiements

1. **PayDunya** (<https://paydunya.com>) : créer une application, récupérer *Master Key*, *Private Key*, *Token*,
   renseigner `PAYDUNYA_*` et `PAYDUNYA_MODE=live`. L'URL de notification à déclarer est
   `https://<domaine>/api/webhooks/paydunya`.
2. **CinetPay** (<https://cinetpay.com>) : *API key*, *Site ID*, *Secret key* → `CINETPAY_*` ; notification
   `https://<domaine>/api/webhooks/cinetpay`. CinetPay exige des montants XOF multiples de 5.
3. `PAYMENT_DEFAULT_PROVIDER=paydunya` (ou `cinetpay`). Un adaptateur sans clés reste inactif : le checkout répond
   `PAYMENT_UNAVAILABLE` plutôt que d'échouer silencieusement.
4. Vérifier un paiement de bout en bout en `test`/`sandbox` avant d'ouvrir les ventes.

Chaque notification est journalisée (`payment_event`, table append-only), sa signature vérifiée, **puis le statut est
re-vérifié auprès du fournisseur** et le montant comparé avant tout passage en `PAID` (ADR 0005).

## 4. Déploiement (VPS Hetzner)

```bash
# sur le VPS (Ubuntu 24.04), en root
apt update && apt install -y docker.io docker-compose-plugin git
git clone <votre-dépôt> /opt/linkme && cd /opt/linkme/infra
cp .env.example .env && nano .env      # domaine, secrets, clés
docker compose up -d --build
```

Pointer l'enregistrement DNS `A` (et `AAAA`) du domaine vers le VPS **avant** le premier démarrage : Caddy obtient le
certificat Let's Encrypt automatiquement. Ouvrir les ports 80/443 uniquement.

Mise à jour : `git pull && docker compose up -d --build` (les migrations Flyway s'appliquent au démarrage de l'API).

Script d'aide : [`infra/scripts/deploy.sh`](infra/scripts/deploy.sh).

### Sauvegarde / restauration

```bash
# sauvegarde quotidienne (base + médias) — voir infra/scripts/backup.sh
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz
docker run --rm -v linkme_media:/data -v "$PWD":/out alpine tar czf /out/media-$(date +%F).tar.gz -C /data .

# restauration
gunzip -c backup-2026-09-20.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
docker run --rm -v linkme_media:/data -v "$PWD":/in alpine tar xzf /in/media-2026-09-20.tar.gz -C /data
```

`infra/scripts/backup.sh` fait les deux et garde 14 jours d'historique — à mettre en cron :
`0 3 * * * /opt/linkme/infra/scripts/backup.sh >> /var/log/linkme-backup.log 2>&1`.

## 5. Qualité

- Tests front : 61 unitaires (Vitest) + 13 e2e (Playwright, dont régression visuelle 390/430/768/1280/1440 et axe) +
  4 e2e bout-en-bout.
- Tests back : unitaires + intégration Testcontainers (auth, thème, page publique, paiements) ; couverture ≥ 80 % sur
  `payments`, `shop`, `theme` (règle JaCoCo).
- Performance : Lighthouse mobile ≥ 90 sur `/{handle}` (LCP 2,2 s, CLS 0) ; JS initial ≈ 125 Ko gzip (budget 150).
- Accessibilité : WCAG 2.2 AA visé, 0 violation axe critique/sérieuse, cibles ≥ 44 px, `prefers-reduced-motion`.
- CI : `.github/workflows/ci.yml` (contrat, front, API, images Docker, e2e complet, Lighthouse CI).

## 6. Licence et contenus

Polices sous SIL OFL (`apps/web/public/fonts/LICENSES.md`), icônes Lucide (ISC) et Simple Icons (CC0).
Les images de démonstration sont **générées** par `infra/scripts/gen_seed_images.py`.
