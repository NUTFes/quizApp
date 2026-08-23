package admin

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

// NewRouterに渡す形を合わせるために関数を返す関数にする
func RegisterRoutes(adminToken string) platform.RegisterFunc{
	return func(r *gin.Engine){ 
		// api/admin/~~のAPIにアクセスると、RequireToken で記述した関数が実行され、トークン照合される
		g := r.Group("api/admin", platform.RequireToken(adminToken))

		// トークン認証だけしたいなら、機能が何もない関数を呼ぶ
		g.GET("/verify", verify)
	}
}

// 何もしない関数。トークンが切れてないかの確認用
func verify(c *gin.Context){
	c.JSON(http.StatusOK, gin.H{"ok":true})
}