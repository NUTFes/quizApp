package question

import (
	"strings"
	"testing"
)

// テスト用の正しい4択問題を作るヘルパ(架空の問題のみ使用)
func validFourChoice(sourceRow, number int) importQuestion {
	return importQuestion{
		SourceRow:    sourceRow,
		Number:       number,
		Type:         "four_choice",
		Difficulty:   "normal",
		TextSegments: []string{"日本一高い山は", "どれ?"},
		Choices: []Choice{
			{ID: "A", Text: "富士山"},
			{ID: "B", Text: "北岳"},
			{ID: "C", Text: "穂高岳"},
			{ID: "D", Text: "槍ヶ岳"},
		},
		CorrectChoiceID: "A",
	}
}

func validTwoChoice(sourceRow, number int) importQuestion {
	return importQuestion{
		SourceRow:    sourceRow,
		Number:       number,
		Type:         "two_choice",
		Difficulty:   "easy",
		TextSegments: []string{"地球は青い"},
		Choices: []Choice{
			{ID: "A", Text: "○"},
			{ID: "B", Text: "×"},
		},
		CorrectChoiceID: "A",
	}
}

func validArunashi(sourceRow, number int) importQuestion {
	return importQuestion{
		SourceRow:    sourceRow,
		Number:       number,
		Type:         "arunashi",
		Difficulty:   "hard",
		TextSegments: []string{"次のグループの共通点は?"},
		Choices: []Choice{
			{ID: "A", Text: "ある:いか/くも/あり"},
			{ID: "B", Text: "ない:アルパカ/くま/マントヒヒ"},
		},
		CorrectChoiceID: "A",
	}
}

// reason に部分文字列 want を含む issue が sourceRow 行に対して出ているか
func hasIssue(issues []RowIssue, sourceRow int, want string) bool {
	for _, i := range issues {
		if i.SourceRow == sourceRow && strings.Contains(i.Reason, want) {
			return true
		}
	}
	return false
}

func TestValidateImport_正常系はエラーなし(t *testing.T) {
	issues := validateImport([]importQuestion{
		validFourChoice(2, 1),
		validTwoChoice(3, 2),
		validArunashi(4, 3),
	})
	if len(issues) != 0 {
		t.Fatalf("エラーは0件のはずが %d 件: %+v", len(issues), issues)
	}
}

// 早押しは選択肢なし・正答なし・問題文は / で2つ以上に区切る(§1 / §3.5.3)
func validHayaoshi(sourceRow, number int) importQuestion {
	expl := "架空の答え"
	return importQuestion{
		SourceRow:    sourceRow,
		Number:       number,
		Type:         "hayaoshi",
		Difficulty:   "hard",
		TextSegments: []string{"架空の国ゾルグの", "首都はどこ?"},
		Choices:      []Choice{}, // 選択肢なし(判定は人力)
		Explanation:  &expl,      // 答えはここに書くとモニタの正解欄に出る
	}
}

func TestValidateImport_hayaoshiは通る(t *testing.T) {
	issues := validateImport([]importQuestion{validHayaoshi(5, 1)})
	if len(issues) != 0 {
		t.Fatalf("エラーは0件のはずが %d 件: %+v", len(issues), issues)
	}
}

