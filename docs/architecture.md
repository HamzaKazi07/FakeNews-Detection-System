# Architecture

The target production path is **React/Vite → Spring Boot → PostgreSQL**. Prediction requests additionally follow **Spring Boot → internal FastAPI ML service → TF-IDF + Logistic Regression**. The React client must never call the ML service directly.

The checked-in Flask application remains a legacy development implementation until the Spring API has feature parity. It is not part of the Docker Compose target path.

## Request flow

1. A user logs in with Spring Boot; BCrypt verifies the password and Spring Security returns a signed JWT.
2. React sends the JWT to a protected Spring endpoint.
3. Spring validates authorization and request size, sends text to the internal ML service with `X-ML-Service-Token`, then persists the returned result in PostgreSQL.
4. URL and image routes must apply SSRF/upload controls before step 3. Ownership is enforced in the service layer for history and feedback.

The classifier recognizes patterns in its training data; it is not an independent fact-checking system. OCR and article extraction may be inaccurate.
