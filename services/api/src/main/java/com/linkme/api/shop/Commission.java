package com.linkme.api.shop;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Calcul de commission en FCFA entiers (D5). Arrondi à l'entier inférieur en faveur du créateur. Jamais de double. */
public final class Commission {
    private Commission() {}

    public record Split(long amount, long commission, long net) {}

    public static Split split(long amountXof, BigDecimal percent) {
        if (amountXof <= 0) throw new IllegalArgumentException("montant invalide");
        if (percent.signum() < 0 || percent.compareTo(BigDecimal.valueOf(100)) > 0) throw new IllegalArgumentException("pourcentage invalide");
        long commission = BigDecimal.valueOf(amountXof).multiply(percent).divide(BigDecimal.valueOf(100), 0, RoundingMode.FLOOR).longValueExact();
        return new Split(amountXof, commission, amountXof - commission);
    }
}
