CREATE TABLE questions (
	id                  SERIAL PRIMARY KEY,
	number              INTEGER NOT NULL UNIQUE,
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
	phase               TEXT NOT NULL DEFAULT 'waiting',
	current_question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
	time_limit_sec      INTEGER NOT NULL DEFAULT 30,
	question_started_at TIMESTAMPTZ,
	revealed_segments   INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT event_states_singleton CHECK (id = 1)
);

INSERT INTO event_states (id) VALUES (1);