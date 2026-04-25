import React from 'react'
import type { MemberFamily, MemberMinistry } from '../../../types'
import { Link as LinkIcon, Users } from 'lucide-react'
import { useData } from '../../../contexts/DataContext'

interface Props {
  family: Partial<MemberFamily>
  ministry?: Partial<MemberMinistry>
}

interface ConnectionCardProps {
  name: string
  subtitle?: string
  initial: string
  badge: string
  colorBg: string
  colorBorder: string
  colorAvatar: string
  colorText: string
}

function ConnectionCard({ name, subtitle, initial, badge, colorBg, colorBorder, colorAvatar, colorText }: ConnectionCardProps) {
  return (
    <div className={`p-3 ${colorBg} border ${colorBorder} rounded-lg flex items-center gap-3`}>
      <div className={`w-9 h-9 rounded-full ${colorAvatar} flex items-center justify-center font-bold`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-800 text-sm truncate">{name}</div>
        {subtitle && <div className="text-xs text-gray-500 truncate">{subtitle}</div>}
      </div>
      <span className={`flex items-center gap-1 text-xs ${colorText} font-medium shrink-0`}>
        <LinkIcon size={11} /> {badge}
      </span>
    </div>
  )
}

export default function TabConexao({ family, ministry }: Props) {
  const { members, visitantes } = useData()
  const pool = [...members, ...visitantes]

  const spouseMember = family.spouse_id ? pool.find(m => m.id === family.spouse_id) : null
  const fatherMember = family.father_id ? pool.find(m => m.id === family.father_id) : null
  const motherMember = family.mother_id ? pool.find(m => m.id === family.mother_id) : null

  const linkedChildren = (family.children ?? [])
    .filter(c => c.id)
    .map(c => ({ child: c, member: pool.find(m => m.id === c.id) }))

  const disciplerMember = ministry?.discipler_id ? pool.find(m => m.id === ministry.discipler_id) : null
  const companionMember = ministry?.companion_id ? pool.find(m => m.id === ministry.companion_id) : null

  const hasConnections =
    spouseMember || fatherMember || motherMember ||
    linkedChildren.length > 0 ||
    disciplerMember || companionMember

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Conexões deste membro com outros cadastros. Para adicionar, use as abas <strong>Família</strong> e <strong>Ministério</strong>.
      </p>

      {!hasConnections && (
        <div className="text-center py-10 text-gray-300">
          <Users size={36} className="mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhuma conexão registrada.</p>
        </div>
      )}

      {/* Família */}
      {(spouseMember || fatherMember || motherMember || linkedChildren.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Família</p>

          {spouseMember && (
            <ConnectionCard
              name={spouseMember.name}
              subtitle={spouseMember.birth_date ? `Nascimento: ${spouseMember.birth_date}` : undefined}
              initial={spouseMember.name[0]}
              badge="Cônjuge"
              colorBg="bg-blue-50" colorBorder="border-blue-100"
              colorAvatar="bg-blue-200 text-blue-700" colorText="text-blue-600"
            />
          )}

          {fatherMember && (
            <ConnectionCard
              name={fatherMember.name}
              subtitle={fatherMember.birth_date ? `Nascimento: ${fatherMember.birth_date}` : undefined}
              initial={fatherMember.name[0]}
              badge="Pai"
              colorBg="bg-indigo-50" colorBorder="border-indigo-100"
              colorAvatar="bg-indigo-200 text-indigo-700" colorText="text-indigo-600"
            />
          )}

          {motherMember && (
            <ConnectionCard
              name={motherMember.name}
              subtitle={motherMember.birth_date ? `Nascimento: ${motherMember.birth_date}` : undefined}
              initial={motherMember.name[0]}
              badge="Mãe"
              colorBg="bg-pink-50" colorBorder="border-pink-100"
              colorAvatar="bg-pink-200 text-pink-700" colorText="text-pink-600"
            />
          )}

          {linkedChildren.map(({ child, member }, i) => {
            const name = member?.name ?? child.name
            const subtitle = (member?.birth_date ?? child.birth_date)
              ? `Nascimento: ${member?.birth_date ?? child.birth_date}` : undefined
            return (
              <ConnectionCard
                key={i}
                name={name}
                subtitle={subtitle}
                initial={name[0]}
                badge="Filho(a)"
                colorBg="bg-green-50" colorBorder="border-green-100"
                colorAvatar="bg-green-200 text-green-700" colorText="text-green-600"
              />
            )
          })}
        </div>
      )}

      {/* Ministerial */}
      {(disciplerMember || companionMember) && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ministerial</p>

          {disciplerMember && (
            <ConnectionCard
              name={disciplerMember.name}
              subtitle={disciplerMember.birth_date ? `Nascimento: ${disciplerMember.birth_date}` : undefined}
              initial={disciplerMember.name[0]}
              badge="Discipulador"
              colorBg="bg-purple-50" colorBorder="border-purple-100"
              colorAvatar="bg-purple-200 text-purple-700" colorText="text-purple-600"
            />
          )}

          {companionMember && (
            <ConnectionCard
              name={companionMember.name}
              subtitle={companionMember.birth_date ? `Nascimento: ${companionMember.birth_date}` : undefined}
              initial={companionMember.name[0]}
              badge="Acompanhante"
              colorBg="bg-amber-50" colorBorder="border-amber-100"
              colorAvatar="bg-amber-200 text-amber-700" colorText="text-amber-600"
            />
          )}
        </div>
      )}
    </div>
  )
}
