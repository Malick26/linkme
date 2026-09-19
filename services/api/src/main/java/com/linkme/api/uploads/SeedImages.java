package com.linkme.api.uploads;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** Métadonnées des images de démonstration générées (seed/seed-images.json, D14). */
@Component
public class SeedImages {
    public record Meta(int width, int height, List<Integer> widths, String placeholder) {}

    private final Map<String, Meta> metas = new HashMap<>();

    public SeedImages(ObjectMapper mapper) throws IOException {
        try (InputStream in = new ClassPathResource("seed/seed-images.json").getInputStream()) {
            JsonNode root = mapper.readTree(in);
            root.fields().forEachRemaining(e -> {
                JsonNode n = e.getValue();
                List<Integer> ws = new ArrayList<>();
                n.get("widths").forEach(w -> ws.add(w.asInt()));
                metas.put(e.getKey(), new Meta(n.get("width").asInt(), n.get("height").asInt(), List.copyOf(ws), n.path("placeholder").asText(null)));
            });
        }
    }

    public Meta get(String name) {
        return metas.get(name);
    }
}
