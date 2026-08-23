package event

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

// エンドポイントの登録
func RegisterRoutes(db *gorm.DB, adminToken string) platform.RegisterFunc{
	return func(r *gin.Engine){
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.GET("/state", func(c *gin.Context){getState(c, db)})
	}
}

// State を返す関数
func getState(c *gin.Context, db gorm.DB){
	c.JSON(http.StatusOK, gin.H{"phase": "waiting"})
}