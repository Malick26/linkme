package com.linkme.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

/** Point d'entrée — monolithe modulaire (ADR 0002). */
@SpringBootApplication
@ConfigurationPropertiesScan
@EnableAsync
public class LinkmeApplication {
    public static void main(String[] args) {
        SpringApplication.run(LinkmeApplication.class, args);
    }
}
