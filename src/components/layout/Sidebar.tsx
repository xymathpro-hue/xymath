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
  FileUp,
  PieChart,
  Shield,
  Bell,
  FileSpreadsheet,
  Calculator,
  Calendar,
  ScanLine,
  Settings,
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronRight,
  Lock,
  Target
} from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'

interface MenuItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

interface MenuGroup {
  id: string
  title: string
  icon: React.ElementType
  items: MenuItem[]
  adminOnly?: boolean
}

const menuGroups: MenuGroup[] = [
  {
    id: 'inicio',
    title: 'Início',
    icon: LayoutDashboard,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/minha-semana', label: 'Minha Semana', icon: Calendar },
    ]
  },
  {
    id: 'gestao',
    title: 'Gestão',
    icon: Users,
    items: [
      { href: '/turmas', label: 'Turmas', icon: Users },
      { href: '/alunos', label: 'Alunos', icon: GraduationCap },
      { href: '/gestao-horarios', label: 'Horários', icon: Clock },
    ]
  },
  {
    id: 'avaliacoes',
    title: 'Avaliações',
    icon: FileText,
    items: [
      { href: '/questoes', label: 'Banco de Questões', icon: BookOpen },
      { href: '/simulados', label: 'Simulados', icon: FileText },
      { href: '/correcao-automatica', label: 'Correção', icon: ScanLine },
      { href: '/avaliacoes-rede', label: 'Avaliações de Rede', icon: FileSpreadsheet },
    ]
  },
  {
    id: 'resultados',
    title: 'Resultados',
    icon: BarChart3,
    items: [
      { href: '/notas', label: 'Notas', icon: Calculator },
      { href: '/resultados', label: 'Desempenho', icon: BarChart3 },
      { href: '/caderno-erros', label: 'Caderno de Erros', icon: AlertTriangle },
      { href: '/relatorios', label: 'Relatórios', icon: PieChart },
    ]
  },
  {
    id: 'recursos',
    title: 'Recursos',
    icon: Library,
    items: [
      { href: '/biblioteca-bncc', label: 'Biblioteca BNCC', icon: Library },
      { href: '/listas', label: 'Listas de Exercícios', icon: FileText },
      { href: '/atividades', label: 'Atividades', icon: ClipboardList },
    ]
  },
  {
    id: 'ferramentas',
    title: 'Ferramentas',
    icon: Settings,
    items: [
      { href: '/importar-pdf', label: 'Importar PDF', icon: FileUp },
      { href: '/alertas', label: 'Alertas', icon: Bell },
      { href: '/configuracoes', label: 'Configurações', icon: Settings },
    ]
  },
  {
    id: 'metodo-base',
    title: 'Método BASE',
    icon: Target,
    adminOnly: true,
    items: [
      { href: '/admin/base', label: 'Painel BASE', icon: Target, adminOnly: true },
      { href: '/admin/base/turmas', label: 'Turmas BASE', icon: Users, adminOnly: true },
      { href: '/admin/base/diagnosticos', label: 'Diagnósticos', icon: ClipboardList, adminOnly: true },
      { href: '/admin/base/mapa', label: 'Mapa da Turma', icon: BarChart3, adminOnly: true },
      { href: '/admin/base/relatorios', label: 'Relatórios', icon: PieChart, adminOnly: true },
    ]
  },
]

const adminGroup: MenuGroup = {
  id: 'admin',
  title: 'Administração',
  icon: Shield,
  adminOnly: true,
  items: [
    { href: '/admin', label: 'Painel Admin', icon: Shield },
    { href: '/admin/xy-insights', label: 'XY Insights', icon: Brain },
  ]
}

export function Sidebar() {
  const pathname = usePathname()
  const { usuario, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['inicio', 'avaliacoes', 'resultados'])
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

  useEffect(() => {
    const allGroups = [...menuGroups, adminGroup]
    allGroups.forEach(group => {
      const hasActiveItem = group.items.some(
        item => pathname === item.href || pathname.startsWith(item.href + '/')
      )
      if (hasActiveItem && !expandedGroups.includes(group.id)) {
        setExpandedGroups(prev => [...prev, group.id])
      }
    })
  }, [pathname, expandedGroups])

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const isItemActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/')
  }

  const isGroupActive = (group: MenuGroup) => {
    return group.items.some(item => isItemActive(item.href))
  }

  const renderMenuGroup = (group: MenuGroup) => {
    if (group.adminOnly && !isAdmin) return null

    const isExpanded = expandedGroups.includes(group.id)
    const groupActive = isGroupActive(group)
    const GroupIcon = group.icon

    return (
      <div key={group.id} className="mb-1">
        <button
          onClick={() => toggleGroup(group.id)}
          className={clsx(
            'w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200',
            groupActive 
              ? 'bg-indigo-50 text-indigo-700' 
              : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          <div className="flex items-center gap-3">
            <GroupIcon className={clsx(
              'w-5 h-5',
              groupActive ? 'text-indigo-600' : 'text-gray-400'
            )} />
            <span className="font-semibold text-sm">{group.title}</span>
          </div>
          {isExpanded 
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />
          }
        </button>

        <div className={clsx(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="ml-4 pl-4 border-l-2 border-gray-100 mt-1 space-y-0.5">
            {group.items.map((item) => {
              const isActive = isItemActive(item.href)
              const ItemIcon = item.icon
              const isLocked = item.adminOnly && !isAdmin

              if (isLocked) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed"
                    title="Disponível em breve"
                  >
                    <div className="flex items-center gap-3">
                      <ItemIcon className="w-4 h-4 text-gray-300" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <Lock className="w-3 h-3 text-gray-300" />
                  </div>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150',
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <ItemIcon className={clsx(
                    'w-4 h-4',
                    isActive ? 'text-white' : 'text-gray-400'
                  )} />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const NavContent = () => (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-lg">xy</span>
          </div>
          <div>
            <span className="text-xl font-bold text-gray-900">xyMath</span>
            <p className="text-[10px] text-gray-400 -mt-0.5">Plataforma Educacional</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {menuGroups.map(group => renderMenuGroup(group))}
        
        {isAdmin && (
          <>
            <div className="my-4 mx-4 border-t border-gray-200" />
            {renderMenuGroup(adminGroup)}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-semibold text-sm">
              {usuario?.nome?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {usuario?.nome || 'Usuário'}
            </p>
            <p className="text-xs text-gray-500 truncate">{usuario?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da conta</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 bg-white rounded-xl shadow-lg border border-gray-100"
        >
          {mobileMenuOpen 
            ? <X className="w-5 h-5 text-gray-600" /> 
            : <Menu className="w-5 h-5 text-gray-600" />
          }
        </button>
      </div>

      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      <aside className={clsx(
        'lg:hidden fixed top-0 left-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 shadow-2xl',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>

      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-gray-100 shadow-sm">
        <NavContent />
      </aside>
    </>
  )
}
