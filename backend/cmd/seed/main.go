// 開発用のサンプル問題を投入するコマンド。
// 実行: mise run db:seed(= docker compose exec backend go run ./cmd/seed)
//
// ⚠️ このリポジトリは public。本番の問題データを絶対に書かないこと。
// コミットした時点で参加者に正答が見える。ここは全部架空の問題にする。
package main

import (
	"fmt"
	"log"
	"os"
	"strings"

	"gorm.io/gorm"

	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"github.com/naoto-anzai/quizApp/backend/internal/question"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("seed failed: %v", err)
	}
}

func run() error {
	if err := guardLocal(); err != nil {
		return err
	}

	db, err := platform.NewDB()
	if err != nil {
		return err
	}

	samples := samples()

	// 途中で失敗したら全部戻す。中途半端なデータが残るのが一番厄介。
	err = db.Transaction(func(tx *gorm.DB) error {
		if err := reset(tx); err != nil {
			return err
		}
		return tx.Create(&samples).Error
	})
	if err != nil {
		return err
	}

	log.Printf("seeded %d questions", len(samples))
	return nil
}

// 何度実行しても同じ状態になるように既存データを消す。
//
// ⚠️ TRUNCATE questions CASCADE を使わないこと。
// event_states.current_question_id が questions を参照しているため、
// CASCADE が event_states まで空にしてしまい、
// migration が入れた singleton 行(id=1)が消えて state API が壊れる。
// DELETE なら ON DELETE SET NULL が効くだけで済む。
func reset(tx *gorm.DB) error {
	if err := tx.Exec(`DELETE FROM questions`).Error; err != nil {
		return fmt.Errorf("delete questions: %w", err)
	}
	// id を 1 から振り直す(seed の結果を毎回同じにするため)。
	// シーケンス名を直書きすると、将来 GENERATED ... AS IDENTITY に変えたときに実体と食い違う。pg_get_serial_sequence でカラムから引けば、どちらでも動く。
	// 第3引数 false は「次に払い出す値がこの値になる」という意味(is_called=false)。
	if err := tx.Exec(
		`SELECT setval(pg_get_serial_sequence('questions', 'id'), 1, false)`,
	).Error; err != nil {
		return fmt.Errorf("restart sequence: %w", err)
	}
	// 出題中の問題を消したので、進行状態も待機に戻す。
	// これを忘れると phase=question のまま current_question_id だけ NULL になる。
	// time_limit_sec も migration の既定値(30)に戻す。
	// 前の問題で管理者が制限時間を変更していると、seed 後もその値が残ってしまうため。
	if err := tx.Exec(`
		UPDATE event_states
		   SET phase = 'waiting',
		       current_question_id = NULL,
		       question_started_at = NULL,
		       revealed_segments = 0,
		       time_limit_sec = 30
		 WHERE id = 1`).Error; err != nil {
		return fmt.Errorf("reset event_states: %w", err)
	}
	return nil
}

// 本番DBへの誤爆ガード。compose 内では @db: に解決される。
func guardLocal() error {
	url := os.Getenv("DATABASE_URL")
	if !strings.Contains(url, "@db:") && !strings.Contains(url, "@localhost:") {
		return fmt.Errorf("refusing to seed: DATABASE_URL does not look like a local database")
	}
	return nil
}

func ptr[T any](v T) *T { return &v }

func samples() []question.Question {
	return []question.Question{
		// --- four_choice(解説あり)。textSegments を複数にして分割表示も確認できるようにする ---
		{
			Number:     1,
			Type:       "four_choice",
			Difficulty: "normal",
			TextSegments: []string{
				"架空の惑星ゾルグに",
				"確認されている衛星の数は?",
			},
			Choices: []question.Choice{
				{ID: "A", Text: "1つ"},
				{ID: "B", Text: "2つ"},
				{ID: "C", Text: "3つ"},
				{ID: "D", Text: "4つ"},
			},
			CorrectChoiceID: ptr("C"),
			Explanation:     ptr("第一衛星から第三衛星までが確認されている、という設定。"),
		},

		// --- four_choice(解説なし)。textSegments 1要素のパターン ---
		{
			Number:       2,
			Type:         "four_choice",
			Difficulty:   "easy",
			TextSegments: []string{"サンプル王国の首都はどれ?"},
			Choices: []question.Choice{
				{ID: "A", Text: "アルファ市"},
				{ID: "B", Text: "ベータ市"},
				{ID: "C", Text: "ガンマ市"},
				{ID: "D", Text: "デルタ市"},
			},
			CorrectChoiceID: ptr("B"),
			Explanation:     nil, // 解説なし
		},

		// --- two_choice(○×形式・解説あり)。仕様どおり text は「○」「×」 ---
		{
			Number:       3,
			Type:         "two_choice",
			Difficulty:   "easy",
			TextSegments: []string{"架空の生き物ミミナガトカゲは卵生である。"},
			Choices: []question.Choice{
				{ID: "A", Text: "○"},
				{ID: "B", Text: "×"},
			},
			CorrectChoiceID: ptr("A"),
			Explanation:     ptr("設定上は卵生。左右2択の表示確認用。"),
		},

		// --- two_choice(解説なし) ---
		{
			Number:       4,
			Type:         "two_choice",
			Difficulty:   "normal",
			TextSegments: []string{"テスト用の数字「7」は偶数である。"},
			Choices: []question.Choice{
				{ID: "A", Text: "○"},
				{ID: "B", Text: "×"},
			},
			CorrectChoiceID: ptr("B"),
			Explanation:     nil,
		},

		// --- arunashi ---
		// choices の text は API仕様書 §3.5.6 の書式「ラベル:項目/項目/項目」に従う。
		// ラベルと項目群はコロン、項目どうしはスラッシュ。フロントはこの書式で分解する。
		{
			Number:       5,
			Type:         "arunashi",
			Difficulty:   "hard",
			TextSegments: []string{"「ある」の側に共通するものは何?"},
			Choices: []question.Choice{
				{ID: "A", Text: "ある:いか/くも/あり"},
				{ID: "B", Text: "ない:アルパカ/くま/マントヒヒ"},
			},
			CorrectChoiceID: ptr("A"),
			Explanation:     ptr("「ある」側は前に「か」を付けると別の語になる(いか→かいか…)。表示確認用のダミー解説。"),
		},

		// --- hayaoshi ---
		// v1 未実装(API仕様書 §3.5.3 で投入時に弾く)。
		// 入れるかどうかは issue で要確認 → 下記「5. issueに確認すべきこと」参照。
		// {
		// 	Number:          6,
		// 	Type:            "hayaoshi",
		// 	Difficulty:      "hard",
		// 	TextSegments:    []string{"架空の川「ゾルグ川」の", "全長はおよそ何km?"},
		// 	Choices:         []question.Choice{}, // 空配列(NULLではない)
		// 	CorrectChoiceID: nil,
		// 	Explanation:     nil,
		// },
	}
}
