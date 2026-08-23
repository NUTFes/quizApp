package event

import (
	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

// エンドポイントの登録
func RegisterRoutes(adminToken string) platform.RegisterFunc{
	return func(r *gin.Engine){
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.GET("/state", getState)
	}
}

func getState(c *gin.Context){}