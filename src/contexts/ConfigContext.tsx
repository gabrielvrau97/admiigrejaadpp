import React, { createContext, useContext, useEffect, useState } from 'react'
import { loadConfig, addOption, removeOption, type ConfigData, type ConfigCategory } from '../lib/api/config'
import { useAuth } from './AuthContext'

const empty: ConfigData = {
  titulos: [], ministerios: [], departamentos: [], funcoes: [], motivosEntrada: [], motivosSaida: [],
}

interface ConfigContextType {
  config: ConfigData
  loading: boolean
  addItem: (category: ConfigCategory, value: string) => Promise<void>
  removeItem: (category: ConfigCategory, value: string) => Promise<void>
  reload: () => Promise<void>
}

const ConfigContext = createContext<ConfigContextType>({
  config: empty,
  loading: false,
  addItem: async () => {},
  removeItem: async () => {},
  reload: async () => {},
})

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [config, setConfig] = useState<ConfigData>(empty)
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    setLoading(true)
    try {
      setConfig(await loadConfig())
    } catch (err) {
      console.error('[ConfigContext] erro ao carregar:', err)
      setConfig(empty)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) void reload()
    else { setConfig(empty); setLoading(false) }
  }, [user])

  const addItem = async (category: ConfigCategory, value: string) => {
    await addOption(category, value)
    await reload()
  }
  const removeItem = async (category: ConfigCategory, value: string) => {
    await removeOption(category, value)
    await reload()
  }

  return (
    <ConfigContext.Provider value={{ config, loading, addItem, removeItem, reload }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}
