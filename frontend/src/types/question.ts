import { Choice } from "./choice"
import { Difficulty } from "./difficulty"
import { QuestionType } from "./questionType"

export type Question  = {
  id: number,
  number: number,
  type: QuestionType,
  difficulty: Difficulty,
  textSegments: string[],
  imageUrl: string | null,
  choices: Choice[],
  correctChoiceId: string,
  explanation: string | null,
  asked: boolean
}