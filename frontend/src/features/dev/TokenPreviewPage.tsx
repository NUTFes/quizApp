// デザイントークンの確認用ページ（開発時のみ / パス: /dev）
//
// index.css の @theme に定義したトークンが、
// 「Tailwind のクラスとして本当に生成され、画面に当たるか」を目で確かめるための画面。
// npm run build が通ることは CSS の構文が壊れていないことしか示さないので、これで補う。
//
// 【重要】クラス名は必ず文字列リテラルで書くこと。
// Tailwind はソースを文字列として走査してクラスを生成するので、
// `bg-${name}` のように組み立てた名前は生成されず、色が当たらない。
// このファイルが縦に長いのはそのためで、短くしようとすると壊れる。
import { useEffect, useState } from 'react'

const COLOR_CLASSES = [
  'bg-accent',
  'bg-accepting-answer',
  'bg-batsu',
  'bg-border-soft',
  'bg-brand',
  'bg-canvas',
  'bg-choice-a',
  'bg-choice-b',
  'bg-choice-c',
  'bg-choice-d',
  'bg-closed-answer',
  'bg-info',
  'bg-live',
  'bg-maru',
  'bg-surface'
] as const

const PHONE_TEXT = [
  'text-area-label',
  'text-arunashi-label',
  'text-cand-question',
  'text-choice-arunashi-example',
  'text-choice-body',
  'text-choice-id',
  'text-correct-body',
  'text-correct-body-exp',
  'text-correct-id',
  'text-correct-id-exp',
  'text-correct-label',
  'text-count-number',
  'text-current-question',
  'text-device-label',
  'text-explanation',
  'text-header',
  'text-instruction',
  'text-instruction-alt',
  'text-instruction-alt-black',
  'text-link',
  'text-list-question',
  'text-login-button',
  'text-message-l',
  'text-message-m',
  'text-message-s',
  'text-message-xl',
  'text-notes',
  'text-pre-answer',
  'text-pre-answer-exp',
  'text-pre-show-question',
  'text-pw-offset',
  'text-question-arunashi-example',
  'text-question-body',
  'text-status-answer',
  'text-timelimit'
] as const

const MONITOR_TEXT = [
  'text-p-answer',
  'text-p-area-label',
  'text-p-arunashi-label',
  'text-p-choice-arunashi-example',
  'text-p-choice-body',
  'text-p-choice-id',
  'text-p-correct-body',
  'text-p-correct-id',
  'text-p-correct-label',
  'text-p-count-number',
  'text-p-count-number-alt',
  'text-p-header',
  'text-p-instruction',
  'text-p-instruction-alt',
  'text-p-message-l',
  'text-p-message-m',
  'text-p-message-xl',
  'text-p-message-xxl',
  'text-p-note',
  'text-p-pre-timelimit',
  'text-p-question-arunashi-example',
  'text-p-question-body',
  'text-p-question-body-l',
  'text-p-question-body-m',
  'text-p-status-answer',
  'text-p-timelimit'
] as const

const ADMIN_TEXT = [
  'text-admin-func-label',
  'text-admin-func-label-l',
  'text-admin-header',
  'text-admin-header-alt',
  'text-admin-list-label',
  'text-admin-pre-timelimit',
  'text-admin-timelimit'
] as const

// getComputedStyle で読む項目。useEffect の依存に入るので、
// 呼び出しのたびに新しい配列ができないよう定数にしておく。
const COLOR_PROPS = ['background-color']
const TEXT_PROPS = ['font-size', 'line-height', 'font-weight', 'letter-spacing']

// 実際に描画された要素から計算後の値を読む。
// index.css を目で読むのではなく、ブラウザが解決した結果を出すことに意味がある。
function useComputed(selector: string, props: readonly string[]) {
  const [rows, setRows] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    const next: Record<string, Record<string, string>> = {}
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const key = el.dataset.token
      if (!key) continue
      const style = getComputedStyle(el)
      next[key] = Object.fromEntries(props.map((p) => [p, style.getPropertyValue(p)]))
    }
    setRows(next)
  }, [selector, props])

  return rows
}

