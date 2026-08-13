package question

type Choice struct {
	ID string `json:"id"`
	Text string `json:"text"`
	ImageURL *string `json:"imageUrl"`
}
type Question struct {
    ID              uint     `json:"id"`
    Number          int      `json:"number"`
    Type            string   `json:"type"`
    Difficulty      string   `json:"difficulty"`
    TextSegments    []string `json:"textSegments"`
    ImageURL        *string  `json:"imageUrl"`
    Choices         []Choice `json:"choices"`
    CorrectChoiceID *string  `json:"correctChoiceId"`
    Note            *string  `json:"note"`
}