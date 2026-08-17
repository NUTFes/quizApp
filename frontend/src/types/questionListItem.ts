import type { Difficulty } from './difficulty'
import type { QuestionType } from './questionType'

export type QuestionListItem = {
  id: number
  number: number
  type: QuestionType
  difficulty: Difficulty
  textPreview: string
  hasImage: boolean
  asked: boolean
}
