package com.linkme.api.profile;

import com.linkme.api.auth.AppUser;
import com.linkme.api.profile.ProfileDtos.ProfileDto;
import com.linkme.api.profile.ProfileDtos.ProfileUpdate;
import com.linkme.api.profile.ProfileDtos.SocialAccountDto;
import com.linkme.api.profile.ProfileDtos.SocialsUpdate;
import com.linkme.api.profile.ProfileDtos.StatsDto;
import com.linkme.api.profile.ProfileDtos.StatsInput;
import com.linkme.api.publicpage.PublicPageAssembler;
import com.linkme.api.publicpage.PublicPageDtos.PublicPage;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ProfileController {
    private final ProfileService service;
    private final PublicPageAssembler assembler;

    public ProfileController(ProfileService service, PublicPageAssembler assembler) {
        this.service = service;
        this.assembler = assembler;
    }

    /** operationId: getProfile */
    @GetMapping("/api/me/profile")
    public ProfileDto get(@AuthenticationPrincipal AppUser me) {
        return service.get(me.id());
    }

    /** operationId: updateProfile */
    @PutMapping("/api/me/profile")
    public ProfileDto update(@AuthenticationPrincipal AppUser me, @Valid @RequestBody ProfileUpdate in) {
        return service.update(me.id(), in);
    }

    /** operationId: getSocials */
    @GetMapping("/api/me/socials")
    public List<SocialAccountDto> socials(@AuthenticationPrincipal AppUser me) {
        return service.socials(me.id());
    }

    /** operationId: updateSocials */
    @PutMapping("/api/me/socials")
    public List<SocialAccountDto> updateSocials(@AuthenticationPrincipal AppUser me, @Valid @RequestBody SocialsUpdate in) {
        return service.replaceSocials(me.id(), in.items());
    }

    /** operationId: getStats */
    @GetMapping("/api/me/stats")
    public StatsDto stats(@AuthenticationPrincipal AppUser me) {
        return service.stats(me.id());
    }

    /** operationId: updateStats */
    @PutMapping("/api/me/stats")
    public StatsDto updateStats(@AuthenticationPrincipal AppUser me, @Valid @RequestBody StatsInput in) {
        return service.updateStats(me.id(), in);
    }

    /** operationId: getPreview — page construite depuis le brouillon */
    @GetMapping("/api/me/preview")
    public PublicPage preview(@AuthenticationPrincipal AppUser me) {
        return assembler.build(service.require(me.id()), true);
    }
}
