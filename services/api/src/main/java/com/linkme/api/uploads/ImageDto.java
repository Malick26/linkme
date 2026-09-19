package com.linkme.api.uploads;

import java.util.List;

/** Schéma OpenAPI {@code Image} : URL modèle (avec {w}) indépendante du fournisseur. */
public record ImageDto(String id, String urlTemplate, List<Integer> widths, Integer width, Integer height, String placeholder) {}
