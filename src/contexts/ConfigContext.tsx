import React, { createContext, useContext, useState } from 'react'

interface ConfigData {
  titulos: string[]
  ministerios: string[]
  departamentos: string[]
  funcoes: string[]
  motivosEntrada: string[]
  motivosSaida: string[]
}

const defaults: ConfigData = {
  titulos: ['Apóstolo/a', 'Aspirante', 'Bispo/a', 'Conselheiro/a', 'Cooperador/a', 'Diácono/Diaconisa', 'Dirigente', 'Evangelista', 'Membro', 'Mestre', 'Ministro/a', 'Missionário/a', 'Músico', 'Obreiro/a', 'Oficial', 'Pastor/a', 'Presbítero', 'Profeta/Profetisa', 'Reverendo'],
  ministerios: ['Louvor', 'Intercessão', 'Evangelismo', 'Diaconia', 'Ensino', 'Infanto-Juvenil', 'Casais', 'Homens', 'Mulheres', 'Jovens'],
  departamentos: ['Administrativo', 'Financeiro', 'Comunicação', 'Patrimônio', 'Secretaria', 'Pastoral'],
  funcoes: ['Auxiliar', 'Presidente', 'Secretário/a', 'Tesoureiro/a', 'Comissão Fiscal', 'Vice-Presidente', 'Diretor/a'],
  motivosEntrada: ['Aclamação', 'Adesão', 'Afiliação', 'Batismo', 'Conversão', 'Jurisdição', 'Membro Fundador', 'Motivo Pessoal', 'Profissão de Fé', 'Reconciliação', 'Transferência', 'Outro'],
  motivosSaida: ['A Pedido', 'Abandono', 'Desligamento', 'Exclusão', 'Falecimento', 'Motivo Pessoal', 'Profissão de Fé', 'Transferência', 'Outro'],
}

interface ConfigContextType {
  config: ConfigData
  setConfig: React.Dispatch<React.SetStateAction<ConfigData>>
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaults,
  setConfig: () => {},
})

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigData>(defaults)
  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}

export function useConfig() {
  return useContext(ConfigContext)
}
