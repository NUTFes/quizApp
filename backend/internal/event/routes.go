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
func RegisterRoutes(db *gorm.DB, adminToken string, joinURL string) platform.RegisterFunc {
	return func(r *gin.Engine) {
		// api 全体のグループ
		api := r.Group("/api")
		api.GET("/state", func(c *gin.Context) { getViewState(c, db, joinURL) })

		// admin のパスグループ
		adminApi := api.Group("/admin", platform.RequireToken(adminToken))
		adminApi.GET("/state", func(c *gin.Context) { getState(c, db) })
		adminApi.POST("/show-question", func(c *gin.Context) { showQuestion(c, db) })
		adminApi.POST("/advance-text", func(c *gin.Context) { advanceText(c, db) })
		adminApi.POST("/show-answer", func(c *gin.Context) { showAnswer(c, db) })
		adminApi.POST("/reset", func(c *gin.Context) { reset(c, db) })
	}
}
