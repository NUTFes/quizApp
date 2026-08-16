import { Choice } from "./choice"
import { Difficulty } from "./difficulty"

export type Question  = {
  id: number,
  number: number,
  type: 'four_choice' | 'two_choice' | 'arunashi' | 'hayaoshi',
  difficulty: Difficulty,
  textSegments: string[],
  imageUrl: string | null,
  choices: Choice[],
  correctChoiceId: string,
  explanation: string | null,
  asked: boolean
}