// 早押しは「途中まで読んで押す」ので、区切りが無いと成立しない
func TestValidateImport_hayaoshiの問題文に区切りが無い(t *testing.T) {
	q := validHayaoshi(5, 1)
	q.TextSegments = []string{"区切りのない問題文"}
	issues := validateImport([]importQuestion{q})
	if !hasIssue(issues, 5, "/ で2つ以上に区切って") {
		t.Fatalf("区切り不足のエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_hayaoshiに選択肢が書かれている(t *testing.T) {
	q := validHayaoshi(5, 1)
	q.Choices = []Choice{{ID: "A", Text: "あ"}, {ID: "B", Text: "い"}}
	issues := validateImport([]importQuestion{q})
	if !hasIssue(issues, 5, "早押しに選択肢は書けません") {
		t.Fatalf("選択肢のエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_hayaoshiにcorrectが書かれている(t *testing.T) {
	q := validHayaoshi(5, 1)
	q.CorrectChoiceID = "A"
	issues := validateImport([]importQuestion{q})
	if !hasIssue(issues, 5, "早押しに correct は書けません") {
		t.Fatalf("correct のエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_correctChoiceIdが選択肢に無い(t *testing.T) {
	q := validFourChoice(5, 1)
	q.CorrectChoiceID = "E"
	issues := validateImport([]importQuestion{q})
	if !hasIssue(issues, 5, "correctChoiceId 'E'") {
		t.Fatalf("correctChoiceId のエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_choices数がtypeと不一致(t *testing.T) {
	q := validTwoChoice(9, 1)
	q.Choices = validFourChoice(9, 1).Choices // 2択なのに4件
	issues := validateImport([]importQuestion{q})
	if !hasIssue(issues, 9, "choices が4件") {
		t.Fatalf("choices件数のエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_numberの重複(t *testing.T) {
	issues := validateImport([]importQuestion{
		validFourChoice(2, 7),
		validTwoChoice(3, 7), // number 重複
	})
	if !hasIssue(issues, 3, "重複") {
		t.Fatalf("number重複のエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_arunashiの書式違反(t *testing.T) {
	q := validArunashi(6, 1)
	q.Choices[0].Text = "いか/くも/あり" // コロンが無い
	issues := validateImport([]importQuestion{q})
	if !hasIssue(issues, 6, "書式が不正") {
		t.Fatalf("arunashi書式のエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_difficultyは内部表現のみ許可(t *testing.T) {
	q := validFourChoice(4, 1)
	q.Difficulty = "難しい" // 日本語→英語変換はGASの責務。サーバーは英語のみ受ける
	issues := validateImport([]importQuestion{q})
	if !hasIssue(issues, 4, "difficulty") {
		t.Fatalf("difficultyのエラーが出ていない: %+v", issues)
	}
}

func TestValidateImport_複数問のエラーが全件まとまる(t *testing.T) {
	q1 := validFourChoice(2, 1)
	q1.CorrectChoiceID = "E"
	q2 := validTwoChoice(3, 2)
	q2.Difficulty = "普通"
	issues := validateImport([]importQuestion{q1, q2})
	if !hasIssue(issues, 2, "correctChoiceId") || !hasIssue(issues, 3, "difficulty") {
		t.Fatalf("2問分のエラーがまとまっていない: %+v", issues)
	}
}

func TestIsValidArunashiChoice(t *testing.T) {
	cases := []struct {
		text string
		want bool
	}{
		{"ある:いか/くも/あり", true},
		{"ない:アルパカ", true},   // 項目1個でもOK
		{"いか/くも/あり", false}, // コロンが無い
		{":いか/くも", false},   // ラベルが空
		{"ある:", false},      // 項目が無い
		{"ある: / / ", false}, // 項目が全部空
	}
	for _, c := range cases {
		if got := isValidArunashiChoice(c.text); got != c.want {
			t.Errorf("isValidArunashiChoice(%q) = %v, want %v", c.text, got, c.want)
		}
	}
}

// type が不正な行でも、その行の共通項目(number / difficulty / textSegments)の
// エラーが同時に返ることを確かめる。
// ここが崩れると「1件直して再投入」を運営メンバーに繰り返させることになる(§3.5.3)。
func TestValidateImport_typeが不正でも共通項目のエラーが同時に出る(t *testing.T) {
	q := validFourChoice(2, 1)
	broken := validFourChoice(3, 1) // number を 1 のまま重複させる
	broken.Type = "yonntaku"        // type は不正
	broken.Difficulty = "ふつう"       // 日本語は不可(変換はGASの責務)
	broken.TextSegments = nil       // 問題文なし

	issues := validateImport([]importQuestion{q, broken})

	for _, want := range []string{"type 'yonntaku' は不正です", "number 1 が2行目と重複",
		"difficulty 'ふつう' は不正です", "textSegments が空です"} {
		if !hasIssue(issues, 3, want) {
			t.Errorf("3行目に %q が出ていない: %+v", want, issues)
		}
	}
}

// hayaoshi の行でも同じ。型固有のエラーだけで打ち切らない。
func TestValidateImport_hayaoshiでも共通項目のエラーが同時に出る(t *testing.T) {
	q := validHayaoshi(2, 5)
	q.Choices = []Choice{{ID: "A", Text: "あ"}}
	q.Difficulty = "むずかしい"

	issues := validateImport([]importQuestion{q})

	for _, want := range []string{"早押しに選択肢は書けません", "difficulty 'むずかしい' は不正です"} {
		if !hasIssue(issues, 2, want) {
			t.Errorf("2行目に %q が出ていない: %+v", want, issues)
		}
	}
}
