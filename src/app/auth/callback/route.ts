import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  const supabase = await createClient()

  // Se tem token_hash (vindo do email)
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })

    if (!error) {
      return NextResponse.redirect(`${origin}/nova-senha`)
    }
    
    // Log do erro para debug
    console.log('Erro verifyOtp:', error)
  }

  // Se tem code (OAuth ou magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se é recovery mas falhou, ainda tenta ir para nova-senha
  // pois o token pode ser processado no client-side
  if (type === 'recovery' && token_hash) {
    return NextResponse.redirect(`${origin}/nova-senha?token_hash=${token_hash}`)
  }

  // Fallback para login
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
