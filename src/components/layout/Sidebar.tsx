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
  ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/minha-semana', label: 'Minha Semana', icon: Calendar },
  { href: '/turmas', label: 'Turmas', icon: Users },
  { href: '/alunos', label: 'Alunos', icon: GraduationCap },
  { href: '/atividades', label: 'Atividades', icon: ClipboardList },
  { href: '/notas', label: 'Notas', icon: Calculator },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/questoes', label: 'Banco de Questões', icon: BookOpen },
  { href: '/biblioteca-bncc', label: 'Biblioteca BNCC', icon: Library },
  { href: '/listas', label: 'Listas de Exercícios', icon: FileText },
  { href: '/simulados', label: 'Simulados', icon: FileText },
  { href: '/resultados', label: 'Resultados', icon: BarChart3 },
  { href: '/avaliacoes-rede', label: 'Avaliações de Rede', icon: FileSpreadsheet },
  { href: '/gestao-horarios', label: 'Gestão de Horários', icon: Clock },
  { href: '/mapa-calor', label: 'Mapa de Calor', icon: Flame },
  { href: '/relatorios', label: 'Relatórios', icon: PieChart },
  { href: '/correcao-automatica', label: 'Correção Automática', icon: ScanLine },
  { href: '/importar-pdf', label: 'Importar PDF', icon: FileUp },
]

const metodoBaseItems = [
  { href: '/admin/base', label: 'Painel BASE', icon: Target },
  { href: '/admin/base/turmas', label: 'Turmas BASE', icon: Users },
  { href: '/admin/base/diagnosticos', label: 'Diagnósticos', icon: ClipboardList },
  { href: '/admin/base/mapa', label: 'Mapa de Calor', icon: Flame },
  { href: '/admin/base/questoes', label: 'Questões', icon: FileText },
  { href: '/admin/base/relatorios', label: 'Relatórios', icon: PieChart },
]

const adminItems = [
  { href: '/admin', label: 'Painel Admin', icon: Shield },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [metodoBaseOpen, setMetodoBaseOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (pathname.startsWith('/admin/base')) {
      setMetodoBaseOpen(true)
    }
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/base')) {
      setAdminOpen(true)
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
      <div className="px-6 py-6 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">xy</span>
          </div>
          <span className="text-xl font-bold text-gray-900">xyMath</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
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
        
        {isAdmin && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <button
              onClick={() => setMetodoBaseOpen(!metodoBaseOpen)}
              className={clsx(
                'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
                pathname.startsWith('/admin/base')
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
                  const isActive = pathname === item.href
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
        )}

        {isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={clsx(
                'flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors',
                pathname === '/admin' 
                  ? 'bg-indigo-50 text-indigo-600' 
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Administração</span>
              </div>
              {adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {adminOpen && (
              <div className="ml-4 mt-1 space-y-1">
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
              </div>
            )}
          </div>
        )}
      </nav>

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
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-md"
        >
          {mobileMenuOpen ? <X className="w-6 h-6 text-gray-600" /> : <Menu className="w-6 h-6 text-gray-600" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={clsx(
        'lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-200',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="h-full flex flex-col">
          <NavContent />
        </div>
      </aside>

      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-gray-200">
        <NavContent />
      </aside>
    </>
  )
}
