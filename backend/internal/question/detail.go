// GET /api/admin/question/:id(問題の詳細情報)のハンドラ
package question

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)


func getQuestion(c *gin.Context, db *gorm.DB) {
	raw := c.Param("id") // :id の部分に来る数値をid 変数として持っておく
	var q Question
	c.JSON(http.StatusOK, q)
}