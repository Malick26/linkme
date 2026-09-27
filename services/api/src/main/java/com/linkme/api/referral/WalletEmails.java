package com.linkme.api.referral;

import com.linkme.api.auth.UserRepository;
import com.linkme.api.config.AppProperties;
import com.linkme.api.mail.MailService;
import java.util.Arrays;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Emails du portefeuille, envoyés uniquement après commit : alerte équipe à chaque demande, suivi pour le créateur. */
@Component
public class WalletEmails {
    private final WithdrawalRepository withdrawals;
    private final UserRepository users;
    private final MailService mail;
    private final AppProperties props;

    public WalletEmails(WithdrawalRepository withdrawals, UserRepository users, MailService mail, AppProperties props) {
        this.withdrawals = withdrawals;
        this.users = users;
        this.mail = mail;
        this.props = props;
    }

    static String fcfa(long v) {
        return String.format("%,d", v).replace(',', ' ') + " FCFA";
    }

    static String method(String m) {
        return switch (m) {
            case "orange_money" -> "Orange Money";
            case "free_money" -> "Free Money";
            default -> "Wave";
        };
    }

    @TransactionalEventListener
    public void onRequested(WalletService.WithdrawalRequested e) {
        if (props.adminEmails() == null || props.adminEmails().isBlank()) return;
        withdrawals.findById(e.withdrawalId()).ifPresent(w -> Arrays.stream(props.adminEmails().split(","))
                .map(String::trim).filter(s -> !s.isEmpty())
                .forEach(admin -> mail.send(admin, "Retrait à traiter : " + fcfa(w.getAmountXof()),
                        "Nouvelle demande de retrait de " + fcfa(w.getAmountXof()) + " vers " + method(w.getMethod()) + ".\n\n"
                                + "À traiter dans l'espace admin : " + props.baseUrl() + "/app/admin/retraits")));
    }

    @TransactionalEventListener
    public void onDecided(WalletService.WithdrawalDecided e) {
        withdrawals.findById(e.withdrawalId()).ifPresent(w -> users.findById(w.getUserId()).ifPresent(u -> {
            if (w.getStatus() == WithdrawalStatus.PAID) {
                mail.send(u.getEmail(), "Ton retrait de " + fcfa(w.getAmountXof()) + " a été envoyé",
                        "Bonne nouvelle : " + fcfa(w.getAmountXof()) + " ont été envoyés sur ton compte " + method(w.getMethod()) + ".\n\n"
                                + "Merci de faire grandir la communauté !\n" + props.baseUrl() + "/app/portefeuille");
            } else if (w.getStatus() == WithdrawalStatus.REJECTED) {
                mail.send(u.getEmail(), "Ta demande de retrait n'a pas pu être traitée",
                        "Ta demande de retrait de " + fcfa(w.getAmountXof()) + " a été refusée.\nMotif : " + w.getNote() + "\n\n"
                                + "Le montant a été recrédité sur ton portefeuille.\n" + props.baseUrl() + "/app/portefeuille");
            }
        }));
    }
}
