# API reference

The active application API is served by Spring Boot on port `8080`. Unless noted as public, routes require:

```http
Authorization: Bearer <JWT>
```

Registration and login are public. `/api/auth/me` requires a valid JWT. `GET /api/live-news` is public. Every `/api/admin/**` route requires the Admin role (`ROLE_ADMIN`). Other application APIs require authentication.

Spring responses generally use `{ "success": true, "data": ... }`. Image prediction returns its response fields directly.

## Health

| Method | Path | Access | Purpose and response |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | Spring health response with `status` and `timestamp`. |
| `GET` | `/health` | Public | Alias for the Spring health route. |

FastAPI has an internal `GET /health` endpoint for service health and model/vectorizer loading status. It is not a public Spring route.

## Authentication

| Method | Path | Access | Request and response |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | JSON fields: `name`, `email`, `password`. Returns HTTP 201 with the created authentication data. |
| `POST` | `/api/auth/login` | Public | JSON fields: `email`, `password`. Returns authentication data including the JWT and user. |
| `GET` | `/api/auth/me` | JWT | Returns the current authenticated user's information. |

## Prediction

| Method | Path | Access | Request and response |
| --- | --- | --- | --- |
| `POST` | `/api/predict` | JWT | JSON `{ "text": "..." }`; text must be 20–50,000 characters. Returns prediction id, label, confidence, important words, and model version. |
| `POST` | `/api/predict-url` | JWT | JSON `{ "url": "..." }`; URL is limited to 2,048 characters. Returns prediction data plus scraped article text and source URL. |
| `POST` | `/api/predict-image` | JWT | Multipart form field `image`. Returns prediction data plus extracted OCR text. |

Prediction labels are `REAL` or `FAKE`; confidence is represented in the 0–1 range. URL analysis accepts HTTP/HTTPS and applies URL-fetching restrictions before inference. Image uploads are limited to 10 MB, and decoded images are limited to 25 megapixels.

## History, dashboard, and feedback

| Method | Path | Access | Request and response |
| --- | --- | --- | --- |
| `GET` | `/api/history?page=0&size=20` | JWT | Returns the current user's paginated history and page metadata. `page` defaults to 0; `size` defaults to 20 and is limited to 1–100. |
| `GET` | `/api/dashboard/stats` | JWT | Returns user-scoped prediction counts, feedback counts, daily statistics, and confidence aggregates. |
| `POST` | `/api/feedback` | JWT | JSON fields: positive `entry_id` and `feedback` with value `yes` or `no`. The entry must belong to the authenticated user. |

## Live News

| Method | Path | Access | Purpose and response |
| --- | --- | --- | --- |
| `GET` | `/api/live-news` | Public | Returns articles from the configured RSS feed, with title, description, link, and source information. Feed items are not automatically classified; users can choose to analyze an article. |

## Admin

All routes below require `ROLE_ADMIN`.

| Method | Path | Purpose and response |
| --- | --- | --- |
| `GET` | `/api/admin/users` | List users. |
| `DELETE` | `/api/admin/users/{userId}` | Delete an eligible user account; the current Admin account and other Admin accounts cannot be deleted. |
| `GET` | `/api/admin/logs` | List prediction logs with user and feedback information. |
| `DELETE` | `/api/admin/logs/{logId}` | Delete a prediction-history entry. |
| `GET` | `/api/admin/stats` | Return user, prediction, label, and feedback aggregates. |

## Swagger/OpenAPI

Springdoc API docs and Swagger UI are disabled by default (`SWAGGER_ENABLED=false`). Set `SWAGGER_ENABLED=true` to enable the documentation routes during local development. When enabled, the Swagger routes are permitted without JWT by the current Spring security configuration; do not enable them unintentionally in a production deployment.
