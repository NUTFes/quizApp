import type { AdminState } from '../../../types'
import { useRemainingTime } from '../../../lib/useRemainingTime'
import { difficultyLabel, phaseLabel, questionTypeLabel } from '../labels'

type Props = { state: AdminState }

// 今モニタとスマホに出ているものを、裏方が確認するための表示。
//
// 管理者にだけ correctChoiceId と全セグメントが届く(→ 画面・要件.md §7)。
// 正誤判定は人力なので、裏方が正答を見られること自体が当日の必須機能。
export function CurrentStatus({ state }: Props) {
  // 残り時間はサーバーから秒数が来ない。serverTime との時計ずれを補正して自分で数える
  const remainingTime = useRemainingTime({
    serverTime: state.serverTime,
    timeLimitSec: state.timeLimitSec,
    questionStartedAt: state.questionStartedAt,
  })
  const question = state.question

  return (
    <section>
      <h2>現在の状況</h2>
      <p>
        局面 : {phaseLabel(state.phase)} / 第{state.askedCount}問
      </p>
      {state.phase === 'question' && (
        // 0秒になっても勝手に正答へは進まない。締切表示に変わるだけ(→ 画面・要件.md §4)
        <p>
          残り {remainingTime} 秒{remainingTime === 0 && '(締切表示中)'}
        </p>
      )}
      {question === null ? (
        <p>表示中の問題はありません</p>
      ) : (
        <div>
          <p>
            第{question.number}問 / {questionTypeLabel(question.type)} /{' '}
            {difficultyLabel(question.difficulty)}
          </p>
          <p>
            問題文の公開 : {state.revealedSegments} / {state.totalSegments} 区切り
          </p>
          <ol>
            {question.textSegments.map((segment, index) => (
              // まだモニタに出ていない区切りは、裏方が読み上げを先走らないように印を付ける
              <li key={`${index}-${segment}`}>
                {segment}
                {index >= state.revealedSegments && '(未公開)'}
              </li>
            ))}
          </ol>
          <p>
            正答 : {question.correctChoiceId ?? '未設定'}
            {state.phase !== 'answer' && '(まだモニタには出ていません)'}
          </p>
          <ul>
            {question.choices.map((choice) => (
              <li key={choice.id}>
                {choice.id} : {choice.text}
                {choice.id === question.correctChoiceId && ' ← 正答'}
              </li>
            ))}
          </ul>
          {question.explanation !== null && <p>解説 : {question.explanation}</p>}
        </div>
      )}
    </section>
  )
}
