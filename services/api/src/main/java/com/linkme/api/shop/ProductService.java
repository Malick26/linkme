package com.linkme.api.shop;

import com.linkme.api.common.ApiException;
import com.linkme.api.shop.ShopDtos.ProductDto;
import com.linkme.api.shop.ShopDtos.ProductInput;
import com.linkme.api.shop.ShopDtos.PublicProductDto;
import com.linkme.api.uploads.AssetService;
import com.linkme.api.uploads.ImageDto;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {
    public static final int MAX_PRODUCTS = 100;
    private final ProductRepository products;
    private final AssetService assets;
    private final Clock clock;

    public ProductService(ProductRepository products, AssetService assets, Clock clock) {
        this.products = products;
        this.assets = assets;
        this.clock = clock;
    }

    private List<ImageDto> images(Product p) {
        Map<String, ImageDto> map = assets.images(p.getImageIds().stream().map(ProductService::uuid).filter(Objects::nonNull).toList());
        return p.getImageIds().stream().map(map::get).filter(Objects::nonNull).toList();
    }

    private static UUID uuid(String s) {
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public ProductDto toDto(Product p) {
        return new ProductDto(p.getId(), p.getTitle(), p.getPriceXof(), p.getDescription(), p.getStock(), p.isActive(), p.getImageIds(),
                images(p), p.getCreatedAt());
    }

    public PublicProductDto toPublic(Product p) {
        return new PublicProductDto(p.getId(), p.getTitle(), p.getPriceXof(), p.getDescription(), images(p), p.available(1));
    }

    @Transactional(readOnly = true)
    public List<ProductDto> list(UUID creatorId) {
        return products.findLive(creatorId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<PublicProductDto> publicList(UUID creatorId) {
        return products.findLive(creatorId).stream().filter(Product::isActive).map(this::toPublic).toList();
    }

    @Transactional(readOnly = true)
    public PublicProductDto publicGet(UUID creatorId, UUID productId) {
        Product p = products.findLive(productId, creatorId).filter(Product::isActive).orElseThrow(ApiException::notFound);
        return toPublic(p);
    }

    @Transactional
    public ProductDto create(UUID creatorId, ProductInput in) {
        if (products.countByCreatorIdAndDeletedAtIsNull(creatorId) >= MAX_PRODUCTS) throw ApiException.badRequest("LIMIT", "Nombre maximum de produits atteint.");
        Product p = new Product(creatorId, clock.instant());
        apply(creatorId, p, in);
        return toDto(products.save(p));
    }

    @Transactional
    public ProductDto update(UUID creatorId, UUID productId, ProductInput in) {
        Product p = products.findLive(productId, creatorId).orElseThrow(ApiException::notFound);
        apply(creatorId, p, in);
        return toDto(p);
    }

    private void apply(UUID creatorId, Product p, ProductInput in) {
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < in.imageIds().size(); i++) {
            UUID id = assets.requireOwned(creatorId, "imageIds[" + i + "]", in.imageIds().get(i));
            if (id != null && !ids.contains(id.toString())) ids.add(id.toString());
        }
        if (ids.isEmpty()) throw ApiException.validation("imageIds", "Au moins une photo est requise.");
        p.update(in.title().trim(), in.priceXof(), in.description() == null ? "" : in.description().strip(), in.stock(), in.active(), ids, clock.instant());
    }

    @Transactional
    public void delete(UUID creatorId, UUID productId) {
        products.findLive(productId, creatorId).orElseThrow(ApiException::notFound).softDelete(clock.instant());
    }
}
