import { Html5Qrcode } from 'html5-qrcode'

export interface QRPayload {
  s: string
  a: string
  t?: string
  m?: string
}

let scanner: Html5Qrcode | null = null

export async function iniciarLeitorQR(
  elementId: string,
  onSuccess: (payload: QRPayload) => void,
  onError?: () => void
) {
  scanner = new Html5Qrcode(elementId)

  await (scanner.start as any)(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    (decodedText: string) => {
      try {
        const payload = JSON.parse(decodedText) as QRPayload
        onSuccess(payload)
        scanner?.stop().catch(() => {})
      } catch {
        onError?.()
      }
    },
    () => {}
  )
}

export async function pararLeitorQR() {
  await scanner?.stop().catch(() => {})
  scanner = null
}

