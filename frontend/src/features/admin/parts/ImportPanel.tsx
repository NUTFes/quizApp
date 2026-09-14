import { useId, useState } from 'react'
import type { ImportResult, Phase, QuestionImport } from '../../../types'
import type { RowIssue } from '../../../types/rowIssue'
import { parseQuestionsJson } from '../parseQuestionsJson'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  phase: Phase
  input: string
  // 他の進行操作(出題・リセット等)と共有のロック。この投入自体が送信中とは限らない
  // (→ OperationPanel の inFlight/busy 参照)
  busy: boolean
  // 直近の投入結果。新しく送信するまで、成功/失敗どちらの表示も残しておく
  result: ImportResult | null
  error: string | null
  issues: RowIssue[]
  onInputChange: (value: string) => void
  // 事前チェック・確認ダイアログを通った後に呼ばれる。通信は呼び出し側(OperationPanel)の責務
  onSubmit: (questions: QuestionImport[]) => void
}

// 行番号つきの指摘(エラー・警告)を並べる。
// 「5行目を直す」まで分かって初めて直せるので、必ず sourceRow を頭に出す。
function IssueList({ issues }: { issues: RowIssue[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1">
      {issues.map((issue, i) => (
        <li key={`${issue.sourceRow}-${i}`} className="text-sm">
          {issue.sourceRow}行目 : {issue.reason}
        </li>
      ))}
    </ul>
  )
}

const formatImportedAt = (iso: string) => {
  const date = new Date(iso)
  // サーバーの形式が変わっても画面を壊さない。読めなければ元の文字列をそのまま出す
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('ja-JP')
}

// 問題データの投入。
//
// GASで作ったJSON(→ API仕様書 §3.5.1)をそのまま貼り付けて送る。
// サーバーに公開URLが用意できず、GASから直接叩けない場合の代替手段(§3.5.5)で、
// 呼ぶAPIはGAS直送のときと同じ PUT /api/admin/questions。
//
// 他のパネルと同じく、通信はしない(OperationPanel に寄せる)。ここで持つのは
// 「送信前の確認ダイアログを開いているか」「貼り付け内容がJSONとして読めるか」という
// 通信を伴わないUI状態だけ(→ ControlPanel の confirmingInstanceKey と同じ考え方)。
export function ImportPanel({
  phase,
  input,
  busy,
  result,
  error,
  issues,
  onInputChange,
  onSubmit,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [pendingQuestions, setPendingQuestions] = useState<QuestionImport[]>([])
  const textareaId = useId()

  // 進行中の全置換はサーバーが 409 で拒む(→ §3.5.3)。押せない理由を先に見せる
  const blocked = phase === 'question' || phase === 'answer'
  const locked = busy || blocked

  // ダイアログを開いた後に、他の操作で phase が変わって blocked になることがある。
  // 開いた時点のフラグのまま置かず、この描画のたびに判定し直すことで、
  // 開いたまま「置き換える」を押せてしまう隙を作らない
  // (→ ControlPanel の dialogOpen と同じ考え方)。
  const dialogOpen = confirming && !locked

  const handleSubmitClick = () => {
    const parsed = parseQuestionsJson(input)
    if (!parsed.ok) {
      // 貼り付けミスは通信する前にここで止める
      setParseError(parsed.message)
      return
    }
    setParseError(null)
    setPendingQuestions(parsed.questions)
    setConfirming(true)
  }

  return (
    <section className="w-full max-w-[440px] rounded-3xl border border-border-soft bg-surface px-6 py-4 font-zen-kaku-gothic-new">
      <h2 className="text-admin-header text-brand">問題データの投入</h2>
      <p className="mt-2 text-sm">
        GASで作ったJSONを貼り付けて送ります。
        <strong className="text-red-700">今ある問題はすべて置き換わります。</strong>
      </p>
      {blocked && (
        <p className="mt-2 text-sm text-red-700">
          出題中・正答表示中は投入できません。待機画面に戻してから行ってください。
        </p>
      )}

      <label htmlFor={textareaId} className="mt-4 block text-sm">
        JSON
      </label>
      <textarea
        id={textareaId}
        name="questions-json"
        rows={10}
        value={input}
        disabled={locked}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={'{"questions": [ ... ]}'}
        className="mt-1 w-full rounded-lg border border-border-soft px-3 py-2 font-mono text-sm disabled:cursor-not-allowed disabled:opacity-60"
      />

      <button
        type="button"
        name="import-questions"
        onClick={handleSubmitClick}
        disabled={locked}
        className="mt-4 rounded-xl bg-brand px-6 py-3 text-admin-func-label text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {/* busy は他の進行操作(出題・リセット等)と共有のロックなので、
            必ずしも「取り込み中」とは限らない。汎用的な文言にしておく */}
        {busy ? '送信中…' : '取り込む'}
      </button>

      {result != null && (
        <div className="mt-4 rounded-2xl border border-border-soft px-4 py-3">
          <p className="text-admin-func-label">
            {result.imported}件を取り込みました({formatImportedAt(result.importedAt)})
          </p>
          {result.warnings.length > 0 && (
            <div className="mt-2">
              {/* warnings は取り込みを止めない軽微な問題(画像が無い等)。
                  取り込み自体は成功しているので、失敗と間違えられないよう見出しで分ける */}
              <p className="text-sm font-bold">取り込みましたが、次の点は確認してください :</p>
              <IssueList issues={result.warnings} />
            </div>
          )}
        </div>
      )}
      {(parseError != null || error != null) && (
        <div
          role="alert"
          className="mt-4 rounded-2xl border-2 border-red-700 bg-red-50 px-4 py-3 text-red-900"
        >
          {/* parseError(貼り付けミス)は通信すらしていないので優先する。
              前回のサーバーエラー(error/issues)を残したままだと、
              今回止まった本当の理由(JSON構文エラー)が埋もれる */}
          <p className="text-admin-func-label">
            {parseError ?? (error !== null ? `取り込みに失敗しました: ${error}` : null)}
          </p>
          {/* エラー時は1件も取り込まれていない(全置換なので中途半端な状態を作らない)。
              既存の問題はそのまま残っているので、直して貼り直せばよい */}
          {parseError === null && issues.length > 0 && <IssueList issues={issues} />}
        </div>
      )}

      {dialogOpen && (
        <ConfirmDialog
          title="問題データを置き換えますか?"
          message="今ある問題データをすべて、貼り付けた内容に置き換えます。取り消せません。"
          confirmLabel="置き換える"
          onConfirm={() => {
            setConfirming(false)
            onSubmit(pendingQuestions)
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}
