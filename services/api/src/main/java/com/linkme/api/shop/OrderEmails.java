package com.linkme.api.shop;

import com.linkme.api.auth.UserRepository;
import com.linkme.api.config.AppProperties;
import com.linkme.api.mail.MailService;
import com.linkme.api.payments.PaymentService;
import com.linkme.api.profile.CreatorProfileRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** Emails de vente (créateur) et reçu (acheteur) — envoyés uniquement après commit du passage à PAID. */
@Component
public class OrderEmails {
    private final OrderRepository orders;
    private final CreatorProfileRepository profiles;
    private final UserRepository users;
    private final MailService mail;
    private final AppProperties props;

    public OrderEmails(OrderRepository orders, CreatorProfileRepository profiles, UserRepository users, MailService mail, AppProperties props) {
        this.orders = orders;
        this.profiles = profiles;
        this.users = users;
        this.mail = mail;
        this.props = props;
    }

    static String fcfa(long v) {
        return String.format("%,d", v).replace(',', ' ') + " FCFA";
    }

    @TransactionalEventListener
    public void onPaid(PaymentService.OrderPaid event) {
        orders.findByReference(event.reference()).ifPresent(o -> {
            String name = profiles.findById(o.getCreatorId()).map(p -> p.getDisplayName()).orElse("le créateur");
            users.findById(o.getCreatorId()).ifPresent(u -> mail.send(u.getEmail(), "Nouvelle vente : " + o.getProductTitle(),
                    "Bonne nouvelle ! " + o.getBuyerName() + " a acheté « " + o.getProductTitle() + " » × " + o.getQuantity() + ".\n\n"
                            + "Montant payé : " + fcfa(o.getAmountXof()) + "\nCommission plateforme : " + fcfa(o.getCommissionXof())
                            + "\nNet pour toi : " + fcfa(o.getNetXof()) + "\n\nContacte l'acheteur pour la livraison : " + o.getBuyerPhone()
                            + (o.getBuyerEmail() != null ? " / " + o.getBuyerEmail() : "")
                            + (o.isNeedsAttention() ? "\n\n⚠ Stock insuffisant au moment du paiement : vérifie cette commande." : "")
                            + "\n\nRéférence : " + o.getReference()));
            mail.send(o.getBuyerEmail(), "Reçu — " + o.getProductTitle(),
                    "Merci pour ton achat !\n\n" + o.getProductTitle() + " × " + o.getQuantity() + "\nTotal payé : " + fcfa(o.getAmountXof())
                            + "\nRéférence : " + o.getReference() + "\n\n" + name + " va te contacter pour la livraison.\n"
                            + props.baseUrl());
        });
    }
}
