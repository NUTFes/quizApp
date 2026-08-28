-- 動作確認用の仮データ。本番投入用ではない。
-- PUT /api/admin/questions が未実装のあいだ、進行制御APIと各画面を試すために使う。
--
-- 中身は backend/cmd/seed/main.go(#81 が追加した開発用シーダー)と同じ問題。
-- 本番イメージは alpine で Go が入っていないため go run できない。そのぶんを SQL で肩代わりする。
-- ★ 内容を変えるときは cmd/seed/main.go と揃えること。
--
-- 前提: 先にマイグレーションが通っていること。
--   docker compose -f docker-compose.prod.yml --env-file .env.prod \
--     exec -T backend sh -c 'migrate -path /app/migrations -database "$DATABASE_URL" up'
--
-- 実行:
--   docker compose -f docker-compose.prod.yml --env-file .env.prod \
--     exec -T db psql -U quiz -d quiz < infra/seed-questions.sql

BEGIN;

-- ⚠️ TRUNCATE ... CASCADE は使わないこと。
--   event_states.current_question_id が questions を参照しているため、
--   CASCADE が event_states の singleton 行(id=1)まで消して state API が壊れる。
--   DELETE なら ON DELETE SET NULL が効くだけで済む。
DELETE FROM questions;
SELECT setval(pg_get_serial_sequence('questions', 'id'), 1, false);

INSERT INTO questions (number, type, difficulty, text_segments, image_url, choices, correct_choice_id, explanation, asked) VALUES

-- four_choice(解説あり)。textSegments を複数にして advance-text の分割表示を確認できる
(1, 'four_choice', 'normal',
 '["架空の惑星ゾルグに", "確認されている衛星の数は?"]'::jsonb,
 NULL,
 '[{"id":"A","text":"1つ","imageUrl":null},{"id":"B","text":"2つ","imageUrl":null},{"id":"C","text":"3つ","imageUrl":null},{"id":"D","text":"4つ","imageUrl":null}]'::jsonb,
 'C', '第一衛星から第三衛星までが確認されている、という設定。', false),

-- four_choice(解説なし)。textSegments 1要素のパターン
(2, 'four_choice', 'easy',
 '["サンプル王国の首都はどれ?"]'::jsonb,
 NULL,
 '[{"id":"A","text":"アルファ市","imageUrl":null},{"id":"B","text":"ベータ市","imageUrl":null},{"id":"C","text":"ガンマ市","imageUrl":null},{"id":"D","text":"デルタ市","imageUrl":null}]'::jsonb,
 'B', NULL, false),

-- two_choice(○×形式・解説あり)。仕様どおり text は「○」「×」
(3, 'two_choice', 'easy',
 '["架空の生き物ミミナガトカゲは卵生である。"]'::jsonb,
 NULL,
 '[{"id":"A","text":"○","imageUrl":null},{"id":"B","text":"×","imageUrl":null}]'::jsonb,
 'A', '設定上は卵生。左右2択の表示確認用。', false),

-- two_choice(解説なし)
(4, 'two_choice', 'normal',
 '["テスト用の数字「7」は偶数である。"]'::jsonb,
 NULL,
 '[{"id":"A","text":"○","imageUrl":null},{"id":"B","text":"×","imageUrl":null}]'::jsonb,
 'B', NULL, false),

-- arunashi。choices の text は API仕様書 §3.5.6 の書式「ラベル:項目/項目/項目」に従う
(5, 'arunashi', 'hard',
 '["「ある」の側に共通するものは何?"]'::jsonb,
 NULL,
 '[{"id":"A","text":"ある:いか/くも/あり","imageUrl":null},{"id":"B","text":"ない:アルパカ/くま/マントヒヒ","imageUrl":null}]'::jsonb,
 'A', '「ある」側は前に「か」を付けると別の語になる(いか→かいか…)。表示確認用のダミー解説。', false);

-- 出題中の問題を消したので、進行状態も待機に戻す。
-- time_limit_sec も migration の既定値(30)に戻す(前の問題で変更されたままになるため)。
UPDATE event_states
   SET phase = 'waiting',
       current_question_id = NULL,
       question_started_at = NULL,
       revealed_segments = 0,
       time_limit_sec = 30
 WHERE id = 1;

COMMIT;

SELECT id, number, type,
       jsonb_array_length(text_segments) AS segments,
       jsonb_array_length(choices)       AS choices,
       correct_choice_id
FROM questions ORDER BY number;
