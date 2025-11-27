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
  
  const supabase = createClient()

  useEffect(() => {
    // Buscar sessão inicial
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchUsuario(session.user.id)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchUsuario(session.user.id)
        } else {
          setUsuario(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUsuario = async (userId: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (!error && data) {
      setUsuario(data)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (!error && data.user) {
      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('usuarios')
        .insert({
          id: data.user.id,
          email,
          nome,
        })
      
      if (profileError) {
        return { error: profileError as Error }
      }
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

    const { error } = await supabase
      .from('usuarios')
      .update(data)
      .eq('id', user.id)

    if (!error) {
      setUsuario(prev => prev ? { ...prev, ...data } : null)
    }

    return { error: error as Error | null }
  }

  return (
    <AuthContext.Provider value={{
      user,
      usuario,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }}>
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
