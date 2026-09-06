package com.sisenco.weeklyreport.dto.response;

import java.util.List;
import java.util.function.Function;
import org.springframework.data.domain.Page;

/**
 * A stable envelope for paginated results.
 *
 * <p>Spring's {@code Page} is not a documented wire format and its JSON shape
 * has changed between releases, so it is mapped into this record instead. The
 * frontend then has one pagination contract for every list endpoint.
 */
public record PageResponse<T>(
        List<T> content, int page, int size, long totalElements, int totalPages, boolean first, boolean last) {

    /** Wraps a page, mapping each entity through {@code mapper} on the way out. */
    public static <E, T> PageResponse<T> from(Page<E> page, Function<E, T> mapper) {
        return new PageResponse<>(
                page.getContent().stream().map(mapper).toList(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast());
    }
}
