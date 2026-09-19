package com.linkme.api.unit;

import static org.assertj.core.api.Assertions.assertThat;

import com.linkme.api.common.RateLimiter;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class RateLimiterTest {
    static final class MutableClock extends Clock {
        final AtomicLong millis = new AtomicLong(1_000_000);

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return Instant.ofEpochMilli(millis.get());
        }

        @Override
        public long millis() {
            return millis.get();
        }
    }

    @Test
    void bloqueAuDelaDeLaCapaciteEtSeRecharge() {
        MutableClock clock = new MutableClock();
        RateLimiter l = new RateLimiter(clock);
        for (int i = 0; i < 5; i++) assertThat(l.tryAcquire("auth:1.2.3.4", 5, 60_000)).isTrue();
        assertThat(l.tryAcquire("auth:1.2.3.4", 5, 60_000)).isFalse();
        assertThat(l.tryAcquire("auth:5.6.7.8", 5, 60_000)).isTrue(); // autre IP : seau indépendant
        clock.millis.addAndGet(13_000); // ≈ 1 jeton rechargé (5 / 60 s)
        assertThat(l.tryAcquire("auth:1.2.3.4", 5, 60_000)).isTrue();
        assertThat(l.tryAcquire("auth:1.2.3.4", 5, 60_000)).isFalse();
    }
}
