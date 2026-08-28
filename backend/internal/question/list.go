// GET /api/admin/questions(問題一覧)のハンドラ(§4.1)。
//
// 一覧は「どの問題を出すか選ぶ」ための画面で使う。
// 正答や選択肢は不要なので、DBの Question をそのまま返さず一覧専用の形に詰め替える。
package question

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

// listItem は §4.1 の一覧1件分。
//
// DBの Question とは別物なので使い回さない:
// textSegments(配列) → textPreview(結合した文字列)、imageUrl → hasImage(有無) と形が変わり、
// choices / correctChoiceId / explanation は含めない。
type listItem struct {
	ID          uint   `json:"id"`
	Number      int    `json:"number"`
	Type        string `json:"type"`
	Difficulty  string `json:"difficulty"`
	TextPreview string `json:"textPreview"`
	HasImage    bool   `json:"hasImage"`
	Asked       bool   `json:"asked"`
}

// listQuestions は全問題を一覧の形で返す。
func listQuestions(c *gin.Context, db *gorm.DB) {
	var questions []Question
	if err := db.Order("number").Find(&questions).Error; err != nil {
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "問題データを読み込めませんでした")
		return
	}

	// 0件のときに JSON が "questions": null にならないよう、必ず長さ0のスライスで初期化する。
	// フロントは questions.map() を呼ぶので、null が来ると画面が壊れる。
	items := make([]listItem, 0, len(questions))
	for _, q := range questions {
		items = append(items, toListItem(q))
	}

	c.JSON(http.StatusOK, gin.H{"questions": items})
}

// toListItem は DB の Question を一覧1件分に詰め替える。
func toListItem(q Question) listItem {
	hasImage := q.ImageURL != nil
	if !hasImage {
		for _, choice := range q.Choices {
			if choice.ImageURL != nil {
				hasImage = true
				break
			}
		}
	}

	return listItem{
		ID:          q.ID,
		Number:      q.Number,
		Type:        q.Type,
		Difficulty:  q.Difficulty,
		TextPreview: strings.Join(q.TextSegments, ""),
		HasImage:    hasImage,
		Asked:       q.Asked,
	}
}
