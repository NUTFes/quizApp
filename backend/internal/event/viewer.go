package event

import (
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
	snap, err := loadSnapshot(db)
	if err != nil {
		respondSnapshotError(c, err)
		return
	}
	switch view {
	case "phone":
		c.JSON(http.StatusOK, buildViewerState(snap.es, snap.q, snap.askedCount))
	case "monitor":
		c.JSON(http.StatusOK, MonitorState{ViewerState: buildViewerState(snap.es, snap.q, snap.askedCount), JoinURL: joinURL})
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
		revealed := min(max(0, es.RevealedSegments), len(q.TextSegments))
		// そのままスライスを代入すると、 revealed が 0 のとき nil になる
		vseg := append([]string{}, q.TextSegments[:revealed]...) // append で, revealed が 0　でも [] として扱える

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
