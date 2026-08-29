import { useState } from 'react'
import type { ImportResult, Phase } from '../../../types'
import type { RowIssue } from '../../../types/rowIssue'
import { ApiError, putQuestions } from '../../../lib/api'
import { NETWORK_ERROR_MESSAGE, toMessage } from '../errorMessages'
import { parseQuestionsJson } from '../parseQuestionsJson'
import { ConfirmDialog } from './ConfirmDialog'

type Props = {
  phase: Phase
  // 取り込むと問題一覧が丸ごと入れ替わるので、呼び出し側に取り直してもらう
  onImported: () => void
}

// 行番号つきの指摘(エラー・警告)を並べる。
// 「5行目を直す」まで分かって初めて直せるので、必ず sourceRow を頭に出す。
function IssueList({ issues }: { issues: RowIssue[] }) {
  return (
    <ul>
      {issues.map((issue, i) => (
        <li key={`${issue.sourceRow}-${i}`}>
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
export function ImportPanel({ phase, onImported }: Props) {
  const [input, setInput] = useState<string>('')
  const [busy, setBusy] = useState<boolean>(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<RowIssue[]>([])
  const [confirming, setConfirming] = useState<boolean>(false)

  // 進行中の全置換はサーバーが 409 で拒む(→ §3.5.3)。押せない理由を先に見せる
  const blocked = phase === 'question' || phase === 'answer'

  const handleSubmit = async () => {
    const parsed = parseQuestionsJson(input)
    if (!parsed.ok) {
      // 貼り付けミスは通信する前にここで止める
      setResult(null)
      setIssues([])
      setError(parsed.message)
      return
    }

    setBusy(true)
    setError(null)
    setIssues([])
    try {
      const imported = await putQuestions(parsed.questions)
      setResult(imported)
      onImported()
    } catch (err) {
      setResult(null)
      if (err instanceof ApiError) {
        setError(`取り込みに失敗しました: ${toMessage(err.code)}`)
        // 不正な行は details にまとめて入っている。
        // 1件ずつ直して送り直さずに済むよう、返ってきた全件をそのまま並べる(→ §3.5.3)
        setIssues(err.details)
      } else {
        setError(`取り込みに失敗しました: ${NETWORK_ERROR_MESSAGE}`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>問題データの投入</h2>
      <p>
        GASで作ったJSONを貼り付けて送ります。<strong>今ある問題はすべて置き換わります。</strong>
      </p>
      {blocked && <p>出題中・正答表示中は投入できません。待機画面に戻してから行ってください。</p>}
      <label>
        JSON :
        <textarea
          name="questions-json"
          rows={12}
          cols={80}
          value={input}
          disabled={busy || blocked}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'{"questions": [ ... ]}'}
        />
      </label>
      <button
        type="button"
        name="import-questions"
        onClick={() => setConfirming(true)}
        disabled={busy || blocked}
      >
        {busy ? '取り込み中...' : '取り込む'}
      </button>

      {result != null && (
        <div>
          <p>
            {result.imported}件を取り込みました({formatImportedAt(result.importedAt)})
          </p>
          {result.warnings.length > 0 && (
            <div>
              {/* warnings は取り込みを止めない軽微な問題(画像が無い等)。
                  取り込み自体は成功しているので、失敗と間違えられないよう見出しで分ける */}
              <p>取り込みましたが、次の点は確認してください :</p>
              <IssueList issues={result.warnings} />
            </div>
          )}
        </div>
      )}
      {error != null && (
        <div>
          <p>{error}</p>
          {/* エラー時は1件も取り込まれていない(全置換なので中途半端な状態を作らない)。
              既存の問題はそのまま残っているので、直して貼り直せばよい */}
          {issues.length > 0 && <IssueList issues={issues} />}
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          message="今ある問題データをすべて、貼り付けた内容に置き換えます。よろしいですか?"
          confirmLabel="置き換える"
          onConfirm={() => {
            setConfirming(false)
            void handleSubmit()
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  )
}
