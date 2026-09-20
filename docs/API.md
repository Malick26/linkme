# API — vue d'ensemble

Contrat complet (source de vérité) : `services/api/src/main/resources/openapi/openapi.yaml` (OpenAPI 3.1).
Client TypeScript généré : `apps/web/src/app/core/api/schema.d.ts` (`npm run gen:api`).
Documentation interactive en développement : `http://localhost:8080/v3/api-docs` (désactivée en production).

**Conventions**

- Authentification : cookie de session `LM_SESSION` (httpOnly). Les requêtes mutantes exigent l'en-tête
  `X-XSRF-TOKEN` égal au cookie `XSRF-TOKEN` (obtenu via `GET /api/auth/csrf`). Les endpoints marqués *public*
  n'exigent pas de session (ils sont limités en débit).
- Erreurs : RFC 7807 `application/problem+json` avec un `code` machine stable (`HANDLE_TAKEN`, `OUT_OF_STOCK`,
  `AMOUNT_MISMATCH`, `RATE_LIMITED`…) traduit côté front.
- Montants : entiers en FCFA (XOF). Dates : ISO-8601 UTC. Pagination : `page` (≥ 0) et `size` (1–100).


## account

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `DELETE` | `/api/me` | `deleteAccount` | session | Suppression du compte (loi 2008-12) — anonymise les commandes, supprime le reste |
| `GET` | `/api/me` | `getMe` | session | Utilisateur courant |

## analytics

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/me/analytics` | `getAnalytics` | session | Statistiques de trafic |

## auth

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/auth/csrf` | `getCsrf` | public | Initialise le cookie XSRF-TOKEN |
| `POST` | `/api/auth/forgot` | `forgotPassword` | public | Mot de passe oublié |
| `GET` | `/api/auth/handle-availability` | `checkHandle` | public | Disponibilité d'un handle |
| `POST` | `/api/auth/login` | `login` | public | Se connecter |
| `POST` | `/api/auth/logout` | `logout` | session | Se déconnecter |
| `POST` | `/api/auth/register` | `register` | public | Créer un compte |
| `POST` | `/api/auth/reset` | `resetPassword` | public | Réinitialiser le mot de passe |

## blocks

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/me/blocks` | `listBlocks` | session | Lister les blocs |
| `POST` | `/api/me/blocks` | `createBlock` | session | Créer un bloc |
| `PUT` | `/api/me/blocks/order` | `reorderBlocks` | session | Réordonner les blocs |
| `DELETE` | `/api/me/blocks/{blockId}` | `deleteBlock` | session | Supprimer un bloc |
| `PUT` | `/api/me/blocks/{blockId}` | `updateBlock` | session | Modifier un bloc |
| `GET` | `/api/me/blocks/{blockId}/items` | `listBlockItems` | session | Lister les éléments |
| `POST` | `/api/me/blocks/{blockId}/items` | `createBlockItem` | session | Créer un élément |
| `PUT` | `/api/me/blocks/{blockId}/items/order` | `reorderBlockItems` | session | Réordonner les éléments |
| `DELETE` | `/api/me/blocks/{blockId}/items/{itemId}` | `deleteBlockItem` | session | Supprimer un élément |
| `PUT` | `/api/me/blocks/{blockId}/items/{itemId}` | `updateBlockItem` | session | Modifier un élément |

## payments

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/payments/mock/{reference}` | `mockPaymentPage` | public | Page de paiement simulée (profil dev/test uniquement) |
| `POST` | `/api/payments/mock/{reference}/complete` | `mockPaymentComplete` | public | Simuler l'issue d'un paiement (mock) |
| `POST` | `/api/webhooks/{provider}` | `paymentWebhook` | public | Webhook fournisseur de paiement |

## profile

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/me/messages` | `listContactMessages` | session | Messages reçus |
| `GET` | `/api/me/preview` | `getPreview` | session | Page construite à partir du brouillon (aperçu éditeur) |
| `GET` | `/api/me/profile` | `getProfile` | session | Lire le profil |
| `PUT` | `/api/me/profile` | `updateProfile` | session | Modifier le profil |
| `GET` | `/api/me/socials` | `getSocials` | session | Lire les réseaux |
| `PUT` | `/api/me/socials` | `updateSocials` | session | Remplacer les réseaux |
| `GET` | `/api/me/stats` | `getStats` | session | Lire les stats |
| `PUT` | `/api/me/stats` | `updateStats` | session | Modifier les stats |

## public

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/public/{handle}` | `getPublicPage` | public | Page publique |
| `GET` | `/api/public/{handle}/blocks/{slug}` | `getPublicBlock` | public | Détail d'un bloc public |
| `POST` | `/api/public/{handle}/contact` | `sendContactMessage` | public | Envoyer un message au créateur |
| `POST` | `/api/public/{handle}/events` | `trackEvent` | public | Enregistrer un événement analytics |
| `GET` | `/api/public/{handle}/products/{productId}` | `getPublicProduct` | public | Fiche produit publique |

## shop

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/me/earnings` | `getEarnings` | session | Mes gains |
| `GET` | `/api/me/orders` | `listOrders` | session | Lister mes commandes |
| `GET` | `/api/me/products` | `listProducts` | session | Lister mes produits |
| `POST` | `/api/me/products` | `createProduct` | session | Créer un produit |
| `DELETE` | `/api/me/products/{productId}` | `deleteProduct` | session | Suppression logique (les commandes restent) |
| `PUT` | `/api/me/products/{productId}` | `updateProduct` | session | Modifier un produit |
| `GET` | `/api/public/orders/{reference}` | `getOrderStatus` | public | Statut public d'une commande |
| `POST` | `/api/public/{handle}/checkout` | `checkout` | public | Créer une commande |

## theme

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `GET` | `/api/me/theme` | `getTheme` | session | Lire le thème |
| `PUT` | `/api/me/theme` | `saveThemeDraft` | session | Enregistrer le brouillon de thème |
| `POST` | `/api/me/theme/publish` | `publishTheme` | session | Publie le brouillon et rend la page visible |
| `GET` | `/api/theme/presets` | `listThemePresets` | public | Lister les presets |

## uploads

| Méthode | Chemin | operationId | Accès | Description |
|---|---|---|---|---|
| `POST` | `/api/me/uploads/complete` | `completeUpload` | session | Enregistre un asset Cloudinary après upload (vérifie la signature de la réponse Cloudinary) |
| `POST` | `/api/me/uploads/local` | `uploadLocal` | session | Upload direct (dev / sans Cloudinary). Désactivé si `LOCAL_UPLOADS_ENABLED=false`. |
| `POST` | `/api/me/uploads/sign` | `signUpload` | session | Signer un upload Cloudinary |

---

51 opérations. Généré depuis le contrat le 2026-09-20 (`python3 infra/scripts/gen_api_doc.py`).
