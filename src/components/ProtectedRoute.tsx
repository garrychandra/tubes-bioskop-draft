import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { user } = useAppSelector((s) => s.auth)

  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && user.role !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}
