'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  FileText, 
  ClipboardList, 
  BarChart3, 
  BookOpen,
  LogOut,
  Menu,
  X,
  Library,
  Clock,
  Flame,
  FileUp,
  PieChart,
  Shield,
  Bell,
  FileSpreadsheet,
  Calculator,
  Calendar,
  ScanLine,
  Target,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  FileEdit
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

// 🏠 ITENS PRINCIPAIS (sempre visíveis)
const mainItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/minha-semana', label: 'Minha Semana', icon: Calendar },
  { href: '/alertas', label: 'Alertas', icon: Bell },
]

// 👥 GESTÃO ESSENCIAL
const gestaoItems = [
  { href: '/turmas', label: 'Turmas', icon: Users },
  { href: '/alunos', label: 'Alunos', icon: GraduationCap },
  { href: '/atividades', label: 'Atividades', icon: ClipboardList },
  { href: '/notas', label: 'Notas', icon: Calculator },
]

// 📚 CONTEÚDO
const conteudoItems = [
  { href: '/questoes', label: 'Banco de Questões', icon: BookOpen },
  { href: '/biblioteca-bncc', label: 'Biblioteca BNCC', icon: Library },
]

// 🎯 MÉTODO BASE (NOVO - usando as páginas que criamos)
const metodoBaseItems = [
  { href: '/base/turmas', label: 'Minhas Turmas', icon: GraduationCap },
  { href: '/base/dashboard/11111111-1111-1111-1111-111111111111', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/base/avaliacoes/11111111-1111-1111-1111-111111111111', label: 'Avaliações', icon: ClipboardList },
  { href: '/base/atividades/11111111-1111-1111-1111-111111111111', label: 'Atividades', icon: FileEdit },
  { href: '/base/heat-map/11111111-1111-1111-1111-111111111111', label: 'Heat Map', icon: Flame },
  { href: '/base/notas/calcular/11111111-1111-1111-1111-111111111111', label: 'Calcular Notas', icon: Calculator },
]

// ➕ MAIS (funcionalidades secundárias)
const maisItems = [
  { href: '/listas', label: 'Listas de Exercícios', icon: FileText },
  { href: '/simulados', label: 'Simulados', icon: FileSpreadsheet },
  { href: '/avaliacoes-rede', label: 'Avaliações de Rede', icon: FileSpreadsheet },
  { href: '/importar-pdf', label: 'Importar PDF', icon: FileUp },
  { href: '/correcao-automatica', label: 'Correção Automática', icon: ScanLine },
  { href: '/resultados', label: 'Resultados', icon: BarChart3 },
  { href: '/relatorios', label: 'Relatórios Gerais', icon: PieChart },
  { href: '/mapa-calor', label: 'Mapa de Calor', icon: Flame },
  { href: '/gestao-horarios', label: 'Gestão de Horários', icon: Clock },
]

// 🛡️ ADMINISTRAÇÃO (apenas para admins)
const adminItems = [
  { href: '/admin', label: 'Painel Admin', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [metodoBaseOpen, setMetodoBaseOpen] = useState(true)
  const [maisOpen, setMaisOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (pathname.startsWith('/base')) {
      setMetodoBaseOpen(true)
    }
    const maisRoutes = maisItems.map(item => item.href)
    if (maisRoutes.some(route => pathname.startsWith(route))) {
      setMaisOpen(true)
    }
  }, [pathname])

  useEffect(() => {
    const checkAdmin = async () => {
      if (!usuario?.id) return
      const { data } = await supabase
        .from('usuarios')
        .select('is_admin')
        .eq('id', usuario.id)
        .single()
      setIsAdmin(data?.is_admin || false)
    }
    checkAdmin()
  }, [usuario?.id, supabase])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">xy</span>
          </div>
          <span className="text-xl font-bold text-gray-900">xyMath</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {/* 🏠 PRINCIPAIS */}
        {mainItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Divisor */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* 👥 GESTÃO */}
        {gestaoItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Divisor */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* 📚 CONTEÚDO */}
        {conteudoItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Divisor */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* 🎯 MÉTODO BASE */}
        <div>
          <button
            onClick={() => setMetodoBaseOpen(!metodoBaseOpen)}
            className={clsx(
              'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
              pathname.startsWith('/base')
                ? 'bg-purple-50 text-purple-600' 
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5" />
              <span className="font-medium">Método BASE</span>
            </div>
            {metodoBaseOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {metodoBaseOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {metodoBaseItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href.split('/').slice(0, 4).join('/'))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                      isActive 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Divisor */}
        <div className="border-t border-gray-200 my-4"></div>

        {/* ➕ MAIS */}
        <div>
          <button
            onClick={() => setMaisOpen(!maisOpen)}
            className={clsx(
              'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
              maisOpen
                ? 'bg-gray-100 text-gray-900' 
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <div className="flex items-center gap-3">
              <MoreHorizontal className="w-5 h-5" />
              <span className="font-medium">Mais</span>
            </div>
            {maisOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {maisOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {maisItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                      isActive 
                        ? 'bg-gray-200 text-gray-900' 
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )
              })}

              {/* 🛡️ ADMINISTRAÇÃO */}
              {isAdmin && (
                <>
                  <div className="border-t border-gray-200 my-2"></div>
                  {adminItems.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={clsx(
                          'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm',
                          isActive 
                            ? 'bg-indigo-100 text-indigo-700' 
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Rodapé */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-semibold">
              {usuario?.nome?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{usuario?.nome || 'Usuário'}</p>
            <p className="text-sm text-gray-500 truncate">{usuario?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair da conta</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-md"
        >
          {mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={clsx(
        'lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-200',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-full flex flex-col">
          <NavContent />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-gray-200">
        <NavContent />
      </aside>
    </>
  )
}
