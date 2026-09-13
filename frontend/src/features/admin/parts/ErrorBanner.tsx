import { ActionLabel } from '../labels'

export type OperationFailure = {
  // ボタン操作で失敗したとき、どのボタンが失敗したかの形式
  action: ActionLabel
  message: string
  occurreAt: Date
}
