package event

import (
	"net/http"

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

// State を返す関数
func getState(c *gin.Context){
	c.JSON(http.StatusOK, gin.H{"phase": "waiting"})
}