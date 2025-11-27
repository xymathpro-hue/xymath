'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button, Input, Card } from '@/components/ui'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const { signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    const { error } = await signUp(email, password, nome)
    
    if (error) {
      setError(error.message || 'Erro ao criar conta')
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="w-full max-w-md">
          <Card variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta criada!</h2>
            <p className="text-gray-600 mb-6">
              Enviamos um email de confirmação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada para ativar sua conta.
            </p>
            <Link href="/login">
              <Button className="w-full">Ir para Login</Button>
            </Link>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">xy</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">xyMath</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Crie sua conta
          </h1>
          <p className="mt-2 text-gray-600">
            Comece a criar simulados em minutos
          </p>
        </div>

        {/* Form */}
        <Card variant="elevated" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Crie uma senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirme sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>

            <div className="text-sm text-gray-600">
              <label className="flex items-start gap-2">
                <input 
                  type="checkbox" 
                  className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                  required
                />
                <span>
                  Concordo com os{' '}
                  <Link href="/termos" className="text-indigo-600 hover:text-indigo-700">
                    Termos de Uso
                  </Link>
                  {' '}e{' '}
                  <Link href="/privacidade" className="text-indigo-600 hover:text-indigo-700">
                    Política de Privacidade
                  </Link>
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Criar conta
            </Button>
          </form>
        </Card>

        {/* Login link */}
        <p className="mt-6 text-center text-gray-600">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  )
}
