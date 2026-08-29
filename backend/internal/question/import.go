// 問題データ投入(PUT /api/admin/questions)のリクエスト型とバリデーション。
//
// GASの責務は「列 → JSON の変換」だけで、内容の妥当性はここで見る(§3.5)。
// バリデーションエラーは全件まとめて details で返す(§3.5.3)。
package question

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// importRequest は §3.5.1 のリクエスト全体。
type importRequest struct {
	Questions []importQuestion `json:"questions"`
}

// importQuestion は §3.5.1 の1問分。
// DBの Question とは別物(sourceRow を持ち、id を持たない)なので使い回さない。
type importQuestion struct {
	SourceRow       int      `json:"sourceRow"`
	Number          int      `json:"number"`
	Type            string   `json:"type"`
	Difficulty      string   `json:"difficulty"`
	TextSegments    []string `json:"textSegments"`
	ImageURL        *string  `json:"imageUrl"`
	Choices         []Choice `json:"choices"`
	CorrectChoiceID string   `json:"correctChoiceId"`
	Explanation     *string  `json:"explanation"`
}

// RowIssue は details / warnings の1件分(§3.5.2 / §3.5.3)。
// reason は運営メンバーが読んで直せる日本語にする。
type RowIssue struct {
	SourceRow int    `json:"sourceRow"`
	Reason    string `json:"reason"`
}

// 型ごとの choices の要素数(§1: arunashiは2個・形はtwo_choiceと同じ)
var choiceCountByType = map[string]int{
	"four_choice": 4,
	"two_choice":  2,
	"arunashi":    2,
	"hayaoshi":    0, // 選択肢なし・判定は人力(§1)
}

var validDifficulties = map[string]bool{
	"easy": true, "normal": true, "hard": true,
}

// validateImport は全問をまとめて検証し、見つかった問題を全部返す。
// 1件ずつ直して再送、を運営メンバーにさせないため、途中で打ち切らない(§3.5.3)。
func validateImport(qs []importQuestion) []RowIssue {
	issues := []RowIssue{}

	// number の重複チェック用(number → 最初に現れた sourceRow)
	seenNumbers := map[int]int{}

	for _, q := range qs {
		row := q.SourceRow

		// --- type に依存しない項目を先に見る ---
		// type が不正な行でも、同じ行の number 重複や difficulty の誤りを
		// 一度に返せるようにするため、continue する前にここで済ませる(§3.5.3)。

		// --- number ---
		if q.Number < 1 {
			issues = append(issues, RowIssue{row, fmt.Sprintf("number %d が不正です(1以上の整数)", q.Number)})
		} else if firstRow, dup := seenNumbers[q.Number]; dup {
			issues = append(issues, RowIssue{row,
				fmt.Sprintf("number %d が%d行目と重複しています", q.Number, firstRow)})
		} else {
			seenNumbers[q.Number] = row
		}

		// --- difficulty(内部表現。日本語→英語の変換はGASの責務なのでここでは英語のみ許可) ---
		if !validDifficulties[q.Difficulty] {
			issues = append(issues, RowIssue{row,
				fmt.Sprintf("difficulty '%s' は不正です(easy / normal / hard のいずれか)", q.Difficulty)})
		}

		// --- textSegments(GASが空要素を除去して送る前提だが、契約なので二重に確認する) ---
		if len(q.TextSegments) == 0 {
			issues = append(issues, RowIssue{row, "textSegments が空です(問題文がありません)"})
		} else {
			for _, seg := range q.TextSegments {
				if strings.TrimSpace(seg) == "" {
					issues = append(issues, RowIssue{row, "textSegments に空の要素があります"})
					break
				}
			}
		}

		// --- type(ここから先は type が確定しないと判定できない) ---
		wantChoices, ok := choiceCountByType[q.Type]
		if !ok {
			issues = append(issues, RowIssue{row,
				fmt.Sprintf("type '%s' は不正です(four_choice / two_choice / arunashi / hayaoshi のいずれか)", q.Type)})
			continue // choices の件数・書式は型が決まらないと意味を持たないため次の問題へ
		}

		// --- 早押しは他の型と形が違うので、専用に見る(§3.5.3) ---
		// 選択肢なし・正答なし・問題文は必ず途中で区切る、の3点。
		if q.Type == "hayaoshi" {
			// 「途中まで読んで押す」ものなので、区切りが無いと早押しにならない。
			// GASが / で split した結果が textSegments なので、2要素以上=区切りがある。
			if len(q.TextSegments) > 0 && len(q.TextSegments) < 2 {
				issues = append(issues, RowIssue{row,
					"早押しの問題文は / で2つ以上に区切ってください(途中で押せる場所が無くなるため)"})
			}
			if len(q.Choices) != 0 {
				issues = append(issues, RowIssue{row,
					fmt.Sprintf("早押しに選択肢は書けません(choices が%d件あります。判定は人力のため空にしてください)", len(q.Choices))})
			}
			// 正解の選択肢が存在しないので correctChoiceId は持てない。
			// 答えを画面に出したい場合は explanation に書く(モニタの正解欄に出る)。
			if q.CorrectChoiceID != "" {
				issues = append(issues, RowIssue{row,
					fmt.Sprintf("早押しに correct は書けません('%s' が入っています。答えは explanation 列に書くとモニタに出ます)", q.CorrectChoiceID)})
			}
			continue
		}

		// --- choices の件数と中身 ---
		if len(q.Choices) != wantChoices {
			issues = append(issues, RowIssue{row,
				fmt.Sprintf("type が %s ですが choices が%d件あります(%d件にしてください)", q.Type, len(q.Choices), wantChoices)})
		} else {
			// id は A から順(2択・あるなしは A,B / 4択は A,B,C,D)(§3.5.1)
			expectedIDs := []string{"A", "B", "C", "D"}[:wantChoices]
			for i, ch := range q.Choices {
				if ch.ID != expectedIDs[i] {
					issues = append(issues, RowIssue{row,
						fmt.Sprintf("choices[%d] の id '%s' が不正です('%s' にしてください)", i, ch.ID, expectedIDs[i])})
				}
				if strings.TrimSpace(ch.Text) == "" {
					issues = append(issues, RowIssue{row,
						fmt.Sprintf("選択肢%sの本文が空です", expectedIDs[i])})
				}
				// arunashi は「ラベル:項目/項目」書式(§3.5.6)
				if q.Type == "arunashi" && !isValidArunashiChoice(ch.Text) {
					issues = append(issues, RowIssue{row,
						fmt.Sprintf("選択肢%sの書式が不正です(『ラベル:項目/項目』の形式。例: ある:いか/くも/あり)", expectedIDs[i])})
				}
			}
		}

		// --- correctChoiceId が choices に存在するか ---
		found := false
		for _, ch := range q.Choices {
			if ch.ID == q.CorrectChoiceID {
				found = true
				break
			}
		}
		if !found {
			issues = append(issues, RowIssue{row,
				fmt.Sprintf("correctChoiceId '%s' が choices に存在しません", q.CorrectChoiceID)})
		}
	}

	return issues
}

