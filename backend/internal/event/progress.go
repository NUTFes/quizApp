package event

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// question フェーズへ移行する関数
func showQuestion(c *gin.Context, db *gorm.DB){
	// 最後の処理として、getState で行うことをそのまま行うため、そのまま呼び出す
	getState(c, db)
}
func advanceText(c *gin.Context){}
func showAnswer(c *gin.Context){}
func reset(c *gin.Context){}