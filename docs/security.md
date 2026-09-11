# Security baseline

Secrets are supplied by environment variables and must not be committed. Use a distinct, random `JWT_SECRET` and `ML_SERVICE_TOKEN`; no default administrator is created.

Spring Boot is the security boundary: JWT validation, BCrypt hashes, role checks, CORS restricted to `FRONTEND_URL`, request validation, structured errors, and rate limiting belong there. URL fetching must reject non-HTTP(S), localhost, private/link-local/metadata addresses and unsafe redirects. Image endpoints must enforce byte, format, dimension, and pixel limits.

The legacy Flask server is intentionally retained only while migration occurs and must not be deployed publicly in its current form.
