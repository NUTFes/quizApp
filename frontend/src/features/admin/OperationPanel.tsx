// 操作盤。認証を通ったあとに表示される画面。
//
// この画面で唯一、サーバーと通信する場所。状態の受け取りと計算をここに寄せ、
// 各パネルには props で配る。パネル側が通信すると、/dev/admin で描画できなくなる
// (トークンも fetch も無い場所で全状態を並べたいため)。
//
// ⚠️ ImagePanel(#105)だけこの原則の例外。内部でAPIを直接呼ぶ(→ ImagePanel.tsx 冒頭のコメント)。
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdminState } from '../../lib/useEventState'
import { useRemainingTime } from '../../lib/useRemainingTime'
import type {
  AdminState,
  ImportResult,
  Question,
  QuestionImport,
  QuestionListItem,
} from '../../types'
import type { RowIssue } from '../../types/rowIssue'
import {
  advanceText,
  ApiError,
  getQuestionById,
  getQuestions,
  putQuestions,
  reset,
  revival,
  showAnswer,
  showQuestion,
  uploadVideo,
} from '../../lib/api'
import { NETWORK_ERROR_MESSAGE, toImportMessage, toMessage, toVideoMessage } from './errorMessages'
import { ACTION_LABEL, ActionLabel } from './labels'
import { ControlPanel } from './parts/ControlPanel'
import { CurrentStatus } from './parts/CurrentStatus'
import { ErrorBanner, OperationFailure } from './parts/ErrorBanner'
import { ImagePanel } from './parts/ImagePanel'
import { ImportPanel } from './parts/ImportPanel'
import { QuestionList } from './parts/QuestionList'
import { RevivalVideoPanel } from './parts/RevivalVideoPanel'
import { ScreenPreviewPanel } from './parts/ScreenPreviewPanel'
import { SelectedQuestion, type SelectedQuestionProps } from './parts/SelectedQuestion'
import { ShowQuestionForm } from './parts/ShowQuestionForm'
import type { AdminStatus } from './parts/StatusBadge'

type Props = {
  // トークンが無効になったことが分かったときに呼ぶ。AdminPage がログイン画面へ戻す
  // (→ docs/実装要件/フロントエンド実装要件.md §4「どのAPIでも401ならトークン入力画面に戻す」)
  onAuthExpired: () => void
}

