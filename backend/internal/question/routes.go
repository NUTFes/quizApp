package question

import (
	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

// RegisterRoutes は、エンドポイントの登録を行う。
//
// db と adminToken を引数で受け取りグローバルにしないのは、
// 各関数がどんな値を必要とするのか明示的にするため(event パッケージと同じ方針)。
func RegisterRoutes(db *gorm.DB, adminToken string) platform.RegisterFunc {
	return func(r *gin.Engine) {
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.GET("/questions", func(c *gin.Context) { listQuestions(c, db) })
	}
}
