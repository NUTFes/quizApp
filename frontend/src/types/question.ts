import type { QuestionType, Difficulty, Choice } from "../types"

export type Question  = {
  id: number,
  number: number,
  type: QuestionType,
  difficulty: Difficulty,
  textSegments: string[],
  imageUrl: string | null,
  choices: Choice[],
  correctChoiceId: string | null,
  explanation: string | null,
  asked: boolean
}