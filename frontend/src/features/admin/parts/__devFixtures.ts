// 開発用の仮データ。
//
// GET /api/admin/questions(イシュー #80)がまだ実装されていないため、
// 一覧まわりの画面を作る間だけ、404 のときにこれを使う(→ OperationPanel)。
// APIが入ったらこのファイルごと消すこと。
//
// 🚫 本番の問題データ・正答は絶対に置かない。このリポジトリは公開されている。
//    ここに置くのは架空の問題だけ。
import type { QuestionListItem } from '../../../types'

export const DEV_QUESTIONS: QuestionListItem[] = [
  {
    id: 1,
    number: 1,
    type: 'four_choice',
    difficulty: 'easy',
    textPreview: '【仮データ】長岡技術科学大学が開学したのは何年でしょう',
    hasImage: false,
    asked: false,
  },
  {
    id: 2,
    number: 2,
    type: 'two_choice',
    difficulty: 'normal',
    textPreview: '【仮データ】技大祭の来場者数は1万人を超えたことがある',
    hasImage: true,
    asked: false,
  },
  {
    id: 3,
    number: 3,
    type: 'arunashi',
    difficulty: 'hard',
    textPreview: '【仮データ】ある・なしクイズ。共通するきまりは何でしょう',
    hasImage: false,
    asked: true,
  },
]
