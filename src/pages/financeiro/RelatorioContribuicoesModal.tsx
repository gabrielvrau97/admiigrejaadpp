import React, { useEffect, useState } from 'react'
import { X, FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react'
import { listFinCategoriasByTipo } from '../../lib/api/fin_categorias'
import { getContribuicoesPorMembroAnual } from '../../lib/api/fin_dashboard'
import { buildContribuicoesHtml } from '../../lib/relatorio/buildContribuicoesHtml'
import { previewRelatorio } from '../../lib/relatorio/downloadRelatorio'
import { APP_GROUP_ID } from '../../lib/supabase'
import type { FinCategoria } from '../../types'

interface Props {
  onClose: () => void
}

export default function RelatorioContribuicoesModal({ onClose }: Props) {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [categorias, setCategorias] = useState<FinCategoria[]>([])
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [todasCats, setTodasCats] = useState(true)
  const [loadingCats, setLoadingCats] = useState(true)
  const [gerando, setGerando] = useState(false)

  useEffect(() => {
    listFinCategoriasByTipo(APP_GROUP_ID, 'entrada')
      .then(cats => setCategorias(cats.filter(c => c.ativo)))
      .catch(console.error)
      .finally(() => setLoadingCats(false))
  }, [])

  function toggleCategoria(id: string) {
    setSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleTodas() {
    setTodasCats(p => {
      if (!p) setSelecionadas(new Set())
      return !p
    })
  }

  async function handleGerar() {
    setGerando(true)
    try {
      const catIds = todasCats ? null : [...selecionadas]
      const resultado = await getContribuicoesPorMembroAnual(APP_GROUP_ID, ano, catIds)

      if (resultado.membros.length === 0) {
        alert('Nenhum lançamento encontrado para o período e categorias selecionadas.')
        return
      }

      const catsSel = todasCats
        ? categorias
        : categorias.filter(c => selecionadas.has(c.id))
      const categoriasLabel = todasCats
        ? 'Todas as categorias'
        : catsSel.map(c => c.nome).join(', ')

      const mesesAtivos = resultado.meses.filter(m => resultado.totaisMes[m] > 0)

      const html = buildContribuicoesHtml({ resultado, ano, categoriasLabel, mesesAtivos })
      previewRelatorio({ html, filename: `Contribuicoes_${ano}` })
    } catch (err) {
      console.error(err)
      alert('Erro ao gerar relatório.')
    } finally {
      setGerando(false)
    }
  }

  const anosDisponiveis = [anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3]
  const podaGerar = todasCats || selecionadas.size > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={17} className="text-indigo-600" />
            <span className="text-sm font-bold text-gray-800">Extrato de Contribuições</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* Seleção do ano */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ano de referência</label>
            <div className="relative">
              <select
                value={ano}
                onChange={e => setAno(Number(e.target.value))}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white appearance-none"
              >
                {anosDisponiveis.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Seleção de categorias */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categorias</label>

            {/* Toggle todas */}
            <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer mb-2 transition-all
              border-indigo-500 bg-indigo-50">
              <input
                type="checkbox"
                checked={todasCats}
                onChange={toggleTodas}
                className="w-3.5 h-3.5 rounded accent-indigo-600"
              />
              <span className="text-xs font-semibold text-indigo-800">Todas as categorias de entrada</span>
            </label>

            {/* Lista de categorias individuais */}
            {!todasCats && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {loadingCats ? (
                  <div className="py-3 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Loader2 size={12} className="animate-spin" /> Carregando...
                  </div>
                ) : categorias.length === 0 ? (
                  <div className="py-3 text-center text-xs text-gray-400">Nenhuma categoria encontrada.</div>
                ) : (
                  categorias.map(cat => (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all ${
                        selecionadas.has(cat.id)
                          ? 'border-indigo-200 bg-indigo-50'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionadas.has(cat.id)}
                        onChange={() => toggleCategoria(cat.id)}
                        className="w-3.5 h-3.5 rounded accent-indigo-600"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.cor }}
                      />
                      <span className={`text-xs font-medium ${selecionadas.has(cat.id) ? 'text-indigo-800' : 'text-gray-700'}`}>
                        {cat.nome}
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}

            {!todasCats && selecionadas.size === 0 && (
              <p className="text-[10px] text-amber-600 mt-1.5">Selecione ao menos uma categoria.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGerar}
            disabled={!podaGerar || gerando}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {gerando
              ? <><Loader2 size={14} className="animate-spin" /> Gerando...</>
              : <><FileSpreadsheet size={14} /> Gerar extrato</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
