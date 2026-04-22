import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { AppUser } from '../types'
import { mockUser } from '../lib/mockData'

const SESSION_TIMEOUT = 30 * 60 // 30 minutes in seconds

interface AuthContextType {
  user: AppUser | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  sessionRemaining: number // seconds
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionRemaining, setSessionRemaining] = useState(SESSION_TIMEOUT)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activityRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logout = useCallback(() => {
    setUser(null)
    if (timerRef.current) clearInterval(timerRef.current)
    localStorage.removeItem('adp_session')
  }, [])

  const resetTimer = useCallback(() => {
    setSessionRemaining(SESSION_TIMEOUT)
  }, [])

  const startSessionTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSessionRemaining(SESSION_TIMEOUT)
    timerRef.current = setInterval(() => {
      setSessionRemaining(prev => {
        if (prev <= 1) {
          logout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [logout])

  useEffect(() => {
    const saved = localStorage.getItem('adp_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.id) {
          setUser(parsed)
          startSessionTimer()
        }
      } catch {
        localStorage.removeItem('adp_session')
      }
    }
    setLoading(false)
  }, [startSessionTimer])

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

  const login = async (email: string, password: string): Promise<boolean> => {
    // Demo credentials
    if (email === 'secretaria@adp.com' && password === 'demo1234') {
      setUser(mockUser)
      localStorage.setItem('adp_session', JSON.stringify(mockUser))
      startSessionTimer()
      return true
    }
    return false
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionRemaining, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
