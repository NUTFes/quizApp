package event

import (
	"net/http"
	"time"

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
func getState(c *gin.Context, db *gorm.DB){
	var es EventState
	// es に event_states テーブルから１行目を指定して書き込む
	var result = db.First(&es, 1)
	if result.Error != nil{
		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", "event_statesを読み込めませんでした")
		return
	}
	c.JSON(http.StatusOK, State{
		Phase: es.Phase,
		ServerTime: time.Now(),
	})
}