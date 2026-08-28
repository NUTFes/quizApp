import { QRCodeSVG } from 'qrcode.react'

type MonitorQrCodeProps = {
  url: string
  size: number
  alt: string
}

export function MonitorQrCode({ url, size, alt }: MonitorQrCodeProps) {
  return <QRCodeSVG value={url} size={size} level="M" title={alt} />
}
