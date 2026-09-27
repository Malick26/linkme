package com.linkme.api.uploads;

import com.linkme.api.auth.AppUser;
import com.linkme.api.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class UploadController {
    static final String KINDS = "background|thumbnail|product|item";
    private final CloudinaryService cloudinary;
    private final LocalMediaService local;
    private final AssetService assets;

    public UploadController(CloudinaryService cloudinary, LocalMediaService local, AssetService assets) {
        this.cloudinary = cloudinary;
        this.local = local;
        this.assets = assets;
    }

    public record SignRequest(@NotBlank @Pattern(regexp = KINDS) String kind) {}

    public record CompleteRequest(
            @NotBlank @Pattern(regexp = KINDS) String kind,
            @NotBlank @Size(max = 255) String publicId,
            @NotNull Long version,
            @NotBlank @Size(max = 128) String signature,
            @NotNull @Min(1) @Max(20000) Integer width,
            @NotNull @Min(1) @Max(20000) Integer height,
            @NotBlank @Size(max = 10) String format,
            @NotNull @Min(1) Integer bytes) {}

    /** Son d'un item de bloc « sons » (D50) : pas de dimensions, kind fixe côté serveur. */
    public record AudioCompleteRequest(
            @NotBlank @Size(max = 255) String publicId,
            @NotNull Long version,
            @NotBlank @Size(max = 128) String signature,
            @NotBlank @Size(max = 10) String format,
            @NotNull @Min(1) Integer bytes) {}

    /** operationId: signUpload */
    @PostMapping("/api/me/uploads/sign")
    public CloudinaryService.Signature sign(@AuthenticationPrincipal AppUser me, @Valid @RequestBody SignRequest req) {
        return cloudinary.sign(me.id());
    }

    /** operationId: completeUpload */
    @PostMapping("/api/me/uploads/complete")
    @ResponseStatus(HttpStatus.CREATED)
    public ImageDto complete(@AuthenticationPrincipal AppUser me, @Valid @RequestBody CompleteRequest req) {
        if (!cloudinary.enabled()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UPLOAD_UNAVAILABLE", "Cloudinary n'est pas configuré.");
        if (!req.publicId().startsWith(cloudinary.folderFor(me.id()) + "/")) throw ApiException.validation("publicId", "Dossier invalide.");
        if (!cloudinary.verifyUploadResponse(req.publicId(), req.version(), req.signature())) {
            throw ApiException.validation("signature", "Signature Cloudinary invalide.");
        }
        if (!Set.of("jpg", "jpeg", "png", "webp").contains(req.format().toLowerCase())) throw ApiException.badRequest("UPLOAD_TYPE", "Format non supporté.");
        Asset a = assets.save(me.id(), "cloudinary", req.publicId(), req.kind(), req.width(), req.height(), req.format(), req.bytes(), null);
        return assets.toImage(a);
    }

    /** operationId: uploadLocal */
    @PostMapping(path = "/api/me/uploads/local", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageDto uploadLocal(@AuthenticationPrincipal AppUser me, @RequestParam("file") MultipartFile file, @RequestParam("kind") String kind) throws IOException {
        if (!kind.matches(KINDS)) throw ApiException.validation("kind", "Type d'image invalide.");
        LocalMediaService.Stored s = local.store(file.getBytes());
        Asset a = assets.save(me.id(), "local", s.fileName(), kind, s.width(), s.height(), s.format(), s.bytes(), s.placeholder());
        return assets.toImage(a);
    }

    /** operationId: signAudioUpload — son d'un item de bloc « sons » (D50). */
    @PostMapping("/api/me/uploads/sign-audio")
    public CloudinaryService.Signature signAudio(@AuthenticationPrincipal AppUser me) {
        return cloudinary.signAudio(me.id());
    }

    /** operationId: completeAudioUpload */
    @PostMapping("/api/me/uploads/complete-audio")
    @ResponseStatus(HttpStatus.CREATED)
    public AudioDto completeAudio(@AuthenticationPrincipal AppUser me, @Valid @RequestBody AudioCompleteRequest req) {
        if (!cloudinary.enabled()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "UPLOAD_UNAVAILABLE", "Cloudinary n'est pas configuré.");
        if (!req.publicId().startsWith(cloudinary.folderFor(me.id()) + "/")) throw ApiException.validation("publicId", "Dossier invalide.");
        if (!cloudinary.verifyUploadResponse(req.publicId(), req.version(), req.signature())) {
            throw ApiException.validation("signature", "Signature Cloudinary invalide.");
        }
        if (!Set.of("mp3", "wav", "m4a", "ogg").contains(req.format().toLowerCase())) throw ApiException.badRequest("UPLOAD_TYPE", "Format non supporté.");
        Asset a = assets.save(me.id(), "cloudinary", req.publicId(), "sound", null, null, req.format(), req.bytes(), null);
        return assets.toAudio(a);
    }

    /** operationId: uploadLocalAudio */
    @PostMapping(path = "/api/me/uploads/local-audio", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AudioDto uploadLocalAudio(@AuthenticationPrincipal AppUser me, @RequestParam("file") MultipartFile file) throws IOException {
        LocalMediaService.StoredAudio s = local.storeAudio(file.getBytes());
        Asset a = assets.save(me.id(), "local", s.fileName(), "sound", null, null, s.format(), s.bytes(), null);
        return assets.toAudio(a);
    }
}
