import { QRCodeSVG } from 'qrcode.react'

type MonitorQrCodeProps = {
  joinUrl: string
  size: number
  alt: string
}

export function MonitorQrCode({ joinUrl, size, alt }: MonitorQrCodeProps) {
  return <QRCodeSVG value={joinUrl} size={size} level="M" title={alt} />
}
