// GET /api/admin/questions/:id(問題の詳細情報)のハンドラ
package question

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

func getQuestion(c *gin.Context, db *gorm.DB) {
	raw := c.Param("id") // :id の部分に来る数値をraw 変数に仮渡（まだ文字列）

	id, err := strconv.ParseUint(raw, 10, 64) // 文字列を数値（idようにuint）に変換
	if err != nil {
		// 数値以外がもともと来ていても、id に対する問題が存在しないというエラーにする
		platform.RespondError(c, http.StatusNotFound, "QUESTION_NOT_FOUND", "questionId="+raw+" は存在しません")
		return
	}

	var q Question
	// エラー内容で切り分ける
	if err := db.First(&q, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusNotFound, "QUESTION_NOT_FOUND", "questionId="+raw+" は存在しません")
			return
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "問題データを読み込めませんでした")
		return
	}
	c.JSON(http.StatusOK, q)
}
