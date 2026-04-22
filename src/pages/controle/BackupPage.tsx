import React from 'react'
import { Download, Database, HardDrive, FileDown, Info } from 'lucide-react'

const sections = [
  { label: 'Membros', color: 'bg-blue-500' },
  { label: 'Visitantes', color: 'bg-rose-500' },
  { label: 'Congregados', color: 'bg-amber-500' },
  { label: 'Crianças', color: 'bg-yellow-500' },
  { label: 'Adolescentes', color: 'bg-orange-500' },
  { label: 'Jovens', color: 'bg-purple-500' },
  { label: 'Novos Convertidos', color: 'bg-green-500' },
]
const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]

export default function BackupPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Database size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Backup</h1>
          <p className="text-xs text-gray-400">Controle · Backup e exportação</p>
        </div>
      </div>

      {/* Infobanner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Exporte os dados de cada seção por ano. Clique no ícone <strong>↓</strong> para baixar como <strong>.xlsx</strong> ou <strong>.csv</strong>. Os dados refletem o estado atual do banco de dados.
        </p>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileDown size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Exportar por seção e ano</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2 h-2 bg-green-400 rounded-full" />
            Dados disponíveis
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider sticky left-0 bg-white min-w-[160px]">
                  Seção
                </th>
                {years.map(y => (
                  <th key={y} className="text-center px-3 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider min-w-[60px]">
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map((section, si) => (
                <tr key={section.label} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors group">
                  <td className="px-5 py-3 sticky left-0 bg-white group-hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${section.color} shrink-0`} />
                      <span className="font-semibold text-gray-700 text-sm">{section.label}</span>
                    </div>
                  </td>
                  {years.map(y => (
                    <td key={y} className="px-3 py-3 text-center">
                      <button
                        className="inline-flex items-center justify-center w-7 h-7 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-150 border border-transparent hover:border-green-200"
                        title={`Exportar ${section.label} ${y}`}
                      >
                        <Download size={12} />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
