import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { AppUser } from '../types'
import { supabase } from '../lib/supabase'

const SESSION_TIMEOUT = 30 * 60 // 30 minutos em segundos

interface AuthContextType {
  user: AppUser | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  sessionRemaining: number
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

async function loadAppUser(authUserId: string): Promise<AppUser | null> {
  try {
    const { data: profile, error } = await supabase
      .from('app_users')
      .select('id, email, name, role, church_group_id, active')
      .eq('id', authUserId)
      .single()
    if (error || !profile || !profile.active) {
      if (error) console.error('[Auth] erro ao carregar app_user:', error)
      return null
    }

    const { data: chs, error: chsErr } = await supabase
      .from('app_user_churches')
      .select('church_id')
      .eq('user_id', authUserId)
    if (chsErr) console.error('[Auth] erro ao carregar churches do user:', chsErr)
    const church_ids = (chs ?? []).map(r => (r as { church_id: string }).church_id)

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name ?? undefined,
      role: profile.role as AppUser['role'],
      church_group_id: profile.church_group_id,
      church_ids,
    }
  } catch (err) {
    console.error('[Auth] excecao em loadAppUser:', err)
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionRemaining, setSessionRemaining] = useState(SESSION_TIMEOUT)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activityRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = useCallback(async () => {
    setUser(null)
    if (timerRef.current) clearInterval(timerRef.current)
    await supabase.auth.signOut()
  }, [])

  const resetTimer = useCallback(() => setSessionRemaining(SESSION_TIMEOUT), [])

  const startSessionTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSessionRemaining(SESSION_TIMEOUT)
    timerRef.current = setInterval(() => {
      setSessionRemaining(prev => {
        if (prev <= 1) {
          void logout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [logout])

  // Inicializa: tenta restaurar sessão salva pelo Supabase
  useEffect(() => {
    let mounted = true
    let initialized = false  // evita race entre getSession e onAuthStateChange

    const handleSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!mounted) return
      try {
        if (session?.user) {
          const appUser = await loadAppUser(session.user.id)
          if (!mounted) return
          setUser(appUser)
          if (appUser) startSessionTimer()
          else {
            // sessão válida mas usuário sem perfil ativo — desloga pra evitar loop
            await supabase.auth.signOut()
          }
        } else {
          setUser(null)
          if (timerRef.current) clearInterval(timerRef.current)
        }
      } catch (err) {
        console.error('[Auth] erro ao processar sessão:', err)
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
        initialized = true
      }
    }

    // Restaura sessão salva
    supabase.auth.getSession()
      .then(({ data }) => handleSession(data.session))
      .catch(err => {
        console.error('[Auth] erro em getSession:', err)
        if (mounted) setLoading(false)
      })

    // Reage a mudanças (login, logout, refresh de token)
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignora o primeiro INITIAL_SESSION — getSession já trata isso
      if (!initialized && event === 'INITIAL_SESSION') return
      void handleSession(session)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [startSessionTimer])

  // Reset do timer em atividade do usuário
  useEffect(() => {
    if (!user) return
    const handleActivity = () => {
      if (activityRef.current) clearTimeout(activityRef.current)
      activityRef.current = setTimeout(resetTimer, 300)
    }
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
    }
  }, [user, resetTimer])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      return { ok: false, error: traduzErro(error?.message) }
    }
    const appUser = await loadAppUser(data.user.id)
    if (!appUser) {
      await supabase.auth.signOut()
      return { ok: false, error: 'Usuário não está vinculado ao sistema. Contate o administrador.' }
    }
    setUser(appUser)
    startSessionTimer()
    return { ok: true }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionRemaining, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

function traduzErro(msg?: string): string {
  if (!msg) return 'Erro ao entrar. Tente novamente.'
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid_credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'E-mail não confirmado. Verifique sua caixa de entrada.'
  if (m.includes('too many')) return 'Muitas tentativas. Espere alguns minutos.'
  return msg
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
