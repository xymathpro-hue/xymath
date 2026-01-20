'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-browser'
import { Button, Input, Card } from '@/components/ui'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    
    if (error) {
      setError('Erro ao enviar email. Verifique se o email está correto.')
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  // Tela de sucesso após envio do email
  if (success) {
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
          </div>

          <Card variant="elevated" className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Email enviado!
            </h1>
            <p className="text-gray-600 mb-6">
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao login
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
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">xy</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">xyMath</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Recuperar senha
          </h1>
          <p className="mt-2 text-gray-600">
            Digite seu email para receber o link de recuperação
          </p>
        </div>

        {/* Form */}
        <Card variant="elevated" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Enviar link de recuperação
            </Button>
          </form>
        </Card>

        {/* Back to login */}
        <p className="mt-6 text-center">
          <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}
