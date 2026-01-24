import QRCode from 'qrcode'

/**
 * Gera QR Code em formato DataURL (base64)
 */
export async function gerarQRCode(
  data: string,
  size: number = 200
): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M'
    })
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error)
    throw error
  }
}

/**
 * Decodifica o conteúdo de um QR Code
 * Usado na correção automática
 */
export function decodificarQRCode<T = any>(conteudo: string): T {
  try {
    return JSON.parse(conteudo)
  } catch (error) {
    console.error('Erro ao decodificar QR Code:', error)
    throw new Error('QR Code inválido ou corrompido')
  }
}
