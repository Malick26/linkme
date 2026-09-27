-- Chantier C : parrainage à deux vitesses + portefeuille (D51–D56).
-- Le parrain touche un pourcentage de CHAQUE paiement d'abonnement de ses filleuls : 20 % en libre-service, ou un
-- taux « collab » négocié (≤ 60 %) jusqu'à une date d'expiration. Les gains sont gelés 7 jours, puis retirables
-- à partir de 1 500 FCFA ; le décaissement est manuel (espace admin).

-- Compte de parrainage : créé à la demande (première visite de la page « Parrainage »).
CREATE TABLE referral_account (
    user_id            uuid PRIMARY KEY REFERENCES users (id),
    code               varchar(12)  NOT NULL UNIQUE,
    collab_rate_bps    integer CHECK (collab_rate_bps BETWEEN 2000 AND 6000),
    collab_expires_at  timestamptz,
    created_at         timestamptz  NOT NULL,
    updated_at         timestamptz  NOT NULL,
    CONSTRAINT ck_referral_collab_pair CHECK ((collab_rate_bps IS NULL) = (collab_expires_at IS NULL))
);

-- Lien parrain → filleul, fixé une fois pour toutes à l'inscription (un filleul n'a qu'un parrain, jamais lui-même).
CREATE TABLE referral (
    referee_id      uuid PRIMARY KEY REFERENCES users (id),
    referrer_id     uuid         NOT NULL REFERENCES users (id),
    -- empreinte de l'IP d'inscription, salée par jour : sert uniquement au signal « même IP le même jour » (admin)
    signup_ip_hash  varchar(64),
    created_at      timestamptz  NOT NULL,
    CONSTRAINT ck_referral_not_self CHECK (referee_id <> referrer_id)
);
CREATE INDEX ix_referral_referrer ON referral (referrer_id, created_at DESC);

-- Un gain par paiement d'abonnement du filleul (unicité = idempotence). Taux et montant figés au paiement.
-- Un gain « bloqué » (auto-parrainage détecté) est conservé pour la trace mais ne crédite jamais le portefeuille.
CREATE TABLE referral_earning (
    id                       uuid PRIMARY KEY,
    referrer_id              uuid         NOT NULL REFERENCES users (id),
    referee_id               uuid         NOT NULL REFERENCES users (id),
    subscription_payment_id  uuid         NOT NULL UNIQUE REFERENCES subscription_payment (id),
    base_amount_xof          bigint       NOT NULL CHECK (base_amount_xof >= 0),
    rate_bps                 integer      NOT NULL CHECK (rate_bps BETWEEN 0 AND 6000),
    amount_xof               bigint       NOT NULL CHECK (amount_xof >= 0),
    blocked_reason           varchar(20)  CHECK (blocked_reason IN ('SELF_PAYMENT')),
    available_at             timestamptz  NOT NULL,
    created_at               timestamptz  NOT NULL
);
CREATE INDEX ix_referral_earning_referrer ON referral_earning (referrer_id, created_at DESC);

-- Demande de retrait : une seule ouverte à la fois par créateur.
CREATE TABLE withdrawal (
    id               uuid PRIMARY KEY,
    user_id          uuid          NOT NULL REFERENCES users (id),
    amount_xof       bigint        NOT NULL CHECK (amount_xof > 0),
    method           varchar(16)   NOT NULL CHECK (method IN ('wave', 'orange_money', 'free_money')),
    phone            varchar(20)   NOT NULL,
    status           varchar(10)   NOT NULL CHECK (status IN ('REQUESTED', 'PAID', 'REJECTED')),
    idempotency_key  varchar(64),
    provider_ref     varchar(128),
    note             varchar(500),
    processed_by     uuid REFERENCES users (id),
    created_at       timestamptz   NOT NULL,
    updated_at       timestamptz   NOT NULL,
    processed_at     timestamptz
);
CREATE UNIQUE INDEX ux_withdrawal_one_open ON withdrawal (user_id) WHERE status = 'REQUESTED';
CREATE UNIQUE INDEX ux_withdrawal_idempotency ON withdrawal (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX ix_withdrawal_status ON withdrawal (status, created_at);

-- Grand livre du portefeuille (append-only, comme ledger_entry) : le solde n'est JAMAIS stocké, il est la somme
-- des écritures dont available_at est passé. Un retrait réserve le montant dès la demande (écriture négative),
-- un refus le recrédite (écriture positive) ; un paiement ne crée pas d'écriture (l'argent est déjà sorti).
CREATE TABLE wallet_entry (
    id             uuid PRIMARY KEY,
    user_id        uuid         NOT NULL REFERENCES users (id),
    kind           varchar(24)  NOT NULL CHECK (kind IN ('REFERRAL_EARNING', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL')),
    amount_xof     bigint       NOT NULL,
    earning_id     uuid REFERENCES referral_earning (id),
    withdrawal_id  uuid REFERENCES withdrawal (id),
    available_at   timestamptz  NOT NULL,
    created_at     timestamptz  NOT NULL,
    CONSTRAINT ck_wallet_entry_sign CHECK ((kind = 'WITHDRAWAL' AND amount_xof < 0) OR (kind <> 'WITHDRAWAL' AND amount_xof > 0)),
    CONSTRAINT ck_wallet_entry_link CHECK ((kind = 'REFERRAL_EARNING') = (earning_id IS NOT NULL)
                                           AND (kind <> 'REFERRAL_EARNING') = (withdrawal_id IS NOT NULL))
);
CREATE UNIQUE INDEX ux_wallet_entry_earning ON wallet_entry (earning_id) WHERE earning_id IS NOT NULL;
CREATE UNIQUE INDEX ux_wallet_entry_withdrawal_kind ON wallet_entry (withdrawal_id, kind) WHERE withdrawal_id IS NOT NULL;
CREATE INDEX ix_wallet_entry_user ON wallet_entry (user_id, available_at);

-- forbid_mutation() est défini en V1
CREATE TRIGGER wallet_entry_immutable BEFORE UPDATE OR DELETE ON wallet_entry
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER referral_earning_immutable BEFORE UPDATE OR DELETE ON referral_earning
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
