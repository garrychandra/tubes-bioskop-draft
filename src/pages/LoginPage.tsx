import { useState, useEffect } from 'react'
import {
  Container, Paper, Typography, TextField, Button,
  Box, Alert, CircularProgress, Link,
} from '@mui/material'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { login, clearError } from '../features/auth/authSlice'
import MovieIcon from '@mui/icons-material/Movie'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error, user } = useAppSelector((s) => s.auth)
  const [form, setForm] = useState({ email: '', password: '' })

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  if (user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await dispatch(login(form))
    if (login.fulfilled.match(result)) navigate('/')
  }

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper sx={{ p: 5 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <MovieIcon sx={{ fontSize: 50, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Welcome Back</Typography>
          <Typography color="text.secondary">Sign in to your CineMax account</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            required fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 1 }}>
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" color="primary">Register</Link>
          </Typography>
        </Box>

        {/* Demo credentials */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700 }}>Demo credentials</Typography>
          <Typography variant="caption" color="text.secondary" display="block">User: john@example.com / user123</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Admin: admin@cinema.com / admin123</Typography>
        </Box>
      </Paper>
    </Container>
  )
}
