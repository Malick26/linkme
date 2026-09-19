package com.linkme.api.config;

import com.linkme.api.common.RateLimitInterceptor;
import com.linkme.api.uploads.LocalMediaService;
import java.time.Duration;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@EnableScheduling
public class WebConfig implements WebMvcConfigurer {
    private final RateLimitInterceptor rateLimitInterceptor;
    private final LocalMediaService media;

    public WebConfig(RateLimitInterceptor rateLimitInterceptor, LocalMediaService media) {
        this.rateLimitInterceptor = rateLimitInterceptor;
        this.media = media;
    }

    /** Images uploadées localement (en production, Caddy les sert directement depuis le volume). */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/media/**")
                .addResourceLocations(media.dir().toUri().toString() + "/")
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable());
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor).addPathPatterns("/api/**");
    }
}
