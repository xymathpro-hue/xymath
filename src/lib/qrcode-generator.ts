import QRCode from 'qrcode'

/**
 * Gera um QR Code em base64 (DataURL)
 */
export async function gerarQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: 200,
      margin: 1,
      errorCorrectionLevel: 'M'
    })
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error)
    throw error
  }
}
