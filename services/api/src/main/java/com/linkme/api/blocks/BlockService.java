package com.linkme.api.blocks;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.linkme.api.blocks.BlockDtos.BlockConfig;
import com.linkme.api.blocks.BlockDtos.BlockDto;
import com.linkme.api.blocks.BlockDtos.BlockInput;
import com.linkme.api.blocks.BlockDtos.BlockItemDto;
import com.linkme.api.blocks.BlockDtos.BlockItemInput;
import com.linkme.api.common.ApiException;
import com.linkme.api.common.SafeUrls;
import com.linkme.api.uploads.AssetService;
import com.linkme.api.uploads.ImageDto;
import java.time.Clock;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BlockService {
    public static final int MAX_BLOCKS = 30;
    public static final int MAX_ITEMS = 50;
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

    private final BlockRepository blocks;
    private final BlockItemRepository items;
    private final AssetService assets;
    private final ObjectMapper mapper;
    private final Clock clock;

    public BlockService(BlockRepository blocks, BlockItemRepository items, AssetService assets, ObjectMapper mapper, Clock clock) {
        this.blocks = blocks;
        this.items = items;
        this.assets = assets;
        this.mapper = mapper;
        this.clock = clock;
    }

    // ───────────── lecture

    @Transactional(readOnly = true)
    public List<BlockDto> list(UUID creatorId, boolean onlyVisible) {
        List<Block> list = blocks.findByCreatorIdOrderByPositionAsc(creatorId).stream().filter(b -> !onlyVisible || b.isVisible()).toList();
        Map<String, ImageDto> images = assets.images(list.stream().map(Block::getThumbnailAssetId).toList());
        Map<UUID, Integer> counts = new HashMap<>();
        if (!list.isEmpty()) {
            for (Object[] row : items.countByBlockIds(list.stream().map(Block::getId).toList())) {
                counts.put((UUID) row[0], ((Number) row[1]).intValue());
            }
        }
        return list.stream().map(b -> toDto(b, images, counts.getOrDefault(b.getId(), 0))).toList();
    }

    public BlockDto toDto(Block b, Map<String, ImageDto> images, Integer itemCount) {
        String thumbId = b.getThumbnailAssetId() == null ? null : b.getThumbnailAssetId().toString();
        return new BlockDto(b.getId(), b.getType(), b.getSlug(), b.getTitle(), b.getSubtitle(), b.getIcon(), thumbId,
                thumbId == null ? null : images.get(thumbId), b.getUrl(), b.getPosition(), b.isVisible(),
                mapper.convertValue(b.getConfig(), BlockConfig.class), itemCount);
    }

    @Transactional(readOnly = true)
    public List<BlockItemDto> items(UUID blockId) {
        List<BlockItem> list = items.findByBlockIdOrderByPositionAsc(blockId);
        Map<String, ImageDto> images = assets.images(list.stream().map(BlockItem::getImageAssetId).toList());
        return list.stream().map(i -> toItemDto(i, images)).toList();
    }

    private BlockItemDto toItemDto(BlockItem i, Map<String, ImageDto> images) {
        String imgId = i.getImageAssetId() == null ? null : i.getImageAssetId().toString();
        EmbedResolver.Embed e = EmbedResolver.resolve(i.getUrl());
        return new BlockItemDto(i.getId(), i.getTitle(), i.getDescription(), i.getUrl(), imgId, imgId == null ? null : images.get(imgId),
                e == null ? null : new BlockDtos.Embed(e.provider(), e.src()), i.getPosition());
    }

    // ───────────── écriture blocs

    @Transactional
    public BlockDto create(UUID creatorId, BlockInput in) {
        if (blocks.countByCreatorId(creatorId) >= MAX_BLOCKS) throw ApiException.badRequest("LIMIT", "Nombre maximum de blocs atteint.");
        int position = (int) blocks.countByCreatorId(creatorId);
        Block b = new Block(creatorId, in.type(), uniqueSlug(creatorId, in.type(), in.title()), position, clock.instant());
        apply(creatorId, b, in);
        blocks.save(b);
        return toDto(b, assets.images(Stream.of(b.getThumbnailAssetId()).filter(Objects::nonNull).toList()), 0);
    }

    @Transactional
    public BlockDto update(UUID creatorId, UUID blockId, BlockInput in) {
        Block b = owned(creatorId, blockId);
        if (!b.getType().equals(in.type())) throw ApiException.validation("type", "Le type d'un bloc ne peut pas changer.");
        apply(creatorId, b, in);
        return toDto(b, assets.images(Stream.of(b.getThumbnailAssetId()).filter(Objects::nonNull).toList()), (int) items.countByBlockId(b.getId()));
    }

    private void apply(UUID creatorId, Block b, BlockInput in) {
        UUID thumb = assets.requireOwned(creatorId, "thumbnailImageId", in.thumbnailImageId());
        String url = SafeUrls.requireOptional("url", in.url());
        if ("link".equals(in.type()) && url == null) throw ApiException.validation("url", "Un lien simple doit avoir une URL.");
        Map<String, Object> config = in.config() == null ? new HashMap<>() : mapper.convertValue(in.config(), MAP);
        config.values().removeIf(Objects::isNull);
        b.update(in.title().trim(), in.subtitle() == null ? "" : in.subtitle().trim(), in.icon(), thumb, url,
                in.visible() == null || in.visible(), config, clock.instant());
    }

    @Transactional
    public void delete(UUID creatorId, UUID blockId) {
        Block b = owned(creatorId, blockId);
        blocks.delete(b);
        blocks.flush();
        renumber(creatorId);
    }

    @Transactional
    public List<BlockDto> reorder(UUID creatorId, List<UUID> ids) {
        List<Block> current = blocks.findByCreatorIdOrderByPositionAsc(creatorId);
        if (ids.size() != current.size() || !new HashSet<>(ids).equals(new HashSet<>(current.stream().map(Block::getId).toList()))) {
            throw ApiException.validation("ids", "La liste doit contenir exactement tous les blocs.");
        }
        Map<UUID, Block> byId = new HashMap<>();
        current.forEach(b -> byId.put(b.getId(), b));
        for (int i = 0; i < ids.size(); i++) byId.get(ids.get(i)).setPosition(i);
        blocks.flush();
        return list(creatorId, false);
    }

    private void renumber(UUID creatorId) {
        List<Block> list = blocks.findByCreatorIdOrderByPositionAsc(creatorId);
        for (int i = 0; i < list.size(); i++) list.get(i).setPosition(i);
    }

    public Block owned(UUID creatorId, UUID blockId) {
        return blocks.findByIdAndCreatorId(blockId, creatorId).orElseThrow(ApiException::notFound);
    }

    String uniqueSlug(UUID creatorId, String type, String title) {
        String base = "link".equals(type) ? Slugs.slugify(title) : Slugs.DEFAULTS.getOrDefault(type, Slugs.slugify(title));
        if (Slugs.RESERVED.contains(base)) base = base + "-1";
        String slug = base;
        for (int n = 2; blocks.existsByCreatorIdAndSlug(creatorId, slug); n++) slug = base + "-" + n;
        return slug;
    }

    // ───────────── écriture éléments

    @Transactional
    public BlockItemDto createItem(UUID creatorId, UUID blockId, BlockItemInput in) {
        Block b = owned(creatorId, blockId);
        long n = items.countByBlockId(b.getId());
        if (n >= MAX_ITEMS) throw ApiException.badRequest("LIMIT", "Nombre maximum d'éléments atteint.");
        BlockItem i = new BlockItem(b.getId(), (int) n);
        applyItem(creatorId, i, in);
        items.save(i);
        return toItemDto(i, assets.images(Stream.of(i.getImageAssetId()).filter(Objects::nonNull).toList()));
    }

    @Transactional
    public BlockItemDto updateItem(UUID creatorId, UUID blockId, UUID itemId, BlockItemInput in) {
        Block b = owned(creatorId, blockId);
        BlockItem i = items.findByIdAndBlockId(itemId, b.getId()).orElseThrow(ApiException::notFound);
        applyItem(creatorId, i, in);
        return toItemDto(i, assets.images(Stream.of(i.getImageAssetId()).filter(Objects::nonNull).toList()));
    }

    private void applyItem(UUID creatorId, BlockItem i, BlockItemInput in) {
        UUID img = assets.requireOwned(creatorId, "imageId", in.imageId());
        i.update(in.title().trim(), in.description() == null ? "" : in.description().trim(), SafeUrls.requireOptional("url", in.url()), img);
    }

    @Transactional
    public void deleteItem(UUID creatorId, UUID blockId, UUID itemId) {
        Block b = owned(creatorId, blockId);
        BlockItem i = items.findByIdAndBlockId(itemId, b.getId()).orElseThrow(ApiException::notFound);
        items.delete(i);
        items.flush();
        List<BlockItem> rest = items.findByBlockIdOrderByPositionAsc(b.getId());
        for (int k = 0; k < rest.size(); k++) rest.get(k).setPosition(k);
    }

    @Transactional
    public List<BlockItemDto> reorderItems(UUID creatorId, UUID blockId, List<UUID> ids) {
        Block b = owned(creatorId, blockId);
        List<BlockItem> current = items.findByBlockIdOrderByPositionAsc(b.getId());
        if (ids.size() != current.size() || !new HashSet<>(ids).equals(new HashSet<>(current.stream().map(BlockItem::getId).toList()))) {
            throw ApiException.validation("ids", "La liste doit contenir exactement tous les éléments.");
        }
        Map<UUID, BlockItem> byId = new HashMap<>();
        current.forEach(i -> byId.put(i.getId(), i));
        for (int k = 0; k < ids.size(); k++) byId.get(ids.get(k)).setPosition(k);
        items.flush();
        return items(b.getId());
    }

    /** Blocs par défaut créés à l'inscription (textes de la maquette) — accélère l'onboarding (< 15 min). */
    @Transactional
    public void createDefaults(UUID creatorId) {
        record D(String type, String title, String subtitle, String icon) {}
        List<D> defaults = List.of(
                new D("travel", "Mes voyages", "Découvre mes dernières aventures", "plane"),
                new D("shop", "Mon shop", "Mes outfits & mes coups de cœur", "shopping-bag"),
                new D("music", "Mes sons", "Playlists, recommandations, vibes", "music"),
                new D("content", "Mes contenus", "Vlogs, behind the scenes, projets", "clapperboard"),
                new D("contact", "Me contacter", "Projets, collabs, opportunités", "mail"));
        int pos = 0;
        for (D d : defaults) {
            Block b = new Block(creatorId, d.type(), Slugs.DEFAULTS.get(d.type()), pos++, clock.instant());
            b.update(d.title(), d.subtitle(), d.icon(), null, null, true, new HashMap<>(), clock.instant());
            blocks.save(b);
        }
    }
}
