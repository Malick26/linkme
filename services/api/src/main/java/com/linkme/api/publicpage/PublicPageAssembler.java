package com.linkme.api.publicpage;

import com.linkme.api.blocks.BlockDtos.BlockDto;
import com.linkme.api.blocks.BlockService;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.profile.CreatorProfileRepository;
import com.linkme.api.profile.ProfileService;
import com.linkme.api.profile.SocialAccountRepository;
import com.linkme.api.publicpage.PublicPageDtos.PublicPage;
import com.linkme.api.publicpage.PublicPageDtos.PublicProfile;
import com.linkme.api.publicpage.PublicPageDtos.PublicSocial;
import com.linkme.api.publicpage.PublicPageDtos.Seo;
import com.linkme.api.theme.ThemeConfig;
import com.linkme.api.theme.ThemeService;
import com.linkme.api.uploads.AssetRepository;
import com.linkme.api.uploads.AssetService;
import com.linkme.api.uploads.ImageDto;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Construit la page (publiée pour les visiteurs, brouillon pour l'aperçu éditeur) — un seul format pour les deux (ADR 0001). */
@Component
public class PublicPageAssembler {
    private final CreatorProfileRepository profiles;
    private final ProfileService profileService;
    private final SocialAccountRepository socials;
    private final BlockService blocks;
    private final ThemeService themes;
    private final AssetService assets;
    private final AssetRepository assetRepo;

    public PublicPageAssembler(CreatorProfileRepository profiles, ProfileService profileService, SocialAccountRepository socials,
                               BlockService blocks, ThemeService themes, AssetService assets, AssetRepository assetRepo) {
        this.profiles = profiles;
        this.profileService = profileService;
        this.socials = socials;
        this.blocks = blocks;
        this.themes = themes;
        this.assets = assets;
        this.assetRepo = assetRepo;
    }

    /** Page publiée : handle existant, publié ET abonnement actif (D44), sinon vide (→ 404 : le lien est masqué). */
    @Transactional(readOnly = true)
    public Optional<CreatorProfile> findPublished(String handle) {
        return profiles.findByHandle(handle).filter(CreatorProfile::isVisible);
    }

    @Transactional
    public PublicPage build(CreatorProfile p, boolean preview) {
        UUID id = p.getUserId();
        ThemeConfig theme = preview ? themes.draft(id) : themes.published(id);
        List<BlockDto> blockList = blocks.list(id, !preview);
        // La boutique est réservée au plan Boutique (D45) : sur la page publique, un bloc shop créé avant un
        // changement de plan ne doit pas rester visible/achetable. L'éditeur (preview) le garde visible pour que
        // le créateur comprenne pourquoi ("passe en Boutique pour l'activer") plutôt que de le faire disparaître.
        if (!preview && !p.isBoutique()) blockList = blockList.stream().filter(b -> !"shop".equals(b.type())).toList();

        List<UUID> imageIds = new ArrayList<>();
        UUID bgId = parse(theme.background().imageId());
        if (bgId == null && p.getBackgroundAssetId() != null) {
            bgId = p.getBackgroundAssetId();
            theme = theme.withBackground(theme.background().withImageId(bgId.toString()));
        }
        imageIds.add(bgId);
        blockList.forEach(b -> imageIds.add(parse(b.thumbnailImageId())));
        Map<String, ImageDto> images = new LinkedHashMap<>(assets.images(imageIds));

        String cats = String.join(" • ", p.getCategories());
        String title = cats.isEmpty() ? p.getDisplayName() : p.getDisplayName() + " — " + cats;
        String description = p.getBio().isBlank() ? p.getDisplayName() : p.getBio().replaceAll("\\s+", " ");
        final UUID bg = bgId;
        String og = bg == null ? null : assetRepo.findById(bg).map(assets::ogImage).orElse(null);

        List<PublicSocial> socialList = socials.findByCreatorIdOrderByPositionAsc(id).stream()
                .map(s -> new PublicSocial(s.getPlatform(), s.getUrl(), s.getFollowersCount())).toList();

        return new PublicPage(
                new PublicProfile(p.getHandle(), p.getDisplayName(), p.getTaglineLines(), p.getCategories(), p.getBio()),
                profileService.stats(id), socialList, blockList, theme, images, !p.isBoutique(), preview, new Seo(title, description, og));
    }

    private static UUID parse(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
