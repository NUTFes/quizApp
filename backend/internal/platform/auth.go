package platform

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ここでトークンの照合をする

// allowedTokens は可変長。次のパターンをとる
// 管理者画面からの API アクセス: adminToken
// 問題投入（スプシからGAS経由）: adminToken, importToken

const bearerPrefix = "Bearer "

func RequireToken(_allowedTokens ...string) gin.HandlerFunc {
	return func(c *gin.Context){
		// 検証トークンは一度だけフィルタリング（空文字列トークンの排除）
		allowedTokens := make([]string, 0, len(_allowedTokens))
		for _, token := range _allowedTokens {
			if(token!=""){
				allowedTokens = append(allowedTokens, token)
			}
		}

		// prefix とトークンを切り分ける
		token, isCut := strings.CutPrefix(c.GetHeader("Authorization"), bearerPrefix)

		// トークンが空文字列の時は問答無用ではじく
		if !isCut || token==""{// http だけならtoken==""は本来いらないが、前提が変わった時のため、認証は複数段階で行う
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authorization ヘッダがありません")
			return
		}
		// 許可されているトークンのどれかが来たら通す
		for _, allowedToken := range allowedTokens{
			if subtle.ConstantTimeCompare([]byte(token),[]byte(allowedToken)) == 1 {
				c.Next()
				return
			}
		}

		RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "トークンが違います")
	}
}