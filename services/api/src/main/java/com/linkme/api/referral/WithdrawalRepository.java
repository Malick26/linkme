package com.linkme.api.referral;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WithdrawalRepository extends JpaRepository<Withdrawal, UUID> {
    List<Withdrawal> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<Withdrawal> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);

    boolean existsByUserIdAndStatus(UUID userId, WithdrawalStatus status);

    boolean existsByUserIdAndPhone(UUID userId, String phone);

    List<Withdrawal> findByStatusOrderByCreatedAtAsc(WithdrawalStatus status, Pageable pageable);

    List<Withdrawal> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Withdrawal w where w.id = :id")
    Optional<Withdrawal> lock(@Param("id") UUID id);

    @Query("select coalesce(sum(w.amountXof), 0) from Withdrawal w where w.userId = :userId and w.status = :status")
    long sumByStatus(@Param("userId") UUID userId, @Param("status") WithdrawalStatus status);
}
