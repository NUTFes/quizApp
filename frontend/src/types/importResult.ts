export type ImportResult = {
  imported: number
  importedAt: string
  warnings: {
    sourceRow: number
    reason: string
  }[]
}
