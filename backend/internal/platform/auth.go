package platform

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ここでトークンの照合をする（現状はトークン直書きで検証）
const bearerPrefix = "Bearer "

func RequireToken(allowedToken string) gin.HandlerFunc {
	return func(c *gin.Context){
		// prefix とトークンを切り分ける
		token, isCut := strings.CutPrefix(c.GetHeader("Authorization"), bearerPrefix)

		// トークンが空文字列の時は問答無用ではじく
		if !isCut || token==""{// http だけならtoken==""は本来いらないが、前提が変わった時のため、認証は複数段階で行う
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "Authorization ヘッダがありません")
			return
		}
		if token != allowedToken {
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "トークンが違います")
			return
		}
		c.Next()
	}
}