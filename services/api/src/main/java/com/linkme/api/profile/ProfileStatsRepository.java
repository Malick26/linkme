package com.linkme.api.profile;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileStatsRepository extends JpaRepository<ProfileStats, UUID> {}
