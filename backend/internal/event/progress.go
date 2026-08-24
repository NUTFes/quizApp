package event

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"github.com/naoto-anzai/quizApp/backend/internal/question"
	"gorm.io/gorm"
)

// question フェーズへ移行する関数
func showQuestion(c *gin.Context, db *gorm.DB){
	// リクエスト を取得するためのリクエストの型を定義
	var req struct {
		QuestionId uint `json: "quesitonId"`
		TimeLimitSec *int `json: "timeLimitSec"` // これは任意
	}

	// 指定したリクエストの型でリクエストが来ているかのチェック
	if c.ShouldBind(&req) != nil {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "リクエストの形が不正です")
		return
	}

	// questionId がリクエストにふくまれるか？（questionIdが含まれない場合、Go によるゼロ値代入で、 0 が入る）　０じゃないか？
	if req.QuestionId == 0 {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "questionId は必須です")
		return
	}

	// timeLimitSec が正しい範囲内で設定されているか
	timeLimitSec := 30 // timeLimitSec を省略するときは規定値 30 に設定
	if req.TimeLimitSec != nil {
		if *req.TimeLimitSec < 5 || *req.TimeLimitSec > 120 {
			platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "timiLimitSec は 5~120 で指定してください")
			return
		}
		timeLimitSec = *req.TimeLimitSec
	}

	// questionId の question が実際に存在するか
	var q *question.Question
	if db.First(&q, req.QuestionId).Error != nil {
		platform.RespondError(c, http.StatusInternalServerError, "QUESTION_NOT_FOUND", "指定された問題が読み込めませんでした")
		return
	}

	// state テーブルの asked を書き換える

	// 最後の処理として、getState で行うことをそのまま行うため、そのまま呼び出す
	getState(c, db)
}
func advanceText(c *gin.Context){}
func showAnswer(c *gin.Context){}
func reset(c *gin.Context){}