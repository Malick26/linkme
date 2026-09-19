package com.linkme.api.publicpage;

import com.linkme.api.auth.Handles;
import com.linkme.api.blocks.Block;
import com.linkme.api.blocks.BlockRepository;
import com.linkme.api.blocks.BlockService;
import com.linkme.api.common.ApiException;
import com.linkme.api.profile.CreatorProfile;
import com.linkme.api.publicpage.PublicPageDtos.PublicBlockDetail;
import com.linkme.api.publicpage.PublicPageDtos.PublicPage;
import com.linkme.api.shop.ProductService;
import com.linkme.api.uploads.AssetService;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PublicController {
    private final PublicPageAssembler assembler;
    private final BlockRepository blockRepo;
    private final BlockService blocks;
    private final ProductService products;
    private final AssetService assets;

    public PublicController(PublicPageAssembler assembler, BlockRepository blockRepo, BlockService blocks, ProductService products,
                            AssetService assets) {
        this.assembler = assembler;
        this.blockRepo = blockRepo;
        this.blocks = blocks;
        this.products = products;
        this.assets = assets;
    }

    /** Micro-cache partagé : 30 s (le SSR interroge l'API à chaque rendu). */
    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic();

    CreatorProfile published(String handle) {
        String h = Handles.normalize(handle);
        if (!Handles.validFormat(h)) throw ApiException.notFound();
        return assembler.findPublished(h).orElseThrow(ApiException::notFound);
    }

    /** operationId: getPublicPage */
    @GetMapping("/api/public/{handle}")
    public ResponseEntity<PublicPage> page(@PathVariable String handle) {
        return ResponseEntity.ok().cacheControl(CACHE).body(assembler.build(published(handle), false));
    }

    /** operationId: getPublicBlock */
    @GetMapping("/api/public/{handle}/blocks/{slug}")
    @Transactional(readOnly = true)
    public ResponseEntity<PublicBlockDetail> block(@PathVariable String handle, @PathVariable String slug) {
        CreatorProfile p = published(handle);
        if (!slug.matches("^[a-z0-9-]{1,40}$")) throw ApiException.notFound();
        Block b = blockRepo.findByCreatorIdAndSlug(p.getUserId(), slug).filter(Block::isVisible).orElseThrow(ApiException::notFound);
        var images = assets.images(java.util.Collections.singletonList(b.getThumbnailAssetId()));
        var dto = blocks.toDto(b, images == null ? Map.of() : images, null);
        var items = "shop".equals(b.getType()) ? List.<com.linkme.api.blocks.BlockDtos.BlockItemDto>of() : blocks.items(b.getId());
        var prods = "shop".equals(b.getType()) ? products.publicList(p.getUserId()) : List.<com.linkme.api.shop.ShopDtos.PublicProductDto>of();
        return ResponseEntity.ok().cacheControl(CACHE).body(new PublicBlockDetail(dto, items, prods));
    }
}
