// PUT /api/admin/questions(問題データの投入)のハンドラ(§3.5)。
//
// 送られてきた JSON で問題一覧を全置換する。
// サーバーがスプレッドシートを読みに行く方式ではない(シートを読むのはGASの仕事)。
package question

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

// RegisterRoutes は、エンドポイントの登録を行う。
//
// 認証は IMPORT_TOKEN / ADMIN_TOKEN のどちらでも通る(§3.5):
// GASは IMPORT_TOKEN、管理者画面の貼り付け投入は ADMIN_TOKEN を使うため。
// importToken が空(未設定)のときは RequireToken 側で除外され、ADMIN_TOKEN のみになる。
func RegisterRoutes(db *gorm.DB, adminToken string, importToken string) platform.RegisterFunc {
	return func(r *gin.Engine) {
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.GET("/questions", func(c *gin.Context) { listQuestions(c, db) })
		g.GET("/questions/:id", func(c *gin.Context) { getQuestion(c, db) })

		gImport := r.Group("/api/admin", platform.RequireToken(adminToken, importToken))
		gImport.PUT("/questions", func(c *gin.Context) { putQuestions(c, db) })
	}
}

// importResult は §3.5.2 の成功レスポンス。
// このAPIだけ state ではなく取り込み結果を返す。
type importResult struct {
	Imported   int        `json:"imported"`
	ImportedAt time.Time  `json:"importedAt"`
	Warnings   []RowIssue `json:"warnings"`
}

