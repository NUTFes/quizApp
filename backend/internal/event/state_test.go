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
				TimeLimitSec:      30,
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
				TimeLimitSec:      30,
				QuestionStartedAt: &now,
				RevealedSegments:  1,
			}

			got := buildViewerState(es, testQuestion, 8)

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
