# API contract (target)

All protected endpoints require `Authorization: Bearer <JWT>`. The target API exposes `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/predict`, `/api/predict-url`, `/api/predict-image`, `/api/history`, `DELETE /api/history/{id}`, `/api/feedback`, `/api/dashboard/stats`, `/api/live-news`, `/api/admin/*`, and `/api/health`.

`POST /api/predict` accepts `{ "text": "..." }` (20–50,000 characters) and returns a history id, `REAL`/`FAKE`, confidence in 0–1 form, important terms, and model version. Full endpoint schemas are exposed by Springdoc at `/swagger-ui.html` once controller migration is complete.
