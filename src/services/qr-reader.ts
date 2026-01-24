import { Html5Qrcode } from 'html5-qrcode'

export async function iniciarQR(
  elementId: string,
  onSuccess: (text: string) => void
) {
  const leitor = new Html5Qrcode(elementId)

  await leitor.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    onSuccess,
    () => {}
  )

  return leitor
}
