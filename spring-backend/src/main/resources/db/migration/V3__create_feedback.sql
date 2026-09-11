CREATE TABLE feedback (
  id BIGSERIAL PRIMARY KEY,
  history_id BIGINT NOT NULL UNIQUE REFERENCES prediction_history(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value VARCHAR(3) NOT NULL CHECK (value IN ('yes', 'no')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_feedback_history ON feedback (history_id);
