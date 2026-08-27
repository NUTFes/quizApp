import monitorQrCode from '../../../assets/monitor-qr-code.png'

type MonitorQrCodeProps = {
  alt: string
}

export function MonitorQrCode({ alt }: MonitorQrCodeProps) {
  return (
    <div className="flex size-[668px] shrink-0 items-center justify-center overflow-hidden rounded-[80px] bg-canvas p-12">
      <img src={monitorQrCode} alt={alt} className="size-[572px] object-contain" />
    </div>
  )
}
