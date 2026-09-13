import { QuestionListItem } from '../../../types'

type Props = {
  items: QuestionListItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  currentQuestionId: number | null
  disavles: boolean
}
