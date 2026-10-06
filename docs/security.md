# Security

Spring Boot is the application API security boundary. FastAPI is an internal inference service called by Spring over the Docker Compose network.

## Authentication and authorization

- Spring Security uses stateless sessions and JWT authentication.
- Registration and login are public. `/api/auth/me` requires a valid JWT.
- The health routes and `GET /api/live-news` are public.
- Other application API routes require authentication.
- `/api/admin/**` requires `ROLE_ADMIN`.
- Passwords are hashed with BCrypt.

## CORS and headers

CORS allows the configured `FRONTEND_URL` and the local frontend origins `http://localhost:5174` and `http://127.0.0.1:5174`. Allowed methods are GET, POST, DELETE, and OPTIONS; allowed headers are Authorization and Content-Type. Spring Security also enables content-type options protection, denies framing, and uses a same-origin referrer policy.

## URL analysis

URL analysis accepts only HTTP and HTTPS, rejects embedded URL credentials, restricts ports to 80 and 443, and blocks loopback, link-local, private, and other restricted IP addresses. Redirects are followed manually and every destination is revalidated; at most three redirects are followed. URL length is limited to 2,048 characters, HTML response bodies to 2 MiB, and extracted article text to 50,000 characters. Non-HTML content is rejected.

## Image analysis

Spring multipart configuration limits each file to 10 MB and the full request to 11 MB. The ML service accepts PNG, JPEG, and WEBP images and rejects decoded images exceeding 25 megapixels before image loading and OCR. Invalid images and OCR failures are returned with client-safe error details rather than raw Python exceptions.

## API documentation

Swagger/OpenAPI is disabled by default through `SWAGGER_ENABLED=false`. Setting `SWAGGER_ENABLED=true` enables it; when enabled, the current Spring security configuration permits the documentation routes without authentication. Enable it only when appropriate for the environment.

## Secrets and containers

Database credentials, `JWT_SECRET`, and `ML_SERVICE_TOKEN` are supplied through environment configuration. Do not commit local `.env` files or secrets. The Spring Boot and FastAPI Docker images run as non-root users. The frontend uses a development Vite container.

## Rate limiting

Rate limiting is not currently implemented and remains a future hardening item. Use a trusted API gateway or edge control for rate limiting before public production exposure; the application does not provide an in-memory substitute.

## Legacy components

The Flask application and SQLite databases are historical/legacy material and are not the active application security boundary or Compose architecture. Training/provenance files and the existing ML artifacts are separate from the runtime API security controls.
