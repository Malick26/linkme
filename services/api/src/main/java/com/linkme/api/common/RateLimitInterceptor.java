package com.linkme.api.common;

import com.linkme.api.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/** Limitation de débit (brief §10) : authentification, contact, checkout, événements analytics. */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {
    private final RateLimiter limiter;
    private final List<Rule> rules;

    record Rule(String name, String method, String pathRegex, int capacity, long windowMillis) {
        boolean matches(HttpServletRequest r) {
            return method.equalsIgnoreCase(r.getMethod()) && r.getRequestURI().matches(pathRegex);
        }
    }

    public RateLimitInterceptor(RateLimiter limiter, AppProperties props) {
        this.limiter = limiter;
        AppProperties.RateLimits l = props.rateLimits();
        this.rules = List.of(
                new Rule("auth", "POST", "^/api/auth/(login|register|forgot|reset)$", l.authPerMinute(), 60_000),
                new Rule("contact", "POST", "^/api/public/[^/]+/contact$", l.contactPer10Minutes(), 600_000),
                new Rule("checkout", "POST", "^/api/public/[^/]+/checkout$", l.checkoutPerMinute(), 60_000),
                new Rule("events", "POST", "^/api/public/[^/]+/events$", l.eventsPerMinute(), 60_000));
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        for (Rule rule : rules) {
            if (rule.matches(request) && !limiter.tryAcquire(rule.name() + ":" + ClientIp.of(request), rule.capacity(), rule.windowMillis())) {
                response.setHeader("Retry-After", String.valueOf(Math.max(1, rule.windowMillis() / 1000 / Math.max(1, rule.capacity()))));
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", "Trop de tentatives. Réessaie dans une minute.");
            }
        }
        return true;
    }
}
