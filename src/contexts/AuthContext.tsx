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

const supabase = createClient()

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout
    
    const init = async () => {
      // Timeout de segurança - 3 segundos máximo
      timeoutId = setTimeout(async () => {
        if (mounted && loading) {
          console.warn('Timeout - limpando sessão e redirecionando')
          await supabase.auth.signOut()
          localStorage.clear()
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
        
        // Busca usuario com timeout
        const controller = new AbortController()
        const fetchTimeout = setTimeout(() => controller.abort(), 2000)
        
        try {
          const { data: usuarioData, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          clearTimeout(fetchTimeout)
          
          if (mounted) {
            if (usuarioData) {
              setUsuario(usuarioData)
              clearTimeout(timeoutId)
              setLoading(false)
            } else {
              // Falhou - limpa tudo
              console.warn('Usuario não encontrado - limpando sessão')
              await supabase.auth.signOut()
              setUser(null)
              setSession(null)
              clearTimeout(timeoutId)
              setLoading(false)
            }
          }
        } catch (fetchError) {
          console.error('Erro ao buscar usuario:', fetchError)
          if (mounted) {
            await supabase.auth.signOut()
            setUser(null)
            setSession(null)
            clearTimeout(timeoutId)
            setLoading(false)
          }
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
        
        if (mounted && data) {
          setUsuario(data)
        }
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

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
