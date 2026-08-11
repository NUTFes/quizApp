# frontend の箱(開発用)の作り方。
FROM node:22
WORKDIR /app

# pnpm を用意(mise.toml と同じ 10 系に合わせる)
RUN npm install -g pnpm@10

# 先にライブラリ一覧だけコピーしてインストール
# (コードを1行直すたびに全部入れ直さないための定石)
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

# 残りのソースをコピー
COPY . .

EXPOSE 5173
CMD ["pnpm", "dev", "--host"]
