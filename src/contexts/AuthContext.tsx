'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'
import { Usuario } from '@/types'

interface AuthContextType {
  user: User | null
  usuario: Usuario | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  updateProfile: (data: Partial<Usuario>) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    let mounted = true
    let timeoutId: ReturnType<typeof setTimeout>
    
    const init = async () => {
      // Timeout absoluto de 3 segundos
      timeoutId = setTimeout(() => {
        if (mounted && loading) {
          console.warn('Timeout - redirecionando para login')
          setLoading(false)
          window.location.href = '/login'
        }
      }, 3000)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (!session?.user) {
          clearTimeout(timeoutId)
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session.user)
        
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (mounted) {
          clearTimeout(timeoutId)
          setUsuario(usuarioData || null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro:', error)
        if (mounted) {
          clearTimeout(timeoutId)
          setLoading(false)
        }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        if (!session?.user) {
          setUser(null)
          setUsuario(null)
          setSession(null)
          return
        }
        
        setSession(session)
        setUser(session.user)
        
        const { data } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (mounted) setUsuario(data || null)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      await supabase.from('usuarios').insert({ id: data.user.id, email, nome })
    }
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUsuario(null)
    setSession(null)
  }

  const updateProfile = async (data: Partial<Usuario>) => {
    if (!user) return { error: new Error('Usuário não autenticado') }
    const { error } = await supabase.from('usuarios').update(data).eq('id', user.id)
    if (!error) setUsuario(prev => prev ? { ...prev, ...data } : null)
    return { error: error as Error | null }
  }

  return (
    <AuthContext.Provider value={{ user, usuario, session, loading, signIn, signUp, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
