package com.linkme.api.crm;

import com.linkme.api.auth.AppUser;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.ClientIp;
import com.linkme.api.crm.CrmDtos.CrmContact;
import com.linkme.api.crm.CrmDtos.CrmEmailRequest;
import com.linkme.api.crm.CrmDtos.CrmEmailResult;
import com.linkme.api.crm.CrmDtos.LogRequest;
import com.linkme.api.crm.CrmDtos.ProspectInput;
import com.linkme.api.crm.CrmDtos.UnsubscribeRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CrmController {
    private final CrmService crm;

    public CrmController(CrmService crm) {
        this.crm = crm;
    }

    /** operationId: joinProspectList — public, limité en débit. */
    @PostMapping("/api/public/prospects")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void join(@Valid @RequestBody ProspectInput in, HttpServletRequest request) {
        crm.join(in, ClientIp.of(request));
    }

    /** operationId: unsubscribe — public, limité en débit. */
    @PostMapping("/api/public/unsubscribe")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unsubscribe(@Valid @RequestBody UnsubscribeRequest req) {
        crm.unsubscribe(req.token());
    }

    /** operationId: adminListCrmContacts */
    @GetMapping("/api/admin/crm/contacts")
    public List<CrmContact> contacts(@RequestParam String segment) {
        if (!segment.matches(CrmDtos.SEGMENTS)) throw ApiException.validation("segment", "Segment inconnu.");
        return crm.contacts(segment);
    }

    /** operationId: adminSendCrmEmail */
    @PostMapping("/api/admin/crm/emails")
    public CrmEmailResult email(@AuthenticationPrincipal AppUser admin, @Valid @RequestBody CrmEmailRequest req) {
        return crm.sendEmail(admin.id(), req);
    }

    /** operationId: adminLogCrmContact */
    @PostMapping("/api/admin/crm/contacts/{kind}/{contactId}/log")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void log(@AuthenticationPrincipal AppUser admin, @PathVariable String kind, @PathVariable UUID contactId, @Valid @RequestBody LogRequest req) {
        crm.log(admin.id(), kind, contactId, req.channel());
    }
}
