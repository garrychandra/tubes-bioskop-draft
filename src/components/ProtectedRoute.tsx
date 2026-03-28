import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { user } = useAppSelector((s) => s.auth)
  const location = useLocation()

  if (!user) {
    const redirect = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace state={{ from: location }} />
  }
  if (requireAdmin && user.role !== 'Admin') return <Navigate to="/" replace />

  return <>{children}</>
}
