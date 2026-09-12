package image

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

type imageInfo struct {
	ImageURL  string `json:"imageUrl"`
	Size      int64  `json:"size"`
	UpdatedAt string `json:"updatedAt"`
}

type imageListResponse struct {
	Images []imageInfo `json:"images"`
}

func getImages(c *gin.Context, imagesDir string) {
	entries, err := os.ReadDir(imagesDir)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusOK, imageListResponse{
				Images: []imageInfo{},
			})
			return
		}

		platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
			"画像一覧を取得できませんでした: "+err.Error())
		return
	}

	images := make([]imageInfo, 0)

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		ext := strings.ToLower(filepath.Ext(entry.Name()))
		if ext != ".png" && ext != ".jpg" && ext != ".jpeg" {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			platform.RespondError(c, http.StatusInternalServerError, "INTERNAL",
				"画像情報を取得できませんでした: "+err.Error())
			return
		}

		images = append(images, imageInfo{
			ImageURL:  "/images/" + entry.Name(),
			Size:      info.Size(),
			UpdatedAt: info.ModTime().Format(time.RFC3339),
		})
	}

	sort.Slice(images, func(i, j int) bool {
		return images[i].ImageURL < images[j].ImageURL
	})

	c.JSON(http.StatusOK, imageListResponse{
		Images: images,
	})
}
