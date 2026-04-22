import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Church as ChurchIcon } from 'lucide-react'
import { mockChurches } from '../../lib/mockData'
import type { Church } from '../../types'

export default function IgrejasPage() {
  const [churches] = useState<Church[]>(mockChurches)
  const [showModal, setShowModal] = useState(false)

  const sede = churches.filter(c => c.type === 'sede')
  const filiais = churches.filter(c => c.type === 'filial')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <ChurchIcon size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Igrejas</h1>
            <p className="text-xs text-gray-400">Controle · Igrejas</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus size={13} /> Adicionar Igreja
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total de igrejas', value: churches.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Sede', value: sede.length, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
          { label: 'Filiais', value: filiais.length, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-medium text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {churches.map(c => {
          const isSede = c.type === 'sede'
          return (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200/80 overflow-hidden group transition-all duration-200 hover:-translate-y-0.5"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 200ms, transform 200ms' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
            >
              {/* Topo colorido */}
              <div className={`h-1 w-full ${isSede ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`} />

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ background: isSede ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
                    >
                      {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm leading-tight">{c.name}</div>
                      <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isSede ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-600'
                      }`}>
                        {isSede ? 'Sede' : 'Filial'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150">
                      <Edit2 size={12} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-150">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  {c.address && (
                    <div className="flex items-start gap-2">
                      <MapPin size={11} className="mt-0.5 shrink-0 text-gray-400" />
                      <span className="leading-relaxed">{c.address}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={11} className="shrink-0 text-gray-400" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={11} className="shrink-0 text-gray-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
