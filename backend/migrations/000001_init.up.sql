CREATE TABLE questions (
	id                  SERIAL PRIMARY KEY,
	number              INTEGER NOT NULL,
	type                TEXT NOT NULL,
	difficulty          TEXT NOT NULL,
	text_segments       JSONB NOT NULL DEFAULT '[]',
	image_url           TEXT,
	choices             JSONB NOT NULL DEFAULT '[]',
	correct_choice_id   TEXT,
	explanation         TEXT,
    asked               BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE event_states (
	id                  SERIAL PRIMARY KEY,
	phase               TEXT NOT NULL,
	current_question_id INTEGER NOT NULL,
	time_limit_sec      INTEGER NOT NULL,
	question_started_at TIMESTAMPTZ,
	revealed_segments   INTEGER NOT NULL
);