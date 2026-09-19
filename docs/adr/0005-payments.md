# ADR 0005 — Paiements mobile money

- Statut : accepté
- Décision : ports `PaymentProvider` (init, vérification, parsing webhook) et `PayoutProvider` ; adaptateurs `mock` (dev/tests, signature HMAC), `paydunya`, `cinetpay` (activés uniquement si leurs variables d'environnement sont présentes).
- Flux : `POST /checkout` crée `order(PENDING)` avec commission figée (`floor(amount × pct / 100)`), appelle `init` → URL de paiement. Le webhook est journalisé tel quel dans `payment_event` (append-only, unicité `(provider, event_id)`), signature vérifiée, statut **re-vérifié** auprès du fournisseur, montant et devise comparés, puis transition d'état idempotente (`PENDING → PAID|FAILED|CANCELED`, états finaux immuables). `PAID` crée les écritures `ledger_entry` (brut, commission, net) et déclenche les emails.
- Stock : décrémenté au passage `PAID` (verrou pessimiste sur la ligne produit) ; si stock épuisé entre-temps, commande `PAID` marquée `needs_attention` pour remboursement manuel.
