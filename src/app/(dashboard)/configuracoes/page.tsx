'use client'

import { useState } from 'react'
import { Card, CardContent, Button, Input } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase-browser'
import { Settings, User, School, Save, Check } from 'lucide-react'

export default function ConfiguracoesPage() {
  const { usuario } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [formData, setFormData] = useState({ nome: usuario?.nome || '', escola: usuario?.escola || '' })
  const supabase = createClient()

  const handleSave = async () => {
    if (!usuario) return
    setLoading(true)
    setSaved(false)
    const { error } = await supabase.from('usuarios').update({ nome: formData.nome, escola: formData.escola }).eq('id', usuario.id)
    setLoading(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie suas preferências e dados da conta</p>
      </div>
      <Card><CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-blue-100 rounded-lg"><User className="w-6 h-6 text-blue-600" /></div><div><h2 className="text-lg font-semibold">Dados do Perfil</h2><p className="text-sm text-gray-600">Informações da sua conta</p></div></div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label><Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Seu nome" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><Input value={usuario?.email || ''} disabled className="bg-gray-50" /><p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Escola</label><Input value={formData.escola} onChange={(e) => setFormData({ ...formData, escola: e.target.value })} placeholder="Nome da sua escola" /></div>
          <div className="pt-4"><Button onClick={handleSave} disabled={loading}>{loading ? <span className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Salvando...</span> : saved ? <span className="flex items-center gap-2"><Check className="w-4 h-4" />Salvo!</span> : <span className="flex items-center gap-2"><Save className="w-4 h-4" />Salvar alterações</span>}</Button></div>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-purple-100 rounded-lg"><Settings className="w-6 h-6 text-purple-600" /></div><div><h2 className="text-lg font-semibold">Informações da Conta</h2><p className="text-sm text-gray-600">Detalhes técnicos</p></div></div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b"><span className="text-gray-600">ID do usuário</span><span className="font-mono text-gray-900">{usuario?.id?.slice(0, 8)}...</span></div>
          <div className="flex justify-between py-2 border-b"><span className="text-gray-600">Membro desde</span><span className="text-gray-900">{usuario?.created_at ? new Date(usuario.created_at).toLocaleDateString('pt-BR') : '-'}</span></div>
          <div className="flex justify-between py-2"><span className="text-gray-600">Plano</span><span className="text-green-600 font-medium">Gratuito</span></div>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6"><div className="p-2 bg-green-100 rounded-lg"><School className="w-6 h-6 text-green-600" /></div><div><h2 className="text-lg font-semibold">Sobre o xyMath</h2><p className="text-sm text-gray-600">Plataforma de avaliações</p></div></div>
        <div className="text-sm text-gray-600 space-y-2"><p>O xyMath é uma plataforma gratuita para professores criarem simulados de Matemática, com correção por QR Code e análise de resultados.</p><p className="pt-2 text-gray-500">Versão 1.0.0</p></div>
      </CardContent></Card>
    </div>
  )
}
