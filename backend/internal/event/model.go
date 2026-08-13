package event

type State struct{
	Phase string `json:"phase"`
	RemainingPlayers int `json:"remainingPlayers"`
	TimeLimitSec int `json:"timeLimitSec"`
	QuestionStartedAt *string `json:"questionStartedAt"`
	RevealdSegments int `json:"revealdSegments"`
	Question *Question `json:"question"`
}