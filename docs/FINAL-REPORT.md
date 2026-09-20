# Rapport final — LinkMe

Date : 20/09/2026 · dépôt : monorepo `apps/web` (Angular 22 SSR) + `services/api` (Spring Boot 3.5 / Java 21) +
`infra` (Docker Compose, Caddy) + `docs`.
Lecture recommandée : ce rapport → [`README.md`](../README.md) → [`docs/PROGRESS.md`](PROGRESS.md) →
[`docs/DECISIONS.md`](DECISIONS.md).

---

## 1. En une page

Le produit décrit par le brief est **construit dans sa totalité fonctionnelle** : page publique SSR fidèle à la
maquette, back-office complet, thème 100 % configurable avec aperçu live, boutique avec paiement mobile money,
webhooks sécurisés, grand livre immuable, analytics sans cookie, i18n FR/EN, infra Docker + Caddy et CI.

**Une réserve, une seule, mais elle compte** : l'environnement de construction n'avait accès ni à **Maven Central**
ni à **Docker Hub** (403 du proxy réseau, constaté à plusieurs reprises, y compris après votre message). Par
conséquent le back-end Java n'a **pas** pu être compilé par Maven ni exécuté, et `docker compose up` n'a pas pu être
lancé ici. Ce qui a été fait à la place, pour ne pas livrer du code jamais vérifié :

- compilation du back **avec `javac`** contre un jeu de 140 stubs Spring/Jakarta/Hibernate → **0 erreur, 0
  avertissement** sur l'ensemble de `src/main/java` et des tests unitaires ;
- **harnais de logique métier** exécuté sur la vraie JVM (commission, arrondis XOF, signatures HMAC, idempotence,
  contraste WCAG, validation d'URL…) → **46/46** ;
- **migrations Flyway jouées sur un PostgreSQL 16 local**, déclencheurs append-only vérifiés
  (`ERROR: table payment_event is append-only`) ;
- **mock d'API fidèle au contrat** (`apps/web/scripts/mock-api.mjs`) pour exécuter réellement les parcours
  bout-en-bout du front (inscription → onboarding → thème → publication → page publique, et achat complet).

Front : **61 tests unitaires**, **13 e2e** (régression visuelle 5 largeurs + axe), **4 e2e bout-en-bout**,
Lighthouse mobile **92/100/100/100**, JS initial **136,5 Ko gzip** (budget 150), **0 couleur codée en dur**.

---

## 2. Ce qui est fait

### P0 — intégralement
| Domaine | Détail |
|---|---|
| Page publique | SSR + hydratation incrémentale, fond plein écran, nom manuscrit + couronne + swash, punchline, catégories, bio, stats, rail social, cartes de liens, « My Links » (partage/copie/QR), menu « ··· », pages de bloc `/{handle}/{slug}`, 404 propre, OG/Twitter, 3 paliers responsive |
| Design system | 12 primitives, tokens CSS uniquement, polices auto-hébergées, icônes inlinées (Lucide ISC / Simple Icons CC0) |
| Thème | 38 champs `ThemeConfig`, 5 presets, brouillon/publié, undo/redo, autosave, garde-fou de contraste WCAG + correction en 1 clic, **aperçu live utilisant le composant de la page publique** |
| Back-office | Inscription/connexion/mot de passe oublié, onboarding 5 étapes, profil, blocs en glisser-déposer, boutique, ventes (filtres, CSV), messages, statistiques, réglages |
| Boutique & paiements | Produits, checkout mobile money, commission figée (8 %), webhooks signés + re-vérification serveur-à-serveur + idempotence, grand livre append-only, emails vente/reçu, adaptateurs Mock/PayDunya/CinetPay |
| Sécurité | Session httpOnly + CSRF, BCrypt 12, Bean Validation, limitation de débit (auth, checkout, webhooks, uploads, contact), CSP et en-têtes, allow-list de schémas d'URL, aucun secret dans le dépôt |
| Qualité | Tests listés ci-dessus, garde-fou tokens, garde-fou de poids de bundle, CI GitHub Actions complète |
| Infra & docs | Docker Compose (Caddy HTTPS → web SSR + api → Postgres), `.env.example` commenté, `deploy.sh`, `backup.sh`, `README.md`, `API.md` (51 opérations), 5 ADR, `DECISIONS.md` (37 décisions), `PROGRESS.md` |

### P1 — partiellement
- ✅ **Tableau de bord de trafic** (visites, visiteurs uniques, clics par bloc, 7/30 jours, sans cookie).
- ✅ **Palier Pro** : drapeau `plan` → `showBranding=false` masque « Powered by » et le logo plateforme.
- ⚠️ **Image OG** : l'image de fond est servie en 1200×630 via Cloudinary, mais **pas** de composition dynamique
  (nom + stats incrustés). Voir « ce qui reste ».
- ✅ Presets supplémentaires : 5 livrés (Sunset, Midnight Blue, Emerald Night, Rose Gold, Clean Light).

---

## 3. Ce qui reste

### À exécuter chez vous (bloqué ici par le réseau, pas par le code)
1. `cd services/api && ./mvnw verify` — compile le back, joue les tests unitaires **et** d'intégration
   (Testcontainers → Docker requis) et la règle de couverture ≥ 80 % sur `payments`, `shop`, `theme`.
2. `cd infra && cp .env.example .env && docker compose up --build` — pile complète, migrations, seed `/malick`.
3. Si `./mvnw verify` signale un écart, il sera de l'ordre du détail d'API de bibliothèque : la compilation contre
   stubs couvre la syntaxe, les types et les signatures, pas le câblage Spring au démarrage.

### P1 restant
- **Image OG dynamique composée** (nom + stats sur le fond) : générateur d'image côté serveur ou transformation
  Cloudinary avec surcouche texte.
- **Export media kit PDF** du palier Pro.

### P2 / pistes
- Paiement des reversements automatisé (aujourd'hui `PENDING_PAYOUT` + interface `PayoutProvider`, déclenchement
  manuel — D25).
- Nonce CSP par requête pour supprimer `'unsafe-inline'` (D28).
- Limitation de débit distribuée (Redis/Bucket4j) si plusieurs instances d'API (D21).
- Variantes de produits, livraison, codes promo (hors périmètre V1 — D6).
- Domaine personnalisé par créateur, thèmes partagés, import depuis Linktree.

---

## 4. Ce que vous devez fournir

| Élément | Où | Sans lui |
|---|---|---|
| **Domaine** + DNS `A`/`AAAA` vers le VPS | `SITE_DOMAIN`, `PUBLIC_BASE_URL`, `ACME_EMAIL` | Caddy ne peut pas obtenir de certificat Let's Encrypt |
| **VPS** (Hetzner CX22 suffit : 2 vCPU / 4 Go), Docker installé | — | pas de déploiement |
| **Mot de passe PostgreSQL** (`openssl rand -base64 32`) | `POSTGRES_PASSWORD` | la pile ne démarre pas |
| **Cloudinary** : cloud name, API key, API secret | `CLOUDINARY_*` | repli automatique sur des uploads locaux dans le volume `media` (fonctionne, mais pas de CDN ni de `f_auto,q_auto`) |
| **PayDunya** : master key, private key, token (+ `PAYDUNYA_MODE=live`) | `PAYDUNYA_*` | adaptateur inactif → le checkout répond `PAYMENT_UNAVAILABLE` |
| **CinetPay** : API key, site ID, secret key | `CINETPAY_*` | idem (montants XOF multiples de 5 exigés par CinetPay) |
| **URL de notification** à déclarer chez le fournisseur | `https://<domaine>/api/webhooks/paydunya` · `/cinetpay` | les paiements restent `PENDING` |
| **SMTP** : hôte, port, identifiants, expéditeur | `SMTP_*`, `MAIL_FROM` | pas d'email de vente, de reçu ni de réinitialisation (log d'erreur au démarrage en prod) |
| Décision commerciale : **taux de commission** | `PLATFORM_COMMISSION_PERCENT` (défaut 8) | 8 % appliqué |
| Vos **vraies photos** et le **nom de marque** définitif | upload dans le back-office · `apps/web/src/app/core/config/brand.ts` | démo avec placeholders générés et le nom provisoire « LinkMe » |

