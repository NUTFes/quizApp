package platform

import (
	"log"

	"github.com/gin-gonic/gin"
)

// ここでトークンの照合をする（現状は何も水ただ通す（c.Next()））
func RequireToken() gin.HandlerFunc {
	return func(c *gin.Context){
		log.Println("called RequireToken()")
		c.Next()
	}
}