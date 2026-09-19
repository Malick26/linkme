package com.linkme.api.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {
    /** Horloge UTC injectable (tests déterministes). */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
