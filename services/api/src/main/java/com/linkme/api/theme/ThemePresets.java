package com.linkme.api.theme;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** Presets (source de vérité : resources/theme/presets.json, copiés dans le front — D13). */
@Component
public class ThemePresets {
    public record Preset(String id, String name, ThemeConfig config) {}

    private final List<Preset> presets;

    public ThemePresets(ObjectMapper mapper) throws IOException {
        try (InputStream in = new ClassPathResource("theme/presets.json").getInputStream()) {
            this.presets = List.copyOf(mapper.readValue(in, new TypeReference<List<Preset>>() {}));
        }
    }

    public List<Preset> all() {
        return presets;
    }

    public ThemeConfig get(String id) {
        return presets.stream().filter(p -> p.id().equals(id)).findFirst().orElse(presets.get(0)).config();
    }

    public ThemeConfig defaultTheme() {
        return get("sunset");
    }
}
