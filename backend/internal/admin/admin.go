package admin

import (
	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

func RegisterRoutes(r *gin.Engine){
	// api/admin/~~のAPIにアクセスると、RequireToken で記述した関数が実行され、トークン照合される
	g := r.Group("api/admin", platform.RequireToken())

	// トークン認証だけしたいなら、機能が何もない関数を呼ぶ
	g.GET("/verify", verify)
}

func verify(c *gin.Context){}