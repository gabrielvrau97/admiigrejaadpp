import React from 'react'
import type { MemberFamily } from '../../../types'
import { Link as LinkIcon, Users } from 'lucide-react'
import { mockMembers } from '../../../lib/mockData'

interface Props {
  family: Partial<MemberFamily>
}

export default function TabConexao({ family }: Props) {
  const spouseMember = family.spouse_id
    ? mockMembers.find(m => m.id === family.spouse_id)
    : null

  const linkedChildren = (family.children ?? [])
    .filter(c => c.id)
    .map(c => ({ child: c, member: mockMembers.find(m => m.id === c.id) }))

  const hasConnections = spouseMember || linkedChildren.length > 0

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Conexões familiares vinculadas a cadastros existentes. Para adicionar, vá até a aba <strong>Família</strong>.
      </p>

      {!hasConnections && (
        <div className="text-center py-10 text-gray-300">
          <Users size={36} className="mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhuma conexão familiar registrada.</p>
        </div>
      )}

      {spouseMember && (
        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
            {spouseMember.name[0]}
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-800 text-sm">{spouseMember.name}</div>
            {spouseMember.birth_date && (
              <div className="text-xs text-gray-500">Nascimento: {spouseMember.birth_date}</div>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
            <LinkIcon size={11} /> Cônjuge
          </span>
        </div>
      )}

      {linkedChildren.map(({ child, member }, i) => (
        <div key={i} className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
            {member ? member.name[0] : child.name[0]}
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-800 text-sm">{member?.name ?? child.name}</div>
            {(member?.birth_date ?? child.birth_date) && (
              <div className="text-xs text-gray-500">Nascimento: {member?.birth_date ?? child.birth_date}</div>
            )}
          </div>
          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
            <LinkIcon size={11} /> Filho(a)
          </span>
        </div>
      ))}
    </div>
  )
}
