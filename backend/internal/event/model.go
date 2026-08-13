package event

type State struct{
	Phase string `json:"phase"`
	RemainingPlayers int `json:"remainingPlayers"`
	TimeLimitSec int `json:"timeLimitSec"`
	QuestionStartedAt *string `json:"questionStartedAt"`
	RevealedSegments int `json:"revealedSegments"`
	Question *Question `json:"question"`
}