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
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'recovery' | 'email',
    })

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nova-senha`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Se tem code (OAuth ou magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nova-senha`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fallback para login
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
