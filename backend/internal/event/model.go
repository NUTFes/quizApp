package event

import (
	"time"

	"github.com/naoto-anzai/quizApp/backend/internal/question"
)

// DB に保存するための構造体
type EventState struct {
	ID                uint `gorm:"primaryKey"`
	Phase             string
	CurrentQuestionID *uint
	TimeLimitSec      int
	QuestionStartedAt *time.Time
	RevealedSegments  int
}

// API で返すための構造体
type State struct {
	Phase             string             `json:"phase"`
	ServerTime        time.Time          `json:"serverTime"`
	TimeLimitSec      *int               `json:"timeLimitSec"`
	QuestionStartedAt *time.Time         `json:"questionStartedAt"`
	RevealedSegments  int                `json:"revealedSegments"`
	TotalSegments     int                `json:"totalSegments"`
	Question          *question.Question `json:"question"`
	AskedCount        int                `json:"askedCount"`
}
