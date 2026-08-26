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

// スマホやモニタへ ViewerState か MonitorState で State を渡す
func getViewerState(c *gin.Context, db *gorm.DB, joinURL string) {
	// view をクエリから取得
	view := c.DefaultQuery("view", "phone") // デフォルトで phone に設定

	var es EventState
	if ok := readEventState(c, db, &es); !ok {
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

	vs := buildViewerState(es, q, int(askedCount))

	switch view {
	case "phone":
		c.JSON(http.StatusOK, vs)
	case "monitor":
		c.JSON(http.StatusOK, MonitorState{ViewerState: vs, JoinURL: joinURL})
	default:
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "view には正しいデバイス（phone, monitor）を指定してください")
	}
}

// State を スマホやモニタ用へ変換
func buildViewerState(es EventState, q *question.Question, askedCount int) ViewerState {
	vs := ViewerState{
		Phase:      es.Phase,
		ServerTime: time.Now(),
		AskedCount: askedCount,
	}

	// waiting か finished の時はここで返す
	// TimeLimitSec などはポインタであるから nil となるが、 JSON への変換で null になる
	// Answer もポインタのため、 nil 扱い -> nullとなる
	if es.Phase == "waiting" || es.Phase == "finished" {
		return vs
	}

	// question か answer の時の処理

	// 問題文を、表示する部分まで切り取る
	// revealedSegments は DB の値なので、そのまま信用しない
	// q == nil の場合、何もなくエラーになるため、これじゃない if で囲む
	if q != nil {
		revealed := es.RevealedSegments
		if revealed < 0 {
			revealed = 0
		}
		if revealed > len(q.TextSegments) {
			revealed = len(q.TextSegments)
		}
		// そのままスライスを代入すると、 revealed が 0 のとき nil になる
		vseg := make([]string, revealed) // make で, revealed が 0　でも [] として扱える
		copy(vseg, q.TextSegments[:revealed])

		// question から、 正答に関する項目を除く
		vq := question.ViewerQuestion{
			Number:       q.Number,
			Type:         q.Type,
			ImageURL:     q.ImageURL,
			Choices:      q.Choices,
			TextSegments: vseg,
		}

		tls := es.TimeLimitSec // ポインタに代入するには、変数のポインタとしてしか渡せない
		vs.TimeLimitSec = &tls
		vs.QuestionStartedAt = es.QuestionStartedAt
		vs.Question = &vq // vq は実体で宣言したので、& でポインタを渡す

		// question の時は、 answer はゼロ値（nil -> null）で返す
		if es.Phase == "question" {
			return vs
		}

		// answer の時は、 Answer に正答、解説を入れる
		vs.Answer = &question.Answer{
			CorrectChoiceID: q.CorrectChoiceID,
			Explanation:     q.Explanation,
		}
	}
	return vs
}

// event_states テーブルから読み込む
//
// es に状態を書き込む
func readEventState(c *gin.Context, db *gorm.DB, es *EventState) bool {
	// まず、event_states テーブル側に問題がないかをチェック
	if err := db.First(es, 1).Error; err != nil { // if 分の中でerr による分岐が入るため、一度err に入れる
		if errors.Is(err, gorm.ErrRecordNotFound) {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"event_states(id=1)がありません。mise run db:reset を実行して下さい")
			return false
		}
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "event_statesを読み込めませんでした")
		return false
	}
	return true
}
