-- Chantier D : codes promo sur les abonnements (D59), prospects et CRM WhatsApp/email (D60–D63).

-- Code promo créé par l'admin : % de réduction sur un paiement d'abonnement, nombre d'usages, échéance facultative.
CREATE TABLE promo_code (
    id           uuid PRIMARY KEY,
    code         varchar(24)  NOT NULL UNIQUE CHECK (code = upper(code) AND code ~ '^[A-Z0-9_-]{3,24}$'),
    percent_off  integer      NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
    max_uses     integer      NOT NULL CHECK (max_uses BETWEEN 1 AND 100000),
    uses_count   integer      NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
    valid_until  timestamptz,
    active       boolean      NOT NULL DEFAULT true,
    created_by   uuid REFERENCES users (id),
    created_at   timestamptz  NOT NULL,
    updated_at   timestamptz  NOT NULL
);

-- Code utilisé sur un paiement d'abonnement : réduction figée au checkout ; l'usage n'est compté qu'au paiement
-- effectif (paid_at). Un créateur n'utilise un même code qu'une fois (paiement réussi ou en attente).
ALTER TABLE subscription_payment
    ADD COLUMN promo_code_id uuid REFERENCES promo_code (id),
    ADD COLUMN discount_xof  bigint NOT NULL DEFAULT 0 CHECK (discount_xof >= 0);
CREATE UNIQUE INDEX ux_subscription_payment_promo_once ON subscription_payment (creator_id, promo_code_id)
    WHERE promo_code_id IS NOT NULL AND status IN ('PENDING', 'PAID');

-- Prospects (page publique /rejoindre) : créateurs pas encore inscrits qui acceptent de recevoir les nouveautés.
CREATE TABLE prospect (
    id                 uuid PRIMARY KEY,
    name               varchar(60),
    email              varchar(254),
    phone              varchar(20),
    consent_at         timestamptz  NOT NULL,
    unsubscribed_at    timestamptz,
    unsubscribe_token  varchar(64)  NOT NULL UNIQUE,
    ip_hash            varchar(64),
    created_at         timestamptz  NOT NULL,
    updated_at         timestamptz  NOT NULL,
    CONSTRAINT ck_prospect_reachable CHECK (email IS NOT NULL OR phone IS NOT NULL)
);
CREATE UNIQUE INDEX ux_prospect_email ON prospect (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX ux_prospect_phone ON prospect (phone) WHERE phone IS NOT NULL;

-- Désinscription des créateurs (lien dans chaque email du CRM) : jeton créé au premier email envoyé.
ALTER TABLE users
    ADD COLUMN marketing_opt_out_at timestamptz,
    ADD COLUMN unsubscribe_token    varchar(64) UNIQUE;

-- Journal des relances (email envoyé, message WhatsApp ouvert) : sert à « dernier contact » dans le CRM.
CREATE TABLE crm_contact_log (
    id            uuid PRIMARY KEY,
    contact_kind  varchar(10)  NOT NULL CHECK (contact_kind IN ('creator', 'prospect')),
    contact_id    uuid         NOT NULL,
    channel       varchar(10)  NOT NULL CHECK (channel IN ('whatsapp', 'email')),
    admin_id      uuid REFERENCES users (id),
    subject       varchar(150),
    created_at    timestamptz  NOT NULL
);
CREATE INDEX ix_crm_contact_log_contact ON crm_contact_log (contact_kind, contact_id, created_at DESC);
