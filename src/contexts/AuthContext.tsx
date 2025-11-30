'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
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
  const loadingRef = useRef(true)
  const initDone = useRef(false)

  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setUser(null)
          setUsuario(null)
          setSession(null)
          setLoading(false)
          loadingRef.current = false
          return
        }
        
        setSession(session)
        setUser(session.user)
        
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (usuarioData) {
          setUsuario(usuarioData)
        } else {
          await supabase.auth.signOut()
          setUser(null)
          setSession(null)
        }
        
        setLoading(false)
        loadingRef.current = false
      } catch (error) {
        console.error('Erro:', error)
        setLoading(false)
        loadingRef.current = false
      }
    }

    // Timeout de segurança
    const timeout = setTimeout(() => {
      if (loadingRef.current) {
        console.warn('Timeout atingido - forçando fim do loading')
        supabase.auth.signOut()
        setUser(null)
        setUsuario(null)
        setSession(null)
        setLoading(false)
        loadingRef.current = false
      }
    }, 3000)

    init().finally(() => clearTimeout(timeout))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUsuario(null)
          setSession(null)
          return
        }
        
        if (session?.user) {
          setSession(session)
          setUser(session.user)
          
          const { data } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (data) {
            setUsuario(data)
          }
        }
      }
    )

    return () => {
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
