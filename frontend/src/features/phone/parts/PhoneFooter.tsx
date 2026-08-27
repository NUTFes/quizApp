type PhoneFooterProps = {
  footMessage?: string
}

export function PhoneFooter({ footMessage = '第45回 技大祭実行委員会' }: PhoneFooterProps) {
  return (
    <footer className="w-full">
      <div className="px-2.5 pt-8 text-center text-notes">{footMessage}</div>
    </footer>
  )
}
