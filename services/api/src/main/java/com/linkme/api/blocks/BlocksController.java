package com.linkme.api.blocks;

import com.linkme.api.auth.AppUser;
import com.linkme.api.blocks.BlockDtos.BlockDto;
import com.linkme.api.blocks.BlockDtos.BlockInput;
import com.linkme.api.blocks.BlockDtos.BlockItemDto;
import com.linkme.api.blocks.BlockDtos.BlockItemInput;
import com.linkme.api.blocks.BlockDtos.OrderRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/blocks")
public class BlocksController {
    private final BlockService service;

    public BlocksController(BlockService service) {
        this.service = service;
    }

    /** operationId: listBlocks */
    @GetMapping
    public List<BlockDto> list(@AuthenticationPrincipal AppUser me) {
        return service.list(me.id(), false);
    }

    /** operationId: createBlock */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BlockDto create(@AuthenticationPrincipal AppUser me, @Valid @RequestBody BlockInput in) {
        return service.create(me.id(), in);
    }

    /** operationId: reorderBlocks */
    @PutMapping("/order")
    public List<BlockDto> reorder(@AuthenticationPrincipal AppUser me, @Valid @RequestBody OrderRequest req) {
        return service.reorder(me.id(), req.ids());
    }

    /** operationId: updateBlock */
    @PutMapping("/{blockId}")
    public BlockDto update(@AuthenticationPrincipal AppUser me, @PathVariable UUID blockId, @Valid @RequestBody BlockInput in) {
        return service.update(me.id(), blockId, in);
    }

    /** operationId: deleteBlock */
    @DeleteMapping("/{blockId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AppUser me, @PathVariable UUID blockId) {
        service.delete(me.id(), blockId);
    }

    /** operationId: listBlockItems */
    @GetMapping("/{blockId}/items")
    public List<BlockItemDto> items(@AuthenticationPrincipal AppUser me, @PathVariable UUID blockId) {
        return service.items(service.owned(me.id(), blockId).getId());
    }

    /** operationId: createBlockItem */
    @PostMapping("/{blockId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public BlockItemDto createItem(@AuthenticationPrincipal AppUser me, @PathVariable UUID blockId, @Valid @RequestBody BlockItemInput in) {
        return service.createItem(me.id(), blockId, in);
    }

    /** operationId: reorderBlockItems */
    @PutMapping("/{blockId}/items/order")
    public List<BlockItemDto> reorderItems(@AuthenticationPrincipal AppUser me, @PathVariable UUID blockId, @Valid @RequestBody OrderRequest req) {
        return service.reorderItems(me.id(), blockId, req.ids());
    }

    /** operationId: updateBlockItem */
    @PutMapping("/{blockId}/items/{itemId}")
    public BlockItemDto updateItem(@AuthenticationPrincipal AppUser me, @PathVariable UUID blockId, @PathVariable UUID itemId,
                                   @Valid @RequestBody BlockItemInput in) {
        return service.updateItem(me.id(), blockId, itemId, in);
    }

    /** operationId: deleteBlockItem */
    @DeleteMapping("/{blockId}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItem(@AuthenticationPrincipal AppUser me, @PathVariable UUID blockId, @PathVariable UUID itemId) {
        service.deleteItem(me.id(), blockId, itemId);
    }
}
