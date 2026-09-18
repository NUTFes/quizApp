UPDATE event_states
SET time_limit_sec = 30
WHERE time_limit_sec IS NULL;

ALTER TABLE event_states
ALTER COLUMN time_limit_sec SET NOT NULL;
