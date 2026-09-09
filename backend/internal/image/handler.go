// POST /api/admin/images(画像の投入)のハンドラ(§3.6)。
//
// ★ このAPIだけ multipart/form-data で受け取る。§0「リクエスト/レスポンスはすべて JSON」の
//
//	唯一の例外(仕様書にも例外として明記してある)。理由:
//	  1. base64+JSON にすると転送量が1.33倍になり、サーバーのピークメモリも約2倍になる
//	     (エンコード後の文字列とデコード後のバイト列が同時に載るため)
//	  2. フロントは FormData に append するだけで済む
//	  3. curl -F の1行でテストできる(当日サーバーに触らない以上これが効く)
//
// 当日、運営はサーバー(Proxmox上の本番CT)に触らない。
// このAPIが無いと当日は画像を1枚も追加できない(§6)。
package image

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/naoto-anzai/quizApp/backend/internal/platform"
)

// formFieldName は受け取るフィールド名。1リクエストにつき1枚(§3.6)。
const formFieldName = "file"

// RegisterRoutes は POST /api/admin/images を登録する。
//
// 認証は ADMIN_TOKEN のみ。IMPORT_TOKEN は通さない(§3.6)。
// PUT /api/admin/questions は両方通るが、GASが送るのはシートの文字列だけで画像は送らない。
// トークンの通用範囲は狭いほうがよい。
//
// staticDir は GET /images/... の配信元(§6)。
// STATIC_DIR の解決は呼び出し側(cmd/server/main.go)が行う
// (question/handler.go の画像存在チェックと同じ値を使うため)。
func RegisterRoutes(adminToken string, staticDir string) platform.RegisterFunc {
	imagesDir := filepath.Join(staticDir, "images")
	return func(r *gin.Engine) {
		g := r.Group("/api/admin", platform.RequireToken(adminToken))
		g.POST("/images", func(c *gin.Context) { postImage(c, imagesDir) })
	}
}

// uploadResult は §3.6 の成功レスポンス。
// 返す imageUrl は、そのままスプレッドシートの imageUrl 列に書ける形にする(§3.5.1)。
type uploadResult struct {
	ImageURL string `json:"imageUrl"`
}

func postImage(c *gin.Context, imagesDir string) {
	// ★ サイズ上限は MaxBytesReader で掛ける。
	//   gin.Engine.MaxMultipartMemory は上限ではない。あれは ParseMultipartForm に渡す
	//   「何バイトまでメモリに載せるか」の閾値で、超えた分はエラーにならず
	//   ディスクの一時ファイルへ書き出される(gin v1.12.0 context.go)。
	//   MaxBytesReader なら上限を超えた時点で読むのをやめられる。
	//   本番は nginx(client_max_body_size 5m)が先に弾くが、開発ではバックエンドを
	//   直接叩く(nginxを経由しない)のでGo側にも要る。
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxUploadBytes)

	// ★ c.FormFile は使わない。理由は2つ:
	//  1. FormFile が返す FileHeader.Filename は、標準ライブラリが RFC 7578 に従って
	//     filepath.Base を通した後の値。"../q5.png" は "q5.png" になって届くので、
	//     「ディレクトリを含む名前は拒否する」という検証がそもそも書けない。
	//     黙って別名で保存すると、投入者はシートに何を書けばよいか分からなくなる。
	//  2. FormFile はボディ全体をメモリ(または一時ファイル)へ展開してから渡してくる。
	//     MultipartReader なら受け取ったものを io.Reader のまま保存先へ流せる。
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
		// 見つかった最初の file パートだけを扱う(1リクエストにつき1枚)。
		defer part.Close()
		saveUploadedPart(c, imagesDir, part)
		return
	}

	platform.RespondError(c, http.StatusBadRequest, "INVALID_REQUEST",
		"multipart/form-data の "+formFieldName+" フィールドがありません")
}

// saveUploadedPart は file パート1つを検証して保存し、レスポンスまで返す。
func saveUploadedPart(c *gin.Context, imagesDir string, part *multipart.Part) {
	// ファイル名は送信側が決めるが、受け付ける形は厳しく絞る(save.go)。
	name := rawFileName(part)
	if err := validateFileName(name); err != nil {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_FILE_NAME", err.Error())
		return
	}

	// 拡張子ではなく中身で種類を判定する。
	head := make([]byte, sniffLen)
	n, err := io.ReadFull(part, head)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		respondReadError(c, err, "アップロードされたファイルを読めませんでした")
		return
	}
	head = head[:n]
	if err := checkContentMatchesExt(name, head); err != nil {
		platform.RespondError(c, http.StatusBadRequest, "INVALID_FILE_TYPE", err.Error())
		return
	}

	// 判定のために読んだ先頭を戻し、残りはそのまま流し込む。
	if err := Save(imagesDir, name, io.MultiReader(bytes.NewReader(head), part)); err != nil {
		respondReadError(c, err, "画像を保存できませんでした")
		return
	}

	// SSE配信はしない(§3.6)。画像を上げるのは管理者自身で、
	// このレスポンスを受け取った時点で変化を知っている。
	c.JSON(http.StatusOK, uploadResult{ImageURL: "/images/" + name})
}

// rawFileName は Content-Disposition の filename を、加工される前の生の値で取り出す。
//
// part.FileName() は filepath.Base を通してから返すため "../q5.png" と "q5.png" の
// 区別が付かない。ここは「怪しい名前を拒否する」のが目的なので生の値を見る。
func rawFileName(part *multipart.Part) string {
	_, params, err := mime.ParseMediaType(part.Header.Get("Content-Disposition"))
	if err != nil {
		return ""
	}
	return params["filename"]
}

// respondReadError はボディ読み取り中のエラーを返す。
// MaxBytesReader が上限で打ち切った場合だけ 413 にし、それ以外は 500 にする。
func respondReadError(c *gin.Context, err error, message string) {
	var tooLarge *http.MaxBytesError
	if errors.As(err, &tooLarge) {
		platform.RespondError(c, http.StatusRequestEntityTooLarge, "FILE_TOO_LARGE",
			fmt.Sprintf("画像は %dMB までです", MaxUploadBytes>>20))
		return
	}
	platform.RespondError(c, http.StatusInternalServerError, "INTERNAL", message+": "+err.Error())
}
