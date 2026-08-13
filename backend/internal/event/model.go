package event

type State struct{
	Phase string `json:"phase"`
	ServerTime string `json:"serverTime"`
	RemainingPlayers int `json:"remainingPlayers"`
	TimeLimitSec int `json:"timeLimitSec"`
	QuestionStartedAt *string `json:"questionStartedAt"`
	RevealdSegments int `json:"revealdSegments"`
	TotalSegments int `json:"totalSegments"`
	Question *Question `json:"question"`
}