package com.linkme.api.unit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.linkme.api.shop.Commission;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class CommissionTest {
    @Test
    void huitPourcentArrondiInferieurEnFaveurDuCreateur() {
        Commission.Split s = Commission.split(15_000, new BigDecimal("8"));
        assertThat(s.commission()).isEqualTo(1_200);
        assertThat(s.net()).isEqualTo(13_800);
        Commission.Split odd = Commission.split(999, new BigDecimal("8"));
        assertThat(odd.commission()).isEqualTo(79); // 79.92 → 79
        assertThat(odd.commission() + odd.net()).isEqualTo(999);
    }

    @Test
    void pourcentageDecimal() {
        assertThat(Commission.split(10_000, new BigDecimal("7.5")).commission()).isEqualTo(750);
        assertThat(Commission.split(10_000, BigDecimal.ZERO).net()).isEqualTo(10_000);
    }

    @Test
    void refuseLesValeursInvalides() {
        assertThatThrownBy(() -> Commission.split(0, BigDecimal.ONE)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Commission.split(100, new BigDecimal("101"))).isInstanceOf(IllegalArgumentException.class);
    }
}
