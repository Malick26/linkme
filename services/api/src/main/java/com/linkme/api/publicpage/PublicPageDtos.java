package com.linkme.api.publicpage;

import com.linkme.api.blocks.BlockDtos.BlockDto;
import com.linkme.api.blocks.BlockDtos.BlockItemDto;
import com.linkme.api.profile.ProfileDtos.StatsDto;
import com.linkme.api.shop.ShopDtos.PublicProductDto;
import com.linkme.api.theme.ThemeConfig;
import com.linkme.api.uploads.ImageDto;
import java.util.List;
import java.util.Map;

/** Schémas OpenAPI {@code PublicPage} / {@code PublicBlockDetail}. */
public final class PublicPageDtos {
    private PublicPageDtos() {}

    public record PublicProfile(String handle, String displayName, List<String> taglineLines, List<String> categories, String bio) {}

    public record PublicSocial(String platform, String url, long followersCount) {}

    public record Seo(String title, String description, String ogImage) {}

    public record PublicPage(PublicProfile profile, StatsDto stats, List<PublicSocial> socials, List<BlockDto> blocks, ThemeConfig theme,
                             Map<String, ImageDto> images, boolean showBranding, boolean preview, Seo seo) {}

    public record PublicBlockDetail(BlockDto block, List<BlockItemDto> items, List<PublicProductDto> products) {}
}
