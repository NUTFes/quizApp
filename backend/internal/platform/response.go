// エラーレスポンスの共通ヘルパ。
//
// エラーの形は全API共通(API仕様書 §0):
//
//	{ "error": { "code": "QUESTION_NOT_FOUND", "message": "questionId=99 は存在しません" } }
//
// - code は契約。フロントが分岐に使うので、勝手に変えない(AGENTS.md §6-5)
// - message は開発者向けデバッグ文言。自由に書いてよい(画面表示には使われない)
package platform

import "github.com/gin-gonic/gin"

// errorBody は §0 のエラーJSONの形。
// ネストが1段ある({"error": {...}})ことに注意。
type errorBody struct {
	Error errorDetail `json:"error"`
}

type errorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	// details は §3.5(問題投入のバリデーション)でのみ使う任意項目。
	// 無いときはキーごと出さない(omitempty)。

	// 形は §3.5.3 の {sourceRow, reason} の配列。無いときはキーごと出さない。
	Details any `json:"details,omitempty"`
}

// RespondError は共通の形でエラーJSONを返す。
//
// 使い方:
//
//	platform.RespondError(c, 404, "QUESTION_NOT_FOUND", "questionId=99 は存在しません")
//
// これを使えば全エンドポイントのエラーが同じ形になる。
// 自前で c.JSON(...) を組み立てないこと。
func RespondError(c *gin.Context, status int, code string, message string) {
	c.AbortWithStatusJSON(status, errorBody{
		Error: errorDetail{Code: code, Message: message},
	})
}

// RespondErrorWithDetails は details 配列付きのエラーを返す。
// §3.5 の SYNC_VALIDATION_ERROR のように、複数件のエラーを同時に返すときだけ使う。
func RespondErrorWithDetails(c *gin.Context, status int, code string, message string, details any) {
	c.AbortWithStatusJSON(status, errorBody{
		Error: errorDetail{Code: code, Message: message, Details: details},
	})
}
