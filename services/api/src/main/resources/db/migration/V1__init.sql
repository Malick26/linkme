-- LinkMe — schéma initial (brief §8). UUID générés côté application, horodatages UTC (timestamptz), montants BIGINT FCFA.

CREATE TABLE users (
    id              uuid PRIMARY KEY,
    email           varchar(254) NOT NULL,
    password_hash   varchar(255) NOT NULL,
    created_at      timestamptz  NOT NULL,
    updated_at      timestamptz  NOT NULL,
    deleted_at      timestamptz
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE asset (
    id              uuid PRIMARY KEY,
    owner_id        uuid         REFERENCES users (id) ON DELETE CASCADE,
    provider        varchar(16)  NOT NULL CHECK (provider IN ('cloudinary', 'local', 'seed')),
    public_id       varchar(255) NOT NULL,
    kind            varchar(16)  NOT NULL CHECK (kind IN ('background', 'thumbnail', 'product', 'item')),
    width           integer,
    height          integer,
    format          varchar(10),
    bytes           integer,
    placeholder     text,
    created_at      timestamptz  NOT NULL
);
CREATE INDEX ix_asset_owner ON asset (owner_id);

CREATE TABLE creator_profile (
    user_id              uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    handle               varchar(30)  NOT NULL,
    display_name         varchar(60)  NOT NULL,
    tagline_lines        jsonb        NOT NULL DEFAULT '[]'::jsonb,
    categories           jsonb        NOT NULL DEFAULT '[]'::jsonb,
    bio                  varchar(160) NOT NULL DEFAULT '',
    background_asset_id  uuid         REFERENCES asset (id) ON DELETE SET NULL,
    plan                 varchar(8)   NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    published            boolean      NOT NULL DEFAULT false,
    onboarding_completed boolean      NOT NULL DEFAULT false,
    created_at           timestamptz  NOT NULL,
    updated_at           timestamptz  NOT NULL,
    CONSTRAINT ck_handle_format CHECK (handle ~ '^[a-z0-9._-]{3,30}$')
);
CREATE UNIQUE INDEX ux_creator_handle ON creator_profile (handle);

CREATE TABLE social_account (
    id               uuid PRIMARY KEY,
    creator_id       uuid         NOT NULL REFERENCES creator_profile (user_id) ON DELETE CASCADE,
    platform         varchar(16)  NOT NULL,
    url              varchar(2048) NOT NULL,
    followers_count  bigint       NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
    position         integer      NOT NULL,
    updated_at       timestamptz  NOT NULL
);
CREATE INDEX ix_social_creator ON social_account (creator_id, position);

CREATE TABLE profile_stats (
    creator_id   uuid PRIMARY KEY REFERENCES creator_profile (user_id) ON DELETE CASCADE,
    followers    bigint      NOT NULL DEFAULT 0 CHECK (followers >= 0),
    likes        bigint      NOT NULL DEFAULT 0 CHECK (likes >= 0),
    views_30d    bigint      NOT NULL DEFAULT 0 CHECK (views_30d >= 0),
    updated_at   timestamptz
);

CREATE TABLE block (
    id                  uuid PRIMARY KEY,
    creator_id          uuid         NOT NULL REFERENCES creator_profile (user_id) ON DELETE CASCADE,
    type                varchar(16)  NOT NULL CHECK (type IN ('travel', 'shop', 'music', 'content', 'contact', 'link')),
    slug                varchar(40)  NOT NULL,
    title               varchar(40)  NOT NULL,
    subtitle            varchar(80)  NOT NULL DEFAULT '',
    icon                varchar(24),
    thumbnail_asset_id  uuid         REFERENCES asset (id) ON DELETE SET NULL,
    url                 varchar(2048),
    position            integer      NOT NULL,
    visible             boolean      NOT NULL DEFAULT true,
    config              jsonb        NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz  NOT NULL,
    updated_at          timestamptz  NOT NULL,
    CONSTRAINT ux_block_slug UNIQUE (creator_id, slug)
);
CREATE INDEX ix_block_creator ON block (creator_id, position);

CREATE TABLE block_item (
    id              uuid PRIMARY KEY,
    block_id        uuid          NOT NULL REFERENCES block (id) ON DELETE CASCADE,
    title           varchar(80)   NOT NULL,
    description     varchar(500)  NOT NULL DEFAULT '',
    url             varchar(2048),
    image_asset_id  uuid          REFERENCES asset (id) ON DELETE SET NULL,
    position        integer       NOT NULL
);
CREATE INDEX ix_block_item_block ON block_item (block_id, position);

CREATE TABLE theme (
    creator_id    uuid PRIMARY KEY REFERENCES creator_profile (user_id) ON DELETE CASCADE,
    draft         jsonb       NOT NULL,
    published     jsonb,
    version       integer     NOT NULL DEFAULT 0,
    updated_at    timestamptz NOT NULL,
    published_at  timestamptz
);

CREATE TABLE product (
    id           uuid PRIMARY KEY,
    creator_id   uuid          NOT NULL REFERENCES creator_profile (user_id),
    title        varchar(80)   NOT NULL,
    price_xof    bigint        NOT NULL CHECK (price_xof BETWEEN 100 AND 10000000),
    description  varchar(2000) NOT NULL DEFAULT '',
    stock        integer       CHECK (stock IS NULL OR stock >= 0),
    active       boolean       NOT NULL DEFAULT true,
    image_ids    jsonb         NOT NULL DEFAULT '[]'::jsonb,
    created_at   timestamptz   NOT NULL,
    updated_at   timestamptz   NOT NULL,
    deleted_at   timestamptz,
    version      bigint        NOT NULL DEFAULT 0
);
CREATE INDEX ix_product_creator ON product (creator_id) WHERE deleted_at IS NULL;

-- Commandes : jamais supprimées (brief §8). « order » est un mot réservé SQL → « orders ».
CREATE TABLE orders (
    id                  uuid PRIMARY KEY,
    reference           varchar(15)   NOT NULL UNIQUE,
    creator_id          uuid          NOT NULL REFERENCES creator_profile (user_id),
    product_id          uuid          NOT NULL REFERENCES product (id),
    product_title       varchar(80)   NOT NULL,
    quantity            integer       NOT NULL CHECK (quantity BETWEEN 1 AND 10),
    unit_price_xof      bigint        NOT NULL CHECK (unit_price_xof > 0),
    amount_xof          bigint        NOT NULL CHECK (amount_xof > 0),
    commission_percent  numeric(5, 2) NOT NULL CHECK (commission_percent BETWEEN 0 AND 100),
    commission_xof      bigint        NOT NULL CHECK (commission_xof >= 0),
    net_xof             bigint        NOT NULL CHECK (net_xof >= 0),
    currency            varchar(3)    NOT NULL DEFAULT 'XOF',
    status              varchar(10)   NOT NULL CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELED')),
    provider            varchar(16)   NOT NULL,
    provider_ref        varchar(128),
    payment_url         varchar(1024),
    buyer_name          varchar(80)   NOT NULL,
    buyer_phone         varchar(20)   NOT NULL,
    buyer_email         varchar(254),
    idempotency_key     varchar(64),
    payout_status       varchar(16)   NOT NULL DEFAULT 'NONE' CHECK (payout_status IN ('NONE', 'PENDING_PAYOUT', 'PAID_OUT')),
    needs_attention     boolean       NOT NULL DEFAULT false,
    created_at          timestamptz   NOT NULL,
    updated_at          timestamptz   NOT NULL,
    paid_at             timestamptz,
    CONSTRAINT ck_amounts CHECK (amount_xof = unit_price_xof * quantity AND commission_xof + net_xof = amount_xof)
);
CREATE INDEX ix_orders_creator ON orders (creator_id, created_at DESC);
CREATE UNIQUE INDEX ux_orders_idempotency ON orders (creator_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Journal des événements de paiement : append-only (brief §7.4 « traçable, immuable »).
CREATE TABLE payment_event (
    id                 uuid PRIMARY KEY,
    provider           varchar(16)  NOT NULL,
    event_id           varchar(160) NOT NULL,
    order_reference    varchar(15),
    type               varchar(32)  NOT NULL,
    payload            jsonb        NOT NULL,
    signature_valid    boolean      NOT NULL,
    result             varchar(32)  NOT NULL,
    received_at        timestamptz  NOT NULL,
    CONSTRAINT ux_payment_event UNIQUE (provider, event_id)
);
CREATE INDEX ix_payment_event_ref ON payment_event (order_reference);

-- Grand livre : écritures immuables
CREATE TABLE ledger_entry (
    id           uuid PRIMARY KEY,
    creator_id   uuid        NOT NULL REFERENCES creator_profile (user_id),
    order_id     uuid        REFERENCES orders (id),
    kind         varchar(16) NOT NULL CHECK (kind IN ('SALE_GROSS', 'COMMISSION', 'CREATOR_NET', 'PAYOUT')),
    amount_xof   bigint      NOT NULL,
    created_at   timestamptz NOT NULL
);
CREATE INDEX ix_ledger_creator ON ledger_entry (creator_id, created_at);
CREATE UNIQUE INDEX ux_ledger_order_kind ON ledger_entry (order_id, kind) WHERE kind <> 'PAYOUT';

CREATE FUNCTION forbid_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'table % is append-only', TG_TABLE_NAME;
END;
$$;
CREATE TRIGGER payment_event_immutable BEFORE UPDATE OR DELETE ON payment_event
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER ledger_entry_immutable BEFORE UPDATE OR DELETE ON ledger_entry
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE contact_message (
    id          uuid PRIMARY KEY,
    creator_id  uuid          NOT NULL REFERENCES creator_profile (user_id) ON DELETE CASCADE,
    name        varchar(80)   NOT NULL,
    email       varchar(254),
    phone       varchar(20),
    message     varchar(2000) NOT NULL,
    created_at  timestamptz   NOT NULL,
    read_at     timestamptz
);
CREATE INDEX ix_contact_creator ON contact_message (creator_id, created_at DESC);

CREATE TABLE analytics_event (
    id             bigserial PRIMARY KEY,
    creator_id     uuid         NOT NULL REFERENCES creator_profile (user_id) ON DELETE CASCADE,
    type           varchar(16)  NOT NULL CHECK (type IN ('page_view', 'link_click')),
    block_id       uuid,
    target         varchar(64),
    referrer_host  varchar(255),
    visitor_hash   varchar(16)  NOT NULL,
    created_at     timestamptz  NOT NULL
);
CREATE INDEX ix_analytics_creator_time ON analytics_event (creator_id, created_at);

CREATE TABLE password_reset_token (
    id          uuid PRIMARY KEY,
    user_id     uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  varchar(64) NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    used_at     timestamptz
);
