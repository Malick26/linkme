package com.linkme.api.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.linkme.api.auth.Handles;
import com.linkme.api.blocks.EmbedResolver;
import com.linkme.api.blocks.Slugs;
import com.linkme.api.common.SafeUrls;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ValidationRulesTest {
    @ParameterizedTest
    @ValueSource(strings = {"malick", "awa.diop", "dj_kane-221", "abc"})
    void handlesValides(String h) {
        assertThat(Handles.validFormat(h)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ab", "Malick", "a b", "é", "...", ".malick", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"})
    void handlesInvalides(String h) {
        assertThat(Handles.validFormat(h)).isFalse();
    }

    @Test
    void handlesReserves() {
        for (String h : new String[] {"admin", "api", "app", "login", "settings", "shop", "help"}) assertThat(Handles.reserved(h)).isTrue();
        assertThat(Handles.reserved("malick")).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://wa.me/221770000000", "https://www.tiktok.com/@malick", "mailto:contact@example.com", "tel:+221770000000"})
    void urlsAutorisees(String u) {
        assertThat(SafeUrls.isAllowed(u)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"javascript:alert(1)", "http://example.com", "data:text/html,<script>", "https://user:pass@example.com", "ftp://x", "https://", "mailto:pas-un-email"})
    void urlsRefusees(String u) {
        assertThat(SafeUrls.isAllowed(u)).isFalse();
    }

    @Test
    void slugs() {
        assertThat(Slugs.slugify("Mes coups de cœur !")).isEqualTo("mes-coups-de-coeur");
        assertThat(Slugs.slugify("Événements à Dakar")).isEqualTo("evenements-a-dakar");
        assertThat(Slugs.slugify("???")).isEqualTo("bloc");
    }

    @Test
    void integrationsYoutubeEtSpotify() {
        assertThat(EmbedResolver.resolve("https://www.youtube.com/watch?v=aqz-KE-bpKQ").src()).isEqualTo("https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ");
        assertThat(EmbedResolver.resolve("https://youtu.be/aqz-KE-bpKQ").provider()).isEqualTo("youtube");
        assertThat(EmbedResolver.resolve("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M").src())
                .isEqualTo("https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M");
        assertThat(EmbedResolver.resolve("https://evil.com/watch?v=aqz-KE-bpKQ")).isNull();
        assertThat(EmbedResolver.resolve("https://www.youtube.com/watch?v=<script>")).isNull();
        assertThat(EmbedResolver.resolve(null)).isNull();
    }
}
