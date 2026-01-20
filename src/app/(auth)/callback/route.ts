import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Se é recovery, vai para nova-senha
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/nova-senha`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fallback para login
  return NextResponse.redirect(`${origin}/login`)
}
