package com.linkme.api.common;

import org.springframework.data.domain.Page;

public record PageMeta(int page, int size, long totalElements, int totalPages) {
    public static PageMeta of(Page<?> p) {
        return new PageMeta(p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    /** Bornes systématiques (brief §9) : page ≥ 0, 1 ≤ size ≤ 100. */
    public static int clampSize(Integer size) {
        return size == null ? 20 : Math.max(1, Math.min(100, size));
    }

    public static int clampPage(Integer page) {
        return page == null ? 0 : Math.max(0, page);
    }
}
