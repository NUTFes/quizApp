import type { ApiError } from '../../lib/api'

// APIの error.code を、裏方に見せる日本語に直す。
//
// サーバーの message は開発者向けで、内容も変わりうる。
// 画面に出す文言はフロントが持つ(→ API仕様書 §0 / 実装手順書 §7)。
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'トークンが正しくありません。入力し直してください。',
  QUESTION_NOT_FOUND: 'その問題は見つかりませんでした。一覧を更新してください。',
  INVALID_REQUEST: '入力内容が正しくありません。制限時間は5〜120秒です。',
  INVALID_PHASE: 'いまの進行状況ではこの操作はできません。',
  // 投入APIのみ。どの行がどう悪いかは error.details に入っているので、画面ではそちらを並べる
  SYNC_VALIDATION_ERROR: '問題データに不正な行があります。下の一覧を直して貼り直してください。',
  INVALID_FILE_NAME: 'ファイル名が使えません。英数字と . _ - のみで、100文字以内にしてください。',
  INVALID_FILE_TYPE: '拡張子は png / jpg / jpeg のみです。画像の中身と拡張子を一致させてください。',
  FILE_TOO_LARGE: '画像が大きすぎます(5MBまで)。',
  INTERNAL: 'サーバー側で問題が起きました。もう一度お試しください。',
  NOT_FOUND: 'その操作は見つかりませんでした(APIが未実装の可能性があります)。',
}

// 知らない code が来ても画面が壊れないよう、必ず既定の文言に落とす。
export const toMessage = (code: string): string =>
  ERROR_MESSAGES[code] ?? '処理に失敗しました。もう一度お試しください。'

// nginx が先に 413 を返す場合はJSONでなく code が UNKNOWN になるため、status を先に見る。
export const toImageMessage = (err: ApiError): string =>
  err.status === 413 ? toMessage('FILE_TOO_LARGE') : toMessage(err.code)

// 問題データの投入(PUT /api/admin/questions)専用の文言。
//
// INVALID_REQUEST は show-question の秒数エラーと同じ code だが、
// 投入APIでは「JSONを解釈できない」「questions が空」という別の意味で返ってくる
// (→ backend/internal/question/handler.go)。ERROR_MESSAGES の文言をそのまま出すと
// 「制限時間は5〜120秒です」という無関係な指示が出てしまうため、ここだけ訳し分ける。
export const toImportMessage = (code: string): string => {
  if (code === 'INVALID_REQUEST') {
    return 'JSONの形式が正しくありません(型が違う項目がある、questionsが空、等)。内容を確認してください。'
  }
  return toMessage(code)
}

// 通信自体ができなかったとき(サーバー停止・回線断)。ApiError にならないのでこちら。
export const NETWORK_ERROR_MESSAGE =
  '通信に失敗しました。ネットワークとサーバーを確認してください。'
