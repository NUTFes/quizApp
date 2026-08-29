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
		c.JSON(http.StatusOK, buildViewerState(snap.es, snap.q, snap.askedCount, view))
	case "monitor":
		c.JSON(http.StatusOK, MonitorState{ViewerState: buildViewerState(snap.es, snap.q, snap.askedCount, view), JoinURL: joinURL})
	default:
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST", "view には正しいデバイス（phone, monitor）を指定してください")
	}
}

// State を スマホやモニタ用へ変換
//
// view を受け取るのは早押しのため(§2.2 原則4)。
// 早押しは「モニタを見て、途中で押す」ものなので、スマホに問題文を送ると
// 手元で先に読めてしまい競技として成立しない。宛先によって中身が変わる
// 唯一の箇所なので、呼び出し側が view を必ず渡す形にしている。
func buildViewerState(es EventState, q *question.Question, askedCount int, view string) ViewerState {
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

		// 早押しのスマホには問題文を一切送らない(§2.2 原則4)。
		// スマホ側は type を見て「会場モニターをご覧ください」を出す
		// (frontend/src/features/phone/parts/QuestionLayout.tsx)。
		// フロントの assertStateContract は、ここが空でないと CRITICAL を出す。
		if q.Type == "hayaoshi" && view == "phone" {
			vseg = []string{}
		}

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
