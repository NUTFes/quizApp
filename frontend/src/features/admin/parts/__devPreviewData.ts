// /dev/admin のプレビュー専用の架空データ。
//
// 通信の失敗時に出てくるものではない(props に直接渡すだけ)。
import type { QuestionListItem } from '../../../types'

export const DEV_QUESTION_LIST: QuestionListItem[] = [
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
    asked: true, // 出題済みの見え方を確認するため
  },
]
