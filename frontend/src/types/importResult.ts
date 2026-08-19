import type { RowIssue } from "./rowIssue"

export type ImportResult = {
  imported: number
  importedAt: string
  warnings: RowIssue[]
}
