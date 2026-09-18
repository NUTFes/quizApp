package event

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/question"
)

func intPointer(value int) *int {
	return &value
}

func TestBuildStateForRevivalPhase(t *testing.T) {
	now := time.Now()
	questionID := uint(1)
	testQuestion := &question.Question{
		ID:           questionID,
		TextSegments: []string{"表示してはいけない問題文"},
	}

	for _, phase := range []string{"revival-video", "revival-entry"} {
		t.Run(phase, func(t *testing.T) {
			es := EventState{
				Phase:             phase,
				CurrentQuestionID: &questionID,
				TimeLimitSec:      intPointer(30),
				QuestionStartedAt: &now,
				RevealedSegments:  1,
			}

			got := buildState(es, testQuestion, 8)

			if got.Phase != phase {
				t.Errorf("phase=%q, want %q", got.Phase, phase)
			}
			if got.AskedCount != 8 {
				t.Errorf("askedCount=%d, want 8", got.AskedCount)
			}
			if got.TimeLimitSec != nil || got.QuestionStartedAt != nil || got.Question != nil {
				t.Errorf("問題関連のポインタがnilではない: %+v", got)
			}
			if got.RevealedSegments != 0 || got.TotalSegments != 0 {
				t.Errorf("問題関連の件数が0ではない: %+v", got)
			}
		})
	}
}

func TestBuildViewerStateForRevivalPhase(t *testing.T) {
	now := time.Now()
	questionID := uint(1)
	correctChoiceID := "A"
	testQuestion := &question.Question{
		ID:              questionID,
		TextSegments:    []string{"表示してはいけない問題文"},
		CorrectChoiceID: &correctChoiceID,
	}

	for _, phase := range []string{"revival-video", "revival-entry"} {
		t.Run(phase, func(t *testing.T) {
			es := EventState{
				Phase:             phase,
				CurrentQuestionID: &questionID,
				TimeLimitSec:      intPointer(30),
				QuestionStartedAt: &now,
				RevealedSegments:  1,
			}

			got := buildViewerState(es, testQuestion, 8, "phone")

			if got.Phase != phase {
				t.Errorf("phase=%q, want %q", got.Phase, phase)
			}
			if got.AskedCount != 8 {
				t.Errorf("askedCount=%d, want 8", got.AskedCount)
			}
			if got.TimeLimitSec != nil || got.QuestionStartedAt != nil || got.Question != nil || got.Answer != nil {
				t.Errorf("問題・正答関連の値がnilではない: %+v", got)
			}
		})
	}
}

func TestBuildStatesPassThroughTimeLimit(t *testing.T) {
	testQuestion := &question.Question{TextSegments: []string{"問題文"}}

	for _, tt := range []struct {
		name      string
		timeLimit *int
	}{
		{name: "制限時間あり", timeLimit: intPointer(30)},
		{name: "制限時間なし", timeLimit: nil},
	} {
		t.Run(tt.name, func(t *testing.T) {
			es := EventState{
				Phase:            "question",
				TimeLimitSec:     tt.timeLimit,
				RevealedSegments: 1,
			}

			adminState := buildState(es, testQuestion, 1)
			if adminState.TimeLimitSec != tt.timeLimit {
				t.Errorf("admin timeLimitSec=%v, want %v", adminState.TimeLimitSec, tt.timeLimit)
			}

			viewerState := buildViewerState(es, testQuestion, 1, "phone")
			if viewerState.TimeLimitSec != tt.timeLimit {
				t.Errorf("viewer timeLimitSec=%v, want %v", viewerState.TimeLimitSec, tt.timeLimit)
			}
		})
	}
}

func TestBuildViewerStateHayaoshiの問題文を宛先別に出し分ける(t *testing.T) {
	testQuestion := &question.Question{
		Number:       3,
		Type:         "hayaoshi",
		TextSegments: []string{"架空の", "早押し", "問題"},
		Choices:      []question.Choice{},
	}
	es := EventState{
		Phase:            "question",
		TimeLimitSec:     intPointer(30),
		RevealedSegments: 2,
	}

	tests := []struct {
		view string
		want []string
	}{
		{view: "phone", want: []string{}},
		{view: "monitor", want: []string{"架空の", "早押し"}},
	}

	for _, tt := range tests {
		t.Run(tt.view, func(t *testing.T) {
			got := buildViewerState(es, testQuestion, 3, tt.view)
			if got.Question == nil {
				t.Fatal("question がnilになっている")
			}
			if len(got.Question.TextSegments) != len(tt.want) {
				t.Fatalf("textSegments=%v, want %v", got.Question.TextSegments, tt.want)
			}
			for i := range tt.want {
				if got.Question.TextSegments[i] != tt.want[i] {
					t.Errorf("textSegments[%d]=%q, want %q", i, got.Question.TextSegments[i], tt.want[i])
				}
			}
		})
	}
}

func TestBuildPayloadsHayaoshiの問題文をSSEの宛先別に出し分ける(t *testing.T) {
	testQuestion := &question.Question{
		Number:       3,
		Type:         "hayaoshi",
		TextSegments: []string{"架空の", "早押し", "問題"},
		Choices:      []question.Choice{},
	}
	snap := snapshot{
		es: EventState{
			Phase:            "question",
			TimeLimitSec:     intPointer(30),
			RevealedSegments: 2,
		},
		q:          testQuestion,
		askedCount: 3,
	}

	_, monitorJSON, phoneJSON, err := buildPayloads(snap, "https://example.invalid/join")
	if err != nil {
		t.Fatalf("payloadを作成できない: %v", err)
	}

	var monitorState MonitorState
	if err := json.Unmarshal(monitorJSON, &monitorState); err != nil {
		t.Fatalf("monitor payloadを読めない: %v", err)
	}
	var phoneState ViewerState
	if err := json.Unmarshal(phoneJSON, &phoneState); err != nil {
		t.Fatalf("phone payloadを読めない: %v", err)
	}

	if monitorState.Question == nil || len(monitorState.Question.TextSegments) != 2 {
		t.Errorf("monitor textSegments=%v, want 2件", monitorState.Question)
	}
	if phoneState.Question == nil || len(phoneState.Question.TextSegments) != 0 {
		t.Errorf("phone textSegments=%v, want []", phoneState.Question)
	}
}

func TestRevivalRejectsInvalidRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name string
		body string
	}{
		{name: "toがない", body: `{}`},
		{name: "toが不正", body: `{"to":"hoge"}`},
		{name: "JSONが不正", body: `{"to":`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := gin.New()
			// 不正リクエストはDBへ到達する前に400になるため、ここではDBは不要。
			r.POST("/api/admin/revival", func(c *gin.Context) {
				revival(c, nil, "", nil)
			})

			req := httptest.NewRequest(http.MethodPost, "/api/admin/revival", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status=%d, want 400 (body=%s)", rec.Code, rec.Body.String())
			}

			var response struct {
				Error struct {
					Code string `json:"code"`
				} `json:"error"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
				t.Fatalf("エラーJSONを読めない: %v", err)
			}
			if response.Error.Code != "INVALID_REQUEST" {
				t.Errorf("code=%q, want INVALID_REQUEST", response.Error.Code)
			}
		})
	}
}
