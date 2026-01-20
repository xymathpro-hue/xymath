'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { Button, Input, Card } from '@/components/ui'
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function NovaSenhaPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [checking, setChecking] = useState(true)
  const [sessionReady, setSessionReady] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (token_hash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'recovery',
        })

        if (!error) {
          setSessionReady(true)
          setChecking(false)
          return
        }
        
        console.log('Erro ao verificar token:', error)
      }

      // Também escuta eventos de auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          setSessionReady(true)
          setChecking(false)
        }
      })

      // Timeout
      setTimeout(() => {
        setChecking(false)
      }, 3000)

      return () => subscription.unsubscribe()
    }

    verifyToken()
  }, [supabase, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      setError('Erro ao atualizar senha. O link pode ter expirado.')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">xy</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">xyMath</span>
            </Link>
          </div>

          <Card variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Senha atualizada!
            </h1>
            <p className="text-gray-600 mb-6">
              Sua senha foi alterada com sucesso. Você será redirecionado para o login...
            </p>
            <Link href="/login">
              <Button className="w-full">
                Ir para o login
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">xy</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">xyMath</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Criar nova senha
          </h1>
          <p className="mt-2 text-gray-600">
            Digite sua nova senha abaixo
          </p>
        </div>

        <Card variant="elevated" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
                <Link href="/recuperar-senha" className="block mt-2 text-indigo-600 hover:text-indigo-700 font-medium">
                  Solicitar novo link
                </Link>
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 text-gray-900 placeholder:text-gray-400"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirmar nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 text-gray-900 placeholder:text-gray-400"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <p className="text-sm text-gray-500">
              A senha deve ter pelo menos 6 caracteres
            </p>

            <Button type="submit" className="w-full" loading={loading}>
              Atualizar senha
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center">
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