Rappel : `SEED_DEMO` et `PAYMENT_MOCK_ENABLED` doivent rester à `false` en production (D35), et
`SPRING_PROFILES_ACTIVE=prod`.

---

## 5. Risques connus

| # | Risque | Gravité | Atténuation en place |
|---|---|---|---|
| R1 | Le back n'a jamais démarré dans cet environnement (Maven/Docker bloqués) : un défaut de câblage Spring au démarrage resterait invisible | Moyenne | javac contre stubs (0 erreur), harnais logique 46/46, migrations jouées sur Postgres réel, test de contrat OpenAPI↔handlers, CI qui refait tout. **Premier `docker compose up` à faire attentivement.** |
| R2 | Adaptateurs PayDunya/CinetPay écrits d'après la documentation publique, jamais confrontés aux vraies API | Élevée si non testé | Re-vérification serveur-à-serveur systématique, contrôle montant/devise, journal append-only. **Faire un paiement réel en sandbox avant d'ouvrir les ventes.** |
| R3 | Un fournisseur qui ne signe pas ses notifications ferait reposer la sécurité sur la seule re-vérification | Moyenne | Signature vérifiée avant tout usage (D32) ; statut jamais accepté depuis la notification seule (D24) |
| R4 | `'unsafe-inline'` dans la CSP (event-replay Angular) | Faible | Reste strict ailleurs ; aucune donnée utilisateur injectée en HTML brut ; nonce par requête prévu (D28) |
| R5 | Limitation de débit en mémoire → inefficace si plusieurs instances d'API | Faible en V1 | Une seule instance en V1 ; interface remplaçable par Redis (D21) |
| R6 | `EMAIL_TAKEN` (409) à l'inscription permet de tester l'existence d'un email | Faible | Risque **accepté et documenté** (D37) ; « mot de passe oublié » reste muet |
| R7 | Fidélité à la maquette : à 390 px certains sous-titres passent sur 2 lignes | Cosmétique | Écart documenté et validé par la revue design (D10) ; comparaison `docs/design/compare-390.png` |
| R8 | Sauvegardes : les scripts existent mais ne sont pas planifiés | Moyenne | `infra/scripts/backup.sh` + ligne cron fournie dans le README — **à activer au déploiement** |
| R9 | Reversements manuels aux créateurs | Moyenne | Grand livre + statut `PENDING_PAYOUT` ; à automatiser en P2 (D25) |

---

## 6. Où regarder en premier

- Page publique et fidélité : `docs/design/screens/malick-390-public.png`, `compare-390.png`.
- Éditeur : `docs/design/screens/editor-design-1280.png` (aperçu live à droite), `editor-blocks-390.png`.
- Contrat : `services/api/src/main/resources/openapi/openapi.yaml` · résumé lisible : `docs/API.md`.
- Règles du projet : `CLAUDE.md` (11 règles non négociables).
- Toutes les hypothèses prises à votre place : `docs/DECISIONS.md` (D1–D37).
