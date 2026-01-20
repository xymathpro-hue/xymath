import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Se é recovery, redireciona para nova-senha com os parâmetros
  if (type === 'recovery' && token_hash) {
    return NextResponse.redirect(`${origin}/nova-senha?token_hash=${token_hash}&type=${type}`)
  }

  // Fallback para login
  return NextResponse.redirect(`${origin}/login`)
}
