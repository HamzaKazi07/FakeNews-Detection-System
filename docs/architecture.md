# Architecture

The active application architecture is:

```text
React/Vite
    → Spring Boot API
        → FastAPI ML service
        → PostgreSQL
```

The browser communicates with Spring Boot; it does not call FastAPI directly. Spring invokes FastAPI for text prediction and image/OCR inference and persists user-facing prediction records in PostgreSQL.

## Responsibilities

### React/Vite frontend

- Renders the application UI and maintains the authenticated client session.
- Provides text, URL, image/OCR, and voice input.
- Presents predictions, feedback, history, dashboard, Live News, and Admin views.

### Spring Boot API

- Handles registration, login, JWT authentication, and role-based authorization.
- Orchestrates application API requests and validates input.
- Persists users' prediction history and feedback; serves history and dashboard data.
- Provides Live News and Admin APIs.
- Fetches, validates, and extracts article content for URL analysis.
- Communicates with FastAPI for ML inference and OCR requests.

### FastAPI ML service

- Loads the existing model and vectorizer artifacts and runs the existing preprocessing/inference pipeline.
- Performs image decoding, OCR with Tesseract, and image-backed prediction.
- Exposes an internal health endpoint.
- Does not train or regenerate artifacts at container build time.

### PostgreSQL

Stores user accounts, prediction history, and feedback. Flyway manages schema migrations; Hibernate validates the mapped schema.

## Docker Compose relationships

Compose defines four services:

- `frontend` publishes Vite on host port `5174` and depends on `backend`.
- `backend` publishes Spring Boot on host port `8080`; it depends on healthy `postgres` and `ml-service` services.
- `ml-service` listens on port `8000` inside the Compose network and is not published to the host. Spring calls it over the internal network.
- `postgres` listens on port `5432` inside the Compose network and is not published to the host. Its data is persisted in the named `postgres-data` volume.

The PostgreSQL volume is persistent application data and should not be removed casually.

## Legacy and model provenance

The Flask application and SQLite databases are historical/legacy components, not part of the active Compose request path. Training datasets and notebook/script files are training/provenance material. The inference service uses existing `model.pkl` and `vectorizer.pkl` files staged locally under `python-ml-service/artifacts/`; they are Git-ignored and are not regenerated during Docker builds.

The classifier recognizes patterns in its training data. Its prediction is not an independent fact-check, and article extraction or OCR may be inaccurate.