export function OperationPanel({ onAuthExpired }: Props) {
  // SSE でつなぎっぱなしにする。状態が変わるたびに新しい state が届く
  const state = useAdminState(onAuthExpired)
  const remainingTime = useRemainingTime({
    serverTime: state?.serverTime ?? '',
    timeLimitSec: state?.timeLimitSec ?? null,
    questionStartedAt: state?.questionStartedAt ?? null,
  })

  const [failure, setFailure] = useState<OperationFailure | null>(null)
  const [busy, setBusy] = useState(false) // 連続で操作できないようにするための排他処理のためのロック
  const inFlight = useRef(false)
  const [timeLimitInput, setTimelimitInput] = useState('30') // 制限時間のための箱 state

  const [questions, setQuestions] = useState<QuestionListItem[] | null>(null)
  const [questionListError, setQuestionListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // 同じ id のまま詳細取得だけをやり直すためのカウンタ(通信失敗時の「もう一度取得する」用)。
  // selectedId が変わらないと effect が再実行されないので、専用の依存値を用意する
  const [retryCount, setRetryCount] = useState(0)
  // getQuestionById の結果。id・retryCount を一緒に持ち、いまの選択/リトライ回数とずれていたら
  // (選び直し直後・リトライ直後)「取得中」扱いにする(古い問題の詳細が一瞬見えるのを防ぐ)
  const [selectedQuestionResult, setSelectedQuestionResult] = useState<{
    id: number
    retryCount: number
    result: { status: 'loaded'; question: Question } | { status: 'error'; message: string }
  } | null>(null)

  // 問題データの投入(#110)。busy / inFlight は他の操作(showQuestion等)と共有する。
  // 別系統にすると、投入中に出題を押せてしまい(逆に出題中に投入を押せてしまい)、
  // 全置換でidが振り直された直後の出題が404になる・進行中の投入が409になる、
  // といった競合を起こす
  const [importInput, setImportInput] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importIssues, setImportIssues] = useState<RowIssue[]>([])

  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoBusy, setVideoBusy] = useState(false)
  const [videoConfirming, setVideoConfirming] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  // 呼び出し側がその場で作った関数を渡しても、依存配列に入れずに済むようにする
  // (lib/useEventState.ts の onUnauthorizedRef と同じ理由)
  const onAuthExpiredRef = useRef(onAuthExpired)
  useEffect(() => {
    onAuthExpiredRef.current = onAuthExpired
  })

  // 直近に発行した refreshQuestions の世代。古い応答が後から返ってきても
  // 上書きさせないために使う(→ lib/useEventState.ts の revision と同じ考え方)。
  // 特に投入(#110)は全置換で id が丸ごと変わるため、投入前に発行した古いGETが
  // 投入後の新しい一覧を、存在しないidを含む古い一覧で上書きすると事故になる
  const questionsRequestId = useRef(0)

  // 問題一覧の取得。showQuestion/reset は asked を書き換え、投入は全置換するので、
  // 成功後にも呼び直す(呼ばないと一覧が古いまま表示される)
  const refreshQuestions = useCallback(() => {
    const requestId = ++questionsRequestId.current
    return getQuestions()
      .then(({ questions }) => {
        if (requestId !== questionsRequestId.current) return // 後から発行された取得より古い応答は捨てる
        setQuestions(questions)
      })
      .catch((e) => {
        if (requestId !== questionsRequestId.current) return
        if (e instanceof ApiError && e.status === 401) {
          onAuthExpiredRef.current()
          return
        }
        setQuestionListError(e instanceof ApiError ? toMessage(e.code) : NETWORK_ERROR_MESSAGE)
      })
  }, [])

  useEffect(() => {
    refreshQuestions()
  }, [refreshQuestions])

  // 選んだ問題が変わるたびに詳細(選択肢・正答込み)を取り直す。一覧(QuestionListItem)には
  // これらが無いため(→ API仕様書 §4.1)、別APIを叩く必要がある
  useEffect(() => {
    if (selectedId === null) return
    let cancelled = false
    getQuestionById(selectedId)
      .then((question) => {
        if (cancelled) return
        setSelectedQuestionResult({
          id: selectedId,
          retryCount,
          result: { status: 'loaded', question },
        })
      })
      .catch((e) => {
        if (cancelled) return
        if (e instanceof ApiError && e.status === 401) {
          onAuthExpiredRef.current()
          return
        }
        setSelectedQuestionResult({
          id: selectedId,
          retryCount,
          result: {
            status: 'error',
            message: e instanceof ApiError ? toMessage(e.code) : NETWORK_ERROR_MESSAGE,
          },
        })
      })
    // 選択を連打で変えたとき、古いリクエストの応答が新しい選択を上書きしないようにする
    return () => {
      cancelled = true
    }
  }, [selectedId, retryCount])

  // 未選択なら empty、取得中(またはまだ選択/リトライ回数がずれている)なら loading、それ以外は結果をそのまま使う
  const selectedQuestionState: SelectedQuestionProps =
    selectedId === null
      ? { status: 'empty' }
      : selectedQuestionResult === null ||
          selectedQuestionResult.id !== selectedId ||
          selectedQuestionResult.retryCount !== retryCount
        ? { status: 'loading' }
        : selectedQuestionResult.result.status === 'error'
          ? {
              status: 'error',
              message: selectedQuestionResult.result.message,
              onRetry: () => setRetryCount((c) => c + 1),
            }
          : selectedQuestionResult.result

  if (state === null) return <p>接続中...</p>

  const run = async (
    action: ActionLabel,
    request: () => Promise<unknown>,
    onSuccess?: () => void,
  ) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setFailure(null)
    try {
      await request()
      onSuccess?.()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired()
        return
      }
      setFailure({
        action,
        message: err instanceof ApiError ? toMessage(err.code) : NETWORK_ERROR_MESSAGE,
        occurredAt: new Date(),
      })
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  // 問題データの投入(#110)。件数・行番号つきの詳細を画面に残す必要があり、
  // 「失敗時にだけ failure を出す」共通処理(run)とは形が違うので専用に書く。
  // ただし排他ロック(inFlight/busy)は run と共有する(上のコメント参照)
  const handleImport = async (questionsToImport: QuestionImport[]) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setImportError(null)
    setImportIssues([])
    try {
      const imported = await putQuestions(questionsToImport)
      setImportResult(imported)
      // 全置換で id が採番し直されるので、取り直す前に古い一覧をすぐ無効化する。
      // (残したままだと、再取得が終わる前や失敗したときに、旧idの問題を選択・出題できてしまい、
      //  もう存在しないidを show-question に送って 404 になる)
      setQuestions(null)
      setSelectedId(null)
      refreshQuestions() // 問題一覧を取り直す
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired()
        return
      }
      // importResult はここでは消さない。全置換は失敗時ノーオペなので、
      // 直前の成功結果(最終投入日時・件数)は今も有効な情報のまま
      // (→ API仕様書 §3.5「管理者画面には最終投入日時と件数も表示する」)
      //
      // ここでは toImportMessage(code) の結果だけを持つ(「〇〇に失敗しました」の
      // 組み立ては表示側の ImportPanel に任せる。ErrorBanner と同じ分担)
      if (err instanceof ApiError) {
        setImportError(toImportMessage(err.code))
        // 不正な行は details にまとめて入っている。
        // 1件ずつ直して送り直さずに済むよう、返ってきた全件をそのまま並べる(→ API仕様書 §3.5.3)
        setImportIssues(err.details)
      } else {
        setImportError(NETWORK_ERROR_MESSAGE)
      }
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }

  const handleVideoUpload = async () => {
    if (inFlight.current || videoFile === null) return
    inFlight.current = true
    setBusy(true)
    setVideoBusy(true)
    setVideoConfirming(false)
    setVideoError(null)
    try {
      const result = await uploadVideo(videoFile)
      setVideoUrl(result.videoUrl)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired()
        return
      }
      setVideoError(err instanceof ApiError ? toVideoMessage(err) : NETWORK_ERROR_MESSAGE)
    } finally {
      inFlight.current = false
      setBusy(false)
      setVideoBusy(false)
    }
  }

  const remainingSec =
    state.phase === 'question' && state.timeLimitSec !== null ? remainingTime : null
  // ShowQuestionForm は id ではなく QuestionListItem そのものを欲しがる(問題文・出題済みの警告表示に使うため)
  const selectedQuestion = questions?.find((q) => q.id === selectedId) ?? null
  // 管理者向け state には joinUrl が無い。同一サイトの参加者画面は / なので、
  // QRを含むモニタ本体の表示部品へ渡すURLだけ、ここで明示的に補う。
  const participantUrl = new URL('/', window.location.href).toString()

  return (
    <div className="flex flex-col gap-6">
      {/* Figmaの配置(左: 出題中の問題/選択中の問題2枚、中央: 問題一覧、右: 各画面プレビュー/操作パネル)を
          CSS Gridで組む。1024px未満(lg未満)は grid-cols-1 に落ちて縦一列になる(#118 受け入れ条件)。
          各パネル自体のマークアップ(w-full max-w-[440px]の card 等)は変更していない。
          ここではラップした div の側で列・行を指定するだけにとどめる。 */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-start-1 lg:row-start-1">
          <CurrentStatus state={state} status={toStatus(state, remainingSec)} />
        </div>

        <div className="lg:col-start-2 lg:col-span-2 lg:row-start-1">
          <ScreenPreviewPanel state={state} joinUrl={participantUrl} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <SelectedQuestion {...selectedQuestionState} />
        </div>

        {/* 進行ボタン(出題操作)は当日3秒以内に押せる必要があるため、
            問題一覧・操作パネルと横並びの位置(スクロール不要な高さ)に置く */}
        <div className="lg:col-start-1 lg:row-start-3">
          <ShowQuestionForm
            selected={selectedQuestion}
            currentQuestionId={state.phase === 'question' ? (state.question?.id ?? null) : null}
            timeLimitInput={timeLimitInput}
            busy={busy}
            onTimeLimitInputChange={setTimelimitInput}
            onSubmit={(id, sec) =>
              run(ACTION_LABEL.showQuestion, () => showQuestion(id, sec), refreshQuestions)
            }
          />
        </div>

        <div className="overflow-x-auto lg:col-start-2 lg:row-span-2 lg:row-start-2">
          {questionListError !== null && <p>{questionListError}</p>}
          {questions !== null && (
            <QuestionList
              items={questions}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id)
                setRetryCount(0) // 選び直したら、前の問題のリトライ回数を引き継がない
              }}
              currentQuestionId={state.question?.id ?? null}
            />
          )}
        </div>

        <div className="lg:col-start-3 lg:row-span-2 lg:row-start-2">
          <ControlPanel
            state={state}
            remainingSec={remainingSec}
            busy={busy}
            onAdvanceText={() => run(ACTION_LABEL.advanceText, advanceText)}
            onShowAnswer={() => run(ACTION_LABEL.showAnswer, showAnswer)}
            onRevival={(to) =>
              run(to === 'video' ? ACTION_LABEL.revivalVideo : ACTION_LABEL.revivalEntry, () =>
                revival(to),
              )
            }
            onReset={(to) =>
              run(
                to == 'finished' ? ACTION_LABEL.resetFinished : ACTION_LABEL.resetWaiting,
                () => reset(to),
                refreshQuestions,
              )
            }
          />
        </div>
      </div>

      <ErrorBanner failure={failure} onDismiss={() => setFailure(null)} />

      {/* 貼り付け投入・画像投入・動画投入は準備作業なので、進行ボタンより下に
          横並びで置く(#118)。1024px未満は縦一列に落ちる。 */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <ImportPanel
          phase={state.phase}
          input={importInput}
          busy={busy}
          result={importResult}
          error={importError}
          issues={importIssues}
          onInputChange={setImportInput}
          onSubmit={(questionsToImport) => void handleImport(questionsToImport)}
        />
        <ImagePanel onAuthExpired={onAuthExpired} />
        <RevivalVideoPanel
          file={videoFile}
          busy={videoBusy}
          disabled={busy}
          confirming={videoConfirming}
          error={videoError}
          videoUrl={videoUrl}
          onFileChange={(file) => {
            setVideoFile(file)
            setVideoError(null)
          }}
          onSubmit={() => setVideoConfirming(true)}
          onConfirm={() => void handleVideoUpload()}
          onCancel={() => setVideoConfirming(false)}
        />
      </div>
      {/*ここからは、以降のイシューで足していく */}
    </div>
  )
}

// 会場に出ている状態を決める。バッジを出さないときは null を返す
function toStatus(state: AdminState, remainingSec: number | null): AdminStatus | null {
  if (state.phase === 'answer') return 'answer'
  if (state.phase !== 'question') return null
  // 制限時間なしの時はずっと受付中
  // 其れ以外の時で、0の時だけ締め切る
  return remainingSec === 0 ? 'closed' : 'accepting'
}
