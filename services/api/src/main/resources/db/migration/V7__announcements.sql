-- Chantier E : annonces en pop-up sur l'accueil et/ou le tableau de bord (D65, D66).
CREATE TABLE announcement (
    id          uuid PRIMARY KEY,
    title       varchar(80)  NOT NULL,
    body        varchar(500) NOT NULL,
    cta_label   varchar(40),
    cta_url     varchar(500),
    audience    varchar(10)  NOT NULL CHECK (audience IN ('landing', 'dashboard', 'both')),
    starts_at   timestamptz  NOT NULL,
    ends_at     timestamptz,
    active      boolean      NOT NULL DEFAULT true,
    created_by  uuid REFERENCES users (id),
    created_at  timestamptz  NOT NULL,
    updated_at  timestamptz  NOT NULL,
    CONSTRAINT ck_announcement_cta_pair CHECK ((cta_label IS NULL) = (cta_url IS NULL)),
    CONSTRAINT ck_announcement_period CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX ix_announcement_live ON announcement (starts_at DESC) WHERE active;
