-- 動作確認用の仮データ。本番投入用ではない。
-- PUT /api/admin/questions が未実装のあいだ、進行制御APIを試すために使う。
--
-- 実行: CT で
--   docker compose -f docker-compose.prod.yml --env-file .env.prod \
--     exec -T db psql -U quiz -d quiz < infra/seed-questions.sql

BEGIN;

DELETE FROM questions;
ALTER SEQUENCE questions_id_seq RESTART WITH 1;

INSERT INTO questions (number, type, difficulty, text_segments, image_url, choices, correct_choice_id, explanation, asked) VALUES
(1, 'choice', 'easy',
 '["長岡技術科学大学が開学したのは", "西暦何年でしょう?"]'::jsonb,
 NULL,
 '[{"id":"a","text":"1976年","imageUrl":null},{"id":"b","text":"1980年","imageUrl":null},{"id":"c","text":"1985年","imageUrl":null},{"id":"d","text":"1990年","imageUrl":null}]'::jsonb,
 'a', '1976年に開学しました。', false),

(2, 'choice', 'normal',
 '["技大祭のマスコットキャラクターの", "名前は次のうちどれ?"]'::jsonb,
 NULL,
 '[{"id":"a","text":"ぎだいくん","imageUrl":null},{"id":"b","text":"ながおかくん","imageUrl":null},{"id":"c","text":"わたしはしらない","imageUrl":null}]'::jsonb,
 'a', '動作確認用のダミー問題です。', false),

(3, 'choice', 'hard',
 '["3つに分かれた問題文の", "1つ目です。ここまでが第2segment。", "これが最後のsegmentです。"]'::jsonb,
 NULL,
 '[{"id":"a","text":"選択肢A","imageUrl":null},{"id":"b","text":"選択肢B","imageUrl":null}]'::jsonb,
 'b', 'advance-text を3回押すと全部出ます。', false);

UPDATE event_states SET phase = 'waiting', current_question_id = NULL,
  question_started_at = NULL, revealed_segments = 0 WHERE id = 1;

COMMIT;

SELECT id, number, jsonb_array_length(text_segments) AS segments,
       jsonb_array_length(choices) AS choices, correct_choice_id
FROM questions ORDER BY number;
