CREATE TABLE questions (
	id                  SERIAL PRIMARY KEY,
	number              INTEGER NOT NULL,
	type                TEXT NOT NULL,
	difficulty          TEXT NOT NULL,
	text_segments       JSONB NOT NULL DEFAULT '[]',
	image_url           TEXT,
	choices             JSONB NOT NULL DEFAULT '[]',
	correct_choice_id   TEXT,
	explanation         TEXT
)