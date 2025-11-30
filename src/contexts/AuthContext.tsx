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

  // Função para buscar usuário da tabela
  const fetchUsuario = async (userId: string): Promise<Usuario | null> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Erro ao buscar usuario:', error)
        return null
      }
      return data
    } catch (e) {
      console.error('Erro ao buscar usuario:', e)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Erro ao buscar sessão:', error)
          if (mounted) setLoading(false)
          return
        }

        if (!mounted) return

        if (session?.user) {
          setSession(session)
          setUser(session.user)
          
          // Busca o usuario da tabela
          const usuarioData = await fetchUsuario(session.user.id)
          
          if (mounted) {
            if (usuarioData) {
              setUsuario(usuarioData)
            } else {
              // Se não encontrou o usuario, faz logout
              console.warn('Usuario não encontrado na tabela, fazendo logout')
              await supabase.auth.signOut()
              setUser(null)
              setSession(null)
            }
            setLoading(false)
          }
        } else {
          // Não tem sessão
          setSession(null)
          setUser(null)
          setUsuario(null)
          if (mounted) setLoading(false)
        }
      } catch (error) {
        console.error('Erro na autenticação:', error)
        if (mounted) setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        console.log('Auth state changed:', event)
        
        if (session?.user) {
          setSession(session)
          setUser(session.user)
          
          const usuarioData = await fetchUsuario(session.user.id)
          if (mounted && usuarioData) {
            setUsuario(usuarioData)
          }
        } else {
          setSession(null)
          setUser(null)
          setUsuario(null)
        }
        
        if (mounted) setLoading(false)
      }
    )

    // Timeout de segurança maior - 5 segundos
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth timeout - forçando loading = false')
        setLoading(false)
      }
    }, 5000)

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) setLoading(false)
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (!error && data.user) {
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
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setUsuario(null)
    setSession(null)
    setLoading(false)
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
