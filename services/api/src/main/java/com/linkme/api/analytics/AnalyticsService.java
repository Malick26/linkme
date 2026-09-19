package com.linkme.api.analytics;

import com.linkme.api.blocks.Block;
import com.linkme.api.blocks.BlockRepository;
import com.linkme.api.common.Hashing;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {
    private final AnalyticsEventRepository events;
    private final BlockRepository blocks;
    private final Clock clock;

    public AnalyticsService(AnalyticsEventRepository events, BlockRepository blocks, Clock clock) {
        this.events = events;
        this.blocks = blocks;
        this.clock = clock;
    }

    public record DayStat(LocalDate date, long pageViews, long clicks) {}

    public record BlockStat(String blockId, String target, String title, long clicks) {}

    public record Summary(int days, long pageViews, long uniqueVisitors, long clicks, List<DayStat> byDay, List<BlockStat> byBlock) {}

    /** Empreinte visiteur : SHA-256(IP + User-Agent + jour + créateur), tronquée à 16 hex — change chaque jour, non réversible. */
    public String visitorHash(String ip, String userAgent, UUID creatorId) {
        LocalDate day = LocalDate.ofInstant(clock.instant(), ZoneOffset.UTC);
        return Hashing.sha256Hex(ip + "|" + (userAgent == null ? "" : userAgent) + "|" + day + "|" + creatorId).substring(0, 16);
    }

    static String referrerHost(String referrer) {
        if (referrer == null || referrer.isBlank()) return null;
        try {
            String host = URI.create(referrer.trim()).getHost();
            return host == null ? null : host.length() > 255 ? host.substring(0, 255) : host.toLowerCase();
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public void record(UUID creatorId, String type, UUID blockId, String target, String referrer, String visitorHash) {
        UUID safeBlock = blockId != null && blocks.findByIdAndCreatorId(blockId, creatorId).isPresent() ? blockId : null;
        String cleaned = target == null ? null : target.toLowerCase().replaceAll("[^a-z0-9:_.-]", "");
        String safeTarget = cleaned == null || cleaned.isEmpty() ? null : cleaned.substring(0, Math.min(64, cleaned.length()));
        events.save(new AnalyticsEvent(creatorId, type, safeBlock, safeTarget, referrerHost(referrer), visitorHash, clock.instant()));
    }

    @Transactional(readOnly = true)
    public Summary summary(UUID creatorId, int days) {
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, ZoneOffset.UTC);
        LocalDate first = today.minusDays(days - 1L);
        Instant since = first.atStartOfDay(ZoneOffset.UTC).toInstant();
        Map<LocalDate, long[]> map = new HashMap<>();
        for (Object[] r : events.byDay(creatorId, since)) {
            map.put(LocalDate.parse((String) r[0]), new long[] {((Number) r[1]).longValue(), ((Number) r[2]).longValue()});
        }
        List<DayStat> byDay = new ArrayList<>();
        long views = 0;
        long clicks = 0;
        for (LocalDate d = first; !d.isAfter(today); d = d.plus(1, ChronoUnit.DAYS)) {
            long[] v = map.getOrDefault(d, new long[] {0, 0});
            views += v[0];
            clicks += v[1];
            byDay.add(new DayStat(d, v[0], v[1]));
        }
        Map<String, String> titles = new HashMap<>();
        for (Block b : blocks.findByCreatorIdOrderByPositionAsc(creatorId)) titles.put(b.getId().toString(), b.getTitle());
        List<BlockStat> byBlock = events.clicksByTarget(creatorId, since).stream().map(r -> {
            String bid = (String) r[0];
            String target = (String) r[1];
            return new BlockStat(bid, target, bid != null ? titles.getOrDefault(bid, target) : target, ((Number) r[2]).longValue());
        }).toList();
        return new Summary(days, views, events.uniqueVisitors(creatorId, since), clicks, byDay, byBlock);
    }
}
