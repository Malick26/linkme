package com.linkme.api.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.linkme.api.common.Hashing;
import com.linkme.api.uploads.CloudinaryService;
import com.linkme.api.uploads.LocalMediaService;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CryptoTest {
    @Test
    void signatureCloudinaryConformeALaDoc() {
        // exemple de la documentation Cloudinary : public_id=sample_image&timestamp=1315060510 + abcd → SHA-1
        String sig = CloudinaryService.signParams(Map.of("timestamp", "1315060510", "public_id", "sample_image"), "abcd");
        assertThat(sig).isEqualTo(Hashing.sha1Hex("public_id=sample_image&timestamp=1315060510abcd"));
        assertThat(sig).hasSize(40);
    }

    @Test
    void hmacEtComparaisonTempsConstant() {
        String a = Hashing.hmacSha256Hex("secret", "{\"a\":1}".getBytes(StandardCharsets.UTF_8));
        assertThat(a).hasSize(64);
        assertThat(Hashing.constantTimeEquals(a, a)).isTrue();
        assertThat(Hashing.constantTimeEquals(a, a.replace(a.charAt(0), a.charAt(0) == 'a' ? 'b' : 'a'))).isFalse();
        assertThat(Hashing.constantTimeEquals(null, a)).isFalse();
    }

    @Test
    void referencesDeCommande() {
        String r = Hashing.orderReference();
        assertThat(r).matches("^LM-[A-Z0-9]{12}$");
        assertThat(Hashing.orderReference()).isNotEqualTo(r);
    }

    @Test
    void detectionDuTypeParMagicBytes() {
        assertThat(LocalMediaService.sniff(new byte[] {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0})).isEqualTo("jpg");
        assertThat(LocalMediaService.sniff(new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10})).isEqualTo("png");
        assertThat(LocalMediaService.sniff("RIFF0000WEBPVP8 ".getBytes(StandardCharsets.US_ASCII))).isEqualTo("webp");
        assertThat(LocalMediaService.sniff("<svg onload=alert(1)>".getBytes(StandardCharsets.US_ASCII))).isNull();
        assertThat(LocalMediaService.sniff("GIF89a".getBytes(StandardCharsets.US_ASCII))).isNull();
    }
}
