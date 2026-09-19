package com.linkme.api.common;

import jakarta.servlet.http.HttpServletRequest;

/** Adresse IP du client (Tomcat RemoteIpValve a déjà appliqué X-Forwarded-For venant du proxy de confiance). */
public final class ClientIp {
    private ClientIp() {}

    public static String of(HttpServletRequest req) {
        String ip = req.getRemoteAddr();
        return ip == null ? "unknown" : ip;
    }
}
