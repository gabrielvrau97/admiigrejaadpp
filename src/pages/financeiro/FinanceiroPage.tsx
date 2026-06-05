import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function FinanceiroPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return
    if (user.role === 'master') {
      navigate('/financeiro/dashboard', { replace: true })
    } else {
      navigate('/financeiro/tesouraria', { replace: true })
    }
  }, [user, navigate])

  return null
}
