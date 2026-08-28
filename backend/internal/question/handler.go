// PUT /api/admin/questions(問題データの投入)のハンドラ(§3.5)。
//
// 送られてきた JSON で問題一覧を全置換する。
// サーバーがスプレッドシートを読みに行く方式ではない(シートを読むのはGASの仕事)。
package question

import (
	"errors"
	"fmt"
	"net/http"
	"os"
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
		g := r.Group("/api/admin", platform.RequireToken(adminToken, importToken))
		g.PUT("/questions", func(c *gin.Context) { putQuestions(c, db) })
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
		// 本番進行中の置換は禁止(§3.5.3)。進行中に問題が差し替わる事故を構造的に防ぐ
		if phase == "question" || phase == "answer" {
			platform.RespondError(c, http.StatusConflict, "INVALID_PHASE",
				"本番進行中(phase="+phase+")は問題を差し替えられません。reset してから実行してください")
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
	// エラーレスポンスはトランザクション内で返しているので、ここでは打ち切るだけ
	if err != nil {
		return
	}

	// --- 画像の実体チェック(§6)。取り込みは止めず warnings で知らせる ---
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "./static" // GET /images/... の配信元(§6)。静的配信の実装時に揃える
	}
	warnings := collectImageWarnings(req.Questions, staticDir)

	// TODO(#SSE): 副作用として SSE で管理者画面に「問題一覧が変わった」ことを通知する。
	// internal/sse のハブが未実装のため、実装され次第ここから配信する。

	c.JSON(http.StatusOK, importResult{
		Imported:   len(req.Questions),
		ImportedAt: time.Now(),
		Warnings:   warnings,
	})
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
