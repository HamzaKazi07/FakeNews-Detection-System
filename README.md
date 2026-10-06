# FakeNews Detection System

FakeNews Detection System is an AI/NLP-assisted application for reviewing news credibility signals. It supports text, article URL, image/OCR, and voice input, with prediction history, feedback, a dashboard, Live News, and an Admin panel. Predictions are model outputs, not independent fact-checks or factual certainty.

## Current architecture

```text
React + Vite
     ↓
Spring Boot API (Java 21)
     ↓
FastAPI ML service
     ↓
PostgreSQL 16
```

The browser calls Spring Boot. Spring handles authentication, authorization, API orchestration, persistence, URL fetching, and calls the internal FastAPI service for prediction and OCR. PostgreSQL stores users, prediction history, and feedback.

### Features

- Text analysis with prediction, confidence, and important terms.
- URL/article analysis with server-side fetching, validation, extraction, and analysis.
- Image upload and OCR before analysis.
- Browser voice input to populate analysis text.
- Live News RSS feed. Feed items are **not** automatically classified as REAL or FAKE; choose **Analyze article** to submit one for analysis.
- Authenticated prediction history with feedback and pagination.
- Dashboard counts, feedback metrics, and confidence statistics.
- Admin user, prediction-log, and aggregate-statistics views.

## Technology stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, Axios, existing custom CSS design system |
| Backend API | Spring Boot, Java 21, Maven, Spring Security, JWT, BCrypt |
| Persistence | PostgreSQL 16, Spring Data JPA, Flyway |
| ML service | FastAPI, existing trained model and vectorizer, existing preprocessing/inference pipeline |
| Image/OCR | Pillow, Tesseract OCR |
| Infrastructure | Docker Compose with separate frontend, Spring, FastAPI, and PostgreSQL services |

## API overview

Protected routes use `Authorization: Bearer <JWT>`. Registration and login are public. `/api/auth/me` requires authentication. `/api/live-news` is public, while `/api/admin/**` requires the Admin role (`ROLE_ADMIN`).

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Register with name, email, and password. |
| `POST` | `/api/auth/login` | Public | Authenticate with email and password; returns a JWT and user information. |
| `GET` | `/api/auth/me` | JWT | Return the authenticated user's information. |
| `POST` | `/api/predict` | JWT | Analyze JSON `{ "text": "..." }`; text length is 20–50,000 characters. |
| `POST` | `/api/predict-url` | JWT | Analyze JSON `{ "url": "..." }`. |
| `POST` | `/api/predict-image` | JWT | Analyze a multipart upload using the `image` field. |
| `GET` | `/api/history?page=0&size=20` | JWT | Return the authenticated user's paginated history. |
| `GET` | `/api/dashboard/stats` | JWT | Return user-scoped dashboard counts, feedback metrics, and confidence statistics. |
| `POST` | `/api/feedback` | JWT | Submit `entry_id` and `feedback` (`yes` or `no`) for the user's history entry. |
| `GET` | `/api/live-news` | Public | Return items from the configured RSS feed; items have no automatic prediction. |
| `GET` | `/api/admin/users` | `ROLE_ADMIN` | List users. |
| `DELETE` | `/api/admin/users/{userId}` | `ROLE_ADMIN` | Delete an eligible user account. |
| `GET` | `/api/admin/logs` | `ROLE_ADMIN` | List prediction logs. |
| `DELETE` | `/api/admin/logs/{logId}` | `ROLE_ADMIN` | Delete a prediction-history log. |
| `GET` | `/api/admin/stats` | `ROLE_ADMIN` | Return aggregate Admin statistics. |
| `GET` | `/api/health` | Public | Return Spring API health status. `/health` is also available. |

Most Spring endpoints return a `success`/`data` response envelope. Image prediction returns its response fields directly. Prediction results include an id, `REAL`/`FAKE` label, confidence in the 0–1 range, important words, and model version; URL and image results also include extracted content fields.

## Security

- Spring Security validates JWTs and uses stateless sessions.
- Passwords are hashed with BCrypt.
- Admin routes require `ROLE_ADMIN`; ordinary API routes require authentication except the explicitly public endpoints above.
- CORS is restricted to the configured frontend origin and the local frontend origins on port 5174.
- URL analysis limits URL length, allows only HTTP/HTTPS on standard ports, blocks private/restricted addresses, revalidates up to three redirects, limits HTML responses to 2 MiB, and requires HTML content.
- Image uploads are limited to 10 MB. FastAPI rejects decoded images above 25 megapixels before OCR.
- Swagger/OpenAPI is disabled by default. Set `SWAGGER_ENABLED=true` when enabling it for local development.
- Spring and FastAPI containers run as non-root users.
- Error responses avoid exposing raw Spring server messages; invalid image and OCR errors are returned as client-safe messages.
- Secrets such as database credentials, `JWT_SECRET`, and `ML_SERVICE_TOKEN` are supplied through environment configuration, not committed.

**Rate limiting is not currently implemented and remains a future hardening item.** Consider a trusted API gateway or edge service before public production exposure.

## ML artifacts

The existing `model.pkl` and `vectorizer.pkl` are intentionally Git-ignored. Before building the ML image, stage the approved existing files at:

```text
python-ml-service/artifacts/model.pkl
python-ml-service/artifacts/vectorizer.pkl
```

On a clean checkout, obtain those existing artifacts from the project owner or approved artifact storage, then copy them into that directory. The Docker build reports an actionable error if either file is absent. Docker does **not** train or regenerate a model.

## Run with Docker Compose

Configure the required environment variables from `.env.example` in a local `.env` file; do not commit the local file. Stage the two ML artifacts at the paths above, then from the repository root run:

```powershell
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
```

| Service | Host access |
| --- | --- |
| Frontend (Vite) | `http://localhost:5174` |
| Spring Boot | `http://localhost:8080` |
| FastAPI ML service | Internal Compose network, port `8000` |
| PostgreSQL 16 | Internal Compose network, port `5432` (not published to the host by the current Compose file) |

PostgreSQL data is stored in the named `postgres-data` Docker volume. Do not remove that volume casually; it contains persistent application data.

## Local development and tests

The frontend can be started from `frontend/` with `npm ci` and `npm run dev -- --host 0.0.0.0 --port 5174`. Spring Boot uses Maven and Java 21 from `spring-backend/`. FastAPI runs internally in Compose and requires the staged artifacts for inference.

Current verification results:

- Backend Maven tests: **51 passed** (Java 21).
- Frontend tests: **25 passed**.
- Frontend lint: passed.
- Frontend production build: passed.
- ML tests inside the ML container: **18 passed**.
- Docker Compose configuration: passed.
- Docker image build and service startup: passed.
- PostgreSQL and ML service: healthy.
- Spring `/api/health`: `UP`.
- Frontend HTTP check: `200`.

## Legacy and provenance files
