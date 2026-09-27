package com.linkme.api.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.linkme.api.common.Masking;
import com.linkme.api.referral.Referral;
import com.linkme.api.referral.ReferralAccount;
import com.linkme.api.referral.ReferralEarning;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Règles pures du parrainage (D51–D54) : commission entière, taux effectif/collab, masquage, auto-parrainage. */
class ReferralRulesTest {
    @Test
    void commissionEnFcfaEntiersArrondieALUniteInferieure() {
        assertThat(ReferralEarning.commission(1_100, 2_000)).isEqualTo(220);
        assertThat(ReferralEarning.commission(2_700, 2_000)).isEqualTo(540);
        assertThat(ReferralEarning.commission(2_700, 6_000)).isEqualTo(1_620);
        assertThat(ReferralEarning.commission(1_099, 2_000)).isEqualTo(219); // 219,8 → 219
        assertThat(ReferralEarning.commission(0, 2_000)).isZero();
        assertThatThrownBy(() -> ReferralEarning.commission(-1, 2_000)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void tauxCollabSeulementAvantExpirationEtJamaisSousLeTauxDeBase() {
        Instant now = Instant.parse("2026-10-01T10:00:00Z");
        ReferralAccount a = new ReferralAccount(UUID.randomUUID(), "ABCDEFGH", now);
        assertThat(a.effectiveRateBps(2_000, now)).isEqualTo(2_000);
        a.startCollab(5_000, now.plus(10, ChronoUnit.DAYS), now);
        assertThat(a.effectiveRateBps(2_000, now)).isEqualTo(5_000);
        assertThat(a.effectiveRateBps(2_000, now.plus(10, ChronoUnit.DAYS))).isEqualTo(2_000); // échéance atteinte
        a.endCollab(now);
        assertThat(a.collabActive(now)).isFalse();
        assertThat(a.effectiveRateBps(2_000, now)).isEqualTo(2_000);
    }

    @Test
    void masquageDesNomsEtNumeros() {
        assertThat(Masking.name("Aminata Diallo")).isEqualTo("Am*** D.");
        assertThat(Masking.name("Moussa")).isEqualTo("Mo***");
        assertThat(Masking.name("Al")).isEqualTo("A***");
        assertThat(Masking.name("  ")).isEqualTo("***");
        assertThat(Masking.name("Émile Ndour Sow")).isEqualTo("Ém*** S.");
        assertThat(Masking.phone("+221 77 123 45 67")).isEqualTo("+221 77 *** ** 67");
        assertThat(Masking.phone("+33612345678")).isEqualTo("+336******78");
        assertThat(Masking.phone(null)).isNull();
    }

    @Test
    void onNeSeParrainePasSoiMeme() {
        UUID id = UUID.randomUUID();
        assertThatThrownBy(() -> new Referral(id, id, null, Instant.now())).isInstanceOf(IllegalArgumentException.class);
    }
}
