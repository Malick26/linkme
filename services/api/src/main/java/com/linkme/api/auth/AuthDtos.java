package com.linkme.api.auth;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class AuthDtos {
    private AuthDtos() {}

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 10, max = 128) String password,
            @NotBlank @Size(min = 3, max = 30) String handle,
            @NotBlank @Size(max = 60) String displayName,
            @NotNull @AssertTrue Boolean acceptTerms,
            @Size(max = 16) String referralCode) {}

    public record LoginRequest(@NotBlank @Email @Size(max = 254) String email, @NotBlank @Size(max = 128) String password) {}

    public record ForgotPasswordRequest(@NotBlank @Email @Size(max = 254) String email) {}

    public record ResetPasswordRequest(@NotBlank @Size(max = 128) String token, @NotBlank @Size(min = 10, max = 128) String password) {}

    public record DeleteAccountRequest(@NotBlank @Size(max = 128) String password) {}

    public record Me(UUID id, String email, String handle, String displayName, String plan, boolean published, boolean onboardingCompleted,
                     String subscriptionStatus, Instant subscriptionExpiresAt, boolean admin) {}

    public record HandleAvailability(String handle, boolean available, String reason) {}
}
