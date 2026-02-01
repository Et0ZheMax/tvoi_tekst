# Security Notes

## Threat model (summary)

- Credential stuffing, brute force.
- Token theft (XSS, CSRF, session fixation).
- Abuse of realtime channel.
- Data leakage in logs.

## Mitigations

- Passwords hashed with Argon2.
- Access tokens (JWT) short-lived.
- Refresh tokens stored as HttpOnly cookies, hashed in DB.
- Rate limiting enabled on API.
- Security headers via Helmet (CSP, frame-ancestors, etc.).
- CORS restricted to configured origin(s).
- Input validation via Zod.
- Logs redact secrets and auth headers.
- TLS termination expected at reverse proxy.

## Audit logging

- Session creation and revocation are stored in DB.
- Extend with dedicated audit table for admin actions and security events.
