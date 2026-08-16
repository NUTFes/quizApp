import { Choice } from "./choice"

export type Question  = {
  id: number,
  number: number,
  type: 'four_choice' | 'two_choice' | 'arunashi' | 'hayaoshi',
  difficulty: 'easy' | 'normal' | 'hard',
  textSegments: string[],
  imageUrl: string | null,
  choices: Choice[],
  correctChoiceId: string,
  explanation: string | null,
  asked: boolean
}