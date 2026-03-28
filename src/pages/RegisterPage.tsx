import { useState, useEffect } from 'react'
import {
  Container, Paper, Typography, TextField, Button,
  Box, Alert, CircularProgress, Link,
} from '@mui/material'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { register, clearError } from '../features/auth/authSlice'
import MovieIcon from '@mui/icons-material/Movie'

interface RegisterLocationState {
  from?: {
    pathname?: string
    search?: string
  }
}

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, error, user } = useAppSelector((s) => s.auth)
  const [form, setForm] = useState({ nama: '', email: '', password: '', confirm: '' })
  const [localErr, setLocalErr] = useState('')
  const locationState = location.state as RegisterLocationState | null
  const redirectFromQuery = new URLSearchParams(location.search).get('redirect')
  const redirectFromState = locationState?.from?.pathname
    ? `${locationState.from.pathname}${locationState.from.search || ''}`
    : null
  const redirectTo = redirectFromQuery || redirectFromState || '/'

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true })
  }, [user, navigate, redirectTo])

  if (user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setLocalErr('Passwords do not match'); return }
    if (form.password.length < 6) { setLocalErr('Password must be at least 6 characters'); return }
    setLocalErr('')
    const result = await dispatch(register({ nama: form.nama, email: form.email, password: form.password }))
    if (register.fulfilled.match(result)) navigate(redirectTo, { replace: true })
  }

  const anyError = localErr || error

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper sx={{ p: 5 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <MovieIcon sx={{ fontSize: 50, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Create Account</Typography>
          <Typography color="text.secondary">Join CineMax today</Typography>
        </Box>

        {anyError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => { setLocalErr(''); dispatch(clearError()) }}>
            {anyError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Nama"
            value={form.nama}
            onChange={(e) => setForm({ ...form, nama: e.target.value })}
            required fullWidth
          />
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required fullWidth helperText="At least 6 characters"
          />
          <TextField
            label="Confirm Password"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 1 }}>
            {loading ? <CircularProgress size={24} /> : 'Create Account'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to={`/login?redirect=${encodeURIComponent(redirectTo)}`} color="primary">Sign In</Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}
