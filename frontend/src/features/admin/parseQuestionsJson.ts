import type { QuestionImport } from '../../types'

export type ParseResult = { ok: true; questions: QuestionImport[] } | { ok: false; message: string }

// 貼り付けられた文字列を、投入APIに送れる形かどうかだけ確かめる。
//
// ★ ここで中身(型・正答・選択肢の数など)までは見ない。
//   内容の検証はサーバーの責務で、どの行がどう悪いかを sourceRow 付きで返してくれる
//   (→ API仕様書 §3.5.1「列→JSONの変換はGASの責務、内容の検証はサーバーの責務」)。
//   フロントで同じ検証を書くと、仕様が変わったとき二か所直すことになり、
//   しかも片方だけ直し忘れて「画面は通すのにサーバーが弾く」状態になる。
//
//   フロントが見るのは「そもそもJSONとして読めるか」「questions の配列があるか」だけ。
//   これは貼り付けミス(途中で切れた・別のものを貼った)を、通信する前に気づかせるため。
export function parseQuestionsJson(input: string): ParseResult {
  if (input.trim() === '') {
    return { ok: false, message: 'JSONが空です。GASで生成したJSONを貼り付けてください。' }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(input)
  } catch {
    return {
      ok: false,
      message:
        'JSONとして読めませんでした。貼り付けが途中で切れていないか、全体をコピーできているか確認してください。',
    }
  }

  // GASが作るのは {"questions": [...]} の形だが、配列だけをコピーしてしまうことがあるので
  // どちらでも受け取る。人が手で貼る以上、直せる間違いは直して先に進ませる。
  const questions = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && 'questions' in parsed
      ? (parsed as { questions: unknown }).questions
      : undefined

  if (!Array.isArray(questions)) {
    return {
      ok: false,
      message:
        'questions の配列が見つかりません。{"questions": [ ... ]} の形で貼り付けてください。',
    }
  }
  if (questions.length === 0) {
    return { ok: false, message: '問題が0件です。1問以上入れてください。' }
  }

  return { ok: true, questions: questions as QuestionImport[] }
}
