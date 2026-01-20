import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Se veio do reset de senha, redireciona para nova-senha
      const redirectTo = searchParams.get('redirect_to') || searchParams.get('type') === 'recovery' 
        ? '/nova-senha' 
        : next
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  // Se falhou, redireciona para página de erro ou login
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
