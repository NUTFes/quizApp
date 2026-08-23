package event

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// question フェーズへ移行する関数
func showQuestion(c *gin.Context){
	c.JSON(http.StatusOK, gin.H{"phase": "qestion"})
}
func advanceText(c *gin.Context){}
func showAnswer(c *gin.Context){}
func reset(c *gin.Context){}