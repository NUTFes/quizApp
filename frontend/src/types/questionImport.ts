import type { Choice } from './choice'
import type { Difficulty } from './difficulty'
import type { QuestionType } from './questionType'

export type QuestionImport = {
  sourceRow: number
  number: number
  type: QuestionType
  difficulty: Difficulty
  textSegments: string[]
  imageUrl: string | null
  choices: Choice[]
  correctChoiceId: string
  explanation: string | null
}
