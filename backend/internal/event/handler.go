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

// エンドポイントの登録
func RegisterRoutes(db *gorm.DB, adminToken string) platform.RegisterFunc {
	return func(r *gin.Engine) {
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.GET("/state", func(c *gin.Context) { getState(c, db) })
	}
}

// State を返す関数
func getState(c *gin.Context, db *gorm.DB) {
	var es EventState
	// es に event_states テーブルから１行目を指定して書き込む
	if err := db.First(&es, 1).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"event_states(id=1)がありません。mise run db:reset を実行して下さい")
			return
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "event_statesを読み込めませんでした")
		return
	}

	// 今表示する問題を取得する
	var q *question.Question
	if es.CurrentQuestionID != nil {
		var found question.Question
		if db.First(&found, *es.CurrentQuestionID).Error != nil {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "指定された問題が読み込めませんでした")
			return
		}
		q = &found
	}

	// 今何問目かを数える
	var askedCount int64
	if db.Model(&question.Question{}).Where("asked = ?", true).Count(&askedCount).Error != nil {
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "出題数を数えられませんでした")
		return
	}

	c.JSON(http.StatusOK, buildState(es, q, int(askedCount)))
}

// DBにある、EventState の形のものをAPIで返すState型に直す
//
// phase が waiting または finished のときは出題関係は全部 0/null にする
// 絶対にキーは消さないように、 omitempty は使わない
// 値を代入しないで、null にする
func buildState(es EventState, q *question.Question, ac int) State {
	s := State{
		Phase:      es.Phase,
		ServerTime: time.Now(),
		AskedCount: ac,
	}

	// waiting か finished の時はここで返す
	// TimelimitSec などはポインタであるから nil となるが、 JSON への変換で null になる
	if es.Phase == "waiting" || es.Phase == "finished" {
		return s
	}

	// question か answer の時の処理
	tls := es.TimeLimitSec // ポインタに代入するには、変数のポインタとしてしか渡せない
	s.TimeLimitSec = &tls
	s.QuestionStartedAt = es.QuestionStartedAt
	s.RevealedSegments = es.RevealedSegments
	s.Question = q
	if q != nil {
		// これは毎回必ず数える
		s.TotalSegments = len(q.TextSegments)
	}

	return s
}
