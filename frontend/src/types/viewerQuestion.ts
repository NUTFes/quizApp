import type { Choice } from './choice'
import type { QuestionType } from './questionType'

export type ViewerQuestion = {
  number: number
  type: QuestionType
  textSegments: string[]
  imageUrl: string | null
  choices: Choice[]
}
