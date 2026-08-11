# backend の箱(開発用)の作り方。
FROM golang:1.25
WORKDIR /app

# air(ホットリロード)を入れる
RUN go install github.com/air-verse/air@latest

# 依存の一覧をコピー(今は標準ライブラリだけなので中身は最小)
COPY go.mod ./
RUN go mod download

# 残りのソースをコピー
COPY . .

EXPOSE 3000
# air 経由で起動(コードを保存すると自動で再ビルドされる)
CMD ["air", "-c", ".air.toml"]
