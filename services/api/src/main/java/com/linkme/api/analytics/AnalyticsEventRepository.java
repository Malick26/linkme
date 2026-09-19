package com.linkme.api.analytics;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {

    @Query(value = """
            select to_char(date_trunc('day', created_at at time zone 'UTC'), 'YYYY-MM-DD') as d,
                   count(*) filter (where type = 'page_view') as views,
                   count(*) filter (where type = 'link_click') as clicks
            from analytics_event where creator_id = :creatorId and created_at >= :since
            group by 1 order by 1""", nativeQuery = true)
    List<Object[]> byDay(@Param("creatorId") UUID creatorId, @Param("since") Instant since);

    @Query(value = """
            select count(distinct visitor_hash) from analytics_event
            where creator_id = :creatorId and created_at >= :since and type = 'page_view'""", nativeQuery = true)
    long uniqueVisitors(@Param("creatorId") UUID creatorId, @Param("since") Instant since);

    @Query(value = """
            select cast(block_id as varchar) as block_id, coalesce(target, '') as target, count(*) as n
            from analytics_event where creator_id = :creatorId and created_at >= :since and type = 'link_click'
            group by block_id, target order by n desc limit 50""", nativeQuery = true)
    List<Object[]> clicksByTarget(@Param("creatorId") UUID creatorId, @Param("since") Instant since);
}
