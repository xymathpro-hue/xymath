// ===============================
// EXPORTAÇÕES CENTRALIZADAS - LIB
// ===============================

// Supabase
export { createClient as createBrowserClient } from './supabase-browser'
export { createClient as createServerClient } from './supabase-server'

// Documentos
export { gerarProvaWord } from './gerar-prova-word'
export { exportGabaritoPDF } from './export-document'
export {
  gerarFolhasRespostas,
  gerarFolhasRespostasGrande
} from './gerar-folha-respostas'

// QR Code
export {
  gerarQRCode,
  decodificarQRCode
} from './qrcode-generator'

// Dados e constantes
export * from './bncc-data'
export * from './constants'
