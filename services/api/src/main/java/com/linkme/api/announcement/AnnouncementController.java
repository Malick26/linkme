package com.linkme.api.announcement;

import com.linkme.api.announcement.AnnouncementDtos.AdminAnnouncement;
import com.linkme.api.announcement.AnnouncementDtos.AnnouncementInput;
import com.linkme.api.announcement.AnnouncementDtos.PublicAnnouncement;
import com.linkme.api.auth.AppUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AnnouncementController {
    private final AnnouncementService announcements;

    public AnnouncementController(AnnouncementService announcements) {
        this.announcements = announcements;
    }

    /** operationId: getCurrentAnnouncement — public ; cache court pour ne pas solliciter l'API à chaque visite. */
    @GetMapping("/api/public/announcements/current")
    public ResponseEntity<PublicAnnouncement> current(@RequestParam String audience) {
        CacheControl cache = CacheControl.maxAge(java.time.Duration.ofMinutes(1)).cachePublic();
        return announcements.current(audience).map(a -> ResponseEntity.ok().cacheControl(cache).body(a))
                .orElseGet(() -> ResponseEntity.noContent().cacheControl(cache).build());
    }

    /** operationId: adminListAnnouncements */
    @GetMapping("/api/admin/announcements")
    public List<AdminAnnouncement> list() {
        return announcements.list();
    }

    /** operationId: adminCreateAnnouncement */
    @PostMapping("/api/admin/announcements")
    @ResponseStatus(HttpStatus.CREATED)
    public AdminAnnouncement create(@AuthenticationPrincipal AppUser admin, @Valid @RequestBody AnnouncementInput in) {
        return announcements.create(admin.id(), in);
    }

    /** operationId: adminUpdateAnnouncement */
    @PutMapping("/api/admin/announcements/{announcementId}")
    public AdminAnnouncement update(@PathVariable UUID announcementId, @Valid @RequestBody AnnouncementInput in) {
        return announcements.update(announcementId, in);
    }
}
