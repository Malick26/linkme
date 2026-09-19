package com.linkme.api.auth;

import com.linkme.api.auth.AuthDtos.DeleteAccountRequest;
import com.linkme.api.auth.AuthDtos.ForgotPasswordRequest;
import com.linkme.api.auth.AuthDtos.HandleAvailability;
import com.linkme.api.auth.AuthDtos.LoginRequest;
import com.linkme.api.auth.AuthDtos.Me;
import com.linkme.api.auth.AuthDtos.RegisterRequest;
import com.linkme.api.auth.AuthDtos.ResetPasswordRequest;
import com.linkme.api.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController {
    private final AuthService auth;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository;
    private final SecurityContextHolderStrategy holder = SecurityContextHolder.getContextHolderStrategy();

    public AuthController(AuthService auth, AuthenticationManager authenticationManager, SecurityContextRepository contextRepository) {
        this.auth = auth;
        this.authenticationManager = authenticationManager;
        this.contextRepository = contextRepository;
    }

    /** operationId: getCsrf — force l'émission du cookie XSRF-TOKEN (jeton différé de Spring Security 6). */
    @GetMapping("/api/auth/csrf")
    public ResponseEntity<Void> csrf(CsrfToken token) {
        token.getToken();
        return ResponseEntity.noContent().build();
    }

    /** operationId: checkHandle */
    @GetMapping("/api/auth/handle-availability")
    public HandleAvailability handle(@RequestParam String handle) {
        return auth.availability(handle);
    }

    /** operationId: register — crée le compte puis ouvre la session. */
    @PostMapping("/api/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Me register(@Valid @RequestBody RegisterRequest req, HttpServletRequest request, HttpServletResponse response) {
        User u = auth.register(req);
        AppUser principal = new AppUser(u.getId(), u.getEmail(), null);
        startSession(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()), request, response);
        return auth.me(u.getId());
    }

    /** operationId: login */
    @PostMapping("/api/auth/login")
    public Me login(@Valid @RequestBody LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        Authentication a;
        try {
            a = authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(req.email().trim().toLowerCase(), req.password()));
        } catch (AuthenticationException e) {
            throw ApiException.unauthorized("BAD_CREDENTIALS", "Email ou mot de passe incorrect.");
        }
        AppUser principal = ((AppUser) a.getPrincipal()).withoutSecret();
        startSession(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()), request, response);
        return auth.me(principal.id());
    }

    private void startSession(Authentication a, HttpServletRequest request, HttpServletResponse response) {
        request.getSession(true);
        request.changeSessionId(); // protection contre la fixation de session
        SecurityContext ctx = holder.createEmptyContext();
        ctx.setAuthentication(a);
        holder.setContext(ctx);
        contextRepository.saveContext(ctx, request, response);
    }

    /** operationId: logout */
    @PostMapping("/api/auth/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        new SecurityContextLogoutHandler().logout(request, response, authentication);
    }

    /** operationId: forgotPassword */
    @PostMapping("/api/auth/forgot")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void forgot(@Valid @RequestBody ForgotPasswordRequest req) {
        auth.forgot(req.email());
    }

    /** operationId: resetPassword */
    @PostMapping("/api/auth/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@Valid @RequestBody ResetPasswordRequest req) {
        auth.reset(req.token(), req.password());
    }

    /** operationId: getMe */
    @GetMapping("/api/me")
    public Me me(@AuthenticationPrincipal AppUser me) {
        return auth.me(me.id());
    }

    /** operationId: deleteAccount */
    @DeleteMapping("/api/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AppUser me, @Valid @RequestBody DeleteAccountRequest req, HttpServletRequest request,
                       HttpServletResponse response, Authentication authentication) {
        auth.deleteAccount(me.id(), req.password());
        new SecurityContextLogoutHandler().logout(request, response, authentication);
    }
}