function ColorSection() {
  const computed = useComputed('[data-kind="color"]', COLOR_PROPS)

  return (
    <section className="mb-16">
      <h2 className="text-instruction mb-1">色（{COLOR_CLASSES.length}）</h2>
      <p className="text-message-s mb-4">
        四角に色が付いていれば、そのクラスは生成されている。
        白いままなら index.css に変数が無いか、名前を間違えている。
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {COLOR_CLASSES.map((cls) => (
          <div key={cls} className="border border-border-soft rounded overflow-hidden">
            <div data-kind="color" data-token={cls} className={`${cls} h-16 w-full`} />
            <div className="p-2">
              <code className="text-message-s block">{cls}</code>
              <code className="text-message-s block opacity-60">
                {computed[cls]?.['background-color'] ?? '—'}
              </code>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function TextSection({
  title,
  note,
  classes,
}: {
  title: string
  note: string
  classes: readonly string[]
}) {
  const computed = useComputed(`[data-kind="${title}"]`, TEXT_PROPS)

  return (
    <section className="mb-16">
      <h2 className="text-instruction mb-1">
        {title}（{classes.length}）
      </h2>
      <p className="text-message-s mb-4">{note}</p>

      <div className="flex flex-col gap-4">
        {classes.map((cls) => {
          const c = computed[cls]
          return (
            <div key={cls} className="border-b border-border-soft pb-3">
              <div className="text-message-s opacity-60 mb-1">
                <code>{cls}</code>
                {c && (
                  <span className="ml-3">
                    {c['font-size']} / 行間 {c['line-height']} / weight {c['font-weight']} / 字間{' '}
                    {c['letter-spacing']}
                  </span>
                )}
              </div>
              {/* トークンだけを当てる。font-bold などを足さないこと（太さが上書きされる） */}
              <p data-kind={title} data-token={cls} className={`${cls} text-brand`}>
                技大祭クイズ AaBbCc 0123
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FontSection() {
  return (
    <section className="mb-16">
      <h2 className="text-instruction mb-1">書体</h2>
      <p className="text-message-s mb-4">
        <code>--font-zen-kaku-gothic-new</code> は @theme に名前だけ定義してある。
        フォントファイルはまだ読み込んでいないので、下の2行は今は同じに見えるのが正しい。
        配信方法が決まったら、ここで差が出るようになる。
      </p>
      <p className="text-message-l text-brand">既定の書体で表示した見本</p>
      <p className="text-message-l text-brand font-zen-kaku-gothic-new">
        font-zen-kaku-gothic-new を当てた見本
      </p>
    </section>
  )
}

export default function TokenPreviewPage() {
  return (
    <div className="bg-canvas min-h-screen">
      <div className="mx-auto max-w-5xl p-8">
        <h1 className="text-p-header text-brand mb-2">デザイントークン確認ページ</h1>
        <p className="text-message-m mb-2">
          <code>frontend/src/index.css</code> の @theme が、Tailwind のクラスとして
          実際に生成されているかを確認する画面。開発ビルドでのみ表示される。
        </p>
        <p className="text-message-s mb-12">
          使い方は <code>dev_policy/デザイントークンの使い方.md</code> を参照。
        </p>

        <ColorSection />
        <FontSection />
        <TextSection
          title="スマホ"
          note="接頭辞なし。#18 の担当者はこれを使う。"
          classes={PHONE_TEXT}
        />
        <TextSection
          title="モニタ"
          note="接頭辞 p-（Presentation）。遠くから見る前提で桁が大きい。#19 の担当者はこれを使う。"
          classes={MONITOR_TEXT}
        />
        <TextSection
          title="管理"
          note="接頭辞 admin-。#20 の担当者はこれを使う。"
          classes={ADMIN_TEXT}
        />
      </div>
    </div>
  )
}
