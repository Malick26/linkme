package com.linkme.api.theme;

import com.linkme.api.auth.AppUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ThemeController {
    private final ThemeService themes;
    private final ThemePresets presets;

    public ThemeController(ThemeService themes, ThemePresets presets) {
        this.themes = themes;
        this.presets = presets;
    }

    /** operationId: getTheme */
    @GetMapping("/api/me/theme")
    public ThemeService.ThemeState get(@AuthenticationPrincipal AppUser me) {
        return themes.state(me.id());
    }

    /** operationId: saveThemeDraft */
    @PutMapping("/api/me/theme")
    public ThemeService.ThemeState save(@AuthenticationPrincipal AppUser me, @Valid @RequestBody ThemeConfig config) {
        return themes.saveDraft(me.id(), config);
    }

    /** operationId: publishTheme */
    @PostMapping("/api/me/theme/publish")
    public ThemeService.ThemeState publish(@AuthenticationPrincipal AppUser me) {
        return themes.publish(me.id());
    }

    /** operationId: listThemePresets */
    @GetMapping("/api/theme/presets")
    public ResponseEntity<List<ThemePresets.Preset>> presets() {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)).cachePublic()).body(presets.all());
    }
}
