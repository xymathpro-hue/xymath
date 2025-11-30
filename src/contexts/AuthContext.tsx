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

// Singleton do cliente Supabase
let supabaseInstance: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = getSupabase()

  // Função para buscar usuario com timeout
  const fetchUsuario = async (userId: string): Promise<Usuario | null> => {
    try {
      const queryPromise = supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => 
        setTimeout(() => resolve({ data: null, error: new Error('Timeout') }), 2000)
      )
      
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      
      if (error) {
        console.error('Erro ao buscar usuario:', error)
        return null
      }
      
      return data
    } catch (err) {
      console.error('Erro ao buscar usuario:', err)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Busca sessão com timeout de 3 segundos
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), 3000)
        )
        
        const result = await Promise.race([sessionPromise, timeoutPromise])
        
        if (!mounted) return
        
        // Timeout ou sem sessão
        if (!result || !result.data?.session?.user) {
          setUser(null)
          setUsuario(null)
          setSession(null)
          setLoading(false)
          return
        }
        
        const { data: { session } } = result
        
        setSession(session)
        setUser(session!.user)
        
        // Busca usuario (com timeout interno)
        const usuarioData = await fetchUsuario(session!.user.id)
        
        if (mounted) {
          setUsuario(usuarioData)
          setLoading(false)
        }
      } catch (error) {
        console.error('Erro na inicialização:', error)
        if (mounted) {
          setUser(null)
          setUsuario(null)
          setSession(null)
          setLoading(false)
        }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return
        
        console.log('Auth event:', event)
        
        if (event === 'SIGNED_OUT' || !newSession?.user) {
          setUser(null)
          setUsuario(null)
          setSession(null)
          return
        }
        
        setSession(newSession)
        setUser(newSession.user)
        
        // Busca usuario em background (não bloqueia)
        fetchUsuario(newSession.user.id).then(data => {
          if (mounted) setUsuario(data)
        })
      }
    )

    return () => {
      mounted = false
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
    // Limpa estado ANTES de chamar signOut do Supabase
    setUser(null)
    setUsuario(null)
    setSession(null)
    
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Erro no signOut:', err)
    }
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
