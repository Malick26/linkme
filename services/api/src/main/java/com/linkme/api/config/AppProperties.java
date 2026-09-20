package com.linkme.api.config;

import java.math.BigDecimal;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuration applicative (préfixe {@code app.*}) — toutes les valeurs sensibles viennent de l'environnement. */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String publicBaseUrl,
        boolean seedDemo,
        BigDecimal commissionPercent,
        String mailFrom,
        Media media,
        Cloudinary cloudinary,
        Payments payments,
        RateLimits rateLimits) {

    public record Media(String dir, boolean localUploadsEnabled, long maxBytes) {}

    public record Cloudinary(String cloudName, String apiKey, String apiSecret) {
        public boolean enabled() {
            return notBlank(cloudName) && notBlank(apiKey) && notBlank(apiSecret);
        }
    }

    public record Payments(String defaultProvider, Mock mock, PayDunya paydunya, CinetPay cinetpay) {}

    public record Mock(boolean enabled, String webhookSecret) {}

    public record PayDunya(String masterKey, String privateKey, String token, String mode) {
        public boolean enabled() {
            return notBlank(masterKey) && notBlank(privateKey) && notBlank(token);
        }

        public boolean live() {
            return "live".equalsIgnoreCase(mode);
        }
    }

    public record CinetPay(String apiKey, String siteId, String secretKey) {
        public boolean enabled() {
            return notBlank(apiKey) && notBlank(siteId) && notBlank(secretKey);
        }
    }

    public record RateLimits(int authPerMinute, int contactPer10Minutes, int checkoutPerMinute, int eventsPerMinute,
                             int webhooksPerMinute, int uploadsPerMinute) {}

    static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }

    public String baseUrl() {
        return publicBaseUrl.endsWith("/") ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1) : publicBaseUrl;
    }
}
