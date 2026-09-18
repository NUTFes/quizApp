// POST /api/admin/videos(敗者復活動画の投入)のハンドラ。
package video

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

const formFieldName = "file"

// RegisterRoutes はPOST /api/admin/videosを登録する。
// 認証はADMIN_TOKENのみで、IMPORT_TOKENは通さない。
func RegisterRoutes(adminToken string, staticDir string) platform.RegisterFunc {
	videosDir := filepath.Join(staticDir, "videos")
	return func(r *gin.Engine) {
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.POST("/videos", func(c *gin.Context) { postVideo(c, videosDir) })
	}
}

type uploadResult struct {
	VideoURL string `json:"videoUrl"`
}

func postVideo(c *gin.Context, videosDir string) {
	// リクエスト全体と動画本体の上限は別に掛ける。理由はsave.goの
	// MaxRequestBytesのコメントを参照。GinのMaxMultipartMemoryは上限ではなく、
	// 超過分を一時ファイルへ逃がす閾値なのでここでは使わない。
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxRequestBytes)

	mr, err := c.Request.MultipartReader()
	if err != nil {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST",
			"multipart/form-data で送ってください: "+err.Error())
		return
	}

	for {
		part, err := mr.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			respondReadError(c, err, "リクエストを解釈できませんでした")
			return
		}
		if part.FormName() != formFieldName {
			part.Close()
			continue
		}
		defer part.Close()
		saveUploadedPart(c, videosDir, part)
		return
	}

	platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST",
		"multipart/form-data の "+formFieldName+" フィールドがありません")
}

func saveUploadedPart(c *gin.Context, videosDir string, part *multipart.Part) {
	// 元のファイル名や拡張子は使わない。動画本体だけを数え、保存名は常に固定する。
	body := newVideoLimitReader(part, MaxVideoBytes)

	head := make([]byte, sniffLen)
	n, err := io.ReadFull(body, head)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		respondReadError(c, err, "アップロードされたファイルを読めませんでした")
		return
	}
	head = head[:n]
	if err := checkMP4(head); err != nil {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_FILE_TYPE", err.Error())
		return
	}

	if err := Save(videosDir, io.MultiReader(bytes.NewReader(head), body)); err != nil {
		respondReadError(c, err, "動画を保存できませんでした")
		return
	}

	c.JSON(http.StatusOK, uploadResult{VideoURL: "/videos/" + fileName})
}

func respondReadError(c *gin.Context, err error, message string) {
	var tooLarge *http.MaxBytesError
	if errors.Is(err, errVideoTooLarge) || errors.As(err, &tooLarge) {
		platform.RespondError(c, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE",
			fmt.Sprintf("動画は%dMBまでです", MaxVideoBytes/(1024*1024)))
		return
	}
	platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", message+": "+err.Error())
}
