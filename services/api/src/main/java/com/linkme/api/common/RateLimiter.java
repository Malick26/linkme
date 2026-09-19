package com.linkme.api.common;

import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Seau à jetons en mémoire (D21). Clé = règle + identifiant client. Thread-safe ; nettoyage périodique des seaux pleins.
 */
@Component
public class RateLimiter {
    private final Clock clock;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimiter(Clock clock) {
        this.clock = clock;
    }

    private static final class Bucket {
        double tokens;
        long lastNanos;
        final int capacity;
        final double refillPerMilli;

        Bucket(int capacity, long windowMillis, long now) {
            this.capacity = capacity;
            this.tokens = capacity;
            this.refillPerMilli = capacity / (double) windowMillis;
            this.lastNanos = now;
        }
    }

    /** @return true si la requête est autorisée. */
    public boolean tryAcquire(String key, int capacity, long windowMillis) {
        long now = clock.millis();
        Bucket b = buckets.computeIfAbsent(key, k -> new Bucket(capacity, windowMillis, now));
        synchronized (b) {
            long elapsed = Math.max(0, now - b.lastNanos);
            b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerMilli);
            b.lastNanos = now;
            if (b.tokens >= 1) {
                b.tokens -= 1;
                return true;
            }
            return false;
        }
    }

    @Scheduled(fixedDelay = 300_000)
    public void cleanup() {
        long now = clock.millis();
        buckets.entrySet().removeIf(e -> now - e.getValue().lastNanos > 3_600_000);
    }

    public void reset() {
        buckets.clear();
    }
}
