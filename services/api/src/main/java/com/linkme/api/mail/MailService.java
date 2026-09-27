package com.linkme.api.mail;

import com.linkme.api.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.env.Environment;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** Envoi d'emails texte. Sans SMTP configuré (dev), le message est écrit dans les logs (destinataire masqué). */
@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private final ObjectProvider<JavaMailSender> sender;
    private final AppProperties props;
    private final boolean smtpConfigured;
    private final boolean devProfile;

    public MailService(ObjectProvider<JavaMailSender> sender, AppProperties props, Environment env) {
        this.sender = sender;
        this.props = props;
        String host = env.getProperty("spring.mail.host");
        this.smtpConfigured = host != null && !host.isBlank();
        this.devProfile = List.of(env.getActiveProfiles()).contains("dev") || List.of(env.getActiveProfiles()).contains("test");
        if (!smtpConfigured && !devProfile) {
            log.error("SMTP non configuré en dehors du profil dev : les emails (reçus, ventes, réinitialisation) ne partiront pas.");
        }
    }

    /** Faux en production sans SMTP : les envois de masse (CRM) le signalent à l'admin au lieu d'échouer en silence. */
    public boolean available() {
        return smtpConfigured || devProfile;
    }

    @Async
    public void send(String to, String subject, String body) {
        if (to == null || to.isBlank()) return;
        JavaMailSender s = smtpConfigured ? sender.getIfAvailable() : null;
        if (s == null) {
            // le corps peut contenir un jeton de réinitialisation ou des coordonnées d'acheteur : jamais en production
            if (devProfile) {
                log.info("[email non envoyé — SMTP absent] à={} sujet=« {} »\n{}", mask(to), subject, body);
            } else {
                log.warn("[email non envoyé — SMTP absent] à={} sujet=« {} »", mask(to), subject);
            }
            return;
        }
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(props.mailFrom());
            m.setTo(to);
            m.setSubject(subject);
            m.setText(body);
            s.send(m);
        } catch (Exception e) {
            log.error("Échec d'envoi d'email à {} : {}", mask(to), e.getMessage());
        }
    }

    static String mask(String email) {
        int at = email.indexOf('@');
        return at <= 1 ? "***" : email.charAt(0) + "***" + email.substring(at);
    }
}
