package event

import (
	"time"

	"github.com/naoto-anzai/quizApp/backend/internal/question"
)

// DB に保存するための構造体
type EventState struct{
	Phase string `json:"phase"`
	RemainingPlayers *int `json:"remainingPlayers"`
	TimeLimitSec int `json:"timeLimitSec"`
	QuestionStartedAt *time.Time `json:"questionStartedAt"`
	RevealedSegments int `json:"revealedSegments"`
	Question *question.Question `json:"question"`
}

// API で返すための構造体
type State struct{
	Phase string `json:"phase"`
	ServerTime time.Time `json:"serverTime"`
	RemainingPlayers *int `json:"remainingPlayers"`
	TimeLimitSec int `json:"timeLimitSec"`
	QuestionStartedAt *time.Time `json:"questionStartedAt"`
	RevealedSegments int `json:"revealedSegments"`
	TotalSegments int `json:"totalSegments"`
	Question *question.Question `json:"question"`
}