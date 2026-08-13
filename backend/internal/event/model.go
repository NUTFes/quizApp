package event

import (
	"time"

	"github.com/naoto-anzai/quizApp/backend/internal/question"
)

type State struct{
	Phase string `json:"phase"`
	RemainingPlayers *int `json:"remainingPlayers"`
	TimeLimitSec int `json:"timeLimitSec"`
	QuestionStartedAt *time.Time `json:"questionStartedAt"`
	RevealedSegments int `json:"revealedSegments"`
	Question *question.Question `json:"question"`
}