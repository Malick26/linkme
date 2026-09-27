package com.linkme.api.uploads;

/** Schéma OpenAPI {@code Audio} : son uploadé (item de bloc « sons », D50) — URL directe, pas de transformation. */
public record AudioDto(String id, String url, String format, Integer bytes) {}