// isValidArunashiChoice は「ラベル:項目/項目」書式かを検証する。
// ラベルと項目群の区切りはコロン、項目どうしの区切りはスラッシュ(§3.5.6)。
func isValidArunashiChoice(text string) bool {
	label, items, ok := strings.Cut(text, ":")
	if !ok || strings.TrimSpace(label) == "" {
		return false
	}
	for _, item := range strings.Split(items, "/") {
		if strings.TrimSpace(item) != "" {
			return true // 空でない項目が1つでもあればOK
		}
	}
	return false
}

// collectImageWarnings は画像の実体チェックを行う(§6)。
// 参照先ファイルがサーバーに無ければ warnings に入れる。取り込み自体は止めない(§3.5.2)。
func collectImageWarnings(qs []importQuestion, staticDir string) []RowIssue {
	warnings := []RowIssue{} // 問題なければ [] を返す(null にしない)

	for _, q := range qs {
		if q.ImageURL != nil && *q.ImageURL != "" && !imageExists(staticDir, *q.ImageURL) {
			warnings = append(warnings, RowIssue{q.SourceRow,
				fmt.Sprintf("画像 %s がサーバーに存在しません", *q.ImageURL)})
		}
		for _, ch := range q.Choices {
			if ch.ImageURL != nil && *ch.ImageURL != "" && !imageExists(staticDir, *ch.ImageURL) {
				warnings = append(warnings, RowIssue{q.SourceRow,
					fmt.Sprintf("画像 %s がサーバーに存在しません", *ch.ImageURL)})
			}
		}
	}
	return warnings
}

// imageExists は /images/xxx.png のようなURLパスの実体が staticDir 配下にあるか調べる。
func imageExists(staticDir, urlPath string) bool {
	// 先頭に / を補ってから Clean することで ../ による staticDir 外への参照を防ぐ
	cleaned := filepath.Clean("/" + urlPath)
	info, err := os.Stat(filepath.Join(staticDir, cleaned))
	return err == nil && !info.IsDir()
}
