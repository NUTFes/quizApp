import { Choice } from './choice'
import { QuestionType } from './questionType'

export type ViewerQuestion = {
  number: number
  type: QuestionType
  textSegments: string[]
  imageUrl: string | null
  choices: Choice[]
}
