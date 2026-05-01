import { DollarSign, Construction } from 'lucide-react'

export default function FinanceiroPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <DollarSign size={20} className="text-emerald-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Financeiro</h1>
          <p className="text-sm text-gray-500">Receitas, despesas e relatórios contábeis</p>
        </div>
      </div>

      {/* Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
          <Construction size={28} className="text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Módulo em construção</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          O módulo financeiro será implementado em breve. Aqui você vai encontrar
          gestão de dízimos e ofertas, registro de despesas, relatórios mensais e
          fechamento contábil.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Acesso restrito a Master e Admin Financeiro
        </div>
      </div>
    </div>
  )
}