// putQuestions は問題一覧の全置換を行う(§3.5)。
// オールオアナッシング: バリデーションエラーが1件でもあれば1件も取り込まず、既存データはそのまま残す。
func putQuestions(c *gin.Context, db *gorm.DB) {
	// --- リクエストの解釈 ---
	var req importRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST",
			"リクエストのJSONを解釈できませんでした: "+err.Error())
		return
	}
	if len(req.Questions) == 0 {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST",
			"questions が空です(1問以上入れてください)")
		return
	}

	// --- バリデーション(全件まとめて。1件ずつ直して再送、を避けるため) ---
	if issues := validateImport(req.Questions); len(issues) > 0 {
		platform.RespondErrorWithDetails(c, http.StatusBadRequest, "SYNC_VALIDATION_ERROR",
			fmt.Sprintf("%d件の問題が不正です", countRows(issues)), issues)
		return
	}

	// --- 全置換(トランザクション) ---
	// phase の確認も同一トランザクション内で行い、
	// 「確認した直後に phase が変わって進行中に置換される」隙間を作らない。
	//
	// event/progress.go は UPDATE に Where("phase = ?", ...) を付けて競合を防いでいるが、
	// ここは UPDATE ではなく DELETE + INSERT なので同じ手が使えない。
	// 代わりに event_states(id=1) の行を FOR UPDATE でロックし、
	// 判定から書き込みまでの間に show-question 等が割り込めないようにする。
	err := db.Transaction(func(tx *gorm.DB) error {
		// Raw + Scan は行が無くてもエラーにならず空文字が入るので、
		// event/state.go の readEventState と同じく「行が無い」を明示的に弾く。
		var phase string
		if err := tx.Raw("SELECT phase FROM event_states WHERE id = 1 FOR UPDATE").
			Scan(&phase).Error; err != nil {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"event_statesを読み込めませんでした")
			return err
		}
		if phase == "" {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"event_states(id=1)がありません。mise run db:reset を実行して下さい")
			return errNoEventState
		}
		// 問題の全置換は開始前か終了後だけ許可する(§3.5.3)。
		// 禁止するphaseを列挙すると、新しいphaseを追加したときに漏れるため、
		// 許可する2つだけを列挙して安全側に倒す。
		if !canReplaceQuestions(phase) {
			platform.RespondError(c, http.StatusConflict, "INVALID_PHASE",
				"本番進行中(phase="+phase+")は問題を差し替えられません")
			return errInvalidPhase{phase: phase}
		}

		// 全置換なので既存を全削除してから入れ直す。
		// 途中で失敗すればロールバックされ、「半分だけ入った」状態にはならない。
		// event_states.current_question_id は ON DELETE SET NULL なのでFKでは落ちない。
		if err := tx.Exec("DELETE FROM questions").Error; err != nil {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"既存の問題を削除できませんでした")
			return err
		}

		rows := make([]Question, 0, len(req.Questions))
		for _, q := range req.Questions {
			correct := q.CorrectChoiceID
			rows = append(rows, Question{
				// ID はサーバーが採番する(§3.5.1)ためゼロ値のまま
				Number:          q.Number,
				Type:            q.Type,
				Difficulty:      q.Difficulty,
				TextSegments:    q.TextSegments,
				ImageURL:        q.ImageURL,
				Choices:         q.Choices,
				CorrectChoiceID: &correct,
				Explanation:     q.Explanation,
				Asked:           false,
			})
		}
		if err := tx.Create(&rows).Error; err != nil {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"問題を保存できませんでした")
			return err
		}
		return nil
	})
	// エラーレスポンスは基本的にトランザクション内で返している。
	// ただし db.Transaction は Begin / Commit 自体の失敗でもエラーを返し、
	// そのときは何も書かれていない。放置すると Gin が空の 200 を返し、
	// GAS や curl が「投入に成功した」と誤認する(実際には1件も入っていない)。
	// 書かれていなければここで 500 を返す。
	if err != nil {
		if !c.Writer.Written() {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"問題データを保存できませんでした")
		}
		return
	}

	// --- 画像の実体チェック(§6)。取り込みは止めず warnings で知らせる ---
	// 配信元(platform.StaticDir)と同じ場所を見る。別の場所を見ると、配信できている
	// 画像を「存在しない」と警告してしまう。
	warnings := collectImageWarnings(req.Questions, platform.StaticDir)

	// 保留: 「問題一覧が変わった」ことを管理者画面へ通知する仕組み(API仕様書 §3.5.3)。
	//
	// 進行APIと同じ broadcastState を繋いでも意味がない。このAPIは phase が
	// waiting / finished のときしか成功せず(上の FOR UPDATE の判定)、その2つの
	// phase の AdminState は question:null / askedCount:0 / revealedSegments:0 で
	// 固定なので、問題を全置換しても serverTime 以外1つも変わらないため。
	//
	// 伝えたい「問題一覧」は AdminState に含まれない(一覧は §4.1 の
	// QuestionListItem という別レスポンス)ので、state イベントでは運べない。
	// 通知するなら §5 にイベントを1本追加する必要がある(例: event: questions)。
	//
	// 実害はある。全置換は DELETE + INSERT なので questionId が振り直され、
	// 一覧を開いたままの管理者画面が古いIDで show-question を叩くと 404 になる。
	// ただし発生するのは進行開始前(waiting / finished)に限られる。
	//
	// 受け手である管理者画面(#20)がまだ無いため、イベントの追加は #20 / #63 で判断する。

	c.JSON(http.StatusOK, importResult{
		Imported:   len(req.Questions),
		ImportedAt: time.Now(),
		Warnings:   warnings,
	})
}

// canReplaceQuestions は、問題を全置換してよいphaseかを返す。
// 全置換すると questions.asked が消えて askedCount が0に戻るため、
// クイズ途中のphaseでは必ずfalseにする。
func canReplaceQuestions(phase string) bool {
	return phase == "waiting" || phase == "finished"
}

// errInvalidPhase は「本番進行中のため置換不可」をトランザクション内から伝えるためのエラー。
// エラーレスポンス自体はトランザクション内で返しているので、
// これらはロールバックを起こすためだけに使う。
type errInvalidPhase struct{ phase string }

func (e errInvalidPhase) Error() string { return "invalid phase: " + e.phase }

// errNoEventState は event_states(id=1) が無いことを伝えるためのエラー。
var errNoEventState = errors.New("event_states(id=1) not found")

// countRows は details の件数ではなく「不正な問題(行)の数」を数える。
// 1問に複数のエラーがあっても message 上は1件と数える(§3.5.3 の文言に合わせる)。
func countRows(issues []RowIssue) int {
	rows := map[int]bool{}
	for _, i := range issues {
		rows[i.SourceRow] = true
	}
	return len(rows)
}
