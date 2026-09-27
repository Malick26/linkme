package com.linkme.api.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.linkme.api.crm.CrmService;
import com.linkme.api.promo.PromoCode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

/** Règles pures du chantier D (D59, D62). */
class PromoCrmRulesTest {
    @Test
    void reductionEnFcfaEntiers() {
        assertThat(PromoCode.discount(2_700, 50)).isEqualTo(1_350);
        assertThat(PromoCode.discount(1_100, 15)).isEqualTo(165);
        assertThat(PromoCode.discount(1_100, 33)).isEqualTo(363); // 363 exactement
        assertThat(PromoCode.discount(1_099, 33)).isEqualTo(362); // 362,67 → 362
        assertThat(PromoCode.discount(1_100, 100)).isEqualTo(1_100);
        assertThatThrownBy(() -> PromoCode.discount(1_100, 101)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void disponibiliteDuCode() {
        Instant now = Instant.parse("2026-10-01T10:00:00Z");
        PromoCode p = new PromoCode(" rentree ", 20, 1, now.plus(1, ChronoUnit.DAYS), null, now);
        assertThat(p.getCode()).isEqualTo("RENTREE");
        assertThat(p.availability(now)).isEqualTo(PromoCode.Availability.OK);
        assertThat(p.availability(now.plus(1, ChronoUnit.DAYS))).isEqualTo(PromoCode.Availability.EXPIRED);
        p.recordUse(now);
        assertThat(p.availability(now)).isEqualTo(PromoCode.Availability.EXHAUSTED);
        p.deactivate(now);
        assertThat(p.availability(now)).isEqualTo(PromoCode.Availability.INACTIVE);
    }

    @Test
    void personnalisationEtLienDeDesinscriptionToujoursPresent() {
        assertThat(CrmService.personalize("Bonjour {nom}, ça va ?", "Awa", "https://x/d?t=1")).startsWith("Bonjour Awa, ça va ?")
                .endsWith("https://x/d?t=1");
        assertThat(CrmService.personalize("Bonjour {nom}, ça va ?", null, "u")).startsWith("Bonjour, ça va ?");
        assertThat(CrmService.personalize("Merci !", "", "u")).startsWith("Merci !");
    }
}
