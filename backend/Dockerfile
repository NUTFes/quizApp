# backend の箱(開発用)の作り方。
FROM golang:1.25
WORKDIR /app

# air(ホットリロード)を入れる。
# @latest にしないこと: air v1.67.2 以降は Go 1.26 以上を要求するため、
# このイメージ(golang:1.25)ではビルドが失敗する。Goを上げるまではここを固定する。
RUN go install github.com/air-verse/air@v1.67.1
RUN go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.19.1

# 依存の一覧をコピー(今は標準ライブラリだけなので中身は最小)
COPY go.mod ./
RUN go mod download

# 残りのソースをコピー
COPY . .

EXPOSE 3000
# air 経由で起動(コードを保存すると自動で再ビルドされる)
CMD ["air", "-c", ".air.toml"]
