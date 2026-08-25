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
  'bg-surface',
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
  'text-timelimit',
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
  'text-p-timelimit',
] as const

const ADMIN_TEXT = [
  'text-admin-func-label',
  'text-admin-func-label-l',
  'text-admin-header',
  'text-admin-header-alt',
  'text-admin-list-label',
  'text-admin-pre-timelimit',
  'text-admin-timelimit',
] as const

// 「そのクラスが本当に効いているか」は React の状態ではなく、
// ブラウザが計算したスタイル(CSSOM)の側にしかない。
//
// ここで useEffect + setState を使うと、測った値を state に入れるために
// 再レンダリングが毎回1回余分に走る(react-hooks/set-state-in-effect)。
// 測った値は「表示するだけ」で React 側の判断には使わないので、
// ref コールバックで測って、その場で表示用の要素に書き込む。state を経由しない。
const COLOR_PROPS = ['background-color']
const COLOR_LABELS = ['']
const TEXT_PROPS = ['font-size', 'line-height', 'font-weight', 'letter-spacing']
const TEXT_LABELS = ['', '行間 ', 'weight ', '字間 ']

// root の中の [data-sample] を測り、結果を [data-label] に書き込む ref コールバックを作る。
// モジュールの最上位で1度だけ作ること。描画のたびに作り直すと、
// React が ref を付け外しして毎回測り直しになる。
function measureInto(props: readonly string[], labels: readonly string[]) {
  return (root: HTMLElement | null) => {
    if (!root) return
    const sample = root.querySelector<HTMLElement>('[data-sample]')
    const label = root.querySelector<HTMLElement>('[data-label]')
    if (!sample || !label) return

    const style = getComputedStyle(sample)
    label.textContent = props
      .map((prop, i) => `${labels[i] ?? ''}${style.getPropertyValue(prop)}`)
      .join(' / ')
  }
}

const measureColor = measureInto(COLOR_PROPS, COLOR_LABELS)
const measureText = measureInto(TEXT_PROPS, TEXT_LABELS)

function ColorSection() {
  return (
    <section className="mb-16">
      <h2 className="text-instruction mb-1">色（{COLOR_CLASSES.length}）</h2>
      <p className="text-message-s mb-4">
        四角に色が付いていれば、そのクラスは生成されている。 白いままなら index.css
        に変数が無いか、名前を間違えている。
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {COLOR_CLASSES.map((cls) => (
          <div
            key={cls}
            ref={measureColor}
            className="border-border-soft overflow-hidden rounded border"
          >
            <div data-sample className={`${cls} h-16 w-full`} />
            <div className="p-2">
              <code className="text-message-s block">{cls}</code>
              {/* 中身は measureColor が書き込む。React 側の子は持たせない
                  （持たせると再描画で書き戻されることがある） */}
              <code data-label className="text-message-s block opacity-60" />
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
  return (
    <section className="mb-16">
      <h2 className="text-instruction mb-1">
        {title}（{classes.length}）
      </h2>
      <p className="text-message-s mb-4">{note}</p>

      <div className="flex flex-col gap-4">
        {classes.map((cls) => (
          <div key={cls} ref={measureText} className="border-border-soft border-b pb-3">
            <div className="text-message-s mb-1 opacity-60">
              <code>{cls}</code>
              <span data-label className="ml-3" />
            </div>
            {/* トークンだけを当てる。font-bold などを足さないこと（太さが上書きされる） */}
            <p data-sample className={`${cls} text-brand`}>
              技大祭クイズ AaBbCc 0123
            </p>
          </div>
        ))}
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
