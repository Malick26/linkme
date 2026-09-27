package com.linkme.api.profile;

import com.linkme.api.common.ApiException;
import com.linkme.api.common.SafeUrls;
import com.linkme.api.profile.ProfileDtos.ProfileDto;
import com.linkme.api.profile.ProfileDtos.ProfileUpdate;
import com.linkme.api.profile.ProfileDtos.SocialAccountDto;
import com.linkme.api.profile.ProfileDtos.SocialAccountInput;
import com.linkme.api.profile.ProfileDtos.StatsDto;
import com.linkme.api.profile.ProfileDtos.StatsInput;
import com.linkme.api.uploads.AssetService;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileService {
    private final CreatorProfileRepository profiles;
    private final SocialAccountRepository socials;
    private final ProfileStatsRepository stats;
    private final AssetService assets;
    private final Clock clock;

    public ProfileService(CreatorProfileRepository profiles, SocialAccountRepository socials, ProfileStatsRepository stats,
                          AssetService assets, Clock clock) {
        this.profiles = profiles;
        this.socials = socials;
        this.stats = stats;
        this.assets = assets;
        this.clock = clock;
    }

    public CreatorProfile require(UUID creatorId) {
        return profiles.findById(creatorId).orElseThrow(ApiException::notFound);
    }

    public ProfileDto toDto(CreatorProfile p) {
        String bg = p.getBackgroundAssetId() == null ? null : p.getBackgroundAssetId().toString();
        return new ProfileDto(p.getHandle(), p.getDisplayName(), p.getTaglineLines(), p.getCategories(), p.getBio(), bg,
                assets.image(p.getBackgroundAssetId()), p.isPublished(), p.getPlan(), p.isOnboardingCompleted(),
                p.getSubscriptionStatus(), p.getSubscriptionExpiresAt());
    }

    @Transactional(readOnly = true)
    public ProfileDto get(UUID creatorId) {
        return toDto(require(creatorId));
    }

    @Transactional
    public ProfileDto update(UUID creatorId, ProfileUpdate in) {
        CreatorProfile p = require(creatorId);
        UUID bg = assets.requireOwned(creatorId, "backgroundImageId", in.backgroundImageId());
        Instant now = clock.instant();
        List<String> tagline = in.taglineLines().stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        List<String> cats = in.categories().stream().map(String::trim).filter(s -> !s.isEmpty()).toList();
        p.update(in.displayName().trim(), tagline, cats, in.bio().strip(), bg, now);
        if (in.published() != null) p.setPublished(in.published(), now);
        if (in.onboardingCompleted() != null) p.setOnboardingCompleted(in.onboardingCompleted(), now);
        return toDto(p);
    }

    @Transactional(readOnly = true)
    public List<SocialAccountDto> socials(UUID creatorId) {
        return socials.findByCreatorIdOrderByPositionAsc(creatorId).stream()
                .map(s -> new SocialAccountDto(s.getId(), s.getPlatform(), s.getUrl(), s.getFollowersCount(), s.getPosition(), s.getUpdatedAt()))
                .toList();
    }

    /** Remplace la liste des réseaux (ordre = ordre d'affichage du rail). Une plateforme au plus une fois. */
    @Transactional
    public List<SocialAccountDto> replaceSocials(UUID creatorId, List<SocialAccountInput> items) {
        require(creatorId);
        Set<String> seen = new HashSet<>();
        List<SocialAccount> toSave = new ArrayList<>();
        Instant now = clock.instant();
        for (int i = 0; i < items.size(); i++) {
            SocialAccountInput in = items.get(i);
            if (!seen.add(in.platform())) throw ApiException.validation("items[" + i + "].platform", "Plateforme en double.");
            String url = SafeUrls.require("items[" + i + "].url", in.url());
            toSave.add(new SocialAccount(creatorId, in.platform(), url, in.followersCount(), i, now));
        }
        socials.deleteAllByCreator(creatorId);
        socials.flush();
        socials.saveAll(toSave);
        return socials(creatorId);
    }

    @Transactional
    public StatsDto stats(UUID creatorId) {
        ProfileStats s = stats.findById(creatorId).orElseGet(() -> stats.save(new ProfileStats(creatorId)));
        return new StatsDto(s.getFollowers(), s.getLikes(), s.getViews30d(), s.getUpdatedAt());
    }

    @Transactional
    public StatsDto updateStats(UUID creatorId, StatsInput in) {
        require(creatorId);
        ProfileStats s = stats.findById(creatorId).orElseGet(() -> stats.save(new ProfileStats(creatorId)));
        s.update(in.followers(), in.likes(), in.views30d(), clock.instant());
        return new StatsDto(s.getFollowers(), s.getLikes(), s.getViews30d(), s.getUpdatedAt());
    }
}
