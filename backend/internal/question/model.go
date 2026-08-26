package question

type Choice struct {
	ID       string  `json:"id"`
	Text     string  `json:"text"`
	ImageURL *string `json:"imageUrl"`
}
type Question struct {
	ID              uint     `json:"id"`
	Number          int      `json:"number"`
	Type            string   `json:"type"`
	Difficulty      string   `json:"difficulty"`
	TextSegments    []string `json:"textSegments" gorm:"serializer:json"`
	ImageURL        *string  `json:"imageUrl"`
	Choices         []Choice `json:"choices" gorm:"serializer:json"`
	CorrectChoiceID *string  `json:"correctChoiceId"`
	Explanation     *string  `json:"explanation"`
	Asked           bool     `json:"asked"`
}

// モニタ・スマホ用 Question
type ViewerQuestion struct {
	Number          int      `json:"number"`
	Type            string   `json:"type"`
	TextSegments    []string `json:"textSegments" gorm:"serializer:json"`
	ImageURL        *string  `json:"imageUrl"`
	Choices         []Choice `json:"choices" gorm:"serializer:json"`
}

// モニタ・スマホ用 Answer
type Answer struct {
	CorrectChoiceID *string  `json:"correctChoiceId"`
	Explanation     *string  `json:"explanation"`
}