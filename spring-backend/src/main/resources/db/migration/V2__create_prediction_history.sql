CREATE TABLE prediction_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  news TEXT NOT NULL CHECK (char_length(news) BETWEEN 20 AND 50000),
  prediction VARCHAR(10) NOT NULL CHECK (prediction IN ('REAL', 'FAKE')),
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  model_version VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_prediction_history_user_created ON prediction_history (user_id, created_at DESC);
CREATE INDEX idx_prediction_history_prediction ON prediction_history (prediction);
