package platform

import (
	"log"

	"github.com/gin-gonic/gin"
)

func RequireToken() gin.HandlerFunc {
	return func(c *gin.Context){
		log.Println("called RequireToken()")
		c.Next()
	}
}