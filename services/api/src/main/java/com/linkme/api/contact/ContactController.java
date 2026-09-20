package com.linkme.api.contact;

import com.linkme.api.auth.AppUser;
import com.linkme.api.auth.Handles;
import com.linkme.api.auth.UserRepository;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.PageMeta;
import com.linkme.api.mail.MailService;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.publicpage.PublicPageAssembler;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ContactController {
    private final ContactMessageRepository messages;
    private final PublicPageAssembler assembler;
    private final UserRepository users;
    private final MailService mail;
    private final Clock clock;

    public ContactController(ContactMessageRepository messages, PublicPageAssembler assembler, UserRepository users, MailService mail, Clock clock) {
        this.messages = messages;
        this.assembler = assembler;
        this.users = users;
        this.mail = mail;
        this.clock = clock;
    }

    public record ContactInput(
            @NotBlank @Size(max = 80) String name,
            @Email @Size(max = 254) String email,
            @Pattern(regexp = "^\\+?[0-9 ]{8,20}$") String phone,
            @NotBlank @Size(min = 5, max = 2000) String message,
            @Size(max = 200) String website) {}

    public record ContactMessageDto(UUID id, String name, String email, String phone, String message, Instant createdAt) {}

    public record ContactMessagePage(List<ContactMessageDto> items, PageMeta page) {}

    /** operationId: sendContactMessage */
    @PostMapping("/api/public/{handle}/contact")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Transactional
    public void send(@PathVariable String handle, @Valid @RequestBody ContactInput in) {
        CreatorProfile p = assembler.findPublished(Handles.normalize(handle)).orElseThrow(ApiException::notFound);
        if (in.website() != null && !in.website().isBlank()) return; // pot de miel : robot → accepté silencieusement
        boolean hasEmail = in.email() != null && !in.email().isBlank();
        boolean hasPhone = in.phone() != null && !in.phone().isBlank();
        if (!hasEmail && !hasPhone) throw ApiException.validation("email", "Indique un email ou un numéro de téléphone.");
        ContactMessage m = messages.save(new ContactMessage(p.getUserId(), in.name().trim(), hasEmail ? in.email().trim() : null,
                hasPhone ? in.phone().trim() : null, in.message().trim(), clock.instant()));
        String safeName = m.getName().replaceAll("[\\r\\n]", " ");
        users.findById(p.getUserId()).ifPresent(u -> mail.send(u.getEmail(), "Nouveau message de " + safeName,
                "Tu as reçu un message via ta page :\n\n" + m.getMessage() + "\n\n— " + m.getName()
                        + (m.getEmail() != null ? "\nEmail : " + m.getEmail() : "") + (m.getPhone() != null ? "\nTéléphone : " + m.getPhone() : "")));
    }

    /** operationId: listContactMessages */
    @GetMapping("/api/me/messages")
    @Transactional(readOnly = true)
    public ContactMessagePage list(@AuthenticationPrincipal AppUser me, @RequestParam(required = false) Integer page, @RequestParam(required = false) Integer size) {
        Page<ContactMessage> p = messages.findByCreatorIdOrderByCreatedAtDesc(me.id(), PageRequest.of(PageMeta.clampPage(page), PageMeta.clampSize(size)));
        return new ContactMessagePage(p.getContent().stream()
                .map(m -> new ContactMessageDto(m.getId(), m.getName(), m.getEmail(), m.getPhone(), m.getMessage(), m.getCreatedAt())).toList(),
                PageMeta.of(p));
    }
}
