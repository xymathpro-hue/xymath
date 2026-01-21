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
  Calculator
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/turmas', label: 'Turmas', icon: Users },
  { href: '/alunos', label: 'Alunos', icon: GraduationCap },
  { href: '/atividades', label: 'Atividades', icon: ClipboardList },
  { href: '/notas', label: 'Notas', icon: Calculator },
  { href: '/questoes', label: 'Banco de Questões', icon: BookOpen },
  { href: '/biblioteca-bncc', label: 'Biblioteca BNCC', icon: Library },
  { href: '/listas', label: 'Listas de Exercícios', icon: FileText },
  { href: '/simulados', label: 'Simulados', icon: FileText },
  { href: '/resultados', label: 'Resultados', icon: BarChart3 },
  { href: '/gestao-horarios', label: 'Gestão de Horários', icon: Clock },
  { href: '/mapa-calor', label: 'Mapa de Calor', icon: Flame },
  { href: '/relatorios', label: 'Relatórios', icon: PieChart },
  { href: '/importar-plano', label: 'Importar Plano', icon: FileUp },
]

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

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
        
        {/* Admin link - só aparece para admins */}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileMenuOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              pathname === '/admin' || pathname.startsWith('/admin/')
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <Shield className="w-5 h-5" />
            <span className="font-medium">Admin</span>
          </Link>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-indigo-600 font-semibold">
              {usuario?.nome?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {usuario?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {usuario?.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">xy</span>
          </div>
          <span className="text-lg font-bold text-gray-900">xyMath</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
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
