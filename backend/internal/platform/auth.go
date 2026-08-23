package platform

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ここでトークンの照合をする（現状はトークン直書きでヘッダ丸ごと検証）
func RequireToken() gin.HandlerFunc {
	return func(c *gin.Context){
		log.Println("called RequireToken()")
		if c.GetHeader("Authorization") != "koreha-tesuto-youno-tookunn-desu" {
			RespondError(c, http.StatusUnauthorized, "UNAUTHORIZED", "トークンが違います")
			return
		}
		c.Next()
	}
}