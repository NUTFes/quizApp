package event

import (
	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
	"gorm.io/gorm"
)

// RegisterRoutes は、エンドポイントの登録を行う
//
// db を扱うため、dbを引数に取る
// admin の State を扱うため、認証トークン adminToken を引数にとる
//
// 上記の変数を引数として扱い、グローバルにしないのは、
// 各関数がどんな値を必要とするのか明示的にするため
func RegisterRoutes(db *gorm.DB, adminToken string) platform.RegisterFunc {
	return func(r *gin.Engine) {
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.GET("/state", func(c *gin.Context) { getState(c, db) })
		g.POST("/show-question", func(c *gin.Context) {showQuestion(c, db)})
		g.POST("/advance-text", advanceText)
		g.POST("/show-answer", showAnswer)
		g.POST("/reset", reset)
	}
}