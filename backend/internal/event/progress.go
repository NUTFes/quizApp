package event

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"github.com/naoto-anzai/quizApp/backend/internal/question"
	"gorm.io/gorm"
)

// question フェーズへ移行する関数
func showQuestion(c *gin.Context, db *gorm.DB) {
	// リクエスト を取得するためのリクエストの型を定義
	var req struct {
		QuestionID   uint `json:"questionId"`
		TimeLimitSec *int `json:"timeLimitSec"` // これは任意
	}

	// 指定したリクエストの型でリクエストが来ているかのチェック
	if c.ShouldBind(&req) != nil {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "リクエストの形が不正です")
		return
	}

	// questionId がリクエストにふくまれるか？（questionIdが含まれない場合、Go によるゼロ値代入で、 0 が入る）　０じゃないか？
	if req.QuestionID == 0 {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "questionId は必須です")
		return
	}

	// timeLimitSec が正しい範囲内で設定されているか
	timeLimitSec := 30 // timeLimitSec を省略するときは規定値 30 に設定
	if req.TimeLimitSec != nil {
		if *req.TimeLimitSec < 5 || *req.TimeLimitSec > 120 {
			platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "timeLimitSec は 5~120 で指定してください")
			return
		}
		timeLimitSec = *req.TimeLimitSec
	}

	// questionId の question が実際に存在するか
	var q *question.Question
	if err := db.First(&q, req.QuestionID).Error; err != nil { //err による分岐が必要
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusNotFound, "QUESTION_NOT_FOUND", "指定された問題が見つかりませんでした")
			return
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "問題データを読み込めませんでした") // DB が落ちている
		return
	}

	// あったら、このquestionId をes に書き込む
	var es EventState
	// まず、event_states テーブル側に問題がないかをチェック
	if err := db.First(&es, 1).Error; err != nil { // if 分の中でerr による分岐が入るため、一度err に入れる
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"event_states(id=1)がありません。mise run db:reset を実行して下さい")
			return
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "event_statesを読み込めませんでした")
		return
	}
	// テーブルへ書き込む値の整備
	now := time.Now()
	es.Phase = "question"
	es.QuestionStartedAt = &now
	es.CurrentQuestionID = &req.QuestionID
	es.TimeLimitSec = timeLimitSec
	es.RevealedSegments = 1
	// svevt_states への書き込みと questiona の asked の書き換えをトランザクションで行う
	// 片方だけエラーで止まると、不正な状態でDBが保存される可能性がある
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&es).Error; err != nil {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "event_states を更新できませんでした")
			return err
		}
		if err := tx.Model(&q).Update("asked", true).Error; err != nil {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "questions の asked を書き換えられません")
			return err
		}
		return nil
	})
	// 上のどれかのエラーになったら return
	if err != nil {
		return
	}

	// 最後の処理として、getState で行うことをそのまま行うため、そのまま呼び出す
	getState(c, db)
}
func advanceText(c *gin.Context, db *gorm.DB) {
	var es EventState
	// まず、event_states テーブル側に問題がないかをチェック
	if err := db.First(&es, 1).Error; err != nil { // if 分の中でerr による分岐が入るため、一度err に入れる
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"event_states(id=1)がありません。mise run db:reset を実行して下さい")
			return
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "event_statesを読み込めませんでした")
		return
	}

	// phase が question かどうかのチェック
	if es.Phase != "question" {
		platform.RespondError(c, http.StatusConflict, "INVALID_PHASE", "フェーズが question ではありません")
		return
	}

	// TotalSegments を上限にするために、問題を見る
	// question 側の読み込み
	var q *question.Question
	if err := db.First(&q, es.CurrentQuestionID).Error; err != nil { //err による分岐が必要
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusNotFound, "QUESTION_NOT_FOUND", "指定された問題が見つかりませんでした")
			return
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "問題データを読み込めませんでした") // DB が落ちている
		return
	}
	// 上限の取得
	TotalSegments := len(q.TextSegments)


	// RevealedSegments だけ指定して次の仕切りまで進める
	if db.Model(&es).
		Where("revealed_segments < ?", TotalSegments). // 上限に達していないときという条件
		Update("revealed_segments", gorm.Expr("revealed_segments + 1")).Error != nil {
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "event_states を更新できませんでした")
		return
	}
	getState(c, db)
}
func showAnswer(c *gin.Context)  {}
func reset(c *gin.Context)       {}
