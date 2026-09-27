-- Abonnement obligatoire pour la visibilité publique (D44/D45/D46) : il n'existe plus de plan gratuit publiable.
-- La création de compte et l'édition du profil restent libres ; seule la page publique exige un abonnement actif.

ALTER TABLE users ADD COLUMN phone varchar(20);

-- Les anciennes valeurs 'free'/'pro' (cosmétique, sans lien avec un paiement réel) sont remplacées par les deux
-- vrais plans payants. On retire d'abord l'ancienne contrainte ('free'/'pro' uniquement), sinon la mise à jour
-- des lignes existantes (seed/démo) vers 'standard' la viole avant même que la nouvelle contrainte n'existe.
ALTER TABLE creator_profile DROP CONSTRAINT IF EXISTS creator_profile_plan_check;
UPDATE creator_profile SET plan = 'standard' WHERE plan NOT IN ('standard', 'boutique');
ALTER TABLE creator_profile ALTER COLUMN plan SET DEFAULT 'standard';
ALTER TABLE creator_profile ADD CONSTRAINT ck_creator_profile_plan CHECK (plan IN ('standard', 'boutique'));

ALTER TABLE creator_profile
    ADD COLUMN subscription_status varchar(10) NOT NULL DEFAULT 'inactive',
    ADD COLUMN subscription_expires_at timestamptz,
    ADD COLUMN subscription_started_at timestamptz;
ALTER TABLE creator_profile ADD CONSTRAINT ck_subscription_status CHECK (subscription_status IN ('inactive', 'active', 'expired'));
CREATE INDEX ix_creator_profile_subscription_expiry ON creator_profile (subscription_expires_at) WHERE subscription_status = 'active';

-- Paiement d'une période d'abonnement (30 jours). Un même parcours de paiement (fournisseur, webhook, idempotence)
-- que les commandes boutique (interface Payable, D47) mais une table dédiée : ce n'est pas une vente à un client,
-- c'est le créateur qui paie la plateforme pour rester visible.
CREATE TABLE subscription_payment (
    id               uuid PRIMARY KEY,
    reference        varchar(15)  NOT NULL UNIQUE,
    creator_id       uuid         NOT NULL REFERENCES creator_profile (user_id),
    plan             varchar(8)   NOT NULL CHECK (plan IN ('standard', 'boutique')),
    period_days      integer      NOT NULL DEFAULT 30 CHECK (period_days > 0),
    amount_xof       bigint       NOT NULL CHECK (amount_xof >= 0),
    currency         varchar(3)   NOT NULL DEFAULT 'XOF',
    status           varchar(10)  NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELED')),
    provider         varchar(16)  NOT NULL,
    provider_ref     varchar(128),
    payment_url      varchar(1024),
    payer_name       varchar(80)  NOT NULL,
    payer_phone      varchar(20)  NOT NULL,
    idempotency_key  varchar(64),
    needs_attention  boolean      NOT NULL DEFAULT false,
    created_at       timestamptz  NOT NULL,
    updated_at       timestamptz  NOT NULL,
    paid_at          timestamptz
);
CREATE INDEX ix_subscription_payment_creator ON subscription_payment (creator_id, created_at DESC);
CREATE UNIQUE INDEX ux_subscription_payment_idempotency ON subscription_payment (creator_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
