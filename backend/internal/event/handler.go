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
	c.JSON(http.StatusOK, buildState(es))
}

// DBにある、EventState の形のものをAPIで返すState型に直す
// 
// phase が waiting または finished のときは出題関係は全部 0/null にする
// 絶対にキーは消さないように、 omitempty は使わない
// 値を代入しないで、null にする
func buildState(es EventState) State {
	s := State{
		Phase: es.Phase,
		ServerTime: time.Now(),
	}

	// waiting か finished の時はここで返す
	// TimelimitSec などはポインタであるから nil となるが、 JSON への変換で null になる
	if es.Phase == "waiting" || es.Phase == "finished" {
		return s
	}

	// question か answer の時の処理
	tls := es.TimeLimitSec // ポインタに代入するには、変数のポインタとしてしか渡せない
	s.TimeLimitSec = &tls
	s.QuestionStartedAt = es.QuestionStartedAt
	s.RevealedSegments = es.RevealedSegments

	return s
} 